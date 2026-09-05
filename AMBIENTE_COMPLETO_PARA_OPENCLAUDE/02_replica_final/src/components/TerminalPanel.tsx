import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Columns2, Eraser, Minimize2, PanelBottomClose, Plus, TerminalSquare, X } from 'lucide-react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'

export interface TerminalSnapshot {
  lines: string[]
  cleared: boolean
}

interface TerminalPanelProps {
  visible: boolean
  sessionId: string
  sessionLabel?: string
  workspace: string
  snapshot?: TerminalSnapshot
  onSnapshot?: (sessionId: string, snapshot: TerminalSnapshot) => void
  onClose: () => void
}

type BottomTab = 'terminal' | 'output' | 'problems'

const SHELLS = ['bash', 'zsh', 'pwsh', 'fish'] as const
type Shell = (typeof SHELLS)[number]

const OUTPUT_LINES = [
  '[info] Iniciando tarefa: npm run build',
  '[info] vite v5 building for production...',
  '[info] transforming modules (1287)',
  '[info] rendering chunks...',
  '[info] dist/assets/index.js  1,088.61 kB │ gzip: 288.4 kB',
  '[info] ✓ built in 15.56s',
]

const PROBLEMS = [
  { severity: 'warning' as const, file: 'src/App.tsx', line: 480, message: 'Bloco maior que 500 kB após minificação.' },
  { severity: 'info' as const, file: 'src/components/EditorArea.tsx', line: 372, message: 'Considere memoizar visibleTabs.' },
]

function token(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function initialTerminalLines(workspace: string): string[] {
  return [
    `Agent Sessions terminal  ${workspace}`,
    '$ git status --short',
    ' M src/browser/parts/titlebarPart.ts',
    ' M src/contrib/sessions/browser/media/sessionsList.css',
    '?? src/contrib/browserView/browser/sessionBrowserView.ts',
    '$ npm run typecheck',
    '✓ No type errors found',
    '',
  ]
}

export function TerminalPanel({ visible, sessionId, sessionLabel, workspace, snapshot, onSnapshot, onClose }: TerminalPanelProps) {
  const terminalElement = useRef<HTMLDivElement>(null)
  const terminal = useRef<Terminal | null>(null)
  const fitAddon = useRef<FitAddon | null>(null)
  const outputLines = useRef<string[]>([])
  const onSnapshotRef = useRef(onSnapshot)
  const currentInput = useRef('')
  const commandHistory = useRef<string[]>([])
  const historyIndex = useRef(-1)
  const [maximized, setMaximized] = useState(false)
  const [activeTab, setActiveTab] = useState<BottomTab>('terminal')
  const [shell, setShell] = useState<Shell>('bash')
  const [shellMenuOpen, setShellMenuOpen] = useState(false)
  const [split, setSplit] = useState(false)
  const splitTerminalRef = useRef<HTMLDivElement>(null)
  const splitTerminalInstance = useRef<Terminal | null>(null)

  useEffect(() => {
    onSnapshotRef.current = onSnapshot
  }, [onSnapshot])

  const writePrompt = (term: Terminal) => {
    term.write('\r\n\x1b[32m$ \x1b[0m')
  }

  const executeCommand = (term: Terminal, cmd: string) => {
    const trimmed = cmd.trim()
    if (!trimmed) {
      writePrompt(term)
      return
    }

    // Save to history
    if (trimmed && commandHistory.current[commandHistory.current.length - 1] !== trimmed) {
      commandHistory.current.push(trimmed)
      if (commandHistory.current.length > 100) commandHistory.current.shift()
    }
    historyIndex.current = -1

    outputLines.current.push(`$ ${trimmed}`)

    // Mock command execution - simulates real shell
    if (trimmed === 'clear') {
      term.clear()
      outputLines.current = []
      writePrompt(term)
      return
    }

    if (trimmed.startsWith('echo ')) {
      const text = trimmed.slice(5)
      term.writeln(`\r\n${text}`)
      outputLines.current.push(text)
    } else if (trimmed === 'ls' || trimmed.startsWith('ls ')) {
      term.writeln('\r\nsrc  package.json  README.md  vite.config.ts')
      outputLines.current.push('src  package.json  README.md  vite.config.ts')
    } else if (trimmed === 'pwd') {
      term.writeln(`\r\n/home/user/${workspace}`)
      outputLines.current.push(`/home/user/${workspace}`)
    } else if (trimmed.startsWith('cd ')) {
      term.writeln(`\r\n`)
    } else if (trimmed === 'git status --short' || trimmed === 'git status') {
      term.writeln('\r\n M src/browser/parts/titlebarPart.ts')
      term.writeln(' M src/contrib/sessions/browser/media/sessionsList.css')
      term.writeln('?? src/contrib/browserView/browser/sessionBrowserView.ts')
    } else if (trimmed.includes('typecheck') || trimmed.includes('npm run')) {
      term.writeln('\r\n✓ No type errors found')
      outputLines.current.push('✓ No type errors found')
    } else if (trimmed === 'help') {
      term.writeln('\r\nComandos disponíveis: echo, ls, pwd, cd, clear, git status, npm run typecheck, help')
    } else {
      term.writeln(`\r\n\x1b[90m${shell}: ${trimmed.split(' ')[0]}: command not found (mock shell)\x1b[0m`)
      term.writeln(`\r\n\x1b[90mDica: tente echo, ls, pwd, clear, git status\x1b[0m`)
      outputLines.current.push(`${shell}: ${trimmed.split(' ')[0]}: command not found (mock shell)`)
    }

    writePrompt(term)
  }

  useEffect(() => {
    if (!visible || !terminalElement.current) return

    const fit = new FitAddon()
    const instance = new Terminal({
      convertEol: true,
      cursorBlink: true,
      cursorStyle: 'bar',
      fontFamily: token('--monaco-monospace-font') || 'monospace',
      fontSize: 12,
      theme: {
        background: token('--vscode-panel-background') || '#1e1e1e',
        foreground: token('--vscode-foreground') || '#cccccc',
        cursor: token('--vscode-foreground') || '#cccccc',
        selectionBackground: token('--vscode-editor-selectionBackground') || '#264f78',
        black: token('--vscode-panel-background') || '#000000',
        brightBlack: token('--vscode-descriptionForeground') || '#666666',
        green: token('--vscode-charts-green') || '#89d185',
        brightGreen: token('--vscode-charts-green') || '#89d185',
        yellow: token('--vscode-list-warningForeground') || '#cca700',
        brightYellow: token('--vscode-list-warningForeground') || '#cca700',
        red: token('--vscode-charts-red') || '#f14c4c',
        brightRed: token('--vscode-charts-red') || '#f14c4c',
        blue: token('--vscode-charts-blue') || '#3794ff',
        brightBlue: token('--vscode-charts-blue') || '#3794ff',
      },
    })
    instance.loadAddon(fit)
    instance.loadAddon(new WebLinksAddon())
    instance.open(terminalElement.current)
    fit.fit()
    fitAddon.current = fit
    terminal.current = instance

    const restoredLines = snapshot?.cleared ? [] : snapshot?.lines ?? initialTerminalLines(workspace)
    outputLines.current = [...restoredLines]
    for (const line of restoredLines) {
      if (line === '') instance.writeln('')
      else instance.writeln(line)
    }
    instance.write('\x1b[32m$ \x1b[0m')

    // REAL: onData handler - allows typing
    const dataDisposable = instance.onData((data) => {
      const code = data.charCodeAt(0)

      // Enter
      if (data === '\r') {
        const cmd = currentInput.current
        instance.writeln('')
        executeCommand(instance, cmd)
        currentInput.current = ''
        return
      }

      // Backspace
      if (code === 127 || data === '\x7f') {
        if (currentInput.current.length > 0) {
          currentInput.current = currentInput.current.slice(0, -1)
          instance.write('\b \b')
        }
        return
      }

      // Ctrl+C
      if (code === 3) {
        instance.writeln('^C')
        currentInput.current = ''
        writePrompt(instance)
        return
      }

      // Ctrl+L (clear)
      if (code === 12) {
        instance.clear()
        outputLines.current = []
        writePrompt(instance)
        currentInput.current = ''
        return
      }

      // Arrow Up - history
      if (data === '\x1b[A') {
        if (commandHistory.current.length > 0) {
          if (historyIndex.current === -1) historyIndex.current = commandHistory.current.length - 1
          else if (historyIndex.current > 0) historyIndex.current--

          // Clear current line
          const len = currentInput.current.length
          for (let i = 0; i < len; i++) instance.write('\b \b')
          currentInput.current = commandHistory.current[historyIndex.current] || ''
          instance.write(currentInput.current)
        }
        return
      }

      // Arrow Down
      if (data === '\x1b[B') {
        if (historyIndex.current !== -1) {
          const len = currentInput.current.length
          for (let i = 0; i < len; i++) instance.write('\b \b')
          if (historyIndex.current < commandHistory.current.length - 1) {
            historyIndex.current++
            currentInput.current = commandHistory.current[historyIndex.current] || ''
          } else {
            historyIndex.current = -1
            currentInput.current = ''
          }
          instance.write(currentInput.current)
        }
        return
      }

      // Regular character
      if (code >= 32) {
        currentInput.current += data
        instance.write(data)
      }
    })

    const resize = () => fit.fit()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      dataDisposable.dispose()
      onSnapshotRef.current?.(sessionId, {
        lines: [...outputLines.current],
        cleared: outputLines.current.length === 0,
      })
      instance.dispose()
      if (fitAddon.current === fit) fitAddon.current = null
      terminal.current = null
    }
  }, [sessionId, snapshot, visible, workspace, shell])

  // Split terminal - second instance with same behavior
  useEffect(() => {
    if (!split || !splitTerminalRef.current || activeTab !== 'terminal') return
    const fit = new FitAddon()
    const instance = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontFamily: token('--monaco-monospace-font') || 'monospace',
      fontSize: 12,
      theme: {
        background: token('--vscode-panel-background') || '#1e1e1e',
        foreground: token('--vscode-foreground') || '#cccccc',
      },
    })
    instance.loadAddon(fit)
    instance.open(splitTerminalRef.current)
    fit.fit()
    splitTerminalInstance.current = instance
    for (const line of initialTerminalLines(workspace)) instance.writeln(line)
    instance.write('\x1b[32m$ \x1b[0m')
    let input = ''
    instance.onData((data) => {
      if (data === '\r') {
        instance.writeln('')
        if (input.trim() === 'clear') instance.clear()
        else if (input.startsWith('echo ')) instance.writeln(`\r\n${input.slice(5)}`)
        else if (input.trim()) instance.writeln(`\r\n${input}: command not found (split mock)`)
        instance.write('\r\n\x1b[32m$ \x1b[0m')
        input = ''
      } else if (data.charCodeAt(0) === 127) {
        if (input.length > 0) {
          input = input.slice(0, -1)
          instance.write('\b \b')
        }
      } else if (data.charCodeAt(0) >= 32) {
        input += data
        instance.write(data)
      }
    })
    return () => {
      instance.dispose()
      splitTerminalInstance.current = null
    }
  }, [split, activeTab, workspace])

  useEffect(() => {
    if (visible && activeTab === 'terminal') fitAddon.current?.fit()
  }, [maximized, visible, activeTab, split])

  const clearTerminal = () => {
    outputLines.current = []
    terminal.current?.clear()
    terminal.current?.write('\x1b[32m$ \x1b[0m')
    currentInput.current = ''
  }

  const handleClose = () => {
    setMaximized(false)
    onClose()
  }

  if (!visible) return null

  const terminalLabel = sessionLabel ? `Terminal — ${sessionLabel}` : 'Terminal'
  const tabs: { id: BottomTab; label: string }[] = [
    { id: 'terminal', label: terminalLabel },
    { id: 'output', label: 'Output' },
    { id: 'problems', label: 'Problems' },
  ]

  return (
    <section className={`terminal-panel${maximized ? ' is-maximized' : ''}`} aria-label="Terminal" data-session-id={sessionId}>
      <div className="terminal-header">
        <div className="terminal-tabs" role="tablist" aria-label="Painéis inferiores">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`terminal-tab${activeTab === tab.id ? ' is-active' : ''}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.id === 'problems' && PROBLEMS.length > 0 && <span className="terminal-tab-badge" aria-label={`${PROBLEMS.length} problemas`}>{PROBLEMS.length}</span>}
              {tab.label}
            </button>
          ))}
        </div>
        <div className="terminal-header-actions">
          {activeTab === 'terminal' && (
            <div className="terminal-shell-picker">
              <button
                className="terminal-action terminal-shell-button"
                type="button"
                aria-haspopup="menu"
                aria-expanded={shellMenuOpen}
                aria-label={`Selecionar shell (atual: ${shell})`}
                title="Selecionar shell"
                onClick={() => setShellMenuOpen((current) => !current)}
              >
                <TerminalSquare size={13} /><span className="terminal-shell-name">{shell}</span><ChevronDown size={12} />
              </button>
              {shellMenuOpen && (
                <div className="terminal-shell-menu" role="menu" aria-label="Shells disponíveis">
                  {SHELLS.map((option) => (
                    <button
                      key={option}
                      className={`terminal-shell-option${option === shell ? ' is-active' : ''}`}
                      type="button"
                      role="menuitemradio"
                      aria-checked={option === shell}
                      onClick={() => { setShell(option); setShellMenuOpen(false); terminal.current?.writeln(`\r\n\x1b[90mShell alterado para ${option} (mock)\x1b[0m`); terminal.current?.write('\r\n\x1b[32m$ \x1b[0m'); currentInput.current = '' }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'terminal' && (
            <button className={`terminal-action${split ? ' is-active' : ''}`} type="button" title={split ? 'Fechar divisão' : 'Dividir terminal'} aria-label={split ? 'Fechar divisão' : 'Dividir terminal'} aria-pressed={split} onClick={() => setSplit((current) => !current)}><Columns2 size={13} /></button>
          )}
          {activeTab === 'terminal' && (
            <button className="terminal-action" type="button" title="Novo terminal" aria-label="Novo terminal" onClick={() => { setSplit(true); setShell('bash') }}><Plus size={13} /></button>
          )}
          <button className="terminal-action" type="button" title="Limpar terminal" aria-label="Limpar terminal" onClick={clearTerminal}><Eraser size={13} /></button>
          <button className="terminal-action" type="button" title={maximized ? 'Restaurar terminal' : 'Maximizar terminal'} aria-label={maximized ? 'Restaurar terminal' : 'Maximizar terminal'} aria-pressed={maximized} onClick={() => setMaximized((current) => !current)}>{maximized ? <Minimize2 size={13} /> : <PanelBottomClose size={13} />}</button>
          <button className="terminal-action" type="button" title="Fechar terminal" aria-label="Fechar terminal" onClick={handleClose}><X size={13} /></button>
        </div>
      </div>

      <div className="terminal-body">
        <div className={`terminal-panes${split ? ' is-split' : ''}`} hidden={activeTab !== 'terminal'}>
          <div className="terminal-container" ref={terminalElement} data-shell={shell} />
          {split && (
            <div className="terminal-container terminal-container-split" role="group" aria-label="Terminal dividido" ref={splitTerminalRef} />
          )}
        </div>

        {activeTab === 'output' && (
          <div className="terminal-output-view" role="tabpanel" aria-label="Output">
            <pre className="terminal-output-lines">{OUTPUT_LINES.join('\n')}</pre>
          </div>
        )}

        {activeTab === 'problems' && (
          <div className="terminal-problems-view" role="tabpanel" aria-label="Problems">
            {PROBLEMS.length === 0 ? (
              <p className="terminal-problems-empty">Nenhum problema detectado no workspace.</p>
            ) : (
              <ul className="terminal-problems-list">
                {PROBLEMS.map((problem) => (
                  <li className={`terminal-problem is-${problem.severity}`} key={`${problem.file}:${problem.line}`}>
                    <span className={`terminal-problem-severity is-${problem.severity}`} aria-label={problem.severity}>{problem.severity === 'warning' ? '⚠' : 'ℹ'}</span>
                    <span className="terminal-problem-message">{problem.message}</span>
                    <span className="terminal-problem-location">{problem.file}:{problem.line}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
