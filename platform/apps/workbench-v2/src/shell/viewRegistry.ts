// FATIA-05 5.1 (docs/24 §4 · ADR-03) — registro das views do chassi.
// Fonte de verdade para a Activity Bar e para a Side Bar: ids, títulos (inglês, D3),
// codicon (codepoints do codicon.ttf já embarcado pelo módulo explorer-search) e o
// container onde a view mora (`'left' | 'right'`, D11 — hoje todas à direita).

export type ViewId = 'explorer' | 'search' | 'scm'
export type ViewContainerSide = 'left' | 'right'

export interface ViewDescriptor {
  readonly id: ViewId
  /** Título do painel (h2 uppercase via CSS) e base do tooltip. */
  readonly title: string
  /** Tooltip completo como no VS Code: "Explorer (Ctrl+Shift+E)". */
  readonly ariaLabel: string
  /** Classe codicon real (regra `.codicon-<x>::before` em activityBar.css). */
  readonly codicon: 'files' | 'search' | 'source-control'
  readonly container: ViewContainerSide
  readonly order: number
}

const VIEWS: readonly ViewDescriptor[] = [
  { id: 'explorer', title: 'Explorer', ariaLabel: 'Explorer (Ctrl+Shift+E)', codicon: 'files', container: 'right', order: 0 },
  { id: 'search', title: 'Search', ariaLabel: 'Search (Ctrl+Shift+F)', codicon: 'search', container: 'right', order: 1 },
  { id: 'scm', title: 'Source Control', ariaLabel: 'Source Control (Ctrl+Shift+G)', codicon: 'source-control', container: 'right', order: 2 },
]

export const DEFAULT_VIEW_ID: ViewId = 'explorer'

export function isViewId(value: unknown): value is ViewId {
  return VIEWS.some((v) => v.id === value)
}

/** Views de um container, na ordem da Activity Bar. */
export function viewsFor(container: ViewContainerSide): readonly ViewDescriptor[] {
  return VIEWS.filter((v) => v.container === container).sort((a, b) => a.order - b.order)
}

/** 5.5: onde a view mora em tempo de execução (persistido no layoutState). `'left'|'right'` continua sendo o LADO da Side Bar. */
export type ViewContainer = 'sideBar' | 'panel'
export interface ViewLayout {
  readonly sideBar: readonly ViewId[]
  readonly panel: readonly ViewId[]
}
export const ALL_VIEW_IDS: readonly ViewId[] = VIEWS.map((v) => v.id)
export const DEFAULT_VIEW_LAYOUT: ViewLayout = { sideBar: viewsFor('right').map((v) => v.id), panel: [] }

/** Válido = cada view registrada aparece exatamente 1× somando os dois containers. */
export function isViewLayout(value: unknown): value is ViewLayout {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  if (!Array.isArray(v.sideBar) || !Array.isArray(v.panel)) return false
  const all = [...v.sideBar, ...v.panel]
  if (all.length !== ALL_VIEW_IDS.length) return false
  return ALL_VIEW_IDS.every((id) => all.filter((x) => x === id).length === 1)
}

/** Move `id` para `container` na posição `index` (clampada); reordena se já estiver lá. Puro. */
export function moveViewInLayout(layout: ViewLayout, id: ViewId, container: ViewContainer, index: number): ViewLayout {
  const sideBar = layout.sideBar.filter((v) => v !== id)
  const panel = layout.panel.filter((v) => v !== id)
  const target = container === 'sideBar' ? sideBar : panel
  const at = Math.max(0, Math.min(Math.floor(index), target.length))
  target.splice(at, 0, id)
  return { sideBar, panel }
}

export function viewsByIds(ids: readonly ViewId[]): readonly ViewDescriptor[] {
  return ids.map((id) => getView(id))
}

export function getView(id: ViewId): ViewDescriptor {
  const view = VIEWS.find((v) => v.id === id)
  if (!view) throw new Error(`viewRegistry: view desconhecida "${id}"`)
  return view
}
