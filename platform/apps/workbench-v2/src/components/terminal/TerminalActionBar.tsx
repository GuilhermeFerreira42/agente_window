import type { ReactNode } from 'react'
import { Columns2, Eraser, Minimize2, PanelBottomClose, Plus, X } from 'lucide-react'

interface TerminalActionBarProps {
  showTerminalActions: boolean
  split: boolean
  maximized: boolean
  canKill: boolean
  shellPicker?: ReactNode
  onToggleSplit: () => void
  onNewTerminal: () => void
  onClearTerminal: () => void
  onToggleMaximized: () => void
  onCloseTerminal: () => void
}

export function TerminalActionBar({
  showTerminalActions,
  split,
  maximized,
  canKill,
  shellPicker,
  onToggleSplit,
  onNewTerminal,
  onClearTerminal,
  onToggleMaximized,
  onCloseTerminal,
}: TerminalActionBarProps) {
  return (
    <div className="terminal-header-actions">
      {showTerminalActions && shellPicker}
      {showTerminalActions && (
        <button
          className={`terminal-action${split ? ' is-active' : ''}`}
          type="button"
          title={split ? 'Fechar divisão' : 'Dividir terminal'}
          aria-label={split ? 'Fechar divisão' : 'Dividir terminal'}
          aria-pressed={split}
          onClick={onToggleSplit}
        >
          <Columns2 size={16} />
        </button>
      )}
      {showTerminalActions && (
        <button
          className="terminal-action"
          type="button"
          title="Novo terminal"
          aria-label="Novo terminal"
          onClick={onNewTerminal}
        >
          <Plus size={16} />
        </button>
      )}
      {showTerminalActions && (
        <button
          className="terminal-action"
          type="button"
          title="Limpar terminal"
          aria-label="Limpar terminal"
          onClick={onClearTerminal}
        >
          <Eraser size={16} />
        </button>
      )}
      <button
        className="terminal-action"
        type="button"
        title={maximized ? 'Restaurar terminal' : 'Maximizar terminal'}
        aria-label={maximized ? 'Restaurar terminal' : 'Maximizar terminal'}
        aria-pressed={maximized}
        onClick={onToggleMaximized}
      >
        {maximized ? <Minimize2 size={16} /> : <PanelBottomClose size={16} />}
      </button>
      <button
        className={`terminal-action terminal-action-close${canKill ? ' is-destructive' : ''}`}
        type="button"
        title="Fechar terminal"
        aria-label="Fechar terminal"
        onClick={onCloseTerminal}
      >
        <X size={16} />
      </button>
    </div>
  )
}
