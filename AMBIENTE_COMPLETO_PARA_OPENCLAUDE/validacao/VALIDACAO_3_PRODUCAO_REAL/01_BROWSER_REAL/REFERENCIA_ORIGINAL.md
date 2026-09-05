# REFERENCIA ORIGINAL - BROWSER

## Original: sessions/contrib/sessions/browser/views/sessionBrowserView.ts + browserOwnership
Arquivo original em `01_original/sessions/browser/` - 2.015 arquivos.

```ts
// Original Microsoft - BrowserViewState real
export interface BrowserViewState {
  id: string;
  sessionId: string; // pertence a uma sessão
  title: string;
  url: string;
  history: string[]; // histórico fica com a sessão
  historyIndex: number;
  status: 'loading' | 'ready' | 'error';
  viewport: 'desktop' | 'tablet' | 'mobile';
  reloadToken: number;
}

export function getBrowserViewsForSession(views: BrowserViewState[], sessionId: string) {
  return views.filter(v => v.sessionId === sessionId);
}

export function removeBrowserResourcesForSession(sessionId: string) {
  // Arquivar sessão destrói browser
}
```

## Original: workbench.css - Editor part
```css
.monaco-workbench .part.editor:not(.modal-editor-part) {
  background: var(--vscode-agentsPanel-background);
  border: 1px solid var(--vscode-agentsPanel-border);
  border-radius: 8px;
}
```

## Original: LAYOUT_CONTROLLER.md - Browser pertence à sessão
- Browser tab e view são par - remover um remove outro
- Switching sessions hides it; archiving disposes it
- History stays with active session
- Viewport can be desktop/tablet/mobile

## Limitação web real
Na web, iframe não pode carregar google.com por X-Frame-Options. Original usa Electron webview que pode.
Solução honesta: usar iframe src real, e quando falhar mostrar "Site bloqueia incorporação - X-Frame-Options"
