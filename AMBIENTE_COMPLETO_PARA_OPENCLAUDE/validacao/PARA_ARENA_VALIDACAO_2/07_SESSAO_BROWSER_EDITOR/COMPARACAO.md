# 07 - BROWSER & EDITOR (R-059 a R-063 + vídeo 01:11/01:33)

## Original manda (cenários E2E 01-05):
- Chat response, chat with changes, session in sidebar, navigate sessions, full workflow
- Editor deve abrir via IEditorService, não direto no group
- BrowserViewState tem id, sessionId, title, url, history, historyIndex, status, viewport, reloadToken
- getBrowserViewsForSession filtra por sessionId
- getEditorTabsVisibleForSession: tabs sem sessionId são globais (Search, workspace files), com sessionId só da sessão
- Browser tab e view são par - remover um remove outro (removeBrowserResourcesForSession, removeBrowserResourceForTab)
- assertBrowserOwnership valida bidirecional

## Réplica hoje - BUG CRÍTICO VÍDEO 01:11:
- EditorArea clica em arquivo e nada acontece porque editorTabs iniciais não tem sessionId e browserViews só tem 1 inicial sem sessionId
- getEditorTabsVisibleForSession retorna vazio se sessionId não bate
- Para abrir arquivo precisa mandar "oi" porque handleSend cria browserView com sessionId
- Travamento [01:33] porque assertWorkbenchInvariants dispara quando browserViews e editorTabs dessincronizados entre renders durante hide/show

## Arquivos:
- components/EditorArea.tsx (BrowserPreview, tabs, onSelectTab)
- domain/browserOwnership.ts
- domain/editorTabs.ts (resolveVisibleEditorTabId, resolveNextEditorTabId)
- types.ts (BrowserViewState, EditorTab)
- data.ts (initialEditorTabs, initialBrowser - MOCK)
- App.tsx - openBrowser, openEditorTab, closeEditorTab, selectEditorTab
