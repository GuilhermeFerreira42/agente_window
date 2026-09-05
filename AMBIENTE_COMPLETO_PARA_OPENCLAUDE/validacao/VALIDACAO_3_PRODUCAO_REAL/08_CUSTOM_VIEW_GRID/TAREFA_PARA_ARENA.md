# TAREFA PARA ARENA - CUSTOM VIEW GRID

### Passo 1 - Custom View Grid service
Criar `src/domain/customView.ts`:

```ts
export type CustomViewId = 'aiCustomizations' | 'automations' | 'test'

export interface CustomViewState {
  activeView: CustomViewId | null
  // Desired visibility retida separadamente de effective visibility
  desiredVisibility: {
    sessionsPart: boolean
    editor: boolean
    auxiliaryBar: boolean
    panel: boolean
  }
}

export function shouldShowCustomViewGrid(state: CustomViewState) {
  return state.activeView !== null
}

export function dismissCustomViewOnSessionOpen(state: CustomViewState): CustomViewState {
  // Opening a session dismisses active custom view
  return { ...state, activeView: null }
}
```

### Passo 2 - App.tsx - esconder parts quando custom view ativo
Arquivo: `src/App.tsx`

```ts
const [activeCustomView, setActiveCustomView] = useState<CustomViewId | null>(null)
const [desiredVisibility, setDesiredVisibility] = useState({ sessionsPart: true, editor: true, auxiliaryBar: true, panel: true })

// Quando custom view ativo, esconder Sessions Part, Editor, Aux, Panel - só Titlebar e Sidebar ficam
const showSessionsPart = activeCustomView ? false : desiredVisibility.sessionsPart
const showEditor = activeCustomView ? false : desiredVisibility.editor
const showAuxiliaryBar = activeCustomView ? false : desiredVisibility.auxiliaryBar
const showPanel = activeCustomView ? false : desiredVisibility.panel

// Abrir sessão dismiss custom view
const selectSession = (id) => {
  setActiveCustomView(null) // dismiss
  // ... resto
  setActiveSessionId(id)
}

const openCustomView = (viewId: CustomViewId) => {
  // Salvar desired visibility antes de esconder
  setDesiredVisibility({
    sessionsPart: sessionsPartVisible,
    editor: !editorHidden,
    auxiliaryBar: auxiliaryVisible,
    panel: terminalVisible,
  })
  setActiveCustomView(viewId)
}
```

### Passo 3 - CustomizationsView como full-surface
Arquivo: `src/components/CustomizationsView.tsx`

```tsx
export function CustomizationsView({ onClose }) {
  return (
    <div className="custom-view-grid">
      <div className="custom-view-header">
        <h1>AI Customizations</h1>
        <button onClick={onClose}>Fechar</button>
      </div>
      <div className="custom-view-content">
        {/* Tree de agents/skills/MCP */}
      </div>
    </div>
  )
}
```

CSS:
```css
.custom-view-grid {
  position: absolute;
  inset: 0;
  background: var(--vscode-agentsPanel-background);
  z-index: 10;
}
.workbench.custom-view-active .sessions-part,
.workbench.custom-view-active .editor-part,
.workbench.custom-view-active .auxiliary-bar,
.workbench.custom-view-active .panel {
  display: none !important;
}
.workbench.custom-view-active .sidebar,
.workbench.custom-view-active .titlebar {
  display: flex !important; /* só Titlebar e Sidebar ficam */
}
```

### Critério E2E:
1. Clicar AI Customizations -> Sessions Part, Editor, Aux, Panel somem, só Titlebar e Sidebar ficam, mostra custom view grid
2. Clicar em sessão na sidebar -> custom view fecha, volta sessions part com estado anterior
3. F5 com custom view ativo -> continua ativo
4. No mobile, back dismiss custom view

### Arquivos:
- Novo: src/domain/customView.ts
- src/App.tsx (activeCustomView, desiredVisibility, dismiss on session open)
- src/components/CustomizationsView.tsx (full-surface)
- src/styles/app.css (esconder parts quando custom-view-active)
