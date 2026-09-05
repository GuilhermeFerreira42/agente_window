# 01 - SESSIONS CORE (R-001 a R-007) - SESSIONS.md

## Original manda (SESSIONS.md):
- ISessionsManagementService agrega sessões de TODOS providers, resolve workspaces, seleciona provider para novas sessões
- Possui drafts pendentes: workspace-session, quick-chat, automation
- NÃO possui estado ativo/visível/foco/layout (isso é ISessionsService)
- ISessionsService possui sessão ativa e foco
- Ciclo de vida: untitled -> working -> needs-input/completed/error -> working (pode voltar a trabalhar)

## Réplica hoje:
- `domain/sessionsManagement.ts` existe mas `selectProviderForNewSession` sempre retorna primeiro provider, ignora workspaces
- `sessionState.ts` tem `statusTransitions` correto mas `updateSessionAndChatStatus` não é usado no App.tsx ao receber nova mensagem
- `isDraft` criado mas nunca commitado corretamente - draft fica pendente pra sempre

## Vídeo:
Não aparece direto, mas explica porque precisa mandar "oi" pra abrir arquivo - draft não commita.

## Arquivos:
- 02_replica/src/domain/sessionsManagement.ts
- 02_replica/src/domain/sessionState.ts
- 02_replica/src/domain/sessionsService.ts (se existir)
- 02_replica/src/types.ts (Session.isDraft, createdSeq)
- 02_replica/src/App.tsx - handleNewSession, handleSendMessage
