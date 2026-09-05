import type { EditorTab } from '../types'

/**
 * The four side-pane presentation states of the single Main Editor group, mirroring
 * the original's SINGLE_PANE_SCENARIOS.md:
 * - `editor+detail`: editor content and the detail (auxiliary) panel are both shown.
 * - `editor-only`:  editor content is shown, detail panel is hidden.
 * - `detail-only`:  editor content is hidden (or absent) while the detail panel is shown.
 * - `closed`:       the whole side pane is closed — chat becomes the only surface and
 *                    centers itself in the 950px band.
 */
export type SidePaneState = 'editor+detail' | 'editor-only' | 'detail-only' | 'closed'

export interface SidePaneInputs {
  /** Whether the active session currently has any visible editor tab. */
  hasEditorTabs: boolean
  /** Whether the user explicitly hid the editor content (tab bar stays visible). */
  editorHidden: boolean
  /** Whether the detail/auxiliary panel is visible. */
  auxVisible: boolean
}

/** The editor content is only rendered when there are tabs and it was not hidden. */
export function isEditorContentVisible({ hasEditorTabs, editorHidden }: SidePaneInputs): boolean {
  return hasEditorTabs && !editorHidden
}

/**
 * The tab bar is an invariant: it remains visible whenever the pane has tabs,
 * even when the editor *content* is hidden (keepForDockedTabBar in the original).
 */
export function isTabBarVisible({ hasEditorTabs }: SidePaneInputs): boolean {
  return hasEditorTabs
}

/** Resolves which of the four side-pane states applies for the given inputs. */
export function resolveSidePaneState(inputs: SidePaneInputs): SidePaneState {
  const editorVisible = isEditorContentVisible(inputs)
  if (editorVisible && inputs.auxVisible) return 'editor+detail'
  if (editorVisible && !inputs.auxVisible) return 'editor-only'
  if (!editorVisible && inputs.auxVisible) return 'detail-only'
  return 'closed'
}

/** Chat centers itself in the 950px band only when it is the sole surface. */
export function isChatCentered(inputs: SidePaneInputs): boolean {
  return resolveSidePaneState(inputs) === 'closed'
}

/**
 * Resolves whether the docked **detail panel** (auxiliary bar) is actually
 * rendered, applying the original's "Browser is transient" rule
 * (SINGLE_PANE_SCENARIOS.md §Detail content / §Transitions):
 *
 * - A **Browser** tab hides the detail panel **transiently — but only while the
 *   editor content stays visible**. Switching back to Changes/Files restores it.
 * - If the editor content is hidden (Hide Editor) while Browser is active, the
 *   panel is **not** left blank: it shows the Changes/Files fallback, so it must
 *   render whenever it is the only surface left.
 * - For every other active tab (Changes/Files/Search) the panel simply follows
 *   the user's intent (`auxVisible`).
 *
 * `auxVisible` remains the persisted user intent; this derives the effective
 * render so the intent is preserved across tab switches.
 */
export function resolveDetailPanelVisible(inputs: {
  auxVisible: boolean
  activeTabType: EditorTab['type'] | undefined
  editorContentVisible: boolean
}): boolean {
  if (inputs.activeTabType === 'browser' && inputs.editorContentVisible) return false
  return inputs.auxVisible
}

/**
 * Managed tabs (Changes/Files) cannot be closed while the pane is in detail-only,
 * mirroring the original's CannotClose contract. In every other state they close
 * normally.
 */
export function isTabCloseable(tab: EditorTab, state: SidePaneState): boolean {
  const isManaged = tab.type === 'diff' || tab.type === 'file'
  if (isManaged && state === 'detail-only') return false
  return true
}

/** The set of managed surfaces a New Session presents, Files-first. */
export const MANAGED_TAB_TYPES: readonly EditorTab['type'][] = ['file', 'diff']

