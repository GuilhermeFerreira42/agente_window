/** MC1: consulta explícita, independente da recuperação M6 do chat atual. */
export const FERRAMENTAS_ENTRE_CHATS = ['buscar_chats', 'buscar_mensagens_chat', 'ler_trecho_chat'] as const
export type FerramentaEntreChats = typeof FERRAMENTAS_ENTRE_CHATS[number]
export type StatusEntreChats = 'ok' | 'partial' | 'not_found' | 'ambiguous' | 'forbidden' | 'scope_unverifiable' | 'source_deleted' | 'too_large'
export interface FonteEntreChats {
  referencia: string
  sessionId: string
  chatId: string
  messageId: string
  title: string
  timestamp: number
}
export interface EscolhaEntreChats { referencia: string; title: string; updatedAt: number }
export interface ContextoEntreChats { sessionId: string; chatId: string; raiz: string }
export interface PedidoEntreChats {
  ferramenta: FerramentaEntreChats
  argumentos: { consulta?: unknown; referencia?: unknown; antes?: unknown; depois?: unknown; apos?: unknown; ate?: unknown }
}
export interface ResultadoEntreChats {
  status: StatusEntreChats
  results: Array<Record<string, unknown>>
  partial: boolean
  sources: FonteEntreChats[]
  escolhas?: EscolhaEntreChats[]
  perguntaHumana?: string
  reason?: string
  aviso: string
}
export const LIMITES_ENTRE_CHATS = { consulta: 120, candidatos: 10, hits: 5, trecho: 400, vizinhanca: 3,
  chamadas: 8, respostaBytes: 12 * 1024, totalBytes: 24 * 1024, sessoes: 200, fonteBytes: 16 * 1024 * 1024,
  leituraAgregadaBytes: 8 * 1024 * 1024, tempoMs: 750 } as const
export const normalizarTitulo = (s: string) => s.normalize('NFC').toLocaleLowerCase('pt-BR').trim().replace(/\s+/gu, ' ')
/** Accent-tolerant fallback for titles; preserves the displayed title and the strict first match. */
export const normalizarBuscaHistorica = (s: string) => normalizarTitulo(s).normalize('NFD').replace(/\p{M}/gu, '')
/** Lexical only: exact phrase first, then meaningful literal terms; never invent synonyms. */
export function correspondenciaHistorica(texto: string, consulta: string): { score: number; pos: number } {
  const corpo = normalizarTitulo(texto), query = normalizarTitulo(consulta), exata = corpo.indexOf(query)
  if (exata >= 0) return { score: 1000, pos: exata }
  const ignorar = new Set(['para', 'pela', 'pelo', 'sobre', 'como', 'qual', 'quais', 'onde', 'quando', 'deste', 'dessa', 'desse', 'essa', 'esse', 'esta', 'este', 'foi', 'foram', 'uma', 'que', 'sua', 'seu', 'dos', 'das', 'com', 'chat', 'conversa', 'encontre', 'busque'])
  const termos = [...new Set(query.match(/[\p{L}\p{N}_-]{3,}/gu) ?? [])].filter(t => !ignorar.has(t))
  const ocorrencias = termos.map(t => corpo.indexOf(t)).filter(p => p >= 0)
  return { score: ocorrencias.length, pos: ocorrencias.length ? Math.min(...ocorrencias) : -1 }
}
export const idHistoricoValido = (id: unknown): id is string => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,200}$/u.test(id)

/** Só a mensagem humana atual habilita MC1; nunca um trecho recuperado. */
export function pedidoHumanoEntreChats(texto: string): boolean {
  if (/^\/chats\s+\S/iu.test(texto.trim())) return true
  const s = normalizarTitulo(texto)
  if (s.length > 12000 || /^(?:["'`]|explique\b|exemplo\b|traduza\b|repita\b|como\b|o que é\b)/u.test(s) ||
      /\b(?:não|nao|nunca|not|never|don't)\b[^.!?]{0,80}\b(?:consulte|recupere|busque|leia|acesse|search|read|recover)\b[^.!?]{0,60}\b(?:chats?|conversas?|sessão|sessões|histórico)\b/u.test(s)) return false
  const inicio = s.slice(0, s.search(/\b(?:chats?|conversas?|sessões|sessão)\b/u))
  if (/\b(?:arquivo|documento|código|exemplo|instrução|instruções)\b/u.test(inicio)) return false
  return /^(?:por favor[, ]+)?(?:recupere|busque|consulte|procure|encontre|leia|search|find|recover)\b/u.test(s) &&
    /\b(?:outros? chats?|conversas? anteriores?|chats? anteriores?|chat\s+(?!atual\b)\S+|conversa\s+(?!atual\b)\S+)\b/u.test(s) ||
    /^(?:no|na|em um|em uma)\s+(?:chat|conversa|sessão)\s+(?!atual\b)\S[\s\S]*\b(?:o que|quais|qual|decidimos|decisões)\b/u.test(s)
}
