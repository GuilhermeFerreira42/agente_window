import { describe, expect, it } from 'vitest';
import { createSectionOrderState, orderCustomGroups, reorderCustomGroup } from '../domain/sectionOrder';
const labels = { a: 'Alpha', b: 'Bravo', c: 'Charlie', d: 'Delta' };
const labelOf = (id) => labels[id] ?? id;
describe('sectionOrder (R-013 — ISessionSectionOrderService)', () => {
    it('sem ordem persistida, ordena alfabético pelo rótulo (determinístico)', () => {
        const state = createSectionOrderState();
        expect(orderCustomGroups(state, ['c', 'a', 'b'], labelOf)).toEqual(['a', 'b', 'c']);
    });
    it('respeita a ordem gerenciada pelo usuário para ids conhecidos', () => {
        const state = createSectionOrderState(['c', 'a', 'b']);
        expect(orderCustomGroups(state, ['a', 'b', 'c'], labelOf)).toEqual(['c', 'a', 'b']);
    });
    it('ids novos (não ordenados) vão ao fim, alfabéticos', () => {
        const state = createSectionOrderState(['c']);
        expect(orderCustomGroups(state, ['a', 'b', 'c', 'd'], labelOf)).toEqual(['c', 'a', 'b', 'd']);
    });
    it('ignora ids persistidos que não estão presentes', () => {
        const state = createSectionOrderState(['x', 'c', 'y', 'a']);
        expect(orderCustomGroups(state, ['a', 'c'], labelOf)).toEqual(['c', 'a']);
    });
    it('reordena movendo um grupo para a posição de outro', () => {
        let state = createSectionOrderState(['a', 'b', 'c']);
        state = reorderCustomGroup(state, ['a', 'b', 'c'], 'c', 'a', labelOf);
        expect(orderCustomGroups(state, ['a', 'b', 'c'], labelOf)).toEqual(['c', 'a', 'b']);
    });
    it('reorder é no-op quando from == to ou id ausente', () => {
        const state = createSectionOrderState(['a', 'b']);
        expect(reorderCustomGroup(state, ['a', 'b'], 'a', 'a', labelOf)).toBe(state);
        expect(reorderCustomGroup(state, ['a', 'b'], 'z', 'a', labelOf)).toBe(state);
    });
    it('createSectionOrderState remove duplicatas preservando a 1ª ocorrência', () => {
        expect(createSectionOrderState(['a', 'b', 'a', 'c']).customOrder).toEqual(['a', 'b', 'c']);
    });
});
//# sourceMappingURL=sectionOrder.test.js.map