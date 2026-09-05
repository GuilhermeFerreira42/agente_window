# TAREFA PARA ARENA - BROWSER REAL

## Objetivo: Browser por sessão com histórico real, não srcDoc fixo

### Passo 1 - Trocar srcDoc por src real
Arquivo: `02_replica/src/components/EditorArea.tsx` - componente BrowserPreview

**ANTES (mock):**
```tsx
const srcDoc = `<!doctype html>...Contextual browser...`
<iframe srcDoc={srcDoc} />
```

**DEPOIS (real):**
```tsx
const [loadError, setLoadError] = useState(false)
// Tentar carregar URL real, mas tratar X-Frame-Options
<iframe
  src={view.url} // URL real, não srcDoc
  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
  onLoad={() => onStatus('ready')}
  onError={() => { onStatus('error'); setLoadError(true) }}
/>
{view.status === 'error' && (
  <div className="browser-error-banner">
    <strong>Falha ao carregar - site bloqueia incorporação (X-Frame-Options)</strong>
    <span>Original usa Electron webview que pode carregar qualquer site. Na web, sites como Google bloqueiam iframe por segurança.</span>
    <button onClick={onReload}>Tentar novamente</button>
    <button onClick={() => window.open(view.url, '_blank')}>Abrir em nova aba</button>
  </div>
)}
```

### Passo 2 - Criar browserView com sessionId sempre
Arquivo: `02_replica/src/App.tsx` - openBrowser, createBrowser
- Garantir que browserView sempre tem sessionId = activeSessionId
- Ao abrir arquivo sem mandar oi, deve criar tab com sessionId (hoje só cria se tiver chat)

```ts
const newView: BrowserViewState = {
  id: genId(),
  sessionId: activeSessionId, // SEMPRE com sessionId
  title: 'Preview',
  url: normalizedUrl,
  history: [normalizedUrl],
  historyIndex: 0,
  status: 'loading',
  viewport: 'desktop',
  reloadToken: 0
}
```

### Passo 3 - Filtrar por sessão
Já existe `getBrowserViewsForSession` - usar no EditorArea:
```ts
const visibleBrowsers = getBrowserViewsForSession(browserViews, activeSessionId)
```

### Passo 4 - Sincronizar tab e view
Ao fechar tab browser, remover view junto:
```ts
onCloseTab: (id) => {
  const tab = editorTabs.find(t => t.id === id)
  if (tab.type === 'browser' && tab.browserId) {
    setBrowserViews(prev => prev.filter(v => v.id !== tab.browserId))
  }
  setEditorTabs(prev => prev.filter(t => t.id !== id))
}
```

### Critério de aceite E2E (Playwright):
1. Abrir app sem mandar oi, clicar New Browser -> tab abre
2. Digitar "https://example.com" (site que permite iframe) -> carrega de verdade, não mostra "Contextual browser"
3. Digitar "https://google.com" -> mostra banner honesto "Site bloqueia incorporação" + botão "Abrir em nova aba" (não fica em loading infinito)
4. Criar s1 e s2, abrir browser em cada, trocar -> só browser da sessão ativa aparece
5. Fechar tab browser -> view some, browserViews.length diminui
6. Back/Forward funcionam no history da sessão

### Arquivos afetados:
- src/components/EditorArea.tsx (principal)
- src/App.tsx (createBrowser, openBrowser, closeTab)
- src/domain/browserOwnership.ts (já existe, só usar)
