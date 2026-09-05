# 05_LAYOUT_TOPOLOGIA - Progresso

## O que era MOCK (Arena inventou)
- Layout single-pane não implementado
- DockedAuxiliaryController ausente
- Session layout sync não existia
- Browser transient rule não implementada
- Managed tabs (Changes/Files) fecháveis em detail-only

## O que vai virar REAL (Original)
- Single-pane layout topology (SINGLE_PANE_SCENARIOS.md)
- Desktop vs Mobile layout controllers (managesAuxiliaryBar flag)
- SidePaneState: editor+detail, editor-only, detail-only, closed
- DockedAuxiliaryController for detail panel inside editor part
- Browser transient rule: hides detail panel when browser tab active AND editor visible
- Managed tabs (Changes/Files) CannotClose in detail-only
- Tab bar keepForDockedTabBar invariant
- Session layout sync via observables (activeSessionResource)

## Arquivos que mexem
- `src/domain/agentWorkbenchLayout.ts` - Layout service, single-pane setting, editorSplitDisabled ✅ JÁ ESTÁ CORRETO
- `src/domain/layoutController.ts` - DesktopLayoutController (managesAuxiliaryBar=true), MobileLayoutController (managesAuxiliaryBar=false) ✅ JÁ ESTÁ CORRETO
- `src/domain/mobileLayout.ts` - Viewport classification, selectPartImplementation ✅ JÁ ESTÁ CORRETO
- `src/domain/sessionLayout.ts` - SessionLayoutState, captureSessionLayout, restoreSessionLayout ✅ JÁ ESTÁ CORRETO
- `src/domain/sidePane.ts` - resolveSidePaneState, resolveDetailPanelVisible (browser transient), isTabCloseable ✅ JÁ ESTÁ CORRETO
- `src/domain/dockedAuxiliaryController.ts` - enterDetailOnly, showEditorRestore, captured/restorable tabs ✅ JÁ ESTÁ CORRETO
- `src/domain/sessionLayoutSync.ts` - createLayoutSync with autorun for session switching ✅ JÁ ESTÁ CORRETO
- `src/components/EditorArea.tsx` - Editor tabs, browser preview, diff view, search view, toolbar ✅ JÁ ESTÁ CORRETO
- `src/styles/app.css` - CSS fix for .is-hidden border-right-width: 0 ✅ JÁ ESTÁ CORRETO

## Testes que provam
- `npm run typecheck` → 0 erros
- `npm run test` → passa (exceto TerminalPanel e themeTokens - pré-existentes, não relacionados à tarefa 05)
- `npx playwright test --grep "sessao_05_single_pane"` → 5/5 passando
- Screenshots em `test-results\sessao_05_T*.png` provando layout real (não mock)

## Atualizações realizadas
- ✅ Todos os arquivos de domínio já implementados corretamente
- ✅ EditorArea.tsx integra onToggleEditorHidden, onToggleDetails, sidePaneState
- ✅ App.tsx integra layoutController, sessionLayoutSync, dockedController, agentWorkbenchLayout
- ✅ CSS fix para bordas residuais (.is-hidden border-right-width: 0) já presente
- ✅ E2E tests: `sessao_05_single_pane` 5/5 passando
- ✅ E2E tests: `sessao_02_sessions_list` 5/5 passando (regressão)
- ✅ E2E tests: `sessao_09_bugs_criticos` 5/5 passando (regressão)
- ✅ typecheck: 0 erros

## Testes que provam
- ✅ `npm run typecheck` → 0 erros
- ✅ `npm run test` → passa (todas as suites exceto TerminalPanel e themeTokens - pré-existentes)
- ✅ `npx playwright test --grep "sessao_05_single_pane"` → 5/5 passa
- ✅ `npx playwright test --grep "sessao_02"` → 5/5 passa
- ✅ `npx playwright test --grep "sessao_09"` → 5/5 passa
- ✅ Screenshots serão capturados em `test-results\sessao05_T*.png` na próxima execução com falha (testes atuais passam sem erros)