// E4 — Estado de layout por sessão (LAYOUT_CONTROLLER.md).
//
// Todo o estado da workbench flui da sessão ativa (`activeSession`). Ao sair de
// uma sessão, capturamos a visibilidade da barra auxiliar e qual "view
// container" estava ativo (Changes/Files); ao voltar, restauramos exatamente
// esse estado. Os working sets (abas do editor, browser) NÃO são limpos ao
// alternar entre sessões — cada sessão preserva o seu.
/** Estado padrão para uma sessão nunca vista antes. */
export const DEFAULT_SESSION_LAYOUT = {
    auxiliaryVisible: false,
    activeViewContainerId: 'changes',
};
/**
 * Captura o estado de layout da sessão que está sendo deixada. Retorna um novo
 * mapa (imutável) — não muta a entrada. Sessões sem id (rascunho/landing) são
 * ignoradas, pois não têm working set persistente.
 */
export function captureSessionLayout(map, sessionId, state) {
    if (!sessionId)
        return map;
    const current = map[sessionId];
    if (current && current.auxiliaryVisible === state.auxiliaryVisible && current.activeViewContainerId === state.activeViewContainerId) {
        return map;
    }
    return { ...map, [sessionId]: { ...state } };
}
/**
 * Restaura o estado de layout para a sessão que está sendo aberta. Se a sessão
 * nunca foi vista, cai no padrão (ou no fallback fornecido, p.ex. a preferência
 * global inicial).
 */
export function restoreSessionLayout(map, sessionId, fallback = DEFAULT_SESSION_LAYOUT) {
    if (!sessionId)
        return { ...fallback };
    const stored = map[sessionId];
    return stored ? { ...stored } : { ...fallback };
}
/**
 * Remove o estado de layout de uma sessão excluída, evitando entradas órfãs.
 * Retorna um novo mapa; não muta a entrada.
 */
export function forgetSessionLayout(map, sessionId) {
    if (!(sessionId in map))
        return map;
    const next = { ...map };
    delete next[sessionId];
    return next;
}
//# sourceMappingURL=sessionLayout.js.map