# REFERENCIA ORIGINAL - SINGLE PANE

## Original: sessions/SINGLE_PANE_SCENARIOS.md

```
Single-pane layout é default quando setting habilitado, phone sempre classic
Editor e Auxiliary Bar compõem um side pane ao lado da sessão ativa
Main Editor suporta exatamente 1 editor group, sem split
Transições: editor+detail, editor-only, detail-only, closed
Browser é transient: tab Browser esconde detail panel temporariamente mas só enquanto editor visível
Se editor hidden enquanto Browser ativo, panel mostra fallback Changes/Files, não fica em branco
Managed tabs (Changes/Files) não podem fechar enquanto detail-only (CannotClose)
Docked: ao entrar detail-only fecha abas não-acopladas, captura restauráveis, descarta Search sujo
Tab bar permanece em detail-only (keepForDockedTabBar)
```

## Original: sessions/browser/parts/singlePaneEditorPart.ts + singlePaneAuxiliaryBarPart.ts

```ts
// Original: single-pane detail panel
// - Editor e Aux Bar compõem side pane
// - Transições governadas por SidePaneState
// - Browser transient rule: activeTabType === 'browser' && editorContentVisible => hide detail panel temporariamente
// - Se editorHidden enquanto Browser ativo, detail mostra fallback Files, não branco
// - Managed tabs (Changes/Files) CannotClose enquanto detail-only
```

## Original: sidePane.ts (réplica já tem parte, mas não testado dinâmico)

```ts
export function isEditorContentVisible(sidePaneState) { ... }
export function resolveSidePaneState(...) { ... }
export function resolveDetailPanelVisible(activeTabType, editorContentVisible) {
  if (activeTabType === 'browser' && editorContentVisible) return false // esconde detail temporariamente
  return true
}
export function isTabCloseable(tab, sidePaneState) {
  if (sidePaneState === 'detail-only' && isManagedTab(tab)) return false // CannotClose
}
```
