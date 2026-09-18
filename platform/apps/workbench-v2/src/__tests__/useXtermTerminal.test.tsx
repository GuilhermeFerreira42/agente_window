import { useRef } from 'react'
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useXtermTerminal } from '../hooks/useXtermTerminal'
import type { XtermTheme } from '../hooks/useTerminalTheme'

const xtermMock = vi.hoisted(() => {
  class MockTerminal {
    static instances: MockTerminal[] = []
    cols = 80
    rows = 24
    options: { theme?: unknown }
    blur = vi.fn()
    clear = vi.fn()
    dispose = vi.fn()
    focus = vi.fn()
    loadAddon = vi.fn()
    open = vi.fn()
    refresh = vi.fn()
    attachCustomKeyEventHandler = vi.fn()
    dataHandlers: Array<(data: string) => void> = []
    onData = vi.fn((handler: (data: string) => void) => {
      this.dataHandlers.push(handler)
      return { dispose: vi.fn() }
    })

    constructor(options?: { theme?: unknown }) {
      this.options = { theme: options?.theme }
      MockTerminal.instances.push(this)
    }
  }

  return { MockTerminal }
})

const fitMock = vi.hoisted(() => ({ fit: vi.fn() }))

vi.mock('@xterm/xterm', () => ({ Terminal: xtermMock.MockTerminal }))
vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class {
    fit = fitMock.fit
  },
}))
vi.mock('@xterm/addon-web-links', () => ({ WebLinksAddon: class {} }))

const darkTheme: XtermTheme = {
  background: '#1e1e1e',
  foreground: '#cccccc',
  cursor: '#cccccc',
  cursorAccent: '#000000',
  selectionBackground: '#264f78',
  black: '#000000',
  red: '#cd3131',
  green: '#0dbc79',
  yellow: '#e5e510',
  blue: '#2472c8',
  magenta: '#bc3fbc',
  cyan: '#11a8cd',
  white: '#e5e5e5',
  brightBlack: '#666666',
  brightRed: '#f14c4c',
  brightGreen: '#23d18b',
  brightYellow: '#f5f543',
  brightBlue: '#3b8eea',
  brightMagenta: '#d670d6',
  brightCyan: '#29b8db',
  brightWhite: '#e5e5e5',
}

const lightTheme: XtermTheme = {
  ...darkTheme,
  background: '#ffffff',
  foreground: '#333333',
  cursor: '#333333',
  cursorAccent: '#ffffff',
  selectionBackground: '#add6ff',
}

function Harness({ theme }: { theme: XtermTheme }) {
  const ref = useRef<HTMLDivElement>(null)
  useXtermTerminal({
    containerRef: ref,
    sessionId: 'session-theme-test',
    session: {
      status: 'open',
      pid: 1234,
      activeProfile: { id: 'bash', label: 'Bash', path: '/bin/bash' },
      availableProfiles: [{ id: 'bash', label: 'Bash', path: '/bin/bash' }],
      lastError: undefined,
      sendInput: vi.fn(),
      sendResize: vi.fn(),
      closeSession: vi.fn(),
      clearOutputBuffer: vi.fn(),
      onOutput: vi.fn(() => () => {}),
    },
    enabled: true,
    active: true,
    theme,
  })

  return <div ref={ref} />
}

describe('useXtermTerminal', () => {
  beforeEach(() => {
    xtermMock.MockTerminal.instances.length = 0
    vi.clearAllMocks()
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
    })
  })

  it('reaplica o tema sem recriar a instância do xterm', () => {
    const view = render(<Harness theme={darkTheme} />)
    expect(xtermMock.MockTerminal.instances).toHaveLength(1)

    const instance = xtermMock.MockTerminal.instances[0]
    expect(instance.options.theme).toMatchObject({ background: '#1e1e1e' })

    view.rerender(<Harness theme={lightTheme} />)

    expect(xtermMock.MockTerminal.instances).toHaveLength(1)
    expect(instance.options.theme).toMatchObject({ background: '#ffffff', foreground: '#333333' })
    expect(instance.refresh).toHaveBeenCalled()
    expect(instance.dispose).not.toHaveBeenCalled()
  })
})
