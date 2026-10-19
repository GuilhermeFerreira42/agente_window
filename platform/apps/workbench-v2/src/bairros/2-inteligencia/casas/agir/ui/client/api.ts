// ============================================================================
// Casa Agir — cliente do loop no BROWSER (FATIA 10, conquista 3).
// DONO das URLs `/api/agir` e `/api/agir/aprovar` (fronteira FT-05 — o App
// nunca hardcoda rota nem monta fio SSE à mão). O "Parar" derruba o pedido;
// o servidor aborta o provedor e interrompe o loop em silêncio.
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

export interface OuvintesAgir {
  /** Pedaço do texto da IA — a bolha cresce na hora. */
  onChunk: (texto: string) => void
  /** A IA pediu uma ferramenta (vira cartão na tela). */
  onTool: (pedido: PedidoFerramenta) => void
  /** Uma ferramenta terminou (ok ou não) — o cartão mostra o resumo. */
  onToolResult: (id: string, ferramenta: FerramentaId, ok: boolean, resumo: string) => void
  /** O servidor pediu o sim/não do dono — o cartão ganha os 3 botões. */
  onApproval: (pedido: PedidoFerramenta) => void
  /** Fim confirmado (com o modelo que realmente respondeu). */
  onDone: (modelo?: string) => void
  /** Erro honesto (sem_provedor, chave, endereco, tempo, voltas, resposta…). */
  onError: (code: CategoriaErroAgir, message: string) => void
}

export interface EntradaAgir {
  /** Histórico visível da conversa + a mensagem nova. */
  mensagens: MensagemSimples[]
  /** A sessão dona desta conversa (identifica os cartões no servidor). */
  fluxo: string
  /** A pasta de trabalho da sessão — o servidor valida antes de usar. */
  workspace?: string
  /** Ferramentas já liberadas "para a sessão" pelo dono (Q2a). */
  permissoes?: string[]
}

export interface ControleAgir {
  /** "Parar": derruba o pedido — o servidor interrompe o loop no ato. */
  abortar: () => void
}

export function enviarAgir(entrada: EntradaAgir, ouvintes: OuvintesAgir): ControleAgir {
  const controlador = new AbortController()
  void (async () => {
    let encerrou = false
    try {
      const resposta = await fetch('/api/agir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: entrada.mensagens,
          fluxo: entrada.fluxo,
          ...(entrada.workspace ? { workspace: entrada.workspace } : {}),
          ...(entrada.permissoes && entrada.permissoes.length > 0 ? { permissoes: entrada.permissoes } : {}),
        }),
        signal: controlador.signal,
      })

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
        encerrou = true
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
          else if (evento.type === 'approval') ouvintes.onApproval(evento.pedido)
          else if (evento.type === 'error') {
            encerrou = true
            ouvintes.onError(evento.code, evento.message)
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
  })()
  return { abortar: () => controlador.abort() }
}

/** O dono respondeu o cartão. `false` = a execução já não esperava mais. */
export async function responderAprovacao(
  fluxo: string,
  id: string,
  decisao: DecisaoAprovacao,
  ferramenta?: FerramentaId,
): Promise<boolean> {
  try {
    const resposta = await fetch('/api/agir/aprovar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fluxo, id, decisao, ...(ferramenta ? { ferramenta } : {}) }),
    })
    return resposta.ok
  } catch {
    return false
  }
}
