/** The editor content is only rendered when there are tabs and it was not hidden. */
export function isEditorContentVisible({ hasEditorTabs, editorHidden }) {
    return hasEditorTabs && !editorHidden;
}
/**
 * The tab bar is an invariant: it remains visible whenever the pane has tabs,
 * even when the editor *content* is hidden (keepForDockedTabBar in the original).
 */
export function isTabBarVisible({ hasEditorTabs }) {
    return hasEditorTabs;
}
/** Resolves which of the four side-pane states applies for the given inputs. */
export function resolveSidePaneState(inputs) {
    const editorVisible = isEditorContentVisible(inputs);
    if (editorVisible && inputs.auxVisible)
        return 'editor+detail';
    if (editorVisible && !inputs.auxVisible)
        return 'editor-only';
    if (!editorVisible && inputs.auxVisible)
        return 'detail-only';
    return 'closed';
}
/** Chat centers itself in the 950px band only when it is the sole surface. */
export function isChatCentered(inputs) {
    return resolveSidePaneState(inputs) === 'closed';
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
export function resolveDetailPanelVisible(inputs) {
    if (inputs.activeTabType === 'browser' && inputs.editorContentVisible)
        return false;
    return inputs.auxVisible;
}
/**
 * Managed tabs (Changes/Files) cannot be closed while the pane is in detail-only,
 * mirroring the original's CannotClose contract. In every other state they close
 * normally.
 */
export function isTabCloseable(tab, state) {
    const isManaged = tab.type === 'diff' || tab.type === 'file';
    if (isManaged && state === 'detail-only')
        return false;
    return true;
}
/** The set of managed surfaces a New Session presents, Files-first. */
export const MANAGED_TAB_TYPES = ['file', 'diff'];
//# sourceMappingURL=sidePane.js.map