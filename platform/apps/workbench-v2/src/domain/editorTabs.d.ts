import type { EditorTab } from '../types';
/**
 * Resolves the tab that should be presented for a visible editor collection.
 * A requested id wins when it is still visible; otherwise the first tab is the
 * deterministic fallback used by the empty/restore paths.
 */
export declare function resolveVisibleEditorTabId(tabs: readonly EditorTab[], requestedId?: string): string | undefined;
/**
 * Chooses the next active tab after a close operation.
 *
 * The editor tab strip behaves like a left-to-right list: when the active tab
 * is closed, the tab that occupied its position (the right neighbour) becomes
 * active; if it was the last tab, the previous tab is used. Closing an
 * inactive tab never steals focus from the current active tab.
 */
export declare function resolveNextEditorTabId(tabs: readonly EditorTab[], closingTabId: string, activeTabId?: string): string | undefined;
//# sourceMappingURL=editorTabs.d.ts.map