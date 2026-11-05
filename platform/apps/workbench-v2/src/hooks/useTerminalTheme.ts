import { useEffect, useMemo, useState } from 'react'

export interface XtermTheme {
  background: string
  foreground: string
  cursor: string
  cursorAccent: string
  selectionBackground: string
  black: string
  red: string
  green: string
  yellow: string
  blue: string
  magenta: string
  cyan: string
  white: string
  brightBlack: string
  brightRed: string
  brightGreen: string
  brightYellow: string
  brightBlue: string
  brightMagenta: string
  brightCyan: string
  brightWhite: string
}

function readToken(name: string) {
  if (typeof document === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function getThemeMode(): 'dark' | 'light' {
  if (typeof document === 'undefined') return 'dark'
  return document.documentElement.classList.contains('theme-light') ? 'light' : 'dark'
}

function buildTerminalTheme(): XtermTheme {
  return {
    background: readToken('--vscode-terminal-background') || readToken('--vscode-panel-background') || '#1e1e1e',
    foreground: readToken('--vscode-terminal-foreground') || readToken('--vscode-foreground') || '#cccccc',
    cursor: readToken('--vscode-terminalCursor-foreground') || readToken('--vscode-terminal-foreground') || '#cccccc',
    cursorAccent: readToken('--vscode-terminalCursor-background') || '#000000',
    selectionBackground: readToken('--vscode-terminal-selectionBackground') || '#264f78',
    black: readToken('--vscode-terminal-ansiBlack') || '#000000',
    red: readToken('--vscode-terminal-ansiRed') || '#cd3131',
    green: readToken('--vscode-terminal-ansiGreen') || '#0dbc79',
    yellow: readToken('--vscode-terminal-ansiYellow') || '#e5e510',
    blue: readToken('--vscode-terminal-ansiBlue') || '#2472c8',
    magenta: readToken('--vscode-terminal-ansiMagenta') || '#bc3fbc',
    cyan: readToken('--vscode-terminal-ansiCyan') || '#11a8cd',
    white: readToken('--vscode-terminal-ansiWhite') || '#e5e5e5',
    brightBlack: readToken('--vscode-terminal-ansiBrightBlack') || '#666666',
    brightRed: readToken('--vscode-terminal-ansiBrightRed') || '#f14c4c',
    brightGreen: readToken('--vscode-terminal-ansiBrightGreen') || '#23d18b',
    brightYellow: readToken('--vscode-terminal-ansiBrightYellow') || '#f5f543',
    brightBlue: readToken('--vscode-terminal-ansiBrightBlue') || '#3b8eea',
    brightMagenta: readToken('--vscode-terminal-ansiBrightMagenta') || '#d670d6',
    brightCyan: readToken('--vscode-terminal-ansiBrightCyan') || '#29b8db',
    brightWhite: readToken('--vscode-terminal-ansiBrightWhite') || '#e5e5e5',
  }
}

export function useTerminalTheme(): XtermTheme {
  const [mode, setMode] = useState<'dark' | 'light'>(() => getThemeMode())
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (typeof document === 'undefined') return

    const element = document.documentElement
    const observer = new MutationObserver(() => {
      const nextMode = getThemeMode()
      setMode((current) => (current === nextMode ? current : nextMode))
      // Força rebuild mesmo se mode não mudou, mas tokens mudaram (style attr)
      setVersion((v) => v + 1)
    })

    // BUG-03 FIX: observar class e style para tema reativo
    observer.observe(element, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] })

    // Listener custom para theme-changed event (se ThemeService disparar)
    const onThemeChanged = () => setVersion((v) => v + 1)
    window.addEventListener('theme-changed', onThemeChanged as EventListener)

    return () => {
      observer.disconnect()
      window.removeEventListener('theme-changed', onThemeChanged as EventListener)
    }
  }, [])

  return useMemo(() => buildTerminalTheme(), [mode, version])
}
