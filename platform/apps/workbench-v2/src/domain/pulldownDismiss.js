// R-049 — gesto pulldown-to-dismiss dos overlays de diff mobile.
//
// MOBILE.md: "Platform back navigation dismisses the top layer before leaving
// the current session surface." Em telefone, os overlays full-screen (diff)
// também podem ser dispensados arrastando para baixo (pulldown). Esta é a
// mecânica pura do gesto, agnóstica de DOM/React, para ser testável.
//
// Regras:
// - O gesto só dispensa quando o arrasto é predominantemente VERTICAL e para
//   BAIXO (não sequestra scroll horizontal nem swipes para cima).
// - O arrasto só inicia quando o conteúdo está no topo do scroll (scrollTop<=0),
//   para não competir com a rolagem nativa do diff.
// - O deslocamento aplicado tem resistência (não segue o dedo 1:1) e nunca é
//   negativo.
// - Dispensa quando, ao soltar, o deslocamento passa do limiar de distância OU
//   a velocidade de arraste (flick) passa do limiar de velocidade.
export const DEFAULT_PULLDOWN_CONFIG = {
    dismissDistance: 120,
    dismissVelocity: 0.5,
    minFlickDistance: 48,
    resistance: 0.5,
    directionRatio: 1,
};
export const IDLE_PULLDOWN = {
    active: false,
    startX: 0,
    startY: 0,
    startTime: 0,
    offset: 0,
    lastY: 0,
    lastTime: 0,
};
/**
 * Início do gesto. Só arma quando o conteúdo está no topo (scrollTop<=0); caso
 * contrário retorna o estado ocioso (a rolagem nativa assume).
 */
export function pulldownStart(x, y, time, scrollTop) {
    if (scrollTop > 0)
        return IDLE_PULLDOWN;
    return { active: true, startX: x, startY: y, startTime: time, offset: 0, lastY: y, lastTime: time };
}
/**
 * Atualiza o gesto com um novo ponto. Retorna o novo estado (com `offset`
 * calculado por resistência). Se o movimento não for vertical-para-baixo, o
 * gesto é cancelado (offset volta a 0, active=false) para liberar scroll/swipe.
 */
export function pulldownMove(state, x, y, time, config = DEFAULT_PULLDOWN_CONFIG) {
    if (!state.active)
        return state;
    const dx = x - state.startX;
    const dy = y - state.startY;
    // Movimento para cima → não é pulldown.
    if (dy <= 0) {
        return { ...state, offset: 0, lastY: y, lastTime: time };
    }
    // Predominância vertical: |dy| deve superar |dx| pela razão configurada.
    if (Math.abs(dx) * config.directionRatio > Math.abs(dy)) {
        return { ...IDLE_PULLDOWN };
    }
    const offset = Math.max(0, dy * config.resistance);
    return { ...state, offset, lastY: y, lastTime: time };
}
/**
 * Fim do gesto. Dispensa quando o deslocamento bruto passa do limiar de
 * distância OU quando a velocidade recente (flick) passa do limiar. Sempre
 * retorna ao estado ocioso.
 */
export function pulldownEnd(state, time, config = DEFAULT_PULLDOWN_CONFIG) {
    if (!state.active)
        return { dismiss: false, state: IDLE_PULLDOWN };
    const rawDistance = state.lastY - state.startY;
    // Velocidade média do gesto (px/ms), com piso de 1ms para evitar divisão por 0.
    const elapsed = Math.max(1, time - state.startTime);
    const velocity = Math.max(0, rawDistance) / elapsed;
    // Um flick só conta se percorreu uma distância mínima (evita que timestamps
    // idênticos — comuns em ambiente de teste — tornem qualquer toque um flick).
    const isFlick = rawDistance >= config.minFlickDistance && velocity >= config.dismissVelocity;
    const dismiss = rawDistance >= config.dismissDistance || isFlick;
    return { dismiss, state: IDLE_PULLDOWN };
}
//# sourceMappingURL=pulldownDismiss.js.map