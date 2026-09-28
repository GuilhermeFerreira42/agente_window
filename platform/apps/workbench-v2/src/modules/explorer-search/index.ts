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
import { AttachArea, type AttachAreaProps } from './ui/attach/AttachArea';
import type { CodeEditorPaneApi } from './ui/attach/CodeEditorPane';
import { AttachLayoutStore } from './core/attach/attachLayout';
import { ATTACH_CHANGES_URI, EditorService } from './core/editor/editorService';
import { GitService } from './core/git/gitService';
import { BrowserGitPort } from './core/git/browserGitPort';
import { saveBlob } from './ui/transfer/saveBlob';
import { uriDirname } from './core/uri';

// ---------------------------------------------------------------------------
// Stubs (4.6/4.7): interfaces assimiladas agora, implementação nas sub-fatias
// em que serão validadas. Falham explicitamente até lá.
// ---------------------------------------------------------------------------
const notYet = (slice: string): never => {
  throw new Error(`[explorer-search] ${slice} — sub-fatia programada (04_15 §3).`);
};

// 4.7 c1: layout (setVisible/setWidth) real; c2: abas (open/close/closeAll/
// getTabs) reais via EditorService puro; save entra em c5.
const attachApiFor = (layout: AttachLayoutStore, editor: EditorService, save: (uri: WorkspaceUri) => Promise<void>): IEditorAttachApi => ({
  open: async ({ uri, kind, line, column, sessionId, pinned, diff }) => { editor.open({ sessionId, uri, kind, line, column, pinned, diff }); },
  close: async ({ uri, sessionId }) => { editor.close({ sessionId, uri }); },
  closeAll: async ({ sessionId }) => { editor.closeAll({ sessionId }); },
  setVisible: ({ sessionId, visible }) => layout.setVisible(sessionId, visible),
  setWidth: ({ pixels }) => { layout.setWidth(pixels); },
  save: ({ uri }) => save(uri),
  getTabs: ({ sessionId }) => editor.getTabs(sessionId),
  setMaximized: ({ maximized }) => layout.setMaximized(maximized),
  isMaximized: () => layout.isMaximized(),
});

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
  const unmountAttach = () => {
    const root = attachRoot;
    attachRoot = null;
    attachSessionId = null;
    if (attachContainer) {
      attachContainer.remove();
      attachContainer = null;
    }
    if (root) setTimeout(() => root.unmount(), 0);
  };
  // 4.7 c1 — Editor Anexo: layout puro + root React no `attachSlot` da barra.
  const attachLayout = new AttachLayoutStore(typeof localStorage === 'undefined' ? null : localStorage);
  const editorService = new EditorService();
  // 4.7-b c2 — Git (aba fixa "Changes"): raiz = raiz do workspace (decisão do usuário);
  // o primeiro status só acontece quando a aba é aberta (setRoot no ChangesPane).
  const gitService = new GitService(new BrowserGitPort());
  const offGitEvents = gitService.onEvent((e) => events.fire(e));
  // c5 — save ATÔMICO: conteúdo do modelo → fs.writeFile({atomic:true}) (temp +
  // rename no fsHost); dirty limpa SÓ depois da promise resolver; falha mantém
  // dirty e propaga o erro (UI mostra). O fs.changed gerado pela própria
  // escrita é ignorado porque o conteúdo lido é igual ao do modelo.
  const lastSaved = new Map<WorkspaceUri, string>(); // eco da nossa própria escrita (fs.changed)
  const attachSave = async (uri: WorkspaceUri): Promise<void> => {
    const content = attachPaneApi?.getContent(uri) ?? null;
    if (content === null) throw new Error(`[explorer-search] attach.save: ${uri} não está aberto no anexo`);
    lastSaved.set(uri, content);
    await deps.fs.writeFile({ uri, content, atomic: true });
    attachPaneApi?.markSaved(uri);
    for (const sid of editorService.sessionsWith(uri)) editorService.markSaved({ sessionId: sid, uri });
  };
  const attachReload = async (uri: WorkspaceUri): Promise<void> => {
    const read = await deps.fs.readFile({ uri });
    attachPaneApi?.reload(uri, read.content);
  };
  const attachApi = attachApiFor(attachLayout, editorService, attachSave);
  // eventos editor.* saem pelo onEvent do módulo; expandir/recolher move o layout
  // (display:none — nunca desmonta).
  // c6 — maximizar/restaurar sai como evento editor.* (sessão = a que hospeda o anexo).
  const offLayoutMax = attachLayout.onEvent((e) => {
    if (e.type !== 'attach.maximizedChanged') return;
    const sessionId = attachSessionId ?? '';
    events.fire(e.maximized ? { type: 'editor.attachMaximized', sessionId } : { type: 'editor.attachRestored', sessionId });
  });
  const offEditor = editorService.onEvent((e) => {
    if (e.type === 'editor.attachExpanded') attachLayout.setVisible(e.sessionId, true);
    if (e.type === 'editor.attachCollapsed') attachLayout.setVisible(e.sessionId, false);
    events.fire(e);
  });
  let attachRoot: Root | null = null;
  let attachContainer: HTMLElement | null = null;
  let attachSessionId: string | null = null;
  let attachMonaco: import('monaco-editor').editor.IStandaloneCodeEditor | null = null;
  let attachPaneApi: CodeEditorPaneApi | null = null;
  const onEditorReady: AttachAreaProps['onEditorReady'] = (ed, api) => { attachMonaco = ed; attachPaneApi = api; };
  const attachProps = (sessionId: string): AttachAreaProps => ({ store: attachLayout, sessionId, editor: editorService, root: deps.workspaceRoot, fs: deps.fs, onEditorReady, onSave: attachSave, onReload: attachReload, git: gitService });
  // c6 — abrir match: mesmo caminho do Explorer (reveal + open → emite
  // `explorer.fileOpened`, seleciona na árvore). Se a árvore não resolver o
  // caminho (raiz diferente/erro), emite o evento direto — o shell abre igual.
  // Linha/coluna: reveal no editor é débito da 4.7 (contrato congelado).
  // 4.7 c4 (fecha D2.20): abre NO ANEXO da sessão montada com linha/coluna
  // (reveal + highlight no Monaco) e só seleciona/revela na árvore.
  // 4.7-c c2 (fix): NUNCA abrir em 'default' — a sessão real é a que o shell
  // passa em mountAttach. Antes da montagem, a abertura fica pendente e é
  // executada assim que o anexo montar (zero aba fantasma / sumiço pós-F5).
  let pendingAttachOpen: ((sessionId: string) => void) | null = null;
  const openInAttachSession = (fn: (sessionId: string) => void): void => {
    if (attachSessionId) fn(attachSessionId);
    else pendingAttachOpen = fn;
  };
  const onOpenMatch = (m: SearchMatch) => {
    openInAttachSession((sessionId) => editorService.open({ sessionId, uri: m.uri, kind: 'code', line: m.line, column: m.column }));
    void service.reveal({ uri: m.uri }).catch(() => undefined);
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
    // c5 — conflito externo: URI aberta no anexo mudou no disco. Limpa →
    // recarrega em silêncio (se o conteúdo diferir do que nós mesmos gravamos);
    // suja → editor.externalChange (a UI pergunta Recarregar / Manter).
    // (rename atômico temp→destino chega como 'added' no fs.watch — conta como mudança)
    for (const change of e.changes) {
      if (!attachPaneApi?.has(change.uri)) continue;
      // Lê o disco ANTES de decidir: se for o eco da nossa própria escrita
      // (conteúdo == último salvo) ou igual ao modelo, não é mudança externa.
      void deps.fs.readFile({ uri: change.uri }).then((read) => {
        if (!attachPaneApi?.has(change.uri)) return;
        if (read.content === lastSaved.get(change.uri)) return;
        if (read.content === (attachPaneApi.getContent(change.uri) ?? null)) return;
        const states = editorService.notifyExternalChange(change.uri);
        if (states.length && states.every((s) => !s.dirty)) attachPaneApi.reload(change.uri, read.content);
      }).catch(() => undefined);
    }
    // 4.7-b c2: qualquer mudança no workspace → re-status Git (debounce; só com raiz definida)
    if (gitService.getRoot()) gitService.handleFsChanged();
    const dirs = new Set<WorkspaceUri>();
    for (const change of e.changes) dirs.add(uriDirname(change.uri));
    for (const dir of dirs) {
      if (!service.isExpandedUri(dir) && dir !== deps.workspaceRoot) continue;
      void service.refresh({ uri: dir }).catch(() => undefined);
    }
  });

  const module: IExplorerSearchModule = {
    explorer: service,

    get search() {
      return searchService;
    },
    get attach() {
      return attachApi;
    },

    mount(root: HTMLElement): void {
      // Regra A7/A5.x: o módulo só escreve DOM dentro do slot recebido.
      // O shell chama mount/unmount de um callback-ref (durante o commit do React):
      // desmontar a root síncrono aqui dispara "Attempted to synchronously unmount a
      // root while React was already rendering" — adia, como Search/Anexo (4.6/4.7).
      if (reactRoot) {
        const old = reactRoot; reactRoot = null;
        setTimeout(() => old.unmount(), 0);
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
          // 4.7-b: entrada visível da aba Changes (header Folders) — mesma sessão do anexo.
          onOpenChanges: () => openInAttachSession((sessionId) => editorService.open({ sessionId, uri: ATTACH_CHANGES_URI, kind: 'changes', pinned: true })),
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

    mountAttach(root: HTMLElement, opts: { sessionId: string }): void {
      // mesmo host → só re-render (sessão trocou); host novo → remonta.
      // Esconder/mostrar NÃO passa por aqui (display:none dentro do AttachArea).
      if (attachRoot && attachContainer && attachContainer.parentElement === root) {
        if (attachSessionId !== opts.sessionId) {
          attachSessionId = opts.sessionId;
          attachRoot.render(createElement(AttachArea, attachProps(opts.sessionId)));
        }
        if (pendingAttachOpen) { const fn = pendingAttachOpen; pendingAttachOpen = null; fn(opts.sessionId); }
        return;
      }
      unmountAttach();
      const container = root.ownerDocument.createElement('div');
      container.style.display = 'contents';
      root.appendChild(container);
      attachContainer = container;
      attachSessionId = opts.sessionId;
      attachRoot = createRoot(container);
      attachRoot.render(createElement(AttachArea, attachProps(opts.sessionId)));
      if (pendingAttachOpen) { const fn = pendingAttachOpen; pendingAttachOpen = null; fn(opts.sessionId); }
    },

    unmountAttach,

    unmount(): void {
      // remove DOM do slot; estado do serviço (expansão/seleção/root) sobrevive.
      if (reactRoot) {
        const old = reactRoot; reactRoot = null;
        setTimeout(() => old.unmount(), 0); // ver comentário em mount()
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
      unmountAttach();
      offEditor();
      offLayoutMax();
      editorService.dispose();
      attachLayout.dispose();
      offGitEvents();
      gitService.dispose();
      offFsEvents();
      offSearch();
      searchService.dispose();
      off();
      events.dispose();
      service.dispose();
    },
  };
  // Gancho de teste (só DEV): E2E da 4.7 chama `attach.setVisible/setWidth`
  // do MESMO módulo montado pelo shell. Não existe em build de produção.
  if (import.meta.env?.DEV && typeof window !== 'undefined') {
    (window as unknown as { __explorerSearchModule?: IExplorerSearchModule & { __attachMonaco?: () => unknown; __attachPane?: () => unknown } }).__explorerSearchModule =
      Object.assign(module, { __attachMonaco: () => attachMonaco, __attachPane: () => attachPaneApi, __git: () => gitService });
  }
  return module;
}
