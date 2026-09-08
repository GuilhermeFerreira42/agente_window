import { useCallback, useEffect, useRef, useState } from 'react'

export interface ShellProfile {
  id: string
  label: string
  path: string
}

export type PtyStatus = 'connecting' | 'open' | 'error' | 'closed'

export interface PtyError {
  code: string
  message: string
}

interface UsePtySessionOptions {
  sessionId: string
  cols?: number
  rows?: number
  shellId?: string
  enabled?: boolean
}

const OUTPUT_BUFFER_LIMIT = 1024 * 1024

type OutputListener = (data: string) => void

declare global {
  interface Window {
    __AGENTS_WINDOW_PTY_URL__?: string
  }
}

function resolvePtyWebSocketUrl(): string {
  if (typeof window !== 'undefined' && typeof window.__AGENTS_WINDOW_PTY_URL__ === 'string') {
    const override = window.__AGENTS_WINDOW_PTY_URL__.trim()
    if (override.length > 0) {
      return override
    }
  }

  if (typeof window !== 'undefined' && window.location?.host) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/pty`
  }

  return 'ws://localhost:5173/pty'
}

function appendBufferedOutput(current: string, chunk: string): string {
  const combined = current + chunk
  if (combined.length <= OUTPUT_BUFFER_LIMIT) return combined
  return combined.slice(-OUTPUT_BUFFER_LIMIT)
}

export function usePtySession({
  sessionId,
  cols = 80,
  rows = 24,
  shellId,
  enabled = true,
}: UsePtySessionOptions) {
  const [status, setStatus] = useState<PtyStatus>('connecting')
  const [lastError, setLastError] = useState<PtyError | undefined>()
  const [availableProfiles, setAvailableProfiles] = useState<ShellProfile[]>([])
  const [activeProfile, setActiveProfile] = useState<ShellProfile | undefined>()
  const [pid, setPid] = useState<number | undefined>()

  const wsRef = useRef<WebSocket | null>(null)
  const outputListeners = useRef<Set<OutputListener>>(new Set())
  const outputBuffer = useRef('')
  const dimensionsRef = useRef({ cols, rows })
  dimensionsRef.current = { cols, rows }

  const emitOutput = useCallback((data: string) => {
    outputBuffer.current = appendBufferedOutput(outputBuffer.current, data)
    for (const listener of outputListeners.current) {
      listener(data)
    }
  }, [])

  const sendInput = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'input', sessionId, data }))
    }
  }, [sessionId])

  const sendResize = useCallback((newCols: number, newRows: number) => {
    dimensionsRef.current = { cols: newCols, rows: newRows }
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'resize',
        sessionId,
        cols: newCols,
        rows: newRows,
      }))
    }
  }, [sessionId])

  const closeSession = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'close', sessionId }))
    }
    wsRef.current?.close()
    wsRef.current = null
    setStatus('closed')
  }, [sessionId])

  const onOutput = useCallback((callback: OutputListener) => {
    if (outputBuffer.current) {
      callback(outputBuffer.current)
    }
    outputListeners.current.add(callback)
    return () => {
      outputListeners.current.delete(callback)
    }
  }, [])

  useEffect(() => {
    if (!enabled || !sessionId) return

    let isSubscribed = true
    let currentWs: WebSocket | null = null

    setStatus('connecting')
    setLastError(undefined)

    async function initConnection() {
      try {
        const wsUrl = resolvePtyWebSocketUrl()
        if (!isSubscribed) return

        const ws = new WebSocket(wsUrl)
        currentWs = ws
        wsRef.current = ws

        ws.onopen = () => {
          if (!isSubscribed) {
            ws.close()
            return
          }
          ws.send(JSON.stringify({
            type: 'open',
            sessionId,
            cols: dimensionsRef.current.cols,
            rows: dimensionsRef.current.rows,
            shellId,
          }))
        }

        ws.onmessage = (event) => {
          if (!isSubscribed) return

          try {
            const msg = JSON.parse(event.data)
            if (msg.sessionId && msg.sessionId !== sessionId) return

            switch (msg.type) {
              case 'opened': {
                setStatus('open')
                setPid(msg.pid)
                if (Array.isArray(msg.availableProfiles)) {
                  setAvailableProfiles(msg.availableProfiles)
                  const currentProfile = msg.availableProfiles.find(
                    (profile: ShellProfile) => profile.id === msg.shell || profile.path === msg.shellPath
                  ) ?? {
                    id: msg.shell,
                    label: msg.shell,
                    path: msg.shellPath,
                  }
                  setActiveProfile(currentProfile)
                }
                if (typeof msg.scrollback === 'string' && msg.scrollback.length > 0 && outputBuffer.current.length === 0) {
                  emitOutput(msg.scrollback)
                }
                break
              }
              case 'output': {
                if (typeof msg.data === 'string') {
                  emitOutput(msg.data)
                }
                break
              }
              case 'exit': {
                setStatus('closed')
                break
              }
              case 'error': {
                const ptyErr: PtyError = {
                  code: msg.code,
                  message: msg.message,
                }
                setStatus('error')
                setLastError(ptyErr)
                emitOutput(`\r\n\x1b[31m[PTY Error] ${ptyErr.message}\x1b[0m\r\n`)
                break
              }
            }
          } catch (error) {
            console.error('[usePtySession] Error parsing message:', error)
          }
        }

        ws.onerror = () => {
          if (!isSubscribed) return
          const err: PtyError = {
            code: 'WS_ERROR',
            message: 'Erro de comunicação WebSocket com o terminal integrado',
          }
          setStatus('error')
          setLastError(err)
          emitOutput(`\r\n\x1b[31m[PTY Error] ${err.message}\x1b[0m\r\n`)
        }

        ws.onclose = () => {
          if (!isSubscribed) return
          setStatus((currentStatus) => (currentStatus === 'error' ? currentStatus : 'closed'))
        }
      } catch (error: unknown) {
        if (!isSubscribed) return
        const ptyErr: PtyError = {
          code: 'WS_INIT_FAILED',
          message: error instanceof Error ? error.message : 'Falha ao conectar com o terminal integrado',
        }
        setStatus('error')
        setLastError(ptyErr)
        emitOutput(`\r\n\x1b[31m[PTY Error] ${ptyErr.message}\x1b[0m\r\n`)
      }
    }

    void initConnection()

    return () => {
      isSubscribed = false
      if (currentWs && currentWs.readyState !== WebSocket.CLOSED) {
        try {
          currentWs.close()
        } catch {
          // Ignore close errors during cleanup.
        }
      }
      if (wsRef.current === currentWs) {
        wsRef.current = null
      }
    }
  }, [sessionId, shellId, enabled, emitOutput])

  return {
    status,
    pid,
    activeProfile,
    availableProfiles,
    lastError,
    sendInput,
    sendResize,
    closeSession,
    onOutput,
  }
}
