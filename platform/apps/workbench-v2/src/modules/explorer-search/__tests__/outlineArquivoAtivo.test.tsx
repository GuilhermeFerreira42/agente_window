// ============================================================================
// outlineArquivoAtivo.test.tsx — DEF-D169-5 (Outline com 0 linhas).
//
// Reproduz, SEM navegador, a ordem exata em que o defeito aparece no app real:
// o ExplorerView monta e se inscreve em `onActiveChanged` ANTES de a
// superfície do editor existir, e o aviso "agora o arquivo ativo é este" chega
// numa janela em que `getActiveUri()` ainda devolve null.
//
// O que se mede aqui é só o que o ExplorerView controla: ele DESENHA as linhas
// de símbolo quando `getActiveUri()` devolve uma uri, e mostra a mensagem padrão
// quando não devolve. A entrega do aviso em si é medida no módulo
// (`arquivoAtivoAviso.test.ts`).
// ============================================================================
import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, act, fireEvent } from '@testing-library/react';
import { ExplorerView } from '../ui/ExplorerView';
import { ExplorerService } from '../core/explorerService';
import { FakeFsPort } from './fakeFs';
import { asWorkspaceUri } from '../core/uri';
import type { WorkspaceUri } from '../contract';
import type { OutlineRow } from '../core/outline/outlineModel';
import type { ExplorerActiveFileApi } from '../ui/activeFileApi';

const ROOT = asWorkspaceUri('/ws');
const URI = asWorkspaceUri('/ws/src/app.ts');

function linha(nome: string, linha: number): OutlineRow {
  return { id: `${nome}-${linha}`, name: nome, kind: 'function', line: linha, column: 1, depth: 0 } as OutlineRow;
}

/** Dublê do api de arquivo ativo, com a MESMA forma que o módulo injeta. */
function apiDeArquivo(estado: { uri: WorkspaceUri | null; rows: OutlineRow[] }) {
  const ouvintes = new Set<(u: WorkspaceUri | null) => void>();
  const api: ExplorerActiveFileApi = {
    getActiveUri: () => estado.uri,
    onActiveChanged: (cb) => { ouvintes.add(cb); return () => ouvintes.delete(cb); },
    outline: {
      rows: () => estado.rows,
      onChanged: () => () => {},
      reveal: () => {},
    },
    timeline: { load: async () => [], openDiff: async () => {} },
  };
  return {
    api,
    /** Simula o aviso do módulo: muda o estado e notifica. */
    avisar(uri: WorkspaceUri | null) { estado.uri = uri; for (const cb of ouvintes) cb(uri); },
    /** Simula o tracker entregando símbolos. */
    entregarSimbolos(rows: OutlineRow[]) { estado.rows = rows; },
    temOuvinte: () => ouvintes.size > 0,
  };
}

let fs: FakeFsPort;
let service: ExplorerService;

beforeEach(() => {
  cleanup();
  fs = new FakeFsPort(ROOT);
  fs.seed([{ path: '/ws/src', kind: 'directory' }, { path: '/ws/src/app.ts', kind: 'file' }]);
  service = new ExplorerService(fs);
});

async function montar(arquivo: ExplorerActiveFileApi) {
  // Sem pasta aberta o ExplorerView mostra "No Folder Opened" e as seções nem
  // existem — foi assim que a primeira versão deste teste falhou. Abrir a pasta
  // ANTES do render é o estado em que o defeito foi medido.
  await act(async () => { await service.openFolder({ uri: ROOT }); });
  const r = render(
    <ExplorerView
      service={service}
      menus={{ register: () => () => {}, execute: async () => {}, setContext: () => {}, getContext: () => undefined }}
      contextMenu={{ open: () => {} }}
      fs={fs}
      onOpenChanges={() => {}}
      activeFile={arquivo}
    />,
  );
  // O painel Outline nasce RECOLHIDO (expandedPanes.outline = false) — é o que o
  // dono vê no app e foi o que precisei fazer no navegador: abrir a seção.
  const cabecalho = r.container.querySelector('[data-pane="outline"] .pane-header');
  expect(cabecalho).toBeTruthy();
  if (cabecalho?.getAttribute('aria-expanded') === 'false') {
    await act(async () => { fireEvent.click(cabecalho); });
  }
  return r;
}

describe('DEF-D169-5 — o Outline mostra os símbolos do arquivo que está no centro', () => {
  it('arquivo ativo + símbolos ⇒ as linhas APARECEM (não a mensagem padrão)', async () => {
    const duble = apiDeArquivo({ uri: URI, rows: [linha('montar', 3), linha('desmontar', 9)] });
    await montar(duble.api);
    expect(screen.queryByText('No symbols found in document')).toBeNull();
    expect(screen.getByRole('tree', { name: 'Outline' })).toBeTruthy();
    expect(screen.getByText('montar')).toBeTruthy();
    expect(screen.getByText('desmontar')).toBeTruthy();
  });

  it('sem arquivo ativo ⇒ mensagem padrão (o comportamento honesto de antes)', async () => {
    const duble = apiDeArquivo({ uri: null, rows: [linha('montar', 3)] });
    await montar(duble.api);
    // Símbolos existem, mas sem arquivo ativo eles não são DESTE arquivo.
    expect(screen.getByText('No symbols found in document')).toBeTruthy();
    expect(screen.queryByRole('tree', { name: 'Outline' })).toBeNull();
  });

  it('o aviso de "arquivo ativo mudou" faz as linhas aparecerem (o caminho do defeito)', async () => {
    // Começa sem arquivo — é o estado de boot: ExplorerView monta antes do centro.
    const duble = apiDeArquivo({ uri: null, rows: [linha('montar', 3)] });
    await montar(duble.api);
    expect(screen.getByText('No symbols found in document')).toBeTruthy();
    expect(duble.temOuvinte()).toBe(true);
    // O centro monta e o arquivo é aberto: o módulo avisa.
    act(() => { duble.avisar(URI); });
    expect(screen.queryByText('No symbols found in document')).toBeNull();
    expect(screen.getByText('montar')).toBeTruthy();
  });
});
