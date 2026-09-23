// ============================================================================
// explorerService.test.ts — orquestração do service contra o fs fake (puro).
// Cobre: openFolder/open/reveal/refresh (A2.6), CRUD com conflitos (eventos
// explorer.*.conflict), clipboard cut/copy/paste (Q3: arquivo → pai), move/copy
// do DnD, sort, seleção e upload/download falhando em 4.4.
// ============================================================================
import { beforeEach, describe, expect, it } from 'vitest';
import type { ExplorerSearchEvent, WorkspaceUri } from '../contract';
import { ExplorerCreateConflictError, ExplorerRenameConflictError, ExplorerService } from '../core/explorerService';
import { asWorkspaceUri } from '../core/uri';
import { FakeFsPort } from './fakeFs';

const ROOT = asWorkspaceUri('/ws');
let fs: FakeFsPort;
let service: ExplorerService;
let events: ExplorerSearchEvent[];

function seedDisk(): void {
  fs.seed([
    { path: '/ws/src', kind: 'directory' },
    { path: '/ws/src/index.ts', kind: 'file', mtimeMs: 100 },
    { path: '/ws/src/util.ts', kind: 'file', mtimeMs: 200 },
    { path: '/ws/docs', kind: 'directory' },
    { path: '/ws/docs/guide.md', kind: 'file', mtimeMs: 300 },
    { path: '/ws/README.md', kind: 'file', mtimeMs: 400 },
    { path: '/ws/top.ts', kind: 'file', mtimeMs: 500 },
  ]);
}

async function boot(): Promise<void> {
  await service.openFolder({ uri: ROOT });
}

function childNames(uri: WorkspaceUri): string[] {
  const item = service.getModelRoot()!.find(uri)!;
  return service.getTreeForTests().childrenOf(item).map((c) => c.name);
}

beforeEach(() => {
  fs = new FakeFsPort(ROOT);
  seedDisk();
  service = new ExplorerService(fs);
  events = [];
  service.onEvent((e) => events.push(e));
});

describe('explorerService — openFolder / navegação', () => {
  it('openFolder valida diretório, expande a raiz, publica rootChanged', async () => {
    await expect(service.openFolder({ uri: asWorkspaceUri('/ws/README.md') })).rejects.toThrow(/não é uma pasta/);
    await boot();
    expect(events[0]).toEqual({ type: 'explorer.rootChanged', uri: ROOT });
    const root = service.getModelRoot()!;
    expect(root.isDirectoryResolved).toBe(true);
    expect(service.getTreeForTests().isExpanded(ROOT)).toBe(true);
    expect(childNames(ROOT)).toEqual(['docs', 'src', 'README.md', 'top.ts']);
  });

  it('open() em pasta alterna expand/collapse (com eventos); em arquivo emite fileOpened', async () => {
    await boot();
    const src = asWorkspaceUri('/ws/src');
    await service.open({ uri: src });
    expect(events.at(-1)).toEqual({ type: 'explorer.selectionChanged', uris: [src] });
    expect(events.some((e) => e.type === 'explorer.nodeExpanded' && e.uri === src)).toBe(true);
    expect(service.getTreeForTests().isExpanded(src)).toBe(true);

    await service.open({ uri: src });
    expect(events.some((e) => e.type === 'explorer.nodeCollapsed' && e.uri === src)).toBe(true);
    expect(service.getTreeForTests().isExpanded(src)).toBe(false);

    await service.open({ uri: asWorkspaceUri('/ws/README.md') });
    expect(events.some((e) => e.type === 'explorer.fileOpened' && e.uri === 'file:///ws/README.md')).toBe(true);
  });

  it('reveal() resolve a cadeia do discando lazy + expande ancestrais', async () => {
    await boot();
    const target = asWorkspaceUri('/ws/src/util.ts');
    await service.reveal({ uri: target });
    expect(service.getTreeForTests().isExpanded(asWorkspaceUri('/ws/src'))).toBe(true);
    expect(service.getSelection()).toEqual([target]);
    expect(events.some((e) => e.type === 'explorer.revealRequested' && e.uri === target)).toBe(true);
    expect(service.getModelRoot()!.find(target)).not.toBeNull();
  });

  it('expand/collapse/collapseAll com eventos dedicados', async () => {
    await boot();
    const docs = asWorkspaceUri('/ws/docs');
    await service.expand({ uri: docs });
    expect(events.some((e) => e.type === 'explorer.nodeExpanded' && e.uri === docs)).toBe(true);
    await service.collapse({ uri: docs });
    expect(events.some((e) => e.type === 'explorer.nodeCollapsed' && e.uri === docs)).toBe(true);
    await service.expand({ uri: docs });
    service.collapseAll();
    // VS Code: a raiz (pane-header) permanece expandida; só os descendentes colapsam.
    expect([...service.getTreeForTests().expandedUris]).toEqual([ROOT]);
    expect(events.some((e) => e.type === 'explorer.allCollapsed')).toBe(true);
  });

  it('refresh mantém expansão (A2.6) e re-lê do disco só o requisitado', async () => {
    await boot();
    const src = asWorkspaceUri('/ws/src');
    await service.expand({ uri: src }); // resolveu src
    const listsBefore = fs.calls.list;

    // arquivo novo criado OUTSIDE do service (chega via watcher na vida real)
    await fs.createFolder({ uri: asWorkspaceUri('/ws/src/newDir') });
    await service.refresh();

    expect(service.getTreeForTests().isExpanded(src)).toBe(true); // A2.6
    // o nó expandido re-resolve sob demanda (lazy) e enxerga o novo item
    await service.expand({ uri: src });
    expect(childNames(src)).toContain('newDir');
    expect(fs.calls.list).toBeGreaterThan(listsBefore);
  });
});

describe('explorerService — criar (convenção Q3: URI final)', () => {
  it('createFile: cria no disco e no modelo; nome repetido = erro + evento', async () => {
    await boot();
    const target = asWorkspaceUri('/ws/src/new-file.ts');

    await service.createFile({ uri: target });
    expect(fs.calls.createFile).toBe(1);
    expect(service.getModelRoot()!.find(target)!.name).toBe('new-file.ts');

    await expect(service.createFile({ uri: target })).rejects.toThrow(ExplorerCreateConflictError);
    const err = events.filter((e) => e.type === 'error' && e.code === 'explorer.create.conflict');
    expect(err).toHaveLength(1);
    expect(fs.calls.createFile).toBe(1); // não tentou duplicar
  });

  it('createFolder: idem — pasta nova aparece; duplicada = erro', async () => {
    await boot();
    const target = asWorkspaceUri('/ws/docs/reports');
    await service.createFolder({ uri: target });
    expect(fs.calls.createFolder).toBe(1);
    expect(service.getModelRoot()!.find(target)!.isDirectory).toBe(true);
    await expect(service.createFolder({ uri: target })).rejects.toThrow(ExplorerCreateConflictError);
  });

  it('resolveCreateParent (helper Q3): arquivo → pasta pai; pasta → a própria', async () => {
    await boot();
    // o item vem da árvore visível — portanto precisa estar resolvido (lazy)
    await service.expand({ uri: asWorkspaceUri('/ws/src') });
    expect(service.resolveCreateParent(asWorkspaceUri('/ws/src'))).toBe('file:///ws/src');
    expect(service.resolveCreateParent(asWorkspaceUri('/ws/src/index.ts'))).toBe('file:///ws/src');
    expect(service.resolveCreateParent(asWorkspaceUri('/ws/README.md'))).toBe('file:///ws');
  });
});

describe('explorerService — rename / remover', () => {
  it('rename de arquivo: troca nome no disco e no modelo; conflito = erro', async () => {
    await boot();
    await service.rename({ uri: asWorkspaceUri('/ws/top.ts'), newName: 'app.ts' });
    expect(fs.calls.move).toBe(1);
    expect(service.getModelRoot()!.find(asWorkspaceUri('/ws/app.ts'))!.name).toBe('app.ts');
    expect(service.getModelRoot()!.find(asWorkspaceUri('/ws/top.ts'))).toBeNull();
    await expect(service.rename({ uri: asWorkspaceUri('/ws/app.ts'), newName: 'README.md' }))
      .rejects.toThrow(ExplorerRenameConflictError);
    expect(events.some((e) => e.type === 'error' && e.code === 'explorer.rename.conflict')).toBe(true);
  });

  it('rename de pasta: expansão/seleção migram p/ novo prefixo; conflito detecta no DISCO', async () => {
    await boot();
    const src = asWorkspaceUri('/ws/src');
    await service.expand({ uri: src });
    service.select({ uris: [asWorkspaceUri('/ws/src/index.ts')] });

    // colisão com pasta EXISTENTE no disco (docs) ainda que lazy-unresolved:
    await expect(service.rename({ uri: src, newName: 'docs' })).rejects.toThrow(ExplorerRenameConflictError);

    await service.rename({ uri: src, newName: 'source' });
    const tree = service.getTreeForTests();
    expect(tree.isExpanded(asWorkspaceUri('/ws/source'))).toBe(true);
    expect(tree.isExpanded(src)).toBe(false);
    expect(service.getSelection()).toEqual([asWorkspaceUri('/ws/source/index.ts')]);
  });

  it('remove: recursivo p/ pasta, seleção é podada, expansão casca fora', async () => {
    await boot();
    const src = asWorkspaceUri('/ws/src');
    await service.expand({ uri: src });
    service.select({ uris: [asWorkspaceUri('/ws/src/index.ts')] });
    await service.remove({ uris: [src] });
    expect(fs.calls.remove).toBe(1);
    expect(service.getModelRoot()!.find(src)).toBeNull();
    expect(service.getSelection()).toEqual([]);
    expect(service.getTreeForTests().isExpanded(src)).toBe(false);

    // arquivo: recursive=false
    await service.remove({ uris: [asWorkspaceUri('/ws/README.md')] });
    expect(fs.calls.remove).toBe(2);
  });
});

describe('explorerService — clipboard e DnD', () => {
  it('cut/copy capturam a seleção; colar sobre arquivo vai para o pai (Q3)', async () => {
    await boot();
    await service.expand({ uri: asWorkspaceUri('/ws/docs') }); // lazy: guia visível
    const top = asWorkspaceUri('/ws/top.ts');
    service.copy({ uris: [top] });
    expect(service.getClipboardState()).toEqual({ kind: 'copy', uris: [top] });

    // colar sobre docs/guide.md ≡ colar em docs
    await service.paste({ target: asWorkspaceUri('/ws/docs/guide.md') });
    expect(service.getModelRoot()!.find(asWorkspaceUri('/ws/docs/top.ts'))).not.toBeNull();
    // copy preserve clipboard
    expect(service.getClipboardState().kind).toBe('copy');
  });

  it('cut limpa o clipboard SÓ se pasted > 0; conflito emite evento e pula', async () => {
    await boot();
    const src = asWorkspaceUri('/ws/src');
    const readme = asWorkspaceUri('/ws/README.md');

    // prepare destino com colisão: /ws/src/README.md não existe ainda
    await service.createFile({ uri: asWorkspaceUri('/ws/src/README.md') });

    service.cut({ uris: [readme] });
    expect(service.getClipboardState()).toEqual({ kind: 'cut', uris: [readme] });

    // pasta destino com colisão: src já tem README.md
    await service.paste({ target: src });
    expect(events.some((e) => e.type === 'error' && e.code === 'explorer.paste.conflict')).toBe(true);
    expect(service.getClipboardState().kind).toBe('cut'); // pasted=0 → nunca limpa
    expect(service.getModelRoot()!.find(readme)).not.toBeNull(); // origem intacta

    // agora destino limpo: docs
    await service.paste({ target: asWorkspaceUri('/ws/docs') });
    expect(service.getModelRoot()!.find(asWorkspaceUri('/ws/docs/README.md'))).not.toBeNull();
    expect(service.getModelRoot()!.find(readme)).toBeNull(); // moveu
    expect(service.getClipboardState()).toEqual({ kind: null, uris: [] }); // pasted>0 limpa
  });

  it('moveInto/copyInto executam plano do DnD com eventos de conflito', async () => {
    await boot();
    const src = asWorkspaceUri('/ws/src');
    const top = asWorkspaceUri('/ws/top.ts');

    await service.copyInto({ sources: [top], targetDir: src });
    expect(service.getModelRoot()!.find(asWorkspaceUri('/ws/src/top.ts'))).not.toBeNull();
    expect(service.getModelRoot()!.find(top)).not.toBeNull(); // copy mantém origem

    // move da cópia (sem conflito de volta) e volta move com conflito
    await service.moveInto({ sources: [asWorkspaceUri('/ws/src/index.ts')], targetDir: asWorkspaceUri('/ws/docs') });
    expect(service.getModelRoot()!.find(asWorkspaceUri('/ws/docs/index.ts'))).not.toBeNull();
    expect(service.getModelRoot()!.find(asWorkspaceUri('/ws/src/index.ts'))).toBeNull();

    const before = fs.calls.move;
    await service.moveInto({ sources: [asWorkspaceUri('/ws/src/top.ts')], targetDir: src });
    expect(fs.calls.move).toBe(before); // conflito → não executou
    expect(events.some((e) => e.type === 'error' && e.code === 'explorer.move.conflict')).toBe(true);
  });

  it('upload/download: implementados na 4.4 (delegam ao core/transfer)', async () => {
    await boot();
    // upload com zero entradas resolve sem I/O; download emite fs.downloadStarted.
    await expect(service.upload({ target: asWorkspaceUri('/ws'), entries: [], conflict: 'ask' })).resolves.toBeUndefined();
    const downloadEvents: string[] = [];
    const off = service.onEvent((e) => { if (e.type === 'fs.downloadStarted') downloadEvents.push(e.uri); });
    await expect(service.download({ uris: [asWorkspaceUri('/ws/README.md')] })).rejects.toThrow();
    // ^ rejeita: sem save injetado E endpoint /fs/download inexistente no fakeFs —
    //   cobertura real do caminho feliz fica no E2E (sessao_12_explorer.spec.ts).
    off();
  });
});

describe('explorerService — sort / seleção / portas de teste', () => {
  it('setSortOrder reordena childrenOf sem nova leitura', async () => {
    await boot();
    const before = fs.calls.list;
    expect(childNames(ROOT)).toEqual(['docs', 'src', 'README.md', 'top.ts']);
    service.setSortOrder({ order: 'modified' });
    const names = childNames(ROOT);
    expect(names[0]).toBe('docs');
    expect(names[1]).toBe('src');
    expect(names.at(-1)).toBe('README.md'); // mtime 400 < 500
    expect(fs.calls.list).toBe(before);
    service.setSortOrder({ order: 'default' });
  });

  it('select mantém apenas URIs presentes no modelo', async () => {
    await boot();
    service.select({ uris: [asWorkspaceUri('/ws/README.md'), asWorkspaceUri('/ws/inexistente')] });
    expect(service.getSelection()).toEqual([asWorkspaceUri('/ws/README.md')]);
  });

  it('openFolder outra pasta re-raíza o módulo (Q4 single-root)', async () => {
    await boot();
    fs.seed([
      { path: '/ws/proj2', kind: 'directory' },
      { path: '/ws/proj2/a.ts', kind: 'file' },
    ]);
    await service.openFolder({ uri: asWorkspaceUri('/ws/proj2') });
    expect(service.getModelRoot()!.resource).toBe('file:///ws/proj2');
    expect(childNames(asWorkspaceUri('/ws/proj2'))).toEqual(['a.ts']);
    expect(events.filter((e) => e.type === 'explorer.rootChanged')).toHaveLength(2);
  });

  it('dispose limpa listeners e raiz', async () => {
    await boot();
    service.dispose();
    expect(service.getModelRoot()).toBeNull();
    const count = events.length;
    service.collapseAll(); // dispara evento, mas não há listeners
    expect(events.length).toBe(count);
  });
});
