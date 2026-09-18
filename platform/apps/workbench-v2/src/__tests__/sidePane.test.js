import { describe, expect, it } from 'vitest';
import { isChatCentered, isEditorContentVisible, isTabBarVisible, isTabCloseable, resolveDetailPanelVisible, resolveSidePaneState, } from '../domain/sidePane';
const fileTab = { id: 't1', type: 'file', title: 'Files', path: 'a.ts' };
const diffTab = { id: 't2', type: 'diff', title: 'Changes' };
const browserTab = { id: 't3', type: 'browser', title: 'Browser', browserId: 'b1' };
describe('sidePane state model', () => {
    it('resolves editor+detail when editor content and aux are both visible', () => {
        expect(resolveSidePaneState({ hasEditorTabs: true, editorHidden: false, auxVisible: true })).toBe('editor+detail');
    });
    it('resolves editor-only when aux is hidden', () => {
        expect(resolveSidePaneState({ hasEditorTabs: true, editorHidden: false, auxVisible: false })).toBe('editor-only');
    });
    it('resolves detail-only when the editor content is hidden but aux is visible', () => {
        expect(resolveSidePaneState({ hasEditorTabs: true, editorHidden: true, auxVisible: true })).toBe('detail-only');
        // Also detail-only when there are no tabs at all but aux is on.
        expect(resolveSidePaneState({ hasEditorTabs: false, editorHidden: false, auxVisible: true })).toBe('detail-only');
    });
    it('resolves closed (chat-only) when neither editor content nor aux are visible', () => {
        expect(resolveSidePaneState({ hasEditorTabs: false, editorHidden: false, auxVisible: false })).toBe('closed');
        expect(resolveSidePaneState({ hasEditorTabs: true, editorHidden: true, auxVisible: false })).toBe('closed');
    });
    it('keeps the tab bar visible whenever there are tabs, even with content hidden', () => {
        expect(isTabBarVisible({ hasEditorTabs: true, editorHidden: true, auxVisible: false })).toBe(true);
        expect(isTabBarVisible({ hasEditorTabs: false, editorHidden: false, auxVisible: true })).toBe(false);
    });
    it('hides editor content when hidden or when there are no tabs', () => {
        expect(isEditorContentVisible({ hasEditorTabs: true, editorHidden: false, auxVisible: true })).toBe(true);
        expect(isEditorContentVisible({ hasEditorTabs: true, editorHidden: true, auxVisible: true })).toBe(false);
        expect(isEditorContentVisible({ hasEditorTabs: false, editorHidden: false, auxVisible: true })).toBe(false);
    });
    it('centers the chat only when the side pane is closed', () => {
        expect(isChatCentered({ hasEditorTabs: false, editorHidden: false, auxVisible: false })).toBe(true);
        expect(isChatCentered({ hasEditorTabs: true, editorHidden: false, auxVisible: false })).toBe(false);
    });
    it('hides the detail panel transiently under a Browser tab while the editor is visible', () => {
        // Browser + editor visível → detalhe transientemente oculto (R-044).
        expect(resolveDetailPanelVisible({ auxVisible: true, activeTabType: 'browser', editorContentVisible: true })).toBe(false);
        // Voltar para Changes/Files restaura o detalhe (intenção preservada).
        expect(resolveDetailPanelVisible({ auxVisible: true, activeTabType: 'diff', editorContentVisible: true })).toBe(true);
        expect(resolveDetailPanelVisible({ auxVisible: true, activeTabType: 'file', editorContentVisible: true })).toBe(true);
        // Browser com editor oculto → painel mostra o fallback (não fica em branco).
        expect(resolveDetailPanelVisible({ auxVisible: true, activeTabType: 'browser', editorContentVisible: false })).toBe(true);
        // Se o usuário fechou o detalhe, permanece fechado sob qualquer aba.
        expect(resolveDetailPanelVisible({ auxVisible: false, activeTabType: 'diff', editorContentVisible: true })).toBe(false);
    });
    it('protects managed Changes/Files tabs from closing while detail-only', () => {
        expect(isTabCloseable(fileTab, 'detail-only')).toBe(false);
        expect(isTabCloseable(diffTab, 'detail-only')).toBe(false);
        // Browser is never managed.
        expect(isTabCloseable(browserTab, 'detail-only')).toBe(true);
        // In every other state managed tabs close normally.
        expect(isTabCloseable(fileTab, 'editor+detail')).toBe(true);
        expect(isTabCloseable(diffTab, 'editor-only')).toBe(true);
    });
});
//# sourceMappingURL=sidePane.test.js.map