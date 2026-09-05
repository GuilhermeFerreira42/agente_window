# REFERENCIA ORIGINAL - MENU CONTEXTO, DRAG & DROP, TECLADO

## Original: sessions/browser/menus.ts

```ts
export const Menus = {
  SessionsTitle: new MenuId('SessionsTitle'),
  SessionItemContextMenu: MenuId.SessionItemContextMenu, // menu contexto sessão
  SessionSectionToolbar: new MenuId('SessionSectionToolbar'),
  SessionGroupToolbar: new MenuId('SessionGroupToolbar'),
  SidebarFooter: new MenuId('SessionsSidebarFooter'),
  SessionChatItemContext: new MenuId('SessionsSessionChatItemContext'), // menu chat aninhado
  SessionsEditorTabsBarContext: new MenuId('SessionsEditorTabsBarContext'), // menu abas editor
}
```

Original tem menu contexto em: sessões, chat aninhado, abas, arquivos, painel detalhes, footer.

## Original: sessions/browser/dnd.ts

```ts
export const SessionsDataTransfers = {
  SESSION: 'application/vnd.code.session',
  CHAT: 'application/vnd.code.session.chat',
}

export class DraggedSessionIdentifier {
  constructor(readonly sessionId: string, readonly resource: URI) {}
}

export function fillSessionChatDragData(e: DragEvent, sessionId: string, resource: URI) {
  const data: IDraggedSessionChat = { sessionId, resource: resource.toString() };
  e.dataTransfer?.setData(SessionsDataTransfers.CHAT, JSON.stringify(data));
}

export function isSessionChatDrag(e: DragEvent, sessionId?: string): boolean {
  if (!e.dataTransfer?.types.includes(SessionsDataTransfers.CHAT)) return false;
  return sessionId === undefined || e.dataTransfer.types.includes(getSessionChatDragType(sessionId));
}
```

Drag muda só presentation state ou abre sessões via ISessionsService:
- sessions may reorder within valid sections
- sessions may move into user-created groups
- non-archived sessions may move into pinned section
- user groups e workspace sections may reorder
- dropping sessions on Sessions grid opens them via ISessionsService
- Archived e fixed sections não são reorder targets

## Original: keyboardNavigation.ts - roving focus

Original tem navegação por teclado: Tab, ArrowUp/Down, Enter, Escape, F2 rename, Delete excluir, roving index que respeita ordem visual, seções colapsadas e filtros.
