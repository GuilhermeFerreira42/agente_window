// ============================================================================
// modules/explorer-search/index.ts — BARREL ÚNICO (fronteira LEGO)
// App.tsx (e qualquer coisa fora do módulo) importa APENAS este caminho:
//   ./modules/explorer-search
// Nada de ./modules/explorer-search/core/*, ./ui/* etc — ver
// __tests__/frontier.test.ts (04_10 §2.5, regra FT).
// ============================================================================

export type * from './contract';

import {
  Emitter,
} from './core/emitter';
import {
  ExplorerService,
} from './core/explorerService';
import type { ExplorerSearchEvent, WorkspaceUri } from './contract';
import type {
  IEditorAttachApi,
  IExplorerSearchModule,
  IExplorerSearchModuleDeps,
  ISearchApi,
} from './contract';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ExplorerView } from './ui/ExplorerView';
import { saveBlob } from './ui/transfer/saveBlob';
import { uriDirname } from './core/uri';

// ---------------------------------------------------------------------------
// Stubs (4.6/4.7): interfaces assimiladas agora, implementação nas sub-fatias
// em que serão validadas. Falham explicitamente até lá.
// ---------------------------------------------------------------------------
const notYet = (slice: string): never => {
  throw new Error(`[explorer-search] ${slice} — sub-fatia programada (04_15 §3).`);
};

const stubSearch: ISearchApi = {
  query: () => notYet('search.query (4.6)'),
  replaceAll: () => notYet('search.replaceAll (4.6)'),
};

const stubAttach: IEditorAttachApi = {
  open: () => notYet('attach.open (4.7)'),
  close: () => notYet('attach.close (4.7)'),
  closeAll: () => notYet('attach.closeAll (4.7)'),
  setVisible: () => notYet('attach.setVisible (4.6/4.7)'),
  setWidth: () => notYet('attach.setWidth (4.6/4.7)'),
  save: () => notYet('attach.save (4.7)'),
  getTabs: () => [],
};

// ---------------------------------------------------------------------------
// createExplorerSearchModule — fábrica REAL para 4.2 (core puro sem DOM).
// mount() permanece stub até 4.4 (UI React).
// ---------------------------------------------------------------------------
/** Adapter HTTP do Single Port — usado pelo wiring (4.4) para montar deps.fs.
 *  Vive no core (puro, FT-07): sem node:*, sem DOM — só fetch/WebSocket. */
export { BrowserFsPort, BrowserFsError } from './core/fs/browserFsPort';
export { ExplorerFsWatchClient } from './core/watchClient';
export type { BrowserFsPortOptions } from './core/fs/browserFsPort';
export type { ExplorerFsWatchClientOptions, FsChangedEvent } from './core/watchClient';

export function createExplorerSearchModule(deps: IExplorerSearchModuleDeps): IExplorerSearchModule {
  const service = new ExplorerService(deps.fs, { save: saveBlob });
  const events = new Emitter<ExplorerSearchEvent>();
  const off = service.onEvent((e) => events.fire(e));
  let reactRoot: Root | null = null;
  let slotContainer: HTMLElement | null = null;

  // fs.changed externo (outros clientes/terminal escrevendo no disco) →
  // refresh lazy do diretório afetado, preservando expansão/seleção (A2.6).
  const offFsEvents = deps.fs.onEvent((e) => {
    const dirs = new Set<WorkspaceUri>();
    for (const change of e.changes) dirs.add(uriDirname(change.uri));
    for (const dir of dirs) {
      if (!service.isExpandedUri(dir) && dir !== deps.workspaceRoot) continue;
      void service.refresh({ uri: dir }).catch(() => undefined);
    }
  });

  return {
    explorer: service,

    get search() {
      return stubSearch;
    },
    get attach() {
      return stubAttach;
    },

    mount(root: HTMLElement): void {
      // Regra A7/A5.x: o módulo só escreve DOM dentro do slot recebido.
      if (reactRoot) {
        reactRoot.unmount();
        reactRoot = null;
      }
      if (slotContainer) {
        slotContainer.remove();
        slotContainer = null;
      }
      const container = root.ownerDocument.createElement('div');
      container.style.display = 'contents';
      root.appendChild(container);
      slotContainer = container;
      reactRoot = createRoot(container);
      reactRoot.render(
        createElement(ExplorerView, {
          service, menus: deps.menus, contextMenu: deps.contextMenu, fs: deps.fs,
        }),
      );
    },

    unmount(): void {
      // remove DOM do slot; estado do serviço (expansão/seleção/root) sobrevive.
      if (reactRoot) {
        reactRoot.unmount();
        reactRoot = null;
      }
      if (slotContainer) {
        slotContainer.remove();
        slotContainer = null;
      }
    },

    onEvent(cb: (e: ExplorerSearchEvent) => void): () => void {
      return events.add(cb);
    },

    dispose(): void {
      if (reactRoot) {
        reactRoot.unmount();
        reactRoot = null;
      }
      if (slotContainer) {
        slotContainer.remove();
        slotContainer = null;
      }
      offFsEvents();
      off();
      events.dispose();
      service.dispose();
    },
  };
}
