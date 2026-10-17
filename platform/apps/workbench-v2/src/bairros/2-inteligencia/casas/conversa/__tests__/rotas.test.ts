// Casa Conversa — a rota POST /api/chat (conquista 1 da FATIA 09).
// Prova o contrato do fio: pré-condições 4xx JSON {code,message}; sucesso em
// SSE com chunk+done; falha do provedor como evento error; e o "Parar"
// (close da conexão) abortando EM SILÊNCIO — sem texto inventado.
import type { IncomingMessage, ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AlvoConversa, ObterAlvo } from '../contract'
import { rotaPertenceAoModuloConversa, tratarRotasConversa } from '../server/rotas'

type ResFalsa = ServerResponse & {
  statusCode: number
  ended: boolean
  chunks: string[]
  cabecalhos: Record<string, string>
  corpo: () => string
}

function fakeRes(): ResFalsa {
  const cabecalhos: Record<string, string> = {}
  const chunks: string[] = []
  const res = {
    statusCode: 0,
    ended: false,
    chunks,
    cabecalhos,
    corpo: () => chunks.join(''),
    setHeader: (chave: string, valor: string) => {
      cabecalhos[chave.toLowerCase()] = String(valor)
    },
    flushHeaders: () => undefined,
    write: (dado: string) => {
      chunks.push(String(dado))
      return true
    },
    end: (dado?: string) => {
      if (dado !== undefined) chunks.push(String(dado))
      res.ended = true
    },
  }
  return res as unknown as ResFalsa
}

function fakeReq(corpo = '', metodo = 'POST'): IncomingMessage & { emit(evento: string): boolean } {
  const req = Readable.from([Buffer.from(corpo)]) as Readable & { method?: string }
  req.method = metodo
  return req as unknown as IncomingMessage & { emit(evento: string): boolean }
}

const URL_CHAT = new URL('http://localhost/api/chat')
const BODY = JSON.stringify({ messages: [{ role: 'user', content: 'oi' }] })

const ALVO: AlvoConversa = { protocolo: 'openai-chat', baseUrl: 'http://stub.test/v1', modelo: 'm', apiKey: 'sk-123' }
const alvoOk: ObterAlvo = async () => ({ alvo: ALVO })

function frames(res: ResFalsa): Record<string, unknown>[] {
  return res.chunks
    .join('')
    .split('\n\n')
    .filter(Boolean)
    .map((linha) => JSON.parse(linha.replace(/^data: /, '')) as Record<string, unknown>)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('rotas — POST /api/chat', () => {
  it('reconhece só o caminho e o método certos', async () => {
    expect(rotaPertenceAoModuloConversa('/api/chat')).toBe(true)
    expect(rotaPertenceAoModuloConversa('/api/chatx')).toBe(false)
    expect(rotaPertenceAoModuloConversa('/api/chats')).toBe(false)
    const res = fakeRes()
    expect(await tratarRotasConversa(fakeReq(BODY, 'GET'), res, URL_CHAT, alvoOk)).toBe(false)
    expect(await tratarRotasConversa(fakeReq(BODY), fakeRes(), new URL('http://localhost/api/outra'), alvoOk)).toBe(false)
  })

  it('sem provedor ativo → 409 JSON com code honesto e fio NUNCA aberto', async () => {
    const res = fakeRes()
    const tratou = await tratarRotasConversa(fakeReq(BODY), res, URL_CHAT, async () => ({
      alvo: null,
      erro: { code: 'sem_provedor', message: 'Nenhum provedor está ativo. Abra Provedores e escolha quem vai responder.' },
    }))
    expect(tratou).toBe(true)
    expect(res.statusCode).toBe(409)
    expect(res.cabecalhos['content-type']).toContain('application/json')
    expect(JSON.parse(res.corpo())).toMatchObject({ code: 'sem_provedor' })
    expect(res.chunks.join(''), 'fio SSE nunca aberto').not.toContain('data: ')
  })

  it('histórico vazio ou mal formado → 400 configuração', async () => {
    const res = fakeRes()
    await tratarRotasConversa(fakeReq(JSON.stringify({ messages: [] })), res, URL_CHAT, alvoOk)
    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.corpo())).toMatchObject({ code: 'configuracao' })
    const res2 = fakeRes()
    await tratarRotasConversa(fakeReq('isso nao é json'), res2, URL_CHAT, alvoOk)
    expect(res2.statusCode).toBe(400)
  })

  it('caminho feliz → SSE 200 com chunk e depois done', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: 'Olá' } }] }), { status: 200 })),
    )
    const res = fakeRes()
    const tratou = await tratarRotasConversa(fakeReq(BODY), res, URL_CHAT, alvoOk)
    expect(tratou).toBe(true)
    expect(res.statusCode).toBe(200)
    expect(res.cabecalhos['content-type']).toContain('text/event-stream')
    expect(res.cabecalhos['cache-control']).toContain('no-cache')
    expect(frames(res)).toEqual([
      { type: 'chunk', text: 'Olá' },
      // FATIA 09: o done carrega o modelo EFETIVO (fallback: o configurado).
      { type: 'done', model: 'm' },
    ])
    expect(res.ended).toBe(true)
  })

  it('erro do provedor vira evento error no fio (com code honesto)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nao importa', { status: 401 })))
    const res = fakeRes()
    await tratarRotasConversa(fakeReq(BODY), res, URL_CHAT, alvoOk)
    expect(res.statusCode).toBe(200)
    const [evento] = frames(res)
    expect(evento).toMatchObject({ type: 'error', code: 'chave' })
    expect(res.ended).toBe(true)
  })

  it('Parar (close da conexão) aborta o provedor em silêncio — sem error, sem done', async () => {
    const abortado = Object.assign(new Error('abortado'), { name: 'AbortError' })
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: unknown, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            const sinal = init?.signal
            if (!sinal || sinal.aborted) {
              reject(abortado)
              return
            }
            sinal.addEventListener('abort', () => reject(abortado))
          }),
      ),
    )
    const req = fakeReq(BODY)
    const res = fakeRes()
    const promessa = tratarRotasConversa(req, res, URL_CHAT, alvoOk)
    await new Promise((resolver) => setTimeout(resolver, 15)) // deixa chegar no fetch
    req.emit('close') // a tela apertou Parar
    const tratou = await promessa
    expect(tratou).toBe(true)
    const texto = res.corpo()
    expect(texto).not.toContain('"type":"error"')
    expect(texto).not.toContain('"type":"done"')
    expect(res.ended).toBe(true)
  })
})
