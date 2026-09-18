import { describe, expect, it } from 'vitest';
import { buildUnifiedDiff, computeFileDiffViewData } from '../domain/unifiedDiff';
describe('unifiedDiff (E15 — mobile diff)', () => {
    it('arquivos idênticos não têm mudanças', () => {
        const data = computeFileDiffViewData('a\nb\nc', 'a\nb\nc');
        expect(data.identical).toBe(true);
        expect(data.added).toBe(0);
        expect(data.removed).toBe(0);
        expect(buildUnifiedDiff('a\nb\nc', 'a\nb\nc')).toEqual([]);
    });
    it('conta linhas adicionadas e removidas', () => {
        const data = computeFileDiffViewData('a\nb\nc', 'a\nB\nc\nd');
        // b→B = 1 remove + 1 add; d = 1 add
        expect(data.added).toBe(2);
        expect(data.removed).toBe(1);
        expect(data.identical).toBe(false);
    });
    it('produz hunk unificado com contexto e tipos corretos', () => {
        const original = 'l1\nl2\nl3\nl4\nl5';
        const modified = 'l1\nl2\nCHANGED\nl4\nl5';
        const hunks = buildUnifiedDiff(original, modified, 1);
        expect(hunks.length).toBe(1);
        const kinds = hunks[0].lines.map((l) => l.kind);
        // contexto (l2), removed (l3), added (CHANGED), contexto (l4)
        expect(kinds).toContain('context');
        expect(kinds).toContain('removed');
        expect(kinds).toContain('added');
        const removed = hunks[0].lines.find((l) => l.kind === 'removed');
        expect(removed.content).toBe('l3');
        expect(removed.originalLine).toBe(3);
        const added = hunks[0].lines.find((l) => l.kind === 'added');
        expect(added.content).toBe('CHANGED');
        expect(added.modifiedLine).toBe(3);
    });
    it('arquivo adicionado (original vazio) rende só linhas added', () => {
        const hunks = buildUnifiedDiff('', 'novo1\nnovo2');
        const kinds = new Set(hunks.flatMap((h) => h.lines.map((l) => l.kind)));
        expect(kinds.has('added')).toBe(true);
        expect(kinds.has('removed')).toBe(false);
    });
    it('separa mudanças distantes em hunks distintos', () => {
        const original = Array.from({ length: 20 }, (_, i) => `line${i}`).join('\n');
        const modified = original.split('\n');
        modified[1] = 'X';
        modified[18] = 'Y';
        const hunks = buildUnifiedDiff(original, modified.join('\n'), 2);
        expect(hunks.length).toBe(2);
    });
});
//# sourceMappingURL=unifiedDiff.test.js.map