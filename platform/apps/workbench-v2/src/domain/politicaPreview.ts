// ============================================================================
// C-3b — Política de preview passivo (classificação por BYTES, não por claim).
//
// Problema concreto: upload declara `mime` e nome, mas nenhum dos dois prova o
// formato. Servir `Content-Type: image/png` porque o cliente disse "image/png"
// é confiar no atacante. Aqui a decisão vem de assinatura de bytes conhecida.
//
// Escopo desta política é só APRESENTAÇÃO. NÃO é whitelist de upload: a C-3a
// continua guardando qualquer formato (G2). Formato fora da política = 415 na
// rota de mídia, com download intacto.
//
// Puro: sem IO, sem React/Node, sem relógio. A leitura do cabeçalho é feita
// pelo chamador (máximo `BYTES_SONDA`), nunca o arquivo inteiro.
// ============================================================================

import type { Modalidade } from './multimodal/contrato'

/** Quantos bytes a política precisa para decidir. Limite duro de leitura. */
export const BYTES_SONDA = 64

export type TipoPreview = 'imagem' | 'audio' | 'video'

export type ClassificacaoPreview =
  | { ok: true; tipo: TipoPreview; mime: string; modalidade: Modalidade }
  | { ok: false; motivo: 'formato_nao_exibivel' | 'bytes_insuficientes' | 'assinatura_invalida' }

function falha(motivo: 'formato_nao_exibivel' | 'bytes_insuficientes' | 'assinatura_invalida'): ClassificacaoPreview {
  return { ok: false, motivo }
}

function comeca(buf: Uint8Array, assinatura: readonly number[], em = 0): boolean {
  if (buf.length < em + assinatura.length) return false
  for (let i = 0; i < assinatura.length; i += 1) if (buf[em + i] !== assinatura[i]) return false
  return true
}

function ascii(buf: Uint8Array, em: number, tamanho: number): string {
  if (buf.length < em + tamanho) return ''
  let saida = ''
  for (let i = 0; i < tamanho; i += 1) saida += String.fromCharCode(buf[em + i])
  return saida
}

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const JPEG = [0xff, 0xd8, 0xff]
const GIF87 = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]
const GIF89 = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]
const RIFF = [0x52, 0x49, 0x46, 0x46]
const WEBP = [0x57, 0x45, 0x42, 0x50]
const WAVE = [0x57, 0x41, 0x56, 0x45]
const EBML = [0x1a, 0x45, 0xdf, 0xa3]
const ID3 = [0x49, 0x44, 0x33]

/** Contêiner WebM: EBML + DocType "webm" nos primeiros bytes. */
function ehWebM(buf: Uint8Array): boolean {
  if (!comeca(buf, EBML)) return false
  return ascii(buf, 0, Math.min(buf.length, BYTES_SONDA)).includes('webm')
}

/** Ogg: contêiner de áudio (Vorbis/Opus) — aceito só como áudio. */
function ehOgg(buf: Uint8Array): boolean {
  return ascii(buf, 0, 4) === 'OggS'
}

/**
 * Classifica bytes de cabeçalho. `undefined`/vazio = bytes insuficientes
 * (estado honesto: não é "formato desconhecido", é "não deu para ver").
 *
 * Formatos deliberadamente fora: SVG/HTML/XML (seriam documentos ativos),
 * PDF (sem preview nesta fatia), EXE/ZIP/Office — todos caem em
 * `formato_nao_exibivel` e continuam baixáveis.
 */
export function classificarPreview(bytes: Uint8Array | undefined): ClassificacaoPreview {
  if (!bytes || bytes.length === 0) return falha('bytes_insuficientes')

  if (comeca(bytes, PNG)) return { ok: true, tipo: 'imagem', mime: 'image/png', modalidade: 'imagem' }
  if (comeca(bytes, JPEG)) return { ok: true, tipo: 'imagem', mime: 'image/jpeg', modalidade: 'imagem' }
  if (comeca(bytes, GIF87) || comeca(bytes, GIF89)) {
    return { ok: true, tipo: 'imagem', mime: 'image/gif', modalidade: 'imagem' }
  }
  // RIFF....WEBP — precisa do "WEBP" no offset 8 para não aceitar WAV/AVI.
  if (comeca(bytes, RIFF) && comeca(bytes, WEBP, 8)) {
    return { ok: true, tipo: 'imagem', mime: 'image/webp', modalidade: 'imagem' }
  }
  // RIFF....WAVE — áudio PCM/float.
  if (comeca(bytes, RIFF) && comeca(bytes, WAVE, 8)) {
    return { ok: true, tipo: 'audio', mime: 'audio/wav', modalidade: 'audio' }
  }
  if (ehWebM(bytes)) return { ok: true, tipo: 'video', mime: 'video/webm', modalidade: 'video' }
  if (ehOgg(bytes)) return { ok: true, tipo: 'audio', mime: 'audio/ogg', modalidade: 'audio' }
  // MP3: ID3 tag ou frame sync 0xFFEx.
  if (comeca(bytes, ID3)) return { ok: true, tipo: 'audio', mime: 'audio/mpeg', modalidade: 'audio' }
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    return { ok: true, tipo: 'audio', mime: 'audio/mpeg', modalidade: 'audio' }
  }

  // Tem bytes, mas nenhuma assinatura conhecida. Não é "insuficiente".
  return falha('formato_nao_exibivel')
}

/** Seleciona apenas o elemento nativo a tentar. O servidor valida os bytes e o MIME servido. */
export function sugerirPreviewPorNome(nome: string): ClassificacaoPreview {
  const extensao = /\.([^.]+)$/.exec(nome.toLowerCase())?.[1]
  switch (extensao) {
    case 'png': return { ok: true, tipo: 'imagem', modalidade: 'imagem', mime: 'image/png' }
    case 'jpg':
    case 'jpeg': return { ok: true, tipo: 'imagem', modalidade: 'imagem', mime: 'image/jpeg' }
    case 'gif': return { ok: true, tipo: 'imagem', modalidade: 'imagem', mime: 'image/gif' }
    case 'webp': return { ok: true, tipo: 'imagem', modalidade: 'imagem', mime: 'image/webp' }
    case 'wav': return { ok: true, tipo: 'audio', modalidade: 'audio', mime: 'audio/wav' }
    case 'ogg':
    case 'oga': return { ok: true, tipo: 'audio', modalidade: 'audio', mime: 'audio/ogg' }
    case 'mp3': return { ok: true, tipo: 'audio', modalidade: 'audio', mime: 'audio/mpeg' }
    case 'webm': return { ok: true, tipo: 'video', modalidade: 'video', mime: 'video/webm' }
    default: return falha('formato_nao_exibivel')
  }
}

/** Conveniência para a UI: tipo do card a partir da classificação. */
export function modalidadeDoPreview(classificacao: ClassificacaoPreview): Modalidade {
  return classificacao.ok ? classificacao.modalidade : 'arquivo'
}
