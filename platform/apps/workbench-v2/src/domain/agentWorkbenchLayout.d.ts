export declare const DOCK_DETAIL_PANEL_SETTING = "sessions.layout.singlePaneDetailPanel";
/** Fatores do ambiente lidos no startup para decidir o layout. */
export interface WorkbenchEnvironment {
    /** Valor da configuração `sessions.layout.singlePaneDetailPanel` (default ON). */
    singlePaneSetting: boolean;
    /** A janela é um viewport de telefone (phone) — sempre clássico. */
    isPhone: boolean;
}
/** Escolha de layout publicada pelo serviço, imutável após o startup. */
export interface AgentWorkbenchLayout {
    /** Publicado como `isSinglePaneLayoutEnabled` (lido por código imperativo). */
    readonly isSinglePaneLayoutEnabled: boolean;
    /** Context key `SinglePaneLayoutEnabledContext` (cláusulas `when`). */
    readonly singlePaneLayoutEnabledContext: boolean;
    /** O Main Editor está restrito a exatamente 1 group (split/grid off). */
    readonly editorSplitDisabled: boolean;
}
/** Valor default da configuração (ON por spec). */
export declare const DEFAULT_SINGLE_PANE_SETTING = true;
/**
 * Resolve a escolha de layout a partir do ambiente. Deve ser chamada UMA vez no
 * startup (equivalente a `createSessionsWorkbench`); o resultado é imutável.
 */
export declare function createAgentWorkbenchLayout(env: WorkbenchEnvironment): AgentWorkbenchLayout;
/**
 * Gate imperativo para pedidos de split/grid do Main Editor. Retorna true quando
 * a operação é permitida. Quando o single-pane está ligado, split/grid são
 * rejeitados (mas o chat grid não passa por aqui).
 */
export declare function canSplitMainEditor(layout: AgentWorkbenchLayout): boolean;
/**
 * Lê a configuração persistida (uma vez no startup). Ausência/erro caem no
 * default ON. A gravação simula "mudar o setting e recarregar a janela".
 */
export declare function readSinglePaneSetting(storage: Pick<Storage, 'getItem'> | undefined): boolean;
export declare function writeSinglePaneSetting(storage: Pick<Storage, 'setItem'> | undefined, value: boolean): void;
//# sourceMappingURL=agentWorkbenchLayout.d.ts.map