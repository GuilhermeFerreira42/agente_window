import { describe, expect, it } from 'vitest'
import { partesVisaoOpenAI } from '../server/visaoOpenAI'

describe('MM-I — serialização openai-chat (sem autorizar envio)', () => {
  it('preserva o texto e codifica os bytes fornecidos, na ordem, como data URLs', () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])
    const partes = partesVisaoOpenAI('O que há nas imagens?', [
      { mime: 'image/png', bytes: png },
      { mime: 'image/jpeg', bytes: jpeg },
    ])
    expect(partes).toEqual([
      { type: 'text', text: 'O que há nas imagens?' },
      { type: 'image_url', image_url: { url: `data:image/png;base64,${Buffer.from(png).toString('base64')}` } },
      { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${Buffer.from(jpeg).toString('base64')}` } },
    ])
    expect([...png]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  })

  it('rejeita entrada vazia e mídia fora do recorte, sem converter por extensão', () => {
    expect(() => partesVisaoOpenAI('pergunta', [{ mime: 'image/png', bytes: new Uint8Array() }])).toThrow()
    expect(() => partesVisaoOpenAI('pergunta', [{ mime: 'application/pdf' as 'image/png', bytes: new Uint8Array([1]) }])).toThrow()
    expect(() => partesVisaoOpenAI('pergunta', [])).toThrow()
  })
})
