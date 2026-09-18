export type LayoutPlatform = 'desktop' | 'mobile';
/** Estado de layout por sessão que o controller sincroniza. */
export interface PerSessionLayoutState {
    /** Aux bar (secondary side bar) — apenas no layout clássico/desktop. */
    auxiliaryVisible: boolean;
    /** Container de detalhes ativo (changes/files). */
    activeViewContainerId: 'changes' | 'files';
    /** Visibilidade do painel inferior (terminal/output) — todas as plataformas. */
    panelVisible: boolean;
}
export interface LayoutController {
    readonly platform: LayoutPlatform;
    /** A plataforma mantém a barra auxiliar como coluna persistente. */
    readonly managesAuxiliaryBar: boolean;
    /**
     * A aux bar deve ser apresentada agora? Em mobile é SEMPRE false (skipada por
     * completo — não escondida via CSS). Em desktop, segue o estado da sessão e a
     * regra de supressão multi-sessão.
     */
    shouldRenderAuxiliaryBar(inputs: {
        auxiliaryVisible: boolean;
        multipleSessionsVisible: boolean;
    }): boolean;
    /** Estado de layout efetivo para uma sessão, aplicando a política da plataforma. */
    effectiveSessionState(state: PerSessionLayoutState, multipleSessionsVisible: boolean): PerSessionLayoutState;
}
/**
 * Contribui o controller correto por plataforma (paridade com
 * `sessions.layout.contribution.ts`).
 */
export declare function createLayoutController(platform: LayoutPlatform): LayoutController;
/** Deriva a plataforma do controller a partir do viewport single-pane/phone. */
export declare function layoutPlatformFor(isSinglePane: boolean): LayoutPlatform;
//# sourceMappingURL=layoutController.d.ts.map