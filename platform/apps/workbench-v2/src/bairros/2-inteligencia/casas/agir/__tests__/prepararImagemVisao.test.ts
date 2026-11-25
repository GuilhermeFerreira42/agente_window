// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { prepararImagemVisao, TETO_ORIGINAL_VISAO } from '../server/prepararImagemVisao'
import { inspecionarImagemVisao } from '../server/imagemVisao'
import { codecImagem } from '../../../../../server/session-persistence/attachments/codecImagem'

describe('MM-I preparação de imagem', () => {
  it('converte WebP com transparência em PNG e conserva os bytes originais', async () => {
    const original = await sharp({ create: { width: 16, height: 8, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0.5 } } }).webp({ lossless: true }).toBuffer()
    const copia = Buffer.from(original)
    const saida = await prepararImagemVisao(original, codecImagem)
    expect(original.equals(copia)).toBe(true)
    expect(inspecionarImagemVisao(saida)).toMatchObject({ mime: 'image/png', largura: 16, altura: 8 })
    expect((await sharp(saida).metadata()).hasAlpha).toBe(true)
  })
  it('reduz PNG grande proporcionalmente e mantém o original intacto', async () => {
    const original = await sharp({ create: { width: 2048, height: 1200, channels: 4, background: { r: 5, g: 25, b: 180, alpha: 0.7 } } }).png().toBuffer()
    const copia = Buffer.from(original)
    const saida = await prepararImagemVisao(original, codecImagem)
    expect(original.equals(copia)).toBe(true)
    expect(inspecionarImagemVisao(saida)).toMatchObject({ mime: 'image/png', largura: 1024, altura: 600 })
  })
  it('não entrega outros formatos ao codec nativo e recusa conversão sem codec', async () => {
    const codec = { metadados: vi.fn(), converter: vi.fn() }
    await expect(prepararImagemVisao(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), codec)).rejects.toThrow()
    expect(codec.metadados).not.toHaveBeenCalled()
    const webp = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#123456' } }).webp().toBuffer()
    await expect(prepararImagemVisao(webp)).rejects.toThrow()
  })
  it('mantém PNG pequeno byte a byte e rejeita arquivo inválido ou fora do teto', async () => {
    const pequeno = await sharp({ create: { width: 3, height: 3, channels: 3, background: '#123456' } }).png().toBuffer()
    expect((await prepararImagemVisao(pequeno)).equals(pequeno)).toBe(true)
    await expect(prepararImagemVisao(Buffer.from('não é imagem'))).rejects.toThrow()
    await expect(prepararImagemVisao(Buffer.alloc(TETO_ORIGINAL_VISAO + 1))).rejects.toThrow()
  })
})
