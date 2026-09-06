import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Columns2, Eraser, Minimize2, PanelBottomClose, Plus, TerminalSquare, X } from 'lucide-react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { usePtySession, type ShellProfile } from '../hooks/usePtySession'

/** @deprecated Snapshots are deprecated in favor of real PTY session lifecycle */
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

const PROBLEMS = [
  { severity: 'warning' as const, file: 'src/App.tsx', line: 480, message: 'Bloco maior que 500 kB após minificação.' },
  { severity: 'info' as const, file: 'src/components/EditorArea.tsx', line: 372, message: 'Considere memoizar visibleTabs.' },
]

const OUTPUT_LINES = [
  '[info] Iniciando tarefa: npm run build',
  '[info] vite v5 building for production...',
  '[info] transforming modules (1287)',
  '[info] rendering chunks...',
  '[info] dist/assets/index.js  1,088.61 kB │ gzip: 288.4 kB',
  '[info] ✓ built in 15.56s',
]

function token(name: string) {
  if (typeof document === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function TerminalPanel({ visible, sessionId, sessionLabel, onClose }: TerminalPanelProps) {
  const terminalElement = useRef<HTMLDivElement>(null)
  const terminal = useRef<Terminal | null>(null)
  const fitAddon = useRef<FitAddon | null>(null)

  const [maximized, setMaximized] = useState(false)
  const [activeTab, setActiveTab] = useState<BottomTab>('terminal')
  const [selectedShellId, setSelectedShellId] = useState<string | undefined>(undefined)
  const [shellMenuOpen, setShellMenuOpen] = useState(false)

  // Split terminal state
  const [split, setSplit] = useState(false)
  const [splitShellId, setSplitShellId] = useState<string | undefined>(undefined)
  const splitTerminalRef = useRef<HTMLDivElement>(null)
  const splitTerminal = useRef<Terminal | null>(null)
  const splitFitAddon = useRef<FitAddon | null>(null)

  // Primary PTY session hook
  const ptySession = usePtySession({
    sessionId,
    shellId: selectedShellId,
    enabled: visible && activeTab === 'terminal'
  })

  // Split PTY session hook
  const splitPtySession = usePtySession({
    sessionId: `${sessionId}-split`,
    shellId: splitShellId,
    enabled: visible && activeTab === 'terminal' && split
  })

  const ptySessionRef = useRef(ptySession)
  ptySessionRef.current = ptySession

  const splitPtySessionRef = useRef(splitPtySession)
  splitPtySessionRef.current = splitPtySession

  // Setup primary xterm instance
  useEffect(() => {
    if (!visible || !terminalElement.current || activeTab !== 'terminal') return

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
    try {
      fit.fit()
    } catch {
      // Ignore if layout not ready
    }
    fitAddon.current = fit
    terminal.current = instance

    // Send input from user typing to real PTY backend
    const dataDisposable = instance.onData((data) => {
      ptySessionRef.current.sendInput(data)
    })

    // Listen to output from real PTY backend
    const unsubscribeOutput = ptySessionRef.current.onOutput((data) => {
      instance.write(data)
    })

    instance.attachCustomKeyEventHandler((arg) => {
      if (arg.type === 'keydown' && arg.key === 'Escape') {
        instance.blur()
        return false
      }
      return true
    })

    const resize = () => {
      try {
        fit.fit()
      } catch {
        // Ignore
      }
      ptySessionRef.current.sendResize(instance.cols, instance.rows)
    }

    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      dataDisposable.dispose()
      unsubscribeOutput()
      instance.dispose()
      if (fitAddon.current === fit) fitAddon.current = null
      terminal.current = null
    }
  }, [sessionId, visible, activeTab])

  // Setup split xterm instance
  useEffect(() => {
    if (!split || !splitTerminalRef.current || !visible || activeTab !== 'terminal') return

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
    try {
      fit.fit()
    } catch {
      // Ignore
    }
    splitFitAddon.current = fit
    splitTerminal.current = instance

    const dataDisposable = instance.onData((data) => {
      splitPtySessionRef.current.sendInput(data)
    })

    const unsubscribeOutput = splitPtySessionRef.current.onOutput((data) => {
      instance.write(data)
    })

    instance.attachCustomKeyEventHandler((arg) => {
      if (arg.type === 'keydown' && arg.key === 'Escape') {
        instance.blur()
        return false
      }
      return true
    })

    const resize = () => {
      try {
        fit.fit()
      } catch {
        // Ignore
      }
      splitPtySessionRef.current.sendResize(instance.cols, instance.rows)
    }

    window.addEventListener('resize', resize)

    return () => {
      window.removeEventListener('resize', resize)
      dataDisposable.dispose()
      unsubscribeOutput()
      instance.dispose()
      if (splitFitAddon.current === fit) splitFitAddon.current = null
      splitTerminal.current = null
    }
  }, [split, visible, activeTab])

  // Refit and focus on visibility / maximize / split change
  useEffect(() => {
    if (visible && activeTab === 'terminal') {
      try {
        fitAddon.current?.fit()
        splitFitAddon.current?.fit()
      } catch {
        // Ignore
      }
      
      // Auto-focus the terminal (wait for DOM to be ready)
      setTimeout(() => {
        if (split && splitTerminal.current) {
          splitTerminal.current.focus()
        } else if (terminal.current) {
          terminal.current.focus()
        }
      }, 50)
    }
  }, [maximized, visible, activeTab, split, sessionId])

  const clearTerminal = () => {
    terminal.current?.clear()
  }

  const handleClose = () => {
    setMaximized(false)
    ptySession.closeSession()
    if (split) {
      splitPtySession.closeSession()
    }
    onClose()
  }

  const handleSelectShell = (profile: ShellProfile) => {
    setSelectedShellId(profile.id)
    setShellMenuOpen(false)
  }

  if (!visible) return null

  const activeShellLabel = ptySession.activeProfile?.label || ptySession.activeProfile?.id || 'bash'
  const profilesList = ptySession.availableProfiles.length > 0
    ? ptySession.availableProfiles
    : [
        { id: 'pwsh', label: 'PowerShell 7', path: 'pwsh.exe' },
        { id: 'powershell', label: 'Windows PowerShell', path: 'powershell.exe' },
        { id: 'cmd', label: 'Command Prompt', path: 'cmd.exe' },
        { id: 'bash', label: 'Bash', path: '/bin/bash' }
      ]

  const terminalLabel = sessionLabel ? `Terminal — ${sessionLabel}` : 'Terminal'
  const tabs: { id: BottomTab; label: string }[] = [
    { id: 'terminal', label: terminalLabel },
    { id: 'output', label: 'Output' },
    { id: 'problems', label: 'Problems' },
  ]

  return (
    <section
      className={`terminal-panel${maximized ? ' is-maximized' : ''}`}
      aria-label="Terminal"
      data-session-id={sessionId}
      data-pty-status={ptySession.status}
      data-pty-pid={ptySession.pid}
      data-pty-shell-path={ptySession.activeProfile?.path}
    >
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
              {tab.id === 'problems' && PROBLEMS.length > 0 && (
                <span className="terminal-tab-badge" aria-label={`${PROBLEMS.length} problemas`}>
                  {PROBLEMS.length}
                </span>
              )}
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
                aria-label={`Selecionar shell (atual: ${activeShellLabel})`}
                title="Selecionar shell"
                onClick={() => setShellMenuOpen((current) => !current)}
              >
                <TerminalSquare size={13} />
                <span className="terminal-shell-name">{activeShellLabel}</span>
                <ChevronDown size={12} />
              </button>
              {shellMenuOpen && (
                <div className="terminal-shell-menu" role="menu" aria-label="Shells disponíveis">
                  {profilesList.map((profile) => (
                    <button
                      key={profile.id}
                      className={`terminal-shell-option${profile.id === ptySession.activeProfile?.id ? ' is-active' : ''}`}
                      type="button"
                      role="menuitemradio"
                      aria-checked={profile.id === ptySession.activeProfile?.id}
                      onClick={() => handleSelectShell(profile)}
                    >
                      {profile.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'terminal' && (
            <button
              className={`terminal-action${split ? ' is-active' : ''}`}
              type="button"
              title={split ? 'Fechar divisão' : 'Dividir terminal'}
              aria-label={split ? 'Fechar divisão' : 'Dividir terminal'}
              aria-pressed={split}
              onClick={() => setSplit((current) => !current)}
            >
              <Columns2 size={13} />
            </button>
          )}
          {activeTab === 'terminal' && (
            <button
              className="terminal-action"
              type="button"
              title="Novo terminal"
              aria-label="Novo terminal"
              onClick={() => {
                setSplit(true)
                setSplitShellId(undefined)
              }}
            >
              <Plus size={13} />
            </button>
          )}
          <button
            className="terminal-action"
            type="button"
            title="Limpar terminal"
            aria-label="Limpar terminal"
            onClick={clearTerminal}
          >
            <Eraser size={13} />
          </button>
          <button
            className="terminal-action"
            type="button"
            title={maximized ? 'Restaurar terminal' : 'Maximizar terminal'}
            aria-label={maximized ? 'Restaurar terminal' : 'Maximizar terminal'}
            aria-pressed={maximized}
            onClick={() => setMaximized((current) => !current)}
          >
            {maximized ? <Minimize2 size={13} /> : <PanelBottomClose size={13} />}
          </button>
          <button
            className="terminal-action"
            type="button"
            title="Fechar terminal"
            aria-label="Fechar terminal"
            onClick={handleClose}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      <div className="terminal-body">
        <div className={`terminal-panes${split ? ' is-split' : ''}`} hidden={activeTab !== 'terminal'}>
          <div
            className="terminal-container"
            ref={terminalElement}
            data-shell={ptySession.activeProfile?.id || selectedShellId || 'bash'}
          />
          {split && (
            <div
              className="terminal-container terminal-container-split"
              role="group"
              aria-label="Terminal dividido"
              ref={splitTerminalRef}
              data-shell={splitPtySession.activeProfile?.id || splitShellId || 'bash'}
            />
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
                    <span className={`terminal-problem-severity is-${problem.severity}`} aria-label={problem.severity}>
                      {problem.severity === 'warning' ? '⚠' : 'ℹ'}
                    </span>
                    <span className="terminal-problem-message">{problem.message}</span>
                    <span className="terminal-problem-location">
                      {problem.file}:{problem.line}
                    </span>
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
