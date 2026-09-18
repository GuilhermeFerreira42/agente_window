/**
 * Persistência de layout entre reloads e por sessão (paridade com
 * workbench.sessions.partSizes + captura por sessão do original).
 *
 * Guardamos:
 * - `shell`: visibilidade global (sidebar / auxiliar / terminal) e se o editor
 *   está oculto — restaurado de uma só vez no boot (reload flicker-free).
 * - `partSizesBySession`: os tamanhos do split chat|editor por sessão.
 * - `sessionLayouts`: layout por sessão (auxiliar visível + activeViewContainerId) - B3/B4
 */
export interface ShellVisibility {
  sidebarVisible: boolean
  auxiliaryVisible: boolean
  terminalVisible: boolean
  editorHidden: boolean
  sidebarWidth: number
}

export const SIDEBAR_WIDTH_MIN = 230

export const SIDEBAR_WIDTH_MAX = 410

export const SIDEBAR_WIDTH_DEFAULT = 300

export function clampSidebarWidth(width: number): number {
  if (!Number.isFinite(width)) return SIDEBAR_WIDTH_DEFAULT
  return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, Math.round(width)))
}

export interface LayoutState {
  shell: ShellVisibility
  partSizesBySession: Record<string, number[]>
}

export const LAYOUT_STORAGE_KEY = 'workbench.sessions.layout.v1'
export const SESSION_LAYOUTS_STORAGE_KEY = 'workbench.sessions.layouts.v1'

export const DEFAULT_SHELL: ShellVisibility = {
  sidebarVisible: true,
  auxiliaryVisible: true,
  terminalVisible: false,
  editorHidden: false,
  sidebarWidth: SIDEBAR_WIDTH_DEFAULT,
}

export function defaultLayoutState(): LayoutState {
  return { shell: { ...DEFAULT_SHELL }, partSizesBySession: {} }
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

export function loadLayoutState(storage?: StorageLike): LayoutState {
  const store = resolveStorage(storage)
  if (!store) return defaultLayoutState()
  try {
    const raw = store.getItem(LAYOUT_STORAGE_KEY)
    if (!raw) return defaultLayoutState()
    const parsed = JSON.parse(raw) as Partial<LayoutState>
    const mergedShell = { ...DEFAULT_SHELL, ...(parsed.shell ?? {}) }
    return {
      shell: { ...mergedShell, sidebarWidth: clampSidebarWidth(mergedShell.sidebarWidth) },
      partSizesBySession: sanitizeSizes(parsed.partSizesBySession),
    }
  } catch {
    return defaultLayoutState()
  }
}

function sanitizeSizes(input: unknown): Record<string, number[]> {
  if (!input || typeof input !== 'object') return {}
  const out: Record<string, number[]> = {}
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (Array.isArray(value) && value.every((n) => typeof n === 'number' && Number.isFinite(n))) {
      out[key] = value as number[]
    }
  }
  return out
}

export function saveLayoutState(state: LayoutState, storage?: StorageLike): void {
  const store = resolveStorage(storage)
  if (!store) return
  try {
    store.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage cheio ou bloqueado (modo privado): layout é preferência, não dado
    // crítico — seguimos sem persistir em vez de derrubar o workbench.
  }
}

export function partSizesForSession(state: LayoutState, sessionId: string): number[] {
  return state.partSizesBySession[sessionId] ?? [50, 50]
}

// B3/B4 - Session layouts persistence per session
import type { SessionLayoutMap } from './sessionLayout'

export function loadSessionLayouts(storage?: StorageLike): SessionLayoutMap {
  const store = resolveStorage(storage)
  if (!store) return {}
  try {
    const raw = store.getItem(SESSION_LAYOUTS_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as SessionLayoutMap
  } catch {
    return {}
  }
}

export function saveSessionLayouts(map: SessionLayoutMap, storage?: StorageLike): void {
  const store = resolveStorage(storage)
  if (!store) return
  try {
    store.setItem(SESSION_LAYOUTS_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Idem: sem storage, a memória por sessão vale só para a aba atual.
  }
}
