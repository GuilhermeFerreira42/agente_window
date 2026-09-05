# COMPORTAMENTO REAL - SESSIONS LIST

## Vídeo novo [00:05][03:13][03:48]
- [00:05] e [03:48] mostram filtros estranhos ORDENAR/STATUS que não existem no original
- [03:13] mostra ORIGINAL com vscode-main tendo 3 chats aninhados dentro, cada um com +247 -18 agora, com status checks
- [03:40] Original tem menu contexto com Pin, Arquivar, etc

## Comportamento original real
1. Lista Sessions é superfície primária, tree agrupada por tempo: Fixadas, Today, Yesterday, LastWeek, Older, Archived, Quick Chats
2. Cada workspace pode ter VÁRIOS chats aninhados dentro (ex: vscode-main tem 3 chats)
3. Estado: pins, custom groups, ordering, collapsed sections - tudo local presentation state, não sincronizado ao provider
4. Pin e ordering per-sort em ISessionsListModelService
5. Custom groups em ISessionGroupsService
6. Ordem top-level groups/workspaces em ISessionSectionOrderService
7. Filtro mantém sessão ativa visível sempre (R-015)
8. Workspace capping: fora de busca, só primeiros 3 workspaces de seção aparecem; workspace ativo sempre promovido; busca revela todos
9. Múltiplas sessões visíveis em grid (Sessions Part grid)
10. Menu contexto botão direito: Pin, PinOff, Archive, Delete, Rename, Open Beside (E14), Atribuir a grupo

## O que deveria acontecer
- Barra esquerda NÃO tem ORDENAR/STATUS/ESTADO/PROVEDOR
- Tem seções Fixadas, Hoje, Ontem, Quick Chats, LastWeek, Older, Arquivadas
- Cada workspace mostra vários chats aninhados (tree)
- Botão direito abre menu com Pin, Arquivar, Excluir, Renomear, Abrir ao lado, Atribuir a grupo customizado
- Drag & drop de sessões reordena, move para Fixadas, move para grupo customizado
- Filtrar "Implementação" mantém sessão ativa visível mesmo se filtro não bate
