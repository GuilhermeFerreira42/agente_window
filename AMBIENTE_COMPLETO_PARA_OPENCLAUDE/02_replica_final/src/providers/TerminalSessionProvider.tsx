import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { usePtySession, type PtyStatus, type ShellProfile, type PtyError } from '../hooks/usePtySession';

interface PtySessionState {
  status: PtyStatus;
  pid: number | undefined;
  activeProfile: ShellProfile | undefined;
  availableProfiles: ShellProfile[];
  lastError?: PtyError;
  sendInput: (data: string) => void;
  sendResize: (cols: number, rows: number) => void;
  closeSession: () => void;
  onOutput: (callback: (data: string) => void) => () => void;
}

interface TerminalSessionContextType {
  sessions: Record<string, PtySessionState>;
  getOrCreateSession: (sessionId: string, shellId?: string) => void;
  closeSession: (sessionId: string) => void;
}

const TerminalSessionContext = createContext<TerminalSessionContextType | null>(null);

// Internal component that maintains the actual PTY hook for a specific session
function PtySessionInstance({
  sessionId,
  shellId,
  onStateChange
}: {
  sessionId: string;
  shellId?: string;
  onStateChange: (id: string, state: PtySessionState) => void
}) {
  const session = usePtySession({ sessionId, shellId, enabled: true });

  useEffect(() => {
    onStateChange(sessionId, session);
  }, [sessionId, session, onStateChange]);

  return null; // Invisible component
}

export function TerminalSessionProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<Record<string, PtySessionState>>({});
  const [activeSessionIds, setActiveSessionIds] = useState<Record<string, { shellId?: string }>>({});

  const updateSessionState = useCallback((id: string, state: PtySessionState) => {
    setSessions(prev => {
      if (prev[id] === state) return prev;
      return { ...prev, [id]: state };
    });
  }, []);

  const getOrCreateSession = useCallback((sessionId: string, shellId?: string) => {
    setActiveSessionIds(prev => {
      if (prev[sessionId]) return prev;
      return { ...prev, [sessionId]: { shellId } };
    });
  }, []);

  const closeSession = useCallback((sessionId: string) => {
    // First, let the hook handle closing if we have the state
    if (sessions[sessionId]?.closeSession) {
      sessions[sessionId].closeSession();
    }
    setActiveSessionIds(prev => {
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
    setSessions(prev => {
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
  }, [sessions]);

  return (
    <TerminalSessionContext.Provider value={{
      sessions,
      getOrCreateSession,
      closeSession
    }}>
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
  );
}

export function useTerminalSessions() {
  const context = useContext(TerminalSessionContext);
  if (!context) throw new Error('useTerminalSessions must be used within a TerminalSessionProvider');
  return context;
}
