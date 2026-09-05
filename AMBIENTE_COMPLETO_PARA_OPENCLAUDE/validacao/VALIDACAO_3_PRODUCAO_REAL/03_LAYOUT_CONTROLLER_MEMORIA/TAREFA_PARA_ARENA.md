# TAREFA PARA ARENA - LAYOUT CONTROLLER MEMORIA

## Objetivo: Fazer sistema lembrar estado das barras por sessão e por nova sessão (bug mais crítico do vídeo)

### Passo 1 - Implementar capture/restore na troca de sessão
Arquivo: `src/App.tsx`

**ANTES:**
```ts
setActiveSessionId(id)
```

**DEPOIS:**
```ts
import { captureSessionLayout, restoreSessionLayout, type SessionLayoutMap } from './domain/sessionLayout'
import { readNewSessionViewState, writeNewSessionViewState, toggleNewSessionAux, newSessionAuxVisible } from './domain/newSessionViewState'
import { createLayoutSync } from './domain/sessionLayoutSync'

// No boot:
const [sessionLayoutMap, setSessionLayoutMap] = useState<SessionLayoutMap>(() => loadLayoutState().sessionLayouts || {})
const [newSessionState, setNewSessionState] = useState(() => readNewSessionViewState(localStorage))

// Ao trocar sessão:
const selectSession = useCallback((newId: string) => {
  setActiveSessionId(prevId => {
    if (prevId) {
      const layout = { auxiliaryVisible, activeViewContainerId: activeViewContainerId }
      setSessionLayoutMap(map => captureSessionLayout(map, prevId, layout))
    }
    return newId
  })
  // Restaurar nova sessão
  const restored = restoreSessionLayout(sessionLayoutMap, newId, DEFAULT_SESSION_LAYOUT)
  setAuxiliaryVisible(restored.auxiliaryVisible)
  setActiveViewContainerId(restored.activeViewContainerId)
}, [auxiliaryVisible, activeViewContainerId, sessionLayoutMap])

// Ou usar createLayoutSync com observables para automatizar (ver sessionLayoutSync.ts)
```

### Passo 2 - New Session View State compartilhado
Arquivo: `App.tsx` + `SessionLanding.tsx` + `newSessionViewState.ts`

```ts
// No boot:
const newSessionViewState = readNewSessionViewState(localStorage)

// SessionLanding deve usar newSessionAuxVisible(state) para decidir se aux bar aparece
// Quando usuário toggle aux bar na landing:
const handleToggleAuxInLanding = () => {
  const next = toggleNewSessionAux(newSessionState)
  setNewSessionState(next)
  writeNewSessionViewState(next) // persistir imediatamente
}

// Ao criar sessão de verdade, usar seedCreatedFromNewSession(state) para estado inicial
```

### Passo 3 - Corrigir isChatCentered (bug 00:33)
Arquivo: `sidePane.ts` + `App.tsx` + `SessionLanding.tsx` + `app.css`

**ANTES:**
```css
.session-landing { position: absolute; inset: 0; z-index: 100; }
```

**DEPOIS:**
```css
.session-landing { display: flex; justify-content: center; align-items: center; max-width: 950px; margin: 0 auto; }
.session-landing-center { width: 100%; max-width: 640px; }
```

Landing deve ser filho do editor, centralizado, laterais continuam visíveis. `isChatCentered` retorna true SÓ quando SidePaneState === 'closed'.

### Passo 4 - Fix race condition Hide/Show Editor (tela preta)
Arquivo: `App.tsx` linha ~14029

```ts
const skipInvariantCheck = useRef(false)

const handleToggleEditorHidden = useCallback(() => {
  setEditorHidden(current => {
    const next = !current
    if (next) {
      // Entrar detail-only: primeiro capturar abas não-acopladas
      skipInvariantCheck.current = true
      const { toClose, toCapture } = enterDetailOnly(editorTabs)
      capturedTabs.current = toCapture
      setEditorTabs(prev => prev.filter(t => !toClose.includes(t.id)))
      // Depois browserViews
      setBrowserViews(prev => prev.filter(v => !toClose.some(id => id === v.id)))
      setTimeout(() => skipInvariantCheck.current = false, 0)
    } else {
      // Mostrar: restaurar na ordem correta: primeiro tabs, depois browserViews
      skipInvariantCheck.current = true
      const restored = showEditorRestore(capturedTabs.current)
      setEditorTabs(prev => [...prev, ...restored.tabs])
      setBrowserViews(prev => [...prev, ...restored.views])
      setTimeout(() => skipInvariantCheck.current = false, 0)
    }
    return next
  })
}, [editorTabs])
```

### Critério de aceite E2E (Playwright - mais importante):
1. Setup 2 sessões s1/s2, s1 sidebar 350px aux aberta Files editor visível, s2 aux fechada editor hidden, voltar s1 -> validar sidebar 350px aux aberta Files editor visível (restauração por sessão)
2. Na landing, fechar aux bar, F5 -> validar aux bar continua fechada
3. Criar nova sessão -> nova sessão herda aux bar fechada do newSessionViewState compartilhado
4. Bug 00:33: Apagar todas sessões, validar landing centralizada mas laterais NÃO escondidas (sidebar e aux bar ainda visíveis se estavam)
5. Hide/Show editor 10x rápido sem crash/tela preta, screenshot após cada toggle
6. Screenshots: estado por sessão antes/depois

### Arquivos afetados:
- src/domain/layoutController.ts (Desktop vs Mobile)
- src/domain/sessionLayout.ts (capture, restore, forget)
- src/domain/sessionLayoutSync.ts (autorun que detecta troca real)
- src/domain/newSessionViewState.ts (read/write localStorage)
- src/domain/sidePane.ts (isChatCentered, resolveSidePaneState)
- src/domain/dockedAuxiliaryController.ts (enterDetailOnly, showEditorRestore)
- src/App.tsx (onde deve usar createLayoutSync)
- src/components/SessionLanding.tsx (ler newSessionAuxVisible)
- src/styles/app.css (remover position:absolute)
