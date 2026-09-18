// E15 — Mobile Agents Window (MOBILE.md).
//
// Classificação de viewport e o "part factory pattern": as factories escolhem a
// implementação mobile OU desktop UMA vez na construção (com base no viewport
// inicial) e NÃO trocam a instância quando o viewport cruza o breakpoint depois
// — a instância mobile apenas delega ao comportamento desktop após sair do
// layout de telefone.
/** Breakpoints (px). Telefone é o único que troca a composição. */
export const PHONE_MAX_WIDTH = 600;
export const TABLET_MAX_WIDTH = 1024;
/** Classifica o viewport atual. Phone exige largura estreita E toque. */
export function classifyViewport(env) {
    if (env.touch && env.width <= PHONE_MAX_WIDTH)
        return 'phone';
    if (env.width <= TABLET_MAX_WIDTH)
        return 'tablet';
    return 'desktop';
}
/** Context key declarativo `isPhone` (input para menus/registro de views). */
export function isPhoneViewport(env) {
    return classifyViewport(env) === 'phone';
}
/**
 * A factory escolhe a implementação UMA vez, no viewport inicial. Telefone →
 * 'mobile'; caso contrário 'desktop'. (Rotacionar/redimensionar depois NÃO troca
 * a instância — quem lida com isso é `delegatesToDesktop`.)
 */
export function selectPartImplementation(initialEnv) {
    return isPhoneViewport(initialEnv) ? 'mobile' : 'desktop';
}
/**
 * Uma part mobile já instanciada delega ao comportamento desktop quando o
 * viewport atual não é mais de telefone (sem recriar a instância).
 */
export function mobilePartDelegatesToDesktop(currentEnv) {
    return !isPhoneViewport(currentEnv);
}
/**
 * Comportamento desktop-only deve ser "gated" ANTES da apresentação quando o
 * componente é inadequado para telefone (não escondido só com CSS depois).
 * Retorna true se o comportamento desktop pode ser apresentado.
 */
export function allowsDesktopOnlyBehavior(env) {
    return !isPhoneViewport(env);
}
//# sourceMappingURL=mobileLayout.js.map