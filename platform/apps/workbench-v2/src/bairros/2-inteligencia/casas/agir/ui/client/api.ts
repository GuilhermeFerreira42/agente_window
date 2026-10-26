// ============================================================================
// Casa Agir — cliente do loop no BROWSER (FATIA 10, conquista 3; teto na 11).
// DONO das URLs `/api/agir`, `/api/agir/aprovar` e `/api/agir/continuar`
// (fronteira FT-05 — o App nunca hardcoda rota nem monta fio SSE à mão).
// O "Parar" derruba o pedido; o servidor aborta o provedor e interrompe o
// loop em silêncio. O "Continuar" (FATIA 11) reabre o fio no MESMO fluxo.
// ============================================================================
import type {
  CategoriaErroAgir,
  DecisaoAprovacao,
  EventoAgir,
  FerramentaId,
  MensagemSimples,
  PedidoFerramenta,
} from '../../contract'
import { criarFramerSSE } from '../../server/vizinho'

/** Detalhe do erro: quando é transitório, a tela pode oferecer retomar. */
export interface DetalheErroAgir {
  retomavel?: boolean
  iteracoes?: number
  teto?: number
}

export interface OuvintesAgir {
  /** Pedaço do texto da IA — a bolha cresce na hora. */
  onChunk: (texto: string) => void
  /** A IA pediu uma ferramenta (vira cartão na tela). */
  onTool: (pedido: PedidoFerramenta) => void
  /** Uma ferramenta terminou (ok ou não) — o cartão mostra o resumo. */
  onToolResult: (id: string, ferramenta: FerramentaId, ok: boolean, resumo: string) => void
  /** O servidor pediu o sim/não do dono — o cartão ganha os botões. `previa` (FATIA 12) é o que o servidor viu no disco (só o `excluir` manda). */
  onApproval: (pedido: PedidoFerramenta, previa?: string) => void
  /** O teto pausou o loop (FATIA 11) — a tela mostra o cartão "continuar?". */
  onTeto: (iteracoes: number, teto: number) => void
  /** Cada ida ao modelo anunciada (pós-11) — a tela mostra "iteração 2 de 25". */
  onIteracao?: (iteracao: number, teto: number) => void
  /** Fim confirmado (com o modelo que realmente respondeu). */
  onDone: (modelo?: string) => void
  /** Erro honesto (sem_provedor, chave, endereco, tempo, fluxo, resposta…). */
  onError: (code: CategoriaErroAgir, message: string, detalhe?: DetalheErroAgir) => void
}

export interface EntradaAgir {
  /** Histórico visível da conversa + a mensagem nova. */
  mensagens: MensagemSimples[]
  /** Contexto solicitado; servidor resolve sessão, raiz e grants persistidos. */
  fluxo: string
  sessionId: string
  chatId: string
}

export interface ControleAgir {
  /** "Parar": derruba o pedido — o servidor interrompe o loop no ato. */
  abortar: () => void
}

/** Bombeia UM fio SSE até o fim (pedido novo e "continuar" usam o mesmo). */
async function bombearFio(resposta: Response, controlador: AbortController, ouvintes: OuvintesAgir): Promise<void> {
  let encerrou = false
  try {
    if (!resposta.ok || !resposta.body) {
      let code: CategoriaErroAgir = 'resposta'
      let message = 'O servidor do app não respondeu direito. Recarregue a página e tente de novo.'
      try {
        const corpo = (await resposta.json()) as { code?: CategoriaErroAgir; message?: string }
        if (corpo && typeof corpo.code === 'string') code = corpo.code
        if (corpo && typeof corpo.message === 'string') message = corpo.message
      } catch {
        // mantém a mensagem honesta padrão
      }
      ouvintes.onError(code, message)
      return
    }

    const framer = criarFramerSSE()
    const leitor = resposta.body.getReader()
    const decodificador = new TextDecoder()

    const consumir = (payloads: string[]): boolean => {
      for (const payload of payloads) {
        let evento: EventoAgir
        try {
          evento = JSON.parse(payload) as EventoAgir
        } catch {
          continue // ruído de compat nunca vira texto nem erro
        }
        if (evento.type === 'chunk') ouvintes.onChunk(evento.text)
        else if (evento.type === 'tool') ouvintes.onTool(evento.pedido)
        else if (evento.type === 'tool_result') ouvintes.onToolResult(evento.id, evento.ferramenta, evento.ok, evento.resumo)
        else if (evento.type === 'approval') ouvintes.onApproval(evento.pedido, evento.previa)
        else if (evento.type === 'teto') {
          encerrou = true
          ouvintes.onTeto(evento.iteracoes, evento.teto)
          return false
        } else if (evento.type === 'iteracao') {
          ouvintes.onIteracao?.(evento.iteracao, evento.teto)
        } else if (evento.type === 'error') {
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
    if (!encerrou) {
      ouvintes.onError('resposta', 'A conexão terminou antes de o servidor confirmar o fim. Envie a mensagem de novo.')
    }
  } catch (erro) {
    if ((erro as { name?: string })?.name === 'AbortError') return // Parar do usuário: silêncio
    if (!encerrou) {
      ouvintes.onError('endereco', 'Não deu para falar com o servidor do app. Verifique e tente de novo.')
    }
  }
}

function abrirFio(url: string, corpo: unknown, ouvintes: OuvintesAgir): ControleAgir {
  const controlador = new AbortController()
  void (async () => {
    let resposta: Response
    try {
      resposta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
        signal: controlador.signal,
      })
    } catch (erro) {
      if ((erro as { name?: string })?.name === 'AbortError') return // Parar do usuário: silêncio
      ouvintes.onError('endereco', 'Não deu para falar com o servidor do app. Verifique e tente de novo.')
      return
    }
    await bombearFio(resposta, controlador, ouvintes)
  })()
  return { abortar: () => controlador.abort() }
}

export function enviarAgir(entrada: EntradaAgir, ouvintes: OuvintesAgir): ControleAgir {
  return abrirFio(
    '/api/agir',
    {
      messages: entrada.mensagens,
      fluxo: entrada.fluxo,
      sessionId: entrada.sessionId,
      chatId: entrada.chatId,
    },
    ouvintes,
  )
}

/** FATIA 11 — retoma o MESMO fluxo pausado no teto (orçamento cheio). */
export function continuarAgir(sessionId: string, chatId: string, fluxo: string, ouvintes: OuvintesAgir): ControleAgir {
  return abrirFio('/api/agir/continuar', { sessionId, chatId, fluxo }, ouvintes)
}

/** O dono respondeu o cartão. `false` = a execução já não esperava mais. */
export async function responderAprovacao(
  sessionId: string,
  fluxo: string,
  id: string,
  decisao: DecisaoAprovacao,
): Promise<boolean> {
  try {
    const resposta = await fetch('/api/agir/aprovar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, fluxo, id, decisao }),
    })
    return resposta.ok
  } catch {
    return false
  }
}
