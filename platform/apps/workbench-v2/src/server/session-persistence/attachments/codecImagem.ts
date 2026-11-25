// Adaptador nativo da prefeitura. Não decide consentimento, alvo nem acesso ao arquivo.
import sharp from 'sharp'

const MAX_PIXELS_ORIGINAL = 12 * 1024 * 1024

export const codecImagem = {
  async metadados(original: Buffer): Promise<{ largura?: number; altura?: number; formato?: string; paginas?: number }> {
    const meta = await sharp(original, { failOn: 'warning', limitInputPixels: MAX_PIXELS_ORIGINAL, sequentialRead: true }).metadata()
    return { largura: meta.width, altura: meta.height, formato: meta.format, paginas: meta.pages }
  },
  async converter(original: Buffer, largura: number, altura: number): Promise<Buffer> {
    return sharp(original, { failOn: 'warning', limitInputPixels: MAX_PIXELS_ORIGINAL, sequentialRead: true })
      .rotate().toColourspace('srgb').resize({ width: largura, height: altura, fit: 'inside', withoutEnlargement: true }).png().toBuffer()
  },
}
