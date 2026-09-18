import { describe, expect, it, vi } from 'vitest';
import { observableValue } from '../domain/observable';
import { createLayoutSync } from '../domain/sessionLayoutSync';
function makeHarness(initial = 's1', options) {
    const activeSessionResource = observableValue('active', initial);
    const multipleSessionsVisible = observableValue('multi', false);
    const visibleSessionResources = observableValue('visible', initial ? [initial] : []);
    const captureOutgoing = vi.fn();
    const restoreIncoming = vi.fn();
    const clearVisibleSessionState = vi.fn();
    const sync = createLayoutSync({ activeSessionResource, multipleSessionsVisible, visibleSessionResources }, { captureOutgoing, restoreIncoming, clearVisibleSessionState }, options);
    return { activeSessionResource, multipleSessionsVisible, visibleSessionResources, captureOutgoing, restoreIncoming, clearVisibleSessionState, sync };
}
describe('sessionLayoutSync (R-030 · LAYOUT_CONTROLLER.md §2)', () => {
    it('load inicial restaura a sessão ativa mas não captura (não há origem)', () => {
        const h = makeHarness('s1');
        expect(h.restoreIncoming).toHaveBeenCalledWith('s1');
        expect(h.captureOutgoing).not.toHaveBeenCalled();
        h.sync.dispose();
    });
    it('troca real captura a que sai e restaura a que entra', () => {
        const h = makeHarness('s1');
        h.restoreIncoming.mockClear();
        h.activeSessionResource.set('s2');
        expect(h.captureOutgoing).toHaveBeenCalledWith('s1');
        expect(h.restoreIncoming).toHaveBeenCalledWith('s2');
        h.sync.dispose();
    });
    it('re-avaliação sem mudança de sessão não dispara capture/restore', () => {
        const h = makeHarness('s1');
        h.restoreIncoming.mockClear();
        // Mesmo recurso: set idêntico não propaga (Object.is) — nenhum efeito novo.
        h.activeSessionResource.set('s1');
        expect(h.captureOutgoing).not.toHaveBeenCalled();
        expect(h.restoreIncoming).not.toHaveBeenCalled();
        h.sync.dispose();
    });
    it('modo multi-sessão suprime o sync por sessão', () => {
        const h = makeHarness('s1');
        h.captureOutgoing.mockClear();
        h.restoreIncoming.mockClear();
        h.multipleSessionsVisible.set(true);
        h.activeSessionResource.set('s2'); // troca durante multi → suprimida
        expect(h.captureOutgoing).not.toHaveBeenCalled();
        expect(h.restoreIncoming).not.toHaveBeenCalled();
        h.sync.dispose();
    });
    it('multi-sessão limpa o estado por sessão das sessões visíveis', () => {
        const h = makeHarness('s1');
        h.visibleSessionResources.set(['s1', 's2']);
        h.multipleSessionsVisible.set(true);
        expect(h.clearVisibleSessionState).toHaveBeenCalledWith(['s1', 's2']);
        h.sync.dispose();
    });
    it('ao colapsar de volta para uma sessão, a próxima troca é detectada', () => {
        const h = makeHarness('s1');
        h.multipleSessionsVisible.set(true);
        h.activeSessionResource.set('s2'); // suprimido, mas previous acompanha s2
        h.multipleSessionsVisible.set(false);
        h.captureOutgoing.mockClear();
        h.restoreIncoming.mockClear();
        h.activeSessionResource.set('s3');
        expect(h.captureOutgoing).toHaveBeenCalledWith('s2');
        expect(h.restoreIncoming).toHaveBeenCalledWith('s3');
        h.sync.dispose();
    });
    it('initialPreviousResource evita o restore do load inicial (preserva estado hidratado)', () => {
        const h = makeHarness('s1', { initialPreviousResource: 's1' });
        expect(h.restoreIncoming).not.toHaveBeenCalled();
        expect(h.captureOutgoing).not.toHaveBeenCalled();
        // A primeira troca real ainda funciona normalmente.
        h.activeSessionResource.set('s2');
        expect(h.captureOutgoing).toHaveBeenCalledWith('s1');
        expect(h.restoreIncoming).toHaveBeenCalledWith('s2');
        h.sync.dispose();
    });
    it('dispose para de reagir a mudanças de sessão', () => {
        const h = makeHarness('s1');
        h.sync.dispose();
        h.restoreIncoming.mockClear();
        h.activeSessionResource.set('s2');
        expect(h.restoreIncoming).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=sessionLayoutSync.test.js.map