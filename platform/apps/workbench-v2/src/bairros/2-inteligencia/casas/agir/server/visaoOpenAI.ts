// MM-I: representação do protocolo openai-chat. Este serializador não é uma
// autorização de envio nem um validador de imagem. O futuro chamador deve,
// ANTES de chamá-lo, verificar capacidade do alvo efetivo, consentimento,
// proprietário/publicação/integridade, formato real e todos os limites.
// Não recebe caminhos, URLs externas, identificadores de usuário ou segredos.
import { Buffer } from 'node:buffer'

export interface ImagemVisaoOpenAI {
  mime: 'image/png' | 'image/jpeg'
  bytes: Uint8Array
}

export type ParteVisaoOpenAI =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

/** Apenas formata bytes já verificados; não persiste nem transmite o resultado. */
export function partesVisaoOpenAI(texto: string, imagens: readonly ImagemVisaoOpenAI[]): ParteVisaoOpenAI[] {
  if (!Array.isArray(imagens) || imagens.length === 0) throw new Error('Nenhuma imagem para serializar.')
  const partes: ParteVisaoOpenAI[] = [{ type: 'text', text: texto }]
  for (const imagem of imagens) {
    if (!imagem || (imagem.mime !== 'image/png' && imagem.mime !== 'image/jpeg') || !(Buffer.isBuffer(imagem.bytes) || imagem.bytes instanceof Uint8Array) || imagem.bytes.byteLength === 0) {
      throw new Error('Imagem não compatível com o serializador.')
    }
    partes.push({ type: 'image_url', image_url: { url: `data:${imagem.mime};base64,${Buffer.from(imagem.bytes).toString('base64')}` } })
  }
  return partes
}
