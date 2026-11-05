import { X } from 'lucide-react'

interface TerminalInstanceTabsProps {
  instances: { key: string; label: string; active: boolean }[]
  activeKey: string
  onSelect: (key: string) => void
  onClose: (key: string) => void
  canClose: (key: string) => boolean
}

export function TerminalInstanceTabs({ instances, activeKey, onSelect, onClose, canClose }: TerminalInstanceTabsProps) {
  return (
    <div className="terminal-instance-strip">
      <div className="terminal-instance-tabs" role="tablist" aria-label="Terminais abertos">
        {instances.map((instance) => {
          const closable = canClose(instance.key)
          return (
            <div
              className={`terminal-instance-tab-shell${instance.active ? ' is-active' : ''}`}
              key={instance.key}
              data-terminal-key={instance.key}
            >
              <button
                className={`terminal-instance-tab${instance.active ? ' is-active' : ''}`}
                type="button"
                role="tab"
                aria-selected={instance.key === activeKey}
                aria-label={`Terminal ${instance.label}`}
                onClick={() => onSelect(instance.key)}
              >
                <span className="terminal-instance-tab-label">{instance.label}</span>
              </button>
              {closable && (
                <button
                  className="terminal-instance-tab-close"
                  type="button"
                  aria-label={`Fechar terminal ${instance.label}`}
                  title={`Fechar terminal ${instance.label}`}
                  onClick={() => onClose(instance.key)}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
