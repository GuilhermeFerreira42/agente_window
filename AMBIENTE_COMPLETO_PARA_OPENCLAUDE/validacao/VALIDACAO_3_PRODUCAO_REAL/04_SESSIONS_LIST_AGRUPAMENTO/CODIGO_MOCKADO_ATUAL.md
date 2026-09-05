# CODIGO MOCKADO ATUAL - SESSIONS LIST

## Arquivo: src/components/SessionSidebar.tsx

```ts
// Filtros que NÃO existem no original - inventados pela Arena
const [sortMode, setSortMode] = useState<SortMode>('manual')
const [readState, setReadState] = useState<SessionFilters['readState']>('all')
const [providerFilter, setProviderFilter] = useState<string>('')
const [statusFilter, setStatusFilter] = useState<string>('')
const [includeArchived, setIncludeArchived] = useState(true)
```

No JSX renderiza:
```tsx
<div>ORDENAR</div>
<div>STATUS</div>
<div>ESTADO</div>
<div>PROVEDOR</div>
<input type="checkbox"> Mi/Toi/Arquiva
```
Isso foi inventado, não existe no spec original. Ver LAYOUT original: só tem "Filtrar sessões" (um input único)

## Arquivo: src/domain/sessionsList.ts

```ts
export function buildSessionsList(sessions, filters) {
  // Agrupamento errado: mostra "Fixadas 1, Acessibilidade 1, Quick Chats 1, Hoje 3" mas sem aninhamento de chats por workspace
  // Não implementa vários chats por workspace - cada sessão é só 1 chat
  // Não implementa pin, custom groups, workspace capping
}
```

## Arquivo: src/types.ts

```ts
export interface Session {
  chats: NestedChat[] // já tem array de chats!
  mainChatId: string
}
// Mas SessionSidebar só renderiza 1 chat (mainChat), não todos aninhados
```

## Arquivo: src/domain/sessionsManagement.ts

```ts
export function selectProviderForNewSession() {
  return providers[0] // sempre primeiro, ignora workspaces
}
```

## ContextMenu.tsx existe mas não usado em SessionSidebar para todos casos, só parcial
