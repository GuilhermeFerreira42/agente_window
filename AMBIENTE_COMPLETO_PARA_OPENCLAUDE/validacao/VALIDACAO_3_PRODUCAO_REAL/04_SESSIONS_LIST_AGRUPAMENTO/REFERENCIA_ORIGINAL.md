# REFERENCIA ORIGINAL - SESSIONS LIST

## Original: sessions/SESSIONS_LIST.md

```
Sessions list é superfície PRIMÁRIA de navegação. Agrega provider-neutral sessions em tree agrupada e filtrável por tempo.

Ownership:
- Session catalog e lifecycle: ISessionsManagementService
- Pin e per-sort ordering: ISessionsListModelService
- Custom groups e membership: ISessionGroupsService
- Top-level group/workspace order: ISessionSectionOrderService

Placement precedence:
Archived > Pinned > Custom group > Quick chat > Workspace or date group

- Archived só em archived section
- Pinned em pinned section
- Valid custom-group membership places unpinned, unarchived session in that group, including quick chat
- Remaining unpinned quick chats em dedicated chats section
- Remaining sessions follow selected workspace or date grouping

Durable user intent: Pin, group, ordering state survives temporary provider-catalog removal.

Sorting: created-time e updated-time sorting. Manual ordering stores list-owned sort keys.

Filters compose across session type, status, archive/read state, provider. Find widget matches session e section labels e bypasses presentation capping while search active.

Drag and drop: sessions may reorder within valid sections, move into user-created groups, move into pinned section, user groups e workspace sections may reorder.

Active session remains visible even when filter would otherwise exclude it.

Workspace capping: fora de busca, só primeiros N workspaces de uma seção aparecem; workspace ativo sempre promovido; busca revela todos.
```

## Original: sessionsList.ts (187kb) + dnd.ts + menus.ts

```ts
// Original grouping
export interface ISessionSection { id, label, sessions }
export interface ISessionGroupItem { group, sessions, isEmpty, editing }

export const SessionItemContextMenuId = MenuId.SessionItemContextMenu;
export const NEW_SESSION_FOR_WORKSPACE_ACTION_ID = 'sessionsView.sectionNewSession';

// Drag
export const SessionsDataTransfers = { SESSION: 'application/vnd.code.session', CHAT: 'application/vnd.code.session.chat' }
export class DraggedSessionIdentifier { constructor(sessionId, resource) {} }
```

## Original: seu vídeo [03:13] - vscode-main tem 3 chats aninhados
```
vscode-main (workspace)
  ├─ Implementação principal (chat 1) +247 -18 agora
  ├─ Ajustes de UI (chat 2)
  └─ Browser por sessão (chat 3)
```
Cada NestedChatRow tem StatusIcon, unread dot, approval card.
