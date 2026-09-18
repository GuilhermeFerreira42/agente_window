import { assertBrowserOwnership } from './browserOwnership';
/**
 * Allowed lifecycle transitions for a session or chat.
 *
 * A completed/error session can receive a new request again, so those states
 * deliberately allow a transition back to working. Keeping the table here
 * makes the transition contract testable instead of relying on visual status
 * classes in the components.
 */
const statusTransitions = {
    untitled: ['untitled', 'working', 'needs-input', 'completed', 'error'],
    working: ['working', 'needs-input', 'completed', 'error'],
    'needs-input': ['needs-input', 'working', 'completed', 'error'],
    completed: ['completed', 'working', 'needs-input', 'error'],
    error: ['error', 'working', 'needs-input', 'completed'],
};
const browserStatusTransitions = {
    loading: ['loading', 'ready', 'error'],
    ready: ['ready', 'loading', 'error'],
    error: ['error', 'loading', 'ready'],
};
export function canTransitionStatus(current, next) {
    return statusTransitions[current].includes(next);
}
export function transitionStatus(current, next) {
    if (!canTransitionStatus(current, next)) {
        throw new Error(`Invalid session status transition: ${current} → ${next}`);
    }
    return next;
}
export function transitionChatStatus(current, next) {
    return transitionStatus(current, next);
}
export function canTransitionBrowserStatus(current, next) {
    return browserStatusTransitions[current].includes(next);
}
export function transitionBrowserStatus(current, next) {
    if (!canTransitionBrowserStatus(current, next)) {
        throw new Error(`Invalid browser status transition: ${current} → ${next}`);
    }
    return next;
}
export function resolveActiveChatId(session, selection) {
    const requested = selection[session.id] ?? session.mainChatId;
    return session.chats.some((chat) => chat.id === requested) ? requested : session.mainChatId;
}
export function getChat(session, chatId = session.mainChatId) {
    return session.chats.find((chat) => chat.id === chatId) ?? session.chats.find((chat) => chat.id === session.mainChatId);
}
export function updateSessionStatus(session, next) {
    return { ...session, status: transitionStatus(session.status, next) };
}
export function updateChatStatus(session, chatId, next) {
    const chat = getChat(session, chatId);
    if (!chat || chat.id !== chatId) {
        throw new Error(`Cannot update unknown chat: ${chatId}`);
    }
    return {
        ...session,
        chats: session.chats.map((item) => item.id === chatId ? { ...item, status: transitionChatStatus(item.status, next) } : item),
    };
}
export function updateSessionAndChatStatus(session, chatId, next) {
    const nextSession = updateSessionStatus(session, next);
    return {
        ...nextSession,
        chats: nextSession.chats.map((chat) => chat.id === chatId ? { ...chat, status: transitionChatStatus(chat.status, next) } : chat),
    };
}
export function navigateBrowser(view, url) {
    const nextUrl = url.trim();
    if (!nextUrl) {
        throw new Error('Browser URL cannot be empty');
    }
    const nextHistory = [...view.history.slice(0, view.historyIndex + 1), nextUrl];
    return {
        ...view,
        url: nextUrl,
        history: nextHistory,
        historyIndex: nextHistory.length - 1,
        status: transitionBrowserStatus(view.status, 'loading'),
        reloadToken: view.reloadToken + 1,
    };
}
export function stepBrowserHistory(view, direction) {
    const nextIndex = view.historyIndex + direction;
    if (nextIndex < 0 || nextIndex >= view.history.length) {
        return view;
    }
    return {
        ...view,
        url: view.history[nextIndex],
        historyIndex: nextIndex,
        status: transitionBrowserStatus(view.status, 'loading'),
        reloadToken: view.reloadToken + 1,
    };
}
export function reloadBrowser(view) {
    return {
        ...view,
        status: transitionBrowserStatus(view.status, 'loading'),
        reloadToken: view.reloadToken + 1,
    };
}
export function setBrowserStatus(view, status) {
    return { ...view, status: transitionBrowserStatus(view.status, status) };
}
export function setBrowserViewport(view, viewport) {
    return { ...view, viewport };
}
export function isBrowserOwnedBySession(view, sessionId) {
    return view.sessionId === sessionId;
}
export function isEditorTabVisibleForSession(tab, sessionId) {
    // Session-owned editor resources, including Diff, are hidden when another
    // session is active. Unowned tabs such as Search remain global.
    return !tab.sessionId || tab.sessionId === sessionId;
}
export function isEditorTabOwnedBySession(tab, sessionId) {
    return tab.sessionId === sessionId;
}
export function updateDiffFile(files, id, updater) {
    return files.map((file) => file.id === id ? updater(file) : file);
}
/** Resolve the explicit decision while accepting the legacy boolean mock field. */
export function getDiffResolution(file) {
    return file.resolution ?? (file.accepted === true ? 'accepted' : file.accepted === false ? 'reverted' : undefined);
}
function resolveDiff(file, resolution) {
    return {
        ...file,
        accepted: resolution === 'accepted',
        resolution,
    };
}
export function setDiffAccepted(files, id, accepted) {
    return updateDiffFile(files, id, (file) => resolveDiff(file, accepted ? 'accepted' : 'reverted'));
}
export function setAllDiffAccepted(files, accepted) {
    return files.map((file) => resolveDiff(file, accepted ? 'accepted' : 'reverted'));
}
export function toggleDiffViewed(files, id) {
    return updateDiffFile(files, id, (file) => ({ ...file, viewed: !file.viewed }));
}
/**
 * Runtime assertions for the state relationships that TypeScript interfaces
 * alone cannot express. They are intentionally side-effect free and can be
 * called from tests, initialization, or a development-only boundary.
 */
export function assertSessionInvariants(session) {
    if (!session.id.trim())
        throw new Error('Session id cannot be empty');
    if (!session.mainChatId.trim())
        throw new Error(`Session ${session.id} has no main chat id`);
    if (session.chats.length === 0)
        throw new Error(`Session ${session.id} must contain at least one chat`);
    const chatIds = new Set(session.chats.map((chat) => chat.id));
    if (chatIds.size !== session.chats.length)
        throw new Error(`Session ${session.id} contains duplicate chat ids`);
    if (!chatIds.has(session.mainChatId))
        throw new Error(`Session ${session.id} main chat is missing`);
    if (session.archived && session.section !== 'archived')
        throw new Error(`Archived session ${session.id} must be in archived section`);
    for (const chat of session.chats) {
        if (!chat.id.trim())
            throw new Error(`Session ${session.id} contains a chat without an id`);
        if (!Array.isArray(chat.messages))
            throw new Error(`Chat ${chat.id} messages must be an array`);
    }
}
export function assertBrowserViewInvariants(view) {
    if (!view.id.trim())
        throw new Error('Browser view id cannot be empty');
    if (!view.sessionId.trim())
        throw new Error(`Browser ${view.id} has no session owner`);
    if (view.history.length === 0)
        throw new Error(`Browser ${view.id} must have history`);
    if (view.historyIndex < 0 || view.historyIndex >= view.history.length)
        throw new Error(`Browser ${view.id} history index is out of range`);
    if (view.history[view.historyIndex] !== view.url)
        throw new Error(`Browser ${view.id} URL must match its history cursor`);
    if (view.reloadToken < 0)
        throw new Error(`Browser ${view.id} reload token cannot be negative`);
}
export function assertEditorTabInvariants(tab) {
    if (!tab.id.trim())
        throw new Error('Editor tab id cannot be empty');
    if (!tab.title.trim())
        throw new Error(`Editor tab ${tab.id} must have a title`);
    if (tab.type === 'browser' && (!tab.sessionId || !tab.browserId)) {
        throw new Error(`Browser editor tab ${tab.id} must identify its session and browser`);
    }
    if (tab.type === 'diff' && !tab.sessionId) {
        throw new Error(`Diff editor tab ${tab.id} must identify its session`);
    }
    if (tab.type === 'file' && !tab.path?.trim()) {
        throw new Error(`File editor tab ${tab.id} must identify a path`);
    }
}
export function assertWorkbenchInvariants(sessions, browserViews, editorTabs, activeSessionId, activeChatBySession) {
    // Estado de landing é válido — a UI mostra a tela inicial e usa uma sessão
    // "rascunho" (fora de `sessions`) como ativa. Isso ocorre quando não há
    // nenhuma sessão, ou quando só restam runs de automação (excluídas da lista).
    const hasPrimary = sessions.some((session) => !session.automation);
    if (!hasPrimary)
        return;
    const sessionIds = new Set(sessions.map((session) => session.id));
    if (sessionIds.size !== sessions.length)
        throw new Error('Workbench contains duplicate session ids');
    if (!sessionIds.has(activeSessionId))
        throw new Error(`Active session is missing: ${activeSessionId}`);
    sessions.forEach(assertSessionInvariants);
    const browserIds = new Set();
    for (const view of browserViews) {
        assertBrowserViewInvariants(view);
        if (browserIds.has(view.id))
            throw new Error(`Workbench contains duplicate browser ids: ${view.id}`);
        browserIds.add(view.id);
        const owner = sessions.find((session) => session.id === view.sessionId);
        if (!owner)
            throw new Error(`Browser ${view.id} references an unknown session`);
        if (owner.archived)
            throw new Error(`Archived session ${owner.id} cannot own Browser ${view.id}`);
    }
    const editorTabIds = new Set();
    for (const tab of editorTabs) {
        assertEditorTabInvariants(tab);
        if (editorTabIds.has(tab.id))
            throw new Error(`Workbench contains duplicate editor tab ids: ${tab.id}`);
        editorTabIds.add(tab.id);
        if (tab.sessionId && !sessionIds.has(tab.sessionId))
            throw new Error(`Editor tab ${tab.id} references an unknown session`);
    }
    assertBrowserOwnership(browserViews, editorTabs);
    for (const [sessionId, chatId] of Object.entries(activeChatBySession)) {
        const session = sessions.find((candidate) => candidate.id === sessionId);
        if (!session)
            throw new Error(`Active chat map references an unknown session: ${sessionId}`);
        if (!session.chats.some((chat) => chat.id === chatId))
            throw new Error(`Active chat map references an unknown chat: ${chatId}`);
    }
}
//# sourceMappingURL=sessionState.js.map