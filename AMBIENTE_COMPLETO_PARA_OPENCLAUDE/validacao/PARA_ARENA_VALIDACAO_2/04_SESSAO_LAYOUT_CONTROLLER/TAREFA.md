# TAREFA - LAYOUT CONTROLLER - RESOLVER PORTAS QUE BATEM SOZINHAS

## Objetivo: Fazer sistema lembrar estado das barras por sessão e por nova sessão

### Passo 1 - Implementar capture/restore na troca de sessão
Arquivo: App.tsx
- Hoje: setActiveSessionId direto sem capturar layout anterior
- Correto:
```ts
// Antes de trocar
if (previousSessionId) {
  const layout = { auxiliaryVisible, activeViewContainerId }
  setSessionLayoutMap(captureSessionLayout(map, previousSessionId, layout))
}
// Depois de trocar
const restored = restoreSessionLayout(map, newSessionId, DEFAULT_SESSION_LAYOUT)
setAuxiliaryVisible(restored.auxiliaryVisible)
setActiveViewContainerId(restored.activeViewContainerId)
```
- Usar `createLayoutSync` com observables para automatizar (ver sessionLayoutSync.ts)

### Passo 2 - New Session View State compartilhado
Arquivo: App.tsx + SessionLanding.tsx + newSessionViewState.ts
- No boot: `readNewSessionViewState(localStorage)` -> estado
- SessionLanding deve usar `newSessionAuxVisible(state)` para decidir se aux bar aparece na landing
- Quando usuário toggle aux bar na landing, chamar `toggleNewSessionAux` + `writeNewSessionViewState` imediatamente
- Ao criar sessão de verdade, usar `seedCreatedFromNewSession(state)` para estado inicial

### Passo 3 - Corrigir isChatCentered (bug 00:33)
Arquivo: sidePane.ts + App.tsx + SessionLanding.tsx
- `isChatCentered` deve retornar true SÓ quando SidePaneState === 'closed' (editor+detail fechados)
- Hoje SessionLanding está com position:absolute cobrindo tudo e escondendo laterais
- Correto: Landing deve ser filho do editor, centralizado com max-width 950px, laterais continuam visíveis
- CSS: .session-landing { display:flex; justify-content:center; } não absolute

### Passo 4 - Fix race condition Hide/Show Editor
Arquivo: App.tsx linha ~14029 (skipInvariantCheck)
- Já existe flag skipInvariantCheck mas não usada corretamente
- Ao esconder editor: enterDetailOnly captura abas não-acopladas
- Ao mostrar: showEditorRestore restaura
- Ordem: primeiro abas, depois browserViews (se inverter quebra com tela preta - já descoberto em teste E2E anterior)

### Critério de aceite:
- Abrir app com sidebar 300px e aux bar aberta, trocar de sessão, voltar - deve estar igual
- Fechar aux bar numa sessão, trocar, voltar - deve continuar fechada SÓ naquela sessão
- F5 - estado persiste
- Nova sessão: se usuário ocultou aux bar na landing, próxima landing também oculto
- Clicar Novo Chat NÃO esconde laterais, só centraliza input no meio
