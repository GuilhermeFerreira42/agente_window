/** Classes de viewport derivadas da largura + plataforma. */
export type ViewportClass = 'phone' | 'tablet' | 'desktop';
/** Breakpoints (px). Telefone é o único que troca a composição. */
export declare const PHONE_MAX_WIDTH = 600;
export declare const TABLET_MAX_WIDTH = 1024;
export interface ViewportEnvironment {
    width: number;
    /** Plataforma de toque (coarse pointer / SO móvel). */
    touch: boolean;
}
/** Classifica o viewport atual. Phone exige largura estreita E toque. */
export declare function classifyViewport(env: ViewportEnvironment): ViewportClass;
/** Context key declarativo `isPhone` (input para menus/registro de views). */
export declare function isPhoneViewport(env: ViewportEnvironment): boolean;
/** Qual implementação uma part factory seleciona (mobile vs desktop). */
export type PartImplementation = 'mobile' | 'desktop';
/**
 * A factory escolhe a implementação UMA vez, no viewport inicial. Telefone →
 * 'mobile'; caso contrário 'desktop'. (Rotacionar/redimensionar depois NÃO troca
 * a instância — quem lida com isso é `delegatesToDesktop`.)
 */
export declare function selectPartImplementation(initialEnv: ViewportEnvironment): PartImplementation;
/**
 * Uma part mobile já instanciada delega ao comportamento desktop quando o
 * viewport atual não é mais de telefone (sem recriar a instância).
 */
export declare function mobilePartDelegatesToDesktop(currentEnv: ViewportEnvironment): boolean;
/**
 * Comportamento desktop-only deve ser "gated" ANTES da apresentação quando o
 * componente é inadequado para telefone (não escondido só com CSS depois).
 * Retorna true se o comportamento desktop pode ser apresentado.
 */
export declare function allowsDesktopOnlyBehavior(env: ViewportEnvironment): boolean;
//# sourceMappingURL=mobileLayout.d.ts.map