// (R-035) — Shared new-session view state (LAYOUT_CONTROLLER.md §Uncreated sessions).
//
// "Uncreated sessions share a single state (sessions.newSessionViewState)".
// Quando o usuário alterna entre sessões novas (landing) a preferência de
// visibilidade da aux bar persiste entre elas e entre reloads — é um estado
// global, não por-sessão, porque a sessão ainda não existe de fato.
//
// Persiste no localStorage sob a chave NEW_SESSION_VIEW_STATE_KEY.
export const NEW_SESSION_VIEW_STATE_KEY = 'agents-new-session-layout';
export const DEFAULT_NEW_SESSION_VIEW_STATE = {
    auxiliaryVisible: true,
    defaultContainerId: 'files',
};
/** Deriva auxiliaryVisible — útil para expressões declarativas. */
export function newSessionAuxVisible(state) {
    return state.auxiliaryVisible;
}
function parse(raw) {
    if (!raw)
        return undefined;
    try {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.auxiliaryVisible !== 'boolean')
            return undefined;
        return {
            auxiliaryVisible: parsed.auxiliaryVisible,
            defaultContainerId: parsed.defaultContainerId === 'changes' ? 'changes' : 'files',
        };
    }
    catch {
        return undefined;
    }
}
function storage() {
    if (typeof window === 'undefined') {
        // Fallback em memória para ambientes sem window (SSR, testes unitários).
        const map = new Map();
        return {
            getItem: (k) => map.get(k) ?? null,
            setItem: (k, v) => void map.set(k, v),
        };
    }
    return window.localStorage;
}
/**
 * Lê o estado compartilhado de nova sessão. Aceita storage injetável para
 * testes unitários; no app real usa window.localStorage. Dados corrompidos
 * caem defensivamente no padrão.
 */
export function readNewSessionViewState(injected) {
    const s = injected ?? storage();
    return parse(s.getItem(NEW_SESSION_VIEW_STATE_KEY)) ?? { ...DEFAULT_NEW_SESSION_VIEW_STATE };
}
export function writeNewSessionViewState(a, b) {
    const s = typeof a.getItem === 'function' ? a : storage();
    const state = b ?? a;
    try {
        s.setItem(NEW_SESSION_VIEW_STATE_KEY, JSON.stringify(state));
    }
    catch {
        // localStorage indisponível (sandbox, quota) — degrada silenciosamente.
    }
}
/**
 * Alterna (ou define explicitamente) a visibilidade da aux bar e persiste.
 * Retorna o mesmo objeto (referência estável) quando o valor não muda — útil
 * para evitar re-renders desnecessários.
 */
export function toggleNewSessionAux(current, next) {
    const desired = next ?? !current.auxiliaryVisible;
    if (desired === current.auxiliaryVisible)
        return current;
    return { ...current, auxiliaryVisible: desired };
}
/**
 * Semeia o estado inicial de uma sessão recém-criada a partir do
 * newSessionViewState. A sessão herdará a preferência de aux bar que o usuário
 * deixou na landing, mas a partir daí o estado passa a ser por-sessão.
 */
export function seedCreatedFromNewSession(current) {
    return {
        auxiliaryVisible: current.auxiliaryVisible,
        activeViewContainerId: current.defaultContainerId,
    };
}
//# sourceMappingURL=newSessionViewState.js.map