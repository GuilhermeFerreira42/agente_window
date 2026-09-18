/**
 * Custom View Grid (LAYOUT.md §Custom View Grid / ICustomViewService).
 *
 * Uma custom view é uma superfície full-surface contribuída que SUBSTITUI o
 * conteúdo da sessão. Regras do original replicadas aqui:
 *
 * 1. É mutuamente exclusiva com Sessions Part, Editor, Auxiliary Bar e Panel.
 *    Apenas Title Bar e Sidebar continuam disponíveis.
 * 2. As parts cobertas retêm a *desired visibility* separada da *effective
 *    visibility* — por isso o estado guarda o que o usuário queria antes de a
 *    view abrir, e devolve exatamente isso ao fechar.
 * 3. Abrir uma sessão dispensa (dismiss) a custom view ativa.
 * 4. Em telefone, a custom view participa da navegação: o "voltar" dispensa.
 *
 * Este módulo é puro (sem React): o App só lê/aplica o que ele decide.
 */

export type CustomViewId = 'aiCustomizations' | 'automations' | 'test'

export interface PartVisibility {
  sessionsPart: boolean
  editor: boolean
  auxiliaryBar: boolean
  panel: boolean
}

export interface CustomViewState {
  activeView: CustomViewId | null
  /** O que o usuário queria ver antes da custom view cobrir as parts. */
  desiredVisibility: PartVisibility
}

export const CUSTOM_VIEW_STORAGE_KEY = 'workbench.customView.v1'

export const CUSTOM_VIEW_IDS: readonly CustomViewId[] = ['aiCustomizations', 'automations', 'test']

export const DEFAULT_PART_VISIBILITY: PartVisibility = {
  sessionsPart: true,
  editor: true,
  auxiliaryBar: true,
  panel: false,
}

export function emptyCustomViewState(): CustomViewState {
  return { activeView: null, desiredVisibility: { ...DEFAULT_PART_VISIBILITY } }
}

export function isCustomViewId(value: unknown): value is CustomViewId {
  return typeof value === 'string' && (CUSTOM_VIEW_IDS as readonly string[]).includes(value)
}

export function shouldShowCustomViewGrid(state: CustomViewState): boolean {
  return state.activeView !== null
}

/**
 * Abre uma custom view capturando a visibilidade desejada atual.
 *
 * Se já existe uma view ativa, a captura NÃO é refeita: as parts já estão
 * cobertas e o que chega como `current` é a visibilidade *efetiva* (tudo
 * falso). Recapturar aqui apagaria a preferência do usuário — é exatamente o
 * bug que "desired vs effective visibility" existe para evitar.
 */
export function openCustomView(
  state: CustomViewState,
  view: CustomViewId,
  current: PartVisibility,
): CustomViewState {
  if (state.activeView !== null) return { ...state, activeView: view }
  return { activeView: view, desiredVisibility: { ...current } }
}

/** Fecha a custom view; a visibilidade desejada permanece para ser restaurada. */
export function closeCustomView(state: CustomViewState): CustomViewState {
  if (state.activeView === null) return state
  return { ...state, activeView: null }
}

/** Abrir uma sessão dispensa a custom view ativa (LAYOUT.md). */
export function dismissCustomViewOnSessionOpen(state: CustomViewState): CustomViewState {
  return closeCustomView(state)
}

/** No phone, o "voltar" dispensa a custom view antes de mexer na navegação. */
export function dismissCustomViewOnBack(state: CustomViewState): { state: CustomViewState; handled: boolean } {
  if (state.activeView === null) return { state, handled: false }
  return { state: closeCustomView(state), handled: true }
}

/**
 * Visibilidade EFETIVA das parts: com custom view ativa, todas as parts da
 * cadeia horizontal principal ficam escondidas.
 */
export function effectivePartVisibility(state: CustomViewState): PartVisibility {
  if (state.activeView === null) return { ...state.desiredVisibility }
  return { sessionsPart: false, editor: false, auxiliaryBar: false, panel: false }
}

/** Visibilidade a restaurar quando a custom view fecha. */
export function restoredPartVisibility(state: CustomViewState): PartVisibility {
  return { ...state.desiredVisibility }
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

function resolveStorage(storage?: StorageLike): StorageLike | undefined {
  if (storage) return storage
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined
  } catch {
    return undefined
  }
}

function sanitizeVisibility(value: unknown): PartVisibility {
  const source = (value ?? {}) as Partial<Record<keyof PartVisibility, unknown>>
  const read = (key: keyof PartVisibility) =>
    typeof source[key] === 'boolean' ? (source[key] as boolean) : DEFAULT_PART_VISIBILITY[key]
  return {
    sessionsPart: read('sessionsPart'),
    editor: read('editor'),
    auxiliaryBar: read('auxiliaryBar'),
    panel: read('panel'),
  }
}

/** F5 com custom view ativa: o estado volta igual (inclusive o desired). */
export function loadCustomViewState(storage?: StorageLike): CustomViewState {
  const store = resolveStorage(storage)
  if (!store) return emptyCustomViewState()
  try {
    const raw = store.getItem(CUSTOM_VIEW_STORAGE_KEY)
    if (!raw) return emptyCustomViewState()
    const parsed = JSON.parse(raw) as Partial<CustomViewState>
    return {
      activeView: isCustomViewId(parsed?.activeView) ? parsed.activeView : null,
      desiredVisibility: sanitizeVisibility(parsed?.desiredVisibility),
    }
  } catch {
    return emptyCustomViewState()
  }
}

export function saveCustomViewState(state: CustomViewState, storage?: StorageLike): void {
  const store = resolveStorage(storage)
  if (!store) return
  try {
    store.setItem(CUSTOM_VIEW_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage indisponível: a custom view vale só para a aba atual.
  }
}

/** Rótulo humano da view (usado no cabeçalho do grid e em aria-labels). */
export function customViewTitle(view: CustomViewId): string {
  switch (view) {
    case 'aiCustomizations':
      return 'AI Customizations'
    case 'automations':
      return 'Automations'
    case 'test':
      return 'Test'
  }
}
