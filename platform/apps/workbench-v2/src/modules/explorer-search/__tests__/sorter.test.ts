// ============================================================================
// sorter.test.ts — FileSorter (explorerViewer.ts:1440) + comparers.ts:54/117.
// Semântica congelada 4.2: dirs primeiro; 'default'|'name' → nome natural
// com Intl.Collator numeric + desambiguação unicode; 'type' → extensão;
// 'modified' → mtime desc (mais novo primeiro) com fallback nome.
// ============================================================================
import { describe, expect, it } from 'vitest';
import {
  compareExplorerItems,
  compareFileExtensions,
  compareFileNames,
} from '../core/sorter';

const file = (name: string, mtimeMs?: number) => ({ name, isDirectory: false, mtimeMs });
const dir = (name: string) => ({ name, isDirectory: true });

describe('sorter — compareFileNames (comparers.ts:54)', () => {
  it('ordenação natural: números dentro do nome contam', () => {
    expect(compareFileNames('file10', 'file2')).toBeGreaterThan(0);
    expect(compareFileNames('file2', 'file10')).toBeLessThan(0);
  });

  it('desambiguação unicode: foo1 ≠ foo01 (collator os trata iguais)', () => {
    expect(compareFileNames('foo1', 'foo01')).not.toBe(0);
    expect(['foo01', 'foo1'].sort(compareFileNames)).toEqual(['foo01', 'foo1']);
  });

  it('null/undefined caem como string vazia (porte upstream)', () => {
    expect(compareFileNames(null, 'a')).toBeLessThan(0);
    expect(compareFileNames('a', undefined)).toBeGreaterThan(0);
  });
});

describe('sorter — compareFileExtensions (comparers.ts:117)', () => {
  it('agrupa por extensão; desempata pelo nome completo', () => {
    expect(compareFileExtensions('b.ts', 'a.md')).toBeGreaterThan(0);
    expect(compareFileExtensions('a.ts', 'b.ts')).toBeLessThan(0);
  });

  it('dotfile NÃO é extensão (.gitignore trata como sem extensão)', () => {
    expect(compareFileExtensions('.gitignore', 'a.md')).toBeLessThan(0);
    expect(compareFileExtensions('z.tar', 'a.md')).toBeGreaterThan(0);
  });
});

describe('sorter — FileSorter por SortOrder', () => {
  it("'default': diretórios primeiro, nomes naturais dentro de cada grupo", () => {
    const items = [file('z.txt'), dir('src'), file('a.ts'), dir('api')];
    const sorted = [...items].sort(compareExplorerItems('default'));
    expect(sorted.map((i) => i.name)).toEqual(['api', 'src', 'a.ts', 'z.txt']);
  });

  it("'name': mesmo comportamento de 'default' nesta fase (Q/semver do port)", () => {
    const items = [file('file10'), file('file2')];
    const sorted = [...items].sort(compareExplorerItems('name'));
    expect(sorted.map((i) => i.name)).toEqual(['file2', 'file10']);
  });

  it("'type': arquivos agrupados por extensão, diretórios sempre antes", () => {
    const items = [file('c.ts'), dir('pkg'), file('a.md'), file('b.ts')];
    const sorted = [...items].sort(compareExplorerItems('type'));
    expect(sorted.map((i) => i.name)).toEqual(['pkg', 'a.md', 'b.ts', 'c.ts']);
  });

  it("'modified': mais recente primeiro; empate cai no nome", () => {
    const items = [file('old.ts', 100), file('new.ts', 300), file('mid.ts', 200)];
    const sorted = [...items].sort(compareExplorerItems('modified'));
    expect(sorted.map((i) => i.name)).toEqual(['new.ts', 'mid.ts', 'old.ts']);

    const tie = [file('b.ts', 5), file('a.ts', 5)];
    expect([...tie].sort(compareExplorerItems('modified')).map((i) => i.name)).toEqual(['a.ts', 'b.ts']);
  });

  it("'modified': diretórios primeiro, sempre por nome natural", () => {
    const items = [file('z.ts', 999), dir('adir'), dir('zdir')];
    const sorted = [...items].sort(compareExplorerItems('modified'));
    expect(sorted.map((i) => i.name)).toEqual(['adir', 'zdir', 'z.ts']);
  });
});
