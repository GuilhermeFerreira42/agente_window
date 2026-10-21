// ============================================================================
// Provas da rota /api/config (FATIA 11): GET devolve o guardado (ou o
// padrão); PUT valida antes de salvar; inválido = 400 honesto.
// ============================================================================
import { mkdtemp, rm } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { rotaPertenceAoModuloConfig, tratarRotasConfig } from '../server/rotas'

type ResFalsa = ServerResponse & { statusCode: number; chunks: string[]; corpo: () => string }

function fakeRes(): ResFalsa {
  const chunks: string[] = []
  const res = {
    statusCode: 0,
    chunks,
    corpo: () => chunks.join(''),
    setHeader: () => undefined,
    write: (dado: string) => {
      chunks.push(String(dado))
      return true
    },
    end: (dado?: string) => {
      if (dado !== undefined) chunks.push(String(dado))
    },
  }
  return res as unknown as ResFalsa
}

function fakeReq(corpo = '', metodo = 'GET'): IncomingMessage {
  const req = Readable.from([Buffer.from(corpo)]) as Readable & { method?: string }
  req.method = metodo
  return req as unknown as IncomingMessage
}

const URL_CONFIG = new URL('http://localhost/api/config')
const raiz = await mkdtemp(join(tmpdir(), 'config-rotas-'))
let variavelAntes: string | undefined

beforeEach(() => {
  variavelAntes = process.env.AGENTE_WINDOW_SETTINGS_PATH
  process.env.AGENTE_WINDOW_SETTINGS_PATH = join(raiz, `settings-${Date.now()}-${Math.random()}.json`)
})
afterEach(() => {
  if (variavelAntes === undefined) delete process.env.AGENTE_WINDOW_SETTINGS_PATH
  else process.env.AGENTE_WINDOW_SETTINGS_PATH = variavelAntes
})
afterAll(async () => {
  await rm(raiz, { recursive: true, force: true })
})

describe('Rota /api/config', () => {
  it('pertence ao módulo só no caminho exato', () => {
    expect(rotaPertenceAoModuloConfig('/api/config')).toBe(true)
    expect(rotaPertenceAoModuloConfig('/api/providers')).toBe(false)
  })

  it('GET sem arquivo = padrão; PUT salva; GET seguinte lê o salvo', async () => {
    const get1 = fakeRes()
    expect(await tratarRotasConfig(fakeReq(), get1, URL_CONFIG)).toBe(true)
    expect(JSON.parse(get1.corpo())).toEqual({ teto: 25, autoScroll: true })

    const put = fakeRes()
    expect(await tratarRotasConfig(fakeReq(JSON.stringify({ teto: 7 }), 'PUT'), put, URL_CONFIG)).toBe(true)
    expect(put.statusCode).toBe(200)
    expect(JSON.parse(put.corpo())).toEqual({ teto: 7, autoScroll: true })

    const get2 = fakeRes()
    await tratarRotasConfig(fakeReq(), get2, URL_CONFIG)
    expect(JSON.parse(get2.corpo())).toEqual({ teto: 7, autoScroll: true })
  })

  it('PUT inválido = 400 honesto e nada salva', async () => {
    const put = fakeRes()
    expect(await tratarRotasConfig(fakeReq(JSON.stringify({ teto: 251 }), 'PUT'), put, URL_CONFIG)).toBe(true)
    expect(put.statusCode).toBe(400)
    expect(JSON.parse(put.corpo()).message).toMatch(/número inteiro de 1 a 250/)

    const get = fakeRes()
    await tratarRotasConfig(fakeReq(), get, URL_CONFIG)
    expect(JSON.parse(get.corpo())).toEqual({ teto: 25, autoScroll: true })
  })

  it('corpo que não é JSON = 400 honesto; método estranho não é da casa', async () => {
    const put = fakeRes()
    await tratarRotasConfig(fakeReq('{ops', 'PUT'), put, URL_CONFIG)
    expect(put.statusCode).toBe(400)
    const del = fakeRes()
    expect(await tratarRotasConfig(fakeReq('', 'DELETE'), del, URL_CONFIG)).toBe(false)
  })
})
