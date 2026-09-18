export const SIDEBAR_WIDTH_MIN = 230;
export const SIDEBAR_WIDTH_MAX = 410;
export const SIDEBAR_WIDTH_DEFAULT = 300;
export function clampSidebarWidth(width) {
    if (!Number.isFinite(width))
        return SIDEBAR_WIDTH_DEFAULT;
    return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, Math.round(width)));
}
export const LAYOUT_STORAGE_KEY = 'workbench.sessions.layout.v1';
export const SESSION_LAYOUTS_STORAGE_KEY = 'workbench.sessions.layouts.v1';
export const DEFAULT_SHELL = {
    sidebarVisible: true,
    auxiliaryVisible: true,
    terminalVisible: false,
    editorHidden: false,
    sidebarWidth: SIDEBAR_WIDTH_DEFAULT,
};
export function defaultLayoutState() {
    return { shell: { ...DEFAULT_SHELL }, partSizesBySession: {} };
}
function resolveStorage(storage) {
    if (storage)
        return storage;
    try {
        return typeof window !== 'undefined' ? window.localStorage : undefined;
    }
    catch {
        return undefined;
    }
}
export function loadLayoutState(storage) {
    const store = resolveStorage(storage);
    if (!store)
        return defaultLayoutState();
    try {
        const raw = store.getItem(LAYOUT_STORAGE_KEY);
        if (!raw)
            return defaultLayoutState();
        const parsed = JSON.parse(raw);
        const mergedShell = { ...DEFAULT_SHELL, ...(parsed.shell ?? {}) };
        return {
            shell: { ...mergedShell, sidebarWidth: clampSidebarWidth(mergedShell.sidebarWidth) },
            partSizesBySession: sanitizeSizes(parsed.partSizesBySession),
        };
    }
    catch {
        return defaultLayoutState();
    }
}
function sanitizeSizes(input) {
    if (!input || typeof input !== 'object')
        return {};
    const out = {};
    for (const [key, value] of Object.entries(input)) {
        if (Array.isArray(value) && value.every((n) => typeof n === 'number' && Number.isFinite(n))) {
            out[key] = value;
        }
    }
    return out;
}
export function saveLayoutState(state, storage) {
    const store = resolveStorage(storage);
    if (!store)
        return;
    try {
        store.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(state));
    }
    catch {
        // Storage cheio ou bloqueado (modo privado): layout é preferência, não dado
        // crítico — seguimos sem persistir em vez de derrubar o workbench.
    }
}
export function partSizesForSession(state, sessionId) {
    return state.partSizesBySession[sessionId] ?? [50, 50];
}
export function loadSessionLayouts(storage) {
    const store = resolveStorage(storage);
    if (!store)
        return {};
    try {
        const raw = store.getItem(SESSION_LAYOUTS_STORAGE_KEY);
        if (!raw)
            return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object')
            return {};
        return parsed;
    }
    catch {
        return {};
    }
}
export function saveSessionLayouts(map, storage) {
    const store = resolveStorage(storage);
    if (!store)
        return;
    try {
        store.setItem(SESSION_LAYOUTS_STORAGE_KEY, JSON.stringify(map));
    }
    catch {
        // Idem: sem storage, a memória por sessão vale só para a aba atual.
    }
}
//# sourceMappingURL=layoutPersistence.js.map