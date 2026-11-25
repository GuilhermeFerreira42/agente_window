import { describe, expect, it } from 'vitest'
import { PNG } from 'pngjs'
import { construirCorpoVisaoOpenAI, LIMITES_LOCAIS_VISAO } from '../server/limitesVisao'

const limite = { quantidade: 3, arquivoBytes: 4 * 1024 * 1024, conjuntoBytes: 6 * 1024 * 1024, largura: 2048, altura: 2048, pixels: 2048 * 2048, corpoBytes: 9 * 1024 * 1024 }
function imagem(): Buffer { const p = new PNG({ width: 1, height: 1 }); p.data = Buffer.from([1, 2, 3, 255]); return PNG.sync.write(p) }
function corpo() { return { model: 'modelo-fixture', stream: true, messages: [{ role: 'system', content: 'instrução' }, { role: 'user', content: 'Qual é a cor?' }] } }

describe('MMI-06 — limites de visão e corpo OpenAI', () => {
  it('preserva o pedido, insere somente na mensagem humana atual e mede o JSON exato', () => {
    const anterior = corpo(); const bytes = imagem()
    const resultado = construirCorpoVisaoOpenAI(anterior, [bytes], limite)
    expect(anterior.messages[1].content).toBe('Qual é a cor?')
    const json = JSON.stringify(resultado.corpo)
    expect(resultado.bytesCorpo).toBe(Buffer.byteLength(json))
    const mensagens = resultado.corpo.messages as Array<{ role: string; content: unknown }>
    expect(mensagens[0]).toEqual({ role: 'system', content: 'instrução' })
    expect(mensagens[1].content).toEqual([{ type: 'text', text: 'Qual é a cor?' }, { type: 'image_url', image_url: { url: `data:image/png;base64,${bytes.toString('base64')}` } }])
  })
  it('bloqueia limite desconhecido, zero, excesso de quantidade, arquivo, conjunto e corpo', () => {
    const bytes = imagem()
    expect(() => construirCorpoVisaoOpenAI(corpo(), [bytes], { ...limite, corpoBytes: NaN })).toThrow()
    expect(() => construirCorpoVisaoOpenAI(corpo(), [bytes], { ...limite, arquivoBytes: 0 })).toThrow()
    expect(() => construirCorpoVisaoOpenAI(corpo(), [bytes, bytes], { ...limite, quantidade: 1 })).toThrow()
    expect(() => construirCorpoVisaoOpenAI(corpo(), [bytes], { ...limite, arquivoBytes: bytes.length - 1 })).toThrow()
    expect(() => construirCorpoVisaoOpenAI(corpo(), [bytes, bytes], { ...limite, conjuntoBytes: bytes.length * 2 - 1 })).toThrow()
    const tamanho = construirCorpoVisaoOpenAI(corpo(), [bytes], limite).bytesCorpo
    expect(() => construirCorpoVisaoOpenAI(corpo(), [bytes], { ...limite, corpoBytes: tamanho - 1 })).toThrow()
    expect(construirCorpoVisaoOpenAI(corpo(), [bytes], { ...limite, corpoBytes: tamanho }).bytesCorpo).toBe(tamanho)
  })
  it('não usa MIME de cliente, recusa dimensões maiores e não ignora itens incompatíveis', () => {
    const bytes = imagem()
    expect(() => construirCorpoVisaoOpenAI(corpo(), [bytes], { ...limite, largura: 0 })).toThrow()
    const grande = new PNG({ width: 3, height: 2 }); grande.data = Buffer.alloc(3 * 2 * 4, 255)
    const pixels = PNG.sync.write(grande)
    expect(() => construirCorpoVisaoOpenAI(corpo(), [pixels], { ...limite, largura: 2 })).toThrow()
    expect(() => construirCorpoVisaoOpenAI(corpo(), [pixels], { ...limite, altura: 1 })).toThrow()
    expect(() => construirCorpoVisaoOpenAI(corpo(), [pixels], { ...limite, pixels: 5 })).toThrow()
    expect(construirCorpoVisaoOpenAI(corpo(), [pixels], { ...limite, largura: 3, altura: 2, pixels: 6 }).bytesCorpo).toBeGreaterThan(0)
    expect(() => construirCorpoVisaoOpenAI(corpo(), [bytes, Buffer.from('%PDF')], limite)).toThrow()
    expect(() => construirCorpoVisaoOpenAI(corpo(), Array(LIMITES_LOCAIS_VISAO.quantidade + 1).fill(bytes), limite)).toThrow()
  })
  it('recusa pedido sem pergunta atual ou com partes antigas no histórico', () => {
    expect(() => construirCorpoVisaoOpenAI({ model: 'x', messages: [{ role: 'assistant', content: 'x' }] }, [imagem()], limite)).toThrow()
    expect(() => construirCorpoVisaoOpenAI({ model: 'x', messages: [{ role: 'user', content: [{ type: 'image_url' }] }, { role: 'user', content: 'pergunta' }] }, [imagem()], limite)).toThrow()
  })
})
