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

const START_PORT = 7681
const MAX_PORT = 7699

async function discoverPtyPort(): Promise<number> {
  for (let port = START_PORT; port <= MAX_PORT; port++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 400)
    try {
      const res = await fetch(`http://127.0.0.1:${port}/pty-port`, {
        signal: controller.signal
      })
      if (res.ok) {
        const data = await res.json()
        if (typeof data.port === 'number') {
          return data.port
        }
      }
    } catch {
      // Continue searching next port
    } finally {
      clearTimeout(timeoutId)
    }
  }
  throw new Error(
    `pty-server não encontrado no intervalo de portas ${START_PORT}-${MAX_PORT}. Inicie o servidor com: cd pty-server && npm start`
  )
}

export function usePtySession({
  sessionId,
  cols = 80,
  rows = 24,
  shellId,
  enabled = true
}: UsePtySessionOptions) {
  const [status, setStatus] = useState<PtyStatus>('connecting')
  const [lastError, setLastError] = useState<PtyError | undefined>()
  const [availableProfiles, setAvailableProfiles] = useState<ShellProfile[]>([])
  const [activeProfile, setActiveProfile] = useState<ShellProfile | undefined>()
  const [pid, setPid] = useState<number | undefined>()

  const wsRef = useRef<WebSocket | null>(null)
  const outputListeners = useRef<Set<(data: string) => void>>(new Set())
  const dimensionsRef = useRef({ cols, rows })
  dimensionsRef.current = { cols, rows }

  const sendInput = useCallback(
    (data: string) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'input', sessionId, data }))
      }
    },
    [sessionId]
  )

  const sendResize = useCallback(
    (newCols: number, newRows: number) => {
      dimensionsRef.current = { cols: newCols, rows: newRows }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'resize',
            sessionId,
            cols: newCols,
            rows: newRows
          })
        )
      }
    },
    [sessionId]
  )

  const closeSession = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'close', sessionId }))
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setStatus('closed')
  }, [sessionId])

  const onOutput = useCallback((callback: (data: string) => void) => {
    outputListeners.current.add(callback)
    return () => {
      outputListeners.current.delete(callback)
    }
  }, [])

  useEffect(() => {
    if (!enabled || !sessionId) return

    let isSubscribed = true
    setStatus('connecting')
    setLastError(undefined)

    let currentWs: WebSocket | null = null

    async function initConnection() {
      try {
        const port = await discoverPtyPort()
        if (!isSubscribed) return

        const ws = new WebSocket(`ws://127.0.0.1:${port}`)
        currentWs = ws
        wsRef.current = ws

        ws.onopen = () => {
          if (!isSubscribed) {
            ws.close()
            return
          }
          ws.send(
            JSON.stringify({
              type: 'open',
              sessionId,
              cols: dimensionsRef.current.cols,
              rows: dimensionsRef.current.rows,
              shellId
            })
          )
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
                  const current = msg.availableProfiles.find(
                    (p: ShellProfile) => p.id === msg.shell || p.path === msg.shellPath
                  ) || {
                    id: msg.shell,
                    label: msg.shell,
                    path: msg.shellPath
                  }
                  setActiveProfile(current)
                }
                break
              }
              case 'output': {
                if (typeof msg.data === 'string') {
                  for (const listener of outputListeners.current) {
                    listener(msg.data)
                  }
                }
                break
              }
              case 'exit': {
                setStatus('closed')
                break
              }
              case 'error': {
                setStatus('error')
                setLastError({ code: msg.code, message: msg.message })
                for (const listener of outputListeners.current) {
                  listener(`\r\n\x1b[31m[PTY Error] ${msg.message}\x1b[0m\r\n`)
                }
                break
              }
            }
          } catch (e) {
            console.error('[usePtySession] Error parsing message:', e)
          }
        }

        ws.onerror = () => {
          if (!isSubscribed) return
          setStatus('error')
          const err: PtyError = {
            code: 'WS_ERROR',
            message: 'Erro de comunicação WebSocket com pty-server'
          }
          setLastError(err)
        }

        ws.onclose = () => {
          if (!isSubscribed) return
          setStatus('closed')
        }
      } catch (err: any) {
        if (!isSubscribed) return
        setStatus('error')
        const ptyErr: PtyError = {
          code: 'DISCOVERY_FAILED',
          message: err.message || 'Falha ao conectar com o servidor PTY'
        }
        setLastError(ptyErr)
        for (const listener of outputListeners.current) {
          listener(`\r\n\x1b[31m[PTY Error] ${ptyErr.message}\x1b[0m\r\n`)
        }
      }
    }

    initConnection()

    return () => {
      isSubscribed = false
      if (currentWs && currentWs.readyState === WebSocket.OPEN) {
        try {
          currentWs.send(JSON.stringify({ type: 'close', sessionId }))
          currentWs.close()
        } catch {
          // ignore
        }
      }
      wsRef.current = null
    }
  }, [sessionId, shellId, enabled])

  return {
    status,
    pid,
    activeProfile,
    availableProfiles,
    lastError,
    sendInput,
    sendResize,
    closeSession,
    onOutput
  }
}
