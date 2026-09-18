/**
 * Custom View Grid (LAYOUT.md §Custom View Grid / ICustomViewService).
 *
 * Uma custom view é uma superfície full-surface contribuída que SUBSTITUI o
 * conteúdo da sessão. Regras do original replicadas aqui:
 *
 * 1. É mutuamente exclusiva com Sessions Part, Editor, Auxiliary Bar e Panel.
 *    Apenas Title Bar e Sidebar continuam disponíveis.
 * 2. As parts cobertas retêm a *desired visibility* separada da *effective
 *    visibility* — por isso o estado guarda o que o usuário queria antes de a
 *    view abrir, e devolve exatamente isso ao fechar.
 * 3. Abrir uma sessão dispensa (dismiss) a custom view ativa.
 * 4. Em telefone, a custom view participa da navegação: o "voltar" dispensa.
 *
 * Este módulo é puro (sem React): o App só lê/aplica o que ele decide.
 */
export type CustomViewId = 'aiCustomizations' | 'automations' | 'test';
export interface PartVisibility {
    sessionsPart: boolean;
    editor: boolean;
    auxiliaryBar: boolean;
    panel: boolean;
}
export interface CustomViewState {
    activeView: CustomViewId | null;
    /** O que o usuário queria ver antes da custom view cobrir as parts. */
    desiredVisibility: PartVisibility;
}
export declare const CUSTOM_VIEW_STORAGE_KEY = "workbench.customView.v1";
export declare const CUSTOM_VIEW_IDS: readonly CustomViewId[];
export declare const DEFAULT_PART_VISIBILITY: PartVisibility;
export declare function emptyCustomViewState(): CustomViewState;
export declare function isCustomViewId(value: unknown): value is CustomViewId;
export declare function shouldShowCustomViewGrid(state: CustomViewState): boolean;
/**
 * Abre uma custom view capturando a visibilidade desejada atual.
 *
 * Se já existe uma view ativa, a captura NÃO é refeita: as parts já estão
 * cobertas e o que chega como `current` é a visibilidade *efetiva* (tudo
 * falso). Recapturar aqui apagaria a preferência do usuário — é exatamente o
 * bug que "desired vs effective visibility" existe para evitar.
 */
export declare function openCustomView(state: CustomViewState, view: CustomViewId, current: PartVisibility): CustomViewState;
/** Fecha a custom view; a visibilidade desejada permanece para ser restaurada. */
export declare function closeCustomView(state: CustomViewState): CustomViewState;
/** Abrir uma sessão dispensa a custom view ativa (LAYOUT.md). */
export declare function dismissCustomViewOnSessionOpen(state: CustomViewState): CustomViewState;
/** No phone, o "voltar" dispensa a custom view antes de mexer na navegação. */
export declare function dismissCustomViewOnBack(state: CustomViewState): {
    state: CustomViewState;
    handled: boolean;
};
/**
 * Visibilidade EFETIVA das parts: com custom view ativa, todas as parts da
 * cadeia horizontal principal ficam escondidas.
 */
export declare function effectivePartVisibility(state: CustomViewState): PartVisibility;
/** Visibilidade a restaurar quando a custom view fecha. */
export declare function restoredPartVisibility(state: CustomViewState): PartVisibility;
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
/** F5 com custom view ativa: o estado volta igual (inclusive o desired). */
export declare function loadCustomViewState(storage?: StorageLike): CustomViewState;
export declare function saveCustomViewState(state: CustomViewState, storage?: StorageLike): void;
/** Rótulo humano da view (usado no cabeçalho do grid e em aria-labels). */
export declare function customViewTitle(view: CustomViewId): string;
export {};
//# sourceMappingURL=customView.d.ts.map