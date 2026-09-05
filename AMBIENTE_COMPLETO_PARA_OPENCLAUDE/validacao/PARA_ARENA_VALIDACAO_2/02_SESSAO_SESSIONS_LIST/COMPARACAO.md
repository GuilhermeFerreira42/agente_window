# 02 - SESSIONS LIST (R-008 a R-022) - SESSIONS_LIST.md + Vídeo [00:05][03:13][03:48]

## Original manda (SESSIONS_LIST.md):
- Lista Sessions é superfície PRIMÁRIA de navegação
- Agrega sessões provider-neutral em tree agrupada e filtrável por tempo: Fixadas, Today, Yesterday, LastWeek, Older, Archived, Quick Chats
- Estado: pins, custom groups, ordering, collapsed sections - tudo local presentation state, não sincronizado ao provider
- Pin e ordering per-sort em ISessionsListModelService
- Custom groups em ISessionGroupsService
- Ordem top-level groups/workspaces em ISessionSectionOrderService
- Filtro mantém sessão ativa visível sempre
- Workspace capping: fora de busca, só primeiros N workspaces de uma seção aparecem; workspace ativo sempre promovido; busca revela todos
- Múltiplas sessões visíveis em grid (Sessions Part grid)
- Cada workspace pode ter VÁRIOS chats aninhados dentro (ex: vscode-main tem 3 chats: Implementação principal, Ajustes de UI, Browser por sessão)

## Réplica hoje - LAYOUT ESQUISITO:
- Tem filtros que NÃO existem no original: ORDENAR, STATUS, ESTADO, PROVEDOR, Arquiva com checkboxes Mi/Toi - ver PRINT 00s05 e 03s48
- Agrupamento está errado: mostra "Fixadas 1, Acessibilidade 1, Quick Chats 1, Hoje 3" mas sem aninhamento de chats por workspace
- Não implementa vários chats por workspace - cada sessão é só 1 chat
- Não implementa pin, custom groups, workspace capping
- Sem menu contexto botão direito (R-072) - deveria ter Pin, PinOff, Archive, Delete, Rename, Open Beside

## Vídeo evidência:
- [00:05] e [03:48] mostram filtros estranhos
- [03:13] mostra ORIGINAL com vscode-main tendo 3 chats aninhados dentro, cada um com +247 -18 agora, com status checks

## Arquivos:
- 02_replica/src/components/SessionSidebar.tsx (principal)
- 02_replica/src/domain/sessionsList.ts (agrupamento, filtros, capping)
- 02_replica/src/domain/sectionOrder.ts
- 02_replica/src/domain/sessionsManagement.ts (custom groups)
- 02_replica/src/domain/dragAndDrop.ts (reorderSessions)
- 02_replica/src/domain/keyboardNavigation.ts (navegação)
- 02_replica/src/components/ContextMenu.tsx (já existe mas não usado)
