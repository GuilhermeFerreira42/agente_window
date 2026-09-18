import { describe, expect, it } from 'vitest';
import { CUSTOM_VIEW_STORAGE_KEY, closeCustomView, customViewTitle, dismissCustomViewOnBack, dismissCustomViewOnSessionOpen, effectivePartVisibility, emptyCustomViewState, isCustomViewId, loadCustomViewState, openCustomView, restoredPartVisibility, saveCustomViewState, shouldShowCustomViewGrid, } from '../domain/customView';
function fakeStorage(seed = {}) {
    const data = new Map(Object.entries(seed));
    return {
        getItem: (key) => data.get(key) ?? null,
        setItem: (key, value) => void data.set(key, value),
        dump: () => Object.fromEntries(data),
    };
}
const userWants = { sessionsPart: true, editor: false, auxiliaryBar: true, panel: true };
describe('customView — exclusividade e visibilidade efetiva', () => {
    it('sem custom view ativa, o grid não aparece e a visibilidade efetiva é a desejada', () => {
        const state = { ...emptyCustomViewState(), desiredVisibility: userWants };
        expect(shouldShowCustomViewGrid(state)).toBe(false);
        expect(effectivePartVisibility(state)).toEqual(userWants);
    });
    it('com custom view ativa, TODAS as parts da cadeia principal ficam escondidas', () => {
        const state = openCustomView(emptyCustomViewState(), 'aiCustomizations', userWants);
        expect(shouldShowCustomViewGrid(state)).toBe(true);
        expect(effectivePartVisibility(state)).toEqual({
            sessionsPart: false,
            editor: false,
            auxiliaryBar: false,
            panel: false,
        });
    });
    it('as parts cobertas retêm a desired visibility separada da efetiva', () => {
        const state = openCustomView(emptyCustomViewState(), 'aiCustomizations', userWants);
        expect(restoredPartVisibility(state), 'o desejado do usuário não pode ser sobrescrito').toEqual(userWants);
        expect(effectivePartVisibility(state)).not.toEqual(restoredPartVisibility(state));
    });
    it('fechar a custom view devolve exatamente a visibilidade anterior', () => {
        const aberta = openCustomView(emptyCustomViewState(), 'aiCustomizations', userWants);
        const fechada = closeCustomView(aberta);
        expect(fechada.activeView).toBeNull();
        expect(effectivePartVisibility(fechada)).toEqual(userWants);
    });
    it('trocar de custom view NÃO recaptura a visibilidade (evita salvar o estado coberto)', () => {
        const aberta = openCustomView(emptyCustomViewState(), 'aiCustomizations', userWants);
        const coberto = { sessionsPart: false, editor: false, auxiliaryBar: false, panel: false };
        const trocada = openCustomView(aberta, 'automations', coberto);
        expect(trocada.activeView).toBe('automations');
        expect(restoredPartVisibility(trocada), 'a preferência original tem que sobreviver à troca').toEqual(userWants);
    });
});
describe('customView — dismiss', () => {
    it('abrir uma sessão dispensa a custom view e preserva o desejado', () => {
        const aberta = openCustomView(emptyCustomViewState(), 'aiCustomizations', userWants);
        const depois = dismissCustomViewOnSessionOpen(aberta);
        expect(depois.activeView).toBeNull();
        expect(depois.desiredVisibility).toEqual(userWants);
    });
    it('o back do phone dispensa a custom view e informa que consumiu a navegação', () => {
        const aberta = openCustomView(emptyCustomViewState(), 'aiCustomizations', userWants);
        const resultado = dismissCustomViewOnBack(aberta);
        expect(resultado.handled, 'o back precisa ser consumido pela custom view').toBe(true);
        expect(resultado.state.activeView).toBeNull();
    });
    it('sem custom view ativa, o back não é consumido', () => {
        const resultado = dismissCustomViewOnBack(emptyCustomViewState());
        expect(resultado.handled).toBe(false);
        expect(resultado.state).toEqual(emptyCustomViewState());
    });
    it('fechar duas vezes é idempotente', () => {
        const fechada = closeCustomView(emptyCustomViewState());
        expect(fechada).toEqual(emptyCustomViewState());
    });
});
describe('customView — persistência entre reloads (F5)', () => {
    it('grava e recupera a view ativa junto com a visibilidade desejada', () => {
        const storage = fakeStorage();
        const aberta = openCustomView(emptyCustomViewState(), 'aiCustomizations', userWants);
        saveCustomViewState(aberta, storage);
        expect(Object.keys(storage.dump())).toContain(CUSTOM_VIEW_STORAGE_KEY);
        expect(loadCustomViewState(storage)).toEqual(aberta);
    });
    it('ignora payload corrompido sem quebrar o boot', () => {
        expect(loadCustomViewState(fakeStorage({ [CUSTOM_VIEW_STORAGE_KEY]: '{corrompido' }))).toEqual(emptyCustomViewState());
    });
    it('rejeita id de view desconhecido vindo do storage', () => {
        const storage = fakeStorage({
            [CUSTOM_VIEW_STORAGE_KEY]: JSON.stringify({ activeView: 'hackerView', desiredVisibility: userWants }),
        });
        const carregado = loadCustomViewState(storage);
        expect(carregado.activeView).toBeNull();
        expect(carregado.desiredVisibility).toEqual(userWants);
    });
    it('completa campos ausentes da visibilidade com o default', () => {
        const storage = fakeStorage({
            [CUSTOM_VIEW_STORAGE_KEY]: JSON.stringify({ activeView: 'automations', desiredVisibility: { editor: false } }),
        });
        expect(loadCustomViewState(storage)).toEqual({
            activeView: 'automations',
            desiredVisibility: { sessionsPart: true, editor: false, auxiliaryBar: true, panel: false },
        });
    });
});
describe('customView — utilidades', () => {
    it('reconhece apenas os ids contribuídos', () => {
        expect(isCustomViewId('aiCustomizations')).toBe(true);
        expect(isCustomViewId('automations')).toBe(true);
        expect(isCustomViewId('editor')).toBe(false);
        expect(isCustomViewId(null)).toBe(false);
    });
    it('dá título humano para cada view', () => {
        expect(customViewTitle('aiCustomizations')).toBe('AI Customizations');
        expect(customViewTitle('automations')).toBe('Automations');
        expect(customViewTitle('test')).toBe('Test');
    });
});
//# sourceMappingURL=customView.test.js.map