# CODIGO MOCKADO ATUAL - MENU, DRAG, TECLADO

## Arquivo: src/components/ContextMenu.tsx - existe mas uso parcial

```tsx
export interface ContextMenuState {
  x: number
  y: number
  items: { label: string, action: () => void, danger?: boolean, submenu?: ... }[]
}

export function ContextMenu({ state, onClose }) {
  // Existe e funciona, mas não é usado em todos lugares
}
```

## Arquivo: src/components/SessionSidebar.tsx - menu parcial

```ts
const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

const openSessionMenu = (event, session) => {
  event.preventDefault()
  // Coleta grupos existentes para submenu
  const existingGroups = Array.from(new Set(sessions.filter(s => s.customGroup).map(s => s.customGroup)))
  setContextMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      { label: session.pinned ? 'Desafixar' : 'Fixar', action: () => onTogglePinned(session.id) },
      // ... mas não tem Open Beside, Atribuir a grupo completo
    ]
  })
}

// Drag existe:
<div
  draggable={!editing}
  onDragStart={onDragStart}
  onDragOver={onDragOver}
  onDrop={onDrop}
>
```

Mas:
- Não tem menu em Workspace Files (AuxiliaryBar)
- Não tem menu em Editor tabs completo (só fechar)
- Não tem menu em Terminal
- Drag de workspace section não implementado
- Drop no Sessions grid não abre via ISessionsService

## Arquivo: src/domain/dragAndDrop.ts - existe mas parcial

```ts
export function reorderSessions(sessions, fromId, toId) { ... }
export function reorderEditorTabs(tabs, fromId, toId) { ... }
export const DragTypes = { SESSION: 'application/vnd.code.session', EDITOR_TAB: '...' }
```

Existe mas canReorderSessions não verifica se section é archived/fixed (deveria bloquear)

## Arquivo: src/domain/keyboardNavigation.ts - existe

```ts
export function isNavigationKey(key) { return ['ArrowUp', 'ArrowDown', 'Enter', ' '].includes(key) }
export function nextRovingIndex(key, { count, current }) { ... }
```

Existe mas SessionSidebar handleListKeyDown só funciona para [data-session-nav], não para nested chats, não para editor tabs
