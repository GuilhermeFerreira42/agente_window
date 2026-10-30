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

describe('Casa Provedores · rotas e catálogo', () => {
  let folder: string
  let oldPath: string | undefined
  const fetchSpy = vi.fn()

  beforeEach(async () => {
    oldPath = process.env.AGENTE_WINDOW_PROVIDERS_PATH
    folder = await mkdtemp(join(tmpdir(), 'provedores-rota-fixture-'))
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

  it('não registra mais endpoint de verificação de tool calling', async () => {
    const url = new URL('http://localhost/api/providers/tool-calling/verify')
    expect(rotaPertenceAoModulo(url.pathname)).toBe(false)
    const response = fakeRes()
    const handled = await tratarRotasProvedores(fakeReq(JSON.stringify({ providerId: 'openai', modelId: 'route-fixture' })), response, url)
    expect(handled).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('GET entrega configuração local v4 sem revelar a chave nem depender de rede externa', async () => {
    const response = fakeRes()
    await tratarRotasProvedores(fakeReq('', 'GET'), response, new URL('http://localhost/api/providers'))
    expect(response.statusCode).toBe(200)
    expect(response.body).not.toContain('test-only-not-a-real-credential')
    expect(response.body).not.toContain('fingerprint')
    expect(response.body).toContain('route-fixture')
    expect(response.body).not.toContain('capability')
    expect(response.body).not.toContain('assessment')
    expect(JSON.parse(response.body)).toMatchObject({
      storage: 'fixture',
      ativo: 'openai',
      provedores: [{ id: 'openai', modelo: 'route-fixture', baseUrl: 'https://mock.invalid/v1' }],
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
