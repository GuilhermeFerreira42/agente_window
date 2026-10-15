// Casa Provedores — testes da sonda de conexão (FATIA 08).
// `fetch` é mockado: aqui se prova a CORRENTE (endereço, cabeçalho, resposta lida)
// e as categorias honestas de falha — sem tocar em internet de verdade.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { extrairModelos, listarModelos, testarConexao } from '../server/probe'

type Chamada = { url: string; init?: RequestInit }

function mockFetch(respostas: (chamada: Chamada) => Response | Error): Chamada[] {
  const chamadas: Chamada[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL, init?: RequestInit) => {
      const chamada = { url: String(url), init }
      chamadas.push(chamada)
      const resultado = respostas(chamada)
      if (resultado instanceof Error) throw resultado
      return resultado
    }),
  )
  return chamadas
}

function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('probe — teste de conexão (servidor → provedor)', () => {
  it('openai-chat: sucesso mostra a contagem de modelos e manda a chave por cabeçalho', async () => {
    const chamadas = mockFetch(() => json({ data: [{ id: 'gpt-4o' }, { id: 'gpt-4o-mini' }] }))
    const r = await testarConexao({ id: 'openai', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-123' })
    expect(r.ok).toBe(true)
    expect(r.categoria).toBe('ok')
    expect(r.modelos).toBe(2)
    expect(chamadas[0].url).toBe('https://api.openai.com/v1/models')
    expect((chamadas[0].init?.headers as Record<string, string>).Authorization).toBe('Bearer sk-123')
    // A chave NUNCA entra na URL.
    expect(chamadas[0].url).not.toContain('sk-123')
  })

  it('nvidia: fala o formato OpenAI e lista o catálogo (D82)', async () => {
    const chamadas = mockFetch(() => json({ data: [{ id: 'meta/llama-3.3-70b-instruct' }, { id: 'deepseek-ai/deepseek-r1' }, { id: 'qwen/qwen2.5-coder-32b-instruct' }] }))
    const r = await testarConexao({ id: 'nvidia', baseUrl: 'https://integrate.api.nvidia.com/v1', apiKey: 'nvapi-1' })
    expect(r.ok).toBe(true)
    expect(r.modelos).toBe(3)
    expect(chamadas[0].url).toBe('https://integrate.api.nvidia.com/v1/models')
  })

  it('gemini: chave por cabeçalho próprio e nomes sem o prefixo "models/"', async () => {
    const chamadas = mockFetch(() => json({ models: [{ name: 'models/gemini-2.5-pro' }, { name: 'models/gemini-2.5-flash' }] }))
    const r = await testarConexao({ id: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', apiKey: 'AIza-1' })
    expect(r.ok).toBe(true)
    expect(r.modelos).toBe(2)
    expect((chamadas[0].init?.headers as Record<string, string>)['x-goog-api-key']).toBe('AIza-1')
    expect(chamadas[0].url).not.toContain('AIza')
  })

  it('anthropic: manda x-api-key + anthropic-version', async () => {
    const chamadas = mockFetch(() => json({ data: [{ id: 'claude-sonnet-4-5' }] }))
    const r = await testarConexao({ id: 'anthropic', baseUrl: 'https://api.anthropic.com/v1', apiKey: 'sk-ant-1' })
    expect(r.ok).toBe(true)
    const cabecalhos = chamadas[0].init?.headers as Record<string, string>
    expect(cabecalhos['x-api-key']).toBe('sk-ant-1')
    expect(cabecalhos['anthropic-version']).toBe('2023-06-01')
  })

  it('ollama local: sem chave funciona; lê /api/tags', async () => {
    const chamadas = mockFetch(() => json({ models: [{ name: 'llama3.2' }, { name: 'qwen2.5-coder' }] }))
    const r = await testarConexao({ id: 'ollama', baseUrl: 'http://localhost:11434', apiKey: null })
    expect(r.ok).toBe(true)
    expect(r.modelos).toBe(2)
    expect(chamadas[0].url).toBe('http://localhost:11434/api/tags')
  })

  it('chave inválida → categoria "chave" (401/403) com dica honesta', async () => {
    mockFetch(() => json({ error: 'invalid api key' }, 401))
    const r = await testarConexao({ id: 'openai', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-errada' })
    expect(r.ok).toBe(false)
    expect(r.categoria).toBe('chave')
    expect(r.mensagem).toMatch(/401/)
  })

  it('endereço inalcançável → categoria "endereco"', async () => {
    mockFetch(() => new TypeError('fetch failed'))
    const r = await testarConexao({ id: 'ollama', baseUrl: 'http://localhost:11434', apiKey: null })
    expect(r.ok).toBe(false)
    expect(r.categoria).toBe('endereco')
    expect(r.mensagem).toMatch(/Ollama/)
  })

  it('demora mais de 10 s → categoria "tempo"', async () => {
    mockFetch(() => Object.assign(new Error('timeout'), { name: 'TimeoutError' }))
    const r = await testarConexao({ id: 'openai', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-1' })
    expect(r.ok).toBe(false)
    expect(r.categoria).toBe('tempo')
    expect(r.mensagem).toMatch(/10 segundos/)
  })

  it('sem chave em provedor que exige → nem chama o serviço', async () => {
    const chamadas = mockFetch(() => json({}))
    const r = await testarConexao({ id: 'anthropic', baseUrl: 'https://api.anthropic.com/v1', apiKey: null })
    expect(r.ok).toBe(false)
    expect(r.categoria).toBe('chave')
    expect(chamadas).toHaveLength(0)
  })

  it('serviço que NÃO lista modelos: com modelo digitado, testa a conversa e aprova (honesto)', async () => {
    const chamadas = mockFetch((c) => (c.url.endsWith('/chat/completions') ? json({ choices: [] }) : json({}, 404)))
    const r = await testarConexao({ id: 'openai-compat', baseUrl: 'https://servico.local/v1', apiKey: 'gsk-1', modelo: 'llama-3.3-70b-versatile' })
    expect(r.ok).toBe(true)
    expect(r.mensagem).toMatch(/não listou modelos/)
    expect(chamadas[1].url).toBe('https://servico.local/v1/chat/completions')
    const corpo = JSON.parse(String(chamadas[1].init?.body))
    expect(corpo.model).toBe('llama-3.3-70b-versatile')
  })

  it('serviço que NÃO lista modelos e SEM modelo digitado: pede o nome à mão (sem chutar)', async () => {
    mockFetch(() => json({}, 404))
    const r = await testarConexao({ id: 'openai-compat', baseUrl: 'https://servico.local/v1', apiKey: 'gsk-1' })
    expect(r.ok).toBe(false)
    expect(r.categoria).toBe('http')
    expect(r.mensagem).toMatch(/à mão/)
  })

  it('buscar modelos é separado: lista; quando o serviço não suporta, explica', async () => {
    mockFetch(() => json({ data: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] }))
    expect(await listarModelos({ id: 'deepseek', baseUrl: 'https://api.deepseek.com/v1', apiKey: 'sk-1' })).toEqual({ ok: true, modelos: ['a', 'b', 'c'] })

    vi.unstubAllGlobals()
    mockFetch(() => json({}, 405))
    const semLista = await listarModelos({ id: 'openai-compat', baseUrl: 'https://servico.local/v1', apiKey: 'gsk-1' })
    expect(semLista.ok).toBe(false)
    expect(semLista.mensagem).toMatch(/405/)
  })

  it('extrairModelos tolera formatos diferentes e resposta estranha', () => {
    expect(extrairModelos('openai-chat', { data: [{ id: 'x' }, {}] })).toEqual(['x'])
    expect(extrairModelos('gemini', { models: [{ name: 'models/y' }] })).toEqual(['y'])
    expect(extrairModelos('ollama', { models: [{ name: 'z' }] })).toEqual(['z'])
    expect(extrairModelos('openai-chat', null)).toEqual([])
    expect(extrairModelos('openai-chat', { nada: true })).toEqual([])
  })
})
