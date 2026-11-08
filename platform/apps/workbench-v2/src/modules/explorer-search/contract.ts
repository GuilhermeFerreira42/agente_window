// ============================================================================
// modules/explorer-search/contract.ts — FRONTIER ÚNICA (LEGO, anti app px gigante)
// Exporta APENAS tipos públicos. Nenhum detalhe interno vaza por aqui.
//
// CONGELADO 2026-09-20 — fonte normativa: 04_10_CONTRATOS_TECNICOS_ATUALIZADOS.md §1
// (REV-LEGO). Conteúdo de tipos byte-a-byte compatível com o documento; a
// assinatura da fábrica do documento é materializada como função real em
// ./index.ts (função sem corpo não compila em arquivo de implementação).
// ============================================================================

/** Re-export do tipo canônico (docs/04). Nunca usar `any` em porta de serviço. */
export type WorkspaceUri = `file://${string}`;

// ---------------------------------------------------------------------------
// Eventos do módulo (produtor único = o módulo; consumidores: App.tsx, Editor)
// ---------------------------------------------------------------------------
export type ExplorerSearchEvent =
  | { type: 'explorer.rootChanged'; uri: WorkspaceUri }
  | { type: 'explorer.nodeExpanded'; uri: WorkspaceUri }
  | { type: 'explorer.nodeCollapsed'; uri: WorkspaceUri }
  | { type: 'explorer.allCollapsed' }
  | { type: 'explorer.refreshed'; uri: WorkspaceUri }
  | { type: 'explorer.selectionChanged'; uris: WorkspaceUri[] }
  | { type: 'explorer.fileOpened'; uri: WorkspaceUri }          // → EditorService.attach.open
  | { type: 'explorer.revealRequested'; uri: WorkspaceUri }
  | { type: 'fs.changed'; changes: Array<{ uri: WorkspaceUri; kind: 'added' | 'removed' | 'changed' }> }
  | { type: 'fs.uploadProgress'; filesTotal: number; filesDone: number; bytesDone: number; bytesTotal: number; currentName: string }
  | { type: 'fs.uploadFinished'; filesCreated: number; skipped: string[] }
  | { type: 'fs.downloadStarted'; uri: WorkspaceUri }
  | { type: 'search.started'; id: string }
  | { type: 'search.progress'; id: string; filesScanned: number; matches: number }
  | { type: 'search.finished'; id: string; matches: SearchMatch[]; fileCount: number; truncated: boolean }
  | { type: 'search.cancelled'; id: string }
  | { type: 'search.replaceApplied'; files: number; replacements: number }
  // 4.7 c2 (evolução ADITIVA): Editor Anexo — modelo de abas por sessão.
  | { type: 'editor.tabOpened'; sessionId: string; uri: WorkspaceUri; kind: 'code' | 'search' | 'changes' | 'diff'; preview: boolean }
  | { type: 'editor.diffChanged'; sessionId: string; uri: WorkspaceUri }  // 4.7-c (aditivo): payload da aba fixa Diff trocou
  | { type: 'editor.tabClosed'; sessionId: string; uri: WorkspaceUri }
  | { type: 'editor.tabPinned'; sessionId: string; uri: WorkspaceUri }
  | { type: 'editor.activeChanged'; sessionId: string; uri: WorkspaceUri | null }
  /** Intenção explícita de navegação (Search/SCM); restauração não rouba foco. */
  | { type: 'editor.navigationRequested'; sessionId: string; uri: WorkspaceUri }
  /** FATIA 15 Onda 3 (D169): abriu/fechou a divisão (grupo secundário). O `sessionId`
   *  aqui é o do grupo PRINCIPAL, sempre — o painel secundário escuta este evento
   *  para saber que deve aparecer/sumir. */
  | { type: 'editor.splitChanged'; sessionId: string; split: boolean }
  /** D169: a aba mudou de lado (`to` é o destino). A origem já emitiu `tabClosed`. */
  | { type: 'editor.tabMoved'; sessionId: string; uri: WorkspaceUri; to: 'principal' | 'secundario' }
  /** D169: qual lado tem o foco (decide onde um arquivo aberto aterrissa). */
  | { type: 'editor.focusGroupChanged'; sessionId: string; side: 'principal' | 'secundario' }
  /** D169 (aditivo): a URI saiu do grupo 1 porque foi fechada. O shell usa para
   *  tirar a aba projetada; os painéis já recebem `editor.tabClosed`. */
  | { type: 'editor.dirtyChanged'; sessionId: string; uri: WorkspaceUri; dirty: boolean }
  | { type: 'editor.revealRequested'; sessionId: string; uri: WorkspaceUri; line: number; column?: number }
  | { type: 'editor.attachExpanded'; sessionId: string }   // 1.ª aba aberta → layout mostra o anexo
  | { type: 'editor.attachCollapsed'; sessionId: string }  // última aba fechada → layout esconde (display:none, nunca desmonta)
  // 4.7 c5 (aditivo): ciclo de save / conflito externo
  | { type: 'editor.saved'; sessionId: string; uri: WorkspaceUri }
  | { type: 'editor.attachMaximized'; sessionId: string }  // c6: ⤢ — anexo no máximo do clamp DENTRO da sessão (sem position:fixed)
  // 4.7-b c1 (aditivo, exceção registrada em docs/12): estado Git do repo do workspace mudou.
  | { type: 'git.statusChanged'; isRepo: boolean; branch: string | null; count: number }
  | { type: 'editor.attachRestored'; sessionId: string }   // c6: ⤢ de novo / Esc — volta à largura anterior
  | { type: 'editor.externalChange'; sessionId: string; uri: WorkspaceUri; dirty: boolean }  // fs.changed numa URI aberta e SUJA (limpa recarrega sozinha)
  | { type: 'error'; code: string; message: string };

// ---------------------------------------------------------------------------
// Search (membro do módulo: Explorer + Search = 1 módulo lateral, docs/12 LEGO)
// ---------------------------------------------------------------------------
export interface SearchQuery {
  pattern: string;
  isCaseSensitive?: boolean;
  isWholeWord?: boolean;
  isRegExp?: boolean;
  include?: string;      // glob, ex.: "src/**"
  exclude?: string;      // glob; default: node_modules, .git, dist, build, out, .next
}
export interface SearchMatch { uri: WorkspaceUri; line: number; column: number; preview: string; }
export interface SearchReplaceSummary { files: number; replacements: number; }
/** Handle retornado por query() — cancelável (última busca vence). */
export interface SearchHandle { readonly id: string; cancel(): void; }

export interface ISearchApi {
  /** Busca no escopo da raiz do módulo. Debounce/cancel de responsabilidade do módulo (250 ms). */
  query(input: {
    root: WorkspaceUri;
    query: SearchQuery;
    onResult?: (r: { matches: SearchMatch[]; fileCount: number; truncated: boolean }) => void;
  }): SearchHandle;
  replaceAll(input: { root: WorkspaceUri; query: SearchQuery; replacement: string }): Promise<SearchReplaceSummary>;
}

// ---------------------------------------------------------------------------
// Explorer
// ---------------------------------------------------------------------------
export type SortOrder = 'default' | 'name' | 'type' | 'modified';

export interface IExplorerSearchApi {
  /** Abre a raiz do workspace no módulo (equivalente VS Code: "Open Folder"). */
  openFolder(input: { uri: WorkspaceUri }): Promise<void>;
  /** Abre um arquivo → emite `explorer.fileOpened` (EditorService.attach é quem consome). */
  open(input: { uri: WorkspaceUri }): Promise<void>;
  /** Expande ancestrais + foca o item (auto-reveal quando aberto por outro caminho). */
  reveal(input: { uri: WorkspaceUri }): Promise<void>;
  refresh(input?: { uri?: WorkspaceUri }): Promise<void>;      // mantém expansão + seleção
  expand(input: { uri: WorkspaceUri }): Promise<void>;
  collapse(input: { uri: WorkspaceUri }): Promise<void>;
  collapseAll(): void;
  createFile(input: { uri: WorkspaceUri }): Promise<void>;     // em arquivo: cria no pai (Q3)
  createFolder(input: { uri: WorkspaceUri }): Promise<void>;
  rename(input: { uri: WorkspaceUri; newName: string }): Promise<void>;
  remove(input: { uris: WorkspaceUri[]; useTrash?: boolean }): Promise<void>;
  cut(input: { uris: WorkspaceUri[] }): void;
  copy(input: { uris: WorkspaceUri[] }): void;
  paste(input: { target: WorkspaceUri }): Promise<void>;
  download(input: { uris: WorkspaceUri[] }): Promise<void>;
  /** Upload do SO (arquivos E pastas, recursivo) — progressão por eventos `fs.upload*`. */
  upload(input: { target: WorkspaceUri; entries: unknown[]; conflict: 'ask' | 'overwrite' | 'skip' }): Promise<void>;
  setSortOrder(input: { order: SortOrder }): void;
  select(input: { uris: WorkspaceUri[] }): void;
  getSelection(): WorkspaceUri[];
  getClipboardState(): { kind: 'cut' | 'copy' | null; uris: WorkspaceUri[] };
}

// ---------------------------------------------------------------------------
// Editor em anexo lateral (superfície do módulo — espelho do docs/04 §7 attach)
// ---------------------------------------------------------------------------
/** 4.7-c (aditivo): conteúdo de um diff read-only (lados já resolvidos pelo chamador). */
export interface AttachDiffPayload {
  /** Arquivo real a que o diff se refere (ícone/linguagem/título). */
  resource: WorkspaceUri;
  /** Título da aba, ex. "a.ts (Working Tree)" / "a.ts (Index)". */
  title: string;
  original: string;
  modified: string;
}
export interface AttachTab {
  uri: WorkspaceUri; kind: 'code' | 'search' | 'changes' | 'diff'; dirty: boolean;
  /** 4.7-c (aditivo): presente só em `kind: 'diff'`. */
  diff?: AttachDiffPayload;
  /** 4.7 c2 (aditivo, opcionais): preview = clique simples (itálico); active = aba corrente do grupo. */
  preview?: boolean; active?: boolean;
}
export interface IEditorAttachApi {
  /** Contexto de navegação antes de existir corpo Monaco (Search/SCM → primeira aba). */
  setSessionContext?(input: { sessionId: string }): void;
  /** Abre (ou foca) um recurso no anexo. `line` para reveal (search → resultado). */
  /** 4.7-b c2 (aditivo): `kind: 'changes'` = aba fixa da Source Control View (uri sintética). */
  /** 4.7-c (aditivo): `kind: 'diff'` = aba fixa Diff (uri sintética) com `diff` obrigatório. */
  open(input: { uri: WorkspaceUri; kind: 'code' | 'search' | 'changes' | 'diff'; line?: number; column?: number; sessionId: string;
    /** 4.7 c2 (aditivo, opcional): true = pinado (duplo clique); ausente = preview (clique simples). */
    pinned?: boolean;
    diff?: AttachDiffPayload }): Promise<void>;
  close(input: { uri: WorkspaceUri; sessionId: string }): Promise<void>;
  closeAll(input: { sessionId: string }): Promise<void>;   // recolhe o anexo (sem desmontar)
  setVisible(input: { sessionId: string; visible: boolean }): void; // NUNCA desmonta (Regra 10 docs/18)
  setWidth(input: { sessionId: string; pixels: number }): void;     // clamp 280–1200 px / 25–75%
  save(input: { uri: WorkspaceUri }): Promise<void>;                // writeFile(atomic:true)
  getTabs(input: { sessionId: string }): AttachTab[];
  /** 4.7 c6 (aditivo): maximizar/restaurar dentro da sessão; estado persistido. */
  setMaximized?(input: { sessionId: string; maximized: boolean }): void;
  isMaximized?(input: { sessionId: string }): boolean;
  /** FATIA-15 Onda 2b (ADITIVO, D146 §2): pede ao editor CENTRAL desta sessão que
   *  feche a aba — e é o módulo, não o shell, quem abre o diálogo Salvar/Não
   *  Salvar/Cancelar e executa, porque só o módulo alcança o EditorService e o
   *  writeFile atômico (Regra 2). Sem corpo central montado o pedido não faz
   *  nada: o chamador trata isso como falha VISÍVEL, nunca como descarte
   *  silencioso. */
  requestCloseTab?(input: { sessionId: string; uri: WorkspaceUri }): void;
  /** FATIA-15 Onda 2c-i (ADITIVO, D148 §3): a faixa de abas do centro é do shell,
   *  então clicar numa aba projetada tem de dizer ao módulo que aquela uri é a
   *  ativa — é o EditorService dele que decide o que o CodeEditorPane mostra.
   *  Mapeia direto para EditorService.activate, que já existe e já é seguro:
   *  ignora uri que não está no grupo da sessão.
   *  *Rejeitado (D148 §3):* reaproveitar `open` para ativar — na superfície
   *  `diff` o open exige o payload AttachDiffPayload, que o App não tem. */
  activateTab?(input: { sessionId: string; uri: WorkspaceUri }): void;
  /**
   * FATIA 15 Onda 3 (ADITIVO, D169) — SPLIT do editor central.
   *
   * OPCIONAIS de propósito: um módulo anterior continua satisfazendo o contrato e
   * o shell que não os encontrar deve esconder a ação, não fingir que dividiu
   * (foi exatamente o defeito que isto corrige: o botão "Dividir editor" abria
   * uma aba falsa `workspace/split`).
   *
   * Quem decide SE pode dividir é o shell — o gate E15/R-039 (`canSplitMainEditor`)
   * vive lá. Aqui só há o mecanismo. `split` devolve o id do grupo secundário
   * (null se já havia divisão) e NUNCA herda a aba ativa: a mesma URI em dois
   * grupos disputaria o mesmo modelo do Monaco.
   */
  split?(input: { sessionId: string }): string | null;
  /** Fecha a divisão inteira. `false` = bloqueado por aba dirty (sem `force`). */
  unsplit?(input: { sessionId: string; force?: boolean }): boolean;
  /** Existe divisão aberta nesta sessão? */
  isSplit?(input: { sessionId: string }): boolean;
  /** Move uma aba para o outro lado (nunca duplica). */
  moveTab?(input: { sessionId: string; uri: WorkspaceUri; to: 'principal' | 'secundario' }): boolean;
  /** Em qual lado a URI está ('principal' | 'secundario'), ou null. */
  sideOf?(input: { sessionId: string; uri: WorkspaceUri }): 'principal' | 'secundario' | null;
  /** D169: marca o lado com foco (o painel chama ao ser clicado). */
  setFocusSide?(input: { sessionId: string; side: 'principal' | 'secundario' }): void;
  /** D169: lado com foco hoje (default 'principal'). */
  focusSideOf?(input: { sessionId: string }): 'principal' | 'secundario';
}

// ---------------------------------------------------------------------------
// Módulo (objeto único que o App.tsx recebe)
// ---------------------------------------------------------------------------
export interface FileSystemPortLike {
  list(input: { uri: WorkspaceUri }): Promise<Array<{ uri: WorkspaceUri; name: string; kind: 'file' | 'directory' }>>;
  readFile(input: { uri: WorkspaceUri }): Promise<{ content: string; encoding: 'utf-8' }>;
  readFileBinary(input: { uri: WorkspaceUri; maxBytes?: number }): Promise<{ dataBase64: string; mime: string }>;
  writeFile(input: { uri: WorkspaceUri; content: string; atomic: true }): Promise<void>;
  stat(input: { uri: WorkspaceUri }): Promise<{ uri: WorkspaceUri; size: number; mtimeMs: number; readonly: boolean; kind: 'file' | 'directory' }>;
  createFile(input: { uri: WorkspaceUri; content?: string }): Promise<void>;
  createFolder(input: { uri: WorkspaceUri }): Promise<void>;
  copy(input: { from: WorkspaceUri; to: WorkspaceUri }): Promise<void>;
  move(input: { from: WorkspaceUri; to: WorkspaceUri }): Promise<void>;
  remove(input: { uri: WorkspaceUri; recursive?: boolean }): Promise<void>;
  watch(input: { uri: WorkspaceUri }): Promise<{ watcherId: string }>;
  onEvent(cb: (e: { type: 'fs.changed'; changes: Array<{ uri: WorkspaceUri; kind: 'added' | 'removed' | 'changed' }> }) => void): () => void;
}

export interface CommandRegistryLike {
  register(command: { id: string; title: string; run: (ctx?: unknown) => Promise<void> | void }): () => void;
  execute(commandId: string, ctx?: unknown): Promise<void>;
  setContext(key: string, value: boolean | string | number): void;
  getContext(key: string): boolean | string | number | undefined;
}

export interface IExplorerSearchModuleDeps {
  fs: FileSystemPortLike;        // adapter 04_10 §2.1 (IFileService → FileSystemPort)
  menus: CommandRegistryLike;    // adapter 04_10 §2.4 (MenuRegistry → CommandRegistry)
  contextMenu: {
    /** Abre o menu contextual (posicionado pelo módulo). O módulo NÃO desenha o menu. */
    open(input: { x: number; y: number; items: Array<{
      id: string; label: string; enabled: boolean; group?: string; order: number; danger?: boolean;
      /** 4.5 (evolução ADITIVA autorizada 2026-09-25): rótulo do atalho exibido à direita (04_17 §3.8). OPCIONAL — ausente = nada é desenhado. */
      keybinding?: string;
      /** 4.5 (aditivo): item com estado marcado (toggles do ViewTitleContext — check na coluna de 26 px). OPCIONAL. */
      checked?: boolean;
    }> }): void;
  };
  workspaceRoot: WorkspaceUri;   // raiz única (Q4: single-root nesta fase)
  /** FATIA-05 5.3 (aditivo): o shell decide onde a Source Control View vive (view `scm`
   *  da Side Bar). "Open Source Control" (header do Explorer) chama isto em vez de abrir
   *  uma aba no anexo. OPCIONAL — ausente = a ação não é exibida. */
  openSourceControl?: () => void;
}

import type { ExplorerActiveFileApi } from './ui/activeFileApi';

export interface IExplorerSearchModule {
  readonly explorer: IExplorerSearchApi;
  readonly search: ISearchApi;
  readonly attach: IEditorAttachApi;      // editor em anexo lateral (4.6/4.7)
  /** DEF-D169-5 (ADITIVO): o arquivo ativo do editor para o consumidor de fora.
   *  Existia só como prop interna do ExplorerView (`activeFile`), e por isso o
   *  defeito do Outline só era observável pela tela. Exposto aqui, o aviso de
   *  "arquivo ativo mudou" passa a ser testável SEM navegador — que é o que
   *  impede o defeito de voltar sem ninguém ver. */
  readonly activeFile?: ExplorerActiveFileApi;
  /** Renderiza a sidebar (header + árvore + seções) dentro do slot dado. Só DOM dentro de `root`. */
  mount(root: HTMLElement): void;
  unmount(): void;               // remove DOM; estado do serviço sobrevive (quebra isolada)
  /** 4.6 c3 (evolução ADITIVA, opção A aprovada 2026-09-25): renderiza o Search
   *  Panel (widget + resultados) dentro do slot dado — o shell o coloca no lugar
   *  do SearchView mock da aba `search`. Só DOM dentro de `root`. */
  mountSearch(root: HTMLElement, opts?: { focusRequest?: number }): void;
  unmountSearch(): void;
  /** 4.7 c1 (evolução ADITIVA, opção A aprovada 2026-09-26): renderiza o
   *  Editor Anexo dentro do `attachSlot` da barra auxiliar (à esquerda da
   *  árvore). `attach.setVisible` só alterna display:none — nunca desmonta. */
  mountAttach(root: HTMLElement, opts: { sessionId: string }): void;
  unmountAttach(): void;
  /** FATIA-15 Onda 2b (ADITIVO, D146 §2): renderiza o CORPO da aba central capaz
   *  de salvar — o mesmo CodeEditorPane do anexo, sem cabeçalho, sem faixa de
   *  abas, sem sash e sem empty state (no centro isso é do shell). Compartilha o
   *  MESMO EditorService do anexo: uma fonte de verdade só, o que torna a
   *  sobreposição das duas superfícies temporária e revertível.
   *  OPCIONAL de propósito: um módulo anterior continua satisfazendo o contrato,
   *  e o shell que não o encontrar deve falhar VISÍVEL (Onda 2c), não voltar em
   *  silêncio ao editor que não salva. */
  mountCodeEditor?(root: HTMLElement, opts: { sessionId: string }): void;
  unmountCodeEditor?(): void;
  /** FATIA-05 5.3 (evolução ADITIVA, decisão A 2026-09-30): renderiza a Source Control
   *  View (ChangesPane real da 4.7-b) dentro do slot dado — o shell a coloca na view
   *  `scm` da Side Bar. Clique num recurso abre o diff no anexo. Só DOM dentro de `root`. */
  mountScm(root: HTMLElement): void;
  unmountScm(): void;
  /** FATIA-15 Onda 3 (ADITIVO, D166): o MESMO ChangesPane real, com host próprio,
   *  para a aba `Changes` do corpo central.
   *
   *  Por que não reusar `mountScm`: ele guarda UM host e devolve cedo quando o host
   *  é o mesmo — pôr o centro ali roubaria o host da Side Bar (ou o contrário) e o
   *  painel piscaria entre os dois. Só o mount de uma view é congelado; este é
   *  novo, então nasce separado.
   *  Só DOM dentro de `root`; o shell decide onde a aba aparece. */
  mountChanges?(root: HTMLElement): void;
  unmountChanges?(): void;
  onEvent(cb: (e: ExplorerSearchEvent) => void): () => void;
  dispose(): void;               // libera watchers, comandos registrados, listeners
}

/** Assinatura da fábrica única (04_10 §1: "o App.tsx nunca instancia serviços
 *  internos"). Implementação real exportada pelo barrel ./index.ts — wiring do
 *  core entra na sub-fatia 4.2 (04_15 §3). */
export type ExplorerSearchModuleFactory = (deps: IExplorerSearchModuleDeps) => IExplorerSearchModule;
