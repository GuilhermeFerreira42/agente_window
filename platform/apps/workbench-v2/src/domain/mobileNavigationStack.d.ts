export type MobileLayerKind = 'drawer' | 'custom-view' | 'picker' | 'full-screen-editor';
export interface MobileLayer {
    id: string;
    kind: MobileLayerKind;
    /** Rótulo legível (para acessibilidade/telemetria). */
    label?: string;
}
export interface MobileNavigationStack {
    /** Camadas do fundo → topo. A última é a camada ativa (topo). */
    readonly layers: readonly MobileLayer[];
}
export declare const EMPTY_NAVIGATION_STACK: MobileNavigationStack;
/** A camada do topo (ativa), ou undefined se a pilha está vazia. */
export declare function topLayer(stack: MobileNavigationStack): MobileLayer | undefined;
export declare function hasLayers(stack: MobileNavigationStack): boolean;
/**
 * Empurra uma camada para o topo. Se já existir uma camada com o mesmo id, ela
 * é movida para o topo (replace, sem duplicar) preservando a nova definição.
 */
export declare function pushLayer(stack: MobileNavigationStack, layer: MobileLayer): MobileNavigationStack;
export interface BackNavigationResult {
    stack: MobileNavigationStack;
    /** A camada dispensada nesta volta (se havia alguma). */
    dismissed?: MobileLayer;
    /**
     * true quando a pilha já estava vazia: a back-navigation sai da superfície da
     * sessão atual em vez de dispensar uma camada.
     */
    exitedSession: boolean;
}
/**
 * Back-navigation da plataforma: dispensa apenas a camada do topo. Quando a
 * pilha está vazia, sinaliza a saída da superfície da sessão (`exitedSession`).
 */
export declare function navigateBack(stack: MobileNavigationStack): BackNavigationResult;
/** Dispensa uma camada específica por id (ex.: fechar um drawer por botão). */
export declare function dismissLayer(stack: MobileNavigationStack, id: string): MobileNavigationStack;
/**
 * Troca de sessão: reseta todas as camadas transitórias. O dono da limpeza é a
 * troca de sessão (não os componentes lendo storage keys uns dos outros).
 */
export declare function resetForSessionSwitch(): MobileNavigationStack;
//# sourceMappingURL=mobileNavigationStack.d.ts.map