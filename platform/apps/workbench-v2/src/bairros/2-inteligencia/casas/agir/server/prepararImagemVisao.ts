// Prepara somente uma cópia efêmera; a cópia publicada permanece intacta.
// Tetos de entrada e saída são independentes. A autorização é verificada pelo chamador.
import { inspecionarImagemVisao, LIMITES_IMAGEM_VISAO, validarEstruturaOriginal } from './imagemVisao'

export const TETO_ORIGINAL_VISAO = 12 * 1024 * 1024
export interface CodecImagemVisao {
  metadados(original: Buffer): Promise<{ largura?: number; altura?: number; formato?: string; paginas?: number }>
  converter(original: Buffer, largura: number, altura: number): Promise<Buffer>
}

export async function prepararImagemVisao(original: Buffer, codec?: CodecImagemVisao): Promise<Buffer> {
  if (!Buffer.isBuffer(original) || !original.length || original.length > TETO_ORIGINAL_VISAO) throw new Error('O original excede o limite de preparação. O arquivo foi preservado.')
  try {
    // Manter exatamente os bytes já aceitos evita reencodar fotografias pequenas.
    try { inspecionarImagemVisao(original); return original } catch { /* pode ser maior ou WebP */ }
    if (!codec) throw new Error('Preparação de imagem indisponível.')
    // Não entregar SVG, TIFF, HEIF ou qualquer outro formato ao decodificador nativo.
    const png = original.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
    const jpeg = original.length >= 4 && original[0] === 0xff && original[1] === 0xd8
    const webp = original.length >= 20 && original.toString('ascii', 0, 4) === 'RIFF' && original.toString('ascii', 8, 12) === 'WEBP' && original.readUInt32LE(4) + 8 === original.length
    if (!png && !jpeg && !webp) throw new Error('Formato não suportado.')
    const meta = await codec.metadados(original)
    if ((png && meta.formato !== 'png') || (jpeg && meta.formato !== 'jpeg') || (webp && meta.formato !== 'webp')) throw new Error('Formato incoerente.')
    if (!meta.largura || !meta.altura || !meta.formato || (meta.paginas ?? 1) !== 1) throw new Error('Formato não suportado.')
    validarEstruturaOriginal(original, meta.formato, meta.largura, meta.altura)
    const resultado = await codec.converter(original, LIMITES_IMAGEM_VISAO.largura, LIMITES_IMAGEM_VISAO.altura)
    // Uma cópia que não caiba nos tetos existentes nunca é enviada.
    inspecionarImagemVisao(resultado)
    return resultado
  } catch {
    throw new Error('Imagem inválida, animada ou acima do limite de preparação. O arquivo foi preservado e não foi enviado.')
  }
}
