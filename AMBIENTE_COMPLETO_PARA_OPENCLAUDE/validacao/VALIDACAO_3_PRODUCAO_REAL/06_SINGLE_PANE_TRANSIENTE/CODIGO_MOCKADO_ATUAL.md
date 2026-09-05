# CODIGO MOCKADO ATUAL - SINGLE PANE

## Arquivo: src/domain/sidePane.ts - parece OK estático mas não testado dinâmico

```ts
export function isEditorContentVisible(state) { ... }
export function resolveSidePaneState(...) { ... }
export function resolveDetailPanelVisible(activeTabType, editorVisible) {
  // Lógica existe mas não conectada corretamente em App.tsx
}
export function isTabCloseable(tab, sidePaneState) { ... } // existe mas EditorArea não verifica
```

## Arquivo: src/domain/dockedAuxiliaryController.ts

```ts
export function enterDetailOnly(tabs) {
  // Existe mas App.tsx não chama na ordem correta
  // Deveria: fechar abas não-acopladas, capturar restauráveis, descartar Search sujo
}
export function showEditorRestore(captured) {
  // Existe mas ordem errada causa tela preta
}
```

## Arquivo: src/App.tsx

```ts
const [editorHidden, setEditorHidden] = useState(false)
const [editorMaximized, setEditorMaximized] = useState(false)

// Já existe skipInvariantCheck ref mas não usada corretamente
// Ao esconder editor: enterDetailOnly captura abas não-acopladas
// Ao mostrar: showEditorRestore restaura
// Ordem: primeiro abas, depois browserViews (se inverter quebra com tela preta)
```

## Arquivo: src/components/EditorArea.tsx

```ts
// MANAGED_TAB_TYPES = ['diff', 'files'] - Changes/Files são managed
// onCloseTab não verifica isTabCloseable - deixa fechar mesmo em detail-only (deveria bloquear)
```

## R-070 Bordas residuais - CSS deixa border ao recolher coluna
