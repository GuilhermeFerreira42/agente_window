import { describe, expect, it } from 'vitest';
import { EMPTY_DOCKED_STATE, enterDetailOnly, isDockedTab, isRestorableTab, showEditorRestore, } from '../domain/dockedAuxiliaryController';
function tab(id, type, sessionId = 's1') {
    return { id, type, title: id, sessionId };
}
describe('DockedAuxiliaryBarController (R-040)', () => {
    it('classifica abas acopladas (Changes/Files) e restauráveis', () => {
        expect(isDockedTab(tab('a', 'diff'))).toBe(true);
        expect(isDockedTab(tab('a', 'file'))).toBe(true);
        expect(isDockedTab(tab('a', 'browser'))).toBe(false);
        expect(isRestorableTab(tab('a', 'browser'))).toBe(true);
        expect(isRestorableTab(tab('a', 'customizations'))).toBe(true);
        // Search untitled sujo → não restaurável.
        expect(isRestorableTab(tab('a', 'search'))).toBe(false);
    });
    it('entrar em Detail-only mantém acopladas, captura restauráveis e descarta o resto', () => {
        const tabs = [
            tab('diff1', 'diff'),
            tab('file1', 'file'),
            tab('browser1', 'browser'),
            tab('search1', 'search'),
            tab('cust1', 'customizations'),
        ];
        const result = enterDetailOnly(tabs, 's1');
        // Só as acopladas permanecem.
        expect(result.tabs.map((t) => t.id)).toEqual(['diff1', 'file1']);
        // Restauráveis capturadas (browser + customizations), na ordem original.
        expect(result.state.captured.map((c) => c.tab.id)).toEqual(['browser1', 'cust1']);
        // Search descartado.
        expect(result.dropped.map((t) => t.id)).toEqual(['search1']);
    });
    it('sem nenhuma aba acoplada, não fecha nada (browser-only mantém a tab bar)', () => {
        const tabs = [tab('browser1', 'browser')];
        const result = enterDetailOnly(tabs, 's1');
        expect(result.tabs.map((t) => t.id)).toEqual(['browser1']);
        expect(result.state).toEqual(EMPTY_DOCKED_STATE);
        expect(result.dropped).toEqual([]);
    });
    it('não toca em abas de outra sessão', () => {
        const tabs = [tab('diff1', 'diff', 's1'), tab('browserX', 'browser', 's2')];
        const result = enterDetailOnly(tabs, 's1');
        expect(result.tabs.map((t) => t.id)).toEqual(['diff1', 'browserX']);
        expect(result.state.captured).toHaveLength(0);
    });
    it('mostrar o editor restaura as abas capturadas ao final, preservando a ordem', () => {
        const tabs = [tab('diff1', 'diff'), tab('browser1', 'browser'), tab('cust1', 'customizations')];
        const detail = enterDetailOnly(tabs, 's1');
        const shown = showEditorRestore(detail.tabs, detail.state);
        expect(shown.tabs.map((t) => t.id)).toEqual(['diff1', 'browser1', 'cust1']);
        expect(shown.state).toEqual(EMPTY_DOCKED_STATE);
    });
    it('restore não duplica abas já presentes (por id)', () => {
        const tabs = [tab('diff1', 'diff'), tab('browser1', 'browser')];
        const detail = enterDetailOnly(tabs, 's1');
        // Simula a browser1 já ter sido reaberta antes do restore.
        const withReopened = [...detail.tabs, tab('browser1', 'browser')];
        const shown = showEditorRestore(withReopened, detail.state);
        const ids = shown.tabs.map((t) => t.id);
        expect(ids.filter((id) => id === 'browser1')).toHaveLength(1);
    });
});
//# sourceMappingURL=dockedAuxiliaryController.test.js.map