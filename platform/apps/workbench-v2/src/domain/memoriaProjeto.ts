export const TIPOS_MEMORIA = ['decisao', 'fato', 'preferencia'] as const
export type TipoMemoria = typeof TIPOS_MEMORIA[number]
export const LIMITE_CONTEUDO_MEMORIA = 1600
export const LIMITE_MOTIVO_MEMORIA = 240

export interface MemoriaProjeto {
  id: string
  revisao: number
  tipo: TipoMemoria
  conteudo: string
  motivo: string
  criadaEm: number
  vigente: boolean
  origem: { sessionId: string; chatId: string; messageId?: string }
  origemDisponivel?: boolean
}

/** Detecta formatos reconhecíveis. A confirmação humana continua obrigatória. */
export function pareceCredencial(texto: string): boolean {
  return /-----BEGIN [A-Z ]*PRIVATE KEY-----|\bsk-[\w-]{12,}|\b(?:gh[pousr]_[a-z0-9]{16,}|AKIA[A-Z0-9]{16})\b|\bBearer\s+[\w.+/=-]{8,}|\b(?:api[_ -]?key|token|secret|senha|password)\s*[:=]\s*\S{4,}|https?:\/\/[^\s/@]+:[^\s/@]+@/iu.test(texto)
}
