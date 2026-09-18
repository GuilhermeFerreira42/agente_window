import type { BrowserViewState, EditorTab } from '../types';
/**
 * The two workbench collections that make up one Browser resource.
 *
 * `BrowserViewState` is the live view and the Browser `EditorTab` is its editor
 * surface. Keeping the pair together in the ownership helpers prevents a
 * cleanup from removing only one half and leaving an orphaned view or tab.
 */
export interface BrowserResources {
    browserViews: BrowserViewState[];
    editorTabs: EditorTab[];
}
export declare function getBrowserViewsForSession(browserViews: readonly BrowserViewState[], sessionId: string): BrowserViewState[];
export declare function getBrowserTabForView(editorTabs: readonly EditorTab[], browserId: string): EditorTab | undefined;
export declare function getEditorTabsVisibleForSession(editorTabs: readonly EditorTab[], sessionId: string): EditorTab[];
/**
 * Removes every resource declared as owned by a session. Browser tabs that
 * point at a view owned by that session are removed as aliases too, preventing
 * a stale tab from surviving the view cleanup. Non-browser editor tabs that
 * carry the session owner are removed as well,
 * matching the workbench's session-scoped editor lifecycle.
 */
export declare function removeBrowserResourcesForSession(resources: BrowserResources, sessionId: string): BrowserResources;
/**
 * Closes a Browser editor surface and its live view as one operation. Duplicate
 * tabs pointing at the same view are treated as stale aliases and removed too,
 * so the result cannot contain a Browser tab without a corresponding view.
 */
export declare function removeBrowserResourceForTab(resources: BrowserResources, tabId: string): BrowserResources;
/**
 * Validates the bidirectional ownership relation between Browser views and
 * editor tabs. Every view needs exactly one Browser tab in the mock workbench;
 * every Browser tab must point to a view owned by the same session.
 */
export declare function assertBrowserOwnership(browserViews: readonly BrowserViewState[], editorTabs: readonly EditorTab[]): void;
//# sourceMappingURL=browserOwnership.d.ts.map