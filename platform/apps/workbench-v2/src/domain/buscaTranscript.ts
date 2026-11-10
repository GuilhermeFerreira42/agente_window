export const LIMITE_CONSULTA_TRANSCRIPT = 120

export interface HitTranscript {
  messageId: string
  sequence: number
  papel: 'user' | 'assistant'
  timestamp: number
  trecho: string
  offset: number
}

export interface BuscaTranscriptResult {
  hits: HitTranscript[]
  parcial: boolean
}
