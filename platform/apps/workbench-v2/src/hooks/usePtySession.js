import { useCallback, useEffect, useRef, useState } from 'react';
const OUTPUT_BUFFER_LIMIT = 1024 * 1024;
function resolvePtyWebSocketUrl() {
    if (typeof window !== 'undefined' && typeof window.__AGENTS_WINDOW_PTY_URL__ === 'string') {
        const override = window.__AGENTS_WINDOW_PTY_URL__.trim();
        if (override.length > 0) {
            return override;
        }
    }
    if (typeof window !== 'undefined' && window.location?.host) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${window.location.host}/pty`;
    }
    return 'ws://localhost:5173/pty';
}
function appendBufferedOutput(current, chunk) {
    const combined = current + chunk;
    if (combined.length <= OUTPUT_BUFFER_LIMIT)
        return combined;
    return combined.slice(-OUTPUT_BUFFER_LIMIT);
}
export function usePtySession({ sessionId, cols = 80, rows = 24, shellId, enabled = true, }) {
    const [status, setStatus] = useState('connecting');
    const [lastError, setLastError] = useState();
    const [availableProfiles, setAvailableProfiles] = useState([]);
    const [activeProfile, setActiveProfile] = useState();
    const [pid, setPid] = useState();
    const wsRef = useRef(null);
    const outputListeners = useRef(new Set());
    const outputBuffer = useRef('');
    const dimensionsRef = useRef({ cols, rows });
    dimensionsRef.current = { cols, rows };
    const emitOutput = useCallback((data) => {
        outputBuffer.current = appendBufferedOutput(outputBuffer.current, data);
        for (const listener of outputListeners.current) {
            listener(data);
        }
    }, []);
    const clearOutputBuffer = useCallback(() => {
        outputBuffer.current = '';
    }, []);
    const sendInput = useCallback((data) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'input', sessionId, data }));
        }
    }, [sessionId]);
    const sendResize = useCallback((newCols, newRows) => {
        dimensionsRef.current = { cols: newCols, rows: newRows };
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'resize',
                sessionId,
                cols: newCols,
                rows: newRows,
            }));
        }
    }, [sessionId]);
    const closeSession = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'close', sessionId }));
        }
        wsRef.current?.close();
        wsRef.current = null;
        setStatus('closed');
    }, [sessionId]);
    const onOutput = useCallback((callback) => {
        if (outputBuffer.current) {
            callback(outputBuffer.current);
        }
        outputListeners.current.add(callback);
        return () => {
            outputListeners.current.delete(callback);
        };
    }, []);
    useEffect(() => {
        if (!enabled || !sessionId)
            return;
        let isSubscribed = true;
        let currentWs = null;
        setStatus('connecting');
        setLastError(undefined);
        async function initConnection() {
            try {
                const wsUrl = resolvePtyWebSocketUrl();
                if (!isSubscribed)
                    return;
                const ws = new WebSocket(wsUrl);
                currentWs = ws;
                wsRef.current = ws;
                ws.onopen = () => {
                    if (!isSubscribed) {
                        ws.close();
                        return;
                    }
                    ws.send(JSON.stringify({
                        type: 'open',
                        sessionId,
                        cols: dimensionsRef.current.cols,
                        rows: dimensionsRef.current.rows,
                        shellId,
                    }));
                };
                ws.onmessage = (event) => {
                    if (!isSubscribed)
                        return;
                    try {
                        const msg = JSON.parse(event.data);
                        if (msg.sessionId && msg.sessionId !== sessionId)
                            return;
                        switch (msg.type) {
                            case 'opened': {
                                setStatus('open');
                                setPid(msg.pid);
                                if (Array.isArray(msg.availableProfiles)) {
                                    setAvailableProfiles(msg.availableProfiles);
                                    const currentProfile = msg.availableProfiles.find((profile) => profile.id === msg.shell || profile.path === msg.shellPath) ?? {
                                        id: msg.shell,
                                        label: msg.shell,
                                        path: msg.shellPath,
                                    };
                                    setActiveProfile(currentProfile);
                                }
                                if (typeof msg.scrollback === 'string' && msg.scrollback.length > 0 && outputBuffer.current.length === 0) {
                                    emitOutput(msg.scrollback);
                                }
                                break;
                            }
                            case 'output': {
                                if (typeof msg.data === 'string') {
                                    emitOutput(msg.data);
                                }
                                break;
                            }
                            case 'exit': {
                                setStatus('closed');
                                break;
                            }
                            case 'error': {
                                const ptyErr = {
                                    code: msg.code,
                                    message: msg.message,
                                };
                                setStatus('error');
                                setLastError(ptyErr);
                                emitOutput(`\r\n\x1b[31m[PTY Error] ${ptyErr.message}\x1b[0m\r\n`);
                                break;
                            }
                        }
                    }
                    catch (error) {
                        console.error('[usePtySession] Error parsing message:', error);
                    }
                };
                ws.onerror = () => {
                    if (!isSubscribed)
                        return;
                    const err = {
                        code: 'WS_ERROR',
                        message: 'Erro de comunicação WebSocket com o terminal integrado',
                    };
                    setStatus('error');
                    setLastError(err);
                    emitOutput(`\r\n\x1b[31m[PTY Error] ${err.message}\x1b[0m\r\n`);
                };
                ws.onclose = () => {
                    if (!isSubscribed)
                        return;
                    setStatus((currentStatus) => (currentStatus === 'error' ? currentStatus : 'closed'));
                };
            }
            catch (error) {
                if (!isSubscribed)
                    return;
                const ptyErr = {
                    code: 'WS_INIT_FAILED',
                    message: error instanceof Error ? error.message : 'Falha ao conectar com o terminal integrado',
                };
                setStatus('error');
                setLastError(ptyErr);
                emitOutput(`\r\n\x1b[31m[PTY Error] ${ptyErr.message}\x1b[0m\r\n`);
            }
        }
        void initConnection();
        return () => {
            isSubscribed = false;
            if (currentWs && currentWs.readyState !== WebSocket.CLOSED) {
                try {
                    currentWs.close();
                }
                catch {
                    // Ignore close errors during cleanup.
                }
            }
            if (wsRef.current === currentWs) {
                wsRef.current = null;
            }
        };
    }, [sessionId, shellId, enabled, emitOutput]);
    return {
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
    };
}
//# sourceMappingURL=usePtySession.js.map