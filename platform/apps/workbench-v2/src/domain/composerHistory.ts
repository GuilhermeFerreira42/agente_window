// ============================================================================
// domain/composerHistory.ts — Fatia 15, Onda 3 (D161).
//
// A regra do histórico do compositor. Ela existia DUAS vezes, com nomes
// diferentes e código idêntico:
//   • `App.tsx`      → `sameComposerHistoryEntry` (+ uma constante nunca usada)
//   • `ChatInput.tsx`→ `historyEntriesEqual`      (+ `COMPOSER_HISTORY_MAX_ENTRIES`)
//
// Duplicata de REGRA é pior que duplicata de estilo: as duas cópias precisam
// concordar para sempre, e nada garantia isso. Aqui fica uma.
//
// A comparação ignora o `id` do anexo? NÃO — compara `id`, `name` e `kind`. É
// identidade do anexo, não do anexo "por nome": dois anexos com o mesmo nome e
// ids diferentes são entradas diferentes no histórico, e continuam sendo.
// ============================================================================
import type { ComposerHistoryEntry } from '../types'

/** Quantas entradas o histórico do compositor guarda. */
export const COMPOSER_HISTORY_MAX_ENTRIES = 40

/** Duas entradas de histórico são a MESMA entrada? (evita repetir ao reenviar) */
export function sameComposerHistoryEntry(
  left: ComposerHistoryEntry | undefined,
  right: ComposerHistoryEntry,
): boolean {
  if (!left || left.text !== right.text || left.model !== right.model || left.mode !== right.mode) return false
  return left.attachments.length === right.attachments.length && left.attachments.every((attachment, index) => {
    const other = right.attachments[index]
    return attachment.id === other.id && attachment.name === other.name && attachment.kind === other.kind
  })
}

/** Cópia defensiva de uma entrada (o texto/anexos do compositor são mutáveis). */
export function cloneComposerHistoryEntry(entry: ComposerHistoryEntry): ComposerHistoryEntry {
  return { ...entry, attachments: entry.attachments.map((attachment) => ({ ...attachment })) }
}
