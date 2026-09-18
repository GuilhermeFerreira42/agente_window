import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePtySession } from '../hooks/usePtySession'

class MockWebSocket {
  static instances: MockWebSocket[] = []
  static OPEN = 1
  static CLOSED = 3
  readyState = MockWebSocket.OPEN
  url: string
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  onclose: (() => void) | null = null
  send = vi.fn()
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) this.onclose()
  })

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
    setTimeout(() => {
      if (this.onopen) this.onopen()
    }, 10)
  }
}

describe('usePtySession', () => {
  beforeEach(() => {
    MockWebSocket.instances = []
    vi.stubGlobal('WebSocket', MockWebSocket)
    vi.stubGlobal('fetch', vi.fn())
    delete window.__AGENTS_WINDOW_PTY_URL__
    window.history.replaceState({}, '', '/')
  })

  afterEach(() => {
    delete window.__AGENTS_WINDOW_PTY_URL__
    vi.restoreAllMocks()
  })

  it('connects to the integrated /pty websocket without port discovery', async () => {
    const { result } = renderHook(() =>
      usePtySession({ sessionId: 'session-test-1' })
    )

    expect(result.current.status).toBe('connecting')

    await vi.waitFor(() => {
      expect(MockWebSocket.instances.length).toBe(1)
    })

    const ws = MockWebSocket.instances[0]
    expect(ws.url).toMatch(/^ws:\/\/localhost(?::\d+)?\/pty$/)
    expect(fetch).not.toHaveBeenCalled()

    act(() => {
      ws.onmessage?.({
        data: JSON.stringify({
          type: 'opened',
          sessionId: 'session-test-1',
          pid: 4567,
          shell: 'powershell',
          shellPath: 'powershell.exe',
          availableProfiles: [{ id: 'powershell', label: 'Windows PowerShell', path: 'powershell.exe' }],
        }),
      })
    })

    expect(result.current.status).toBe('open')
    expect(result.current.pid).toBe(4567)
    expect(result.current.activeProfile?.id).toBe('powershell')
  })

  it('uses an explicit websocket override when provided', async () => {
    window.__AGENTS_WINDOW_PTY_URL__ = 'wss://preview.example.dev/pty'

    renderHook(() => usePtySession({ sessionId: 'session-test-override' }))

    await vi.waitFor(() => {
      expect(MockWebSocket.instances.length).toBe(1)
    })

    expect(MockWebSocket.instances[0].url).toBe('wss://preview.example.dev/pty')
  })

  it('handles output messages and sends input', async () => {
    const { result } = renderHook(() =>
      usePtySession({ sessionId: 'session-test-2' })
    )

    await vi.waitFor(() => {
      expect(MockWebSocket.instances.length).toBe(1)
    })

    const ws = MockWebSocket.instances[0]
    const receivedOutput: string[] = []

    act(() => {
      result.current.onOutput((data) => {
        receivedOutput.push(data)
      })
    })

    act(() => {
      ws.onmessage?.({
        data: JSON.stringify({
          type: 'output',
          sessionId: 'session-test-2',
          data: 'hello from pty',
        }),
      })
    })

    expect(receivedOutput).toContain('hello from pty')

    act(() => {
      result.current.sendInput('dir\r')
    })

    expect(ws.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'input', sessionId: 'session-test-2', data: 'dir\r' })
    )
  })

  it('clears the buffered output for future listeners without touching the socket', async () => {
    const { result } = renderHook(() =>
      usePtySession({ sessionId: 'session-test-clear' })
    )

    await vi.waitFor(() => {
      expect(MockWebSocket.instances.length).toBe(1)
    })

    const ws = MockWebSocket.instances[0]
    const firstListener: string[] = []

    act(() => {
      result.current.onOutput((data) => {
        firstListener.push(data)
      })
    })

    act(() => {
      ws.onmessage?.({
        data: JSON.stringify({
          type: 'output',
          sessionId: 'session-test-clear',
          data: 'persist-me',
        }),
      })
    })

    expect(firstListener).toContain('persist-me')

    act(() => {
      result.current.clearOutputBuffer()
    })

    const replayedAfterClear: string[] = []
    act(() => {
      result.current.onOutput((data) => {
        replayedAfterClear.push(data)
      })
    })

    expect(replayedAfterClear).toEqual([])
    expect(ws.close).not.toHaveBeenCalled()
  })

  it('handles websocket failures and transitions to error state', async () => {
    const { result } = renderHook(() =>
      usePtySession({ sessionId: 'session-test-err' })
    )

    await vi.waitFor(() => {
      expect(MockWebSocket.instances.length).toBe(1)
    })

    act(() => {
      MockWebSocket.instances[0].onerror?.()
    })

    await vi.waitFor(
      () => {
        expect(result.current.status).toBe('error')
      },
      { timeout: 3000 }
    )

    expect(result.current.lastError?.code).toBe('WS_ERROR')
  })
})
