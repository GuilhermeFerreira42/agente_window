import { afterEach, describe, expect, it, vi } from 'vitest'
import { PNG } from 'pngjs'
import type { AlvoConversa, IniciarChamadaModelo } from '../../conversa'
import { comCorpoVisao, construirProvaVisao, proporVisao, type FonteVisao } from '../server/admissaoVisao'
import { fonteDeVisao, verificarVisao } from '../server/verificarVisao'

const alvo: AlvoConversa = {
  providerId: 'openai', modelId: 'modelo-sintetico', modelo: 'modelo-sintetico',
  baseUrl: 'https://api.openai.com/v1', protocolo: 'openai-chat', apiKey: 'chave-falsa',
  configRevision: 'rev-1',
}
const fonte: FonteVisao = atual => construirProvaVisao(atual, { configuracao: 'rev-local', api: 'rev-api' }, '2026-11-24T00:00:00Z')
const ctx = { sessionId: 'sessao', chatId: 'chat', texto: 'Pergunta' }
const momento = () => ({ ...proporVisao(alvo, fonte, 'mensagem', ctx.texto)!, messageId: 'mensagem', artifactIds: ['imagem'] })
const png = PNG.sync.write(new PNG({ width: 2, height: 2 }))
const iniciar: IniciarChamadaModelo = async (_provedor, _modelo, callback) => callback({
  providerId: 'openai', modelId: 'modelo-sintetico', baseUrl: 'https://api.openai.com/v1',
  protocolo: 'openai-chat', apiKey: 'chave-falsa', configRevision: 'rev-1',
})

afterEach(() => vi.unstubAllGlobals())

describe('MM-I: admissão e destino', () => {
  it('recusa outro texto, identidade de mensagem ou configuração sem chegar aos bytes', async () => {
    const visao = momento()
    const ler = vi.fn()
    const enviar = vi.fn()
    await expect(comCorpoVisao(visao, { ...ctx, texto: 'Outro' }, alvo, fonte, ler, enviar)).rejects.toThrow()
    await expect(comCorpoVisao({ ...visao, messageId: 'outra' }, ctx, alvo, fonte, ler, enviar)).rejects.toThrow()
    await expect(comCorpoVisao(visao, ctx, { ...alvo, configRevision: 'rev-2' }, fonte, ler, enviar)).rejects.toThrow()
    expect(ler).not.toHaveBeenCalled()
    expect(enviar).not.toHaveBeenCalled()
  })

  it('revalida no início do fetch e não repete a mesma autorização', async () => {
    const ler = vi.fn(async () => ({ bytes: png }))
    const visao = momento()
    const corpo = { messages: [{ role: 'user', content: ctx.texto }] }
    await expect(comCorpoVisao(visao, ctx, alvo, fonte, ler, async preparar => preparar(
      { ...alvo, apiKey: 'rotacionada' }, corpo))).rejects.toThrow(/destino/)
    await expect(comCorpoVisao(visao, ctx, alvo, fonte, ler, async preparar => preparar(alvo, corpo))).rejects.toThrow()
    expect(ler).toHaveBeenCalledTimes(1)

    const efetivo = await comCorpoVisao(momento(), ctx, alvo, fonte, ler, async preparar => preparar(alvo, corpo))
    expect(efetivo).toMatchObject({ messages: [{ role: 'user', content: [
      { type: 'text', text: ctx.texto },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,' + png.toString('base64') } },
    ] }] })
  })

  it('admite uma transmissão por vez e libera a próxima depois da resposta', async () => {
    let responder!: () => void
    const primeiraResposta = new Promise<void>(resolve => { responder = resolve })
    const carregar = vi.fn(async () => ({ bytes: png }))
    const primeira = comCorpoVisao(momento(), ctx, alvo, fonte, carregar, async () => primeiraResposta)
    await vi.waitFor(() => expect(carregar).toHaveBeenCalledTimes(1))
    const outra = momento()
    await expect(comCorpoVisao(outra, ctx, alvo, fonte, carregar, async () => undefined)).rejects.toThrow(/outro envio/)
    expect(carregar).toHaveBeenCalledTimes(1)
    responder()
    await primeira
    await expect(comCorpoVisao(outra, ctx, alvo, fonte, carregar, async () => undefined)).resolves.toBeUndefined()
    expect(carregar).toHaveBeenCalledTimes(2)
  })

  function lerDesafio(init: RequestInit) {
    const desenhos = [
      '111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001',
      '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111',
    ]
    const partes = JSON.parse(String(init.body)).messages[0].content
    const imagem = PNG.sync.read(Buffer.from(partes[1].image_url.url.split(',')[1], 'base64'))
    return Array.from({ length: 5 }, (_, posicao) => {
      const bits = Array.from({ length: 15 }, (_, i) => {
        const x = (i % 3 + 1 + posicao * 4) * 12 + 6
        const y = (Math.floor(i / 3) + 1) * 12 + 6
        return imagem.data[(y * imagem.width + x) * 4] === 0 ? '1' : '0'
      }).join('')
      return desenhos.indexOf(bits)
    }).join('')
  }

  it('exige desafio sintético no endpoint exato e invalida a prova após mudar a configuração', async () => {
    let lido = ''
    const fetch = vi.fn(async (_url: string, init: RequestInit) => {
      lido = lerDesafio(init)
      return Response.json({ choices: [{ message: { content: lido } }] })
    })
    vi.stubGlobal('fetch', fetch)
    await verificarVisao({ ...alvo, baseUrl: 'https://gateway.example/v1' }, iniciar)
    expect(fetch).not.toHaveBeenCalled()
    expect(fonteDeVisao(alvo)).toBeUndefined()
    await verificarVisao(alvo, iniciar)
    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = (fetch.mock.calls as unknown as Array<[string, RequestInit]>)[0]
    expect(url).toBe('https://api.openai.com/v1/chat/completions')
    expect(init.redirect).toBe('error')
    const partes = JSON.parse(String(init.body)).messages[0].content
    expect(lido).toMatch(/^\d{5}$/)
    expect(partes[0].text).not.toContain(lido)
    const imagem = PNG.sync.read(Buffer.from(partes[1].image_url.url.split(',')[1], 'base64'))
    expect(imagem.width).toBe(252)
    expect(proporVisao(alvo, fonteDeVisao, 'mensagem-provada', ctx.texto)).not.toBeNull()
    expect(fonteDeVisao({ ...alvo, configRevision: 'rev-2' })).toBeUndefined()
  })

  it('só admite anexos no LiteLLM após provar o destino fixo com uma segunda imagem', async () => {
    const pool = { ...alvo, providerId: 'openai-compat', baseUrl: 'https://gateway.example/v1' }
    const iniciarPool: IniciarChamadaModelo = async (_provedor, _modelo, callback) => callback({
      ...pool, providerId: pool.providerId, modelId: 'modelo-sintetico', configRevision: 'rev-1',
      protocolo: 'openai-chat', baseUrl: pool.baseUrl, apiKey: 'chave-falsa',
    })
    const chamadas: string[] = []
    let roteiaParaOutro = true
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe(pool.baseUrl + '/chat/completions')
      expect(new Headers(init.headers).get('x-litellm-num-retries')).toBe('0')
      const corpo = JSON.parse(String(init.body))
      expect(corpo.disable_fallbacks).toBe(true)
      chamadas.push(corpo.model)
      const destino = corpo.model === 'destino-confirmado' && roteiaParaOutro ? 'destino-inesperado' : 'destino-confirmado'
      return Response.json({ choices: [{ message: { content: lerDesafio(init) } }] }, {
        headers: { 'x-litellm-model-id': destino },
      })
    }))
    await verificarVisao(pool, iniciarPool)
    expect(chamadas).toEqual(['modelo-sintetico', 'destino-confirmado'])
    expect(proporVisao(pool, fonteDeVisao, 'mensagem', ctx.texto)).toBeNull()

    roteiaParaOutro = false
    await verificarVisao(pool, iniciarPool)
    const proposta = proporVisao(pool, fonteDeVisao, 'mensagem', ctx.texto)
    expect(proposta?.modelId).toBe(pool.modelId)
    const ler = async () => ({ bytes: png })
    const pedido = { proposta: proposta!.proposta, messageId: 'mensagem', artifactIds: ['imagem'] }
    const efetivo = await comCorpoVisao(pedido, ctx, pool, fonteDeVisao, ler, async preparar =>
      preparar(pool, { model: pool.modelId, messages: [{ role: 'user', content: ctx.texto }] }))
    expect(efetivo).toMatchObject({ model: 'destino-confirmado', disable_fallbacks: true })
  })
})
