export interface PulldownConfig {
    /** Distância mínima (px) para dispensar ao soltar. Default 120. */
    dismissDistance: number;
    /** Velocidade mínima (px/ms) de flick para dispensar. Default 0.5. */
    dismissVelocity: number;
    /** Distância mínima (px) que um flick precisa percorrer p/ contar. Default 48. */
    minFlickDistance: number;
    /** Fator de resistência aplicado ao deslocamento (0..1). Default 0.5. */
    resistance: number;
    /** Razão mínima |dy|/|dx| para tratar como gesto vertical. Default 1. */
    directionRatio: number;
}
export declare const DEFAULT_PULLDOWN_CONFIG: PulldownConfig;
export interface PulldownState {
    active: boolean;
    startX: number;
    startY: number;
    startTime: number;
    /** Deslocamento visual (após resistência), sempre >= 0. */
    offset: number;
    lastY: number;
    lastTime: number;
}
export declare const IDLE_PULLDOWN: PulldownState;
/**
 * Início do gesto. Só arma quando o conteúdo está no topo (scrollTop<=0); caso
 * contrário retorna o estado ocioso (a rolagem nativa assume).
 */
export declare function pulldownStart(x: number, y: number, time: number, scrollTop: number): PulldownState;
/**
 * Atualiza o gesto com um novo ponto. Retorna o novo estado (com `offset`
 * calculado por resistência). Se o movimento não for vertical-para-baixo, o
 * gesto é cancelado (offset volta a 0, active=false) para liberar scroll/swipe.
 */
export declare function pulldownMove(state: PulldownState, x: number, y: number, time: number, config?: PulldownConfig): PulldownState;
export interface PulldownEndResult {
    dismiss: boolean;
    state: PulldownState;
}
/**
 * Fim do gesto. Dispensa quando o deslocamento bruto passa do limiar de
 * distância OU quando a velocidade recente (flick) passa do limiar. Sempre
 * retorna ao estado ocioso.
 */
export declare function pulldownEnd(state: PulldownState, time: number, config?: PulldownConfig): PulldownEndResult;
//# sourceMappingURL=pulldownDismiss.d.ts.map