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
// repetitivo; exclusão segue a autorização específica/cartão/opt-ins de D138. O modo
// efetivo é registrado separadamente no servidor; o payload do run não manda.
// FATIA 11: o TETO vem da casa Config — a prefeitura injeta `lerTeto` (a casa
// Agir NUNCA importa outra casa abaixo do barrel — LEGO). Ao bater o teto, a
// rota guarda o diálogo por fluxo para o "Continuar" retomar com orçamento
// cheio (RF11-3); pedido novo no mesmo fluxo descarta a retomada.
// ============================================================================
import { randomUUID } from 'node:crypto'
import * as nodePath from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AlvoConversa, IniciarChamadaModelo, ObterAlvo, SelecaoModelo } from '../../conversa'
import type { EventoAgir, ExecutorFerramenta, FerramentaId, InstrucaoDeProduto, MensagemAgir, MensagemSimples, ModoAgir, NivelPermissaoAgir, PedidoFerramenta, PedidoRecuperacao, ResultadoFerramenta, ResultadoRecuperacao } from '../contract'
import { rodarAgir, type ResultadoAgir } from './agir'
import { criarExecutoresReais, type ExecutoresDisco } from './discos'
import { permiteSessao, catalogoFerramentas, ehMexida } from './ferramentas'
import { comandoExigeAprovacaoIndividual, criarExecutorComando, type ResolverShellComando } from './executorComando'
import { criarVizinhoReal, estimativaDoPedido } from './vizinho'
import { alvoDentroDoEscopo, alvoExplicitoExclusao, escopoExclusaoAutomatica } from './autorizacaoExclusao'
// D170-c (RNF15-2): protocolo HTTP e validação do pedido saíram daqui para
// `protocoloHttp.ts`. Mesmas funções, mesmas mensagens — o arquivo só parou de
// acumular três responsabilidades.
import { escreverEvento, lerCorpo, sendErro, sendJson, validarPedido, type PedidoValidado } from './protocoloHttp'
import { registrarExecucao, type RegistroExecucaoAgir } from './transcript'
import { FERRAMENTAS_ENTRE_CHATS, pedidoHumanoEntreChats, type ContextoEntreChats, type PedidoEntreChats, type ResultadoEntreChats } from '../../../../../domain/consultaEntreChats'
import { orcamentoContexto } from '../../../../../domain/capacidadeContexto'

const ROTAS_AGIR = ['/api/agir', '/api/agir/aprovar', '/api/agir/continuar', '/api/agir/cancel', '/api/agir/mode', '/api/agir/permission', '/api/agir/command-wait', '/api/agir/instruction']

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
  /** O shell padrão é resolvido pela prefeitura pelo detector compartilhado do PTY; esta casa não cria outro catálogo. */
  resolverShell?: ResolverShellComando
  /** Janela encurtável em testes controlados; produção usa o limite padrão do executor. */
  timeoutComandoMs?: number
  /** A permissão de sessão é gravada somente pelo servidor após decisão do dono. */
  concederPermissaoSessao: (sessionId: string, raiz: string, ferramenta: 'criar' | 'escrever' | 'executar') => void
  /** Modo escolhido explicitamente no seletor; nunca é lido do payload de /api/agir. */
  lerModo: (sessionId: string, chatId: string) => ModoAgir | null
  definirModo: (sessionId: string, chatId: string, modo: ModoAgir) => void
  lerPermissao?: (sessionId: string, chatId: string, raiz: string) => NivelPermissaoAgir
  definirPermissao?: (sessionId: string, chatId: string, raiz: string, nivel: NivelPermissaoAgir) => void
  lerExclusaoAutomatica?: (sessionId: string, chatId: string, raiz: string) => boolean
  definirExclusaoAutomatica?: (sessionId: string, chatId: string, raiz: string, permitir: boolean) => void
  /** Fábrica injetável para testar a barreira de commit de ferramentas mutáveis. */
  criarExecutores?: (raiz: string) => ExecutoresDisco
  /** Teto desta mensagem (FATIA 11): a prefeitura lê da casa Config a cada pedido. */
  lerTeto: () => Promise<number>
  gravarExecucao?: (registro: RegistroExecucaoAgir) => Promise<void>
  restaurarHistorico?: (contexto: { sessionId: string; chatId: string; raiz: string }, mensagens: MensagemSimples[]) =>
    Promise<{ mensagens: MensagemAgir[]; fonte: 'browser' | 'hibrido' | 'transcript'; checkpoint?: string }>
  recuperarHistorico?: (contexto: { sessionId: string; chatId: string; raiz: string }, pedido: PedidoRecuperacao) => Promise<ResultadoRecuperacao>
  recuperarMemoriaProjeto?: (contexto: { sessionId: string; chatId: string; raiz: string }, consulta: string) => Promise<ResultadoRecuperacao>
  criarConsultaEntreChats?: (contexto: ContextoEntreChats, sinal: AbortSignal, orcamentoBytes: number, textoHumano: string) => (pedido: PedidoEntreChats) => Promise<ResultadoEntreChats>
  prepararChamada?: (contexto: { sessionId: string; chatId: string; raiz: string }, mensagens: MensagemAgir[], alvo: AlvoConversa,
    sinal: AbortSignal, emitir: (evento: EventoAgir) => void, forcar?: boolean, medir?: (mensagens: MensagemAgir[]) => number) => Promise<MensagemAgir[]>
  planejarRetomada?: (contexto: { sessionId: string; chatId: string; raiz: string }, runId: string) => Promise<string>
  /**
   * FATIA 14 / DP-06: a prefeitura compõe a instrução de produto e o filtro de
   * ferramentas. Esta casa NÃO sabe o que é skill, não lê estado de
   * personalização nem descobre arquivo nenhum — recebe pronto, do mesmo jeito
   * que recebe o teto e o alvo. A direção da dependência não se inverte: a
   * prefeitura importa a casa, nunca o contrário.
   *
   * Ausente = nenhuma instrução e catálogo completo, que é o comportamento
   * anterior (contrato aditivo de D141). `raizProjeto` vem da SESSÃO persistida,
   * resolvida por `resolverContexto` — nunca do payload do browser (F1/D113).
   */
  comporContexto?: (pedido: { texto: string; raizProjeto: string | null }) => Promise<{
    instrucoesDeProduto: readonly InstrucaoDeProduto[]
    ferramentasPermitidas: readonly string[]
  }>
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
  permissao: NivelPermissaoAgir
  escopoExclusao?: string[]
  exclusoesTentadas?: Set<string>
  instrucaoAtual?: string
  recuperacao?: { restantes: number; fontes: Set<string> }
  recuperacaoAutomatica?: { restantes: number; fontes: Set<string> }
  entreChats?: boolean
  planejamentoRetomada?: boolean
  pedidoId?: string
}

interface InstrucaoHumana {
  sessionId: string; chatId: string; fluxo: string; raiz: string; criada: number
  executores: ExecutoresDisco; pedido?: PedidoFerramenta; escopo: string[]
  texto: string
}
// Recibos opacos de uma ação humana na fronteira local existente. Nunca são
// extraídos de messages nem enviados ao provedor. Expiram e são consumidos uma vez.
const instrucoes = new Map<string, InstrucaoHumana>()
type EstadoExecucao = 'running' | 'awaiting-approval' | 'cancel-requested' | 'cancelled' | 'completed' | 'paused'
interface ExecucaoAgir extends ContextoFluxo {
  runId: string
  generation: number
  fluxo: string
  estado: EstadoExecucao
  controller: AbortController
  pendentes: Map<string, AprovacaoPendente>
  aguardandoComando: Map<string, (continuar: boolean) => void>
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
export function conversaEmExecucao(sessionId: string, chatId: string): boolean {
  return [...execucaoPorFluxo.values()].some((execucao) => execucao.sessionId === sessionId && execucao.chatId === chatId)
}
export function conversaTemPausa(sessionId: string, chatId: string): boolean {
  return [...retomarPorFluxo.values()].some(({ contexto }) => contexto.sessionId === sessionId && contexto.chatId === chatId)
}
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
    aguardandoComando: new Map(),
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
  const esperas = [...execucao.aguardandoComando.values()]
  execucao.aguardandoComando.clear()
  for (const resolver of esperas) resolver(false)
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
const retomarPorFluxo = new Map<string, { mensagens: MensagemAgir[]; contexto: ContextoFluxo; alvo: AlvoConversa; runId: string }>()
const MAX_RETOMADAS = 20

function lerPermissaoEfetiva(deps: DependenciasAgir, sessionId: string, chatId: string, raiz: string): NivelPermissaoAgir {
  return deps.lerPermissao?.(sessionId, chatId, raiz) ?? 'manual'
}

/** Guarda a retomada quando o teto pausou OU um erro transitório
 * (tempo/endereco/http) interrompeu o fio — outro fim limpa o fluxo. */
function guardarRetomada(fluxo: string, resultado: ResultadoAgir, contexto: ContextoFluxo, alvo: AlvoConversa, runId: string): void {
  retomarPorFluxo.delete(fluxo)
  if (contexto.entreChats) return // A fresh human message must own every MC1 budget and ambiguity decision.
  const pausouNoTeto = resultado.status === 'iteracoes_excedidas'
  const caiuTransitorio =
    resultado.status === 'erro' &&
    (resultado.codigoErro === 'tempo' || resultado.codigoErro === 'endereco' || resultado.codigoErro === 'http')
  if ((pausouNoTeto || caiuTransitorio) && resultado.mensagensParaRetomar) {
    retomarPorFluxo.set(fluxo, { mensagens: resultado.mensagensParaRetomar, contexto, alvo, runId })
    while (retomarPorFluxo.size > MAX_RETOMADAS) {
      const maisAntigo = retomarPorFluxo.keys().next()
      if (maisAntigo.done) break
      retomarPorFluxo.delete(maisAntigo.value)
    }
  }
}

interface FioAgir {
  execucao: ExecucaoAgir
  anterior?: string
  fonteHistorico?: 'browser' | 'hibrido' | 'transcript'
  checkpoint?: string
  fluxo: string
  sessionId: string
  chatId: string
  mensagens: MensagemAgir[]
  raiz: string
  permissoes: string[]
  alvo: AlvoConversa
  teto: number
  instrucao?: InstrucaoHumana
}

/**
 * O corredor SSE compartilhado: pedido novo e "continuar" passam por aqui —
 * mesmos cartões, mesmo Parar silencioso, mesma faxina no fim.
 */
async function executarFioAgir(res: ServerResponse, fio: FioAgir, deps: DependenciasAgir): Promise<ResultadoAgir> {
  const registro = deps.gravarExecucao ? registrarExecucao(fio.execucao.runId) : undefined
  let falhaRegistro = false
  let eventosPublicados = 0
  const prefixoTurno = `${fio.sessionId}:${fio.chatId}:`
  const turnoId = fio.fluxo.startsWith(prefixoTurno) ? fio.fluxo.slice(prefixoTurno.length) : ''
  async function gravarRegistro(): Promise<void> {
    if (!registro || !deps.gravarExecucao || registro.eventos.length === eventosPublicados) return
    const eventos = [...registro.eventos]
    try {
      await deps.gravarExecucao({
        sessionId: fio.sessionId, chatId: fio.chatId, runId: fio.execucao.runId, anterior: fio.anterior, raiz: fio.raiz,
        turnoId: /^[\w-]{1,200}$/.test(turnoId) ? turnoId : undefined,
        pedidoId: fio.execucao.pedidoId,
        categoria: fio.execucao.recuperacao || fio.execucao.entreChats ? 'historico' : fio.execucao.planejamentoRetomada ? 'retomada' : undefined,
        alvo: fio.alvo.providerId && fio.alvo.modelId ? { providerId: fio.alvo.providerId, modelId: fio.alvo.modelId } : undefined,
        eventos,
      })
      eventosPublicados = eventos.length
    } catch {
      falhaRegistro = true
      throw Object.assign(new Error('Não foi possível gravar os eventos desta execução.'), { code: 'fluxo' })
    }
  }
  let concluido: EventoAgir | undefined
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Agir-Run-Id', fio.execucao.runId)
  res.setHeader('X-Agir-Generation', String(fio.execucao.generation))
  if (fio.fonteHistorico) res.setHeader('X-Agir-History-Source', fio.fonteHistorico)
  else if (fio.anterior) res.setHeader('X-Agir-History-Source', 'execucao')
  if (fio.checkpoint) res.setHeader('X-Agir-Checkpoint', fio.checkpoint)
  res.flushHeaders?.()

  const abort = fio.execucao.controller
  const aoFechar = (): void => {
    if (!res.writableEnded) solicitarCancelamento(fio.execucao, 'disconnect')
  }
  res.on?.('close', aoFechar)

  const { fluxo } = fio
  permissoesPorFluxo.set(fluxo, new Set(fio.permissoes))
  contextoPorFluxo.set(fluxo, { sessionId: fio.sessionId, chatId: fio.chatId, raiz: fio.raiz, modo: fio.execucao.modo, modoSelecionadoNoServidor: fio.execucao.modoSelecionadoNoServidor, permissao: fio.execucao.permissao })

  let resultado: ResultadoAgir = { status: 'interrompido', textoFinal: '', iteracoes: 0 }
  let recuperouLimite = false
  const orcamentoMC1 = Math.min(24_000, Math.floor((orcamentoContexto(fio.alvo.capacidade, fio.alvo.maxSaida || 2048, fio.alvo.limiteContexto)?.preventivo ?? 24_000) / 4))
  let consultarOutroChat: ReturnType<NonNullable<DependenciasAgir['criarConsultaEntreChats']>> | undefined
  try { consultarOutroChat = fio.execucao.entreChats ? deps.criarConsultaEntreChats?.(fio, abort.signal, orcamentoMC1, fio.execucao.instrucaoAtual ?? '') : undefined }
  catch { consultarOutroChat = async () => ({ status: 'scope_unverifiable', reason: 'catalog_unavailable', results: [], partial: true, sources: [], aviso: 'O catálogo histórico não está acessível.' }) }
  let consultasOutros = 0
  const executarConsultaOutroChat: ExecutorFerramenta = async pedido => {
    if (!consultarOutroChat || !fio.execucao.entreChats || consultasOutros++ >= 8 || abort.signal.aborted || !validarContexto()) return { ok: false, resumo: 'Consulta entre chats não autorizada ou limite atingido.' }
    const resultado = await consultarOutroChat({ ferramenta: pedido.ferramenta as PedidoEntreChats['ferramenta'], argumentos: pedido.argumentos })
    if (abort.signal.aborted || !validarContexto()) return { ok: false, resumo: 'Consulta interrompida; nenhum trecho foi entregue.' }
    registro?.recuperar(pedido.id, pedido.ferramenta === 'ler_trecho_chat' ? 'ler' : 'buscar', resultado.sources.map(s => `${s.sessionId}:${s.chatId}:${s.messageId}`))
    const rotulo = { ok: 'concluída', partial: 'busca parcial', not_found: 'nenhuma conversa encontrada no projeto acessível', ambiguous: 'há mais de uma conversa; informe título e data',
      forbidden: 'não autorizada', scope_unverifiable: 'origem histórica não comprovada', source_deleted: 'fonte removida ou recriada', too_large: 'histórico maior que o limite de leitura' }[resultado.status]
    const origemBloqueada = resultado.status === 'scope_unverifiable'
    const orientacao = resultado.reason === 'legacy_authorization_required'
      ? ' Renomear não comprova a origem. Para uma conversa antiga, use Gerenciar acesso histórico no menu e autorize somente a conversa desejada.'
      : ' A origem ou o estado do catálogo não pôde ser validado. Confira o estado da conversa e consulte novamente.'
    return { ok: ['ok', 'partial', 'ambiguous', 'not_found'].includes(resultado.status), resumo: `Consulta entre chats: ${rotulo}; ${resultado.results.length} resultado(s)${resultado.partial ? ' — parcial' : ''}.${origemBloqueada ? ' A consulta foi bloqueada; isso não significa que o chat não exista.' + orientacao : ''}`,
      ...(origemBloqueada ? { erroTerminal: true } : {}),
      conteudo: JSON.stringify(resultado), fontesHistoricas: resultado.sources, escolhasHistoricas: resultado.escolhas }
  }
  const assinaturaEfeito = (pedido: PedidoFerramenta) => {
    const args = { ...pedido.argumentos }
    if (typeof args.caminho === 'string') {
      const path = nodePath.resolve(fio.raiz, args.caminho).normalize('NFC')
      args.caminho = process.platform === 'win32' ? path.toLowerCase() : path
    }
    return `${pedido.ferramenta}:${JSON.stringify(Object.keys(args).sort().map((chave) => [chave, args[chave as keyof typeof args]]))}`
  }
  const efeitosTentados = new Set(fio.mensagens.flatMap((m) => m.pedidos ?? []).filter((p) => ehMexida(p.ferramenta)).map(assinaturaEfeito))
  const executoresDisco = fio.instrucao?.executores ?? (deps.criarExecutores ?? criarExecutoresReais)(fio.raiz)
  const executorComandoBase = criarExecutorComando(fio.raiz, { shellResolver: deps.resolverShell, timeoutMs: deps.timeoutComandoMs })
  const executores: Record<FerramentaId, ExecutorFerramenta> = {
    ...executoresDisco,
    buscar_chats: executarConsultaOutroChat,
    buscar_mensagens_chat: executarConsultaOutroChat,
    ler_trecho_chat: executarConsultaOutroChat,
    historico: async (pedido) => {
      const estado = fio.execucao.recuperacao ?? fio.execucao.recuperacaoAutomatica
      if (!estado || !deps.recuperarHistorico || estado.restantes <= 0 || abort.signal.aborted) {
        return { ok: false, resumo: 'A recuperação não está autorizada ou atingiu o limite desta consulta.' }
      }
      estado.restantes -= 1
      const { acao, consulta, messageId } = pedido.argumentos
      const valor = acao === 'buscar' || acao === 'projeto' ? consulta : messageId
      if ((acao !== 'buscar' && acao !== 'ler' && acao !== 'projeto') || typeof valor !== 'string' || !valor.trim() ||
          valor.length > (acao === 'ler' ? 200 : 120) || (acao === 'ler' && !estado.fontes.has(valor)) ||
          (acao === 'projeto' && (!deps.recuperarMemoriaProjeto || !!fio.execucao.recuperacao))) {
        return { ok: false, resumo: 'Use uma consulta válida ou uma referência retornada nesta execução.' }
      }
      try {
        const recuperado = acao === 'projeto' ? await deps.recuperarMemoriaProjeto!(fio, valor.trim())
          : await deps.recuperarHistorico(fio, { acao, valor: valor.trim() })
        if (abort.signal.aborted || !validarContexto()) return { ok: false, resumo: 'A consulta foi interrompida.' }
        if (acao !== 'projeto') for (const fonte of recuperado.fontes) estado.fontes.add(fonte)
        registro?.recuperar(pedido.id, acao === 'projeto' ? 'buscar' : acao, recuperado.fontes)
        return { ok: true, resumo: `Histórico deste chat: ${recuperado.fontes.length} fonte(s).`, conteudo: recuperado.conteudo }
      } catch {
        return { ok: false, resumo: 'Não foi possível consultar o histórico deste chat.' }
      }
    },
    executar: async (pedido, contexto) => {
      if (abort.signal.aborted || fio.execucao.estado !== 'running') return { ok: false, resumo: 'Cancelado antes de iniciar; nenhum processo foi iniciado.' }
      efeitosTentados.add(assinaturaEfeito(pedido))
      const operacao = executorComandoBase(pedido, contexto).then((resultado) => {
        if (resultado.efeitoIniciado) fio.execucao.mutacoesConfirmadas += 1
        return resultado
      }, (erro: unknown) => {
        fio.execucao.mutacoesConfirmadas += 1 // exceção não comprova ausência de efeito
        throw erro
      })
      fio.execucao.efeitoMutavelEmAndamento = operacao
      try { return await operacao } finally {
        if (fio.execucao.efeitoMutavelEmAndamento === operacao) delete fio.execucao.efeitoMutavelEmAndamento
      }
    },
  }
  for (const ferramenta of ['criar', 'escrever', 'excluir'] as const) {
    const executar = executoresDisco[ferramenta]
    executores[ferramenta] = async (pedido, contexto) => {
      if (abort.signal.aborted || fio.execucao.estado !== 'running') {
        return { ok: false, resumo: ferramenta === 'excluir' ? 'Cancelada antes de iniciar a exclusão; nada foi movido.' : 'Cancelada antes de iniciar a alteração; o arquivo não foi publicado.' }
      }
      if (ferramenta === 'excluir' && autorizacoesAutomaticas.has(pedido) && !automaticaAtiva()) {
        return { ok: false, resumo: 'Exclusões automáticas revogadas antes da execução; nada foi movido.' }
      }
      // Registra a operação antes de ceder o event loop. O cancel endpoint
      // aguarda esta Promise e só então confirma se houve publicação.
      efeitosTentados.add(assinaturaEfeito(pedido))
      const operacao = Promise.resolve().then(() => executar(pedido, contexto)).then((resultado) => {
        if (resultado.ok || resultado.efeitoIniciado) fio.execucao.mutacoesConfirmadas += 1
        return resultado
      }, (erro: unknown) => {
        fio.execucao.mutacoesConfirmadas += 1 // possível efeito: nunca confirmar cancelamento limpo
        throw erro
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
  if (registro) {
    for (const ferramenta of ['ler', 'listar', 'buscar'] as const) {
      executores[ferramenta] = (pedido, contexto) => executoresDisco[ferramenta](pedido, {
        ...contexto, aoLocalizador: (localizador) => registro.localizar(pedido.id, localizador),
      })
    }
  }
  const autorizacoesAutomaticas = new WeakSet<PedidoFerramenta>()
  const automaticaAtiva = (): boolean => lerPermissaoEfetiva(deps, fio.sessionId, fio.chatId, fio.raiz) === 'allow-all' && deps.lerExclusaoAutomatica?.(fio.sessionId, fio.chatId, fio.raiz) === true
  let instrucaoConsumida = false
  const reconfirmacoes = fio.execucao.exclusoesTentadas ?? new Set<string>()
  fio.execucao.exclusoesTentadas = reconfirmacoes
  function validarContexto(pedido?: PedidoFerramenta): boolean {
    const permissoesAtuais = permissoesPorFluxo.get(fluxo)
    const usouGrantDeSessao = pedido && permiteSessao(pedido.ferramenta) && permissoesAtuais?.has(pedido.ferramenta)
    const contextoAtual = deps.resolverContexto(fio.sessionId, fio.chatId)
    if (!contextoAtual.ok || contextoAtual.raiz !== fio.raiz || (deps.lerModo(fio.sessionId, fio.chatId) ?? 'agent') !== fio.execucao.modo || lerPermissaoEfetiva(deps, fio.sessionId, fio.chatId, fio.raiz) !== fio.execucao.permissao) return false
    if (pedido && usouGrantDeSessao && !contextoAtual.permissoes.includes(pedido.ferramenta)) return false
    permissoesPorFluxo.set(fluxo, new Set(contextoAtual.permissoes))
    return true
  }
  try {
    // FATIA 14 / DP-06: a instrução de produto é composta pelo SERVIDOR, a partir
    // da raiz da SESSÃO. O texto lido é a última mensagem do DONO no histórico que
    // já vai ao modelo — não existe segunda fonte de texto, então não há como a
    // invocação detectada divergir do que o modelo vai ver.
    const textoDoDono = [...fio.mensagens].reverse().find((mensagem) => mensagem.papel === 'usuario')?.conteudo ?? ''
    const composicao = !fio.execucao.entreChats && !fio.execucao.recuperacao && !fio.execucao.planejamentoRetomada && deps.comporContexto
      ? await deps.comporContexto({ texto: textoDoDono, raizProjeto: fio.raiz })
      : null
    const emitirMemoria = (evento: EventoAgir) => { if (!abort.signal.aborted && !res.writableEnded) escreverEvento(res, evento) }
    resultado = await rodarAgir({
      vizinho: async (historico, opcoes) => {
        if (fio.execucao.entreChats && consultasOutros > 8) throw Object.assign(new Error('Limite desta consulta entre chats atingido. Refine a pergunta em uma nova mensagem.'), { code: 'limite' })
        if (deps.prepararChamada && fio.alvo.providerId && fio.alvo.modelId) {
          const atual = await deps.obterAlvo({ tipo: 'explicita', providerId: fio.alvo.providerId, modelId: fio.alvo.modelId })
          if (!atual.alvo) throw Object.assign(new Error('A seleção ficou indisponível antes de preparar o contexto.'), { code: 'selection_unavailable' })
          fio.alvo = atual.alvo
        }
        if (registro) await gravarRegistro()
        if (abort.signal.aborted || !validarContexto()) {
          throw Object.assign(new Error('O contexto da execução mudou durante a gravação.'), { code: 'fluxo' })
        }
        const preparar = deps.prepararChamada && !fio.execucao.entreChats && !fio.execucao.recuperacao && !fio.execucao.planejamentoRetomada
          ? (forcar: boolean) => deps.prepararChamada!(fio, historico, fio.alvo, abort.signal, emitirMemoria, forcar,
              (mensagens) => estimativaDoPedido(fio.alvo, mensagens, opcoes)) : undefined
        let contexto = preparar ? await preparar(false) : historico
        if (fio.execucao.entreChats) {
          const teto = orcamentoContexto(fio.alvo.capacidade, fio.alvo.maxSaida || 2048, fio.alvo.limiteContexto)?.preventivo ?? 24_000
          if (estimativaDoPedido(fio.alvo, contexto, opcoes) > teto) throw Object.assign(new Error('A consulta entre chats excede o orçamento atual. Reduza a pergunta ou aumente a janela validada do modelo.'), { code: 'configuracao' })
        }
        if (abort.signal.aborted || !validarContexto()) throw Object.assign(new Error('O projeto mudou durante a preparação do contexto.'), { code: 'fluxo' })
        let saiuTexto = false
        const observadores = { ...opcoes, validarAntesDaChamada: validarContexto, aoTexto: (texto: string) => { if (texto.length) saiuTexto = true; opcoes?.aoTexto?.(texto) } }
        const atual = criarVizinhoReal(fio.alvo, {}, deps.iniciarModelo)
        try { return await atual(contexto, observadores) } catch (erro) {
          if (!preparar || recuperouLimite || saiuTexto || abort.signal.aborted ||
              (erro as { code?: string })?.code !== 'limite') throw erro
          recuperouLimite = true
          let reduzido: MensagemAgir[]
          try { reduzido = await preparar(true) } catch {
            throw Object.assign(new Error(`${(erro as Error).message} Não foi possível compactar com segurança; nenhuma ferramenta foi repetida.`), { code: 'limite' })
          }
          if (JSON.stringify(reduzido).length >= JSON.stringify(contexto).length || !validarContexto()) throw erro
          contexto = reduzido
          return atual(contexto, observadores)
        }
      },
      historico: fio.mensagens,
      executores,
      antesDeExecutar: registro ? gravarRegistro : undefined,
      teto: fio.teto,
      // Sem a dependência, os dois chegam undefined: nenhuma instrução e catálogo
      // completo, que é exatamente o comportamento anterior (D141, aditivo).
      instrucoesDeProduto: composicao?.instrucoesDeProduto,
      ferramentasPermitidas: fio.execucao.entreChats ? FERRAMENTAS_ENTRE_CHATS : fio.execucao.planejamentoRetomada ? [] : fio.execucao.recuperacao ? ['historico'] :
        deps.recuperarHistorico ? [...(composicao?.ferramentasPermitidas ?? catalogoFerramentas.map(({ id }) => id)), 'historico'] : composicao?.ferramentasPermitidas,
      emitir: (evento) => {
        registro?.observar(evento)
        if ((abort.signal.aborted && evento.type !== 'tool_result') || res.writableEnded) return
        if (fio.execucao.entreChats && (evento.type === 'teto' ||
          (evento.type === 'error' && ['tempo', 'endereco', 'http'].includes(evento.code)))) {
          escreverEvento(res, { type: 'error', code: 'configuracao', message: 'A consulta entre chats foi interrompida ou atingiu seu limite. Envie uma nova mensagem ou selecione novamente a conversa; nenhuma ferramenta será repetida automaticamente.' })
          return
        }
        // A ferramenta já iniciada pode terminar durante o cancelamento; preserve seu resultado final,
        // mas não envie novas respostas, cartões ou continuações após a terminalização.
        // A tela recebe o par resolvido já na primeira iteração (antes da
        // chamada externa), além de no evento terminal; Auto nunca fica
        // visualmente ambíguo durante o run.
        if (evento.type === 'done') {
          concluido = { type: 'done', model: modeloEfetivo }
          if (!registro) escreverEvento(res, concluido)
        }
        else if (evento.type === 'iteracao') escreverEvento(res, { ...evento, model: modeloEfetivo })
        else escreverEvento(res, evento)
      },
      pedirAprovacao: async (pedido) => {
        const exigeReconfirmacao = recuperouLimite && efeitosTentados.size > 0
        const concedidas = permissoesPorFluxo.get(fluxo)
        const nivelPermissao = lerPermissaoEfetiva(deps, fio.sessionId, fio.chatId, fio.raiz)
        // Reconflito nunca reutiliza opt-in/instrução: exige cartão atualizado.
        if (!exigeReconfirmacao && pedido.ferramenta === 'excluir') {
          if (!instrucaoConsumida && fio.instrucao?.pedido) {
            const original = fio.instrucao.pedido
            if (alvoDentroDoEscopo(fio.raiz, pedido.argumentos.caminho, [String(original.argumentos.caminho)]) &&
                alvoDentroDoEscopo(fio.raiz, original.argumentos.caminho, [nodePath.resolve(fio.raiz, String(pedido.argumentos.caminho))])) {
              instrucaoConsumida = true
              if (executoresDisco.transferirPrevia?.(original, pedido)) {
                reconfirmacoes.add(nodePath.resolve(fio.raiz, String(pedido.argumentos.caminho)).toLocaleLowerCase())
                escreverEvento(res, { type: 'tool_progress', id: pedido.id, text: 'Autorização específica da instrução humana atual; alvo e versão serão revalidados.' })
                return true
              }
            }
          }
          const caminho = nodePath.resolve(fio.raiz, String(pedido.argumentos.caminho)).toLocaleLowerCase()
          if (!reconfirmacoes.has(caminho) && automaticaAtiva() && alvoDentroDoEscopo(fio.raiz, pedido.argumentos.caminho, fio.execucao.escopoExclusao ?? [])) {
            await executoresDisco.prepararExclusao(pedido, abort.signal)
            reconfirmacoes.add(caminho)
            if (!automaticaAtiva() || abort.signal.aborted) return false
            autorizacoesAutomaticas.add(pedido)
            escreverEvento(res, { type: 'tool_progress', id: pedido.id, text: 'Exclusão automática autorizada para esta tarefa; somente Lixeira do sistema.' })
            return true
          }
        }
        if (!exigeReconfirmacao && nivelPermissao === 'allow-all' && pedido.ferramenta !== 'excluir') return true
        // D121: Agent/Edit já dispensam prompts repetitivos de criar/escrever;
        // isto não altera o contrato histórico dessas operações.
        if (!exigeReconfirmacao && fio.execucao.modoSelecionadoNoServidor && (fio.execucao.modo === 'agent' || fio.execucao.modo === 'edit') && (pedido.ferramenta === 'criar' || pedido.ferramenta === 'escrever')) return true
        if (!exigeReconfirmacao && pedido.ferramenta === 'executar') {
          const comando = typeof pedido.argumentos.comando === 'string' ? pedido.argumentos.comando : ''
          const exigeAceiteIndividual = comandoExigeAprovacaoIndividual(comando)
          if (!exigeAceiteIndividual && concedidas?.has('executar')) return true
        } else if (!exigeReconfirmacao && permiteSessao(pedido.ferramenta) && concedidas?.has(pedido.ferramenta)) {
          return true
        }
        if (abort.signal.aborted || fio.execucao.estado !== 'running') return false
        fio.execucao.estado = 'awaiting-approval'
        const previa = pedido.ferramenta === 'excluir'
          ? await executoresDisco.prepararExclusao(pedido, abort.signal)
          : pedido.ferramenta === 'executar'
            ? `Diretório inicial: ${fio.raiz}\\nShell: detectado pelo aplicativo\\nComando: ${String(pedido.argumentos.comando ?? '').slice(0, 400)}`
            : undefined
        if (abort.signal.aborted || fio.execucao.estado !== 'awaiting-approval') return false
        const allowSession = !exigeReconfirmacao && permiteSessao(pedido.ferramenta) && !(pedido.ferramenta === 'executar' && comandoExigeAprovacaoIndividual(String(pedido.argumentos.comando ?? '')))
        const evento = { type: 'approval', pedido, ...(previa !== undefined ? { previa } : {}), allowSession } as const
        registro?.observar(evento)
        await gravarRegistro()
        if (abort.signal.aborted || fio.execucao.estado !== 'awaiting-approval') return false
        const liberado = await new Promise<boolean>((resolve) => {
          fio.execucao.pendentes.set(pedido.id, { resolver: resolve, pedido })
          escreverEvento(res, evento)
        })
        if (!abort.signal.aborted) {
          registro?.decisao(pedido.id, liberado)
          await gravarRegistro()
        }
        fio.execucao.pendentes.delete(pedido.id)
        if (!abort.signal.aborted && fio.execucao.estado === 'awaiting-approval') fio.execucao.estado = 'running'
        return liberado
      },
      validarContexto,
      bloquearFerramenta: (pedido) => {
        if (fio.execucao.entreChats) return (FERRAMENTAS_ENTRE_CHATS as readonly string[]).includes(pedido.ferramenta) ? null : 'Esta consulta é somente de outros chats: não autoriza arquivos, comandos, memórias de projeto ou outras ferramentas.'
        if ((FERRAMENTAS_ENTRE_CHATS as readonly string[]).includes(pedido.ferramenta)) return 'Consulte outros chats somente mediante pedido humano explícito atual; use /chats seguido da consulta se necessário.'
        if (recuperouLimite && ehMexida(pedido.ferramenta) && efeitosTentados.has(assinaturaEfeito(pedido))) {
          return 'Ação já tentada antes da recuperação de contexto; não será repetida. Confira o resultado e peça nova autorização em uma tarefa nova se precisar repeti-la.'
        }
        if (fio.execucao.planejamentoRetomada) return 'A retomada de planejamento exige uma nova tarefa e novas autorizações antes de executar ferramentas.'
        if (fio.execucao.recuperacao && pedido.ferramenta !== 'historico') return 'A consulta histórica não autoriza acesso a arquivos nem execução de comandos.'
        if (!fio.execucao.recuperacao && !fio.execucao.recuperacaoAutomatica && pedido.ferramenta === 'historico') return 'A recuperação histórica não está disponível nesta execução.'
        if (pedido.ferramenta === 'historico') return null
        if ((fio.execucao.modo === 'ask' || fio.execucao.modo === 'plan') && !['ler', 'listar', 'buscar'].includes(pedido.ferramenta)) {
          const rotulo = fio.execucao.modo === 'ask' ? 'Perguntar' : 'Planejar'
          return `Bloqueado pelo modo ${rotulo}: esta execução é somente leitura; "${pedido.ferramenta}" não foi aprovada nem executada.`
        }
        if ((pedido.ferramenta === 'criar' || pedido.ferramenta === 'escrever') && typeof pedido.argumentos.caminho === 'string') {
          const caminho = nodePath.resolve(fio.raiz, pedido.argumentos.caminho)
          if (/[\\/]docs[\\/]0[1-9] - [^\\/]+\.md$/iu.test(caminho)) {
            const texto = fio.execucao.instrucaoAtual ?? ''
            const nome = nodePath.basename(caminho)
            const autoriza = /^(?:por favor[, ]+)?(?:edite|atualize|corrija|escreva|crie|altere|update|edit|write|create)\s/iu.test(texto.trim()) && (texto.includes(caminho) || texto.includes(`"${nome}"`) || texto.includes(`\`${nome}\``))
            if (!autoriza) return 'Documento canônico protegido: esta tarefa não contém pedido humano específico para editar este documento. Permissão de criar descartáveis ou excluir arquivos não autoriza essa alteração.'
          }
        }
        return null
      },
      aguardarContinuacao: async (pedido) => {
        if (abort.signal.aborted || fio.execucao.estado !== 'running') return false
        fio.execucao.estado = 'awaiting-approval'
        const continuar = await new Promise<boolean>((resolve) => {
          fio.execucao.aguardandoComando.set(pedido.id, resolve)
          escreverEvento(res, { type: 'command_waiting', id: pedido.id })
        })
        fio.execucao.aguardandoComando.delete(pedido.id)
        if (!abort.signal.aborted && fio.execucao.estado === 'awaiting-approval') fio.execucao.estado = 'running'
        return continuar
      },
      sinal: abort.signal,
    })
  } catch (erro) {
    if (!abort.signal.aborted) {
      resultado = { status: 'erro', textoFinal: '', iteracoes: 0, codigoErro: 'resposta' }
      escreverEvento(res, { type: 'error', code: 'resposta', message: erro instanceof Error && erro.message.startsWith('Exclusão não preparada:') ? erro.message : 'Erro inesperado do servidor ao agir. Confira os resultados já concluídos antes de tentar novamente.' })
    }
  } finally {
    executoresDisco.fechar()
    for (const pendente of fio.execucao.pendentes.values()) pendente.resolver(false)
    fio.execucao.pendentes.clear()
    if (registro) {
      registro.eventos.push({ tipo: 'encerramento', status: resultado.status })
      try {
        await gravarRegistro()
        if (falhaRegistro) throw new Error('Falha de gravação nesta execução.')
        if (concluido && !abort.signal.aborted && !res.writableEnded) escreverEvento(res, concluido)
      } catch {
        resultado = { status: 'erro', textoFinal: resultado.textoFinal, iteracoes: resultado.iteracoes, codigoErro: 'fluxo' }
        if (!abort.signal.aborted && !res.writableEnded) escreverEvento(res, { type: 'error', code: 'fluxo', message: 'Não foi possível gravar os eventos desta execução. Confira os resultados antes de tentar novamente.' })
      }
    }
    if (fio.execucao.estado !== 'cancelled') {
      fio.execucao.estado = resultado.status === 'interrompido'
        ? 'cancelled'
        : !fio.execucao.entreChats && (resultado.status === 'iteracoes_excedidas' || (resultado.status === 'erro' && ['tempo', 'endereco', 'http'].includes(resultado.codigoErro ?? '')))
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
  if (!contextoAtual.ok || contextoAtual.raiz !== execucao.raiz || (deps.lerModo(execucao.sessionId, execucao.chatId) ?? 'agent') !== execucao.modo || lerPermissaoEfetiva(deps, execucao.sessionId, execucao.chatId, execucao.raiz) !== execucao.permissao) {
    sendErro(res, 409, 'fluxo', 'A sessão, pasta ou modo mudou; esta aprovação foi invalidada e nenhuma ação foi executada.')
    return true
  }
  const pendente = execucao.pendentes.get(id)
  if (!pendente || execucao.controller.signal.aborted) {
    sendErro(res, 409, 'approval_expired', 'Esta execução já não espera mais resposta (a aprovação expirou ou já foi consumida).')
    return true
  }
  if (decisao === 'sessao') {
    const comandoPerigoso = pendente.pedido.ferramenta === 'executar' && comandoExigeAprovacaoIndividual(String(pendente.pedido.argumentos.comando ?? ''))
    if (!permiteSessao(pendente.pedido.ferramenta) || comandoPerigoso) {
      const motivo = pendente.pedido.ferramenta === 'executar'
        ? 'Comandos de alto risco não aceitam grant de sessão; sempre exigem aprovação individual.'
        : 'Esta ferramenta não aceita grant de sessão; o cartão sempre pergunta antes de executar.'
      sendErro(res, 400, 'configuracao', motivo)
      return true
    }
    const ferramenta = pendente.pedido.ferramenta as 'criar' | 'escrever' | 'executar'
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

/** Ação exclusiva do envio humano na UI, protegida pela fronteira local/Origin.
 * O run recebe somente o recibo opaco; messages nunca concede autorização. */
async function tratarInstrucaoHumana(req: IncomingMessage, res: ServerResponse, deps: DependenciasAgir): Promise<boolean> {
  let corpo: Record<string, unknown>
  try { corpo = await lerCorpo(req) } catch {
    sendErro(res, 400, 'configuracao', 'Instrução inválida.'); return true
  }
  const { sessionId, chatId, fluxo, text } = corpo
  if (typeof sessionId !== 'string' || typeof chatId !== 'string' || typeof fluxo !== 'string' || !fluxo || typeof text !== 'string' || text.length > 100_000) {
    sendErro(res, 400, 'configuracao', 'Instrução sem identidade ou texto válido.'); return true
  }
  const contexto = deps.resolverContexto(sessionId, chatId)
  if (!contexto.ok) { sendErro(res, 409, 'fluxo', contexto.message); return true }
  for (const [id, instrucao] of instrucoes) {
    if (Date.now() - instrucao.criada > 300_000 || (instrucao.sessionId === sessionId && instrucao.chatId === chatId) || instrucoes.size >= 20) {
      instrucao.executores.fechar(); instrucoes.delete(id)
    }
  }
  const executores = (deps.criarExecutores ?? criarExecutoresReais)(contexto.raiz)
  const alvo = alvoExplicitoExclusao(text)
  let pedido: PedidoFerramenta | undefined
  let aviso: string | undefined
  if (alvo && !['ask', 'plan'].includes(deps.lerModo(sessionId, chatId) ?? 'agent')) {
    pedido = { id: randomUUID(), ferramenta: 'excluir', argumentos: { caminho: nodePath.resolve(contexto.raiz, alvo) } }
    try { await executores.prepararExclusao(pedido) } catch (erro) {
      aviso = erro instanceof Error ? erro.message : 'Não foi possível preparar exclusão; será necessária confirmação.'
      pedido = undefined
    }
  }
  const token = randomUUID()
  instrucoes.set(token, { sessionId, chatId, fluxo, raiz: contexto.raiz, criada: Date.now(), executores, pedido, escopo: escopoExclusaoAutomatica(contexto.raiz, text), texto: text })
  sendJson(res, 200, { token, ...(aviso ? { aviso } : {}) })
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
  const permissaoEfetiva = lerPermissaoEfetiva(deps, validacao.pedido.sessionId, validacao.pedido.chatId, contexto.raiz)

  const { alvo, erro } = await deps.obterAlvo(validacao.pedido.selecaoModelo)
  if (res.destroyed || res.writableEnded) return true
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

  // Claim síncrono: duas requisições no mesmo fluxo nunca iniciam dois runs.
  const { fluxo, sessionId, chatId } = validacao.pedido
  if (execucaoPorFluxo.has(fluxo) || continuacoesEmClaim.has(fluxo)) {
    sendErro(res, 409, 'already_running', 'Já existe uma execução ativa para esta conversa.')
    return true
  }
  retomarPorFluxo.delete(fluxo)
  const token = typeof corpo.instructionToken === 'string' ? corpo.instructionToken : ''
  const instrucao = instrucoes.get(token)
  if (token && (!instrucao || instrucao.fluxo !== fluxo || instrucao.sessionId !== sessionId || instrucao.chatId !== chatId || instrucao.raiz !== contexto.raiz || Date.now() - instrucao.criada > 300_000)) {
    sendErro(res, 409, 'fluxo', 'A instrução humana expirou ou pertence a outro contexto; envie novamente ou use confirmação individual.')
    return true
  }
  instrucoes.delete(token)
  const textoAtual = validacao.pedido.mensagens.at(-1)
  const consultaEntreChats = !!deps.criarConsultaEntreChats && !!instrucao && textoAtual?.role === 'user' &&
    instrucao.texto === textoAtual.content && pedidoHumanoEntreChats(instrucao.texto)
  if (textoAtual?.role === 'user' && /^\/chats(?:\s|$)/iu.test(textoAtual.content.trim()) && !consultaEntreChats) {
    sendErro(res, 400, 'configuracao', 'Envie /chats seguido da consulta por uma nova mensagem humana. Nenhuma consulta foi iniciada.'); return true
  }
  const consultaHistorica = deps.recuperarHistorico && textoAtual?.role === 'user'
    ? /^\/historico\s+([\s\S]+)$/iu.exec(textoAtual.content.trim())?.[1].trim() : undefined
  const retomadaId = deps.planejarRetomada && textoAtual?.role === 'user'
    ? /^\/retomar\s+([a-f0-9-]{36})$/iu.exec(textoAtual.content.trim())?.[1] : undefined
  if (textoAtual?.role === 'user' &&
      ((/^\/retomar(?:\s|$)/iu.test(textoAtual.content.trim()) && !retomadaId) ||
       (/^\/historico(?:\s|$)/iu.test(textoAtual.content.trim()) && !consultaHistorica))) {
    sendErro(res, 400, 'configuracao', 'O comando de memória está incompleto ou indisponível.')
    return true
  }
  const contextoFluxo: ContextoFluxo = { sessionId, chatId, raiz: contexto.raiz, modo: modoEfetivo, modoSelecionadoNoServidor: modoSelecionado !== null, permissao: permissaoEfetiva, escopoExclusao: instrucao?.escopo ?? [], exclusoesTentadas: new Set<string>(), instrucaoAtual: instrucao?.texto,
    entreChats: consultaEntreChats,
    recuperacao: consultaHistorica ? { restantes: 3, fontes: new Set() } : undefined,
    recuperacaoAutomatica: !consultaEntreChats && !consultaHistorica && !retomadaId && deps.recuperarHistorico ? { restantes: 3, fontes: new Set() } : undefined,
    planejamentoRetomada: Boolean(retomadaId), pedidoId: typeof textoAtual?.id === 'string' && /^[\w-]{1,200}$/.test(textoAtual.id) ? textoAtual.id : undefined }
  if (res.destroyed || res.writableEnded) return true
  const execucao = criarExecucao(fluxo, contextoFluxo)
  let historico: Awaited<ReturnType<NonNullable<DependenciasAgir['restaurarHistorico']>>>
  try {
    historico = consultaEntreChats
      ? { fonte: 'browser', mensagens: [{ papel: 'usuario', conteudo: instrucao!.texto }] }
      : retomadaId && deps.planejarRetomada
      ? { fonte: 'transcript', mensagens: [{ papel: 'usuario', conteudo: await deps.planejarRetomada(contextoFluxo, retomadaId) }] }
      : consultaHistorica
      ? { fonte: 'browser', mensagens: [{ papel: 'usuario', conteudo: consultaHistorica }] }
      : deps.restaurarHistorico
      ? await deps.restaurarHistorico(contextoFluxo, validacao.pedido.mensagens)
      : { fonte: 'browser', mensagens: validacao.pedido.mensagens.map(({ role, content }) => ({ papel: role === 'user' ? 'usuario' : 'assistente', conteudo: content })) }
  } catch {
    solicitarCancelamento(execucao, 'requested')
    if (execucaoPorFluxo.get(fluxo) === execucao) execucaoPorFluxo.delete(fluxo)
    sendErro(res, 409, 'fluxo', 'Não foi possível recuperar o histórico. Nenhuma ferramenta foi iniciada.')
    return true
  }
  const resultado = await executarFioAgir(res, {
    execucao,
    fluxo,
    sessionId,
    chatId,
    mensagens: historico.mensagens,
    fonteHistorico: historico.fonte,
    checkpoint: historico.checkpoint,
    raiz: contexto.raiz,
    permissoes: contexto.permissoes,
    alvo,
    teto,
    instrucao,
  }, deps)
  guardarRetomada(fluxo, resultado, contextoFluxo, alvo, execucao.runId)
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
  if (retomada.contexto.entreChats) {
    retomarPorFluxo.delete(fluxo)
    sendErro(res, 409, 'configuracao', 'Consulta entre chats exige uma nova mensagem humana; a escolha e o orçamento anteriores não são renovados por Continuar.')
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
  if (!contexto.ok || contexto.raiz !== retomada.contexto.raiz || (deps.lerModo(sessionId, chatId) ?? 'agent') !== retomada.contexto.modo || lerPermissaoEfetiva(deps, sessionId, chatId, contexto.raiz) !== retomada.contexto.permissao) {
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
    anterior: retomada.runId,
    mensagens: retomada.mensagens,
    raiz: contexto.raiz,
    permissoes: contexto.permissoes,
    alvo,
    teto,
  }, deps)
  guardarRetomada(fluxo, resultado, retomada.contexto, retomada.alvo, execucao.runId)
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

async function tratarSelecionarPermissao(req: IncomingMessage, res: ServerResponse, deps: DependenciasAgir): Promise<boolean> {
  let corpo: Record<string, unknown>
  try { corpo = await lerCorpo(req) } catch (erro) {
    sendErro(res, 400, 'configuracao', (erro as Error).message)
    return true
  }
  const sessionId = typeof corpo.sessionId === 'string' ? corpo.sessionId.trim() : ''
  const chatId = typeof corpo.chatId === 'string' ? corpo.chatId.trim() : ''
  const nivel = corpo.permission
  if (!sessionId || !chatId || sessionId.length > 200 || chatId.length > 200 || (nivel !== 'manual' && nivel !== 'allow-all')) {
    sendErro(res, 400, 'configuracao', 'Seleção de permissão inválida; sessão, conversa e nível conhecido são obrigatórios.')
    return true
  }
  const contexto = deps.resolverContexto(sessionId, chatId)
  if (!contexto.ok) {
    sendErro(res, 409, 'fluxo', contexto.message)
    return true
  }
  if (!deps.definirPermissao) {
    sendErro(res, 503, 'configuracao', 'A seleção de permissões não está conectada à autoridade server-side.')
    return true
  }
  const anterior = lerPermissaoEfetiva(deps, sessionId, chatId, contexto.raiz)
  const autoAnterior = deps.lerExclusaoAutomatica?.(sessionId, chatId, contexto.raiz) === true
  if (corpo.automaticDeletes !== undefined && (typeof corpo.automaticDeletes !== 'boolean' || !deps.definirExclusaoAutomatica || (corpo.automaticDeletes && nivel !== 'allow-all'))) {
    sendErro(res, 400, 'configuracao', 'Exclusões automáticas exigem opção booleana explícita e Permitir tudo ativo.')
    return true
  }
  deps.definirPermissao(sessionId, chatId, contexto.raiz, nivel as NivelPermissaoAgir)
  if (typeof corpo.automaticDeletes === 'boolean') deps.definirExclusaoAutomatica?.(sessionId, chatId, contexto.raiz, corpo.automaticDeletes)
  let cancelamento: 'none' | 'cancelled' | 'cancelled_with_effects' = 'none'
  if ((anterior === 'allow-all' && nivel === 'manual') || (autoAnterior && corpo.automaticDeletes === false)) {
    const ativas = [...execucaoPorFluxo.values()].filter((execucao) => execucao.sessionId === sessionId && execucao.chatId === chatId)
    for (const execucao of ativas) {
      if (!solicitarCancelamento(execucao, 'requested')) continue
      const status = await concluirCancelamento(execucao)
      if (status === 'cancelled_with_effects') cancelamento = status
      else if (cancelamento === 'none') cancelamento = 'cancelled'
    }
  }
  sendJson(res, 200, { ok: true, permission: nivel, automaticDeletes: deps.lerExclusaoAutomatica?.(sessionId, chatId, contexto.raiz) === true, cancelledRun: cancelamento })
  return true
}

async function tratarRespostaAguardarComando(req: IncomingMessage, res: ServerResponse, deps: DependenciasAgir): Promise<boolean> {
  let corpo: Record<string, unknown>
  try { corpo = await lerCorpo(req) } catch (erro) {
    sendErro(res, 400, 'configuracao', (erro as Error).message)
    return true
  }
  const fluxo = typeof corpo.fluxo === 'string' ? corpo.fluxo.trim() : ''
  const id = typeof corpo.id === 'string' ? corpo.id.trim() : ''
  const runId = typeof corpo.runId === 'string' ? corpo.runId.trim() : ''
  const sessionId = typeof corpo.sessionId === 'string' ? corpo.sessionId.trim() : ''
  const chatId = typeof corpo.chatId === 'string' ? corpo.chatId.trim() : ''
  const generation = Number(corpo.generation)
  const decisao = corpo.decisao
  if (!fluxo || !id || !runId || !sessionId || !chatId || !Number.isSafeInteger(generation) || generation < 1 || (decisao !== 'continuar' && decisao !== 'parar')) {
    sendErro(res, 400, 'configuracao', 'Resposta de espera inválida; identidade da execução e decisão são obrigatórias.')
    return true
  }
  const execucao = execucaoPorId.get(runId)
  if (!execucao || execucao.fluxo !== fluxo || execucao.generation !== generation || execucao.sessionId !== sessionId || execucao.chatId !== chatId || execucao.estado !== 'awaiting-approval') {
    sendErro(res, 409, 'approval_expired', 'A pergunta de espera expirou ou pertence a outra execução.')
    return true
  }
  const contexto = deps.resolverContexto(sessionId, chatId)
  if (!contexto.ok || contexto.raiz !== execucao.raiz || lerPermissaoEfetiva(deps, sessionId, chatId, execucao.raiz) !== execucao.permissao) {
    sendErro(res, 409, 'fluxo', 'A sessão, pasta ou permissão mudou; a espera foi invalidada.')
    return true
  }
  const resolver = execucao.aguardandoComando.get(id)
  if (!resolver || execucao.controller.signal.aborted) {
    sendErro(res, 409, 'approval_expired', 'O comando já não aguarda uma decisão.')
    return true
  }
  execucao.aguardandoComando.delete(id)
  execucao.estado = 'running'
  resolver(decisao === 'continuar')
  sendJson(res, 200, { ok: true })
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
  if (url.pathname === '/api/agir/instruction') return tratarInstrucaoHumana(req, res, deps)
  if (url.pathname === '/api/agir/mode') return tratarSelecionarModo(req, res, deps)
  if (url.pathname === '/api/agir/permission') return tratarSelecionarPermissao(req, res, deps)
  if (url.pathname === '/api/agir/command-wait') return tratarRespostaAguardarComando(req, res, deps)
  if (url.pathname === '/api/agir/aprovar') return tratarAprovar(req, res, deps)
  if (url.pathname === '/api/agir/cancel') return tratarCancelar(req, res, deps)
  if (url.pathname === '/api/agir/continuar') return tratarContinuar(req, res, deps)
  if (url.pathname === '/api/agir') return tratarAgir(req, res, deps)
  return false
}
