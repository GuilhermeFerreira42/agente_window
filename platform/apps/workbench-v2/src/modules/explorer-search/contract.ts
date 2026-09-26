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
export interface AttachTab { uri: WorkspaceUri; kind: 'code' | 'search'; dirty: boolean; }
export interface IEditorAttachApi {
  /** Abre (ou foca) um recurso no anexo. `line` para reveal (search → resultado). */
  open(input: { uri: WorkspaceUri; kind: 'code' | 'search'; line?: number; column?: number; sessionId: string }): Promise<void>;
  close(input: { uri: WorkspaceUri; sessionId: string }): Promise<void>;
  closeAll(input: { sessionId: string }): Promise<void>;   // recolhe o anexo (sem desmontar)
  setVisible(input: { sessionId: string; visible: boolean }): void; // NUNCA desmonta (Regra 10 docs/18)
  setWidth(input: { sessionId: string; pixels: number }): void;     // clamp 280–1200 px / 25–75%
  save(input: { uri: WorkspaceUri }): Promise<void>;                // writeFile(atomic:true)
  getTabs(input: { sessionId: string }): AttachTab[];
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
}

export interface IExplorerSearchModule {
  readonly explorer: IExplorerSearchApi;
  readonly search: ISearchApi;
  readonly attach: IEditorAttachApi;      // editor em anexo lateral (4.6/4.7)
  /** Renderiza a sidebar (header + árvore + seções) dentro do slot dado. Só DOM dentro de `root`. */
  mount(root: HTMLElement): void;
  unmount(): void;               // remove DOM; estado do serviço sobrevive (quebra isolada)
  /** 4.6 c3 (evolução ADITIVA, opção A aprovada 2026-09-25): renderiza o Search
   *  Panel (widget + resultados) dentro do slot dado — o shell o coloca no lugar
   *  do SearchView mock da aba `search`. Só DOM dentro de `root`. */
  mountSearch(root: HTMLElement, opts?: { focusRequest?: number }): void;
  unmountSearch(): void;
  onEvent(cb: (e: ExplorerSearchEvent) => void): () => void;
  dispose(): void;               // libera watchers, comandos registrados, listeners
}

/** Assinatura da fábrica única (04_10 §1: "o App.tsx nunca instancia serviços
 *  internos"). Implementação real exportada pelo barrel ./index.ts — wiring do
 *  core entra na sub-fatia 4.2 (04_15 §3). */
export type ExplorerSearchModuleFactory = (deps: IExplorerSearchModuleDeps) => IExplorerSearchModule;
