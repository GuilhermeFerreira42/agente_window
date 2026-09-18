import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePtySession } from '../hooks/usePtySession';
const TerminalSessionContext = createContext(null);
function PtySessionInstance({ sessionId, shellId, onStateChange, }) {
    const { status, pid, activeProfile, availableProfiles, lastError, sendInput, sendResize, closeSession, clearOutputBuffer, onOutput } = usePtySession({
        sessionId,
        shellId,
        enabled: true,
    });
    const stableSession = useMemo(() => ({
        status,
        pid,
        activeProfile,
        availableProfiles,
        lastError,
        sendInput,
        sendResize,
        closeSession,
        clearOutputBuffer,
        onOutput,
    }), [status, pid, activeProfile, availableProfiles, lastError, sendInput, sendResize, closeSession, clearOutputBuffer, onOutput]);
    useEffect(() => {
        onStateChange(sessionId, stableSession);
    }, [sessionId, stableSession, onStateChange]);
    return null;
}
export function TerminalSessionProvider({ children }) {
    const [sessions, setSessions] = useState({});
    const [activeSessionIds, setActiveSessionIds] = useState({});
    const updateSessionState = useCallback((id, state) => {
        setSessions((prev) => {
            if (prev[id] === state)
                return prev;
            return { ...prev, [id]: state };
        });
    }, []);
    const getOrCreateSession = useCallback((sessionId, shellId) => {
        setActiveSessionIds((prev) => {
            const existing = prev[sessionId];
            if (existing && existing.shellId === shellId)
                return prev;
            return { ...prev, [sessionId]: { shellId } };
        });
    }, []);
    const closeSession = useCallback((sessionId) => {
        const current = sessions[sessionId];
        current?.closeSession();
        setActiveSessionIds((prev) => {
            if (!prev[sessionId])
                return prev;
            const next = { ...prev };
            delete next[sessionId];
            return next;
        });
        setSessions((prev) => {
            if (!prev[sessionId])
                return prev;
            const next = { ...prev };
            delete next[sessionId];
            return next;
        });
    }, [sessions]);
    return (_jsxs(TerminalSessionContext.Provider, { value: { sessions, getOrCreateSession, closeSession }, children: [Object.entries(activeSessionIds).map(([id, config]) => (_jsx(PtySessionInstance, { sessionId: id, shellId: config.shellId, onStateChange: updateSessionState }, id))), children] }));
}
export function useTerminalSessions() {
    const context = useContext(TerminalSessionContext);
    if (!context)
        throw new Error('useTerminalSessions must be used within a TerminalSessionProvider');
    return context;
}
//# sourceMappingURL=TerminalSessionProvider.js.map