# CODIGO MOCKADO ATUAL - BROWSER

## Arquivo: 02_replica/src/components/EditorArea.tsx linha ~100

```tsx
const srcDoc = `<!doctype html><html lang="en"><head>...</head><body><main>
<nav><strong>Agent Sessions</strong><span>›</span><span>${escapeHtml(view.url)}</span></nav>
<h1>Contextual browser for this session.</h1>
<p>This browser tab belongs to <strong>${escapeHtml(view.sessionId)}</strong>. Switching sessions hides it; archiving the session disposes it.</p>
<div class="grid"><div class="card"><strong>Session scope</strong><span>History stays with the active session.</span></div>...
</main></body></html>`

<iframe
  key={`${view.id}-${view.reloadToken}-${view.url}`}
  className="browser-frame"
  title={`Browser ${view.url}`}
  srcDoc={srcDoc}  // <-- SEMPRE HTML estático, nunca carrega URL real
  onLoad={() => onStatus('ready')}
  onError={() => onStatus('error')}
/>
```

## Por que não funciona
- Usa `srcDoc` fixo com texto "Contextual browser for this session" - nunca usa `view.url` real
- `normalizeBrowserAddress` existe mas só normaliza string, não carrega
- `onLoad` sempre dispara ready mesmo sem carregar nada
- É simulação proposital, não browser real

## Arquivo: App.tsx
```ts
const createBrowser = () => {
  const sessionId = activeSession.id
  const id = `browser-${sessionId}-${Date.now()}`
  // cria view com url = 'https://agents.local/' fixo
}
```
URL sempre `https://agents.local/` - mock
