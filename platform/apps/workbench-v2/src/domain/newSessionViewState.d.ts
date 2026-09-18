import type { SessionLayoutState } from './sessionLayout';
export interface NewSessionViewState {
    auxiliaryVisible: boolean;
    defaultContainerId: 'changes' | 'files';
}
export declare const NEW_SESSION_VIEW_STATE_KEY = "agents-new-session-layout";
export declare const DEFAULT_NEW_SESSION_VIEW_STATE: NewSessionViewState;
/** Deriva auxiliaryVisible — útil para expressões declarativas. */
export declare function newSessionAuxVisible(state: NewSessionViewState): boolean;
type StorageLike = {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
};
/**
 * Lê o estado compartilhado de nova sessão. Aceita storage injetável para
 * testes unitários; no app real usa window.localStorage. Dados corrompidos
 * caem defensivamente no padrão.
 */
export declare function readNewSessionViewState(injected?: StorageLike): NewSessionViewState;
/** Persiste o estado imediatamente (sobrevive a F5 na landing). */
export declare function writeNewSessionViewState(injected: StorageLike, state: NewSessionViewState): void;
export declare function writeNewSessionViewState(state: NewSessionViewState): void;
/**
 * Alterna (ou define explicitamente) a visibilidade da aux bar e persiste.
 * Retorna o mesmo objeto (referência estável) quando o valor não muda — útil
 * para evitar re-renders desnecessários.
 */
export declare function toggleNewSessionAux(current: NewSessionViewState, next?: boolean): NewSessionViewState;
/**
 * Semeia o estado inicial de uma sessão recém-criada a partir do
 * newSessionViewState. A sessão herdará a preferência de aux bar que o usuário
 * deixou na landing, mas a partir daí o estado passa a ser por-sessão.
 */
export declare function seedCreatedFromNewSession(current: NewSessionViewState): SessionLayoutState;
export {};
//# sourceMappingURL=newSessionViewState.d.ts.map