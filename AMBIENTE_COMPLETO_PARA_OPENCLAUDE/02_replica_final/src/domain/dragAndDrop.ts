import type { EditorTab, Session } from '../types'

/**
 * Drag & drop mime identifiers, mirroring the original Agents window
 * (`sessions/browser/dnd.ts`: `SessionsDataTransfers`). Kept string-stable so
 * `dragover` gating can read `dataTransfer.types` before the drop.
 */
export const DragTypes = {
  /** A session row dragged within the sessions list. */
  SESSION: 'application/vnd.code.session',
  /** An editor tab dragged within the single editor group. */
  EDITOR_TAB: 'application/vnd.code.session.tab',
  /** A workspace file dragged onto the chat composer as an attachment. */
  FILE: 'application/vnd.code.session.file',
} as const

/**
 * Reorders an item within an array by moving `fromId` so that it lands at the
 * position currently held by `toId`. Returns a new array; the original is left
 * untouched. Unknown ids or a no-op move return the same reference so callers
 * can skip a state update.
 */
export function reorderById<T extends { id: string }>(items: readonly T[], fromId: string, toId: string): T[] | readonly T[] {
  if (fromId === toId) return items
  const fromIndex = items.findIndex((item) => item.id === fromId)
  const toIndex = items.findIndex((item) => item.id === toId)
  if (fromIndex < 0 || toIndex < 0) return items
  const next = items.slice()
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

/**
 * A session may only be reordered relative to another session that lives in the
 * same visible section — the original forbids crossing into archived/fixed
 * groups purely by drag position (`SESSIONS_LIST.md` §Drag and drop:
 * "sessions may reorder within valid sections"; "Archived and fixed sections
 * are not reorder targets").
 */
export function canReorderSessions(from: Session | undefined, to: Session | undefined): boolean {
  if (!from || !to || from.id === to.id) return false
  if (from.archived || to.archived) return false
  if (from.section === 'archived' || to.section === 'archived') return false
  return sessionGroupKey(from) === sessionGroupKey(to)
}

/** The pinned band is a single reorder group; otherwise the section is the group. */
export function sessionGroupKey(session: Session): string {
  if (session.pinned) return 'pinned'
  return session.section
}

/**
 * Reorders `sessions` so `fromId` takes `toId`'s slot, but only when the two
 * belong to the same reorder group. Otherwise the original array is returned.
 */
export function reorderSessions(sessions: readonly Session[], fromId: string, toId: string): Session[] | readonly Session[] {
  const from = sessions.find((session) => session.id === fromId)
  const to = sessions.find((session) => session.id === toId)
  if (!canReorderSessions(from, to)) return sessions
  return reorderById(sessions, fromId, toId)
}

/**
 * Reorders editor tabs within the single editor group. Both ids must belong to
 * the same session, since tabs are session-scoped in this replica.
 */
export function reorderEditorTabs(tabs: readonly EditorTab[], fromId: string, toId: string): EditorTab[] | readonly EditorTab[] {
  const from = tabs.find((tab) => tab.id === fromId)
  const to = tabs.find((tab) => tab.id === toId)
  if (!from || !to || from.sessionId !== to.sessionId) return tabs
  return reorderById(tabs, fromId, toId)
}

