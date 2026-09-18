import { type IObservable } from './observable';
export interface LayoutSyncInputs {
    /** Recurso (id/URI) da sessão ativa; `undefined` no landing/rascunho sem id. */
    readonly activeSessionResource: IObservable<string | undefined>;
    /** Há mais de uma sessão visível no grid (Sessions Part). */
    readonly multipleSessionsVisible: IObservable<boolean>;
    /** Ids das sessões atualmente visíveis (usado para limpar estado na supressão). */
    readonly visibleSessionResources: IObservable<readonly string[]>;
}
export interface LayoutSyncEffects {
    /**
     * Captura o estado de layout da sessão que está SAINDO. Chamado apenas numa
     * troca real e apenas fora do modo multi-sessão.
     */
    captureOutgoing(resource: string): void;
    /**
     * Restaura o estado de layout da sessão que está ENTRANDO. Chamado numa troca
     * real fora do modo multi-sessão.
     */
    restoreIncoming(resource: string): void;
    /**
     * Limpa o estado por sessão (aux bar + painel) das sessões visíveis. Chamado
     * pelo autorun de supressão enquanto múltiplas sessões estão visíveis, para
     * que a visibilidade padrão rode de novo ao colapsar.
     */
    clearVisibleSessionState(resources: readonly string[]): void;
}
export interface LayoutSyncOptions {
    /**
     * Semeia o `previousSessionResource` local na construção. Usar quando a sessão
     * ativa inicial já está "posicionada" (load inicial) e NÃO deve disparar um
     * restore que sobrescreveria o estado de layout já persistido/hidratado.
     */
    readonly initialPreviousResource?: string;
}
/**
 * Instala o gatilho de troca de sessão. Retorna um `dispose` que remove ambos os
 * autoruns.
 */
export interface LayoutSyncHandle {
    dispose(): void;
    /**
     * Rebaseia o `previousSessionResource` local sem disparar capturar/restaurar.
     * Usado para trocas "passivas" (criação/exclusão de sessão): definindo o
     * previous ANTES de atualizar o observable da sessão ativa, o autorun observa
     * `previous === active` e não aplica restore — preservando o comportamento em
     * que criar/excluir sessão não restaura layout salvo.
     */
    setPreviousResource(resource: string | undefined): void;
}
export declare function createLayoutSync(inputs: LayoutSyncInputs, effects: LayoutSyncEffects, options?: LayoutSyncOptions): LayoutSyncHandle;
//# sourceMappingURL=sessionLayoutSync.d.ts.map