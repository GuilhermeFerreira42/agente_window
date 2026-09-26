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
import type { ExplorerSearchEvent, SearchMatch, WorkspaceUri } from './contract';
import type {
  IEditorAttachApi,
  IExplorerSearchModule,
  IExplorerSearchModuleDeps,
} from './contract';
import { SearchService } from './core/search/searchService';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ExplorerView } from './ui/ExplorerView';
import { SearchPanel } from './ui/search/SearchPanel';
import { saveBlob } from './ui/transfer/saveBlob';
import { uriDirname } from './core/uri';

// ---------------------------------------------------------------------------
// Stubs (4.6/4.7): interfaces assimiladas agora, implementação nas sub-fatias
// em que serão validadas. Falham explicitamente até lá.
// ---------------------------------------------------------------------------
const notYet = (slice: string): never => {
  throw new Error(`[explorer-search] ${slice} — sub-fatia programada (04_15 §3).`);
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
  // 4.6 c2: ISearchApi real — transporte HTTP se deps.fs for BrowserFsPort
  // (searchText), senão walker local sobre a própria porta.
  const searchService = new SearchService(deps.fs);
  const offSearch = searchService.onEvent((e) => events.fire(e));
  let reactRoot: Root | null = null;
  let slotContainer: HTMLElement | null = null;
  let searchRoot: Root | null = null;
  let searchContainer: HTMLElement | null = null;
  // c6 — abrir match: mesmo caminho do Explorer (reveal + open → emite
  // `explorer.fileOpened`, seleciona na árvore). Se a árvore não resolver o
  // caminho (raiz diferente/erro), emite o evento direto — o shell abre igual.
  // Linha/coluna: reveal no editor é débito da 4.7 (contrato congelado).
  const onOpenMatch = (m: SearchMatch) => {
    void (async () => {
      try {
        await service.reveal({ uri: m.uri });
        await service.open({ uri: m.uri });
      } catch {
        events.fire({ type: 'explorer.fileOpened', uri: m.uri });
      }
    })();
  };
  const unmountSearch = () => {
    // O shell chama isto no cleanup de um effect (troca de aba) — desmontar um
    // root React SINCRONAMENTE dentro do commit de outro root dispara
    // "Attempted to synchronously unmount a root while React was already
    // rendering" (sessao_07 T5). DOM sai já; o unmount do root é adiado.
    const root = searchRoot;
    searchRoot = null;
    if (searchContainer) {
      searchContainer.remove();
      searchContainer = null;
    }
    if (root) setTimeout(() => root.unmount(), 0);
  };

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
      return searchService;
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

    mountSearch(root: HTMLElement, opts?: { focusRequest?: number }): void {
      // mesmo host → só re-render (foco pedido); host novo → remonta.
      if (searchRoot && searchContainer && searchContainer.parentElement === root) {
        searchRoot.render(createElement(SearchPanel, { search: searchService, root: deps.workspaceRoot, focusRequest: opts?.focusRequest, onOpenMatch }));
        return;
      }
      unmountSearch();
      const container = root.ownerDocument.createElement('div');
      container.style.display = 'contents';
      root.appendChild(container);
      searchContainer = container;
      searchRoot = createRoot(container);
      searchRoot.render(createElement(SearchPanel, { search: searchService, root: deps.workspaceRoot, focusRequest: opts?.focusRequest, onOpenMatch }));
    },

    unmountSearch,

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
      unmountSearch();
      offFsEvents();
      offSearch();
      searchService.dispose();
      off();
      events.dispose();
      service.dispose();
    },
  };
}
