# TAREFA - SESSIONS CORE

## Objetivo: Fazer draft virar sessão real sem precisar mandar "oi"

### Passo 1 - Corrigir selectProviderForNewSession
Arquivo: `domain/sessionsManagement.ts`
- Atualmente: retorna primeiro provider
- Correto: verificar `provider.workspaces` - se vazio atende qualquer um, se tem lista deve conter workspace atual
- Implementar `resolvableWorkspaces()` para listar workspaces disponíveis

### Passo 2 - Commit de draft ao enviar primeira mensagem
Arquivo: `App.tsx` - função `handleNewSession` e `handleSend`
- Hoje: cria Session com `isDraft: true` e fica nisso
- Correto (SESSIONS.md §Drafts): "uma nova sessão é rascunho até primeiro envio; ao enviar entra no catálogo commitado. Abandonar descarta"
- Ao chamar `onSubmit(text)` da SessionLanding, deve:
  1. Criar id, chatId
  2. setSessions com isDraft=false
  3. setActiveChatBySession
  4. Criar browserView e editorTab já com sessionId

### Passo 3 - Ciclo de vida working/completed
Arquivo: `domain/sessionState.ts` + `App.tsx`
- Quando envia mensagem, status deve ir para 'working' (shimmer)
- Depois de resposta simulada, vai para 'completed'
- Implementar transição via `updateSessionAndChatStatus`

### Critério de aceite:
- Criar nova sessão NÃO exige mandar "oi" pra criar estrutura
- Draft só existe até primeiro envio, depois some da lista de drafts
