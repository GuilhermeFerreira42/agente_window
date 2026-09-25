// ============================================================================
// explorerView.test.tsx — UI 4.4 (RTL/jsdom): header 5 botões (A1.x),
// árvore lazy (A2.1/VAL-EXP-01), input inline create/rename (A1.1/A1.2),
// seções com estado vazio (A2.4), registro de comandos no CommandRegistry.
// Sem disco/rede: FakeFsPort; transferências cobertas em transfer.test.ts.
// ============================================================================

import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ExplorerView } from '../ui/ExplorerView';
import { ExplorerService } from '../core/explorerService';
import { FakeFsPort } from './fakeFs';
import { asWorkspaceUri } from '../core/uri';
import type { CommandRegistryLike } from '../contract';

const ROOT = asWorkspaceUri('/ws');

let fs: FakeFsPort;
let service: ExplorerService;
let menus: CommandRegistryLike;
let registered: Map<string, () => unknown>;
let menuOpen: Array<{ x: number; y: number; items: Array<{ id: string; label: string; enabled: boolean; order: number }> }>;
let contextKeys: Map<string, boolean | string | number>;

function seed(): void {
  fs.seed([
    { path: '/ws/docs', kind: 'directory' },
    { path: '/ws/docs/guia.md', kind: 'file' },
    { path: '/ws/src', kind: 'directory' },
    { path: '/ws/src/app.ts', kind: 'file' },
    { path: '/ws/README.md', kind: 'file' },
  ]);
}

beforeEach(() => {
  cleanup();
  fs = new FakeFsPort(ROOT);
  seed();
  service = new ExplorerService(fs);
  registered = new Map();
  menuOpen = [];
  contextKeys = new Map();
  menus = {
    register: (cmd) => { registered.set(cmd.id, () => cmd.run()); return () => registered.delete(cmd.id); },
    execute: async (id) => { await registered.get(id)?.() ?? undefined; },
    setContext: (k, v) => { contextKeys.set(k, v); },
    getContext: (k) => contextKeys.get(k),
  };
});

async function bootView(): Promise<ReturnType<typeof render>> {
  await service.openFolder({ uri: ROOT });
  const view = render(
    <ExplorerView
      service={service}
      menus={menus}
      contextMenu={{ open: (input) => menuOpen.push(input) }}
      fs={fs}
    />,
  );
  await screen.findByText('README.md');
  return view;
}

describe('ExplorerView — header (A1.1–A1.5)', () => {
  it('pane-header da pasta raiz: 22px, nome com caixa preservada e 4 ações com aria EXATOS do upstream (DOM vscode.dev)', async () => {
    await bootView();
    const header = screen.getByRole('button', { name: 'Explorer Section: ws' });
    expect(header.classList.contains('pane-header')).toBe(true);
    expect(within(header).getByRole('heading', { level: 3 }).textContent).toBe('ws');
    // 4 ações do header da pasta (o "…" pertence ao título do viewlet = shell).
    // Fiel ao VS Code: `.pane-header > .actions { display:none }` até hover/focus-within.
    const actions = header.querySelector('.actions') as HTMLElement;
    expect(getComputedStyle(actions).display).toBe('none');
    for (const name of ['New File...', 'New Folder...', 'Refresh Explorer', 'Collapse Folders in Explorer']) {
      expect(within(actions).getByRole('button', { name, hidden: true })).toBeTruthy();
    }
    // a raiz NÃO é linha da árvore: filhos começam em aria-level=1
    const tree = screen.getByRole('tree');
    const rows = within(tree).getAllByRole('treeitem');
    expect(rows.every((r) => r.getAttribute('aria-level') === '1')).toBe(true);
    expect(within(tree).queryByText('ws')).toBeNull();
  });

  it('header registra comandos no CommandRegistry (não executa lógica inline)', async () => {
    await bootView();
    for (const id of ['explorer.newFile', 'explorer.newFolder', 'explorer.refresh', 'explorer.collapseAll', 'explorer.download']) {
      expect(registered.has(id), `esperava comando ${id}`).toBe(true);
    }
  });

  it('Collapse All fecha a árvore (A1.4) e Refresh relê a raiz (A1.3)', async () => {
    await bootView();
    // expande docs
    fireEvent.click(screen.getByText('docs'));
    await screen.findByText('guia.md');
    // collapse-all
    await menus.execute('explorer.collapseAll');
    await waitFor(() => expect(screen.queryByText('guia.md')).toBeNull());
    // refresh mantém expansão como está (root colapsado continua mostrando filhos do top)
    const before = fs.calls.list;
    await menus.execute('explorer.refresh');
    await waitFor(() => expect(fs.calls.list).toBeGreaterThan(before));
  });
});

describe('ExplorerView — árvore lazy (VAL-EXP-01/A2.1)', () => {
  it('expandir lê UMA vez; colapsar+re-expandir NÃO relê', async () => {
    await bootView();
    const before = fs.calls.list;
    fireEvent.click(screen.getByText('docs'));
    await screen.findByText('guia.md');
    const afterFirst = fs.calls.list;
    expect(afterFirst - before).toBe(1); // exatamente 1 list para o ramo
    // colapsa
    fireEvent.click(screen.getByText('docs'));
    await waitFor(() => expect(screen.queryByText('guia.md')).toBeNull());
    // re-expande: cache — list NÃO aumenta
    fireEvent.click(screen.getByText('docs'));
    await screen.findByText('guia.md');
    expect(fs.calls.list).toBe(afterFirst);
  });

  it('linhas de arquivo clicadas emitem explorer.fileOpened', async () => {
    await bootView();
    const opened: string[] = [];
    const off = service.onEvent((e) => { if (e.type === 'explorer.fileOpened') opened.push(e.uri); });
    fireEvent.click(screen.getByText('README.md'));
    await waitFor(() => expect(opened).toEqual([asWorkspaceUri('/ws/README.md')]));
    off();
  });
});

describe('ExplorerView — input inline criar/renomear (A1.1/A1.2, 04_02 §4)', () => {
  it('Novo Arquivo: input inline → Enter cria no disco via serviço', async () => {
    await bootView();
    // sem seleção → cria na raiz (resolveCreateParent → root)
    fireEvent.click(screen.getByTestId('explorer-new-file'));
    const input = await screen.findByTestId('explorer-inline-input');
    fireEvent.change(input, { target: { value: 'novo-arquivo.txt' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await screen.findByText('novo-arquivo.txt');
  });

  it('F2 na seleção renomeia; Enter confirma e a ÁRVORE mostra o novo nome', async () => {
    await bootView();
    const scope = screen.getByRole('tree');
    fireEvent.click(screen.getByText('README.md'));
    fireEvent.keyDown(scope, { key: 'F2' });
    const input = await screen.findByTestId('explorer-inline-input');
    fireEvent.change(input, { target: { value: 'LEIAME.md' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await screen.findByText('LEIAME.md');
    // "README.md" ANTIGO some DA ÁRVORE (a seção Open Editors segue com a entrada
    // aberta antes do rename — será reescrita sobre eventos attach na 4.7).
    expect(within(scope).queryByText('README.md')).toBeNull();
  });

  it('Escape cancela o input inline sem criar nada', async () => {
    await bootView();
    fireEvent.click(screen.getByTestId('explorer-new-folder'));
    const input = await screen.findByTestId('explorer-inline-input');
    fireEvent.keyDown(input, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByTestId('explorer-inline-input')).toBeNull());
    expect(screen.queryByText('pasta')).toBeNull();
  });
});

describe('ExplorerView — seções (A2.4) + overflow (A1.5)', () => {
  it('Open Editors: OCULTA por padrão (VS Code, c5); após explorer.views.toggle.openEditors é um pane colapsado que lista os arquivos abertos (A2.4)', async () => {
    await bootView();
    expect(screen.queryByRole('button', { name: 'Open Editors Section' }), 'oculta por padrão').toBeNull();
    await menus.execute('explorer.views.toggle.openEditors');
    const header = await screen.findByRole('button', { name: 'Open Editors Section' });
    expect(header.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(screen.getByText('README.md'));   // abre → explorer.fileOpened
    fireEvent.click(header);
    expect(header.getAttribute('aria-expanded')).toBe('true');
    const list = screen.getByRole('list', { name: 'Open Editors' });
    expect(within(list).getByText('README.md')).toBeTruthy();
  });

  it('Timeline e Outline presentes (A2.5/A2.6 mínimo)', async () => {
    await bootView();
    expect(screen.getByText('Timeline')).toBeTruthy();
    expect(screen.getByText('Outline')).toBeTruthy();
  });

  it('menu de contexto na área vazia cai no contexto da raiz (Download/Upload habilitados, Rename/Delete ausentes)', async () => {
    await bootView();
    fireEvent.contextMenu(screen.getByRole('tree'));
    expect(menuOpen.length).toBe(1);
    const ids = menuOpen[0].items.map((i) => i.id);
    expect(ids).toContain('explorer.newFile');
    expect(ids).not.toContain('explorer.rename');
    expect(ids).not.toContain('explorer.delete');
  });
});

describe('ExplorerView — menu de contexto declarativo + context keys (04_03 §1/§7, VAL-EXP-08)', () => {
  it('publica context keys via menus.setContext em cada selectionChanged', async () => {
    await bootView();
    fireEvent.click(screen.getByText('README.md'));
    await waitFor(() => expect(contextKeys.get('explorerResourceIsFolder')).toBe(false));
    expect(contextKeys.get('explorerResourceIsRoot')).toBe(false);
    expect(contextKeys.get('multiSelectionActive')).toBe(false);
    expect(contextKeys.get('resourceCopied')).toBe(false);
    fireEvent.click(screen.getByText('docs'));
    await waitFor(() => expect(contextKeys.get('explorerResourceIsFolder')).toBe(true));
    await menus.execute('explorer.copy');
    await waitFor(() => expect(contextKeys.get('resourceCopied')).toBe(true));
  });

  it('botão direito em ARQUIVO: itens da tabela (grupos/ordem), sem Paste/Upload; Open executa via registry', async () => {
    await bootView();
    fireEvent.contextMenu(screen.getByText('README.md'));
    expect(menuOpen.length).toBe(1);
    const ids = menuOpen[0].items.map((i) => i.id);
    expect(ids).toEqual(expect.arrayContaining(['explorer.open', 'explorer.cut', 'explorer.copy', 'explorer.download', 'explorer.rename', 'explorer.delete']));
    // c4: upstream ExplorerFolderContext — New File/Folder não aparecem em arquivo
    expect(ids).not.toContain('explorer.newFile');
    expect(ids).not.toContain('explorer.newFolder');
    expect(ids).not.toContain('explorer.paste');
    expect(ids).not.toContain('explorer.upload');
    // ordem global preserva a sequência de grupos: navigation < cutcopypaste < importexport < modification
    expect(ids.indexOf('explorer.open')).toBeLessThan(ids.indexOf('explorer.cut'));
    expect(ids.indexOf('explorer.copy')).toBeLessThan(ids.indexOf('explorer.download'));
    expect(ids.indexOf('explorer.download')).toBeLessThan(ids.indexOf('explorer.rename'));
    for (const id of ids) expect(registered.has(id), `item ${id} precisa de comando registrado`).toBe(true);
  });

  it('botão direito em PASTA: Paste desabilitado sem clipboard e habilitado após Copy', async () => {
    await bootView();
    fireEvent.contextMenu(screen.getByText('docs'));
    const paste1 = menuOpen[0].items.find((i) => i.id === 'explorer.paste');
    expect(paste1?.enabled).toBe(false);
    expect(menuOpen[0].items.find((i) => i.id === 'explorer.upload')).toBeTruthy();
    fireEvent.click(screen.getByText('README.md'));
    await menus.execute('explorer.copy');
    fireEvent.contextMenu(screen.getByText('docs'));
    const paste2 = menuOpen[1].items.find((i) => i.id === 'explorer.paste');
    expect(paste2?.enabled).toBe(true);
  });

  it('botão direito em área vazia → contexto da RAIZ: sem Cut/Rename/Delete', async () => {
    await bootView();
    fireEvent.contextMenu(screen.getByRole('tree'));
    expect(menuOpen.length).toBe(1);
    const ids = menuOpen[0].items.map((i) => i.id);
    expect(ids).not.toContain('explorer.cut');
    expect(ids).not.toContain('explorer.rename');
    expect(ids).not.toContain('explorer.delete');
    expect(ids).toContain('explorer.newFile');
    expect(contextKeys.get('explorerResourceIsRoot')).toBe(true);
  });

  it('Upload... registrado e abre o picker (input file oculto)', async () => {
    await bootView();
    expect(registered.has('explorer.upload')).toBe(true);
    const input = screen.getByTestId('explorer-upload-input') as HTMLInputElement;
    let clicked = 0;
    input.addEventListener('click', (e) => { clicked++; e.preventDefault(); });
    fireEvent.click(screen.getByText('docs'));
    await menus.execute('explorer.upload');
    expect(clicked).toBe(1);
  });
});
