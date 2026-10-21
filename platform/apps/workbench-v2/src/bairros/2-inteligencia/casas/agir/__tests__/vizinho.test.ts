// ============================================================================
// Provas do VIZINHO REAL (conquista 2): um provedor HTTP falso (node:http)
// fala os 4 idiomas — e o vizinho tem que anunciar as ferramentas no corpo,
// traduzir o diálogo, empedaçar a resposta e MONTAR os pedidos partidos.
// ============================================================================
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http'
import { describe, expect, it } from 'vitest'
import type { AlvoConversa } from '../../conversa'
import type { MensagemAgir } from '../contract'
import { criarVizinhoReal, ErroVizinho } from '../server/vizinho'

interface Captura {
  corpo?: Record<string, unknown>
}

/** Servidor falso: captura o corpo do pedido e responde o texto dado. */
async function servidorFalso(
  responder: (req: IncomingMessage, res: ServerResponse, corpo: Record<string, unknown>) => void,
): Promise<{ baseUrl: string; captura: Captura; fechar: () => Promise<void> }> {
  const captura: Captura = {}
  const servidor: Server = createServer((req, res) => {
    let bruto = ''
    req.on('data', (pedaco: Buffer) => {
      bruto += pedaco.toString('utf8')
    })
    req.on('end', () => {
      try {
        captura.corpo = JSON.parse(bruto) as Record<string, unknown>
      } catch {
        captura.corpo = {}
      }
      responder(req, res, captura.corpo as Record<string, unknown>)
    })
  })
  await new Promise<void>((resolve) => servidor.listen(0, '127.0.0.1', resolve))
  const endereco = servidor.address()
  const porta = typeof endereco === 'object' && endereco !== null ? endereco.port : 0
  return {
    baseUrl: `http://127.0.0.1:${porta}`,
    captura,
    fechar: () => new Promise((resolve) => servidor.close(() => resolve())),
  }
}

function alvoDe(protocolo: AlvoConversa['protocolo'], baseUrl: string): AlvoConversa {
  return { protocolo, baseUrl, modelo: 'modelo-de-prova', apiKey: 'chave-de-prova' }
}

const HISTORICO: MensagemAgir[] = [
  { papel: 'usuario', conteudo: 'crie o ola.txt' },
  { papel: 'assistente', conteudo: '', pedidos: [{ id: 'p1', ferramenta: 'criar', argumentos: { caminho: 'ola.txt', conteudo: 'oi' } }] },
  { papel: 'ferramenta', conteudo: 'Arquivo "ola.txt" criado (escrita atômica).', pedidoId: 'p1', ferramenta: 'criar' },
]

describe('Vizinho real — openai-chat (SSE com pedidos PARTIDOS)', () => {
  it('monta o tool_call que chega aos pedaços + texto ao vivo + corpo com anúncio', async () => {
    const s = await servidorFalso((req, res, corpo) => {
      expect(corpo.tools).toHaveLength(6)
      expect((corpo.tools as Array<{ function: { name: string } }>).map((t) => t.function.name)).toContain('excluir')
      expect((corpo.tool_choice as string)).toBe('auto')
      const mensagens = corpo.messages as Array<Record<string, unknown>>
      expect(mensagens[2]).toMatchObject({ role: 'tool', tool_call_id: 'p1' })
      res.writeHead(200, { 'Content-Type': 'text/event-stream' })
      res.end(
        [
          'data: {"model":"gpt-prova","choices":[{"delta":{"content":"Vou criar."}}]}',
          '',
          'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"criar","arguments":"{\\"caminho\\":"}}]}}]}',
          '',
          'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\\"ola.txt\\",\\"conteudo\\":\\"oi\\"}"}}]}}]}',
          '',
          'data: [DONE]',
          '',
        ].join('\n'),
      )
    })
    try {
      const pedacos: string[] = []
      const resposta = await criarVizinhoReal(alvoDe('openai-chat', s.baseUrl))(HISTORICO, { aoTexto: (t) => pedacos.push(t) })
      expect(resposta.texto).toBe('Vou criar.')
      expect(pedacos).toEqual(['Vou criar.'])
      expect(resposta.modelo).toBe('gpt-prova')
      expect(resposta.pedidos).toEqual([
        { id: 'call_1', ferramenta: 'criar', argumentos: { caminho: 'ola.txt', conteudo: 'oi' } },
      ])
    } finally {
      await s.fechar()
    }
  })

  it('provedor que IGNOROU o stream e respondeu corpo inteiro: extrator resolve', async () => {
    const s = await servidorFalso((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          choices: [{ message: { content: 'Feito.', tool_calls: [{ id: 'c9', function: { name: 'ler', arguments: '{"caminho":"a.md"}' } }] } }],
        }),
      )
    })
    try {
      const resposta = await criarVizinhoReal(alvoDe('openai-chat', s.baseUrl))([{ papel: 'usuario', conteudo: 'leia a.md' }])
      expect(resposta.texto).toBe('Feito.')
      expect(resposta.pedidos).toEqual([{ id: 'c9', ferramenta: 'ler', argumentos: { caminho: 'a.md' } }])
    } finally {
      await s.fechar()
    }
  })
})

describe('Vizinho real — anthropic (SSE tool_use)', () => {
  it('blocos tool_use + input_json_delta viram pedidos; diálogo traduzido', async () => {
    const s = await servidorFalso((req, res, corpo) => {
      expect((corpo.tools as Array<Record<string, unknown>>)[0]).toMatchObject({ name: 'ler' })
      expect(Array.isArray(corpo.messages)).toBe(true)
      const ultima = (corpo.messages as Array<Record<string, unknown>>)[2]
      expect(ultima).toMatchObject({ role: 'user' }) // tool_result viaja como user
      res.writeHead(200, { 'Content-Type': 'text/event-stream' })
      res.end(
        [
          'data: {"type":"message_start","message":{"model":"claude-prova"}}',
          '',
          'data: {"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"tu_1","name":"criar"}}',
          '',
          'data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\\"caminho\\":\\"b.txt\\",\\"conteudo\\":\\"oi\\"}"}}',
          '',
          'data: {"type":"content_block_stop","index":0}',
          '',
          'data: {"type":"message_stop"}',
          '',
        ].join('\n'),
      )
    })
    try {
      const resposta = await criarVizinhoReal(alvoDe('anthropic', s.baseUrl))(HISTORICO)
      expect(resposta.modelo).toBe('claude-prova')
      expect(resposta.pedidos).toEqual([{ id: 'tu_1', ferramenta: 'criar', argumentos: { caminho: 'b.txt', conteudo: 'oi' } }])
    } finally {
      await s.fechar()
    }
  })
})

describe('Vizinho real — gemini (SSE functionCall) e ollama (NDJSON)', () => {
  it('gemini: functionCall completo no quadro + functionDeclarations no anúncio', async () => {
    const s = await servidorFalso((req, res, corpo) => {
      const declaracoes = (corpo.tools as Array<{ functionDeclarations: unknown[] }>)[0].functionDeclarations
      expect(declaracoes).toHaveLength(6)
      expect((declaracoes as Array<{ name: string }>).map((d) => d.name)).toContain('excluir')
      res.writeHead(200, { 'Content-Type': 'text/event-stream' })
      res.end(
        [
          'data: {"candidates":[{"content":{"parts":[{"text":"Olá"}]}}]}',
          '',
          'data: {"candidates":[{"content":{"parts":[{"functionCall":{"name":"buscar","args":{"padrao":"*.md"}}}]}}],"modelVersion":"gem-prova"}',
          '',
        ].join('\n'),
      )
    })
    try {
      const resposta = await criarVizinhoReal(alvoDe('gemini', s.baseUrl))([{ papel: 'usuario', conteudo: 'busca md' }])
      expect(resposta.texto).toBe('Olá')
      expect(resposta.pedidos).toEqual([{ id: 'chamada_1', ferramenta: 'buscar', argumentos: { padrao: '*.md' } }])
    } finally {
      await s.fechar()
    }
  })

  it('ollama: NDJSON com tool_calls em objeto; role tool traduzido', async () => {
    const s = await servidorFalso((req, res, corpo) => {
      expect(corpo.tools).toHaveLength(6)
      expect((corpo.tools as Array<{ function: { name: string } }>).map((t) => t.function.name)).toContain('excluir')
      const mensagens = corpo.messages as Array<Record<string, unknown>>
      expect(mensagens[1]).toMatchObject({ role: 'assistant', tool_calls: [{ function: { name: 'criar' } }] })
      expect(mensagens[2]).toMatchObject({ role: 'tool' })
      res.writeHead(200, { 'Content-Type': 'application/x-ndjson' })
      res.end(
        [
          JSON.stringify({ model: 'gemma-prova', message: { content: '' } }),
          JSON.stringify({ message: { tool_calls: [{ function: { name: 'listar', arguments: { caminho: 'docs' } } }] } }),
          JSON.stringify({ done: true }),
          '',
        ].join('\n'),
      )
    })
    try {
      const resposta = await criarVizinhoReal(alvoDe('ollama', s.baseUrl))(HISTORICO)
      expect(resposta.modelo).toBe('gemma-prova')
      expect(resposta.pedidos).toEqual([{ id: 'chamada_1', ferramenta: 'listar', argumentos: { caminho: 'docs' } }])
    } finally {
      await s.fechar()
    }
  })
})

describe('Vizinho real — timeout ocioso (pós-11)', () => {
  it('fio que EMUDECE no meio: erro de TEMPO dizendo que nada chegou', async () => {
    const s = await servidorFalso((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' })
      res.write('data: {"choices":[{"delta":{"content":"comecou"}}]}\n\n')
      setTimeout(() => {
        try { res.end('data: {}\n\n') } catch { /* já abortado */ }
      }, 3000)
    })
    try {
      try {
        await criarVizinhoReal(alvoDe('openai-chat', s.baseUrl), { ociosoMs: 1200, totalMs: 30_000 })([{ papel: 'usuario', conteudo: 'oi' }])
        throw new Error('deveria ter falhado')
      } catch (erro) {
        expect((erro as ErroVizinho).code).toBe('tempo')
        expect((erro as Error).message).toContain('parou no meio da resposta')
      }
    } finally {
      await s.fechar()
    }
  })

  it('fio saudável e LENTO (pingos constantes): o ocioso NÃO dispara', async () => {
    const s = await servidorFalso((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' })
      let n = 0
      const timer = setInterval(() => {
        n += 1
        if (n > 10) {
          clearInterval(timer)
          res.end('data: [DONE]\n\n')
          return
        }
        res.write(`data: {"choices":[{"delta":{"content":"p${n} "}}]}\n\n`)
      }, 100)
      res.on('close', () => clearInterval(timer))
    })
    try {
      const resposta = await criarVizinhoReal(alvoDe('openai-chat', s.baseUrl), { ociosoMs: 500, totalMs: 30_000 })([{ papel: 'usuario', conteudo: 'fala' }])
      expect(resposta.texto).toContain('p1 ')
      expect(resposta.texto).toContain('p10 ')
    } finally {
      await s.fechar()
    }
  })

  it('rede absoluta: pingando PARA SEMPRE morre no total (não fica eterno)', async () => {
    const s = await servidorFalso((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' })
      let n = 0
      const timer = setInterval(() => {
        n += 1
        res.write(`data: {"choices":[{"delta":{"content":"p${n} "}}]}\n\n`)
      }, 60)
      const parar = (): void => clearInterval(timer)
      res.on('close', parar)
      setTimeout(() => {
        parar()
        try { res.end() } catch { /* já abortado */ }
      }, 3000)
    })
    try {
      try {
        await criarVizinhoReal(alvoDe('openai-chat', s.baseUrl), { ociosoMs: 5000, totalMs: 700 })([{ papel: 'usuario', conteudo: 'fala' }])
        throw new Error('deveria ter falhado')
      } catch (erro) {
        expect((erro as ErroVizinho).code).toBe('tempo')
        expect((erro as Error).message).toContain('não terminou em 1 segundo')
      }
    } finally {
      await s.fechar()
    }
  })
})

describe('Vizinho real — erros honestos', () => {
  it('401 vira erro de CHAVE', async () => {
    const s = await servidorFalso((req, res) => {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end('{"erro":"chave"}')
    })
    try {
      try {
        await criarVizinhoReal(alvoDe('openai-chat', s.baseUrl))([{ papel: 'usuario', conteudo: 'oi' }])
        throw new Error('deveria ter falhado')
      } catch (erro) {
        expect(erro).toBeInstanceOf(ErroVizinho)
        expect((erro as ErroVizinho).code).toBe('chave')
      }
    } finally {
      await s.fechar()
    }
  })

  it('serviço mudo além do primeiro byte vira erro de TEMPO', async () => {
    const s = await servidorFalso((req, res) => {
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'text/event-stream' })
        res.end('data: {}\n\n')
      }, 1200)
    })
    try {
      try {
        await criarVizinhoReal(alvoDe('openai-chat', s.baseUrl), { primeiroByteMs: 600 })([{ papel: 'usuario', conteudo: 'oi' }])
        throw new Error('deveria ter falhado')
      } catch (erro) {
        expect((erro as ErroVizinho).code).toBe('tempo')
        expect((erro as Error).message).toContain('não respondeu em 1 segundo')
      }
    } finally {
      await s.fechar()
    }
  })

  it('porta morta vira erro de ENDEREÇO', async () => {
    try {
      await criarVizinhoReal(alvoDe('ollama', 'http://127.0.0.1:1'))([{ papel: 'usuario', conteudo: 'oi' }])
      throw new Error('deveria ter falhado')
    } catch (erro) {
      expect((erro as ErroVizinho).code).toBe('endereco')
    }
  })
})
