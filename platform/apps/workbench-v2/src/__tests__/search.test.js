import { describe, expect, it } from 'vitest';
import { searchResults } from '../data';
import { filterSearchResults, formatSearchSummary, splitSearchHighlight } from '../domain/search';
describe('search domain', () => {
    it('filtra por caminho, conteúdo ou match sem diferenciar maiúsculas', () => {
        expect(filterSearchResults(searchResults, '  MENUBAR ')).toHaveLength(1);
        expect(filterSearchResults(searchResults, 'sessionBrowserView')).toEqual([searchResults[5]]);
        expect(filterSearchResults(searchResults, 'active session')).toEqual([searchResults[5]]);
    });
    it('retorna todos os dados mockados para uma consulta vazia', () => {
        const result = filterSearchResults(searchResults, '   ');
        expect(result).toEqual(searchResults);
        expect(result).not.toBe(searchResults);
    });
    it('destaca termos literais, inclusive caracteres que seriam regex', () => {
        expect(splitSearchHighlight('literal [x] e $token', '[x]')).toEqual([
            { text: 'literal ', highlighted: false },
            { text: '[x]', highlighted: true },
            { text: ' e $token', highlighted: false },
        ]);
        expect(splitSearchHighlight('config uses a.b and A.B', 'a.b')).toEqual([
            { text: 'config uses ', highlighted: false },
            { text: 'a.b', highlighted: true },
            { text: ' and ', highlighted: false },
            { text: 'A.B', highlighted: true },
        ]);
        expect(splitSearchHighlight('sem correspondência', 'missing')).toEqual([{ text: 'sem correspondência', highlighted: false }]);
    });
    it('formata a contagem com singular e plural', () => {
        expect(formatSearchSummary(1)).toBe('1 resultado');
        expect(formatSearchSummary(0)).toBe('0 resultados');
        expect(formatSearchSummary(2)).toBe('2 resultados');
    });
});
//# sourceMappingURL=search.test.js.map