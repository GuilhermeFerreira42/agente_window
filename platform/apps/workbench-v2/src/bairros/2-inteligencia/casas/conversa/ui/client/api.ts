// ============================================================================
// Casa Conversa — cliente de conversa no BROWSER (FATIA 09).
// DONO da URL `/api/chat`: o App fala com a rota só por aqui (fronteira
// FT-05 — o síndico nunca hardcoda rota nem monta fio SSE à mão).
// A chave nunca aparece: o navegador conversa COM O SERVIDOR DO APP, e só ele
// fala com o provedor.
// ============================================================================
import type { CategoriaErro, EventoChat, MensagemChat, SelecaoModelo } from '../../contract'
import { criarFramerSSE } from '../../server/streaming'

export interface OuvintesConversa {
  /** Um pedaço do texto chegou — a bolha cresce na hora. */
  onChunk: (texto: string) => void
  /** Fim confirmado pelo servidor (com o modelo que realmente respondeu). */
  onDone: (modelo?: string) => void
  /** Erro honesto (sem_provedor, chave, endereco, tempo, limite, http, resposta). */
  onError: (code: CategoriaErro, message: string) => void
}

export interface ControleConversa {
  /** "Parar": derruba o pedido — o servidor aborta o provedor no ato. */
  abortar: () => void
}

export function enviarConversa(messages: MensagemChat[], ouvintes: OuvintesConversa, modelSelection: SelecaoModelo = { tipo: 'auto' }): ControleConversa {
  const controlador = new AbortController()
  void (async () => {
    let encerrou = false
    try {
      const resposta = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, modelSelection }),
        signal: controlador.signal,
      })

      if (!resposta.ok || !resposta.body) {
        // Pré-condição (4xx JSON {code,message}) — mesma forma do fio de erro.
        let code: CategoriaErro = 'resposta'
        let message = 'O servidor do app não respondeu direito. Recarregue a página e tente de novo.'
        try {
          const corpo = (await resposta.json()) as { code?: CategoriaErro; message?: string }
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
          let evento: EventoChat
          try {
            evento = JSON.parse(payload) as EventoChat
          } catch {
            continue // ruído de compat nunca vira texto nem erro
          }
          if (evento.type === 'chunk') ouvintes.onChunk(evento.text)
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
