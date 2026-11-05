import type { BrowserViewState, EditorTab } from '../types'

/**
 * The two workbench collections that make up one Browser resource.
 *
 * `BrowserViewState` is the live view and the Browser `EditorTab` is its editor
 * surface. Keeping the pair together in the ownership helpers prevents a
 * cleanup from removing only one half and leaving an orphaned view or tab.
 */
export interface BrowserResources {
  browserViews: BrowserViewState[]
  editorTabs: EditorTab[]
}

export function getBrowserViewsForSession(browserViews: readonly BrowserViewState[], sessionId: string): BrowserViewState[] {
  return browserViews.filter((view) => view.sessionId === sessionId)
}

export function getBrowserTabForView(editorTabs: readonly EditorTab[], browserId: string): EditorTab | undefined {
  return editorTabs.find((tab) => tab.type === 'browser' && tab.browserId === browserId)
}

export function getEditorTabsVisibleForSession(editorTabs: readonly EditorTab[], sessionId: string): EditorTab[] {
  // Any tab that declares an owner belongs to that session. Tabs without an
  // owner (for example Search and workspace files) remain global editor tabs.
  return editorTabs.filter((tab) => !tab.sessionId || tab.sessionId === sessionId)
}

/**
 * Removes every resource declared as owned by a session. Browser tabs that
 * point at a view owned by that session are removed as aliases too, preventing
 * a stale tab from surviving the view cleanup. Non-browser editor tabs that
 * carry the session owner are removed as well,
 * matching the workbench's session-scoped editor lifecycle.
 */
export function removeBrowserResourcesForSession(resources: BrowserResources, sessionId: string): BrowserResources {
  const browserIdsToRemove = new Set(getBrowserViewsForSession(resources.browserViews, sessionId).map((view) => view.id))

  return {
    browserViews: resources.browserViews.filter((view) => !browserIdsToRemove.has(view.id)),
    editorTabs: resources.editorTabs.filter((tab) => {
      if (tab.sessionId === sessionId) return false
      return tab.type !== 'browser' || !tab.browserId || !browserIdsToRemove.has(tab.browserId)
    }),
  }
}

/**
 * Closes a Browser editor surface and its live view as one operation. Duplicate
 * tabs pointing at the same view are treated as stale aliases and removed too,
 * so the result cannot contain a Browser tab without a corresponding view.
 */
export function removeBrowserResourceForTab(resources: BrowserResources, tabId: string): BrowserResources {
  const closingTab = resources.editorTabs.find((tab) => tab.id === tabId)
  if (!closingTab) return { browserViews: [...resources.browserViews], editorTabs: [...resources.editorTabs] }

  if (closingTab.type !== 'browser' || !closingTab.browserId) {
    return {
      browserViews: [...resources.browserViews],
      editorTabs: resources.editorTabs.filter((tab) => tab.id !== tabId),
    }
  }

  const browserId = closingTab.browserId
  const view = resources.browserViews.find((candidate) => candidate.id === browserId)
  const ownsView = !!view && view.sessionId === closingTab.sessionId
  return {
    // A malformed cross-session tab may be closed, but it must never dispose
    // the Browser view owned by another session.
    browserViews: ownsView ? resources.browserViews.filter((candidate) => candidate.id !== browserId) : [...resources.browserViews],
    editorTabs: resources.editorTabs.filter((tab) => tab.id !== tabId && (!ownsView || !(tab.type === 'browser' && tab.browserId === browserId))),
  }
}

/**
 * Validates the bidirectional ownership relation between Browser views and
 * editor tabs. Every view needs exactly one Browser tab in the mock workbench;
 * every Browser tab must point to a view owned by the same session.
 */
export function assertBrowserOwnership(browserViews: readonly BrowserViewState[], editorTabs: readonly EditorTab[]): void {
  const referencedViewIds = new Set<string>()

  for (const tab of editorTabs) {
    if (tab.type !== 'browser') continue
    if (!tab.sessionId || !tab.browserId) {
      throw new Error(`Browser tab ${tab.id} must identify its session and browser`)
    }
    const view = browserViews.find((candidate) => candidate.id === tab.browserId)
    if (!view) throw new Error(`Browser tab ${tab.id} references an unknown browser`)
    if (view.sessionId !== tab.sessionId) throw new Error(`Browser tab ${tab.id} has an invalid owner or browser reference`)
    if (referencedViewIds.has(view.id)) throw new Error(`Browser ${view.id} has multiple editor tabs`)
    referencedViewIds.add(view.id)
  }

  for (const view of browserViews) {
    if (!referencedViewIds.has(view.id)) throw new Error(`Browser ${view.id} has no editor tab`)
  }
}

