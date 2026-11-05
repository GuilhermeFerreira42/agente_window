// FATIA-05 5.1 c2 — estado do chassi (docs/24 §4 5.1, RF-02, RF-14, D11, D17, D22–D25).
// Persistência em `workbench.layoutState.v1` (chave nova — não colide com as existentes).
// `activityBarPosition` é gravado desde a 5.1 mesmo que só a 5.4 o leia (D11).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_VIEW_ID, DEFAULT_VIEW_LAYOUT, isViewId, isViewLayout, moveViewInLayout, type ViewContainer, type ViewContainerSide, type ViewId, type ViewLayout } from './viewRegistry'

/** FATIA-05 5.4 (RF-10): posição da Activity Bar. `top`/`bottom` são aceitos pelo tipo mas ADIADOS
 * (D2.64) — não são persistidos nem restaurados; `left`/`right` = ViewContainerSide. */
export type ActivityBarPosition = ViewContainerSide | 'top' | 'bottom'
export const ACTIVITY_BAR_POSITIONS: readonly ActivityBarPosition[] = ['left', 'right', 'top', 'bottom']
/** Posições que o layout já sabe renderizar (5.4). */
export const SUPPORTED_ACTIVITY_BAR_POSITIONS: readonly ActivityBarPosition[] = ['left', 'right']
export function isSupportedActivityBarPosition(p: unknown): p is ViewContainerSide { return p === 'left' || p === 'right' }

export const LAYOUT_STATE_KEY = 'workbench.layoutState.v1'

/** Régua medida no 8080 (05_01 §2 / D23). */
export const SIDE_BAR_MIN_WIDTH = 170
export const SIDE_BAR_DEFAULT_MAX = 300
export const EDITOR_MIN_WIDTH = 220

export interface LayoutState {
  /** null = ainda não arrastado → usa `defaultSideBarWidth(largura)`. */
  readonly sideBarWidth: number | null
  readonly sideBarVisible: boolean
  readonly activeView: ViewId
  /** 5.4: só `left`/`right` chegam aqui (loader/setter filtram); ver ActivityBarPosition. */
  readonly activityBarPosition: ViewContainerSide
  /** 5.5: container + ordem de cada view (Side Bar = ordem da Activity Bar; Panel = ordem das abas). */
  readonly viewLayout: ViewLayout
  /** 5.5: aba ativa do Panel de views; null = primeira. */
  readonly panelActiveView: ViewId | null
  /** 5.7 (D6, RF-07): editor da AuxiliaryBar maximizado — toma o centro, chat some, Side Bar escondida (RF-09). Persistido (F5 mantém). */
  readonly editorMaximized: boolean
}

export const DEFAULT_LAYOUT_STATE: LayoutState = {
  sideBarWidth: null,
  sideBarVisible: true,
  activeView: DEFAULT_VIEW_ID,
  activityBarPosition: 'right',
  viewLayout: DEFAULT_VIEW_LAYOUT,
  panelActiveView: null,
  editorMaximized: false,
}

/** `min(300, largura/4)` — VS Code `layout.ts` (05_01 §2). */
export function defaultSideBarWidth(availableWidth: number): number {
  return Math.min(SIDE_BAR_DEFAULT_MAX, Math.floor(availableWidth / 4))
}

/** Máximo = tudo menos o editor mínimo (05_01 §2: 1012 = 1280 − 48 − 220). `availableWidth` já exclui a Activity Bar. */
export function maxSideBarWidth(availableWidth: number): number {
  return Math.max(SIDE_BAR_MIN_WIDTH, Math.floor(availableWidth) - EDITOR_MIN_WIDTH)
}

export function clampSideBarWidth(width: number, availableWidth: number): number {
  return Math.min(maxSideBarWidth(availableWidth), Math.max(SIDE_BAR_MIN_WIDTH, Math.round(width)))
}

export function loadLayoutState(storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): LayoutState {
  try {
    const raw = storage?.getItem(LAYOUT_STATE_KEY)
    if (!raw) return DEFAULT_LAYOUT_STATE
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return DEFAULT_LAYOUT_STATE
    const p = parsed as Record<string, unknown>
    return {
      sideBarWidth: typeof p.sideBarWidth === 'number' && Number.isFinite(p.sideBarWidth) && p.sideBarWidth >= SIDE_BAR_MIN_WIDTH ? Math.round(p.sideBarWidth) : null,
      sideBarVisible: typeof p.sideBarVisible === 'boolean' ? p.sideBarVisible : DEFAULT_LAYOUT_STATE.sideBarVisible,
      activeView: isViewId(p.activeView) ? p.activeView : DEFAULT_LAYOUT_STATE.activeView,
      activityBarPosition: isSupportedActivityBarPosition(p.activityBarPosition) ? p.activityBarPosition : DEFAULT_LAYOUT_STATE.activityBarPosition,
      viewLayout: isViewLayout(p.viewLayout) ? { sideBar: [...p.viewLayout.sideBar], panel: [...p.viewLayout.panel] } : DEFAULT_VIEW_LAYOUT,
      panelActiveView: isViewId(p.panelActiveView) ? p.panelActiveView : null,
      editorMaximized: p.editorMaximized === true,
    }
  } catch {
    return DEFAULT_LAYOUT_STATE // localStorage corrompido → defaults (docs/24 §12)
  }
}

export function saveLayoutState(state: LayoutState, storage: Pick<Storage, 'setItem'> | undefined = safeStorage()): void {
  try { storage?.setItem(LAYOUT_STATE_KEY, JSON.stringify(state)) } catch { /* quota/privado: ignora */ }
}

function safeStorage(): Storage | undefined {
  try { return typeof window !== 'undefined' ? window.localStorage : undefined } catch { return undefined }
}

export interface LayoutStateApi {
  readonly state: LayoutState
  /** RF-14: clicar na view ativa com a Side Bar aberta fecha; qualquer outro caso ativa a view e abre. */
  selectView(id: ViewId): void
  /** 5.2: ativa a view e ABRE a Side Bar sem alternar (atalhos como Ctrl+Shift+F). */
  showView(id: ViewId): void
  toggleSideBar(): void
  setSideBarVisible(visible: boolean): void
  /** Largura já validada pelo chamador (clamp) — persiste. */
  setSideBarWidth(width: number): void
  /** dblclick no sash → volta ao padrão (`null`). */
  resetSideBarWidth(): void
  /** 5.4 (RF-10): move a Activity Bar (+ Side Bar). `top`/`bottom` são ignorados (D2.64). Persiste. */
  setActivityBarPosition(position: ActivityBarPosition): void
  /** 5.5: move/reordena uma view entre Side Bar e Panel (índice clampado). Persiste. */
  moveView(id: ViewId, container: ViewContainer, index: number): void
  /** 5.5: aba ativa do Panel de views. */
  selectPanelView(id: ViewId): void
  /** 5.7: editor da AuxiliaryBar maximizado/restaurado (espelha `editor.attachMaximized/attachRestored`). Persiste. */
  setEditorMaximized(maximized: boolean): void
}

/** Hook do shell: estado + persistência síncrona a cada mudança. */
export function useLayoutState(): LayoutStateApi {
  const [state, setState] = useState<LayoutState>(() => loadLayoutState())
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    saveLayoutState(state)
  }, [state])

  const selectView = useCallback((id: ViewId) => {
    setState((s) => (s.activeView === id && s.sideBarVisible)
      ? { ...s, sideBarVisible: false }
      : { ...s, activeView: id, sideBarVisible: true })
  }, [])
  const showView = useCallback((id: ViewId) => {
    setState((s) => (s.activeView === id && s.sideBarVisible) ? s : { ...s, activeView: id, sideBarVisible: true })
  }, [])
  const toggleSideBar = useCallback(() => setState((s) => ({ ...s, sideBarVisible: !s.sideBarVisible })), [])
  const setSideBarVisible = useCallback((visible: boolean) => setState((s) => (s.sideBarVisible === visible ? s : { ...s, sideBarVisible: visible })), [])
  const setSideBarWidth = useCallback((width: number) => setState((s) => (s.sideBarWidth === width ? s : { ...s, sideBarWidth: width })), [])
  const resetSideBarWidth = useCallback(() => setState((s) => (s.sideBarWidth === null ? s : { ...s, sideBarWidth: null })), [])

  const setActivityBarPosition = useCallback((position: ActivityBarPosition) => {
    if (!isSupportedActivityBarPosition(position)) return
    setState((s) => (s.activityBarPosition === position ? s : { ...s, activityBarPosition: position }))
  }, [])

  const moveView = useCallback((id: ViewId, container: ViewContainer, index: number) => {
    setState((s) => {
      const viewLayout = moveViewInLayout(s.viewLayout, id, container, index)
      // a view ativa da Side Bar saiu -> cai para a primeira que sobrou (se nenhuma, mantém o id: a Side Bar mostra vazio)
      const activeView = viewLayout.sideBar.includes(s.activeView) ? s.activeView : (viewLayout.sideBar[0] ?? s.activeView)
      const panelActiveView = container === 'panel' ? id : (s.panelActiveView && viewLayout.panel.includes(s.panelActiveView) ? s.panelActiveView : (viewLayout.panel[0] ?? null))
      return { ...s, viewLayout, activeView, panelActiveView }
    })
  }, [])
  const selectPanelView = useCallback((id: ViewId) => setState((s) => (s.panelActiveView === id || !s.viewLayout.panel.includes(id) ? s : { ...s, panelActiveView: id })), [])
  const setEditorMaximized = useCallback((maximized: boolean) => setState((s) => (s.editorMaximized === maximized ? s : { ...s, editorMaximized: maximized })), [])

  return useMemo(() => ({ state, selectView, showView, toggleSideBar, setSideBarVisible, setSideBarWidth, resetSideBarWidth, setActivityBarPosition, moveView, selectPanelView, setEditorMaximized }),
    [state, selectView, showView, toggleSideBar, setSideBarVisible, setSideBarWidth, resetSideBarWidth, setActivityBarPosition, moveView, selectPanelView, setEditorMaximized])
}
