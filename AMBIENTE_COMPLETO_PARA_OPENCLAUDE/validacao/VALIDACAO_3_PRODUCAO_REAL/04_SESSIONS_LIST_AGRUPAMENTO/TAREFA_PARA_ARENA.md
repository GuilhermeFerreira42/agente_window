# TAREFA PARA ARENA - SESSIONS LIST AGRUPAMENTO

## Objetivo: Remover filtros fake e implementar agrupamento original com vários chats por workspace

### Passo 1 - Remover filtros que não existem no original
Arquivo: `src/components/SessionSidebar.tsx`
- Remover completamente: ORDENAR, STATUS, ESTADO, PROVEDOR, checkboxes Mi/Toi/Arquiva
- Isso foi inventado, não existe no spec. Ver SESSIONS_LIST.md original: só tem "Filtrar sessões" (um input único) + seções por tempo

**ANTES:**
```tsx
<div>ORDENAR <select>...</select></div>
<div>STATUS <select>...</select></div>
```

**DEPOIS:**
```tsx
<input placeholder="Filtrar sessões" value={query} onChange={e => setQuery(e.target.value)} />
```

### Passo 2 - Implementar agrupamento por tempo correto
Arquivo: `src/domain/sessionsList.ts` - função `buildSessionsList`

```ts
export function buildSessionsList(sessions: Session[], filters: SessionFilters, activeSessionId?: string): SessionGroup[] {
  // Seções na ordem original:
  const sections: SessionGroup[] = [
    { id: 'pinned', label: 'Fixadas', sessions: sessions.filter(s => s.pinned && !s.archived) },
    { id: 'a11y', label: 'Acessibilidade', sessions: sessions.filter(s => s.customGroup === 'a11y') },
    { id: 'quick', label: 'Quick Chats', sessions: sessions.filter(s => s.isQuickChat) },
    { id: 'today', label: 'Hoje', sessions: sessions.filter(s => s.section === 'today') },
    { id: 'yesterday', label: 'Ontem', sessions: sessions.filter(s => s.section === 'yesterday') },
    { id: 'lastWeek', label: 'Última semana', sessions: sessions.filter(s => s.section === 'lastWeek') },
    { id: 'older', label: 'Mais antigos', sessions: sessions.filter(s => s.section === 'older') },
    { id: 'archived', label: 'Arquivadas', sessions: sessions.filter(s => s.archived) },
  ]

  // Workspace capping: fora de busca, só primeiros 3 workspaces por seção
  if (!filters.query) {
    sections.forEach(section => {
      section.sessions = applyWorkspaceCapping(section.sessions, WORKSPACE_CAP, activeSessionId)
    })
  }

  // Filtro mantém sessão ativa visível sempre (R-015)
  if (filters.query) {
    sections.forEach(section => {
      section.sessions = section.sessions.filter(s => 
        sessionMatchesQuery(s, filters.query) || s.id === activeSessionId
      )
    })
  }

  return sections.filter(s => s.sessions.length > 0)
}

export const EMPTY_FILTERS: SessionFilters = { query: '', readState: 'all' }
export function applyWorkspaceCapping(sessions, cap, activeId) {
  // Só primeiros N workspaces, mas workspace ativo sempre promovido
}
```

### Passo 3 - Vários chats por workspace (MAIS IMPORTANTE - vídeo 03:13)
Arquivo: `types.ts` + `SessionSidebar.tsx` + `data.ts`

Session já tem `chats: NestedChat[]` e `mainChatId` - mas SessionSidebar só renderiza 1 chat (mainChat). Corrigir para renderizar TODOS aninhados como árvore:

```tsx
// Em SessionRow, após título, renderizar NestedChatRows
{showNested && (
  <div className="nested-chats">
    {session.chats.map((chat, index) => (
      <NestedChatRow
        key={chat.id}
        chat={chat}
        active={active && chat.id === activeChatId}
        last={index === session.chats.length - 1}
        onSelect={() => onSelectChat(chat.id)}
      />
    ))}
  </div>
)}
```

Cada NestedChatRow deve ter StatusIcon, unread dot, approval card (já existe, só usar)

### Passo 4 - Menu de contexto (R-072)
Arquivo: `SessionSidebar.tsx` + `ContextMenu.tsx`

Já existe ContextMenu component mas não é usado completamente. Ao clicar direito em SessionRow e NestedChatRow, abrir menu com:
- Fixar/Desafixar (Pin/PinOff)
- Renomear (F2)
- Arquivar/Desarquivar
- Excluir (Delete)
- Abrir ao lado (onOpenBeside - E14)
- Atribuir a grupo customizado (R-012) - submenu com grupos existentes + "Novo grupo"

```tsx
const openSessionMenu = (event, session) => {
  event.preventDefault()
  const existingGroups = Array.from(new Set(sessions.filter(s => s.customGroup).map(s => s.customGroup)))
  setContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      { label: session.pinned ? 'Desafixar' : 'Fixar', action: () => onTogglePinned(session.id) },
      { label: 'Renomear', action: () => onStartRename(session.id) },
      { label: session.archived ? 'Restaurar' : 'Arquivar', action: () => onToggleArchived(session.id) },
      { label: 'Excluir', action: () => onDelete(session.id), danger: true },
      { label: 'Abrir ao lado', action: () => onOpenBeside?.(session.id) },
      { label: 'Mover para grupo', submenu: existingGroups.map(g => ({ label: g, action: () => onAssignGroup(session.id, g) })) },
    ]
  })
}
```

### Passo 5 - Drag & Drop (R-085) e Teclado (R-076)
- `domain/dragAndDrop.ts` já tem `reorderSessions` e `reorderEditorTabs` - conectar em SessionSidebar: onDragStart, onDrop com DragTypes.SESSION
- Keyboard: implementar roving index com `isNavigationKey`, `nextRovingIndex` - já existe keyboardNavigation.ts

### Critério de aceite E2E:
1. Abrir app - validar que sidebar NÃO contém "ORDENAR" ou "PROVEDOR"
2. Validar seções: Fixadas, Quick Chats, Hoje existem
3. Criar 2 sessões no mesmo workspace "workspace-local" - validar que aparecem aninhadas sob mesmo workspace header, não como 2 workspaces separados
4. Criar 3 chats dentro da mesma sessão (usar + dentro da sessão) - validar que 3 NestedChatRow aparecem
5. Botão direito em sessão -> validar ContextMenu abre com opções Pin, Arquivar, Excluir
6. Drag: arrastar sessão de Hoje para Fixadas -> validar pin
7. Filtrar "Implementação" -> validar que workspace ativo continua visível mesmo se filtro não bate (R-015)
8. Screenshot: sidebar original vs réplica lado a lado - devem ter mesma estrutura

### Arquivos afetados:
- src/components/SessionSidebar.tsx (principal - remover filtros fake, implementar vários chats, menu contexto, drag)
- src/domain/sessionsList.ts (agrupamento, capping, filtros)
- src/domain/sectionOrder.ts
- src/domain/sessionsManagement.ts (custom groups)
- src/domain/dragAndDrop.ts (reorderSessions)
- src/domain/keyboardNavigation.ts (navegação)
- src/components/ContextMenu.tsx (já existe mas conectar)
