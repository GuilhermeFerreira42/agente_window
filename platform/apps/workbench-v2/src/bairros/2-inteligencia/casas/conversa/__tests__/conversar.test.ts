// Casa Conversa — execução da conversa (conquista 1 da FATIA 09).
// `fetch` mockado (mesma receita da sonda da 08): prova a CORRENTE e as
// categorias honestas de falha — sem internet de verdade, sem chave real.
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AlvoConversa, EventoChat, MensagemChat } from '../contract'
import { ErroChat, ehErroChat, executarConversa, extrairTexto } from '../server/conversar'

type Chamada = { url: string; init?: RequestInit }

function mockFetch(respostas: (chamada: Chamada) => Response | Error): Chamada[] {
  const chamadas: Chamada[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL, init?: RequestInit) => {
      const chamada = { url: String(url), init }
      chamadas.push(chamada)
      const resultado = respostas(chamada)
      // Cuidado: DOMException NÃO é `instanceof Error` em todo ambiente — o
      // critério é "tem cara de Response?" (nada volta como se fosse resposta).
      if (!('ok' in resultado)) throw resultado
      return resultado
    }),
  )
  return chamadas
}

function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })
}

const ALVO: AlvoConversa = { protocolo: 'openai-chat', baseUrl: 'https://api.exemplo.test/v1', modelo: 'modelo-x', apiKey: 'sk-secreta' }
const MENSAGENS: MensagemChat[] = [{ role: 'user', content: 'oi' }]

async function capturar(alvo: AlvoConversa, sinal?: AbortSignal): Promise<{ eventos: EventoChat[]; erro: unknown }> {
  const eventos: EventoChat[] = []
  try {
    await executarConversa(alvo, MENSAGENS, (evento) => eventos.push(evento), sinal)
    return { eventos, erro: null }
  } catch (erro) {
    return { eventos, erro }
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('conversar — resposta única com erros honestos', () => {
  it('sucesso: emite chunk com o texto; chave só no cabeçalho, nunca na URL', async () => {
    const chamadas = mockFetch(() => json({ choices: [{ message: { content: 'Olá mundo' } }] }))
    const { eventos, erro } = await capturar(ALVO)
    expect(erro).toBeNull()
    expect(eventos).toEqual([{ type: 'chunk', text: 'Olá mundo' }])
    expect((chamadas[0].init?.headers as Record<string, string>).Authorization).toBe('Bearer sk-secreta')
    expect(chamadas[0].url).not.toContain('sk-secreta')
  })

  it('401 vira categoria `chave` com mensagem honesta (corpo cru não repassa)', async () => {
    mockFetch(() => json({ error: { message: 'detalhe interno que não deve vazar' } }, 401))
    const { eventos, erro } = await capturar(ALVO)
    expect(eventos).toEqual([])
    expect(ehErroChat(erro)).toBe(true)
    const chat = erro as ErroChat
    expect(chat.code).toBe('chave')
    expect(chat.message).toContain('401')
    expect(chat.message).not.toContain('detalhe interno')
  })

  it('413 vira `limite` com orientação de começar conversa nova (G5)', async () => {
    mockFetch(() => json({}, 413))
    const { erro } = await capturar(ALVO)
    expect((erro as ErroChat).code).toBe('limite')
    expect((erro as ErroChat).message).toContain('conversa nova')
  })

  it('429 vira `http` honesto com o número do erro', async () => {
    mockFetch(() => json({}, 429))
    const { erro } = await capturar(ALVO)
    expect((erro as ErroChat).code).toBe('http')
    expect((erro as ErroChat).message).toContain('429')
  })

  it('serviço inalcançável vira `endereco`', async () => {
    mockFetch(() => new TypeError('fetch failed'))
    const { erro } = await capturar(ALVO)
    expect((erro as ErroChat).code).toBe('endereco')
    expect((erro as ErroChat).message.length).toBeGreaterThan(0)
  })

  it('timeout vira `tempo` citando os 60 segundos', async () => {
    mockFetch(() => new DOMException('demorou', 'TimeoutError'))
    const { erro } = await capturar(ALVO)
    expect((erro as ErroChat).code).toBe('tempo')
    expect((erro as ErroChat).message).toContain('60 segundos')
  })

  it('2xx sem texto vira `resposta` — nada de bolha vazia nem texto inventado', async () => {
    mockFetch(() => json({ choices: [{ message: { content: '   ' } }] }))
    const { eventos, erro } = await capturar(ALVO)
    expect(eventos).toEqual([])
    expect((erro as ErroChat).code).toBe('resposta')
  })

  it('Parar (sinal abortado) termina em silêncio: sem erro, sem eventos', async () => {
    const abort = new AbortController()
    mockFetch(() => Object.assign(new Error('abortado'), { name: 'AbortError' }))
    abort.abort()
    const { eventos, erro } = await capturar(ALVO, abort.signal)
    expect(erro).toBeNull()
    expect(eventos).toEqual([])
  })
})

describe('conversar — extração por protocolo (formato de cada um)', () => {
  it('anthropic junta os blocos de texto', () => {
    expect(extrairTexto('anthropic', { content: [{ type: 'text', text: 'Olá, ' }, { type: 'text', text: 'mundo' }] })).toBe('Olá, mundo')
  })

  it('gemini atravessa candidates → parts', () => {
    expect(extrairTexto('gemini', { candidates: [{ content: { parts: [{ text: 'Resposta ' }, { text: 'gemini' }] } }] })).toBe('Resposta gemini')
  })

  it('ollama lê message.content', () => {
    expect(extrairTexto('ollama', { message: { role: 'assistant', content: 'Resposta ollama' } })).toBe('Resposta ollama')
  })

  it('corpo irreconhecível não vira texto', () => {
    expect(extrairTexto('openai-chat', { sem: 'escolhas' })).toBe('')
    expect(() => extrairTexto('openai-chat', null)).toThrow()
  })
})

describe('conversar — streaming de verdade (conquista 2)', () => {
  const enc = (texto: string) => new TextEncoder().encode(texto)
  const quadroOpenAI = (conteudo: string) => `data: ${JSON.stringify({ choices: [{ delta: { content: conteudo } }] })}\n\n`

  /** Corpo em streaming controlado: um quadro por demanda de leitura. */
  function respostaStream(quadros: string[], opcoes?: { caisDepois?: boolean }): Response {
    let indice = 0
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (indice < quadros.length) {
          controller.enqueue(enc(quadros[indice]))
          indice += 1
          return
        }
        if (opcoes?.caisDepois) controller.error(new Error('conexão caiu no meio'))
        else controller.close()
      },
    })
    return new Response(stream, { status: 200 })
  }

  it('openai: os pedaços viram chunks na ordem, sem esperar o fim', async () => {
    mockFetch(() => respostaStream([quadroOpenAI('Olá '), quadroOpenAI('mundo')]))
    const { eventos, erro } = await capturar(ALVO)
    expect(erro).toBeNull()
    expect(eventos).toEqual([
      { type: 'chunk', text: 'Olá ' },
      { type: 'chunk', text: 'mundo' },
    ])
  })

  it('espaço vazio no primeiro pedaço espera conteúdo antes de emitir', async () => {
    mockFetch(() => respostaStream([quadroOpenAI(' '), quadroOpenAI('Chegou')]))
    const { eventos } = await capturar(ALVO)
    expect(eventos).toEqual([{ type: 'chunk', text: ' Chegou' }])
  })

  it('anthropic: lê content_block_delta e ignora eventos de ciclo de vida', async () => {
    const alvo: AlvoConversa = { protocolo: 'anthropic', baseUrl: 'https://api.anthropic.com/v1', modelo: 'claude-haiku-4-5', apiKey: 'k' }
    mockFetch(() =>
      respostaStream([
        `event: message_start\ndata: ${JSON.stringify({ type: 'message_start', message: { usage: {} } })}\n\n`,
        `event: content_block_delta\ndata: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: 'Oi ' } })}\n\n`,
        `event: content_block_delta\ndata: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: 'tudo bem?' } })}\n\n`,
        `event: message_stop\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`,
      ]),
    )
    const { eventos, erro } = await capturar(alvo)
    expect(erro).toBeNull()
    expect(eventos).toEqual([
      { type: 'chunk', text: 'Oi ' },
      { type: 'chunk', text: 'tudo bem?' },
    ])
  })

  it('ollama: NDJSON linha a linha até o done', async () => {
    const alvo: AlvoConversa = { protocolo: 'ollama', baseUrl: 'http://localhost:11434', modelo: 'nemotron', apiKey: null }
    mockFetch(() =>
      respostaStream([
        '{"message":{"content":"Resposta "},"done":false}\n',
        '{"message":{"content":"certa"},"done":false}\n',
        '{"done":true}\n',
      ]),
    )
    const { eventos, erro } = await capturar(alvo)
    expect(erro).toBeNull()
    expect(eventos).toEqual([
      { type: 'chunk', text: 'Resposta ' },
      { type: 'chunk', text: 'certa' },
    ])
  })

  it('quadro partido no meio de dois pedaços de rede se refaz', async () => {
    mockFetch(() => respostaStream(['data: {"choices":[{"del', 'ta":{"content":"colado"}}]}\n\n']))
    const { eventos, erro } = await capturar(ALVO)
    expect(erro).toBeNull()
    expect(eventos).toEqual([{ type: 'chunk', text: 'colado' }])
  })

  it('caindo no MEIO da resposta: erro honesto `resposta`, sem inventar o resto', async () => {
    mockFetch(() => respostaStream([quadroOpenAI('Metade')], { caisDepois: true }))
    const { eventos, erro } = await capturar(ALVO)
    expect(eventos).toEqual([{ type: 'chunk', text: 'Metade' }])
    expect((erro as ErroChat).code).toBe('resposta')
    expect((erro as ErroChat).message).toContain('interrompida')
  })

  it('[DONE] do openai é ignorado — não vira erro nem texto', async () => {
    mockFetch(() => respostaStream([quadroOpenAI('Fim'), 'data: [DONE]\n\n']))
    const { eventos, erro } = await capturar(ALVO)
    expect(erro).toBeNull()
    expect(eventos).toEqual([{ type: 'chunk', text: 'Fim' }])
  })
})
