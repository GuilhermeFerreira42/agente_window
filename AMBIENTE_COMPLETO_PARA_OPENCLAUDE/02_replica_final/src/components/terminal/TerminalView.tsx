import { forwardRef, useEffect, useImperativeHandle, useRef, type MouseEvent as ReactMouseEvent } from 'react'
import type { PtySessionState } from '../../providers/TerminalSessionProvider'
import { useTerminalTheme } from '../../hooks/useTerminalTheme'
import { useXtermTerminal } from '../../hooks/useXtermTerminal'

export interface TerminalViewHandle {
  focus: () => void
  clear: () => void
  fitAndSync: () => void
  hasSelection: () => boolean
  getSelection: () => string
  selectAll: () => void
}

interface TerminalViewProps {
  sessionId: string
  session: PtySessionState | undefined
  enabled: boolean
  active?: boolean
  hidden?: boolean
  shellId?: string
  className?: string
  role?: string
  ariaLabel?: string
  loadWebLinks?: boolean
  onFocusWithin?: () => void
  onContextMenu?: (event: ReactMouseEvent<HTMLDivElement>) => void
}

export const TerminalView = forwardRef<TerminalViewHandle, TerminalViewProps>(function TerminalView(
  {
    sessionId,
    session,
    enabled,
    active = true,
    hidden = false,
    shellId,
    className = 'terminal-container',
    role,
    ariaLabel,
    loadWebLinks = false,
    onFocusWithin,
    onContextMenu,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const theme = useTerminalTheme()
  const { focus, clear, fitAndSync, hasSelection, getSelection, selectAll } = useXtermTerminal({
    containerRef,
    sessionId,
    session,
    enabled,
    active,
    theme,
    loadWebLinks,
  })

  useImperativeHandle(ref, () => ({
    focus,
    clear,
    fitAndSync,
    hasSelection,
    getSelection,
    selectAll,
  }), [focus, clear, fitAndSync, hasSelection, getSelection, selectAll])

  useEffect(() => {
    const element = containerRef.current
    if (!element || !onFocusWithin) return

    const handleFocusIn = () => {
      onFocusWithin()
    }

    element.addEventListener('focusin', handleFocusIn)
    return () => {
      element.removeEventListener('focusin', handleFocusIn)
    }
  }, [onFocusWithin, sessionId])

  return (
    <div
      className={`${className}${session?.status ? ` is-status-${session.status}` : ''}`}
      ref={containerRef}
      role={role}
      aria-label={ariaLabel}
      aria-hidden={hidden}
      hidden={hidden}
      data-shell={shellId || 'bash'}
      data-pty-session-id={sessionId}
      data-pty-status={session?.status ?? 'connecting'}
      data-pty-pid={session?.pid}
      data-pty-shell-path={session?.activeProfile?.path}
      onContextMenu={onContextMenu}
    />
  )
})
