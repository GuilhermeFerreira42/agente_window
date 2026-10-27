// Casa Agir — cliente do loop no BROWSER. O servidor é autoridade para runId,
// geração, approvals e cancelamento; fechar o fetch sozinho não declara Parar.
import type {
  CategoriaErroAgir,
  DecisaoAprovacao,
  EventoAgir,
  FerramentaId,
  MensagemSimples,
  PedidoFerramenta,
  ModoAgir,
} from '../../contract'
import { criarFramerSSE } from '../../server/vizinho'

export interface DetalheErroAgir {
  retomavel?: boolean
  iteracoes?: number
  teto?: number
}

export interface OuvintesAgir {
  onChunk: (texto: string) => void
  onTool: (pedido: PedidoFerramenta) => void
  onToolResult: (id: string, ferramenta: FerramentaId, ok: boolean, resumo: string) => void
  onApproval: (pedido: PedidoFerramenta, previa?: string) => void
  onTeto: (iteracoes: number, teto: number) => void
  onIteracao?: (iteracao: number, teto: number, modelo?: string) => void
  onDone: (modelo?: string) => void
  onError: (code: CategoriaErroAgir, message: string, detalhe?: DetalheErroAgir) => void
}

export async function selecionarModoAgir(sessionId: string, chatId: string, mode: ModoAgir, signal?: AbortSignal): Promise<void> {
  const resposta = await fetch('/api/agir/mode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, chatId, mode }),
    signal,
  })
  if (resposta.ok) return
  let mensagem = 'Não foi possível registrar o modo no servidor; a execução não foi iniciada.'
  try { const corpo = await resposta.json() as { message?: string }; if (corpo.message) mensagem = corpo.message } catch { /* fallback local acima */ }
  throw new Error(mensagem)
}

export interface EntradaAgir {
  mensagens: MensagemSimples[]
  modelSelection?: { tipo: 'auto' } | { tipo: 'explicita'; providerId: string; modelId: string }
  fluxo: string
  sessionId: string
  chatId: string
  mode: ModoAgir
}

export interface IdentidadeExecucaoAgir {
  runId: string
  generation: number
}
export type EstadoCancelamentoAgir = 'cancelled' | 'already_terminal' | 'pending'

export interface ControleAgir {
  identidade: () => IdentidadeExecucaoAgir | null
  abortar: () => Promise<EstadoCancelamentoAgir>
}

async function bombearFio(
  resposta: Response,
  ouvintes: OuvintesAgir,
  paradaSolicitada: () => boolean,
): Promise<void> {
  let encerrou = false
  try {
    if (!resposta.ok || !resposta.body) {
      let code: CategoriaErroAgir = 'resposta'
      let message = 'O servidor do app não respondeu direito. Recarregue a página e tente de novo.'
      try {
        const corpo = (await resposta.json()) as { code?: CategoriaErroAgir; message?: string }
        if (corpo && typeof corpo.code === 'string') code = corpo.code
        if (corpo && typeof corpo.message === 'string') message = corpo.message
      } catch { /* mantém a mensagem genérica e honesta acima */ }
      if (!paradaSolicitada()) ouvintes.onError(code, message)
      return
    }

    const framer = criarFramerSSE()
    const leitor = resposta.body.getReader()
    const decodificador = new TextDecoder()
    const consumir = (payloads: string[]): boolean => {
      for (const payload of payloads) {
        let evento: EventoAgir
        try { evento = JSON.parse(payload) as EventoAgir } catch { continue }
        if (paradaSolicitada() && evento.type !== 'tool_result') return false
        if (evento.type === 'chunk') ouvintes.onChunk(evento.text)
        else if (evento.type === 'tool') ouvintes.onTool(evento.pedido)
        else if (evento.type === 'tool_result') ouvintes.onToolResult(evento.id, evento.ferramenta, evento.ok, evento.resumo)
        else if (evento.type === 'approval') ouvintes.onApproval(evento.pedido, evento.previa)
        else if (evento.type === 'teto') {
          encerrou = true
          ouvintes.onTeto(evento.iteracoes, evento.teto)
          return false
        } else if (evento.type === 'iteracao') ouvintes.onIteracao?.(evento.iteracao, evento.teto, evento.model)
        else if (evento.type === 'error') {
          encerrou = true
          const detalhe: DetalheErroAgir = {}
          if (evento.retomavel !== undefined) detalhe.retomavel = evento.retomavel
          if (evento.iteracoes !== undefined) detalhe.iteracoes = evento.iteracoes
          if (evento.teto !== undefined) detalhe.teto = evento.teto
          ouvintes.onError(evento.code, evento.message, detalhe)
          return false
        } else if (evento.type === 'done') {
          encerrou = true
          ouvintes.onDone(evento.model)
          return false
        }
      }
      return true
    }

    for (;;) {
      const { value, done } = await leitor.read()
      if (done) break
      if (!consumir(framer.entrar(decodificador.decode(value, { stream: true })))) return
    }
    if (!encerrou) consumir(framer.fechar())
    if (!encerrou && !paradaSolicitada()) {
      ouvintes.onError('resposta', 'A conexão terminou antes de o servidor confirmar o fim. Envie a mensagem de novo.')
    }
  } catch (erro) {
    if ((erro as { name?: string })?.name === 'AbortError' || paradaSolicitada()) return
    if (!encerrou) ouvintes.onError('endereco', 'Não deu para falar com o servidor do app. Verifique e tente de novo.')
  }
}

interface EscopoRun { fluxo: string; sessionId: string; chatId: string }

function abrirFio(url: string, corpo: unknown, escopo: EscopoRun, ouvintes: OuvintesAgir): ControleAgir {
  let identidade: IdentidadeExecucaoAgir | null = null
  let paradaFoiSolicitada = false
  let resolverIdentidade: (valor: IdentidadeExecucaoAgir | null) => void = () => undefined
  const identidadePronta = new Promise<IdentidadeExecucaoAgir | null>((resolve) => { resolverIdentidade = resolve })
  let resolveuIdentidade = false
  const publicarIdentidade = (valor: IdentidadeExecucaoAgir | null): void => {
    if (resolveuIdentidade) return
    resolveuIdentidade = true
    identidade = valor
    resolverIdentidade(valor)
  }
  const fetchController = new AbortController()
  let cancelamentoEmAndamento: Promise<EstadoCancelamentoAgir> | null = null

  const cancelarNoServidor = async (): Promise<EstadoCancelamentoAgir> => {
    paradaFoiSolicitada = true
    if (cancelamentoEmAndamento) return cancelamentoEmAndamento
    cancelamentoEmAndamento = (async () => {
      let timer: ReturnType<typeof setTimeout> | undefined
      const esperado = await Promise.race([
        identidadePronta,
        new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), 5000) }),
      ])
      if (timer !== undefined) clearTimeout(timer)
      if (!esperado) return 'pending'
      const controlador = new AbortController()
      const timeout = setTimeout(() => controlador.abort(), 5000)
      try {
        const resposta = await fetch('/api/agir/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...escopo, ...esperado }),
          signal: controlador.signal,
        })
        if (!resposta.ok) return 'pending'
        const corpoResposta = await resposta.json() as { status?: unknown }
        if (corpoResposta.status === 'cancelled') return 'cancelled'
        if (corpoResposta.status === 'already_terminal') return 'already_terminal'
        return 'pending'
      } catch {
        return 'pending'
      } finally {
        clearTimeout(timeout)
      }
    })()
    try {
      return await cancelamentoEmAndamento
    } finally {
      cancelamentoEmAndamento = null
    }
  }

  void (async () => {
    let resposta: Response
    try {
      resposta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
        signal: fetchController.signal,
      })
    } catch (erro) {
      publicarIdentidade(null)
      if ((erro as { name?: string })?.name === 'AbortError' || paradaFoiSolicitada) return
      ouvintes.onError('endereco', 'Não deu para falar com o servidor do app. Verifique e tente de novo.')
      return
    }
    const runId = resposta.headers.get('x-agir-run-id')
    const generation = Number(resposta.headers.get('x-agir-generation'))
    publicarIdentidade(runId && Number.isSafeInteger(generation) && generation > 0 ? { runId, generation } : null)
    await bombearFio(resposta, ouvintes, () => paradaFoiSolicitada)
  })()

  return { identidade: () => identidade, abortar: cancelarNoServidor }
}

export function enviarAgir(entrada: EntradaAgir, ouvintes: OuvintesAgir): ControleAgir {
  return abrirFio('/api/agir', {
    messages: entrada.mensagens,
    modelSelection: entrada.modelSelection ?? { tipo: 'auto' },
    fluxo: entrada.fluxo,
    sessionId: entrada.sessionId,
    chatId: entrada.chatId,
    mode: entrada.mode,
  }, { fluxo: entrada.fluxo, sessionId: entrada.sessionId, chatId: entrada.chatId }, ouvintes)
}

export function continuarAgir(sessionId: string, chatId: string, fluxo: string, ouvintes: OuvintesAgir): ControleAgir {
  return abrirFio('/api/agir/continuar', { sessionId, chatId, fluxo }, { fluxo, sessionId, chatId }, ouvintes)
}

export async function responderAprovacao(
  sessionId: string,
  fluxo: string,
  id: string,
  decisao: DecisaoAprovacao,
  identidade: IdentidadeExecucaoAgir | null,
): Promise<boolean> {
  if (!identidade) return false
  try {
    const resposta = await fetch('/api/agir/aprovar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, fluxo, id, decisao, ...identidade }),
    })
    return resposta.ok
  } catch {
    return false
  }
}
