// E15 — Agent Workbench layout service (SINGLE_PANE_SCENARIOS.md).
//
// O recurso de single-pane detail panel é controlado pela configuração
// experimental `sessions.layout.singlePaneDetailPanel` (DOCK_DETAIL_PANEL_SETTING),
// lida UMA vez no startup — um reload da janela aplica a mudança. A configuração
// é lida apenas por `createSessionsWorkbench`, que publica a escolha via
// `IAgentWorkbenchLayoutService.isSinglePaneLayoutEnabled` (código imperativo) e
// a context key `SinglePaneLayoutEnabledContext` (cláusulas `when` declarativas).
//
// Regras da matriz do spec:
// - Setting ON (default): janelas Agents NÃO-phone usam single-pane; phone sempre
//   usa o layout clássico.
// - Setting OFF: todas as janelas usam o layout clássico.
// - O Main Editor suporta exatamente 1 editor group quando o single-pane está
//   habilitado: split/grid ficam desabilitados (não vale para o chat grid).
export const DOCK_DETAIL_PANEL_SETTING = 'sessions.layout.singlePaneDetailPanel';
/** Valor default da configuração (ON por spec). */
export const DEFAULT_SINGLE_PANE_SETTING = true;
/**
 * Resolve a escolha de layout a partir do ambiente. Deve ser chamada UMA vez no
 * startup (equivalente a `createSessionsWorkbench`); o resultado é imutável.
 */
export function createAgentWorkbenchLayout(env) {
    // Single-pane só quando o setting está ON e a janela NÃO é phone.
    const enabled = env.singlePaneSetting && !env.isPhone;
    return Object.freeze({
        isSinglePaneLayoutEnabled: enabled,
        singlePaneLayoutEnabledContext: enabled,
        editorSplitDisabled: enabled,
    });
}
/**
 * Gate imperativo para pedidos de split/grid do Main Editor. Retorna true quando
 * a operação é permitida. Quando o single-pane está ligado, split/grid são
 * rejeitados (mas o chat grid não passa por aqui).
 */
export function canSplitMainEditor(layout) {
    return !layout.editorSplitDisabled;
}
const STORAGE_KEY = 'agents.layout.singlePaneDetailPanel';
/**
 * Lê a configuração persistida (uma vez no startup). Ausência/erro caem no
 * default ON. A gravação simula "mudar o setting e recarregar a janela".
 */
export function readSinglePaneSetting(storage) {
    if (!storage)
        return DEFAULT_SINGLE_PANE_SETTING;
    try {
        const raw = storage.getItem(STORAGE_KEY);
        if (raw === null)
            return DEFAULT_SINGLE_PANE_SETTING;
        return raw === 'true';
    }
    catch {
        return DEFAULT_SINGLE_PANE_SETTING;
    }
}
export function writeSinglePaneSetting(storage, value) {
    if (!storage)
        return;
    try {
        storage.setItem(STORAGE_KEY, String(value));
    }
    catch {
        // Sem persistência disponível — ignorar (mock).
    }
}
//# sourceMappingURL=agentWorkbenchLayout.js.map