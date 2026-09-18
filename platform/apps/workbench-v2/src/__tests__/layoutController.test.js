import { describe, expect, it } from 'vitest';
import { createLayoutController, layoutPlatformFor, } from '../domain/layoutController';
const baseState = {
    auxiliaryVisible: true,
    activeViewContainerId: 'changes',
    panelVisible: false,
};
describe('layoutController (E4/R-033 — desktop vs mobile)', () => {
    it('desktop gerencia a aux bar; mobile a omite', () => {
        expect(createLayoutController('desktop').managesAuxiliaryBar).toBe(true);
        expect(createLayoutController('mobile').managesAuxiliaryBar).toBe(false);
    });
    it('desktop apresenta a aux bar conforme o estado da sessão', () => {
        const desktop = createLayoutController('desktop');
        expect(desktop.shouldRenderAuxiliaryBar({ auxiliaryVisible: true, multipleSessionsVisible: false })).toBe(true);
        expect(desktop.shouldRenderAuxiliaryBar({ auxiliaryVisible: false, multipleSessionsVisible: false })).toBe(false);
    });
    it('desktop suprime a aux bar com múltiplas sessões visíveis', () => {
        const desktop = createLayoutController('desktop');
        expect(desktop.shouldRenderAuxiliaryBar({ auxiliaryVisible: true, multipleSessionsVisible: true })).toBe(false);
    });
    it('mobile NUNCA apresenta a aux bar (R-033), mesmo com estado visível', () => {
        const mobile = createLayoutController('mobile');
        expect(mobile.shouldRenderAuxiliaryBar({ auxiliaryVisible: true, multipleSessionsVisible: false })).toBe(false);
        expect(mobile.effectiveSessionState(baseState, false).auxiliaryVisible).toBe(false);
    });
    it('mobile preserva o container ativo para o overlay de detalhes', () => {
        const mobile = createLayoutController('mobile');
        const effective = mobile.effectiveSessionState({ ...baseState, activeViewContainerId: 'files' }, false);
        expect(effective.activeViewContainerId).toBe('files');
    });
    it('layoutPlatformFor mapeia single-pane → mobile', () => {
        expect(layoutPlatformFor(true)).toBe('mobile');
        expect(layoutPlatformFor(false)).toBe('desktop');
    });
});
//# sourceMappingURL=layoutController.test.js.map