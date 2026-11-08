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
// FATIA-15 Onda 2b (D146 §2) — corpo da aba central capaz de salvar.
import { CenterCodeEditor, type CenterCodeEditorProps, type CenterCloseRequester } from './ui/center/CenterCodeEditor';
import { ChangesPane } from './ui/attach/changes/ChangesPane';
import type { CodeEditorPaneApi, CodeEditorPaneProps } from './ui/attach/CodeEditorPane';
import { disposeModelResources } from './ui/attach/modelResources';
import { createEditorCommandBridge } from './ui/center/editorCommandBridge';
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
  open: async ({ uri, kind, line, column, sessionId, pinned, presentation, diff }) => { editor.open({ sessionId, uri, kind, line, column, pinned, presentation, diff }); },
  close: async ({ uri, sessionId }) => { editor.close({ sessionId, uri }); },
  closeAll: async ({ sessionId }) => { editor.closeAll({ sessionId }); },
  // D169 — split. O mecanismo vive aqui; o GATE (E15/R-039) é do shell, que
  // conhece o layout. Sem isso o shell não tinha o que chamar e inventava aba.
  split: ({ sessionId }) => editor.split(sessionId),
  duplicateToSide: ({ sessionId }) => editor.duplicateToSide(sessionId),
  unsplit: ({ sessionId, force }) => editor.unsplit({ sessionId, force }),
  isSplit: ({ sessionId }) => editor.isSplit(sessionId),
  moveTab: ({ sessionId, uri, to }) => editor.moveTab({ sessionId, uri, to }),
  sideOf: ({ sessionId, uri }) => {
    const id = editor.groupIdOf(sessionId, uri);
    return id === null ? null : id === sessionId ? 'principal' : 'secundario';
  },
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
  const unmountCodeEditor = () => {
    // Espelho de unmountAttach: tira o DOM, zera os holders e o atendente de
    // fechar aba. O estado do EditorService SOBREVIVE (as abas são do modelo,
    // não da montagem — é o que permite aposentar a coluna na Onda 3 sem perder
    // nada; ver D144, tensão Regra 10 × RF15-2).
    const root = centerRoot;
    centerRoot = null;
    centerSessionId = null;
    centerPaneApi = null;
    if (centerMonaco) { outlineTracker.detach(centerMonaco); centerMonaco = null; }
    centerCloseRequesters.clear();
    if (centerContainer) {
      centerContainer.remove();
      centerContainer = null;
    }
    if (root) setTimeout(() => root.unmount(), 0);
  };
  const unmountAttach = () => {
    const root = attachRoot;
    attachRoot = null;
    attachSessionId = null;
    // D152 §3: a coluna some → devolve a posse do Outline ao candidato vivo.
    if (attachMonaco) { outlineTracker.detach(attachMonaco); attachMonaco = null; }
    attachPaneApi = null;
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
  // FATIA-15 Onda 2b (D146 §2) — durante a SOBREPOSIÇÃO TEMPORAL da fusão há
  // DOIS CodeEditorPane montados: o do anexo (coluna) e o da aba central. Cada
  // painel só conhece os modelos do Monaco que ELE MESMO criou, então has/
  // getContent/markSaved/reload de um não servem para a uri do outro. Quem
  // salva, recarrega ou detecta mudança externa tem de perguntar ao painel que
  // TEM a uri — não ao primeiro que existir. Com um só painel montado (o caso de
  // hoje, e o caso final depois que a Onda 3 aposentar a coluna) o resultado é
  // IDÊNTICO ao de antes: a lista tem um elemento e ele é o do anexo.
  const painelQueTem = (uri: WorkspaceUri): CodeEditorPaneApi | null =>
    [attachPaneApi, centerPaneApi].find((p): p is CodeEditorPaneApi => p !== null && p.has(uri)) ?? null;
  const attachSave = async (uri: WorkspaceUri): Promise<void> => {
    const painel = painelQueTem(uri);
    const content = painel?.getContent(uri) ?? null;
    // A mensagem conserva o trecho que o FT-04 (frontier.test.ts:198) trava e
    // acrescenta a segunda superfície, que passou a existir nesta onda.
    if (content === null) throw new Error(`[explorer-search] attach.save: ${uri} não está aberto no anexo nem na aba central`);
    await deps.fs.writeFile({ uri, content, atomic: true });
    lastSaved.set(uri, content);
    painel?.markSaved(uri, content);
  };
  const attachReload = async (uri: WorkspaceUri): Promise<void> => {
    const read = await deps.fs.readFile({ uri });
    painelQueTem(uri)?.reload(uri, read.content);
  };
  const attachApi = attachApiFor(attachLayout, editorService, attachSave);
  // Onda 2b (D146) — ADITIVO: a faixa de abas do centro é do shell, mas quem
  // pode salvar ou descartar é o módulo (o shell não alcança o EditorService —
  // Regra 2). O shell pede; o CenterCodeEditor desta sessão abre o diálogo
  // Salvar/Não Salvar/Cancelar e executa. Sem corpo central montado o pedido não
  // faz nada — e o chamador trata isso como falha visível, nunca como descarte.
  attachApi.requestCloseTab = (input) => { centerCloseRequesters.get(input.sessionId)?.(input); };
  // Onda 2c-i (D148 §3) — ADITIVO: ativar aba de fronteira. O shell pede, o
  // EditorService decide: activate() ignora uri ausente do grupo da sessão, então
  // não há como o shell forçar um estado que o modelo não tem.
  attachApi.activateTab = (input) => { editorService.activate(input); };
  // D169: clique num painel marca o foco; sem isso o open() não sabe onde abrir.
  attachApi.setFocusSide = (input) => { editorService.setFocusGroup(input); };
  attachApi.focusSideOf = (input) => editorService.focusGroupOf(input.sessionId);
  attachApi.groupIds = input => editorService.groupIds(input.sessionId);
  attachApi.focusedGroupId = input => editorService.focusedGroupId(input.sessionId);
  attachApi.focusGroupId = input => editorService.focusGroupId(input.sessionId, input.groupId);
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
    // DEF-D169-5: o MESMO anunciante cuida do caminho dos eventos. Sem isto, os
    // dois caminhos (evento e montagem) voltariam a divergir — que é a causa
    // deste defeito.
    anunciarAtivo();
    events.fire(e);
  });
  let attachRoot: Root | null = null;
  let attachContainer: HTMLElement | null = null;
  let attachSessionId: string | null = null;
  let attachMonaco: import('monaco-editor').editor.IStandaloneCodeEditor | null = null;
  let attachPaneApi: CodeEditorPaneApi | null = null;
  // FATIA-15 Onda 2b (D146 §2) — segunda superfície de editor: a aba central.
  // Mesma forma dos holders do anexo; o EditorService é o MESMO (uma fonte de
  // verdade), o que muda é só o host React e o painel do Monaco.
  let centerRoot: Root | null = null;
  let centerContainer: HTMLElement | null = null;
  let centerSessionId: string | null = null;
  let sessionContext: string | null = null;
  let centerPaneApi: CodeEditorPaneApi | null = null;
  /** Monaco do centro — para soltar a posse do Outline no unmount (D152 §3). */
  let centerMonaco: import('monaco-editor').editor.IStandaloneCodeEditor | null = null;
  /** Atendentes de `attach.requestCloseTab`, por sessão. O CenterCodeEditor
   *  registra no mount e retira no unmount. */
  const centerCloseRequesters = new Map<string, CenterCloseRequester>();
  const editorCommands = createEditorCommandBridge({ deps, editor: editorService,
    session: () => sessionContext ?? centerSessionId,
    navigate: (sessionId, uri) => events.fire({ type: 'editor.navigationRequested', sessionId, uri }),
    close: (sessionId, uri, groupId) => centerCloseRequesters.get(sessionId)?.({ sessionId, uri, groupId }),
  });
  // 5.6 (A0.6) — Outline lê os símbolos do modelo ativo do Monaco do anexo; Timeline
  // fala com /git/log + /git/show(sha). Tudo aditivo: ExplorerView recebe `activeFile`.
  const outlineTracker = createMonacoOutlineTracker();
  const timelinePort = new BrowserTimelinePort();
  const onEditorReady: AttachAreaProps['onEditorReady'] = (ed, api) => { attachMonaco = ed; attachPaneApi = api; outlineTracker.attach(ed); };
  // Onda 2b (D146): o painel do centro registra a api (é ela que salva).
  // Onda 2c-ii (D152 §3): e TAMBÉM entra na fila do outlineTracker. A dívida
  // registrada na 2b ("quando a coluna morrer, o Outline tem de seguir o editor do
  // centro") é paga aqui, ANTES de a coluna morrer, e não depois: o tracker agora
  // aceita N candidatos e o Outline passa a descrever o editor que está em uso,
  // seja ele o da coluna (durante a sobreposição) ou o do centro (a partir daqui).
  const centerEditors = new Map<string, Parameters<NonNullable<CodeEditorPaneProps['onEditorReady']>>[0]>();
  const offOutlineFocus = editorService.onEvent(event => {
    if (event.type !== 'editor.focusGroupChanged') return;
    const candidate = centerEditors.get(editorService.focusedGroupId(event.sessionId));
    if (candidate) outlineTracker.attach(candidate);
  });
  const onCenterEditorReady: CodeEditorPaneProps['onEditorReady'] = (ed, api, groupId) => {
    if (groupId) {
      editorCommands.register(groupId, ed);
      centerEditors.set(groupId, ed);
      ed.onDidDispose?.(() => { if (centerEditors.get(groupId) === ed) centerEditors.delete(groupId); });
    }
    centerPaneApi = api;
    centerMonaco = ed;
    outlineTracker.attach(ed);
  };
  const centerProps = (sessionId: string): CenterCodeEditorProps => {
    // O unmount anterior é adiado. Sua limpeza só pode retirar o registro que
    // ele próprio criou, nunca o atendente de um corpo novo da mesma sessão.
    let registeredRequester: CenterCloseRequester | null = null;
    return {
    sessionId,
    editor: editorService,
    fs: deps.fs,
    renderMarkdown: deps.renderMarkdown,
    // D169: o breadcrumb precisa da raiz para mostrar caminho RELATIVO e do
    // tracker para os símbolos — o MESMO que serve o painel Outline. Nenhuma
    // coleta nova foi criada.
    workspaceRoot: deps.workspaceRoot,
    outline: {
      rows: () => outlineTracker.rows(),
      reveal: (line: number, column: number) => outlineTracker.reveal(line, column),
      cursorPosition: () => {
        try { return outlineTracker.cursorPosition(); } catch { return null; }
      },
      onChanged: (cb: () => void) => outlineTracker.onChanged(cb),
    },
    // D169: o painel secundário é montado pelo CenterCodeEditor lendo o grupo.
    // Passo as capacidades por aqui (e não pelo App) para manter o padrão do
    // módulo: o shell nunca toca no EditorService.
    splitCapabilities: {
      isSplit: () => editorService.isSplit(sessionId),
      unsplit: (force?: boolean) => editorService.unsplit({ sessionId, force }),
      // D169: o lado clicado vira o destino dos próximos arquivos abertos.
      setFocusSide: (side: 'principal' | 'secundario') => editorService.setFocusGroup({ sessionId, side }),
      focusSideOf: () => editorService.focusGroupOf(sessionId),
    },
    onEditorReady: onCenterEditorReady,
    onWorkbenchCommand: (id) => { void deps.menus.execute(id, { sessionId }).catch(error => events.fire({ type: 'error', code: 'command_failed', message: String(error) })); },
    onSave: attachSave,
    onReload: attachReload,
    onCloseRequester: (r) => {
      if (r) {
        registeredRequester = r;
        centerCloseRequesters.set(sessionId, r);
      } else if (centerCloseRequesters.get(sessionId) === registeredRequester) {
        centerCloseRequesters.delete(sessionId);
        registeredRequester = null;
      }
    },
    };
  };
  // FATIA 15 Onda 2c-ii (D151 §2): a superfície de abas do módulo pode ser a COLUNA
  // (2c-i, sobreposição) ou só o CENTRO (2c-ii, alvo). Enquanto as duas existirem,
  // `attachSessionId` vem primeiro para não mudar nada do que já funcionava; quando a
  // coluna for desligada, sobra a sessão do centro e o comportamento é o mesmo de antes.
  // Sem isto, desligar a coluna deixaria TODA abertura de arquivo pendente para sempre,
  // porque `openInAttachSession` nunca acharia sessão montada.
  const sessionIdDaSuperficie = (): string | null => sessionContext ?? attachSessionId ?? centerSessionId;
  /**
   * DEF-D169-5 — o aviso "o arquivo ativo é este" passou a ser um lugar só.
   *
   * Duas coisas mudam o arquivo ativo e só UMA delas emite evento:
   *   1. o EditorService (aba aberta/ativada/fechada) → evento, coberto abaixo;
   *   2. a MONTAGEM da superfície (é `mountCodeEditor` que registra
   *      `centerSessionId`) → não emite evento nenhum.
   * Enquanto o aviso morava em cada evento, o caso (2) caía no vazio: se o
   * arquivo fosse aberto antes do corpo montar, o evento saía com "sem arquivo
   * ativo" e a montagem depois não avisava ninguém. `anunciarAtivo` é chamado
   * pelos dois caminhos e compara com o que já foi ENTREGUE.
   */
  const ativoOuvintes = new Set<(uri: WorkspaceUri | null) => void>();
  let ativoEntregue: WorkspaceUri | null = null;
  const anunciarAtivo = (): void => {
    const agora = activeCodeUri();
    if (agora === ativoEntregue) return;
    ativoEntregue = agora;
    for (const cb of [...ativoOuvintes]) cb(agora);
  };
  const activeCodeUri = (): WorkspaceUri | null => {
    const sid = sessionIdDaSuperficie();
    if (!sid) return null;
    const t = editorService.getActive(sid);
    return t && t.kind === 'code' ? t.uri : null;
  };
  const activeFileApi: ExplorerActiveFileApi = {
    getActiveUri: activeCodeUri,
    onActiveChanged(cb) {
      // DEF-D169-5: o aviso do arquivo ativo é decidido AQUI e em um lugar só
      // (`anunciarAtivo`), porque ele depende de duas coisas que mudam em
      // momentos diferentes: o evento do serviço E a montagem da superfície.
      //
      // Antes, `last` era fotografado na inscrição. O ExplorerView se inscreve
      // antes de o corpo do centro montar; nessa janela `activeCodeUri()` é null
      // (não há sessão de superfície), o primeiro `editor.activeChanged` também
      // chegava com null e `null === null` engolia o aviso. Nenhum evento vinha
      // depois — a montagem do centro não emite evento —, então o consumidor
      // ficava com `activeUri` null para sempre: era o "No symbols found in
      // document" numa árvore de 2600 linhas.
      ativoOuvintes.add(cb);
      // Quem chega com arquivo já aberto recebe o estado atual UMA vez: senão
      // esperaria um evento que pode não vir.
      const agora = activeCodeUri();
      if (agora && agora !== ativoEntregue) { ativoEntregue = agora; cb(agora); }
      return () => { ativoOuvintes.delete(cb); };
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
  attachApi.setSessionContext = ({ sessionId }) => {
    sessionContext = sessionId;
    if (pendingAttachOpen) {
      const open = pendingAttachOpen;
      pendingAttachOpen = null;
      open(sessionId);
    }
  };
  const openInAttachSession = (fn: (sessionId: string) => void): void => {
    const navigate = (sessionId: string) => {
      fn(sessionId);
      const active = editorService.getActive(sessionId);
      if (active) events.fire({ type: 'editor.navigationRequested', sessionId, uri: active.uri });
    };
    const sid = sessionIdDaSuperficie();
    if (sid) navigate(sid);
    else pendingAttachOpen = navigate;
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
  // FATIA-15 Onda 3 (D166) — aba `Changes` do CORPO CENTRAL. Host próprio, separado
  // de `scmRoot` de propósito: `mountScm` aceita um host só (é o mount da view da
  // Side Bar, congelado) e devolveria cedo se o centro passasse por ele.
  let changesCenterRoot: Root | null = null;
  let changesCenterContainer: HTMLElement | null = null;
  const unmountChangesCenter = () => {
    const root = changesCenterRoot;
    changesCenterRoot = null;
    if (changesCenterContainer) {
      changesCenterContainer.remove();
      changesCenterContainer = null;
    }
    if (root) setTimeout(() => root.unmount(), 0); // ver comentário em unmountSearch
  };
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
      // Onda 2b (D146): resolve o painel que TEM a uri — pode ser o do anexo ou
      // o da aba central. Resolve DE NOVO dentro da promise: entre a leitura e a
      // decisão o painel pode ter desmontado, e agir num painel morto é pior do
      // que não agir.
      if (!painelQueTem(change.uri)) continue;
      // Lê o disco ANTES de decidir: se for o eco da nossa própria escrita
      // (conteúdo == último salvo) ou igual ao modelo, não é mudança externa.
      void deps.fs.readFile({ uri: change.uri }).then((read) => {
        const painel = painelQueTem(change.uri);
        if (!painel) return;
        if (read.content === lastSaved.get(change.uri)) return;
        if (read.content === (painel.getContent(change.uri) ?? null)) return;
        const states = editorService.notifyExternalChange(change.uri);
        if (states.length && states.every((s) => !s.dirty)) painel.reload(change.uri, read.content);
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
    mountEditorCommands: (root) => editorCommands.mount(root),
    explorer: service,

    get search() {
      return searchService;
    },
    get attach() {
      return attachApi;
    },
    // DEF-D169-5: o MESMO objeto que o ExplorerView recebe. Um só, não uma cópia
    // — duas instâncias divergiriam no primeiro aviso.
    get activeFile() {
      return activeFileApi;
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

    mountChanges(root: HTMLElement): void {
      if (changesCenterRoot && changesCenterContainer && changesCenterContainer.parentElement === root) return; // mesmo host
      unmountChangesCenter();
      const container = root.ownerDocument.createElement('div');
      container.style.display = 'contents';
      root.appendChild(container);
      changesCenterContainer = container;
      changesCenterRoot = createRoot(container);
      // Mesmo painel da view `scm` da Side Bar — um SÓ componente para os dois lugares.
      // O clique num recurso continua indo para `openInAttachSession`, que desde a
      // 2c-ii resolve a superfície (coluna ou centro) sem esta aba saber disso.
      changesCenterRoot.render(scmElement());
    },

    unmountChanges: unmountChangesCenter,

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

    mountCodeEditor(root: HTMLElement, opts: { sessionId: string }): void {
      // Espelho de mountAttach: mesmo host → só re-render (a sessão trocou);
      // host novo → remonta. Sem o equivalente a `pendingAttachOpen`: abrir
      // arquivo no centro é decisão do shell, que já sabe a uri — o módulo não
      // precisa guardar abertura pendente para esta superfície.
      if (centerRoot && centerContainer && centerContainer.parentElement === root) {
        if (centerSessionId !== opts.sessionId) {
          centerSessionId = opts.sessionId;
          centerRoot.render(createElement(CenterCodeEditor, centerProps(opts.sessionId)));
        }
        return;
      }
      unmountCodeEditor();
      const container = root.ownerDocument.createElement('div');
      container.style.display = 'contents';
      root.appendChild(container);
      centerContainer = container;
      centerSessionId = opts.sessionId;
      centerRoot = createRoot(container);
      centerRoot.render(createElement(CenterCodeEditor, centerProps(opts.sessionId)));
      // 2c-ii: com a coluna desligada o centro é a ÚNICA superfície — a abertura que
      // ficou pendente (feita antes de qualquer host montar, ex.: F5 ou boot) tem de
      // sair aqui, senão nunca sairia.
      if (pendingAttachOpen) { const fn = pendingAttachOpen; pendingAttachOpen = null; fn(opts.sessionId); }
      // DEF-D169-5: a montagem da superfície é o segundo caminho que muda "qual é
      // o arquivo ativo". Até aqui ninguém avisava o consumidor neste ponto.
      anunciarAtivo();
    },

    unmountCodeEditor,

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
      editorCommands.dispose();
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
      unmountChangesCenter();
      unmountAttach();
      unmountCodeEditor();
      offEditor();
      offLayoutMax(); offLayoutVis();
      offOutlineFocus(); centerEditors.clear();
      outlineTracker.dispose(); // 5.6
      disposeModelResources(editorService);
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
