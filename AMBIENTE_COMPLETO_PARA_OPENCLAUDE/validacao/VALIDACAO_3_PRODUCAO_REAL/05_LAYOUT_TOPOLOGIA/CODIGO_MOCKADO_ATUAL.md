# CODIGO MOCKADO ATUAL - LAYOUT

## Arquivo: src/App.tsx - PanelGroup

```tsx
<PanelGroup direction="horizontal">
  <Panel defaultSize={20}><SessionSidebar /></Panel>
  <PanelResizeHandle />
  <Panel defaultSize={50}><ChatPanel /></Panel>
  <PanelResizeHandle />
  <Panel defaultSize={30}><EditorArea /></Panel>
</PanelGroup>
```

Usa react-resizable-panels mas `partSizesForSession` só retorna [50,50] fixo, não salva por sessionId

## Arquivo: src/domain/layoutPersistence.ts

```ts
export function partSizesForSession(sessionId) {
  return [50, 50] // fixo!
}
export function saveLayoutState() {
  // salva sidebarWidth mas não restaura corretamente - clamp funciona mas não aplica no style
}
```

## Arquivo: src/styles/app.css vs original workbench.css

Original tem:
- .monaco-workbench .part.sessionspart com background var(--vscode-agentsPanel-background), border-radius 8px
- .monaco-workbench .part.sidebar com background transparent
- .monaco-workbench .part.editor com border e radius

Réplica tem CSS simples sem tokens, sem flexible logic
