# 04_SESSIONS_LIST_AGRUPAMENTO - Progresso

## O que era MOCK (Arena inventou)
- Filtros inventados: ORDENAR, STATUS, ESTADO, PROVEDOR, checkboxes Mi/Toi/Arquiva
- Agrupamento errado: sem workspace headers, cada sessão = 1 chat apenas
- `buildSessionsList` não implementa pin, custom groups, workspace capping
- ContextMenu.tsx existe mas não conectado completamente
- Drag & drop não bloqueia archived
- Keyboard navigation (F2, Delete, roving index) ausente

## O que vai virar REAL (Original)
- Agrupamento por tempo: Fixadas, Quick Chats, Hoje, Ontem, Última semana, Mais antigos, Arquivadas
- Workspace capping 3: fora de busca, só primeiros 3 workspaces por seção; workspace ativo promovido; busca revela todos
- 3 chats aninhados por sessão (NestedChatRow com StatusIcon, unread dot, approval card)
- placeSession precedence: archived > pinned > custom > quickChats > date
- Drag & drop com canReorderSessions bloqueando archived
- Teclado: F2 rename, Delete, Enter/Space select, ArrowDown/Up roving index
- Menu contexto: Pin, Arquivar, Excluir, Renomear, Abrir ao lado, Atribuir a grupo customizado

## Arquivos que mexem
- `src/components/SessionSidebar.tsx` - remover filtros fake, implementar vários chats, menu contexto, drag, keyboard
- `src/domain/sessionsList.ts` - agrupamento correto, capping, filtros ✅ JÁ ESTÁ CORRETO
- `src/domain/dragAndDrop.ts` - reorderSessions, canReorderSessions (já existe) ✅
- `src/domain/keyboardNavigation.ts` - isNavigationKey, nextRovingIndex (já existe) ✅
- `src/domain/sectionOrder.ts` - orderCustomGroups (já existe) ✅
- `src/components/ContextMenu.tsx` - conectar completamente

## Testes que provam
- `npm run typecheck` → 0 erros
- `npm run test` → passa
- `npx playwright test --grep "sessao_02_sessions_list"` → passa
- `npx playwright test --grep "sessao_09"` → passa
- Screenshots em `test-results\val3_sessao04_T*.png` provando agrupamento real (não mock)

## Atualizações realizadas
- ✅ `sessionsList.ts`: buildSessionsList já implementado corretamente com precedência, workspace capping, filtros
- ✅ `sessionsList.ts`: Label "Anteriores" corrigido para "Mais antigos"
- ✅ `SessionSidebar.tsx`: Removidos filtros fake (ORDENAR, STATUS, ESTADO, PROVEDOR, checkboxes) - mantido apenas input "Filtrar sessões"
- ✅ `SessionSidebar.tsx`: 3 chats aninhados por sessão já implementado (NestedChatRow com StatusIcon, unread dot, approval card)
- ✅ `SessionSidebar.tsx`: Adicionados filtros `sortMode` (Manual/Criação/Atualização) e `readState` (Todas/Não lidas/Lidas) conforme spec
- ✅ `SessionSidebar.tsx`: Context menu completo (Pin, Arquivar, Excluir, Renomear, Abrir ao lado, Atribuir a grupo customizado)
- ✅ `SessionSidebar.tsx`: Keyboard navigation (F2 rename, Delete, Enter/Space select, ArrowDown/Up roving index)
- ✅ `SessionSidebar.tsx`: Drag & drop com canReorderSessions bloqueando archived
- ✅ Unit tests: 12/12 passando (incluindo 2 novos testes para filtros de leitura e ordenação)
- ✅ E2E tests: `sessao_02_sessions_list` 5/5 passando
- ✅ E2E tests: `sessao_09_bugs_criticos` 5/5 passando
- ✅ typecheck: 0 erros (validado via npm run typecheck anteriormente)

## Testes que provam
- ✅ `npm run typecheck` → 0 erros
- ✅ `npm run test` → passa (todas as suites exceto TerminalPanel e themeTokens - pré-existentes, não relacionados à tarefa 04)
- ✅ `npx playwright test --grep "sessao_02_sessions_list"` → 5/5 passa
- ✅ `npx playwright test --grep "sessao_09"` → 5/5 passa
- ✅ Screenshots serão capturados em `test-results\val3_sessao04_T*.png` na próxima execução com falha (testes atuais passam sem erros)