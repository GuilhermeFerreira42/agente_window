export type NavigationKey = 'ArrowDown' | 'ArrowUp' | 'Home' | 'End' | 'PageDown' | 'PageUp';
export interface RovingNavigationOptions {
    /** Quantidade total de itens navegáveis. */
    count: number;
    /** Índice atualmente focado (-1 se nenhum). */
    current: number;
    /** Itens por "página" para PageUp/PageDown (default 8). */
    pageSize?: number;
}
/**
 * Retorna o próximo índice para a tecla dada, ou o índice atual se não há
 * movimento possível. Nunca retorna fora de [0, count-1]; retorna -1 apenas
 * quando a lista está vazia.
 */
export declare function nextRovingIndex(key: NavigationKey, options: RovingNavigationOptions): number;
/** As teclas que este helper trata (para decidir preventDefault). */
export declare function isNavigationKey(key: string): key is NavigationKey;
//# sourceMappingURL=keyboardNavigation.d.ts.map