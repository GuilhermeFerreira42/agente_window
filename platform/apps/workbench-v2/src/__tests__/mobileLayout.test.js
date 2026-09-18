import { describe, expect, it } from 'vitest';
import { allowsDesktopOnlyBehavior, classifyViewport, isPhoneViewport, mobilePartDelegatesToDesktop, selectPartImplementation, } from '../domain/mobileLayout';
describe('mobileLayout (E15 — viewport & part factories)', () => {
    it('classifica phone só com toque + largura estreita', () => {
        expect(classifyViewport({ width: 420, touch: true })).toBe('phone');
        // largura estreita sem toque = tablet (janela desktop encolhida nunca vira phone)
        expect(classifyViewport({ width: 420, touch: false })).toBe('tablet');
        expect(classifyViewport({ width: 800, touch: true })).toBe('tablet');
        expect(classifyViewport({ width: 1440, touch: false })).toBe('desktop');
    });
    it('isPhoneViewport reflete a classificação', () => {
        expect(isPhoneViewport({ width: 400, touch: true })).toBe(true);
        expect(isPhoneViewport({ width: 1200, touch: false })).toBe(false);
    });
    it('part factory escolhe mobile no viewport de telefone inicial', () => {
        expect(selectPartImplementation({ width: 390, touch: true })).toBe('mobile');
        expect(selectPartImplementation({ width: 1280, touch: false })).toBe('desktop');
    });
    it('part mobile delega ao desktop após sair do layout de telefone', () => {
        // Redimensionou para tablet/desktop: a instância mobile delega.
        expect(mobilePartDelegatesToDesktop({ width: 900, touch: true })).toBe(true);
        // Continua em telefone: não delega.
        expect(mobilePartDelegatesToDesktop({ width: 380, touch: true })).toBe(false);
    });
    it('comportamento desktop-only é gated antes da apresentação em telefone', () => {
        expect(allowsDesktopOnlyBehavior({ width: 380, touch: true })).toBe(false);
        expect(allowsDesktopOnlyBehavior({ width: 1280, touch: false })).toBe(true);
    });
});
//# sourceMappingURL=mobileLayout.test.js.map