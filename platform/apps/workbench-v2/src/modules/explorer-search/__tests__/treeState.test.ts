// ============================================================================
// treeState.test.ts — lazy loading (A2.1), expansão/seleção, visibleRows,
// remap de URIs (rename/move). Fonte: ExplorerDataSource (explorerViewer.ts:92).
// ============================================================================
import { beforeEach, describe, expect, it } from 'vitest';
import type { SortOrder } from '../contract';
import { ExplorerItem } from '../core/explorerModel';
import { TreeState } from '../core/treeState';
import { asWorkspaceUri } from '../core/uri';
import { FakeFsPort } from './fakeFs';

const ROOT = asWorkspaceUri('/ws');
let order: SortOrder = 'default';
let fs: FakeFsPort;
let tree: TreeState;

async function openRoot(): Promise<ExplorerItem> {
  const rootStat = await fs.stat({ uri: ROOT });
  const root = new ExplorerItem(
    { uri: rootStat.uri, name: 'ws', kind: rootStat.kind },
  );
  await tree.ensureResolved(root);
  tree.expand(root);
  return root;
}

beforeEach(() => {
  order = 'default';
  fs = new FakeFsPort(ROOT);
  fs.seed([
    { path: '/ws/src', kind: 'directory' },
    { path: '/ws/src/index.ts', kind: 'file' },
    { path: '/ws/src/util.ts', kind: 'file' },
    { path: '/ws/docs', kind: 'directory' },
    { path: '/ws/README.md', kind: 'file' },
    { path: '/ws/zeta.ts', kind: 'file' },
    { path: '/ws/alpha.py', kind: 'file' },
  ]);
  tree = new TreeState(fs, () => order);
});

describe('treeState — lazy loading (A2.1: 1 leitura por diretório)', () => {
  it('ensureResolved só lê o disco UMA vez por diretório', async () => {
    const root = await openRoot();
    const src = root.getChild('src')!;
    expect(fs.calls.list).toBe(1); // raiz
    await tree.ensureResolved(src);
    await tree.ensureResolved(src);
    await tree.ensureResolved(src);
    expect(fs.calls.list).toBe(2); // src lido 1x, nunca relido
    expect(src.isDirectoryResolved).toBe(true);
  });

  it('children vêm ordenados (dirs primeiro, nome natural)', async () => {
    const root = await openRoot();
    const names = tree.childrenOf(root).map((c) => c.name);
    expect(names).toEqual(['docs', 'src', 'alpha.py', 'README.md', 'zeta.ts']);
  });

  it('childrenOf reflete o sortOrder atual sem reler disco', async () => {
    const root = await openRoot();
    order = 'modified';
    const names = tree.childrenOf(root).map((c) => c.name);
    // dirs primeiro por nome; arquivos por mtime desc (mesmos mtimes → nome)
    expect(names[0]).toBe('docs');
    expect(names[1]).toBe('src');
    expect(fs.calls.list).toBe(1);
  });
});

describe('treeState — expansão / seleção / linhas visíveis', () => {
  it('expand/collapse/collapseAll com remoção de descendentes no collapse', async () => {
    const root = await openRoot();
    const src = root.getChild('src')!;
    await tree.ensureResolved(src); // lazy: filhos disponíveis só após resolver
    tree.expand(src);
    tree.expand(src.getChild('index.ts')!); // ignora arquivo
    expect(tree.expandedUris.has(asWorkspaceUri('/ws/src'))).toBe(true);
    expect(tree.expandedUris.has(asWorkspaceUri('/ws/src/index.ts'))).toBe(false);

    tree.collapseAll();
    expect(tree.expandedUris.size).toBe(0);

    tree.expand(root);
    tree.expand(src);
    expect(tree.expandedUris.size).toBe(2);
    tree.collapse(root); // colapsa raiz → todo mundo some
    expect(tree.expandedUris.size).toBe(0);
  });

  it('select/toggleSelect/clearSelection + foco', async () => {
    const root = await openRoot();
    const a = asWorkspaceUri('/ws/src/index.ts');
    const b = asWorkspaceUri('/ws/README.md');
    tree.select([a, b]);
    expect(tree.getSelection()).toEqual([a, b]);
    expect(tree.focusedUri).toBe(b); // foco = último
    tree.toggleSelect(b);
    expect(tree.getSelection()).toEqual([a]);
    expect(tree.focusedUri).toBeNull();
    tree.clearSelection();
    expect(tree.getSelection()).toEqual([]);
  });

  it('visibleRows só flattens o que está expandido (lazy)', async () => {
    const root = await openRoot();
    let rows = tree.visibleRows(root);
    expect(rows.map((r) => r.item.name)).toEqual(['ws', 'docs', 'src', 'alpha.py', 'README.md', 'zeta.ts']);

    const src = root.getChild('src')!;
    await tree.ensureResolved(src);
    tree.expand(src);
    rows = tree.visibleRows(root);
    expect(rows.map((r) => `${r.depth}:${r.item.name}`)).toEqual([
      '0:ws', '1:docs', '1:src', '2:index.ts', '2:util.ts', '1:alpha.py', '1:README.md', '1:zeta.ts',
    ]);
  });
});

describe('treeState — remapUrisUnder (rename/move de pasta)', () => {
  it('expansão, seleção e foco migram para o novo prefixo', async () => {
    const root = await openRoot();
    const src = root.getChild('src')!;
    await tree.ensureResolved(src);
    tree.expand(src);
    tree.expand(root);
    tree.select([asWorkspaceUri('/ws/src/index.ts')], asWorkspaceUri('/ws/src/index.ts'));

    tree.remapUrisUnder(asWorkspaceUri('/ws/src'), asWorkspaceUri('/ws/guide'));
    expect(tree.expandedUris.has(asWorkspaceUri('/ws/guide'))).toBe(true);
    expect(tree.expandedUris.has(asWorkspaceUri('/ws/src'))).toBe(false);
    expect(tree.getSelection()).toEqual([asWorkspaceUri('/ws/guide/index.ts')]);
    expect(tree.focusedUri).toBe(asWorkspaceUri('/ws/guide/index.ts'));
  });

  it('não toca no que não está sob o prefixo', async () => {
    const root = await openRoot();
    tree.expand(root);
    tree.select([asWorkspaceUri('/ws/README.md')]);
    tree.remapUrisUnder(asWorkspaceUri('/ws/src'), asWorkspaceUri('/ws/guide'));
    expect(tree.expandedUris.has(ROOT)).toBe(true);
    expect(tree.getSelection()).toEqual([asWorkspaceUri('/ws/README.md')]);
  });
});
