# TAREFA - SESSIONS LIST - CORRIGIR LAYOUT ESQUISITO

## Objetivo: Remover filtros fake e implementar agrupamento original com vários chats por workspace

### Passo 1 - Remover filtros que não existem no original
Arquivo: `SessionSidebar.tsx`
- Remover completamente: ORDENAR, STATUS, ESTADO, PROVEDOR, checkboxes Mi/Toi/Arquiva
- Isso foi inventado, não existe no spec. Ver LAYOUT original: só tem "Filtrar sessões" (um input único)

### Passo 2 - Implementar agrupamento por tempo correto
Arquivo: `domain/sessionsList.ts` - função `buildSessionsList`
- Implementar seções na ordem: Fixadas (pinned), Acessibilidade, Quick Chats, Hoje, Ontem, LastWeek, Older, Arquivadas
- Cada seção tem collapsed state (pode recolher)
- Função `sessionProvider` deve retornar data correta
- Implementar `EMPTY_FILTERS`, `applyWorkspaceCapping` com WORKSPACE_CAP=3

### Passo 3 - Vários chats por workspace (MAIS IMPORTANTE - vídeo 03:13)
Arquivo: `types.ts` + `SessionSidebar.tsx` + `data.ts`
- Session já tem `chats: NestedChat[]` e `mainChatId`
- Mas `SessionSidebar` só renderiza 1 chat (mainChat)
- Corrigir para renderizar TODOS os chats aninhados dentro da sessão, como árvore:
```
vscode-main (workspace)
  ├─ Implementação principal (chat 1)
  ├─ Ajustes de UI (chat 2)
  └─ Browser por sessão (chat 3)
```
- Cada NestedChatRow deve ter StatusIcon, unread dot, approval card

### Passo 4 - Menu de contexto (R-072)
Arquivo: `SessionSidebar.tsx` + `ContextMenu.tsx`
- Já existe ContextMenu component mas não é usado
- Ao clicar direito em SessionRow e NestedChatRow, abrir menu com:
  - Fixar/Desafixar (Pin/PinOff)
  - Renomear
  - Arquivar/Desarquivar
  - Excluir
  - Abrir ao lado (onOpenBeside - E14)
  - Atribuir a grupo customizado (R-012)

### Passo 5 - Drag & Drop (R-085) e Teclado (R-076)
- `domain/dragAndDrop.ts` já tem `reorderSessions` e `reorderEditorTabs`
- Conectar em SessionSidebar: onDragStart, onDrop com DragTypes.SESSION
- Keyboard: implementar roving index com `isNavigationKey`, `nextRovingIndex`

### Critério de aceite:
- Barra esquerda NÃO tem mais ORDENAR/STATUS
- Tem seções Fixadas, Hoje, Ontem, Quick Chats
- Cada workspace mostra vários chats aninhados
- Botão direito abre menu com Pin, Arquivar, Excluir, Renomear
- Drag & drop de sessões funciona
- Filtro "Filtrar sessões" mantém sessão ativa visível (R-015)
