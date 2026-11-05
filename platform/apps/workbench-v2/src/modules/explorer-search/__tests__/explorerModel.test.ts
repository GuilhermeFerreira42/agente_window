// ============================================================================
// explorerModel.test.ts — ExplorerModel/ExplorerItem (explorerModel.ts:26/89).
// Cobre: create recursivo, addChild/getChild case-sensitive, move/rename com
// cascata de recurso, mergeLocalWithDisk (protege dados locais não carregados),
// find/findClosest com semântica de prefixo por segmento.
// ============================================================================
import { describe, expect, it } from 'vitest';
import { ExplorerItem, ExplorerModel } from '../core/explorerModel';
import { asWorkspaceUri } from '../core/uri';

function makeTree(): ExplorerItem {
  return ExplorerItem.create({
    uri: asWorkspaceUri('/ws'),
    kind: 'directory',
    name: 'ws',
    children: [
      { uri: asWorkspaceUri('/ws/src'), kind: 'directory', name: 'src', children: [
        { uri: asWorkspaceUri('/ws/src/index.ts'), kind: 'file', name: 'index.ts' },
      ] },
      { uri: asWorkspaceUri('/ws/empty'), kind: 'directory', name: 'empty' },
      { uri: asWorkspaceUri('/ws/README.md'), kind: 'file', name: 'README.md' },
    ],
  });
}

describe('explorerModel — ExplorerItem (porte explorerModel.ts:89)', () => {
  it('create recursivo: filhos linkados ao pai; resolvido = tem children', () => {
    const root = makeTree();
    expect(root.isDirectoryResolved).toBe(true);
    expect(root.children.size).toBe(3);
    const src = root.getChild('src')!;
    expect(src.parent).toBe(root);
    expect(src.isDirectory).toBe(true);
    expect(src.isDirectoryResolved).toBe(true);
    const empty = root.getChild('empty')!;
    expect(empty.isDirectoryResolved).toBe(false); // criado sem children
    expect(root.getChild('README.md')!.root).toBe(root);
    expect(root.isRoot).toBe(true);
  });

  it('getChild é case-SENSITIVE (ext4 — decisão congelada)', () => {
    const root = makeTree();
    expect(root.getChild('readme.md')).toBeUndefined();
    expect(root.getChild('README.md')).toBeDefined();
  });

  it('addChild recomputa o recurso do filho a partir do pai', () => {
    const parent = ExplorerItem.create({ uri: asWorkspaceUri('/ws'), kind: 'directory', name: 'ws' });
    parent.addChild(new ExplorerItem({ uri: asWorkspaceUri('/lugar/errado/x.ts'), name: 'x.ts', kind: 'file' }));
    expect(parent.getChild('x.ts')!.resource).toBe('file:///ws/x.ts');
  });

  it('move: troca de pasta atualiza recurso recursivamente', () => {
    const root = makeTree();
    const empty = root.getChild('empty')!;
    const src = root.getChild('src')!;
    src.move(empty);
    expect(src.resource).toBe('file:///ws/empty/src');
    expect(src.getChild('index.ts')!.resource).toBe('file:///ws/empty/src/index.ts');
    expect(root.getChild('src')).toBeUndefined();
    expect(empty.getChild('src')).toBe(src);
  });

  it('rename atualiza o nome e a cascata de URIs (porte :461)', () => {
    const root = ExplorerItem.create({ uri: asWorkspaceUri('/ws'), kind: 'directory', name: 'ws', children: [
      { uri: asWorkspaceUri('/ws/docs'), kind: 'directory', name: 'docs', children: [
        { uri: asWorkspaceUri('/ws/docs/a.md'), kind: 'file', name: 'a.md' },
      ] },
    ] });
    const docs = root.getChild('docs')!;
    docs.rename({ name: 'guide' });
    expect(docs.name).toBe('guide');
    expect(docs.resource).toBe('file:///ws/guide');
    expect(docs.getChild('a.md')!.resource).toBe('file:///ws/guide/a.md');
    expect(root.getChild('docs')).toBeUndefined();
    expect(root.getChild('guide')).toBe(docs);
  });

  it('mergeLocalWithDisk: NUNCA sobrescreve resolvido local com não-resolvido', () => {
    const local = makeTree();
    const disk = ExplorerItem.create({ uri: asWorkspaceUri('/ws'), kind: 'directory', name: 'ws' });
    ExplorerItem.mergeLocalWithDisk(disk, local);
    // Sem dados de disco resolvidos, o estado local permanece intacto.
    expect(local.children.size).toBe(3);
    expect(local.isDirectoryResolved).toBe(true);
  });

  it('mergeLocalWithDisk: merge profundo preserva itens locais já resolvidos', () => {
    const local = makeTree();
    const disk = ExplorerItem.create({ uri: asWorkspaceUri('/ws'), kind: 'directory', name: 'ws', children: [
      { uri: asWorkspaceUri('/ws/src'), kind: 'directory', name: 'src', children: [
        { uri: asWorkspaceUri('/ws/src/index.ts'), kind: 'file', name: 'index.ts' },
        { uri: asWorkspaceUri('/ws/src/novo.ts'), kind: 'file', name: 'novo.ts' },
      ] },
      { uri: asWorkspaceUri('/ws/N.md'), kind: 'file', name: 'N.md' },
    ] });
    ExplorerItem.mergeLocalWithDisk(disk, local);
    expect(local.children.size).toBe(2); // src + N.md (README/empty sumiram do disco)
    const src = local.getChild('src')!;
    expect(src.children.size).toBe(2);
    expect(src.getChild('novo.ts')).toBeDefined();
  });

  it('find com prefixo: /ws/sr não acha /ws/src (falso irmão)', () => {
    const root = ExplorerItem.create({ uri: asWorkspaceUri('/ws'), kind: 'directory', name: 'ws', children: [
      { uri: asWorkspaceUri('/ws/src'), kind: 'directory', name: 'src', children: [
        { uri: asWorkspaceUri('/ws/src/index.ts'), kind: 'file', name: 'index.ts' },
      ] },
      { uri: asWorkspaceUri('/ws/src-old'), kind: 'directory', name: 'src-old' },
    ] });
    expect(root.find(asWorkspaceUri('/ws/src'))!.name).toBe('src');
    expect(root.find(asWorkspaceUri('/ws/src/index.ts'))).not.toBeNull();
    expect(root.find(asWorkspaceUri('/ws/sr'))).toBeNull(); // não é prefixo por segmento
    expect(root.find(asWorkspaceUri('/ws/src-old'))!.name).toBe('src-old');
    expect(root.find(asWorkspaceUri('/outro'))).toBeNull();
  });

  it('ExplorerModel single-root: setRoot/findClosest/clearRoot', () => {
    const model = new ExplorerModel();
    model.setRoot({ uri: asWorkspaceUri('/ws'), kind: 'directory', name: 'ws' });
    const root = model.root!;
    root.addChild(new ExplorerItem({ uri: asWorkspaceUri('/ws/a.ts'), name: 'a.ts', kind: 'file' }));
    expect(model.findClosest(asWorkspaceUri('/ws/a.ts'))!.name).toBe('a.ts');
    expect(model.findClosest(asWorkspaceUri('/outro'))).toBeNull();
    model.clearRoot();
    expect(model.findClosest(asWorkspaceUri('/ws/a.ts'))).toBeNull();
  });
});
