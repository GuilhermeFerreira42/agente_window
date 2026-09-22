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
  menus = {
    register: (cmd) => { registered.set(cmd.id, () => cmd.run()); return () => registered.delete(cmd.id); },
    execute: async (id) => { await registered.get(id)?.() ?? undefined; },
    setContext: () => undefined,
    getContext: () => undefined,
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
  it('5 botões com tooltips/aria EXATOS do upstream (04_01 §2)', async () => {
    await bootView();
    expect(screen.getByRole('button', { name: 'New File...' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New Folder...' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Refresh Explorer' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Collapse Folders in Explorer' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'More Actions...' })).toBeTruthy();
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
    // seleciona raiz: clicar no nome da raiz (primeiro row dir)
    fireEvent.click(screen.getByText('ws'));
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
    fireEvent.click(screen.getByText('ws'));
    fireEvent.click(screen.getByTestId('explorer-new-folder'));
    const input = await screen.findByTestId('explorer-inline-input');
    fireEvent.keyDown(input, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByTestId('explorer-inline-input')).toBeNull());
    expect(screen.queryByText('pasta')).toBeNull();
  });
});

describe('ExplorerView — seções (A2.4) + overflow (A1.5)', () => {
  it('Open Editors exibe estado vazio "Nenhum editor aberto" (A2.4)', async () => {
    await bootView();
    expect(screen.getByText('Open Editors')).toBeTruthy();
    expect(screen.getByText('Nenhum editor aberto')).toBeTruthy();
  });

  it('Timeline e Outline presentes (A2.5/A2.6 mínimo)', async () => {
    await bootView();
    expect(screen.getByText('Timeline')).toBeTruthy();
    expect(screen.getByText('Outline')).toBeTruthy();
  });

  it('overflow “…” abre menu via contextMenu dep com Download desabilitado sem seleção', async () => {
    await bootView();
    fireEvent.click(screen.getByTestId('explorer-overflow'));
    expect(menuOpen.length).toBe(1);
    const download = menuOpen[0].items.find((i) => i.id === 'explorer.download');
    expect(download?.enabled).toBe(false);
  });
});
