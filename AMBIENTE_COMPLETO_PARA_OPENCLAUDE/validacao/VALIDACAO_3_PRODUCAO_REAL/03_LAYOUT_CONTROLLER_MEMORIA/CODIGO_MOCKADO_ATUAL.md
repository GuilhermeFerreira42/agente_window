# CODIGO MOCKADO ATUAL - LAYOUT CONTROLLER

## Arquivo: src/domain/layoutController.ts + sessionLayout.ts + newSessionViewState.ts

Existe mas nunca usado corretamente em App.tsx:

```ts
// sessionLayout.ts
export function captureSessionLayout(map, sessionId, layout) {
  return { ...map, [sessionId]: layout }
}
export function restoreSessionLayout(map, sessionId, defaultLayout) {
  return map[sessionId] ?? defaultLayout
}

// newSessionViewState.ts
export function readNewSessionViewState(localStorage) { ... }
export function writeNewSessionViewState(state) { ... }
export const DEFAULT_SESSION_LAYOUT = { auxiliaryVisible: true, activeViewContainerId: 'files' }
```

## Arquivo: src/App.tsx - ONDE DEVERIA USAR E NÃO USA

```ts
// Hoje: troca direta sem capturar
const selectSession = (id) => {
  setActiveSessionId(id) // sem capturar layout anterior!
}

// Deveria:
const selectSession = (newId) => {
  // Antes de trocar, capturar layout da sessão anterior
  if (previousSessionId) {
    const layout = { auxiliaryVisible, activeViewContainerId }
    setSessionLayoutMap(captureSessionLayout(map, previousSessionId, layout))
  }
  // Depois restaurar nova sessão
  const restored = restoreSessionLayout(map, newId, DEFAULT)
  setAuxiliaryVisible(restored.auxiliaryVisible)
  setActiveViewContainerId(restored.activeViewContainerId)
  setActiveSessionId(newId)
}
```

## Arquivo: src/components/SessionLanding.tsx

```tsx
// Hoje: position:absolute cobrindo tudo, esconde laterais
<section className="session-landing" style={{ position: 'absolute', inset: 0 }}>
```

Deveria ser filho do editor, centralizado com max-width 950px, laterais continuam visíveis.

## Arquivo: src/domain/sidePane.ts

```ts
export function isChatCentered(sidePaneState) {
  return sidePaneState === 'closed' // editor+detail fechados
}
// Mas SessionLanding está com CSS errado que esconde laterais
```
