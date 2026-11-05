interface PanelTabsProps {
  tabs: { id: string; label: string; badge?: number }[]
  active: string
  onChange: (id: string) => void
}

export function PanelTabs({ tabs, active, onChange }: PanelTabsProps) {
  return (
    <div className="terminal-tabs" role="tablist" aria-label="Painéis inferiores">
      {tabs.map((tab) => {
        const selected = active === tab.id
        return (
          <button
            key={tab.id}
            className={`terminal-tab${selected ? ' is-active' : ''}`}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
          >
            {typeof tab.badge === 'number' && tab.badge > 0 && (
              <span className="terminal-tab-badge" aria-label={`${tab.badge} problemas`}>
                {tab.badge}
              </span>
            )}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
