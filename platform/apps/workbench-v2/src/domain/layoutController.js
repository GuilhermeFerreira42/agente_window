// E4/E15 — Layout controllers da Agents Window (LAYOUT_CONTROLLER.md §Overview).
//
// `BaseLayoutController` possui a mecânica agnóstica de plataforma: painel
// (visibilidade por sessão), working sets do editor, e supressão multi-sessão.
// `DesktopLayoutController` ADICIONA o gerenciamento da barra auxiliar (aux bar);
// `MobileLayoutController` (web phone) OMITE a aux bar por completo. A
// contribuição escolhe o controller correto por plataforma.
//
// Aqui modelamos o contrato como funções puras + uma factory, para que a UI
// consulte "esta plataforma gerencia a aux bar?" e "esta view container é
// suportada?" sem duplicar a política de layout.
const BASE_PANEL_ONLY = (state, multipleSessionsVisible) => ({
    ...state,
    // Supressão multi-sessão: quando várias sessões estão visíveis no grid, o
    // sync por sessão é suprimido — não force nenhum estado de detalhe.
    panelVisible: multipleSessionsVisible ? state.panelVisible : state.panelVisible,
});
class DesktopLayoutController {
    platform = 'desktop';
    managesAuxiliaryBar = true;
    shouldRenderAuxiliaryBar({ auxiliaryVisible, multipleSessionsVisible }) {
        // Com múltiplas sessões visíveis, o sync por sessão é suprimido e a aux bar
        // não é apresentada como coluna dedicada.
        if (multipleSessionsVisible)
            return false;
        return auxiliaryVisible;
    }
    effectiveSessionState(state, multipleSessionsVisible) {
        return BASE_PANEL_ONLY(state, multipleSessionsVisible);
    }
}
class MobileLayoutController {
    platform = 'mobile';
    // MobileLayoutController omite o gerenciamento da aux bar (LAYOUT_CONTROLLER.md:13).
    managesAuxiliaryBar = false;
    shouldRenderAuxiliaryBar() {
        // Web phone: aux bar totalmente skipada (R-033). O conteúdo de detalhes é
        // apresentado via navegação mobile/overlays, nunca como coluna persistente.
        return false;
    }
    effectiveSessionState(state, multipleSessionsVisible) {
        // Sem aux bar: a visibilidade de detalhes nunca é uma coluna; preserva só o
        // container ativo (para quando o overlay abrir) e o painel.
        return { ...BASE_PANEL_ONLY(state, multipleSessionsVisible), auxiliaryVisible: false };
    }
}
/**
 * Contribui o controller correto por plataforma (paridade com
 * `sessions.layout.contribution.ts`).
 */
export function createLayoutController(platform) {
    return platform === 'mobile' ? new MobileLayoutController() : new DesktopLayoutController();
}
/** Deriva a plataforma do controller a partir do viewport single-pane/phone. */
export function layoutPlatformFor(isSinglePane) {
    return isSinglePane ? 'mobile' : 'desktop';
}
//# sourceMappingURL=layoutController.js.map