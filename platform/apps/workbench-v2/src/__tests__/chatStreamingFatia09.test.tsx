// ============================================================================
// FATIA 09 — ligação da conversa NO APP (SPEC §3, conquista 3: C3).
// Prova o que a tela faz quando a conversa é REAL:
//   §3.2  a resposta cresce em pedaços (bolha acompanha o fio);
//   §3.4  Parar derruba o fio e PRESERVA o texto parcial;
//   §3.7  fio que termina sem "done" vira erro honesto (sem bolha vazia);
//   §3.9  o rodapé da bolha rotula o modelo EFETIVO (chegou no "done").
// ============================================================================
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { testSessions } from './fixtures/sessions'

beforeEach(() => {
  window.localStorage.clear()
  // /api/agir pendente até o teste instalar um fio (ou até o Parar abortar).
  const fetchOriginal = globalThis.fetch.bind(globalThis)
  vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).includes('/api/agir')) {
      return new Promise<Response>((_resolve, reject) => {
        const sinal = init?.signal
        const abortar = () => reject(new DOMException('Aborted', 'AbortError'))
        if (sinal?.aborted) abortar()
        else sinal?.addEventListener('abort', abortar)
      })
    }
    return fetchOriginal(input, init)
  })
})

/** Fio SSE de teste no MESMO formato do servidor (frames `data:` + JSON). */
function responderChatComSSE(textos: string[], fecharCom: 'done' | 'sem-done' | 'aberto' = 'done', atrasoMs = 40): void {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
    if (!String(input).includes('/api/agir')) throw new Error('fetch inesperado no teste')
    const codificar = new TextEncoder()
    const pedacos = textos.map((texto) => codificar.encode(`data: ${JSON.stringify({ type: 'chunk', text: texto })}\n\n`))
    if (fecharCom === 'done') pedacos.push(codificar.encode(`data: ${JSON.stringify({ type: 'done', model: 'stub-model' })}\n\n`))
    const fio = new ReadableStream<Uint8Array>({
      start(controller) {
        let indice = 0
        const passo = () => {
          if (indice >= pedacos.length) {
            if (fecharCom !== 'aberto') controller.close()
            return // 'aberto': o fio continua vivo até o Parar abortar (como no provedor lento)
          }
          controller.enqueue(pedacos[indice])
          indice += 1
          setTimeout(passo, atrasoMs)
        }
        setTimeout(passo, atrasoMs)
      },
    })
    return new Response(fio, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
  })
}

async function enviarMensagem(texto: string): Promise<void> {
  const user = userEvent.setup()
  render(<App initialSessionSnapshot={testSessions} />)
  // A fixture s1 nasce 'working' (estado antigo preservado); o fluxo de envio
  // roda na s3 'Ajustar layout single-pane' — mesma escolha do App.test.
  const linha = Array.from(document.querySelectorAll<HTMLElement>('.session-row .session-title-text'))
    .find((element) => element.textContent === 'Ajustar layout single-pane')
    ?.closest<HTMLElement>('.session-row')
  if (!linha) throw new Error('Linha da sessão de teste não encontrada')
  await user.click(linha)
  await user.type(screen.getByRole('textbox', { name: 'Mensagem para o agente' }), texto)
  await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
}

describe('FATIA 09 — conversa REAL no App (SPEC §3)', () => {
  it('§3.2/§3.9: a bolha cresce em pedaços e o rodapé rotula o modelo efetivo', async () => {
    responderChatComSSE(['Parcial um. ', 'Parcial dois.'], 'done', 80)
    await enviarMensagem('pergunta em pedaços')

    // Primeiro pedaço chega ANTES do fim: dá para ler enquanto roda (§3.2).
    await waitFor(() => {
      expect(screen.getByText(/Parcial um/)).toBeInTheDocument()
      expect(screen.getByText('Trabalhando')).toBeInTheDocument()
    }, { timeout: 2000 })

    await waitFor(() => {
      expect(screen.getByText(/Parcial um\. Parcial dois\./)).toBeInTheDocument()
      expect(screen.queryByText('Trabalhando')).not.toBeInTheDocument()
    }, { timeout: 3000 })
    // O "done" carrega o modelo que RESpondeu de verdade (§3.9).
    expect(screen.getByText(/· stub-model/)).toBeInTheDocument()
    // Nunca sobra texto fixo do mock antigo.
    expect(screen.queryByText(/Estou trabalhando em/)).not.toBeInTheDocument()
  })

  it('§3.7: fio que termina sem "done" vira erro honesto — sem bolha vazia nem texto falso', async () => {
    responderChatComSSE(['Meio caminho'], 'sem-done', 30)
    await enviarMensagem('resposta incompleta')

    await waitFor(() => {
      expect(screen.getByText(/terminou antes de o servidor confirmar/)).toBeInTheDocument()
    }, { timeout: 3000 })
    expect(screen.queryByText(/Estou trabalhando em/)).not.toBeInTheDocument()
    expect(screen.queryByText('Trabalhando')).not.toBeInTheDocument()
  })

  it('§3.4: Parar no meio do fio preserva o texto parcial (só bolha vazia ganha o placeholder)', async () => {
    // 1 pedaço em ~150 ms e o fio FICA ABERTO — é o provedor lento; o Parar
    // derruba a conexão (sem corrida com um "done" futuro).
    responderChatComSSE(['Primeiro pedaço da resposta.'], 'aberto', 150)
    await enviarMensagem('interrompa no meio')

    await waitFor(() => expect(screen.getByText(/Primeiro pedaço da resposta/)).toBeInTheDocument(), { timeout: 2000 })
    await userEvent.setup().click(screen.getByRole('button', { name: 'Parar execução' }))

    await waitFor(() => {
      expect(screen.queryByText('Trabalhando')).not.toBeInTheDocument()
      expect(screen.getByText(/Cancelada/)).toBeInTheDocument()
    }, { timeout: 2000 })
    // O parcial FICOU (não virou placeholder nem erro).
    expect(screen.getByText(/Primeiro pedaço da resposta/)).toBeInTheDocument()
    expect(screen.queryByText(/Execução interrompida antes da resposta/)).not.toBeInTheDocument()

    // O "done" tardio não deve mais mexer na bolha (a corrida foi abortada).
    await new Promise((resolve) => setTimeout(resolve, 1200))
    expect(screen.getByText(/Primeiro pedaço da resposta/)).toBeInTheDocument()
    expect(screen.queryByText(/· stub-model/)).not.toBeInTheDocument()
  })
})
