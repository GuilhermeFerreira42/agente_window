import { describe, expect, it } from 'vitest';
import { DEFAULT_NEW_SESSION_VIEW_STATE, NEW_SESSION_VIEW_STATE_KEY, newSessionAuxVisible, readNewSessionViewState, seedCreatedFromNewSession, toggleNewSessionAux, writeNewSessionViewState, } from '../domain/newSessionViewState';
function memoryStorage(seed = {}) {
    const map = new Map(Object.entries(seed));
    return {
        getItem: (k) => map.get(k) ?? null,
        setItem: (k, v) => void map.set(k, v),
        map,
    };
}
describe('newSessionViewState (R-035 — shared new-session state)', () => {
    it('aux bar visível por padrão, começando em Files', () => {
        expect(newSessionAuxVisible(DEFAULT_NEW_SESSION_VIEW_STATE)).toBe(true);
        expect(DEFAULT_NEW_SESSION_VIEW_STATE.defaultContainerId).toBe('files');
    });
    it('ocultar explicitamente persiste a marca; reabrir limpa', () => {
        let state = DEFAULT_NEW_SESSION_VIEW_STATE;
        state = toggleNewSessionAux(state, false);
        expect(newSessionAuxVisible(state)).toBe(false);
        state = toggleNewSessionAux(state, true);
        expect(newSessionAuxVisible(state)).toBe(true);
    });
    it('toggle sem mudança retorna o mesmo objeto (no-op)', () => {
        const state = DEFAULT_NEW_SESSION_VIEW_STATE;
        expect(toggleNewSessionAux(state, true)).toBe(state);
    });
    it('estado é compartilhado entre reloads via storage', () => {
        const storage = memoryStorage();
        writeNewSessionViewState(storage, toggleNewSessionAux(DEFAULT_NEW_SESSION_VIEW_STATE, false));
        expect(storage.map.get(NEW_SESSION_VIEW_STATE_KEY)).toBeTruthy();
        // "Reload": ler de novo preserva o oculto explícito.
        const restored = readNewSessionViewState(storage);
        expect(newSessionAuxVisible(restored)).toBe(false);
    });
    it('dados corrompidos caem no padrão defensivamente', () => {
        const storage = memoryStorage({ [NEW_SESSION_VIEW_STATE_KEY]: '{not json' });
        expect(readNewSessionViewState(storage)).toEqual(DEFAULT_NEW_SESSION_VIEW_STATE);
    });
    it('semear sessão criada preserva a visibilidade que o usuário deixou', () => {
        const hidden = toggleNewSessionAux(DEFAULT_NEW_SESSION_VIEW_STATE, false);
        expect(seedCreatedFromNewSession(hidden).auxiliaryVisible).toBe(false);
        expect(seedCreatedFromNewSession(DEFAULT_NEW_SESSION_VIEW_STATE).auxiliaryVisible).toBe(true);
    });
});
//# sourceMappingURL=newSessionViewState.test.js.map