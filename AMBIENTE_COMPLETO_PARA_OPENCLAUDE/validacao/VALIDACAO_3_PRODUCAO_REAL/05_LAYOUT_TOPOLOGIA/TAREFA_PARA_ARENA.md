# TAREFA PARA ARENA - LAYOUT TOPOLOGIA

### Passo 1 - Topologia fixa
Arquivo: `src/App.tsx` + `src/styles/app.css`

Garantir ordem: Titlebar em cima, Sidebar esquerda com width variável via --sidebar-width CSS var, Main region com Sessions Part + Editor + Aux Bar

```tsx
<div className="workbench">
  <Titlebar />
  <div className="workbench-body">
    <div className="sidebar" style={{ '--sidebar-width': `${sidebarWidth}px` }}>
      <SessionSidebar />
    </div>
    <div className="main-region">
      <div className="sessions-part" style={{ flex: 1 }}><ChatPanel /></div>
      <div className="editor-part"><EditorArea /></div>
      <div className="auxiliary-bar"><AuxiliaryBar /></div>
    </div>
    <Panel><TerminalPanel /></Panel>
  </div>
</div>
```

CSS:
```css
.workbench-body { display: flex; flex-direction: row; }
.sidebar { width: var(--sidebar-width); flex-shrink: 0; }
.main-region { display: flex; flex: 1; }
.sessions-part { flex: 1; } /* flexible que absorve resize */
.editor-part, .auxiliary-bar { flex-shrink: 0; /* preserva tamanho */ }
```

Sessions Part deve ser flexível (flex:1), absorver resize. Implementar partSizesForSession salvando tamanhos por sessionId no localStorage (LAYOUT_STORAGE_KEY)

### Passo 2 - Custom View Grid
Quando CustomizationsView ativa, deve esconder Sessions Part, Editor, Aux Bar, Panel - só Titlebar e Sidebar ficam. Abrir sessão deve dismiss custom view.

```ts
const [customViewActive, setCustomViewActive] = useState(false)

{customViewActive ? (
  <CustomViewGrid />
) : (
  <>
    <SessionsPart />
    <EditorPart />
    <AuxiliaryBar />
  </>
)}
```

### Passo 3 - Tab bar invariante
Em single-pane, tab bar permanece visível mesmo quando editorHidden=true (keepForDockedTabBar)

Em `EditorArea.tsx`:
```tsx
// Tab bar sempre visível, mesmo quando editorContentVisible=false
<div className="editor-tabs-bar" style={{ display: isTabBarVisible(sidePaneState) ? 'flex' : 'none' }}>
  {tabs.map(tab => ...)}
</div>
<div className="editor-content" style={{ display: editorContentVisible ? 'block' : 'none' }}>
  {/* Monaco, Browser, etc */}
</div>
```

### Critério E2E:
1. Redimensionar sidebar para 350px, F5, validar que continua 350px
2. Esconder editor, validar que tab bar continua visível
3. Abrir Customizations, validar que Editor e Aux somem
4. Clicar em sessão, validar que Customizations fecha
5. Resize janela, validar que só Sessions Part absorve delta, não Sidebar

### Arquivos:
- src/App.tsx (workbench-body, PanelGroup)
- src/domain/layoutPersistence.ts (partSizesForSession por sessionId)
- src/components/SessionSidebar.tsx, EditorArea.tsx, AuxiliaryBar.tsx
- src/styles/app.css vs original workbench.css
