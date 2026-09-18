// E14 — ISessionsService: modelo de sessões visíveis do Sessions Part
// (LAYOUT.md §Sessions Part, LAYOUT_CONTROLLER.md §Multiple visible sessions).
//
// O serviço é o dono único de:
// - identidade e ordem das sessões visíveis;
// - a sessão visível ativa;
// - qual chat está ativo em cada sessão;
// - a restauração do arranjo visível.
//
// O Sessions Part apenas renderiza esse modelo — NÃO cria um segundo store de
// sessão ativa. Quando mais de uma sessão está visível, a sincronização por
// sessão é suprimida (multipleSessionsVisibleObs) e o estado de view/panel por
// sessão é limpo.
export function createSessionsServiceState(init) {
    return {
        visible: [init.active],
        active: init.active,
        activeChatBySession: { ...(init.activeChatBySession ?? {}) },
    };
}
/** Mais de uma sessão visível ao mesmo tempo (multipleSessionsVisibleObs). */
export function multipleSessionsVisible(state) {
    return state.visible.length > 1;
}
/**
 * Torna `id` a sessão ativa. Se ainda não estiver visível, entra como única
 * visível (comportamento padrão de troca de sessão). Idempotente para a ativa.
 */
export function setActiveSession(state, id) {
    if (state.active === id && state.visible.includes(id))
        return state;
    const visible = state.visible.includes(id) ? state.visible : [id];
    return { ...state, visible, active: id };
}
/**
 * Adiciona `id` ao grid de sessões visíveis (sem duplicar) e o torna ativo,
 * preservando a ordem existente. Um novo id é anexado ao fim.
 */
export function addVisibleSession(state, id) {
    const visible = state.visible.includes(id) ? state.visible : [...state.visible, id];
    return { ...state, visible, active: id };
}
/**
 * Remove `id` do grid. Nunca deixa o grid vazio: se remover a última visível, é
 * no-op. Se remover a ativa, promove a vizinha (anterior, senão a primeira).
 */
export function removeVisibleSession(state, id) {
    if (!state.visible.includes(id))
        return state;
    if (state.visible.length === 1)
        return state;
    const index = state.visible.indexOf(id);
    const visible = state.visible.filter((candidate) => candidate !== id);
    let active = state.active;
    if (active === id) {
        active = visible[Math.max(0, index - 1)] ?? visible[0];
    }
    return { ...state, visible, active };
}
/** Reordena o grid movendo `fromId` para a posição de `toId`. */
export function reorderVisibleSessions(state, fromId, toId) {
    if (fromId === toId)
        return state;
    const from = state.visible.indexOf(fromId);
    const to = state.visible.indexOf(toId);
    if (from < 0 || to < 0)
        return state;
    const visible = [...state.visible];
    visible.splice(from, 1);
    visible.splice(to, 0, fromId);
    return { ...state, visible };
}
/** Define o chat ativo de uma sessão. */
export function setActiveChat(state, sessionId, chatId) {
    return { ...state, activeChatBySession: { ...state.activeChatBySession, [sessionId]: chatId } };
}
/**
 * Aplica a regra de supressão. Com uma única sessão visível, o sync por sessão
 * segue normal. Com múltiplas, limpa as entradas das sessões visíveis e sinaliza
 * que os autoruns devem bailar cedo.
 */
export function applySyncSuppression(state, viewStateBySession, panelVisibilityBySession) {
    if (!multipleSessionsVisible(state)) {
        return { shouldSyncPerSession: true, viewStateBySession, panelVisibilityBySession };
    }
    const visible = new Set(state.visible);
    const clearedView = {};
    for (const [key, value] of Object.entries(viewStateBySession)) {
        if (!visible.has(key))
            clearedView[key] = value;
    }
    const clearedPanel = {};
    for (const [key, value] of Object.entries(panelVisibilityBySession)) {
        if (!visible.has(key))
            clearedPanel[key] = value;
    }
    return { shouldSyncPerSession: false, viewStateBySession: clearedView, panelVisibilityBySession: clearedPanel };
}
/**
 * Detecta uma troca real de sessão (previous !== active), distinguindo de uma
 * carga inicial (previous indefinido) ou reavaliação sem mudança.
 */
export function isRealSwitch(previous, active) {
    return previous !== undefined && previous !== active;
}
//# sourceMappingURL=sessionsService.js.map