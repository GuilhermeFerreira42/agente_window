import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '../../types'
import { loadPersistedSessions, persistSession, persistSessionNoUnload, resumeSessionPersistence, SessionPersistenceError } from './sessionsClient'
import { createRecoveryCopy, readSessionRecoveries, removeSessionRecovery, storeSessionRecovery } from './sessionRecovery'

interface PersistenceIssue {
  message: string
  backupAvailable: boolean
}

export interface SessionPersistenceIssue extends PersistenceIssue {
  session: Session
}

type Recovered = (copy: Session, source: Session, savedSource: Session | undefined) => void

export function useSessionPersistence(sessions: Session[], hydrated: boolean, onRecovered: Recovered) {
  const latest = useRef(sessions)
  latest.current = sessions
  const recoveredCallback = useRef(onRecovered)
  recoveredCallback.current = onRecovered
  const attempts = useRef(new Map<string, number>())
  const [issues, setIssues] = useState<Record<string, PersistenceIssue>>(() => Object.fromEntries(
    readSessionRecoveries().map(({ session, message }) => [session.id, { message, backupAvailable: true }]),
  ))
  const issuesRef = useRef(issues)
  const [recovering, setRecovering] = useState<string>()
  const recoveringRef = useRef(false)

  const recordFailure = useCallback((session: Session, error: unknown) => {
    const message = error instanceof SessionPersistenceError && error.code === 'stale_session_snapshot'
      ? 'A newer version is saved on the server. Your local changes have not been saved.'
      : 'Your changes could not be saved to the server.'
    const backupAvailable = storeSessionRecovery({ session, message })
    issuesRef.current = { ...issuesRef.current, [session.id]: { message, backupAvailable } }
    setIssues(issuesRef.current)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    // Keep a rejected conversation's latest LOCAL edits, including after F5.
    // Normal debounce and pagehide must not retry over a newer remote version.
    for (const session of sessions) {
      const issue = issuesRef.current[session.id]
      if (issue) {
        const backupAvailable = storeSessionRecovery({ session, message: issue.message })
        if (backupAvailable !== issue.backupAvailable) {
          issuesRef.current = { ...issuesRef.current, [session.id]: { ...issue, backupAvailable } }
          setIssues(issuesRef.current)
        }
      }
    }
    const timer = window.setTimeout(() => {
      for (const session of sessions.filter((item) => !item.isDraft && !issuesRef.current[item.id])) {
        const attempt = (attempts.current.get(session.id) ?? 0) + 1
        attempts.current.set(session.id, attempt)
        void persistSession(session).catch((error: unknown) => {
          if (attempts.current.get(session.id) !== attempt) return
          const local = latest.current.find((item) => item.id === session.id)
          if (local) recordFailure(local, error)
        })
      }
    }, 150)
    const unload = () => {
      for (const session of latest.current.filter((item) => !item.isDraft)) {
        const issue = issuesRef.current[session.id]
        if (issue) storeSessionRecovery({ session, message: issue.message })
        else persistSessionNoUnload(session)
      }
    }
    window.addEventListener('pagehide', unload)
    return () => { window.clearTimeout(timer); window.removeEventListener('pagehide', unload) }
  }, [sessions, hydrated, recordFailure])

  const recover = useCallback(async (sessionId: string) => {
    if (recoveringRef.current) return
    const source = latest.current.find((session) => session.id === sessionId)
    if (!source || source.chats.some((chat) => chat.messages.some((message) => message.running))) return
    recoveringRef.current = true
    setRecovering(sessionId)
    try {
      const copy = createRecoveryCopy(source)
      await persistSession(copy)
      const savedSource = (await loadPersistedSessions()).find((session) => session.id === source.id)
      // Never discard edits made while the recovery request was in flight.
      const current = latest.current.find((session) => session.id === source.id)
      if (JSON.stringify(current) === JSON.stringify(source)) {
        removeSessionRecovery(source.id)
        if (savedSource) resumeSessionPersistence(savedSource)
        const next = { ...issuesRef.current }
        delete next[source.id]
        issuesRef.current = next
        setIssues(next)
      }
      recoveredCallback.current(copy, source, savedSource)
    } catch {
      const current = latest.current.find((session) => session.id === sessionId)
      if (current) {
        const message = 'Recovery could not finish. Your local changes are still here. Try saving a separate copy again.'
        const backupAvailable = storeSessionRecovery({ session: current, message })
        issuesRef.current = { ...issuesRef.current, [sessionId]: { message, backupAvailable } }
        setIssues(issuesRef.current)
      }
    } finally { recoveringRef.current = false; setRecovering(undefined) }
  }, [])

  return {
    issues: sessions.filter((session) => issues[session.id]).map((session): SessionPersistenceIssue => ({ session, ...issues[session.id] })),
    recovering, recover,
  }
}
