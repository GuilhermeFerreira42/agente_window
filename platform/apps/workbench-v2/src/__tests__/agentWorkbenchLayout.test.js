import { describe, expect, it } from 'vitest';
import { DEFAULT_SINGLE_PANE_SETTING, canSplitMainEditor, createAgentWorkbenchLayout, readSinglePaneSetting, writeSinglePaneSetting, } from '../domain/agentWorkbenchLayout';
describe('agentWorkbenchLayout (E15 — single-pane gating)', () => {
    it('setting ON + não-phone → single-pane habilitado', () => {
        const layout = createAgentWorkbenchLayout({ singlePaneSetting: true, isPhone: false });
        expect(layout.isSinglePaneLayoutEnabled).toBe(true);
        expect(layout.singlePaneLayoutEnabledContext).toBe(true);
        expect(layout.editorSplitDisabled).toBe(true);
    });
    it('phone sempre usa clássico mesmo com setting ON', () => {
        const layout = createAgentWorkbenchLayout({ singlePaneSetting: true, isPhone: true });
        expect(layout.isSinglePaneLayoutEnabled).toBe(false);
    });
    it('setting OFF → clássico em qualquer viewport', () => {
        expect(createAgentWorkbenchLayout({ singlePaneSetting: false, isPhone: false }).isSinglePaneLayoutEnabled).toBe(false);
        expect(createAgentWorkbenchLayout({ singlePaneSetting: false, isPhone: true }).isSinglePaneLayoutEnabled).toBe(false);
    });
    it('context key acompanha isSinglePaneLayoutEnabled', () => {
        const on = createAgentWorkbenchLayout({ singlePaneSetting: true, isPhone: false });
        const off = createAgentWorkbenchLayout({ singlePaneSetting: false, isPhone: false });
        expect(on.singlePaneLayoutEnabledContext).toBe(on.isSinglePaneLayoutEnabled);
        expect(off.singlePaneLayoutEnabledContext).toBe(off.isSinglePaneLayoutEnabled);
    });
    it('split/grid do Main Editor é rejeitado quando single-pane está ligado', () => {
        const single = createAgentWorkbenchLayout({ singlePaneSetting: true, isPhone: false });
        const classic = createAgentWorkbenchLayout({ singlePaneSetting: false, isPhone: false });
        expect(canSplitMainEditor(single)).toBe(false);
        expect(canSplitMainEditor(classic)).toBe(true);
    });
    it('o objeto de layout é imutável (congelado após o startup)', () => {
        const layout = createAgentWorkbenchLayout({ singlePaneSetting: true, isPhone: false });
        expect(Object.isFrozen(layout)).toBe(true);
    });
    it('readSinglePaneSetting cai no default ON quando ausente ou sem storage', () => {
        expect(readSinglePaneSetting(undefined)).toBe(DEFAULT_SINGLE_PANE_SETTING);
        const empty = { getItem: () => null };
        expect(readSinglePaneSetting(empty)).toBe(true);
    });
    it('read/write round-trip via storage mock', () => {
        const store = new Map();
        const storage = {
            getItem: (k) => store.get(k) ?? null,
            setItem: (k, v) => { store.set(k, v); },
        };
        writeSinglePaneSetting(storage, false);
        expect(readSinglePaneSetting(storage)).toBe(false);
        writeSinglePaneSetting(storage, true);
        expect(readSinglePaneSetting(storage)).toBe(true);
    });
});
//# sourceMappingURL=agentWorkbenchLayout.test.js.map