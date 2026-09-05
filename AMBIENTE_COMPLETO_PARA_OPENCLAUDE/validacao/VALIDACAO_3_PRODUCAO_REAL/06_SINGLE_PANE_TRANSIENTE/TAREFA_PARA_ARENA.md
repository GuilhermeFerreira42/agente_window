# TAREFA PARA ARENA - SINGLE PANE TRANSIENTE

### Passo 1 - Fix crash Mostrar Editor (R-040)
Arquivo: `src/App.tsx`

**ANTES:** Hide/Show editor causa tela preta porque browserViews e editorTabs dessincronizam

**DEPOIS:**
```ts
const skipInvariantCheck = useRef(false)
const capturedBrowserViews = useRef<BrowserViewState[]>([])

const handleToggleEditorHidden = useCallback(() => {
  setEditorHidden(current => {
    const next = !current
    skipInvariantCheck.current = true
    if (next) {
      // Entrar detail-only
      const { toClose, toCapture } = enterDetailOnly(editorTabs)
      capturedTabs.current = toCapture
      capturedBrowserViews.current = browserViews.filter(v => toClose.includes(v.id))
      // Ordem: primeiro tabs, depois views
      setEditorTabs(prev => prev.filter(t => !toClose.includes(t.id)))
      setBrowserViews(prev => prev.filter(v => !toClose.includes(v.id)))
    } else {
      // Mostrar editor - restaurar
      const restored = showEditorRestore(capturedTabs.current, capturedBrowserViews.current)
      setEditorTabs(prev => [...prev, ...restored.tabs])
      setBrowserViews(prev => [...prev, ...restored.views])
    }
    setTimeout(() => skipInvariantCheck.current = false, 0)
    return next
  })
}, [editorTabs, browserViews])
```

### Passo 2 - Browser transient rule
Arquivo: `src/domain/sidePane.ts` + `App.tsx` + `EditorArea.tsx`

```ts
export function resolveDetailPanelVisible(activeTabType, editorContentVisible) {
  if (activeTabType === 'browser' && editorContentVisible) {
    return false // esconde detail temporariamente enquanto browser ativo e editor visível
  }
  return true
}

// Em App.tsx:
const detailVisible = resolveDetailPanelVisible(activeTab?.type, isEditorContentVisible(sidePaneState))

// Se editorHidden=true enquanto browser ativo, detail deve voltar com fallback Files
if (editorHidden && activeTab?.type === 'browser') {
  setDetailVisible(true)
  setAuxiliaryTab('files') // fallback Files, não branco
}
```

### Passo 3 - CannotClose managed tabs
Arquivo: `src/components/EditorArea.tsx` - onCloseTab

```ts
const handleCloseTab = (tabId) => {
  const tab = editorTabs.find(t => t.id === tabId)
  if (!isTabCloseable(tab, sidePaneState)) {
    return // não fecha Changes/Files enquanto detail-only
  }
  // ... fechar
}
```

### Passo 4 - Bordas residuais R-070
Arquivo: `src/styles/app.css`

```css
/* Ao recolher coluna, remover border residual */
.chat-centered .chat-pane { border-right: 0 }
.side-pane-closed .chat-pane { border-right: 0 }
.editor-hidden .editor-part { border: 0 }
```

### Critério E2E:
1. Abrir browser tab, validar que detail panel some temporariamente
2. Hide editor enquanto browser ativo, validar que detail mostra fallback Files, não branco
3. Entrar detail-only (hide editor), tentar fechar Changes tab, validar que não fecha
4. Hide/Show editor 10x rápido, validar sem tela preta/crash
5. Validar sem bordas residuais ao recolher (screenshot pixel diff)
6. Tentar split editor em single-pane -> notificar "Divisão indisponível: single-pane usa único grupo"

### Arquivos:
- src/domain/sidePane.ts, dockedAuxiliaryController.ts, agentWorkbenchLayout.ts
- src/App.tsx - editorHidden, editorMaximized
- src/components/EditorArea.tsx - MANAGED_TAB_TYPES, isTabCloseable
