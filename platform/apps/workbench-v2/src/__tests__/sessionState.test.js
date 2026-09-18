import { describe, expect, it } from 'vitest';
import { initialDiffFiles, initialSessions } from '../data';
import { assertBrowserOwnership, getBrowserTabForView, getBrowserViewsForSession, getEditorTabsVisibleForSession, removeBrowserResourceForTab, removeBrowserResourcesForSession, } from '../domain/browserOwnership';
import { assertBrowserViewInvariants, assertEditorTabInvariants, assertSessionInvariants, assertWorkbenchInvariants, canTransitionStatus, getChat, getDiffResolution, isBrowserOwnedBySession, isEditorTabOwnedBySession, isEditorTabVisibleForSession, navigateBrowser, reloadBrowser, resolveActiveChatId, setAllDiffAccepted, setBrowserStatus, setBrowserViewport, setDiffAccepted, stepBrowserHistory, toggleDiffViewed, transitionChatStatus, transitionStatus, updateChatStatus, updateSessionAndChatStatus, } from '../domain/sessionState';
const browser = {
    id: 'browser-test',
    sessionId: 's1',
    title: 'Browser',
    url: 'https://example.test/start',
    history: ['https://example.test/start'],
    historyIndex: 0,
    status: 'ready',
    viewport: 'desktop',
    reloadToken: 0,
};
const browserTab = {
    id: 'browser-tab-test',
    type: 'browser',
    title: 'Browser',
    sessionId: 's1',
    browserId: browser.id,
};
const fileTab = {
    id: 'file-tab-test',
    type: 'file',
    title: 'session.ts',
    path: 'src/session.ts',
};
const diffTab = {
    id: 'diff-tab-test',
    type: 'diff',
    title: 'Branch Changes',
    sessionId: 's1',
};
const secondBrowser = {
    ...browser,
    id: 'browser-test-s2',
    sessionId: 's2',
    url: 'https://example.test/second-session',
    history: ['https://example.test/second-session'],
};
const secondBrowserTab = {
    ...browserTab,
    id: 'browser-tab-test-s2',
    sessionId: 's2',
    browserId: secondBrowser.id,
};
function sessionWith(changes) {
    return { ...initialSessions[0], ...changes };
}
describe('session state machine and ownership', () => {
    it('accepts supported session/chat lifecycle transitions and rejects backwards reset', () => {
        expect(canTransitionStatus('completed', 'working')).toBe(true);
        expect(canTransitionStatus('needs-input', 'completed')).toBe(true);
        expect(transitionStatus('completed', 'working')).toBe('working');
        expect(transitionChatStatus('working', 'needs-input')).toBe('needs-input');
        expect(() => transitionStatus('completed', 'untitled')).toThrow('Invalid session status transition');
    });
    it('resolves the requested chat while falling back to the session main chat', () => {
        const session = initialSessions[0];
        expect(resolveActiveChatId(session, { [session.id]: 's1-ui' })).toBe('s1-ui');
        expect(resolveActiveChatId(session, { [session.id]: 'missing-chat' })).toBe(session.mainChatId);
        expect(getChat(session, 's1-browser')?.title).toBe('Browser por sessão');
        expect(getChat(session, 'missing-chat')?.id).toBe(session.mainChatId);
    });
    it('updates session and chat status together without mutating the source', () => {
        const session = initialSessions[0];
        const next = updateSessionAndChatStatus(session, session.mainChatId, 'completed');
        expect(next).not.toBe(session);
        expect(next.status).toBe('completed');
        expect(next.chats.find((chat) => chat.id === session.mainChatId)?.status).toBe('completed');
        expect(session.status).toBe('working');
        expect(session.chats.find((chat) => chat.id === session.mainChatId)?.status).toBe('working');
        expect(() => updateChatStatus(session, 'missing-chat', 'completed')).toThrow('unknown chat');
    });
    it('keeps browser URL, history cursor, loading status and reload token coherent', () => {
        const navigated = navigateBrowser(browser, 'https://example.test/next');
        expect(navigated.history).toEqual(['https://example.test/start', 'https://example.test/next']);
        expect(navigated.historyIndex).toBe(1);
        expect(navigated.url).toBe(navigated.history[navigated.historyIndex]);
        expect(navigated.status).toBe('loading');
        expect(navigated.reloadToken).toBe(1);
        const back = stepBrowserHistory(navigated, -1);
        expect(back.url).toBe('https://example.test/start');
        expect(back.historyIndex).toBe(0);
        expect(stepBrowserHistory(back, -1)).toBe(back);
        const branched = navigateBrowser(back, 'https://example.test/branch');
        expect(branched.history).toEqual(['https://example.test/start', 'https://example.test/branch']);
        expect(reloadBrowser(branched).reloadToken).toBe(branched.reloadToken + 1);
        expect(setBrowserStatus(branched, 'error').status).toBe('error');
        expect(setBrowserViewport(branched, 'mobile').viewport).toBe('mobile');
        expect(() => navigateBrowser(browser, '   ')).toThrow('URL cannot be empty');
    });
    it('enforces browser and editor ownership by session', () => {
        expect(isBrowserOwnedBySession(browser, 's1')).toBe(true);
        expect(isBrowserOwnedBySession(browser, 's2')).toBe(false);
        expect(isEditorTabVisibleForSession(browserTab, 's1')).toBe(true);
        expect(isEditorTabVisibleForSession(browserTab, 's2')).toBe(false);
        expect(isEditorTabVisibleForSession(fileTab, 's2')).toBe(true);
        expect(isEditorTabOwnedBySession(browserTab, 's1')).toBe(true);
        expect(isEditorTabOwnedBySession(fileTab, 's1')).toBe(false);
    });
    it('keeps Browser view and editor tab ownership bidirectional during filtering and cleanup', () => {
        const resources = {
            browserViews: [browser, secondBrowser],
            editorTabs: [browserTab, secondBrowserTab, fileTab],
        };
        expect(getBrowserViewsForSession(resources.browserViews, 's1')).toEqual([browser]);
        expect(getBrowserViewsForSession(resources.browserViews, 's2')).toEqual([secondBrowser]);
        expect(getBrowserTabForView(resources.editorTabs, browser.id)).toBe(browserTab);
        expect(getEditorTabsVisibleForSession(resources.editorTabs, 's1')).toEqual([browserTab, fileTab]);
        expect(getEditorTabsVisibleForSession(resources.editorTabs, 's2')).toEqual([secondBrowserTab, fileTab]);
        const removedS1 = removeBrowserResourcesForSession(resources, 's1');
        expect(removedS1.browserViews).toEqual([secondBrowser]);
        expect(removedS1.editorTabs).toEqual([secondBrowserTab, fileTab]);
        const closedS2 = removeBrowserResourceForTab(resources, secondBrowserTab.id);
        expect(closedS2.browserViews).toEqual([browser]);
        expect(closedS2.editorTabs).toEqual([browserTab, fileTab]);
        expect(removeBrowserResourceForTab(resources, fileTab.id)).toEqual({ browserViews: [browser, secondBrowser], editorTabs: [browserTab, secondBrowserTab] });
        expect(removeBrowserResourceForTab({ ...resources, editorTabs: [browserTab, { ...browserTab, id: 'browser-tab-alias' }, secondBrowserTab] }, browserTab.id)).toEqual({ browserViews: [secondBrowser], editorTabs: [secondBrowserTab] });
        expect(removeBrowserResourceForTab({ browserViews: [browser], editorTabs: [{ ...browserTab, sessionId: 's2', id: 'cross-session-tab' }] }, 'cross-session-tab')).toEqual({ browserViews: [browser], editorTabs: [] });
        expect(removeBrowserResourceForTab(resources, 'missing-tab')).toEqual(resources);
    });
    it('rejects cross-session Browser links and duplicate tabs instead of allowing ambiguous ownership', () => {
        expect(() => assertBrowserOwnership([browser], [{ ...browserTab, sessionId: 's2' }])).toThrow('invalid owner');
        expect(() => assertBrowserOwnership([browser], [{ ...browserTab, browserId: 'missing-browser' }])).toThrow('unknown browser');
        expect(() => assertBrowserOwnership([browser], [browserTab, { ...browserTab, id: 'browser-tab-alias' }])).toThrow('multiple editor tabs');
        expect(() => assertBrowserOwnership([browser, secondBrowser], [browserTab])).toThrow('has no editor tab');
    });
    it('removes malformed cross-links when a session owns the stale tab', () => {
        const malformedTab = { ...secondBrowserTab, sessionId: 's1' };
        const cleaned = removeBrowserResourcesForSession({
            browserViews: [browser, secondBrowser],
            editorTabs: [browserTab, malformedTab, secondBrowserTab],
        }, 's1');
        expect(cleaned.browserViews).toEqual([secondBrowser]);
        expect(cleaned.editorTabs).toEqual([secondBrowserTab]);
    });
    it('updates individual and bulk diff decisions immutably', () => {
        const accepted = setDiffAccepted(initialDiffFiles, 'diff-1', true);
        expect(accepted.find((file) => file.id === 'diff-1')?.accepted).toBe(true);
        expect(accepted.find((file) => file.id === 'diff-1')?.resolution).toBe('accepted');
        expect(getDiffResolution(accepted[0])).toBe('accepted');
        expect(initialDiffFiles.find((file) => file.id === 'diff-1')?.accepted).toBeUndefined();
        const allReverted = setAllDiffAccepted(accepted, false);
        expect(allReverted.every((file) => file.accepted === false)).toBe(true);
        expect(allReverted.every((file) => file.resolution === 'reverted')).toBe(true);
        expect(getDiffResolution({ accepted: undefined })).toBeUndefined();
        const viewed = toggleDiffViewed(allReverted, 'diff-2');
        expect(viewed.find((file) => file.id === 'diff-2')?.viewed).toBe(true);
    });
    it('validates session, browser and editor invariants at runtime', () => {
        initialSessions.forEach(assertSessionInvariants);
        assertBrowserViewInvariants(browser);
        assertEditorTabInvariants(browserTab);
        assertEditorTabInvariants(fileTab);
        assertEditorTabInvariants(diffTab);
        expect(() => assertEditorTabInvariants({ ...diffTab, sessionId: undefined })).toThrow('Diff editor tab');
        assertWorkbenchInvariants(initialSessions, [browser], [browserTab, fileTab], 's1', Object.fromEntries(initialSessions.map((session) => [session.id, session.mainChatId])));
        expect(() => assertSessionInvariants(sessionWith({ mainChatId: 'missing-chat' }))).toThrow('main chat is missing');
        expect(() => assertBrowserViewInvariants({ ...browser, historyIndex: 2 })).toThrow('out of range');
        expect(() => assertEditorTabInvariants({ ...browserTab, browserId: undefined })).toThrow('must identify');
        expect(() => assertWorkbenchInvariants(initialSessions, [{ ...browser, sessionId: 'missing' }], [], 's1', {})).toThrow('unknown session');
        expect(() => assertWorkbenchInvariants(initialSessions, [browser], [], 's1', {})).toThrow('has no editor tab');
        expect(() => assertWorkbenchInvariants([sessionWith({ archived: true, section: 'archived' }), initialSessions[1]], [browser], [browserTab], 's1', {})).toThrow('cannot own Browser');
    });
});
//# sourceMappingURL=sessionState.test.js.map