import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useTerminalTheme } from '../hooks/useTerminalTheme'

function installThemeFixture() {
  const style = document.createElement('style')
  style.textContent = `
    :root {
      --vscode-terminal-background: #1e1e1e;
      --vscode-terminal-foreground: #cccccc;
      --vscode-terminalCursor-foreground: #cccccc;
      --vscode-terminalCursor-background: #000000;
      --vscode-terminal-selectionBackground: #264f78;
      --vscode-terminal-ansiBlack: #000000;
      --vscode-terminal-ansiRed: #cd3131;
      --vscode-terminal-ansiGreen: #0dbc79;
      --vscode-terminal-ansiYellow: #e5e510;
      --vscode-terminal-ansiBlue: #2472c8;
      --vscode-terminal-ansiMagenta: #bc3fbc;
      --vscode-terminal-ansiCyan: #11a8cd;
      --vscode-terminal-ansiWhite: #e5e5e5;
      --vscode-terminal-ansiBrightBlack: #666666;
      --vscode-terminal-ansiBrightRed: #f14c4c;
      --vscode-terminal-ansiBrightGreen: #23d18b;
      --vscode-terminal-ansiBrightYellow: #f5f543;
      --vscode-terminal-ansiBrightBlue: #3b8eea;
      --vscode-terminal-ansiBrightMagenta: #d670d6;
      --vscode-terminal-ansiBrightCyan: #29b8db;
      --vscode-terminal-ansiBrightWhite: #e5e5e5;
    }
    .theme-light {
      --vscode-terminal-background: #ffffff;
      --vscode-terminal-foreground: #333333;
      --vscode-terminalCursor-foreground: #333333;
      --vscode-terminalCursor-background: #ffffff;
      --vscode-terminal-selectionBackground: #add6ff;
      --vscode-terminal-ansiGreen: #00bc00;
      --vscode-terminal-ansiBrightWhite: #a5a5a5;
    }
  `
  document.head.appendChild(style)
  return style
}

describe('useTerminalTheme', () => {
  let style: HTMLStyleElement
  const observers: Array<(records: MutationRecord[], observer: MutationObserver) => void> = []

  beforeEach(() => {
    observers.length = 0
    vi.stubGlobal('MutationObserver', class {
      private readonly callback: (records: MutationRecord[], observer: MutationObserver) => void

      constructor(callback: (records: MutationRecord[], observer: MutationObserver) => void) {
        this.callback = callback
        observers.push(callback)
      }

      observe() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    })
    document.documentElement.className = ''
    style = installThemeFixture()
  })

  afterEach(() => {
    style.remove()
    document.documentElement.className = ''
    document.documentElement.removeAttribute('style')
    vi.unstubAllGlobals()
  })

  it('lê tokens dark/light e reage à troca de classe theme-light', async () => {
    const { result } = renderHook(() => useTerminalTheme())

    expect(result.current.background).toBe('#1e1e1e')
    expect(result.current.foreground).toBe('#cccccc')

    await act(async () => {
      document.documentElement.classList.add('theme-light')
      for (const notify of observers) {
        notify([], {} as MutationObserver)
      }
    })

    await waitFor(() => {
      expect(result.current.background).toBe('#ffffff')
    })
    expect(result.current.foreground).toBe('#333333')
    expect(result.current.green).toBe('#00bc00')
    expect(result.current.brightWhite).toBe('#a5a5a5')
  })

  it('usa fallbacks quando tokens do terminal estão ausentes', () => {
    style.remove()
    const { result } = renderHook(() => useTerminalTheme())

    expect(result.current.background).toBe('#1e1e1e')
    expect(result.current.foreground).toBe('#cccccc')
    expect(result.current.cursor).toBe('#cccccc')
    expect(result.current.green).toBe('#0dbc79')
    expect(result.current.brightBlue).toBe('#3b8eea')
  })
})
