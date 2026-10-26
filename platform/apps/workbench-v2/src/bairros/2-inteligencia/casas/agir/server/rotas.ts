// ============================================================================
// Casa Agir — rota HTTP (conquista 3 da FATIA 10; teto na FATIA 11).
//   POST /api/agir           → SSE com os eventos do loop (chunk · tool ·
//                              tool_result · approval · teto · done · error)
//   POST /api/agir/aprovar   → a resposta do dono ao cartão {fluxo,id,decisao}
//   POST /api/agir/continuar → retoma o MESMO fluxo após o teto {fluxo}
// Pré-condições respondem 4xx/409 JSON {code,message} — igual à casa
// Conversa. "Parar" = fechar a conexão → o loop é interrompido EM SILÊNCIO.
// O TERRITÓRIO não vem de confiança: a prefeitura injeta `pastaDeTrabalho`,
// que valida a pasta informada pela tela e devolve a raiz real (o navegador
// nunca define território por conta própria).
// Q1=(a)/Q2=(a) (D93): só CRIAR/ESCREVER passam pelo cartão; "Permitir na
// Sessão" vale enquanto durar o fluxo desta conversa no servidor (e o
// navegador guarda a permissão para reenviar no próximo pedido — C4).
// FATIA 11: o TETO vem da casa Config — a prefeitura injeta `lerTeto` (a casa
// Agir NUNCA importa outra casa abaixo do barrel — LEGO). Ao bater o teto, a
// rota guarda o diálogo por fluxo para o "Continuar" retomar com orçamento
// cheio (RF11-3); pedido novo no mesmo fluxo descarta a retomada.
// ============================================================================
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AlvoConversa, ObterAlvo } from '../../conversa'
import type { DecisaoAprovacao, EventoAgir, MensagemAgir, MensagemSimples } from '../contract'
import { rodarAgir, type ResultadoAgir } from './agir'
import { criarExecutoresReais, descreverAlvoExcluir } from './discos'
import { permiteSessao } from './ferramentas'
import { criarVizinhoReal } from './vizinho'

const ROTAS_AGIR = ['/api/agir', '/api/agir/aprovar', '/api/agir/continuar']

export function rotaPertenceAoModuloAgir(pathname: string): boolean {
  return ROTAS_AGIR.includes(pathname)
}

export interface ContextoAgir {
  ok: true
  raiz: string
  permissoes: string[]
}

export interface DependenciasAgir {
  obterAlvo: ObterAlvo
  /** A prefeitura resolve a sessão persistida e sua raiz; o browser não escolhe território nem grant. */
  resolverContexto: (sessionId: string, chatId: string) => ContextoAgir | { ok: false; message: string }
  /** A permissão de sessão é gravada somente pelo servidor após decisão do dono. */
  concederPermissaoSessao: (sessionId: string, raiz: string, ferramenta: 'criar' | 'escrever') => void
  /** Teto desta mensagem (FATIA 11): a prefeitura lê da casa Config a cada pedido. */
  lerTeto: () => Promise<number>
}

interface AprovacaoPendente {
  resolver: (liberado: boolean) => void
  pedido: import('../contract').PedidoFerramenta
}
interface ContextoFluxo {
  sessionId: string
  chatId: string
  raiz: string
}

/** Permissões carregadas da autoridade server-side para o escopo da sessão/pasta. */
const permissoesPorFluxo = new Map<string, Set<string>>()
/** Cartões aguardando o dono, por fluxo: pedidoId → pedido + resolver. */
const pendentesPorFluxo = new Map<string, Map<string, AprovacaoPendente>>()
const contextoPorFluxo = new Map<string, ContextoFluxo>()
/**
 * Diálogos pausados no teto, por fluxo (FATIA 11): o "Continuar" retoma o
 * MESMO fluxo com orçamento cheio. Teto de mapa (não de iterações!): as mais
 * velhas caem fora para a memória não crescer sem limite.
 */
const retomarPorFluxo = new Map<string, { mensagens: MensagemAgir[]; contexto: ContextoFluxo }>()
const MAX_RETOMADAS = 20

function sendJson(res: ServerResponse, status: number, corpo: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(corpo))
}

function sendErro(res: ServerResponse, status: number, code: string, message: string): void {
  sendJson(res, status, { code, message })
}

async function lerCorpo(req: IncomingMessage): Promise<Record<string, unknown>> {
  const partes: Buffer[] = []
  for await (const pedaco of req) partes.push(pedaco as Buffer)
  const texto = Buffer.concat(partes).toString('utf8')
  if (!texto) return {}
  try {
    const valor = JSON.parse(texto)
    return typeof valor === 'object' && valor !== null ? (valor as Record<string, unknown>) : {}
  } catch {
    throw new Error('Corpo da requisição não é JSON válido.')
  }
}

type PedidoValidado = {
  mensagens: MensagemSimples[]
  fluxo: string
  sessionId: string
  chatId: string
}

/** Valida o pedido da tela (histórico visível + fluxo + território candidato). */
function validarPedido(corpo: Record<string, unknown>): { ok: true; pedido: PedidoValidado } | { ok: false; message: string } {
  const messages = corpo.messages
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, message: 'Histórico vazio: envie ao menos uma mensagem.' }
  }
  for (const item of messages) {
    const mensagem = item as { role?: unknown; content?: unknown }
    if ((mensagem.role !== 'user' && mensagem.role !== 'assistant') || typeof mensagem.content !== 'string') {
      return { ok: false, message: 'Histórico em formato inválido.' }
    }
  }
  const fluxo = corpo.fluxo
  if (typeof fluxo !== 'string' || fluxo.trim() === '') {
    return { ok: false, message: 'Pedido sem fluxo da conversa (a sessão dona do cartão é obrigatória).' }
  }
  const sessionId = typeof corpo.sessionId === 'string' ? corpo.sessionId.trim() : ''
  const chatId = typeof corpo.chatId === 'string' ? corpo.chatId.trim() : ''
  if (!sessionId || !chatId) {
    return { ok: false, message: 'Pedido sem identidade da sessão/conversa; o servidor não iniciou a execução.' }
  }
  // `workspace` e `permissoes` antigos são deliberadamente ignorados: não são autoridade.
  return { ok: true, pedido: { mensagens: messages as MensagemSimples[], fluxo: fluxo.trim(), sessionId, chatId } }
}

function escreverEvento(res: ServerResponse, evento: EventoAgir): void {
  res.write(`data: ${JSON.stringify(evento)}\n\n`)
}

/** Guarda a retomada quando o teto pausou OU um erro transitório
 * (tempo/endereco/http) interrompeu o fio — outro fim limpa o fluxo. */
function guardarRetomada(fluxo: string, resultado: ResultadoAgir, contexto: ContextoFluxo): void {
  retomarPorFluxo.delete(fluxo)
  const pausouNoTeto = resultado.status === 'iteracoes_excedidas'
  const caiuTransitorio =
    resultado.status === 'erro' &&
    (resultado.codigoErro === 'tempo' || resultado.codigoErro === 'endereco' || resultado.codigoErro === 'http')
  if ((pausouNoTeto || caiuTransitorio) && resultado.mensagensParaRetomar) {
    retomarPorFluxo.set(fluxo, { mensagens: resultado.mensagensParaRetomar, contexto })
    while (retomarPorFluxo.size > MAX_RETOMADAS) {
      const maisAntigo = retomarPorFluxo.keys().next()
      if (maisAntigo.done) break
      retomarPorFluxo.delete(maisAntigo.value)
    }
  }
}

interface FioAgir {
  fluxo: string
  sessionId: string
  chatId: string
  mensagens: MensagemAgir[]
  raiz: string
  permissoes: string[]
  alvo: AlvoConversa
  teto: number
}

/**
 * O corredor SSE compartilhado: pedido novo e "continuar" passam por aqui —
 * mesmos cartões, mesmo Parar silencioso, mesma faxina no fim.
 */
async function executarFioAgir(req: IncomingMessage, res: ServerResponse, fio: FioAgir, deps: DependenciasAgir): Promise<ResultadoAgir> {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  const abort = new AbortController()
  const aoFechar = (): void => abort.abort()
  req.on('close', aoFechar)

  const { fluxo } = fio
  permissoesPorFluxo.set(fluxo, new Set(fio.permissoes))
  pendentesPorFluxo.set(fluxo, new Map())
  contextoPorFluxo.set(fluxo, { sessionId: fio.sessionId, chatId: fio.chatId, raiz: fio.raiz })

  let resultado: ResultadoAgir = { status: 'interrompido', textoFinal: '', iteracoes: 0 }
  const executores = criarExecutoresReais(fio.raiz)
  try {
    resultado = await rodarAgir({
      vizinho: criarVizinhoReal(fio.alvo),
      historico: fio.mensagens,
      executores,
      teto: fio.teto,
      emitir: (evento) => {
        if (abort.signal.aborted || res.writableEnded) return
        // O rodapé da tela mostra o modelo EFETIVO (o configurado no provedor
        // ativo — mesma régua da casa Conversa, §3.9), mesmo que o fio do
        // provedor não carimbe o modelo em cada pedaço.
        escreverEvento(res, evento.type === 'done' ? { type: 'done', model: fio.alvo.modelo } : evento)
      },
      pedirAprovacao: async (pedido) => {
        const concedidas = permissoesPorFluxo.get(fluxo)
        // RF12-3: sessão liberada NÃO cobre `excluir` (cinto + suspensório com
        // o filtro de entrada — mesmo que 'excluir' chegue, nunca auto-libera).
        if (permiteSessao(pedido.ferramenta) && concedidas?.has(pedido.ferramenta)) return true // Q2a
        if (abort.signal.aborted) return false
        // FATIA 12: o cartão do `excluir` mostra o que o servidor viu no disco
        // (prévia do arquivo ou contagem da pasta — RF12-6).
        const previa = pedido.ferramenta === 'excluir'
          ? await descreverAlvoExcluir(fio.raiz, pedido.argumentos.caminho)
          : undefined
        escreverEvento(res, { type: 'approval', pedido, ...(previa !== undefined ? { previa } : {}) })
        return await new Promise<boolean>((resolve) => {
          pendentesPorFluxo.get(fluxo)?.set(pedido.id, { resolver: resolve, pedido })
        })
      },
      validarContexto: (pedido) => {
        const permissoesAtuais = permissoesPorFluxo.get(fluxo)
        const usouGrantDeSessao = !!pedido && permiteSessao(pedido.ferramenta) && !!permissoesAtuais?.has(pedido.ferramenta)
        const contextoAtual = deps.resolverContexto(fio.sessionId, fio.chatId)
        if (!contextoAtual.ok || contextoAtual.raiz !== fio.raiz) return false
        if (usouGrantDeSessao && !contextoAtual.permissoes.includes(pedido!.ferramenta)) return false
        permissoesPorFluxo.set(fluxo, new Set(contextoAtual.permissoes))
        return true
      },
      sinal: abort.signal,
    })
  } catch {
    if (!abort.signal.aborted) {
      escreverEvento(res, { type: 'error', code: 'resposta', message: 'Erro inesperado do servidor ao agir.' })
    }
  } finally {
    executores.fechar()
    pendentesPorFluxo.delete(fluxo)
    permissoesPorFluxo.delete(fluxo)
    contextoPorFluxo.delete(fluxo)
    req.off?.('close', aoFechar)
    res.end()
  }
  return resultado
}

/** POST /api/agir/aprovar — o dono respondeu o cartão. */
async function tratarAprovar(req: IncomingMessage, res: ServerResponse, deps: DependenciasAgir): Promise<boolean> {
  let corpo: Record<string, unknown>
  try {
    corpo = await lerCorpo(req)
  } catch (erro) {
    sendErro(res, 400, 'configuracao', (erro as Error).message)
    return true
  }
  const fluxo = typeof corpo.fluxo === 'string' ? corpo.fluxo.trim() : ''
  const id = typeof corpo.id === 'string' ? corpo.id.trim() : ''
  const sessionId = typeof corpo.sessionId === 'string' ? corpo.sessionId.trim() : ''
  const decisao = corpo.decisao
  const decisaoValida = decisao === 'permitir' || decisao === 'negar' || decisao === 'sessao'
  if (fluxo === '' || id === '' || sessionId === '' || !decisaoValida) {
    sendErro(res, 400, 'configuracao', 'Resposta de aprovação inválida (fluxo, id, sessionId e decisao são obrigatórios).')
    return true
  }
  const contexto = contextoPorFluxo.get(fluxo)
  if (!contexto || contexto.sessionId !== sessionId) {
    sendErro(res, 409, 'fluxo', 'Esta aprovação não pertence à sessão ativa ou já expirou.')
    return true
  }
  const contextoAtual = deps.resolverContexto(contexto.sessionId, contexto.chatId)
  if (!contextoAtual.ok || contextoAtual.raiz !== contexto.raiz) {
    sendErro(res, 409, 'fluxo', 'A sessão ou a pasta mudou; esta aprovação foi invalidada e nenhuma ação foi executada.')
    return true
  }
  const pendente = pendentesPorFluxo.get(fluxo)?.get(id)
  if (!pendente) {
    sendErro(res, 409, 'fluxo', 'Esta execução já não espera mais resposta (a página recarregou ou ela terminou). Envie a mensagem de novo.')
    return true
  }
  if (decisao === 'sessao') {
    if (!permiteSessao(pendente.pedido.ferramenta)) {
      sendErro(res, 400, 'configuracao', '"Permitir na Sessão" só vale para criar/escrever — excluir sempre pergunta, uma a uma (RF12-3).')
      return true
    }
    const ferramenta = pendente.pedido.ferramenta as 'criar' | 'escrever'
    deps.concederPermissaoSessao(contexto.sessionId, contexto.raiz, ferramenta)
    permissoesPorFluxo.get(fluxo)?.add(ferramenta)
  }
  pendentesPorFluxo.get(fluxo)?.delete(id)
  pendente.resolver(decisao !== 'negar')
  sendJson(res, 200, { ok: true })
  return true
}

/** POST /api/agir — abre o fio do loop do agente. */
async function tratarAgir(
  req: IncomingMessage,
  res: ServerResponse,
  deps: DependenciasAgir,
): Promise<boolean> {
  let corpo: Record<string, unknown>
  try {
    corpo = await lerCorpo(req)
  } catch (erro) {
    sendErro(res, 400, 'configuracao', (erro as Error).message)
    return true
  }
  const validacao = validarPedido(corpo)
  if (!validacao.ok) {
    sendErro(res, 400, 'configuracao', validacao.message)
    return true
  }

  const contexto = deps.resolverContexto(validacao.pedido.sessionId, validacao.pedido.chatId)
  if (!contexto.ok) {
    sendErro(res, 409, 'configuracao', contexto.message)
    return true
  }

  const { alvo, erro } = await deps.obterAlvo()
  if (!alvo) {
    sendErro(res, 409, erro?.code ?? 'sem_provedor', erro?.message ?? 'Nenhum provedor está ativo. Abra Provedores e escolha quem vai responder.')
    return true
  }

  let teto: number
  try {
    teto = await deps.lerTeto()
  } catch (erro) {
    sendErro(res, 409, 'configuracao', (erro as Error).message)
    return true
  }

  // ---- Pré-condições ok: pedido novo descarta retomada velha e abre o fio ----
  const { fluxo, sessionId, chatId } = validacao.pedido
  retomarPorFluxo.delete(fluxo)
  const contextoFluxo = { sessionId, chatId, raiz: contexto.raiz }
  const resultado = await executarFioAgir(req, res, {
    fluxo,
    sessionId,
    chatId,
    mensagens: validacao.pedido.mensagens.map((mensagem) => ({ papel: mensagem.role === 'user' ? ('usuario' as const) : ('assistente' as const), conteudo: mensagem.content })),
    raiz: contexto.raiz,
    permissoes: contexto.permissoes,
    alvo,
    teto,
  }, deps)
  guardarRetomada(fluxo, resultado, contextoFluxo)
  return true
}

/** POST /api/agir/continuar — retoma o MESMO fluxo com orçamento cheio (FATIA 11). */
async function tratarContinuar(
  req: IncomingMessage,
  res: ServerResponse,
  deps: DependenciasAgir,
): Promise<boolean> {
  let corpo: Record<string, unknown>
  try {
    corpo = await lerCorpo(req)
  } catch (erro) {
    sendErro(res, 400, 'configuracao', (erro as Error).message)
    return true
  }
  const fluxo = typeof corpo.fluxo === 'string' ? corpo.fluxo.trim() : ''
  if (fluxo === '') {
    sendErro(res, 400, 'configuracao', 'Continuar sem fluxo da conversa (a sessão dona do cartão é obrigatória).')
    return true
  }
  const retomada = retomarPorFluxo.get(fluxo)
  if (!retomada) {
    sendErro(res, 409, 'fluxo', 'Nada para retomar aqui (esta execução já terminou ou o servidor reiniciou). Envie a mensagem de novo.')
    return true
  }
  const sessionId = typeof corpo.sessionId === 'string' ? corpo.sessionId.trim() : ''
  const chatId = typeof corpo.chatId === 'string' ? corpo.chatId.trim() : ''
  if (sessionId !== retomada.contexto.sessionId || chatId !== retomada.contexto.chatId) {
    sendErro(res, 409, 'fluxo', 'A continuação não corresponde à sessão/conversa que originou a pausa.')
    return true
  }
  const contexto = deps.resolverContexto(sessionId, chatId)
  if (!contexto.ok || contexto.raiz !== retomada.contexto.raiz) {
    sendErro(res, 409, 'fluxo', 'A sessão ou a pasta mudou; a continuação foi invalidada.')
    return true
  }

  const { alvo, erro } = await deps.obterAlvo()
  if (!alvo) {
    sendErro(res, 409, erro?.code ?? 'sem_provedor', erro?.message ?? 'Nenhum provedor está ativo. Abra Provedores e escolha quem vai responder.')
    return true
  }

  let teto: number
  try {
    teto = await deps.lerTeto()
  } catch (erro) {
    sendErro(res, 409, 'configuracao', (erro as Error).message)
    return true
  }

  // Território e grants são relidos do registro persistido; payload do browser não é autoridade.
  const resultado = await executarFioAgir(req, res, {
    fluxo,
    sessionId,
    chatId,
    mensagens: retomada.mensagens,
    raiz: contexto.raiz,
    permissoes: contexto.permissoes,
    alvo,
    teto,
  }, deps)
  guardarRetomada(fluxo, resultado, retomada.contexto)
  return true
}

export async function tratarRotasAgir(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  deps: DependenciasAgir,
): Promise<boolean> {
  const metodo = req.method ?? 'GET'
  if (metodo !== 'POST') return false
  if (url.pathname === '/api/agir/aprovar') return tratarAprovar(req, res, deps)
  if (url.pathname === '/api/agir/continuar') return tratarContinuar(req, res, deps)
  if (url.pathname === '/api/agir') return tratarAgir(req, res, deps)
  return false
}
