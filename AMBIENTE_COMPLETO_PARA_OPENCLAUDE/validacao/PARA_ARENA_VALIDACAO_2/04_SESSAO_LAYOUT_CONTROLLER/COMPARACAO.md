# 04 - LAYOUT CONTROLLER (R-029 a R-035) - BUG MAIS CRÍTICO DO VÍDEO [00:05][00:33]

## Original manda (LAYOUT_CONTROLLER.md):
- Cada sessão possui working set (editores visíveis, visibilidade panel e classic aux-bar)
- Todo estado flui de activeSession observable, nunca events
- Quando múltiplas sessões visíveis no grid, sync per-session suprimido
- Working sets NÃO são limpos em multi-session
- Auxiliary bar totalmente skipado em mobile web
- Ao sair da sessão captura auxiliaryBarVisible + activeViewContainerId
- Uncreated sessions compartilham UM ÚNICO estado (sessions.newSessionViewState) - se usuário ocultou aux bar numa sessão nova, permanece oculto entre trocas e reloads

## Réplica hoje - BUG DO VÍDEO:
- [00:05] Usuário deixa 2 barras abertas, mas ao trocar sessão elas reaparecem/fecham errado - não captura/restaura por sessão
- [00:33] Novo chat inicia escondendo laterais em vez de só centralizar meio - isChatCentered errado
- [00:17] Browser deveria abrir de acordo com o que usuário deixou, mas abre sempre fechado
- `captureSessionLayout` e `restoreSessionLayout` existem mas nunca chamados no App.tsx na troca real de sessão
- `newSessionViewState` sempre DEFAULT, nunca lê do localStorage

## Arquivos críticos:
- src/domain/layoutController.ts (Desktop vs Mobile)
- src/domain/sessionLayout.ts (capture, restore, forget)
- src/domain/sessionLayoutSync.ts (autorun que detecta troca real)
- src/domain/newSessionViewState.ts (read/write localStorage)
- src/domain/sidePane.ts (isChatCentered, resolveSidePaneState, resolveDetailPanelVisible)
- src/domain/dockedAuxiliaryController.ts (enterDetailOnly, showEditorRestore)
- src/App.tsx - onde deveria usar createLayoutSync
- src/components/SessionLanding.tsx - deveria ler newSessionAuxVisible
