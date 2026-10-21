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
import { criarExecutoresReais } from './discos'
import { ehMexida } from './ferramentas'
import { criarVizinhoReal } from './vizinho'

const ROTAS_AGIR = ['/api/agir', '/api/agir/aprovar', '/api/agir/continuar']

export function rotaPertenceAoModuloAgir(pathname: string): boolean {
  return ROTAS_AGIR.includes(pathname)
}

export interface DependenciasAgir {
  obterAlvo: ObterAlvo
  /** Valida a pasta de trabalho informada pela tela e devolve a RAIZ real. */
  pastaDeTrabalho: (caminho: string | undefined) => { ok: true; raiz: string } | { ok: false; message: string }
  /** Teto desta mensagem (FATIA 11): a prefeitura lê da casa Config a cada pedido. */
  lerTeto: () => Promise<number>
}

/** Permissões "Permitir na Sessão" por fluxo (a conversa pedindo). */
const permissoesPorFluxo = new Map<string, Set<string>>()
/** Cartões aguardando o dono, por fluxo: pedidoId → resolver. */
const pendentesPorFluxo = new Map<string, Map<string, (liberado: boolean) => void>>()
/**
 * Diálogos pausados no teto, por fluxo (FATIA 11): o "Continuar" retoma o
 * MESMO fluxo com orçamento cheio. Teto de mapa (não de voltas!): as mais
 * velhas caem fora para a memória não crescer sem limite.
 */
const retomarPorFluxo = new Map<string, { mensagens: MensagemAgir[]; raiz: string }>()
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

function filtrarPermissoes(brutas: unknown): string[] {
  return Array.isArray(brutas) ? brutas.filter((p): p is string => typeof p === 'string' && ehMexida(p as never)) : []
}

type PedidoValidado = {
  mensagens: MensagemSimples[]
  fluxo: string
  workspace?: string
  permissoes: string[]
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
  const workspace = typeof corpo.workspace === 'string' && corpo.workspace.trim() !== '' ? corpo.workspace : undefined
  return { ok: true, pedido: { mensagens: messages as MensagemSimples[], fluxo: fluxo.trim(), workspace, permissoes: filtrarPermissoes(corpo.permissoes) } }
}

function escreverEvento(res: ServerResponse, evento: EventoAgir): void {
  res.write(`data: ${JSON.stringify(evento)}\n\n`)
}

/** Guarda a retomada quando o teto pausou OU um erro transitório
 * (tempo/endereco/http) interrompeu o fio — outro fim limpa o fluxo. */
function guardarRetomada(fluxo: string, resultado: ResultadoAgir, raiz: string): void {
  retomarPorFluxo.delete(fluxo)
  const pausouNoTeto = resultado.status === 'voltas_excedidas'
  const caiuTransitorio =
    resultado.status === 'erro' &&
    (resultado.codigoErro === 'tempo' || resultado.codigoErro === 'endereco' || resultado.codigoErro === 'http')
  if ((pausouNoTeto || caiuTransitorio) && resultado.mensagensParaRetomar) {
    retomarPorFluxo.set(fluxo, { mensagens: resultado.mensagensParaRetomar, raiz })
    while (retomarPorFluxo.size > MAX_RETOMADAS) {
      const maisAntigo = retomarPorFluxo.keys().next()
      if (maisAntigo.done) break
      retomarPorFluxo.delete(maisAntigo.value)
    }
  }
}

interface FioAgir {
  fluxo: string
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
async function executarFioAgir(req: IncomingMessage, res: ServerResponse, fio: FioAgir): Promise<ResultadoAgir> {
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

  let resultado: ResultadoAgir = { status: 'interrompido', textoFinal: '', voltas: 0 }
  try {
    resultado = await rodarAgir({
      vizinho: criarVizinhoReal(fio.alvo),
      historico: fio.mensagens,
      executores: criarExecutoresReais(fio.raiz),
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
        if (concedidas?.has(pedido.ferramenta)) return true // Q2a: já liberada na sessão
        if (abort.signal.aborted) return false
        escreverEvento(res, { type: 'approval', pedido }) // o cartão (1 vez)
        return await new Promise<boolean>((resolve) => {
          pendentesPorFluxo.get(fluxo)?.set(pedido.id, resolve)
        })
      },
      sinal: abort.signal,
    })
  } catch {
    if (!abort.signal.aborted) {
      escreverEvento(res, { type: 'error', code: 'resposta', message: 'Erro inesperado do servidor ao agir.' })
    }
  } finally {
    pendentesPorFluxo.delete(fluxo)
    permissoesPorFluxo.delete(fluxo)
    req.off?.('close', aoFechar)
    res.end()
  }
  return resultado
}

/** POST /api/agir/aprovar — o dono respondeu o cartão. */
async function tratarAprovar(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  let corpo: Record<string, unknown>
  try {
    corpo = await lerCorpo(req)
  } catch (erro) {
    sendErro(res, 400, 'configuracao', (erro as Error).message)
    return true
  }
  const fluxo = typeof corpo.fluxo === 'string' ? corpo.fluxo.trim() : ''
  const id = typeof corpo.id === 'string' ? corpo.id.trim() : ''
  const decisao = corpo.decisao
  const ferramenta = corpo.ferramenta
  const decisaoValida = decisao === 'permitir' || decisao === 'negar' || decisao === 'sessao'
  if (fluxo === '' || id === '' || !decisaoValida) {
    sendErro(res, 400, 'configuracao', 'Resposta de aprovação inválida (fluxo, id e decisao são obrigatórios).')
    return true
  }
  if (decisao === 'sessao' && !(typeof ferramenta === 'string' && ehMexida(ferramenta as never))) {
    sendErro(res, 400, 'configuracao', '"Permitir na Sessão" só vale para ferramentas que mexem em arquivos (criar/escrever).')
    return true
  }
  const resolver = pendentesPorFluxo.get(fluxo)?.get(id)
  if (!resolver) {
    sendErro(res, 409, 'fluxo', 'Esta execução já não espera mais resposta (a página recarregou ou ela terminou). Envie a mensagem de novo.')
    return true
  }
  pendentesPorFluxo.get(fluxo)?.delete(id)
  if (decisao === 'sessao' && typeof ferramenta === 'string') {
    permissoesPorFluxo.get(fluxo)?.add(ferramenta)
  }
  resolver(decisao !== 'negar')
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

  const { alvo, erro } = await deps.obterAlvo()
  if (!alvo) {
    sendErro(res, 409, erro?.code ?? 'sem_provedor', erro?.message ?? 'Nenhum provedor está ativo. Abra Provedores e escolha quem vai responder.')
    return true
  }

  const pasta = deps.pastaDeTrabalho(validacao.pedido.workspace)
  if (!pasta.ok) {
    sendErro(res, 409, 'configuracao', pasta.message)
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
  const { fluxo } = validacao.pedido
  retomarPorFluxo.delete(fluxo)
  const resultado = await executarFioAgir(req, res, {
    fluxo,
    mensagens: validacao.pedido.mensagens.map((mensagem) => ({ papel: mensagem.role === 'user' ? ('usuario' as const) : ('assistente' as const), conteudo: mensagem.content })),
    raiz: pasta.raiz,
    permissoes: validacao.pedido.permissoes,
    alvo,
    teto,
  })
  guardarRetomada(fluxo, resultado, pasta.raiz)
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

  // O território é o MESMO da execução pausada (já validado); as permissões
  // "na sessão" a tela reenvia (Q2a atravessa trocas pelo navegador).
  const resultado = await executarFioAgir(req, res, {
    fluxo,
    mensagens: retomada.mensagens,
    raiz: retomada.raiz,
    permissoes: filtrarPermissoes(corpo.permissoes),
    alvo,
    teto,
  })
  guardarRetomada(fluxo, resultado, retomada.raiz)
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
  if (url.pathname === '/api/agir/aprovar') return tratarAprovar(req, res)
  if (url.pathname === '/api/agir/continuar') return tratarContinuar(req, res, deps)
  if (url.pathname === '/api/agir') return tratarAgir(req, res, deps)
  return false
}
