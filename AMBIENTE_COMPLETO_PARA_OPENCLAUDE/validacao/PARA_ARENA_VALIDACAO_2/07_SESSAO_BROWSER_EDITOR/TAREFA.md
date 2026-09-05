# TAREFA - BROWSER & EDITOR - RESOLVER "SÓ ABRE SE MANDAR OI"

### Passo 1 - Criar browserView e editorTab com sessionId sempre
Arquivo: App.tsx - funções openBrowser, openEditorTab
- Hoje: só cria se activeSession existe E tem chat
- Correto: criar SEMPRE com sessionId = activeSessionId atual, mesmo se draft
- Ao abrir file:
```ts
const newTab: EditorTab = { id: genId(), type: 'file', title: fileName, path: filePath, sessionId: activeSessionId }
setEditorTabs(prev => [...prev, newTab])
setActiveTabId(newTab.id)
```
- Ao abrir browser:
```ts
const view: BrowserViewState = { id: genId(), sessionId: activeSessionId, title: 'Preview', url: 'https://...', history: [...], ... }
const tab: EditorTab = { id: genId(), type: 'browser', browserId: view.id, sessionId: activeSessionId, title: view.title }
setBrowserViews(prev => [...prev, view])
setEditorTabs(prev => [...prev, tab])
```

### Passo 2 - Fix getEditorTabsVisibleForSession já está correto, mas initial data não
- initialEditorTabs deve ter pelo menos 1 tab global (Files) sem sessionId + 1 tab por sessão existente com sessionId
- initialBrowser deve ter sessionId da primeira sessão

### Passo 3 - Fix travamento (race condition)
- Em App.tsx já existe skipInvariantCheck ref
- Envolver hide/show editor em transaction:
```ts
skipInvariantCheck.current = true
setEditorTabs(...)
setBrowserViews(...)
setTimeout(() => skipInvariantCheck.current = false, 0)
```
- assertWorkbenchInvariants só deve rodar quando skipInvariantCheck false

### Passo 4 - Monaco com conteúdo real (prepara para FS)
- EditorArea usa @monaco-editor/react - hoje recebe diffFiles com original/modified mockado
- Deve receber file content real via prop

### Critério:
- Sem mandar mensagem, clicar em arquivo no Workspace Files -> deve abrir tab no editor
- Abrir browser -> deve abrir tab browser + view
- Fechar tab browser -> view some junto
- Trocar sessão -> tabs da outra sessão não aparecem (só globais + da sessão ativa)
- Hide/Show 10x sem crash
