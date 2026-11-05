// searchQueryBuilder.test.ts — 4.6 c1: porta de queryBuilder.ts:106 (parse
// include/exclude, escape, whole word, regex inválida → invalid_query).
import { describe, expect, it } from 'vitest';
import {
  buildSearchRegExpSource, compileSearchQuery, fileMatchesQuery, folderExcludedByQuery,
  globToRegExp, parsePatternList, SearchQueryError,
} from '../core/search/queryBuilder';

describe('queryBuilder — pattern → RegExp', () => {
  it('literal escapa metacaracteres; case-insensitive por padrão', () => {
    const c = compileSearchQuery({ pattern: 'a.b(' });
    expect(c.source).toBe('a\\.b\\(');
    expect(c.flags).toBe('gi');
    expect(c.freshRegExp().test('xA.B(y')).toBe(true);
  });
  it('isCaseSensitive remove o i; isRegExp usa o pattern cru', () => {
    expect(compileSearchQuery({ pattern: 'x', isCaseSensitive: true }).flags).toBe('g');
    expect(compileSearchQuery({ pattern: 'a.+b', isRegExp: true }).source).toBe('a.+b');
  });
  it('isWholeWord só põe \\b nas bordas que são caractere de palavra (strings.createRegExp)', () => {
    expect(buildSearchRegExpSource({ pattern: 'foo', isWholeWord: true })).toBe('\\bfoo\\b');
    expect(buildSearchRegExpSource({ pattern: '(foo', isWholeWord: true })).toBe('\\(foo\\b');
    expect(buildSearchRegExpSource({ pattern: 'foo)', isWholeWord: true })).toBe('\\bfoo\\)');
  });
  it('regex inválida e pattern vazio → SearchQueryError code invalid_query', () => {
    expect(() => compileSearchQuery({ pattern: '(', isRegExp: true })).toThrow(SearchQueryError);
    try { compileSearchQuery({ pattern: '' }); } catch (e) { expect((e as SearchQueryError).code).toBe('invalid_query'); }
  });
  it('freshRegExp devolve instância nova (lastIndex isolado)', () => {
    const c = compileSearchQuery({ pattern: 'a' });
    const r1 = c.freshRegExp(); r1.exec('aa');
    expect(c.freshRegExp().lastIndex).toBe(0);
    expect(r1.lastIndex).toBe(1);
  });
});

describe('queryBuilder — globs (sintaxe VS Code)', () => {
  it('parsePatternList: vírgulas, sem barra → **/x, pasta/ → pasta/**, ./ e barras removidas', () => {
    expect(parsePatternList(' *.ts, src/**, docs/ , ./lib/a.js, /abs')).toEqual(['**/*.ts', 'src/**', 'docs/**', 'lib/a.js', '**/abs']);
    expect(parsePatternList(undefined)).toEqual([]);
    expect(parsePatternList(' , ')).toEqual([]);
  });
  it('globToRegExp: **, *, ?, {a,b}, [..]; pasta casa o que está abaixo', () => {
    const t = (g: string, p: string) => globToRegExp(g).test(p);
    expect(t('**/*.ts', 'a.ts')).toBe(true);
    expect(t('**/*.ts', 'x/y/a.ts')).toBe(true);
    expect(t('**/*.ts', 'x/a.tsx')).toBe(false);
    expect(t('src/**', 'src/a/b.c')).toBe(true);
    expect(t('src/**', 'srcx/a')).toBe(false);
    expect(t('src', 'src/a/b.c')).toBe(true);
    expect(t('*.{md,txt}', 'a.md')).toBe(true);
    expect(t('*.{md,txt}', 'a.js')).toBe(false);
    expect(t('a?c', 'abc')).toBe(true);
    expect(t('a?c', 'a/c')).toBe(false);
    expect(t('[ab].js', 'b.js')).toBe(true);
  });
  it('fileMatchesQuery: exclude vence include; sem include → tudo', () => {
    const c = compileSearchQuery({ pattern: 'x', include: '*.md', exclude: 'docs/**' });
    expect(fileMatchesQuery(c, 'a.md')).toBe(true);
    expect(fileMatchesQuery(c, 'docs/a.md')).toBe(false);
    expect(fileMatchesQuery(c, 'a.ts')).toBe(false);
    expect(fileMatchesQuery(compileSearchQuery({ pattern: 'x' }), 'qualquer/coisa')).toBe(true);
  });
  it('folderExcludedByQuery poda só por exclude', () => {
    const c = compileSearchQuery({ pattern: 'x', include: '*.md', exclude: 'vendor' });
    expect(folderExcludedByQuery(c, 'vendor')).toBe(true);
    expect(folderExcludedByQuery(c, 'src')).toBe(false);
  });
});
