import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { ContextMenu, type ContextMenuState } from './ContextMenu'
import { PanelTabs } from './terminal/PanelTabs'
import { ShellPicker } from './terminal/ShellPicker'
import { TerminalActionBar } from './terminal/TerminalActionBar'
import { TerminalGroup } from './terminal/TerminalGroup'
import { TerminalView, type TerminalViewHandle } from './terminal/TerminalView'
import { TerminalInstanceTabs } from './terminal/TerminalInstanceTabs'
import {
  closeTerminalInstance,
  createInitialTerminalInstances,
  formatTerminalInstanceLabel,
  getActiveTerminalInstance,
  openTerminalInstance,
  setActiveTerminalInstance,
  updateTerminalInstance,
  type TerminalInstance,
  type TerminalInstancesState,
} from '../domain/terminalInstances'
import { useTerminalSessions } from '../providers/TerminalSessionProvider'
import type { ShellProfile } from '../hooks/usePtySession'

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
type FocusTarget =
  | { kind: 'instance'; key: string }
  | { kind: 'split' }

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

function defaultProfiles(): ShellProfile[] {
  if (typeof navigator !== 'undefined' && /Win/i.test(navigator.platform)) {
    return [
      { id: 'pwsh', label: 'PowerShell 7', path: 'pwsh.exe' },
      { id: 'powershell', label: 'Windows PowerShell', path: 'powershell.exe' },
      { id: 'cmd', label: 'Command Prompt', path: 'cmd.exe' },
    ]
  }

  return [{ id: 'bash', label: 'Bash', path: '/bin/bash' }]
}

function initialInstances(sessionId: string, profiles: ShellProfile[]): TerminalInstancesState {
  const fallback = profiles[0]
  return createInitialTerminalInstances(sessionId, fallback?.label || 'bash', fallback?.id)
}

function stripOrdinalPrefix(label: string) {
  return label.replace(/^\d+:\s*/, '')
}

function findInstance(instances: TerminalInstance[], key: string | undefined) {
  if (!key) return undefined
  return instances.find((instance) => instance.key === key)
}

export function TerminalPanel({ visible, sessionId, sessionLabel, onClose }: TerminalPanelProps) {
  const mainTerminalRefs = useRef<Record<string, TerminalViewHandle | null>>({})
  const splitTerminalRef = useRef<TerminalViewHandle | null>(null)

  const baseProfiles = useMemo(() => defaultProfiles(), [])
  const [instancesState, setInstancesState] = useState<TerminalInstancesState>(() => initialInstances(sessionId, defaultProfiles()))
  const [maximized, setMaximized] = useState(false)
  const [activeTab, setActiveTab] = useState<BottomTab>('terminal')
  const [shellMenuOpen, setShellMenuOpen] = useState(false)
  const [split, setSplit] = useState(false)
  const [splitRatio, setSplitRatio] = useState(0.5)
  const [splitShellId, setSplitShellId] = useState<string | undefined>(undefined)
  const [focusedTarget, setFocusedTarget] = useState<FocusTarget | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  const { sessions, getOrCreateSession, closeSession: closeManagedSession } = useTerminalSessions()
  const activeInstance = getActiveTerminalInstance(instancesState)
  const activePtySession = activeInstance ? sessions[activeInstance.ptySessionId] : undefined
  const splitSessionId = `${sessionId}-split`
  const splitPtySession = sessions[splitSessionId]
  const focusedInstance = focusedTarget?.kind === 'instance'
    ? findInstance(instancesState.instances, focusedTarget.key) ?? activeInstance
    : activeInstance
  const focusedPtySession = focusedTarget?.kind === 'split'
    ? splitPtySession
    : focusedInstance
      ? sessions[focusedInstance.ptySessionId]
      : activePtySession

  useEffect(() => {
    setInstancesState(initialInstances(sessionId, baseProfiles))
    setSplit(false)
    setSplitRatio(0.5)
    setShellMenuOpen(false)
    setSplitShellId(undefined)
    setFocusedTarget(null)
  }, [sessionId, baseProfiles])

  useEffect(() => {
    if (activeTab !== 'terminal' && shellMenuOpen) {
      setShellMenuOpen(false)
    }
  }, [activeTab, shellMenuOpen])

  useEffect(() => {
    if (!visible) return
    for (const instance of instancesState.instances) {
      getOrCreateSession(instance.ptySessionId, instance.shellId)
    }
  }, [visible, instancesState.instances, getOrCreateSession])

  useEffect(() => {
    if (!visible || !split) return
    getOrCreateSession(splitSessionId, splitShellId || activeInstance?.shellId)
  }, [visible, split, splitSessionId, splitShellId, activeInstance?.shellId, getOrCreateSession])

  useEffect(() => {
    const profile = activePtySession?.activeProfile
    if (!activeInstance || !profile) return
    setInstancesState((current) => updateTerminalInstance(
      current,
      activeInstance.key,
      {
        shellId: profile.id,
        label: formatTerminalInstanceLabel(profile.label || stripOrdinalPrefix(activeInstance.label), activeInstance.ordinal),
      },
    ))
  }, [activeInstance, activePtySession?.activeProfile])

  useEffect(() => {
    if (!visible || activeTab !== 'terminal') return

    const activeRef = activeInstance ? mainTerminalRefs.current[activeInstance.key] : null
    if (split) {
      splitTerminalRef.current?.fitAndSync()
      setFocusedTarget({ kind: 'split' })
    } else if (activeInstance) {
      activeRef?.fitAndSync()
      setFocusedTarget({ kind: 'instance', key: activeInstance.key })
    }

    const timer = window.setTimeout(() => {
      if (split) {
        splitTerminalRef.current?.focus()
      } else {
        activeRef?.focus()
      }
    }, 50)

    return () => window.clearTimeout(timer)
  }, [visible, activeTab, maximized, split, activeInstance?.key, activePtySession?.status, splitPtySession?.status])

  useEffect(() => {
    if (!visible || activeTab !== 'terminal' || !split || !activeInstance) return

    const frame = window.requestAnimationFrame(() => {
      mainTerminalRefs.current[activeInstance.key]?.fitAndSync()
      splitTerminalRef.current?.fitAndSync()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [activeInstance?.key, activeTab, maximized, split, splitRatio, visible])

  useEffect(() => {
    if (visible && activeTab === 'terminal') return
    setContextMenu(null)
  }, [activeTab, visible])

  const resolveTerminalHandle = (target: FocusTarget | null = focusedTarget) => {
    if (target?.kind === 'split') {
      return split ? splitTerminalRef.current : null
    }

    const instance = target?.kind === 'instance'
      ? findInstance(instancesState.instances, target.key) ?? activeInstance
      : focusedInstance ?? activeInstance

    return instance ? mainTerminalRefs.current[instance.key] : null
  }

  const resolveTerminalSession = (target: FocusTarget | null = focusedTarget) => {
    if (target?.kind === 'split') {
      return split ? splitPtySession : undefined
    }

    const instance = target?.kind === 'instance'
      ? findInstance(instancesState.instances, target.key) ?? activeInstance
      : focusedInstance ?? activeInstance

    return instance ? sessions[instance.ptySessionId] : undefined
  }

  const clearTerminal = (targetOverride: FocusTarget | null = focusedTarget) => {
    if (activeTab !== 'terminal') return

    if (split && targetOverride?.kind !== 'instance') {
      splitTerminalRef.current?.clear()
      splitPtySession?.clearOutputBuffer()
      return
    }

    const target = targetOverride?.kind === 'instance'
      ? findInstance(instancesState.instances, targetOverride.key) ?? activeInstance
      : focusedInstance ?? activeInstance
    if (!target) return

    mainTerminalRefs.current[target.key]?.clear()
    sessions[target.ptySessionId]?.clearOutputBuffer()
  }

  const closeSplitIfNeeded = () => {
    if (!split) return
    closeManagedSession(splitSessionId)
    setSplit(false)
    setSplitRatio(0.5)
    setSplitShellId(undefined)
    setFocusedTarget(activeInstance ? { kind: 'instance', key: activeInstance.key } : null)
  }

  const handleClose = () => {
    setContextMenu(null)
    setMaximized(false)
    closeSplitIfNeeded()
    for (const instance of instancesState.instances) {
      closeManagedSession(instance.ptySessionId)
    }
    onClose()
  }

  const handleCopySelection = async (target: FocusTarget | null = focusedTarget) => {
    const handle = resolveTerminalHandle(target)
    const selectedText = handle?.getSelection()?.trim()
    if (!selectedText || !navigator.clipboard?.writeText) return
    await navigator.clipboard.writeText(selectedText)
  }

  const handlePasteFromClipboard = async (target: FocusTarget | null = focusedTarget) => {
    const session = resolveTerminalSession(target)
    if (!session || !navigator.clipboard?.readText) return
    const text = await navigator.clipboard.readText()
    if (!text) return
    session.sendInput(text)
    resolveTerminalHandle(target)?.focus()
  }

  const handleSelectAll = (target: FocusTarget | null = focusedTarget) => {
    resolveTerminalHandle(target)?.selectAll()
  }

  const handleKillFocusedProcess = (target: FocusTarget | null = focusedTarget) => {
    resolveTerminalSession(target)?.closeSession()
  }

  const openTerminalContextMenu = (target: FocusTarget) => (event: MouseEvent<HTMLDivElement>) => {
    if (activeTab !== 'terminal') return
    event.preventDefault()
    setFocusedTarget(target)
    setShellMenuOpen(false)

    const handle = resolveTerminalHandle(target)
    const session = resolveTerminalSession(target)
    const selection = handle?.getSelection() || window.getSelection()?.toString() || ''
    const canCopy = selection.trim().length > 0
    const canPaste = typeof navigator !== 'undefined' && Boolean(navigator.clipboard?.readText)
    const canKillSession = session?.status === 'open' || session?.status === 'connecting'

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      label: 'Ações do terminal',
      items: [
        {
          id: 'copy',
          label: 'Copiar',
          disabled: !canCopy,
          onSelect: () => { void handleCopySelection(target) },
        },
        {
          id: 'paste',
          label: 'Colar',
          disabled: !canPaste,
          onSelect: () => { void handlePasteFromClipboard(target) },
        },
        {
          id: 'select-all',
          label: 'Selecionar tudo',
          onSelect: () => handleSelectAll(target),
        },
        {
          id: 'clear',
          label: 'Limpar terminal',
          separatorBefore: true,
          onSelect: () => clearTerminal(target),
        },
        {
          id: 'kill',
          label: 'Encerrar processo',
          danger: true,
          disabled: !canKillSession,
          separatorBefore: true,
          onSelect: () => handleKillFocusedProcess(target),
        },
      ],
    })
  }

  const handleSelectShell = (profile: ShellProfile) => {
    setShellMenuOpen(false)

    if (focusedTarget?.kind === 'split' && split) {
      if (profile.id === splitPtySession?.activeProfile?.id) return
      closeManagedSession(splitSessionId)
      setSplitShellId(profile.id)
      return
    }

    if (!activeInstance) return
    if (profile.id === activePtySession?.activeProfile?.id) return

    closeSplitIfNeeded()
    closeManagedSession(activeInstance.ptySessionId)
    setInstancesState((current) => updateTerminalInstance(
      current,
      activeInstance.key,
      {
        shellId: profile.id,
        label: formatTerminalInstanceLabel(profile.label, activeInstance.ordinal),
      },
    ))
  }

  const handleToggleSplit = () => {
    if (split) {
      closeSplitIfNeeded()
      return
    }

    setSplit(true)
    setSplitRatio(0.5)
    setFocusedTarget({ kind: 'split' })
    setSplitShellId(
      (focusedTarget?.kind === 'split' ? splitPtySession?.activeProfile?.id : focusedPtySession?.activeProfile?.id)
        || focusedInstance?.shellId
        || activeInstance?.shellId,
    )
  }

  const handleNewTerminal = () => {
    closeSplitIfNeeded()
    const baseLabel = focusedPtySession?.activeProfile?.label
      || stripOrdinalPrefix(focusedInstance?.label || activeInstance?.label || '')
      || baseProfiles[0]?.label
      || 'bash'
    const shellId = focusedPtySession?.activeProfile?.id
      || focusedInstance?.shellId
      || activeInstance?.shellId
      || baseProfiles[0]?.id

    let nextActiveKey = instancesState.activeKey
    setInstancesState((current) => {
      const next = openTerminalInstance(current, sessionId, baseLabel, shellId)
      nextActiveKey = next.activeKey
      return next
    })
    setFocusedTarget({ kind: 'instance', key: nextActiveKey })
  }

  const handleSelectInstance = (key: string) => {
    if (key === instancesState.activeKey) return
    closeSplitIfNeeded()
    setInstancesState((current) => setActiveTerminalInstance(current, key))
    setFocusedTarget({ kind: 'instance', key })
  }

  const handleCloseInstance = (key: string) => {
    const target = instancesState.instances.find((instance) => instance.key === key)
    if (!target) return

    closeSplitIfNeeded()
    closeManagedSession(target.ptySessionId)
    setInstancesState((current) => closeTerminalInstance(current, key))
    if (focusedTarget?.kind === 'instance' && focusedTarget.key === key) {
      setFocusedTarget(null)
    }
  }

  const profilesList = focusedPtySession?.availableProfiles?.length ? focusedPtySession.availableProfiles : baseProfiles
  const activeShellId = focusedTarget?.kind === 'split'
    ? splitPtySession?.activeProfile?.id || splitShellId
    : focusedPtySession?.activeProfile?.id || focusedInstance?.shellId || activeInstance?.shellId
  const activeShellLabel = focusedPtySession?.activeProfile?.label
    || (focusedTarget?.kind === 'split'
      ? baseProfiles.find((profile) => profile.id === (splitPtySession?.activeProfile?.id || splitShellId))?.label
      : stripOrdinalPrefix(focusedInstance?.label || activeInstance?.label || ''))
    || baseProfiles[0]?.label
    || 'bash'
  const visibleTerminalStatus = focusedPtySession?.status || activePtySession?.status || 'connecting'
  const stateBannerMessage = visibleTerminalStatus === 'error'
    ? focusedPtySession?.lastError?.message || 'Erro de comunicação com o terminal integrado.'
    : visibleTerminalStatus === 'closed'
      ? 'Processo encerrado. O scrollback visível foi preservado.'
      : null

  if (!visible || !activeInstance) return null

  const terminalLabel = sessionLabel ? `Terminal — ${sessionLabel}` : 'Terminal'
  const tabs: { id: BottomTab; label: string; badge?: number }[] = [
    { id: 'terminal', label: terminalLabel },
    { id: 'output', label: 'Output' },
    { id: 'problems', label: 'Problems', badge: PROBLEMS.length },
  ]

  return (
    <section
      className={`terminal-panel${maximized ? ' is-maximized' : ''}`}
      aria-label="Terminal"
      data-session-id={sessionId}
      data-pty-status={visibleTerminalStatus}
      data-pty-pid={focusedPtySession?.pid ?? activePtySession?.pid}
      data-pty-shell-path={focusedPtySession?.activeProfile?.path ?? activePtySession?.activeProfile?.path}
    >
      <div className="terminal-header">
        <PanelTabs tabs={tabs} active={activeTab} onChange={(tabId) => setActiveTab(tabId as BottomTab)} />
        <TerminalActionBar
          showTerminalActions={activeTab === 'terminal'}
          split={split}
          maximized={maximized}
          canKill={Boolean(activePtySession?.pid || focusedPtySession?.pid)}
          shellPicker={(
            <ShellPicker
              profiles={profilesList}
              activeShellId={activeShellId}
              activeShellLabel={activeShellLabel}
              open={shellMenuOpen}
              onToggle={() => setShellMenuOpen((current) => !current)}
              onSelect={handleSelectShell}
            />
          )}
          onToggleSplit={handleToggleSplit}
          onNewTerminal={handleNewTerminal}
          onClearTerminal={clearTerminal}
          onToggleMaximized={() => setMaximized((current) => !current)}
          onCloseTerminal={handleClose}
        />
      </div>

      <div className="terminal-body">
        {activeTab === 'terminal' && stateBannerMessage && (
          <div
            className={`terminal-state-banner${visibleTerminalStatus === 'error' ? ' is-error' : ''}`}
            role="status"
            aria-live="polite"
          >
            {stateBannerMessage}
          </div>
        )}

        {activeTab === 'terminal' && (
          <TerminalInstanceTabs
            instances={instancesState.instances.map((instance) => ({
              key: instance.key,
              label: instance.label,
              active: instance.key === instancesState.activeKey,
            }))}
            activeKey={instancesState.activeKey}
            onSelect={handleSelectInstance}
            onClose={handleCloseInstance}
            canClose={(key) => instancesState.instances.length > 1 && instancesState.instances.some((instance) => instance.key === key)}
          />
        )}

        <TerminalGroup
          split={split}
          splitRatio={splitRatio}
          hidden={activeTab !== 'terminal'}
          onSplitRatioChange={setSplitRatio}
          mainPane={(
            <div className="terminal-main-stack">
              {instancesState.instances.map((instance) => {
                const isActive = instance.key === instancesState.activeKey
                return (
                  <TerminalView
                    key={instance.key}
                    ref={(value) => {
                      mainTerminalRefs.current[instance.key] = value
                    }}
                    className={`terminal-container${isActive ? ' is-active' : ' is-hidden'}`}
                    enabled={visible && activeTab === 'terminal'}
                    active={isActive}
                    hidden={!isActive}
                    loadWebLinks={instance.ordinal === 0}
                    sessionId={instance.ptySessionId}
                    session={sessions[instance.ptySessionId]}
                    shellId={instance.shellId || 'bash'}
                    ariaLabel={`Terminal ${instance.label}`}
                    onFocusWithin={() => setFocusedTarget({ kind: 'instance', key: instance.key })}
                    onContextMenu={openTerminalContextMenu({ kind: 'instance', key: instance.key })}
                  />
                )
              })}
            </div>
          )}
          splitPane={split ? (
            <TerminalView
              ref={splitTerminalRef}
              className="terminal-container terminal-container-split"
              enabled={visible && activeTab === 'terminal'}
              active
              role="group"
              ariaLabel="Terminal dividido"
              sessionId={splitSessionId}
              session={splitPtySession}
              shellId={splitPtySession?.activeProfile?.id || splitShellId || activeInstance.shellId || 'bash'}
              onFocusWithin={() => setFocusedTarget({ kind: 'split' })}
              onContextMenu={openTerminalContextMenu({ kind: 'split' })}
            />
          ) : undefined}
        />

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

      <ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} />
    </section>
  )
}
