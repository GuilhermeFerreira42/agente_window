import type { Session } from '../../types'
import { holdSessionPersistence } from './sessionsClient'

const RECOVERY_KEY = 'workbench.sessions.unsaved.v1'

export interface SessionRecovery {
  session: Session
  message: string
}

export function readSessionRecoveries(): SessionRecovery[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(RECOVERY_KEY) ?? '[]')
    if (!Array.isArray(value)) return []
    return value.filter((item): item is SessionRecovery => typeof item?.session?.id === 'string'
      && Array.isArray(item.session.chats) && typeof item.message === 'string')
  } catch { return [] }
}

/** Returns false on quota/privacy failure; the UI must keep the live snapshot. */
export function storeSessionRecovery(recovery: SessionRecovery): boolean {
  try {
    const records = readSessionRecoveries().filter((item) => item.session.id !== recovery.session.id)
    localStorage.setItem(RECOVERY_KEY, JSON.stringify([...records, recovery]))
    return true
  } catch { return false }
}

export function removeSessionRecovery(id: string): void {
  const records = readSessionRecoveries().filter((item) => item.session.id !== id)
  // Do not silently claim the recovery is gone if storage is unavailable.
  localStorage.setItem(RECOVERY_KEY, JSON.stringify(records))
}

export function restoreUnsavedSessions(saved: Session[]): Session[] {
  const recoveries = readSessionRecoveries().map(({ session, message }) => ({ message, session: {
    ...session,
    status: session.status === 'working' ? 'completed' as const : session.status,
    chats: session.chats.map((chat) => ({
      ...chat, status: chat.status === 'working' ? 'completed' as const : chat.status,
      messages: chat.messages.map((item) => item.running ? { ...item, running: false, cancelled: true } : item),
    })),
  } }))
  for (const { session } of recoveries) holdSessionPersistence(session.id)
  const local = new Map(recoveries.map(({ session }) => [session.id, session]))
  return [...saved.map((session) => local.get(session.id) ?? session),
    ...recoveries.filter(({ session }) => !saved.some((item) => item.id === session.id)).map(({ session }) => session)]
}

export function createRecoveryCopy(session: Session): Session {
  const now = Date.now()
  return {
    ...session, id: `recovered-${crypto.randomUUID()}`,
    title: `${session.title} (recovered copy)`, persistenceRevision: 0,
    // A recovery never acquires ownership of the original managed worktree.
    worktreePath: null, branch: null, isDraft: false, status: 'completed',
    createdSeq: now, updatedSeq: now,
  }
}
