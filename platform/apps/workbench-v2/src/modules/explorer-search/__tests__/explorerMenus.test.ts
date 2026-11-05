// ============================================================================
// explorerMenus.test.ts — tabela declarativa do menu de contexto (04_03 §1/§2/§7).
// Matriz item × contexto: arquivo, pasta, raiz, multi-seleção, clipboard vazio/
// cheio, somente leitura. Sem DOM — puro (core/menus/explorerMenus).
// ============================================================================

import { describe, expect, it } from 'vitest';
import {
  EXPLORER_CONTEXT_MENU,
  EXPLORER_MENU_GROUPS,
  computeExplorerContext,
  resolveExplorerContextMenu,
  type ExplorerContextSource,
} from '../core/menus/explorerMenus';
import { EXPLORER_CONTEXT_KEYS } from '../core/constants';

const file = (over: Partial<ExplorerContextSource> = {}): ExplorerContextSource => ({
  selection: ['/ws/a.txt'],
  target: { isDirectory: false, isRoot: false, isReadonly: false, parentReadonly: false },
  clipboardKind: null,
  viewletFocus: true,
  ...over,
});
const folder = (over: Partial<ExplorerContextSource> = {}): ExplorerContextSource => file({
  selection: ['/ws/docs'],
  target: { isDirectory: true, isRoot: false, isReadonly: false, parentReadonly: false },
  ...over,
});
const root = (over: Partial<ExplorerContextSource> = {}): ExplorerContextSource => file({
  selection: ['/ws'],
  target: { isDirectory: true, isRoot: true, isReadonly: false, parentReadonly: false },
  ...over,
});

function menu(src: ExplorerContextSource) {
  return resolveExplorerContextMenu(computeExplorerContext(src));
}
function ids(src: ExplorerContextSource): string[] {
  return menu(src).map((i) => i.id);
}
function enabled(src: ExplorerContextSource, id: string): boolean | undefined {
  return menu(src).find((i) => i.id === id)?.enabled;
}

describe('tabela declarativa (04_03 §1)', () => {
  it('grupos/ordem portados de fileActions.contribution.ts:478–680', () => {
    const byId = Object.fromEntries(EXPLORER_CONTEXT_MENU.map((i) => [i.id, i]));
    expect(byId['explorer.newFile']).toMatchObject({ group: 'navigation', order: 4 });
    expect(byId['explorer.newFolder']).toMatchObject({ group: 'navigation', order: 6 });
    expect(byId['explorer.cut']).toMatchObject({ group: '5_cutcopypaste', order: 8 });
    expect(byId['explorer.copy']).toMatchObject({ group: '5_cutcopypaste', order: 10 });
    expect(byId['explorer.paste']).toMatchObject({ group: '5_cutcopypaste', order: 20 });
    expect(byId['explorer.download']).toMatchObject({ group: '5b_importexport', order: 10 });
    expect(byId['explorer.upload']).toMatchObject({ group: '5b_importexport', order: 20 });
    expect(byId['explorer.rename']).toMatchObject({ group: '7_modification', order: 10 });
    expect(byId['explorer.delete']).toMatchObject({ group: '7_modification', order: 20, danger: true });
  });

  it('todo grupo usado existe na lista ordenada de grupos', () => {
    for (const it of EXPLORER_CONTEXT_MENU) {
      expect(EXPLORER_MENU_GROUPS as readonly string[]).toContain(it.group);
    }
  });

  it('itens resolvidos saem em ordem de grupo e depois order (separador implícito)', () => {
    const list = menu(folder({ clipboardKind: 'copy' }));
    const groups = list.map((i) => i.group);
    const firstIndex = new Map<string, number>();
    groups.forEach((g, i) => { if (!firstIndex.has(g)) firstIndex.set(g, i); });
    const seen = [...firstIndex.keys()];
    expect(seen).toEqual(EXPLORER_MENU_GROUPS.filter((g) => seen.includes(g)));
    for (let i = 1; i < list.length; i++) expect(list[i].order).toBeGreaterThan(list[i - 1].order);
  });
});

describe('context keys (04_03 §7 / conjunto congelado 04_10 §2.4)', () => {
  it('computeExplorerContext cobre TODAS as keys congeladas', () => {
    const ctx = computeExplorerContext(file());
    for (const k of EXPLORER_CONTEXT_KEYS) expect(k in ctx, `key ${k}`).toBe(true);
  });

  it('valores por tipo de nó', () => {
    expect(computeExplorerContext(file())).toMatchObject({
      explorerResourceIsFolder: false, explorerResourceIsRoot: false, multiSelectionActive: false,
    });
    expect(computeExplorerContext(folder())).toMatchObject({ explorerResourceIsFolder: true, explorerResourceIsRoot: false });
    expect(computeExplorerContext(root())).toMatchObject({ explorerResourceIsFolder: true, explorerResourceIsRoot: true });
    expect(computeExplorerContext(file({ clipboardKind: 'copy' }))).toMatchObject({ resourceCopied: true, resourceCut: false });
    expect(computeExplorerContext(file({ clipboardKind: 'cut' }))).toMatchObject({ resourceCopied: false, resourceCut: true });
    expect(computeExplorerContext(file({ selection: ['/ws/a', '/ws/b'] }))).toMatchObject({ multiSelectionActive: true });
    expect(computeExplorerContext(file({ viewletFocus: false }))).toMatchObject({ explorerViewletFocus: false });
  });

  it('ParentReadOnly: em pasta = a própria pasta; em arquivo = o pai', () => {
    expect(computeExplorerContext(folder({ target: { isDirectory: true, isRoot: false, isReadonly: true, parentReadonly: false } }))
      .explorerResourceParentReadOnly).toBe(true);
    expect(computeExplorerContext(file({ target: { isDirectory: false, isRoot: false, isReadonly: false, parentReadonly: true } }))
      .explorerResourceParentReadOnly).toBe(true);
  });
});

describe('matriz de habilitação (04_03 §2)', () => {
  it('ARQUIVO: Open, Cut, Copy, Download, Rename, Delete; sem New File/Folder (upstream ExplorerFolderContext, c4), Paste, Upload', () => {
    const list = ids(file());
    expect(list).toEqual(expect.arrayContaining([
      'explorer.open', 'explorer.cut', 'explorer.copy',
      'explorer.download', 'explorer.copyPath', 'explorer.copyRelativePath', 'explorer.rename', 'explorer.delete',
    ]));
    expect(list[0], '04_17 §3.8: menu de arquivo começa em Open').toBe('explorer.open');
    expect(list).not.toContain('explorer.newFile');
    expect(list).not.toContain('explorer.newFolder');
    expect(list).not.toContain('explorer.paste');
    expect(list).not.toContain('explorer.upload');
  });

  // G2 (fileActions.contribution.ts:603/610/662 — 04_11 §2; 04_03 §1 l.24-31)
  it('G2: Copy Path/Copy Relative Path em grupo 6_copypath entre Download e Rename; Refresh/Collapse NÃO pertencem ao ExplorerContext', () => {
    const items = resolveExplorerContextMenu(computeExplorerContext(file()));
    const list = items.map((i) => i.id);
    expect(list).not.toContain('explorer.refresh');
    expect(list).not.toContain('explorer.collapseAll');
    const at = (id: string) => list.indexOf(id);
    expect(at('explorer.download')).toBeLessThan(at('explorer.copyPath'));
    expect(at('explorer.copyPath')).toBeLessThan(at('explorer.copyRelativePath'));
    expect(at('explorer.copyRelativePath')).toBeLessThan(at('explorer.rename'));
    expect(items.find((i) => i.id === 'explorer.copyPath')?.group).toBe('6_copypath');
    expect(items.find((i) => i.id === 'explorer.delete')?.label).toBe('Delete Permanently');
    // raiz e multi-seleção também têm Copy Path (when = IsFileSystemResource)
    expect(ids(root())).toEqual(expect.arrayContaining(['explorer.copyPath', 'explorer.copyRelativePath']));
    expect(ids(file({ selection: ['/ws/a.txt', '/ws/b.txt'] }))).toContain('explorer.copyPath');
  });

  it('PASTA: todos os itens, Paste presente mas DESABILITADO sem clipboard (precondition)', () => {
    const list = ids(folder());
    expect(list).toContain('explorer.paste');
    expect(list).toContain('explorer.upload');
    expect(list).not.toContain('explorer.open');
    expect(enabled(folder(), 'explorer.paste')).toBe(false);
    expect(enabled(folder({ clipboardKind: 'copy' }), 'explorer.paste')).toBe(true);
    expect(enabled(folder({ clipboardKind: 'cut' }), 'explorer.paste')).toBe(true);
  });

  it('RAIZ: sem Cut/Copy/Download/Rename/Delete; New File/Folder e Paste (com clipboard) presentes', () => {
    const list = ids(root({ clipboardKind: 'copy' }));
    for (const id of ['explorer.cut', 'explorer.copy', 'explorer.download', 'explorer.rename', 'explorer.delete']) {
      expect(list, `raiz não deve ter ${id}`).not.toContain(id);
    }
    expect(list).toEqual(expect.arrayContaining(['explorer.newFile', 'explorer.newFolder', 'explorer.paste', 'explorer.upload']));
    expect(enabled(root({ clipboardKind: 'copy' }), 'explorer.paste')).toBe(true);
  });

  it('MULTI-SELEÇÃO: Cut/Copy/Download/Delete sim; Rename/Open/New*/Upload não', () => {
    const multi = file({ selection: ['/ws/a.txt', '/ws/b.txt'] });
    const list = ids(multi);
    expect(list).toEqual(expect.arrayContaining(['explorer.cut', 'explorer.copy', 'explorer.download', 'explorer.delete']));
    for (const id of ['explorer.rename', 'explorer.open', 'explorer.newFile', 'explorer.newFolder', 'explorer.upload']) {
      expect(list, `multi não deve ter ${id}`).not.toContain(id);
    }
  });

  it('SOMENTE LEITURA: Copy e Download habilitados; New*/Cut/Paste/Rename/Delete desabilitados', () => {
    const ro = folder({ target: { isDirectory: true, isRoot: false, isReadonly: true, parentReadonly: false }, clipboardKind: 'copy' });
    expect(enabled(ro, 'explorer.copy')).toBe(true);
    expect(enabled(ro, 'explorer.download')).toBe(true);
    for (const id of ['explorer.newFile', 'explorer.newFolder', 'explorer.cut', 'explorer.paste', 'explorer.rename', 'explorer.delete', 'explorer.upload']) {
      expect(enabled(ro, id), `${id} deve estar desabilitado em somente leitura`).toBe(false);
    }
  });

  it('área vazia (sem recurso): nenhum item de nó (Refresh/Collapse vivem no header, não no menu)', () => {
    const list = ids(file({ selection: [], target: null }));
    expect(list).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 4.5 commit 3 — keybinding labels (04_17 §3.8 "Ordem medida") + matriz
// 04_03 §2 item a item: 10 itens × 5 contextos (arquivo, pasta, raiz,
// multi-seleção, somente leitura). "✔" = presente e habilitado; "✖" = presente
// e desabilitado (precondition); "—" = ausente (when falso).
// ---------------------------------------------------------------------------
describe('keybinding labels (04_17 §3.8)', () => {
  const expectedKb: Record<string, string | undefined> = {
    'explorer.newFile': undefined, 'explorer.newFolder': undefined, 'explorer.open': undefined,
    'explorer.cut': 'Ctrl+X', 'explorer.copy': 'Ctrl+C', 'explorer.paste': 'Ctrl+V',
    'explorer.download': undefined, 'explorer.upload': undefined,
    'explorer.copyPath': 'Ctrl+Alt+C', 'explorer.copyRelativePath': 'Ctrl+Shift+Alt+C',
    'explorer.rename': 'F2', 'explorer.delete': 'Del',
  };
  it('tabela declara exatamente os keybindings medidos no VS Code real', () => {
    for (const it of EXPLORER_CONTEXT_MENU) expect(it.keybinding, it.id).toBe(expectedKb[it.id]);
  });
  it('item resolvido carrega keybinding (opcional: ausente quando não há)', () => {
    const m = menu(folder());
    expect(m.find((i) => i.id === 'explorer.cut')?.keybinding).toBe('Ctrl+X');
    expect('keybinding' in (m.find((i) => i.id === 'explorer.newFile') ?? {})).toBe(false);
    expect(m.every((i) => i.checked === undefined)).toBe(true);
  });
});

describe('matriz 04_03 §2 — 10 itens × 5 contextos (item a item)', () => {
  type Cell = '✔' | '✖' | '—';
  const multi = (): ExplorerContextSource => file({ selection: ['/ws/a.txt', '/ws/b.txt'] });
  const readonlyFile = (): ExplorerContextSource => file({ target: { isDirectory: false, isRoot: false, isReadonly: true, parentReadonly: true } });
  const contexts: Record<string, () => ExplorerContextSource> = {
    arquivo: () => file(), pasta: () => folder(), raiz: () => root(), multi, somenteLeitura: readonlyFile,
  };
  // Linhas = tabela 04_03 §2 (adaptações registradas: Download em pasta/multi
  // sempre — ZIP fallback G1; Delete = "Delete Permanently" sem lixeira web;
  // New File/Folder só em pasta — upstream ExplorerFolderContext, c4; a linha
  // "somenteLeitura" é um ARQUIVO readonly, logo "—").
  const matrix: Record<string, Record<keyof typeof contexts, Cell>> = {
    'explorer.newFile':          { arquivo: '—', pasta: '✔', raiz: '✔', multi: '—', somenteLeitura: '—' },
    'explorer.newFolder':        { arquivo: '—', pasta: '✔', raiz: '✔', multi: '—', somenteLeitura: '—' },
    'explorer.cut':              { arquivo: '✔', pasta: '✔', raiz: '—', multi: '✔', somenteLeitura: '✖' },
    'explorer.copy':             { arquivo: '✔', pasta: '✔', raiz: '—', multi: '✔', somenteLeitura: '✔' },
    'explorer.paste':            { arquivo: '—', pasta: '✖', raiz: '✖', multi: '—', somenteLeitura: '—' },
    'explorer.download':         { arquivo: '✔', pasta: '✔', raiz: '—', multi: '✔', somenteLeitura: '✔' },
    'explorer.upload':           { arquivo: '—', pasta: '✔', raiz: '✔', multi: '—', somenteLeitura: '—' },
    'explorer.copyPath':         { arquivo: '✔', pasta: '✔', raiz: '✔', multi: '✔', somenteLeitura: '✔' },
    'explorer.rename':           { arquivo: '✔', pasta: '✔', raiz: '—', multi: '—', somenteLeitura: '✖' },
    'explorer.delete':           { arquivo: '✔', pasta: '✔', raiz: '—', multi: '✔', somenteLeitura: '✖' },
  };
  for (const [id, row] of Object.entries(matrix)) {
    for (const [ctxName, cell] of Object.entries(row)) {
      it(`${id} × ${ctxName} = ${cell}`, () => {
        const m = menu(contexts[ctxName]());
        const found = m.find((i) => i.id === id);
        if (cell === '—') expect(found, 'ausente').toBeUndefined();
        else expect(found?.enabled, 'presente').toBe(cell === '✔');
      });
    }
  }
});
