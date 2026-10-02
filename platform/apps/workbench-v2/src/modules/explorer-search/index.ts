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
import { ChangesPane } from './ui/attach/changes/ChangesPane';
import type { CodeEditorPaneApi } from './ui/attach/CodeEditorPane';
import { AttachLayoutStore } from './core/attach/attachLayout';
import { ATTACH_DIFF_URI, EditorService } from './core/editor/editorService';
import { GitService } from './core/git/gitService';
import { BrowserGitPort } from './core/git/browserGitPort';
import { saveBlob } from './ui/transfer/saveBlob';
import { uriBasename, uriDirname } from './core/uri';
import { createMonacoOutlineTracker } from './ui/attach/monacoOutline';
import { BrowserTimelinePort } from './core/timeline/browserTimelinePort';
import { resolveCommitDiff, toTimelineItems } from './core/timeline/timelineModel';
import type { ExplorerActiveFileApi } from './ui/activeFileApi';

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
  let scmRoot: Root | null = null;
  let scmContainer: HTMLElement | null = null;
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
  // 4.7-b c2 — Git: raiz = raiz do workspace (decisão do usuário); o primeiro status
  // acontece quando o ChangesPane monta (setRoot). 5.3: o pane vive na view `scm` da
  // Side Bar (montada 1× pelo shell), então o status — e o badge — nascem no boot.
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
  // 5.7 fix (BUG 5.7-02, homologação 2026-10-01, X do HEADER = recolher): anexo recolhido com o editor maximizado
  // deixava chat 0 / Side Bar 0 (tela preta). Recolher restaura primeiro — vale para o X do header e para a API setVisible.
  const offLayoutVis = attachLayout.onEvent((e) => {
    if (e.type === 'attach.visibilityChanged' && !e.visible && attachLayout.isMaximized()) attachLayout.setMaximized(false);
  });
  const offEditor = editorService.onEvent((e) => {
    if (e.type === 'editor.attachExpanded') attachLayout.setVisible(e.sessionId, true);
    // 5.7 fix (BUG 5.7-02): após o X do header (recolher, abas vivas) um clique num arquivo JÁ aberto só muda a ativa —
    // o serviço só dispara `attachExpanded` na 1.ª aba. Abrir/ativar com o anexo recolhido reexibe o anexo.
    if ((e.type === 'editor.tabOpened' || (e.type === 'editor.activeChanged' && e.uri !== null)) && !attachLayout.isVisible(e.sessionId)) attachLayout.setVisible(e.sessionId, true);
    if (e.type === 'editor.attachCollapsed') {
      attachLayout.setVisible(e.sessionId, false);
      // 5.7 fix (BUG 5.7-02/04): sem abas não existe "editor maximizado" — restaura antes de recolher, senão o shell
      // fica com chat escondido/Side Bar recolhida e a próxima aba já nasce maximizada.
      if (attachLayout.isMaximized()) attachLayout.setMaximized(false);
    }
    events.fire(e);
  });
  let attachRoot: Root | null = null;
  let attachContainer: HTMLElement | null = null;
  let attachSessionId: string | null = null;
  let attachMonaco: import('monaco-editor').editor.IStandaloneCodeEditor | null = null;
  let attachPaneApi: CodeEditorPaneApi | null = null;
  // 5.6 (A0.6) — Outline lê os símbolos do modelo ativo do Monaco do anexo; Timeline
  // fala com /git/log + /git/show(sha). Tudo aditivo: ExplorerView recebe `activeFile`.
  const outlineTracker = createMonacoOutlineTracker();
  const timelinePort = new BrowserTimelinePort();
  const onEditorReady: AttachAreaProps['onEditorReady'] = (ed, api) => { attachMonaco = ed; attachPaneApi = api; outlineTracker.attach(ed); };
  const activeCodeUri = (): WorkspaceUri | null => {
    if (!attachSessionId) return null;
    const t = editorService.getActive(attachSessionId);
    return t && t.kind === 'code' ? t.uri : null;
  };
  const activeFileApi: ExplorerActiveFileApi = {
    getActiveUri: activeCodeUri,
    onActiveChanged(cb) {
      let last = activeCodeUri();
      return editorService.onEvent((e) => {
        if (e.type !== 'editor.activeChanged' && e.type !== 'editor.tabClosed' && e.type !== 'editor.tabOpened') return;
        const cur = activeCodeUri();
        if (cur !== last) { last = cur; cb(cur); }
      });
    },
    outline: { rows: () => outlineTracker.rows(), onChanged: (cb) => outlineTracker.onChanged(cb), reveal: (l, c) => outlineTracker.reveal(l, c) },
    timeline: {
      async load(uri) {
        try { return toTimelineItems(await timelinePort.log(deps.workspaceRoot, uri), uriBasename(uri)); }
        catch { return []; } // fora do workspace / servidor sem git → sem timeline (mensagem padrão)
      },
      async openDiff(uri, item) {
        const sides = await resolveCommitDiff(timelinePort, deps.workspaceRoot, uri, item);
        openInAttachSession((sessionId) => editorService.open({ sessionId, uri: ATTACH_DIFF_URI, kind: 'diff', diff: { resource: uri, title: sides.title, original: sides.original, modified: sides.modified } }));
      },
    },
  };
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
  // 5.3 — Source Control View na Side Bar: mesmo ChangesPane da 4.7-b; clique num
  // recurso abre o diff read-only NO ANEXO (aba fixa Diff — até a 5.7).
  const scmElement = () => createElement('div', { className: 'explorer-viewlet scm-viewlet', 'data-testid': 'scm-viewlet' },
    createElement(ChangesPane, {
      git: gitService, root: deps.workspaceRoot,
      onOpenFile: (uri: WorkspaceUri) => openInAttachSession((sessionId) => editorService.open({ sessionId, uri, kind: 'code' })),
      onOpenDiff: (item, sides) => openInAttachSession((sessionId) => editorService.open({ sessionId, uri: ATTACH_DIFF_URI, kind: 'diff', diff: { resource: item.uri, title: sides.title, original: sides.original, modified: sides.modified } })),
    }));
  const unmountScm = () => {
    const root = scmRoot;
    scmRoot = null;
    if (scmContainer) {
      scmContainer.remove();
      scmContainer = null;
    }
    if (root) setTimeout(() => root.unmount(), 0); // ver comentário em unmountSearch
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
          // 5.3: "Open Source Control" (header Folders) → view `scm` da Side Bar (o shell decide onde ela vive).
          onOpenChanges: deps.openSourceControl,
          activeFile: activeFileApi, // 5.6
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

    mountScm(root: HTMLElement): void {
      if (scmRoot && scmContainer && scmContainer.parentElement === root) return; // mesmo host → nada a fazer (mount 1×)
      unmountScm();
      const container = root.ownerDocument.createElement('div');
      container.style.display = 'contents';
      root.appendChild(container);
      scmContainer = container;
      scmRoot = createRoot(container);
      scmRoot.render(scmElement());
    },

    unmountScm,

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
      unmountScm();
      unmountAttach();
      offEditor();
      offLayoutMax(); offLayoutVis();
      outlineTracker.dispose(); // 5.6
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
