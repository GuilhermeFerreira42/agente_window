// ============================================================================
// dndPolicy.test.ts — FileDragAndDrop (explorerViewer.ts:1601-1836) portado.
// Regras: alvo resolvido (arquivo → pai); externo exige arquivos, efeito copy;
// interno: self/same-parent(mut)/pasta-em-filho/readonly rejeitam; Ctrl no
// não-mac / Alt no mac = copiar; área vazia: rejeita se tudo já na raiz (sem
// copy). planDrop só materializa {upload} ou {move|copy}.
// ============================================================================
import { describe, expect, it } from 'vitest';
import type { DndContext } from '../core/dndPolicy';
import { decideDragOver, planDrop, resolveDropTarget } from '../core/dndPolicy';
import { ExplorerItem } from '../core/explorerModel';
import { asWorkspaceUri } from '../core/uri';

const linux: DndContext = { ctrlKey: false, altKey: false, isMacintosh: false };
const mac: DndContext = { ctrlKey: false, altKey: false, isMacintosh: true };

function makeTree(): ExplorerItem {
  return ExplorerItem.create({
    uri: asWorkspaceUri('/ws'),
    kind: 'directory',
    name: 'ws',
    children: [
      { uri: asWorkspaceUri('/ws/src'), kind: 'directory', name: 'src', children: [
        { uri: asWorkspaceUri('/ws/src/index.ts'), kind: 'file', name: 'index.ts' },
      ] },
      { uri: asWorkspaceUri('/ws/docs'), kind: 'directory', name: 'docs' },
      { uri: asWorkspaceUri('/ws/ro'), kind: 'directory', name: 'ro', readonly: true },
      { uri: asWorkspaceUri('/ws/top.ts'), kind: 'file', name: 'top.ts' },
      { uri: asWorkspaceUri('/ws/rofile.ts'), kind: 'file', name: 'rofile.ts', readonly: true },
    ],
  });
}

describe('dndPolicy — resolveDropTarget (bubbling: arquivo → pai)', () => {
  it('pasta vira o próprio alvo; arquivo borbulha pro pai', () => {
    const root = makeTree();
    const index = root.getChild('src')!.getChild('index.ts')!;
    expect(resolveDropTarget(index)!.name).toBe('src');
    expect(resolveDropTarget(root.getChild('docs')!)!.name).toBe('docs');
    expect(resolveDropTarget(null)).toBeNull();
  });
});

describe('dndPolicy — EXTERNO (SO → árvore)', () => {
  const root = makeTree();
  const docs = root.getChild('docs')!;

  it('rejeita drop externo sem arquivos (handleDragOver :1653)', () => {
    const d = decideDragOver({ kind: 'external', uris: [], hasFiles: false }, docs, linux);
    expect(d.accept).toBe(false);
  });

  it('aceita com efeito copy + autoExpand em pasta; arquivo resolve pro pai', () => {
    const d = decideDragOver({ kind: 'external', uris: ['file:///x.png'], hasFiles: true }, docs, linux);
    expect(d).toMatchObject({ accept: true, effect: 'copy', autoExpand: true });
    const overFile = decideDragOver({ kind: 'external', uris: ['f'], hasFiles: true }, root.getChild('top.ts')!, linux);
    expect(overFile.accept).toBe(true);
    expect(planDrop({ kind: 'external', uris: ['f'], hasFiles: true }, overFile, root.getChild('top.ts')!))
      .toMatchObject({ kind: 'upload', target: root });
  });

  it('rejeita pasta somente-leitura', () => {
    const d = decideDragOver({ kind: 'external', uris: ['f'], hasFiles: true }, root.getChild('ro')!, linux);
    expect(d.accept).toBe(false);
  });
});

describe('dndPolicy — INTERNO (move/copy na árvore)', () => {
  it('move p/ outra pasta aceita; Ctrl (não-mac) força copy; Alt no mac copia', () => {
    const root = makeTree();
    const top = root.getChild('top.ts')!;
    const docs = root.getChild('docs')!;

    const move = decideDragOver({ kind: 'internal', items: [top] }, docs, linux);
    expect(move).toMatchObject({ accept: true, effect: 'move' });

    const ctrlMove = decideDragOver({ kind: 'internal', items: [top] }, docs, { ...linux, ctrlKey: true });
    expect(ctrlMove).toMatchObject({ accept: true, effect: 'copy' });

    // No mac, Ctrl NÃO copia — Alt sim (:1641)
    const macCtrl = decideDragOver({ kind: 'internal', items: [top] }, docs, { ...mac, ctrlKey: true });
    expect(macCtrl).toMatchObject({ accept: true, effect: 'move' });
    const macAlt = decideDragOver({ kind: 'internal', items: [top] }, docs, { ...mac, altKey: true });
    expect(macAlt).toMatchObject({ accept: true, effect: 'copy' });
  });

  it('rejeita: sobre si mesmo, na mesma pasta sem copy, pasta dentro de si', () => {
    const root = makeTree();
    const top = root.getChild('top.ts')!;
    const src = root.getChild('src')!;
    const index = src.getChild('index.ts')!;

    // sobre si mesmo (:1683)
    expect(decideDragOver({ kind: 'internal', items: [top] }, top, linux).accept).toBe(false);
    // mesma pasta sem Ctrl (:1687) — drop em qualquer lugar da raiz
    expect(decideDragOver({ kind: 'internal', items: [top] }, root, linux).accept).toBe(false);
    // ... mas com Ctrl vira copy e aceita
    expect(decideDragOver({ kind: 'internal', items: [top] }, root, { ...linux, ctrlKey: true }).effect).toBe('copy');
    // pasta dentro de si mesma (:1691) — arrastar src para cima de src/index.ts (resolve → src)
    expect(decideDragOver({ kind: 'internal', items: [src] }, index, linux).accept).toBe(false);
  });

  it('readonly: move de itens somente-leitura rejeita; copy est vai; alvo RO rejeita', () => {
    const root = makeTree();
    const rofile = root.getChild('rofile.ts')!;
    const docs = root.getChild('docs')!;
    const ro = root.getChild('ro')!;

    expect(decideDragOver({ kind: 'internal', items: [rofile] }, docs, linux).accept).toBe(false);
    // Com Ctrl = copy → readonly não impede cópia na regra fora do loop (mas o
    // loop não barra copy de fontes readonly — upstream :1675 só barra move)
    expect(decideDragOver({ kind: 'internal', items: [rofile] }, docs, { ...linux, ctrlKey: true }).accept).toBe(true);
    // Destino readonly: nem move, nem copy
    expect(decideDragOver({ kind: 'internal', items: [root.getChild('top.ts')!] }, ro, linux).accept).toBe(false);
    expect(decideDragOver({ kind: 'internal', items: [root.getChild('top.ts')!] }, ro, { ...linux, ctrlKey: true }).accept).toBe(false);
  });

  it('área vazia: sem itens na raiz move p/ raiz aceita; já na raiz rejeita (:1666)', () => {
    const root = makeTree();
    const top = root.getChild('top.ts')!;
    const index = root.getChild('src')!.getChild('index.ts')!;

    const deep = decideDragOver({ kind: 'internal', items: [index] }, null, linux);
    expect(deep).toMatchObject({ accept: true, effect: 'move' });

    const shallow = decideDragOver({ kind: 'internal', items: [top] }, null, linux);
    expect(shallow.accept).toBe(false);

    // com Ctrl=copy, até o que está na raiz pode dropar na área vazia
    const shallowCopy = decideDragOver({ kind: 'internal', items: [top] }, null, { ...linux, ctrlKey: true });
    expect(shallowCopy).toMatchObject({ accept: true, effect: 'copy' });
  });

  it('planDrop: externo → {upload}; interno → {move|copy} com fontes; null se rejeitado', () => {
    const root = makeTree();
    const top = root.getChild('top.ts')!;
    const docs = root.getChild('docs')!;

    const move = decideDragOver({ kind: 'internal', items: [top] }, docs, linux);
    expect(planDrop({ kind: 'internal', items: [top] }, move, docs)).toMatchObject({
      kind: 'move', sources: [top], target: docs,
    });

    const dup = decideDragOver({ kind: 'internal', items: [top] }, root, linux);
    expect(planDrop({ kind: 'internal', items: [top] }, dup, root)).toBeNull();

    // drop na área vazia: alvo resolvido = raiz do item arrastado
    const voidt = decideDragOver({ kind: 'internal', items: [root.getChild('src')!.getChild('index.ts')!] }, null, linux);
    const plan = planDrop({ kind: 'internal', items: [root.getChild('src')!.getChild('index.ts')!] }, voidt, null);
    expect(plan).toMatchObject({ kind: 'move', target: root });
  });
});
