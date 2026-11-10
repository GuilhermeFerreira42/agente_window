import { LIMITE_CONSULTA_TRANSCRIPT, type BuscaTranscriptResult } from '../../domain/buscaTranscript'
import type { ChatMessage } from '../../types'
import type { TranscriptEntry } from './transcripts'

const LIMITE_TEXTO = 2_000_000
const LIMITE_HITS = 40

export function buscarTranscript(entries: TranscriptEntry[], chatId: string, consulta: string): BuscaTranscriptResult {
  const hits: BuscaTranscriptResult['hits'] = []
  if (!consulta || consulta.length > LIMITE_CONSULTA_TRANSCRIPT) return { hits, parcial: false }
  const literal = new RegExp(consulta.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'iu')
  let sequence = 0
  let caracteres = 0
  for (const entry of entries) {
    if (entry.chatId !== chatId || (entry.type !== 'user' && entry.type !== 'assistant')) continue
    sequence += 1
    const item = entry.message as ChatMessage | null
    if (!item || typeof item.content !== 'string' || item.running || item.erro || item.cancelled) continue
    const disponivel = LIMITE_TEXTO - caracteres
    if (disponivel <= 0) return { hits, parcial: true }
    const texto = item.content.slice(0, disponivel)
    caracteres += texto.length
    const match = literal.exec(texto)
    if (match) {
      if (hits.length >= LIMITE_HITS) return { hits, parcial: true }
      const offset = match.index
      hits.push({ messageId: entry.uuid, sequence, papel: entry.type, timestamp: entry.timestamp, offset,
        trecho: texto.slice(Math.max(0, offset - 50), offset + match[0].length + 100) })
    }
    if (texto.length < item.content.length) return { hits, parcial: true }
  }
  return { hits, parcial: false }
}
