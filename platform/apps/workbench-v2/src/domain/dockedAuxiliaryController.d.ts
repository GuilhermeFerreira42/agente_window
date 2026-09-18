import type { EditorTab } from '../types';
/** Abas acopladas (docked) ao painel de detalhe: Changes/Files. */
export declare const DOCKED_TAB_TYPES: readonly EditorTab['type'][];
export declare function isDockedTab(tab: EditorTab): boolean;
/**
 * Uma aba não-acoplada é restaurável quando pode ser reaberta de forma idêntica
 * ao mostrar o editor novamente. Search editors são untitled/efêmeros no
 * original ("dirty untitled Search editor") → não-restauráveis (descartados).
 * Browser e AI Customizations são restauráveis.
 */
export declare function isRestorableTab(tab: EditorTab): boolean;
/** Uma aba capturada para restauração posterior. */
export interface CapturedTab {
    tab: EditorTab;
    /** Posição relativa (índice) que a aba ocupava, para ordenação estável. */
    order: number;
}
export interface DockedControllerState {
    /** Abas capturadas ao entrar em Detail-only, aguardando o editor reaparecer. */
    captured: readonly CapturedTab[];
}
export declare const EMPTY_DOCKED_STATE: DockedControllerState;
export interface EnterDetailOnlyResult {
    /** Abas que permanecem (apenas as acopladas Changes/Files). */
    tabs: EditorTab[];
    /** Novo estado do controller com as abas restauráveis capturadas. */
    state: DockedControllerState;
    /** Abas descartadas por não serem restauráveis (ex.: Search sujo). */
    dropped: EditorTab[];
}
/**
 * Entra no estado Detail-only (Hide Editor). Mantém só as abas acopladas,
 * captura as não-acopladas restauráveis e descarta as não-restauráveis.
 * Restringe a operação às abas da sessão ativa (as demais sessões não são
 * tocadas), casando com o escopo por-sessão do editor group.
 */
export declare function enterDetailOnly(tabs: readonly EditorTab[], activeSessionId: string | undefined): EnterDetailOnlyResult;
/**
 * Mostra o editor de novo (Show Editor): restaura as abas capturadas ao FINAL
 * da faixa, preservando a ordem de captura, e limpa o estado. Restored tabs
 * managed no original entram ao fim — aqui idem.
 */
export declare function showEditorRestore(tabs: readonly EditorTab[], state: DockedControllerState): {
    tabs: EditorTab[];
    state: DockedControllerState;
};
//# sourceMappingURL=dockedAuxiliaryController.d.ts.map