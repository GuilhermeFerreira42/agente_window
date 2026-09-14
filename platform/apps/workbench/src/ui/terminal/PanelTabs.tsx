/**
 * PanelTabs — FATIA-03.8 VISÍVEL
 * Abas inferiores Saída | Terminal | Problems, similar ao VS Code
 * Usa tokens CSS
 */

interface Tab {
  id: string;
  label: string;
  badge?: number;
}

interface Props {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}

export function PanelTabs({ tabs, active, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Painel inferior"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        height: '35px',
        padding: '0 8px',
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={tab.id === active}
          onClick={() => onChange(tab.id)}
          style={{
            height: '24px',
            padding: '0 8px',
            border: 'none',
            borderBottom: tab.id === active ? '1px solid var(--vscode-panelTitle-activeBorder, var(--vscode-focusBorder))' : '1px solid transparent',
            background: 'transparent',
            color: tab.id === active ? 'var(--vscode-panelTitle-activeForeground, var(--vscode-foreground))' : 'var(--vscode-panelTitle-inactiveForeground, var(--vscode-descriptionForeground))',
            fontSize: '11px',
            fontWeight: tab.id === active ? 600 : 400,
            textTransform: 'uppercase',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span>{tab.label}</span>
          {typeof tab.badge === 'number' && tab.badge > 0 && (
            <span
              style={{
                background: 'var(--vscode-badge-background, #616161)',
                color: 'var(--vscode-badge-foreground, #fff)',
                borderRadius: '10px',
                padding: '0 5px',
                fontSize: '10px',
                minWidth: '16px',
                textAlign: 'center',
              }}
            >
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
