# TAREFA PARA ARENA - MENU CONTEXTO, DRAG & DROP, TECLADO

### R-072 Menu Contexto - completar
Arquivos: `SessionSidebar.tsx`, `EditorArea.tsx`, `AuxiliaryBar.tsx`, `TerminalPanel.tsx`, `ContextMenu.tsx`

Já existe ContextMenu component com state {x,y,items}. Conectar em todos lugares:

**SessionRow (já parcial, completar):**
```tsx
onContextMenu={e => openSessionMenu(e, session)}
// Menu deve ter:
[
  { label: session.pinned ? 'Desafixar' : 'Fixar', action: () => onTogglePinned(id) },
  { label: 'Renomear (F2)', action: () => onStartRename(id) },
  { label: session.archived ? 'Restaurar' : 'Arquivar', action: () => onToggleArchived(id) },
  { label: 'Excluir', action: () => onDelete(id), danger: true },
  { label: 'Abrir ao lado', action: () => onOpenBeside?.(id) }, // E14
  { label: 'Mover para grupo', submenu: existingGroups.map(g => ({ label: g, action: () => onAssignGroup(id, g) })) },
  { label: 'Novo grupo', action: () => onCreateGroupFromSession(id) },
]
```

**NestedChatRow:**
```tsx
onContextMenu={e => openChatMenu(e, chat)}
// Menu: Renomear, Excluir, Abrir ao lado
```

**EditorArea tab:**
```tsx
onContextMenu={e => openTabMenu(e, tab)}
// Menu: Fechar, Fechar outros, Fechar à direita, Fechar todos, Copiar path
```

**AuxiliaryBar Workspace Files (NOVO - não existe):**
```tsx
<div onContextMenu={e => openFileMenu(e, file)}>
// Menu: Abrir, Renomear, Excluir, Revelar no Explorer, Novo arquivo, Nova pasta
```

**TerminalPanel:**
```tsx
onContextMenu={e => openTerminalMenu(e)}
// Menu: Copiar, Colar, Limpar, Novo terminal, Dividir
```

### R-085 Drag & Drop - completar
Arquivos: `SessionSidebar.tsx`, `EditorArea.tsx`, `domain/dragAndDrop.ts`

**SessionSidebar:**
```tsx
draggable={!editing}
onDragStart={e => {
  e.dataTransfer.setData(DragTypes.SESSION, session.id)
  e.dataTransfer.setData('text/plain', session.title)
  setDraggingId(session.id)
}}
onDragOver={e => {
  e.preventDefault()
  if (canReorderSessions(sessions, draggingId, session.id)) {
    setDropOverId(session.id)
  }
}}
onDrop={e => {
  e.preventDefault()
  if (draggingId && draggingId !== session.id) {
    onReorderSessions(draggingId, session.id)
  }
  setDraggingId(null)
  setDropOverId(null)
}}
```

Em `dragAndDrop.ts`:
```ts
export function canReorderSessions(sessions, fromId, toId) {
  const from = sessions.find(s => s.id === fromId)
  const to = sessions.find(s => s.id === toId)
  // Archived e fixed sections não são reorder targets
  if (from.archived || to.archived) return false
  if (from.section === 'pinned' && to.section !== 'pinned') return false // só pode mover dentro de pinned ou para pinned
  return true
}
```

**Workspace section drag:**
- Arrastar workspace header reordena workspaces (sectionOrder.ts)

**Drop no Sessions grid:**
- Drop de sessão no ChatPanel abre via onOpenBeside (ISessionsService)

### R-076 Teclado - completar
Arquivo: `domain/keyboardNavigation.ts` + `SessionSidebar.tsx` + `EditorArea.tsx`

Implementar roving index completo:
```tsx
const [focusedIndex, setFocusedIndex] = useState(0)
const listRef = useRef<HTMLDivElement>(null)

const handleListKeyDown = (e) => {
  if (!isNavigationKey(e.key)) return
  const target = e.target as HTMLElement
  if (target.matches('input, textarea, select')) return // não sequestrar dentro de inputs
  const container = listRef.current
  if (!container) return
  const rows = Array.from(container.querySelectorAll<HTMLElement>('[data-session-nav="true"]'))
  if (rows.length === 0) return
  const activeElement = document.activeElement as HTMLElement
  const current = activeElement ? rows.indexOf(activeElement) : -1
  const targetIndex = nextRovingIndex(e.key, { count: rows.length, current })
  if (targetIndex < 0) return
  e.preventDefault()
  rows[targetIndex]?.focus()
  setFocusedIndex(targetIndex)
}

// Enter seleciona, F2 rename, Delete excluir
onKeyDown={e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() }
  if (e.key === 'F2') onStartRename()
  if (e.key === 'Delete') { e.preventDefault(); onDelete() }
  if (e.key === 'Escape') { setContextMenu(null) }
}}
```

### R-070 Bordas residuais, R-073 Search Pill, R-083 Changes Pill

**Bordas:**
```css
.chat-centered .chat-pane { border-right: 0 }
.side-pane-closed .chat-pane { border-right: 0 }
```

**Search pill:**
```tsx
// Titlebar.tsx
<button onClick={() => setSessionPickerOpen(true)}>Search</button>
// SessionsPicker já existe como overlay, só conectar
```

**Changes pill:**
```tsx
<button onClick={() => onOpenDiff()}>Changes {diffCount}</button>
```

### Critério E2E:
1. Botão direito em sessão -> menu aparece com 6+ opções -> clicar Excluir -> sessão some
2. Botão direito em arquivo Workspace Files -> menu com Novo arquivo, Nova pasta
3. Botão direito em tab editor -> menu Fechar, Fechar outros
4. Drag sessão 1 para posição 3 -> ordem muda, persiste após F5
5. Drag sessão de Hoje para Fixadas -> pin
6. Focar sidebar com Tab, ArrowDown 3x, Enter -> sessão selecionada muda
7. F2 em sessão -> entra modo rename, digitar novo nome, Enter -> renomeia
8. Delete em sessão -> confirmação, Enter -> exclui
9. Recolher sidebar -> validar sem border residual (screenshot pixel diff)
10. Clicar Search pill -> picker flutuante abre com input e lista filtrável
11. Clicar Changes pill -> Changes view abre

### Arquivos:
- src/components/SessionSidebar.tsx (menu completo, drag completo, teclado completo)
- src/components/EditorArea.tsx (menu tabs, drag tabs, teclado)
- src/components/AuxiliaryBar.tsx (NOVO menu arquivos)
- src/components/TerminalPanel.tsx (menu terminal)
- src/components/ContextMenu.tsx (já existe, só usar)
- src/domain/dragAndDrop.ts (canReorderSessions com regras archived/fixed)
- src/domain/keyboardNavigation.ts (roving index)
- src/styles/app.css (bordas residuais)
