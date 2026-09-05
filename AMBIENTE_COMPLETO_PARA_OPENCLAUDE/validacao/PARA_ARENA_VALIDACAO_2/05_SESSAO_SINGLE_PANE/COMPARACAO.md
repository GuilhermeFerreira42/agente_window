# 05 - SINGLE PANE (R-036 a R-044) - SINGLE_PANE_SCENARIOS.md

## Original manda:
- Single-pane layout é default quando setting habilitado, phone sempre classic
- Editor e Auxiliary Bar compõem um side pane ao lado da sessão ativa
- Main Editor suporta exatamente 1 editor group, sem split
- Transições: editor+detail, editor-only, detail-only, closed
- Browser é transient: tab Browser esconde detail panel temporariamente mas só enquanto editor visível
- Se editor hidden enquanto Browser ativo, panel mostra fallback Changes/Files, não fica em branco
- Managed tabs (Changes/Files) não podem fechar enquanto detail-only (CannotClose)
- Docked: ao entrar detail-only fecha abas não-acopladas, captura restauráveis, descarta Search sujo
- Tab bar permanece em detail-only (keepForDockedTabBar)

## Réplica hoje:
- sidePane.ts tem isEditorContentVisible, resolveSidePaneState, resolveDetailPanelVisible, isTabCloseable - parece OK estático mas não testado dinâmico
- dockedAuxiliaryController.ts tem enterDetailOnly, showEditorRestore mas App.tsx não chama na ordem correta
- R-070: Bordas residuais ao recolher colunas - CSS deixa border
- R-040: CRASH no Mostrar Editor (race condition)

## Arquivos:
- domain/sidePane.ts, dockedAuxiliaryController.ts, agentWorkbenchLayout.ts
- App.tsx - editorHidden, editorMaximized
- EditorArea.tsx - MANAGED_TAB_TYPES, isTabCloseable
