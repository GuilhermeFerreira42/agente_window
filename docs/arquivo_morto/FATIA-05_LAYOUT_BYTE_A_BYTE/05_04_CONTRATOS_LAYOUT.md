# 05_04 — Contratos do Layout (propostos; congelam na homologação da 5.1)

## 0. O que NÃO muda (congelado desde a FATIA-04)
`IExplorerModule` (`mount/unmount`), `ISearchApi`, `IEditorAttachApi` (`attach.{open,close,closeAll,getTabs,save,setVisible,setWidth,setMaximized,isMaximized}`), eventos `explorer.fileOpened`, `editor.diffChanged`, `AttachDiffPayload`, API HTTP `/fs/*` e `/git/*`, `GitService`, `EditorService`. **Só extensões aditivas** são permitidas.

## 1. `src/core/viewRegistry.ts`
```ts
export type ViewId = 'explorer' | 'search' | 'scm' | (string & {});
export interface ViewDescriptor {
  id: ViewId;
  title: string;            // "Explorer" | "Search" | "Source Control" (strings em arquivo *Strings.ts, PT-BR só se o shell for PT-BR)
  codicon: string;          // 'files' | 'search' | 'source-control'
  order: number;            // ordem na Activity Bar
  keybinding?: string;      // 'Ctrl+Shift+E' …
  mount(host: HTMLElement, ctx: { sessionId: string }): () => void;  // retorna unmount
  badge?: () => number | null;            // contagem (SCM: git.count())
  onBadgeChanged?: (cb: () => void) => () => void;
}
export interface ViewRegistry {
  register(v: ViewDescriptor): () => void;
  list(): ViewDescriptor[];               // ordenado por order
  get(id: ViewId): ViewDescriptor | undefined;
  onChanged(cb: () => void): () => void;
}
```
- Views são registradas por quem as possui (o módulo `explorer-search` na 5.2/5.3 via `index.ts` aditivo; nunca pelo shell).
- **Não** conhece React: `mount(host)` — mesmo padrão LEGO do `IExplorerModule.mount`.

## 2. `ILayoutApi` (estado do chassi) — `src/core/layoutState.ts`
```ts
export interface LayoutState {
  activeView: ViewId | null;   // null = Side Bar fechada
  sideBarWidth: number;        // px, min 170, default min(300, largura/4)
  panelVisible: boolean;       // Terminal
  // 5.4 (se aprovado): activityBarLocation, panelLocation — ver 05_05 §5.4
}
export interface ILayoutApi {
  getState(): LayoutState;
  setActiveView(id: ViewId | null): void;   // toggle se id === activeView
  toggleSideBar(): void;
  setSideBarWidth(px: number): void;
  onChanged(cb: (s: LayoutState) => void): () => void;
}
```
Persistência (`localStorage`, chave `agentsWindow.layout.v1`): `activeView`, `sideBarWidth`, `panelVisible`. Chave **versionada**; leitura tolerante a lixo.

## 3. Eventos (aditivos ao barramento existente)
| Evento | Payload | Quem emite | Quem ouve |
|---|---|---|---|
| `layout.viewChanged` | `{ activeView }` | `ILayoutApi` | Activity Bar (estado checked), Side Bar (view visível), E2E |
| `layout.sideBarResized` | `{ width }` | sash | persistência |
| `explorer.fileOpened` (existente) | `{ uri, preview }` | Explorer | **5.3+: `EditorGroup` (central) em vez do Anexo** — a troca de destino é feita no ponto único de `App.tsx` já autorizado |
| `editor.diffChanged` (existente) | `AttachDiffPayload` | ChangesPane | `EditorGroup` (5.3) |

## 4. Extensões aditivas no módulo (`modules/explorer-search/index.ts`) — 5.2/5.3
```ts
// aditivo, sem quebrar attachApiFor/mount existentes
export function registerViews(registry: ViewRegistry, opts: { sessionId: string }): () => void;
//  registra 'search' (SearchPanel) e 'scm' (ChangesPane + CommitInput) montando os MESMOS componentes React
export function mountEditorGroup(host: HTMLElement, opts: { sessionId: string }): IEditorAttachApi; // 5.3: mesmo EditorService/EditorTabs/CodeEditorPane/DiffPane em host central
```

## 5. DOM/testids (para E2E e prints)
`[data-testid=activity-bar]`, `[data-testid=activity-item-<id>]` (+ `aria-pressed`, `.badge .badge-content`), `[data-testid=side-bar]`, `[data-testid=side-bar-title]`, `[data-testid=side-bar-view-<id>]`, `[data-testid=editor-group]`, `[data-testid=editor-group-tabs]`. Classes CSS espelham o VS Code (`.part.activitybar`, `.part.sidebar`, `.composite.title`, `.pane-header`) para comparação visual.

## 6. Configurabilidade (5.4) — contrato condicionado à decisão do usuário
Se aprovado apesar do perfil `agentsWindow` readOnly: `LayoutState.activityBarLocation: 'default'|'top'|'bottom'|'hidden'`, `panelLocation: 'bottom'|'right'|'left'`, persistidos na mesma chave; **default = valores do agentsWindow**.
