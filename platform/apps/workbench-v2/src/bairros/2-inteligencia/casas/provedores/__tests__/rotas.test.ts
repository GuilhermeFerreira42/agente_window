import { mkdtemp, rm } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { salvarArquivo } from '../server/providersRepo'
import { rotaPertenceAoModulo, tratarRotasProvedores } from '../server/rotas'

function fakeReq(body = '', method = 'POST'): IncomingMessage {
  const request = Readable.from([Buffer.from(body)]) as Readable & { method?: string }
  request.method = method
  return request as IncomingMessage
}

function fakeRes(): ServerResponse & { body: string; headers: Record<string, string> } {
  const chunks: string[] = []
  const headers: Record<string, string> = {}
  const response = {
    statusCode: 0,
    body: '',
    headers,
    setHeader: (key: string, value: string) => { headers[key.toLowerCase()] = value },
    end: (chunk?: string) => { if (chunk) chunks.push(chunk); response.body = chunks.join('') },
  }
  return response as unknown as ServerResponse & { body: string; headers: Record<string, string> }
}

describe('Casa Provedores · rota F5-B', () => {
  let folder: string
  let oldPath: string | undefined
  const fetchSpy = vi.fn()

  beforeEach(async () => {
    oldPath = process.env.AGENTE_WINDOW_PROVIDERS_PATH
    folder = await mkdtemp(join(tmpdir(), 'provedores-rota-canary-'))
    process.env.AGENTE_WINDOW_PROVIDERS_PATH = join(folder, 'providers.json')
    await salvarArquivo({
      ativo: 'openai',
      provedores: {
        openai: {
          baseUrl: 'https://mock.invalid/v1',
          modelo: 'route-fixture',
          modelosHabilitados: ['route-fixture'],
          habilitado: true,
          apiKey: 'test-only-not-a-real-credential',
        },
      },
    })
    fetchSpy.mockReset()
    vi.stubGlobal('fetch', fetchSpy)
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
    if (oldPath === undefined) delete process.env.AGENTE_WINDOW_PROVIDERS_PATH
    else process.env.AGENTE_WINDOW_PROVIDERS_PATH = oldPath
    await rm(folder, { recursive: true, force: true })
  })

  it('expõe a rota, mas sem consentimento explícito não chama o provedor', async () => {
    const url = new URL('http://localhost/api/providers/tool-calling/verify')
    expect(rotaPertenceAoModulo(url.pathname)).toBe(true)
    const response = fakeRes()
    const handled = await tratarRotasProvedores(
      fakeReq(JSON.stringify({ providerId: 'openai', modelId: 'route-fixture', consent: false })),
      response,
      url,
    )
    expect(handled).toBe(true)
    expect(response.statusCode).toBe(400)
    expect(response.body).toContain('autorização explícita')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('com consentimento, a rota roda o round-trip simulado e só devolve o resumo sanitizado', async () => {
    let chamadas = 0
    const sse = (payload: unknown) => new Response(`data: ${JSON.stringify(payload)}\n\ndata: [DONE]\n\n`, {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    })
    fetchSpy.mockImplementation(async (_url: string, init: RequestInit) => {
      chamadas += 1
      const pedido = JSON.parse(String(init.body)) as { model: string; tools: Array<{ function?: { name?: string } }>; messages: Array<{ role: string; content?: string }> }
      expect(pedido.model).toBe('route-fixture')
      expect(pedido.tools.map((tool) => tool.function?.name)).toEqual(['ler'])
      if (chamadas === 1) {
        const caminhoCanary = (pedido.messages[0]?.content ?? '').match(/caminho igual a "([^"]+)"/)?.[1]
        return sse({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'call-route', function: { name: 'ler', arguments: JSON.stringify({ caminho: caminhoCanary }) } }] } }] })
      }
      const retorno = pedido.messages.find((message) => message.role === 'tool')?.content ?? ''
      return sse({ choices: [{ delta: { content: retorno } }] })
    })
    const response = fakeRes()
    await tratarRotasProvedores(
      fakeReq(JSON.stringify({ providerId: 'openai', modelId: 'route-fixture', consent: true })),
      response,
      new URL('http://localhost/api/providers/tool-calling/verify'),
    )
    expect(response.statusCode).toBe(200)
    expect(response.headers['cache-control']).toBe('no-store')
    expect(JSON.parse(response.body)).toMatchObject({ providerId: 'openai', modelId: 'route-fixture', status: 'verified', reason: 'roundtrip_verified', cached: false })
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(response.body).not.toContain('test-only-not-a-real-credential')
    expect(response.body).not.toContain('fingerprint')
  })

  it('GET não revela credencial, fingerprint nem registros internos', async () => {
    const response = fakeRes()
    await tratarRotasProvedores(fakeReq('', 'GET'), response, new URL('http://localhost/api/providers'))
    expect(response.statusCode).toBe(200)
    expect(response.body).not.toContain('test-only-not-a-real-credential')
    expect(response.body).not.toContain('fingerprint')
    expect(response.body).toContain('"status":"unknown"')
  })
})
