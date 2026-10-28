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
// Regra atual F5-A/F2-F4: Agir/Edit autorizam criar/escrever sem cartão
// repetitivo; exclusão, por ser destrutiva, segue manual e individual. O modo
// efetivo é registrado separadamente no servidor; o payload do run não manda.
// FATIA 11: o TETO vem da casa Config — a prefeitura injeta `lerTeto` (a casa
// Agir NUNCA importa outra casa abaixo do barrel — LEGO). Ao bater o teto, a
// rota guarda o diálogo por fluxo para o "Continuar" retomar com orçamento
// cheio (RF11-3); pedido novo no mesmo fluxo descarta a retomada.
// ============================================================================
import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AlvoConversa, IniciarChamadaModelo, ObterAlvo, SelecaoModelo } from '../../conversa'
import type { EventoAgir, ExecutorFerramenta, FerramentaId, MensagemAgir, MensagemSimples, ModoAgir, PedidoFerramenta, ResultadoFerramenta } from '../contract'
import { rodarAgir, type ResultadoAgir } from './agir'
import { criarExecutoresReais, descreverAlvoExcluir, type ExecutoresDisco } from './discos'
import { permiteSessao } from './ferramentas'
import { criarVizinhoReal } from './vizinho'

const ROTAS_AGIR = ['/api/agir', '/api/agir/aprovar', '/api/agir/continuar', '/api/agir/cancel', '/api/agir/mode']

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
  iniciarModelo?: IniciarChamadaModelo
  /** A prefeitura resolve a sessão persistida e sua raiz; o browser não escolhe território nem grant. */
  resolverContexto: (sessionId: string, chatId: string) => ContextoAgir | { ok: false; message: string }
  /** A permissão de sessão é gravada somente pelo servidor após decisão do dono. */
  concederPermissaoSessao: (sessionId: string, raiz: string, ferramenta: 'criar' | 'escrever') => void
  /** Modo escolhido explicitamente no seletor; nunca é lido do payload de /api/agir. */
  lerModo: (sessionId: string, chatId: string) => ModoAgir | null
  definirModo: (sessionId: string, chatId: string, modo: ModoAgir) => void
  /** Fábrica injetável para testar a barreira de commit de ferramentas mutáveis. */
  criarExecutores?: (raiz: string) => ExecutoresDisco
  /** Teto desta mensagem (FATIA 11): a prefeitura lê da casa Config a cada pedido. */
  lerTeto: () => Promise<number>
}

interface AprovacaoPendente {
  resolver: (liberado: boolean) => void
  pedido: PedidoFerramenta
}
interface ContextoFluxo {
  sessionId: string
  chatId: string
  raiz: string
  modo: ModoAgir
  modoSelecionadoNoServidor: boolean
}
type EstadoExecucao = 'running' | 'awaiting-approval' | 'cancel-requested' | 'cancelled' | 'completed' | 'paused'
interface ExecucaoAgir extends ContextoFluxo {
  runId: string
  generation: number
  fluxo: string
  estado: EstadoExecucao
  controller: AbortController
  pendentes: Map<string, AprovacaoPendente>
  efeitoMutavelEmAndamento?: Promise<ResultadoFerramenta>
  mutacoesConfirmadas: number
  motivoCancelamento?: 'requested' | 'disconnect'
}

/** Permissões carregadas da autoridade server-side para o escopo da sessão/pasta. */
const permissoesPorFluxo = new Map<string, Set<string>>()
const contextoPorFluxo = new Map<string, ContextoFluxo>()
const execucaoPorFluxo = new Map<string, ExecucaoAgir>()
const execucaoPorId = new Map<string, ExecucaoAgir>()
const geracaoPorFluxo = new Map<string, number>()
const continuacoesEmClaim = new Set<string>()
const MAX_EXECUCOES_MEMORIA = 500
function criarExecucao(fluxo: string, contexto: ContextoFluxo): ExecucaoAgir {
  const generation = (geracaoPorFluxo.get(fluxo) ?? 0) + 1
  geracaoPorFluxo.set(fluxo, generation)
  const execucao: ExecucaoAgir = {
    ...contexto,
    fluxo,
    runId: randomUUID(),
    generation,
    estado: 'running',
    controller: new AbortController(),
    pendentes: new Map(),
    mutacoesConfirmadas: 0,
  }
  execucaoPorFluxo.set(fluxo, execucao)
  execucaoPorId.set(execucao.runId, execucao)
  while (execucaoPorId.size > MAX_EXECUCOES_MEMORIA) {
    const idAntigo = execucaoPorId.keys().next()
    if (idAntigo.done) break
    const antiga = execucaoPorId.get(idAntigo.value)
    if (antiga && execucaoPorFluxo.get(antiga.fluxo) === antiga) break
    execucaoPorId.delete(idAntigo.value)
  }
  return execucao
}

function execucaoTerminal(execucao: ExecucaoAgir): boolean {
  return execucao.estado === 'cancelled' || execucao.estado === 'completed' || execucao.estado === 'paused'
}

/** Impede novo trabalho; uma ferramenta mutável já iniciada ainda precisa encerrar antes do ACK. */
function solicitarCancelamento(execucao: ExecucaoAgir, motivo: 'requested' | 'disconnect'): boolean {
  if (execucaoTerminal(execucao)) return false
  if (execucao.estado === 'cancel-requested') return true
  execucao.estado = 'cancel-requested'
  execucao.motivoCancelamento = motivo
  const pendentes = [...execucao.pendentes.values()]
  execucao.pendentes.clear()
  for (const pendente of pendentes) pendente.resolver(false)
  execucao.controller.abort()
  return true
}

async function concluirCancelamento(execucao: ExecucaoAgir): Promise<'cancelled' | 'cancelled_with_effects'> {
  // Ponto de não retorno: uma mutação entrou no executor. Não afirmamos parada
  // antes de ela terminar; aguardamos o resultado atômico e informamos se publicou.
  const efeitoEmAndamento = execucao.efeitoMutavelEmAndamento
  if (efeitoEmAndamento) await efeitoEmAndamento.catch(() => undefined)
  if (execucao.estado === 'cancel-requested') execucao.estado = 'cancelled'
  return execucao.mutacoesConfirmadas > 0 ? 'cancelled_with_effects' : 'cancelled'
}

/**
 * Diálogos pausados no teto, por fluxo (FATIA 11): o "Continuar" retoma o
 * MESMO fluxo com orçamento cheio. Teto de mapa (não de iterações!): as mais
 * velhas caem fora para a memória não crescer sem limite.
 */
const retomarPorFluxo = new Map<string, { mensagens: MensagemAgir[]; contexto: ContextoFluxo; alvo: AlvoConversa }>()
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
  selecaoModelo: SelecaoModelo
}

function validarSelecaoModelo(valor: unknown): SelecaoModelo | null {
  if (valor === undefined || valor === null || (typeof valor === 'object' && (valor as { tipo?: unknown }).tipo === 'auto')) return { tipo: 'auto' }
  if (!valor || typeof valor !== 'object') return null
  const selecao = valor as { tipo?: unknown; providerId?: unknown; modelId?: unknown }
  if (selecao.tipo !== 'explicita' || typeof selecao.providerId !== 'string' || !selecao.providerId || typeof selecao.modelId !== 'string' || !selecao.modelId) return null
  return { tipo: 'explicita', providerId: selecao.providerId, modelId: selecao.modelId }
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
  const selecaoModelo = validarSelecaoModelo(corpo.modelSelection)
  if (!selecaoModelo) return { ok: false, message: 'Seleção de modelo inválida; escolha Auto ou um par providerId/modelId do catálogo.' }
  // `workspace`, `permissoes` e `mode` do payload são deliberadamente ignorados:
  // o contexto e o modo efetivo vêm da autoridade server-side.
  return { ok: true, pedido: { mensagens: messages as MensagemSimples[], fluxo: fluxo.trim(), sessionId, chatId, selecaoModelo } }
}

function escreverEvento(res: ServerResponse, evento: EventoAgir): void {
  res.write(`data: ${JSON.stringify(evento)}\n\n`)
}

/** Guarda a retomada quando o teto pausou OU um erro transitório
 * (tempo/endereco/http) interrompeu o fio — outro fim limpa o fluxo. */
function guardarRetomada(fluxo: string, resultado: ResultadoAgir, contexto: ContextoFluxo, alvo: AlvoConversa): void {
  retomarPorFluxo.delete(fluxo)
  const pausouNoTeto = resultado.status === 'iteracoes_excedidas'
  const caiuTransitorio =
    resultado.status === 'erro' &&
    (resultado.codigoErro === 'tempo' || resultado.codigoErro === 'endereco' || resultado.codigoErro === 'http')
  if ((pausouNoTeto || caiuTransitorio) && resultado.mensagensParaRetomar) {
    retomarPorFluxo.set(fluxo, { mensagens: resultado.mensagensParaRetomar, contexto, alvo })
    while (retomarPorFluxo.size > MAX_RETOMADAS) {
      const maisAntigo = retomarPorFluxo.keys().next()
      if (maisAntigo.done) break
      retomarPorFluxo.delete(maisAntigo.value)
    }
  }
}

interface FioAgir {
  execucao: ExecucaoAgir
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
async function executarFioAgir(res: ServerResponse, fio: FioAgir, deps: DependenciasAgir): Promise<ResultadoAgir> {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Agir-Run-Id', fio.execucao.runId)
  res.setHeader('X-Agir-Generation', String(fio.execucao.generation))
  res.flushHeaders?.()

  const abort = fio.execucao.controller
  const aoFechar = (): void => {
    if (!res.writableEnded) solicitarCancelamento(fio.execucao, 'disconnect')
  }
  res.on?.('close', aoFechar)

  const { fluxo } = fio
  permissoesPorFluxo.set(fluxo, new Set(fio.permissoes))
  contextoPorFluxo.set(fluxo, { sessionId: fio.sessionId, chatId: fio.chatId, raiz: fio.raiz, modo: fio.execucao.modo, modoSelecionadoNoServidor: fio.execucao.modoSelecionadoNoServidor })

  let resultado: ResultadoAgir = { status: 'interrompido', textoFinal: '', iteracoes: 0 }
  const executoresDisco = (deps.criarExecutores ?? criarExecutoresReais)(fio.raiz)
  const executores: Record<FerramentaId, ExecutorFerramenta> = { ...executoresDisco }
  for (const ferramenta of ['criar', 'escrever'] as const) {
    const executar = executoresDisco[ferramenta]
    executores[ferramenta] = async (pedido) => {
      if (abort.signal.aborted || fio.execucao.estado !== 'running') {
        return { ok: false, resumo: 'Cancelada antes de iniciar a alteração; o arquivo não foi publicado.' }
      }
      // Registra a operação antes de ceder o event loop. O cancel endpoint
      // aguarda esta Promise e só então confirma se houve publicação.
      const operacao = Promise.resolve().then(() => executar(pedido)).then((resultado) => {
        if (resultado.ok) fio.execucao.mutacoesConfirmadas += 1
        return resultado
      })
      fio.execucao.efeitoMutavelEmAndamento = operacao
      try {
        return await operacao
      } finally {
        if (fio.execucao.efeitoMutavelEmAndamento === operacao) delete fio.execucao.efeitoMutavelEmAndamento
      }
    }
  }
  const modeloEfetivo = fio.alvo.providerId && fio.alvo.modelId
    ? `${fio.alvo.providerId} / ${fio.alvo.modelId}`
    : fio.alvo.modelo
  try {
    resultado = await rodarAgir({
      vizinho: criarVizinhoReal(fio.alvo, {}, deps.iniciarModelo),
      historico: fio.mensagens,
      executores,
      teto: fio.teto,
      emitir: (evento) => {
        if ((abort.signal.aborted && evento.type !== 'tool_result') || res.writableEnded) return
        // A ferramenta já iniciada pode terminar durante o cancelamento; preserve seu resultado final,
        // mas não envie novas respostas, cartões ou continuações após a terminalização.
        // A tela recebe o par resolvido já na primeira iteração (antes da
        // chamada externa), além de no evento terminal; Auto nunca fica
        // visualmente ambíguo durante o run.
        if (evento.type === 'done') escreverEvento(res, { type: 'done', model: modeloEfetivo })
        else if (evento.type === 'iteracao') escreverEvento(res, { ...evento, model: modeloEfetivo })
        else escreverEvento(res, evento)
      },
      pedirAprovacao: async (pedido) => {
        const concedidas = permissoesPorFluxo.get(fluxo)
        // No modo Agir, criar/escrever já estão autorizados pelo modo escolhido;
        // não repetir cartões para cada edição. Excluir continua sempre manual.
        if (fio.execucao.modoSelecionadoNoServidor && (fio.execucao.modo === 'agent' || fio.execucao.modo === 'edit') && (pedido.ferramenta === 'criar' || pedido.ferramenta === 'escrever')) return true
        // RF12-3: sessão liberada NÃO cobre `excluir` (cinto + suspensório com
        // o filtro de entrada — mesmo que 'excluir' chegue, nunca auto-libera).
        if (permiteSessao(pedido.ferramenta) && concedidas?.has(pedido.ferramenta)) return true // Q2a
        if (abort.signal.aborted || fio.execucao.estado !== 'running') return false
        fio.execucao.estado = 'awaiting-approval'
        const previa = pedido.ferramenta === 'excluir'
          ? await descreverAlvoExcluir(fio.raiz, pedido.argumentos.caminho)
          : undefined
        if (abort.signal.aborted || fio.execucao.estado !== 'awaiting-approval') return false
        const liberado = await new Promise<boolean>((resolve) => {
          fio.execucao.pendentes.set(pedido.id, { resolver: resolve, pedido })
          escreverEvento(res, { type: 'approval', pedido, ...(previa !== undefined ? { previa } : {}) })
        })
        fio.execucao.pendentes.delete(pedido.id)
        if (!abort.signal.aborted && fio.execucao.estado === 'awaiting-approval') fio.execucao.estado = 'running'
        return liberado
      },
      validarContexto: (pedido) => {
        const permissoesAtuais = permissoesPorFluxo.get(fluxo)
        const usouGrantDeSessao = !!pedido && permiteSessao(pedido.ferramenta) && !!permissoesAtuais?.has(pedido.ferramenta)
        const contextoAtual = deps.resolverContexto(fio.sessionId, fio.chatId)
        if (!contextoAtual.ok || contextoAtual.raiz !== fio.raiz || (deps.lerModo(fio.sessionId, fio.chatId) ?? 'agent') !== fio.execucao.modo) return false
        if (usouGrantDeSessao && !contextoAtual.permissoes.includes(pedido!.ferramenta)) return false
        permissoesPorFluxo.set(fluxo, new Set(contextoAtual.permissoes))
        return true
      },
      bloquearFerramenta: (pedido) => {
        if ((fio.execucao.modo === 'ask' || fio.execucao.modo === 'plan') && !['ler', 'listar', 'buscar'].includes(pedido.ferramenta)) {
          const rotulo = fio.execucao.modo === 'ask' ? 'Perguntar' : 'Planejar'
          return `Bloqueado pelo modo ${rotulo}: esta execução é somente leitura; "${pedido.ferramenta}" não foi aprovada nem executada.`
        }
        return null
      },
      sinal: abort.signal,
    })
  } catch {
    if (!abort.signal.aborted) {
      escreverEvento(res, { type: 'error', code: 'resposta', message: 'Erro inesperado do servidor ao agir.' })
    }
  } finally {
    executoresDisco.fechar()
    for (const pendente of fio.execucao.pendentes.values()) pendente.resolver(false)
    fio.execucao.pendentes.clear()
    if (fio.execucao.estado !== 'cancelled') {
      fio.execucao.estado = resultado.status === 'interrompido'
        ? 'cancelled'
        : resultado.status === 'iteracoes_excedidas' || (resultado.status === 'erro' && ['tempo', 'endereco', 'http'].includes(resultado.codigoErro ?? ''))
          ? 'paused'
          : 'completed'
    }
    if (execucaoPorFluxo.get(fluxo) === fio.execucao) execucaoPorFluxo.delete(fluxo)
    permissoesPorFluxo.delete(fluxo)
    contextoPorFluxo.delete(fluxo)
    res.off?.('close', aoFechar)
    if (!res.writableEnded) res.end()
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
  const runId = typeof corpo.runId === 'string' ? corpo.runId.trim() : ''
  const generation = Number(corpo.generation)
  const decisao = corpo.decisao
  const decisaoValida = decisao === 'permitir' || decisao === 'negar' || decisao === 'sessao'
  if (fluxo === '' || id === '' || sessionId === '' || runId === '' || !Number.isSafeInteger(generation) || generation < 1 || !decisaoValida) {
    sendErro(res, 400, 'configuracao', 'Resposta de aprovação inválida (fluxo, runId, generation, id, sessionId e decisao são obrigatórios).')
    return true
  }
  const execucao = execucaoPorId.get(runId)
  if (!execucao || execucao.fluxo !== fluxo || execucao.generation !== generation || execucao.estado !== 'awaiting-approval' || execucaoPorFluxo.get(fluxo) !== execucao) {
    sendErro(res, 409, 'approval_expired', 'Esta aprovação expirou, pertence a outra geração ou a execução já terminou.')
    return true
  }
  if (execucao.sessionId !== sessionId) {
    sendErro(res, 409, 'fluxo', 'Esta aprovação não pertence à sessão ativa.')
    return true
  }
  const contextoAtual = deps.resolverContexto(execucao.sessionId, execucao.chatId)
  if (!contextoAtual.ok || contextoAtual.raiz !== execucao.raiz || (deps.lerModo(execucao.sessionId, execucao.chatId) ?? 'agent') !== execucao.modo) {
    sendErro(res, 409, 'fluxo', 'A sessão, pasta ou modo mudou; esta aprovação foi invalidada e nenhuma ação foi executada.')
    return true
  }
  const pendente = execucao.pendentes.get(id)
  if (!pendente || execucao.controller.signal.aborted) {
    sendErro(res, 409, 'approval_expired', 'Esta execução já não espera mais resposta (a aprovação expirou ou já foi consumida).')
    return true
  }
  if (decisao === 'sessao') {
    if (!permiteSessao(pendente.pedido.ferramenta)) {
      sendErro(res, 400, 'configuracao', '"Permitir na Sessão" só vale para criar/escrever — excluir sempre pergunta, uma a uma (RF12-3).')
      return true
    }
    const ferramenta = pendente.pedido.ferramenta as 'criar' | 'escrever'
    deps.concederPermissaoSessao(execucao.sessionId, execucao.raiz, ferramenta)
    permissoesPorFluxo.get(fluxo)?.add(ferramenta)
  }
  execucao.pendentes.delete(id)
  execucao.estado = 'running'
  pendente.resolver(decisao !== 'negar')
  sendJson(res, 200, { ok: true })
  return true
}

/** POST /api/agir/cancel — invalidation terminal, vinculada à identidade F1 e à geração. */
async function tratarCancelar(req: IncomingMessage, res: ServerResponse, deps: DependenciasAgir): Promise<boolean> {
  let corpo: Record<string, unknown>
  try {
    corpo = await lerCorpo(req)
  } catch (erro) {
    sendErro(res, 400, 'configuracao', (erro as Error).message)
    return true
  }
  const fluxo = typeof corpo.fluxo === 'string' ? corpo.fluxo.trim() : ''
  const runId = typeof corpo.runId === 'string' ? corpo.runId.trim() : ''
  const generation = Number(corpo.generation)
  const sessionId = typeof corpo.sessionId === 'string' ? corpo.sessionId.trim() : ''
  const chatId = typeof corpo.chatId === 'string' ? corpo.chatId.trim() : ''
  if (!fluxo || !runId || !Number.isSafeInteger(generation) || generation < 1 || !sessionId || !chatId) {
    sendErro(res, 400, 'configuracao', 'Cancelamento inválido (fluxo, runId, generation, sessionId e chatId são obrigatórios).')
    return true
  }
  const execucao = execucaoPorId.get(runId)
  if (!execucao || execucao.fluxo !== fluxo || execucao.generation !== generation || execucao.sessionId !== sessionId || execucao.chatId !== chatId) {
    sendErro(res, 409, 'approval_expired', 'A execução não existe mais ou esta identidade expirou.')
    return true
  }
  const contextoAtual = deps.resolverContexto(sessionId, chatId)
  if (!contextoAtual.ok || contextoAtual.raiz !== execucao.raiz) {
    sendErro(res, 409, 'fluxo', 'A sessão ou pasta não corresponde; o cancelamento não foi aplicado.')
    return true
  }
  if (execucaoTerminal(execucao)) {
    sendJson(res, 200, {
      status: 'already_terminal',
      runId,
      generation,
    })
    return true
  }
  solicitarCancelamento(execucao, 'requested')
  const status = await concluirCancelamento(execucao)
  sendJson(res, 200, {
    status,
    runId,
    generation,
  })
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
  // Default conservador é Agent + aprovação manual. A seleção explícita do
  // servidor aplica a política do modo e ignora o `mode` de /api/agir.
  const modoSelecionado = deps.lerModo(validacao.pedido.sessionId, validacao.pedido.chatId)
  const modoEfetivo = modoSelecionado ?? 'agent'

  const { alvo, erro } = await deps.obterAlvo(validacao.pedido.selecaoModelo)
  if (!alvo) {
    sendErro(res, 409, erro?.code ?? 'sem_provedor', erro?.message ?? 'Nenhum provedor está ativo. Abra Provedores e escolha quem vai responder.')
    return true
  }
  if (alvo.toolCallingCapability !== 'verified') {
    const par = `${alvo.providerId ?? ''} / ${alvo.modelId ?? alvo.modelo}`.trim()
    const motivo = alvo.toolCallingCapability === 'incompatible'
      ? `O canary identificou incompatibilidade explícita de tool calling para ${par}. Agir foi bloqueado.`
      : alvo.toolCallingCapability === 'declared'
        ? `Há apenas declaração de tool calling para ${par}; falta round-trip verificado. Agir foi bloqueado.`
        : `O tool calling de ${par} não tem prova válida para a configuração atual. Verifique em Provedores; Agir foi bloqueado sem iniciar uma chamada.`
    sendErro(res, 409, 'sem_canal_nativo', motivo)
    return true
  }

  let teto: number
  try {
    teto = await deps.lerTeto()
  } catch (erro) {
    sendErro(res, 409, 'configuracao', (erro as Error).message)
    return true
  }

  // Claim síncrono: duas requisições no mesmo fluxo nunca iniciam dois runs.
  const { fluxo, sessionId, chatId } = validacao.pedido
  if (execucaoPorFluxo.has(fluxo) || continuacoesEmClaim.has(fluxo)) {
    sendErro(res, 409, 'already_running', 'Já existe uma execução ativa para esta conversa.')
    return true
  }
  retomarPorFluxo.delete(fluxo)
  const contextoFluxo = { sessionId, chatId, raiz: contexto.raiz, modo: modoEfetivo, modoSelecionadoNoServidor: modoSelecionado !== null }
  const execucao = criarExecucao(fluxo, contextoFluxo)
  const resultado = await executarFioAgir(res, {
    execucao,
    fluxo,
    sessionId,
    chatId,
    mensagens: validacao.pedido.mensagens.map((mensagem) => ({ papel: mensagem.role === 'user' ? ('usuario' as const) : ('assistente' as const), conteudo: mensagem.content })),
    raiz: contexto.raiz,
    permissoes: contexto.permissoes,
    alvo,
    teto,
  }, deps)
  guardarRetomada(fluxo, resultado, contextoFluxo, alvo)
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
  if (execucaoPorFluxo.has(fluxo) || continuacoesEmClaim.has(fluxo)) {
    sendErro(res, 409, 'already_running', 'Esta pausa já está sendo retomada por outra requisição.')
    return true
  }
  const sessionId = typeof corpo.sessionId === 'string' ? corpo.sessionId.trim() : ''
  const chatId = typeof corpo.chatId === 'string' ? corpo.chatId.trim() : ''
  if (sessionId !== retomada.contexto.sessionId || chatId !== retomada.contexto.chatId) {
    sendErro(res, 409, 'fluxo', 'A continuação não corresponde à sessão/conversa que originou a pausa.')
    return true
  }
  const contexto = deps.resolverContexto(sessionId, chatId)
  if (!contexto.ok || contexto.raiz !== retomada.contexto.raiz || (deps.lerModo(sessionId, chatId) ?? 'agent') !== retomada.contexto.modo) {
    sendErro(res, 409, 'fluxo', 'A sessão, pasta ou modo mudou; a continuação foi invalidada.')
    return true
  }
  // Claim antes de qualquer await: somente uma continuação pode consumir a pausa.
  continuacoesEmClaim.add(fluxo)

  // Continuação mantém exatamente o par resolvido no início do run.
  const alvo = retomada.alvo

  let teto: number
  try {
    teto = await deps.lerTeto()
  } catch (erro) {
    continuacoesEmClaim.delete(fluxo)
    sendErro(res, 409, 'configuracao', (erro as Error).message)
    return true
  }

  // Território e grants são relidos do registro persistido; payload do browser não é autoridade.
  if (retomarPorFluxo.get(fluxo) !== retomada || execucaoPorFluxo.has(fluxo)) {
    continuacoesEmClaim.delete(fluxo)
    sendErro(res, 409, 'already_running', 'A pausa já foi consumida ou invalidada por outra requisição.')
    return true
  }
  retomarPorFluxo.delete(fluxo)
  const execucao = criarExecucao(fluxo, retomada.contexto)
  continuacoesEmClaim.delete(fluxo)
  const resultado = await executarFioAgir(res, {
    execucao,
    fluxo,
    sessionId,
    chatId,
    mensagens: retomada.mensagens,
    raiz: contexto.raiz,
    permissoes: contexto.permissoes,
    alvo,
    teto,
  }, deps)
  guardarRetomada(fluxo, resultado, retomada.contexto, retomada.alvo)
  return true
}

async function tratarSelecionarModo(req: IncomingMessage, res: ServerResponse, deps: DependenciasAgir): Promise<boolean> {
  let corpo: Record<string, unknown>
  try { corpo = await lerCorpo(req) } catch (erro) {
    sendErro(res, 400, 'configuracao', (erro as Error).message)
    return true
  }
  const sessionId = typeof corpo.sessionId === 'string' ? corpo.sessionId.trim() : ''
  const chatId = typeof corpo.chatId === 'string' ? corpo.chatId.trim() : ''
  const modo = corpo.mode
  if (!sessionId || !chatId || sessionId.length > 200 || chatId.length > 200 || (modo !== 'agent' && modo !== 'edit' && modo !== 'ask' && modo !== 'plan')) {
    sendErro(res, 400, 'configuracao', 'Seleção de modo inválida; sessão, conversa e modo conhecido são obrigatórios.')
    return true
  }
  // Somente registra a seleção visual; nenhuma permissão de arquivo é concedida
  // aqui. Cada execução ainda precisa resolver sessão/workspace no servidor.
  deps.definirModo(sessionId, chatId, modo)
  sendJson(res, 200, { ok: true, mode: modo })
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
  if (url.pathname === '/api/agir/mode') return tratarSelecionarModo(req, res, deps)
  if (url.pathname === '/api/agir/aprovar') return tratarAprovar(req, res, deps)
  if (url.pathname === '/api/agir/cancel') return tratarCancelar(req, res, deps)
  if (url.pathname === '/api/agir/continuar') return tratarContinuar(req, res, deps)
  if (url.pathname === '/api/agir') return tratarAgir(req, res, deps)
  return false
}
