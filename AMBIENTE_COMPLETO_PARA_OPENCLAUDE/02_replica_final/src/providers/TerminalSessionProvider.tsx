import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { usePtySession, type PtyError, type PtyStatus, type ShellProfile } from '../hooks/usePtySession'

export interface PtySessionState {
  status: PtyStatus
  pid: number | undefined
  activeProfile: ShellProfile | undefined
  availableProfiles: ShellProfile[]
  lastError?: PtyError
  sendInput: (data: string) => void
  sendResize: (cols: number, rows: number) => void
  closeSession: () => void
  onOutput: (callback: (data: string) => void) => () => void
}

interface TerminalSessionContextType {
  sessions: Record<string, PtySessionState>
  getOrCreateSession: (sessionId: string, shellId?: string) => void
  closeSession: (sessionId: string) => void
}

const TerminalSessionContext = createContext<TerminalSessionContextType | null>(null)

function PtySessionInstance({
  sessionId,
  shellId,
  onStateChange,
}: {
  sessionId: string
  shellId?: string
  onStateChange: (id: string, state: PtySessionState) => void
}) {
  const { status, pid, activeProfile, availableProfiles, lastError, sendInput, sendResize, closeSession, onOutput } = usePtySession({
    sessionId,
    shellId,
    enabled: true,
  })

  const stableSession = useMemo<PtySessionState>(() => ({
    status,
    pid,
    activeProfile,
    availableProfiles,
    lastError,
    sendInput,
    sendResize,
    closeSession,
    onOutput,
  }), [status, pid, activeProfile, availableProfiles, lastError, sendInput, sendResize, closeSession, onOutput])

  useEffect(() => {
    onStateChange(sessionId, stableSession)
  }, [sessionId, stableSession, onStateChange])

  return null
}

export function TerminalSessionProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<Record<string, PtySessionState>>({})
  const [activeSessionIds, setActiveSessionIds] = useState<Record<string, { shellId?: string }>>({})

  const updateSessionState = useCallback((id: string, state: PtySessionState) => {
    setSessions((prev) => {
      if (prev[id] === state) return prev
      return { ...prev, [id]: state }
    })
  }, [])

  const getOrCreateSession = useCallback((sessionId: string, shellId?: string) => {
    setActiveSessionIds((prev) => {
      const existing = prev[sessionId]
      if (existing && existing.shellId === shellId) return prev
      return { ...prev, [sessionId]: { shellId } }
    })
  }, [])

  const closeSession = useCallback((sessionId: string) => {
    const current = sessions[sessionId]
    current?.closeSession()

    setActiveSessionIds((prev) => {
      if (!prev[sessionId]) return prev
      const next = { ...prev }
      delete next[sessionId]
      return next
    })

    setSessions((prev) => {
      if (!prev[sessionId]) return prev
      const next = { ...prev }
      delete next[sessionId]
      return next
    })
  }, [sessions])

  return (
    <TerminalSessionContext.Provider value={{ sessions, getOrCreateSession, closeSession }}>
      {Object.entries(activeSessionIds).map(([id, config]) => (
        <PtySessionInstance
          key={id}
          sessionId={id}
          shellId={config.shellId}
          onStateChange={updateSessionState}
        />
      ))}
      {children}
    </TerminalSessionContext.Provider>
  )
}

export function useTerminalSessions() {
  const context = useContext(TerminalSessionContext)
  if (!context) throw new Error('useTerminalSessions must be used within a TerminalSessionProvider')
  return context
}
