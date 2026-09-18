import { Check, ChevronDown, TerminalSquare } from 'lucide-react'
import type { ShellProfile } from '../../hooks/usePtySession'

interface ShellPickerProps {
  profiles: ShellProfile[]
  activeShellId: string | undefined
  activeShellLabel: string
  open: boolean
  onToggle: () => void
  onSelect: (profile: ShellProfile) => void
}

export function ShellPicker({
  profiles,
  activeShellId,
  activeShellLabel,
  open,
  onToggle,
  onSelect,
}: ShellPickerProps) {
  return (
    <div className="terminal-shell-picker">
      <button
        className="terminal-action terminal-shell-button"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Selecionar shell (atual: ${activeShellLabel})`}
        title="Selecionar shell"
        onClick={onToggle}
      >
        <TerminalSquare size={16} />
        <span className="terminal-shell-name">{activeShellLabel}</span>
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="terminal-shell-menu" role="menu" aria-label="Shells disponíveis">
          {profiles.map((profile) => {
            const isActive = profile.id === activeShellId
            return (
              <button
                key={profile.id}
                className={`terminal-shell-option${isActive ? ' is-active' : ''}`}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => {
                  if (isActive) return
                  onSelect(profile)
                }}
              >
                <span className="terminal-shell-option-content">
                  <span className="terminal-shell-option-check" aria-hidden="true">
                    <Check size={14} />
                  </span>
                  <span>{profile.label}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
