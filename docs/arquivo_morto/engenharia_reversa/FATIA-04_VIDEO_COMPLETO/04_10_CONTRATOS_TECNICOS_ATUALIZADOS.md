# 04_10 — CONTRATOS TÉCNICOS DA FATIA-04 — FINAL (CONGELADO)

> **Natureza:** documento normativo de contratos — **CONGELADO em 2026-09-20 (REV-LEGO)**.
> **Regra do `docs/04`:** "Um contrato novo precisa nascer com tipo, dono e consumidor definidos" e "mudança de contrato exige revisão documental antes de implementação".
> **Checkouts confirmados nesta revisão (2026-09-20):**
> - `code-server` — commit **`8a7bf87a4d66914e328d97815e2faa9f25097866`** ("Fix --idle-timeout-seconds validation being skipped (#8009)") em `/home/user/.cache/code-server`;
> - `microsoft/vscode` (submódulo `lib/vscode`) — commit **`7debcd0e2acdea1c52de81bf9ee1620444407dda`** ("[cherry-pick] Enable automations by default (#336195)").
> **Estado real do projeto (verificado 2026-09-20):** a base ativa é `platform/apps/workbench-v2/` (Casa Nova, porta 5174, Single Port: Vite + WS PTY `/pty` via `vite-plugin-pty.ts`/`singlePort.ts`) + `platform/services/pty-server/`. **`platform/packages/` NÃO existe no checkout atual** — o "estado atual verificado" da revisão anterior (contratos em `platform/packages/contracts/`) descreve a topologia histórica `platform/apps/workbench/` e **não vale mais**. Pela decisão LEGO (`docs/12` 2026-09-20), os contratos são materializados **dentro do módulo** (`src/modules/explorer-search/contract.ts`); a fonte normativa textual continua sendo `docs/04` + este documento.

---

## 0. Decisões congeladas nesta revisão (2026-09-20)

| ID | Decisão | Motivo |
|---|---|---|
| **Q7** | Backend Node do `FileSystemPort` (I/O + watcher + engine de busca) vive em **`platform/apps/workbench-v2/server/fs/`**, exposto no Single Port por um **novo plugin `vite-plugin-fs.ts`** (dev) e pelo mesmo handler em `server.mjs` (preview). **Nenhum arquivo blindado do `docs/18` é modificado**; `vite.config.ts` e `server.mjs` recebem apenas **montagem aditiva** do novo plugin/handler. | O PTY bridge é blindado (🔴). Criar processo/serviço separado violaria o LEGO (zero processo extra, zero rede fora do Single Port). O padrão espelha `vite-plugin-pty.ts`/`singlePort.ts` sem editá-los. |
| **Q8** | Ordem das sub-fatias: **congelar contratos (4.1) → ExplorerNode/core (4.2) → adapter FS (4.3) → árvore + DnD (4.4) → menu (4.5) → Search (4.6) → editor anexo (4.7) → integração + validação de isolamento (4.9)**. Search **antes** do editor anexo; DnD unido à árvore; **4.8 (Browser) = FUTURO**, fora do ciclo atual (decisão do usuário, mantida de 2026-09-18). | Decisão do usuário em 2026-09-20 ("Aprovado a raspagem… ordem que você já propôs está boa"). |
| **Q9** | **Imutabilidade de UX:** o transplante substitui apenas a implementação interna. Todo layout/comportamento visível permanece **idêntico ao documentado em `04_00`–`04_09`** (vídeo de 8m35s): header com 5 botões, árvore lazy de 22 px, 3 seções, menu de contexto com Download/Upload, anexo lateral com sash 6 px e recolhimento sem desmontar, search local à sessão com debounce, fidelidade 100% por tokens `--vscode-*`. | Transplante LEGO não pode mudar UX. Qualquer divergência = bug, não feature. |

---

## 1. Contrato público do módulo — `contract.ts` (interface pública apenas)

**Local:** `platform/apps/workbench-v2/src/modules/explorer-search/contract.ts`
**Regra:** este arquivo é a **única fronteira**. O `index.ts` do módulo re-exporta apenas `contract.ts` + a fábrica. `App.tsx` só pode importar `./modules/explorer-search/index.js` (§2.5).

```ts
// ============================================================================
// modules/explorer-search/contract.ts — FRONTIER ÚNICA (LEGO, anti app.px gigante)
// Exporta APENAS tipos públicos. Nenhum detalhe interno vaza por aqui.
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
  fs: FileSystemPortLike;        // adapter §2.1 (IFileService → FileSystemPort)
  menus: CommandRegistryLike;    // adapter §2.4 (MenuRegistry → CommandRegistry)
  contextMenu: {
    /** Abre o menu contextual (posicionado pelo módulo). O módulo NÃO desenha o menu. */
    open(input: { x: number; y: number; items: Array<{ id: string; label: string; enabled: boolean; group?: string; order: number; danger?: boolean }> }): void;
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
  onEvent(cb: (e: ExplorerSearchEvent) => void): () => void;
  dispose(): void;               // libera watchers, comandos registrados, listeners
}

/** Fábrica única — o App.tsx nunca instancia serviços internos. */
export function createExplorerSearchModule(deps: IExplorerSearchModuleDeps): IExplorerSearchModule;
```

**Regras do contrato:**
1. `App.tsx` (e qualquer coisa fora do módulo) importa **apenas** `index.js` do módulo.
2. O módulo **não importa** nada de fora além de: `contract.ts`, deps injetados, tokens CSS (`--vscode-*`) e primitivas React. Nada de `components/`, `domain/` ou `hooks/` do shell.
3. Todo I/O passa por `deps.fs`; todo comando/menu por `deps.menus`; todo menu visual por `deps.contextMenu`.
4. Estado autoritativo de arquivos vive em `deps.fs` (backend). O módulo mantém apenas estado de **UI/navegação** (expansão, seleção, clipboard interno) — proibido duplicar metadados de disco (`10F`).
5. `unmount()`/recolher **nunca** desmonta sessões de terminal nem estado PTY (quebra isolada, `docs/18` §1).
6. Proibido `any` em qualquer assinatura acima; proibido evento com 2 produtores.

---

## 2. Adapters detalhados (upstream → AGENTE WINDOW)

### 2.1 FileServiceAdapter — `IFileService` (VS Code) → `FileSystemPort` (nosso)

**Upstream de referência (confirmado, `7debcd0e`):**

| Upstream | Arquivo:linha | Papel |
|---|---|---|
| `IFileService` | `platform/files/common/files.ts:28` | contrato que o nosso `FileSystemPort` espelha semanticamente |
| `onDidFilesChange` | idem `:95` | evento de disco → nosso `fs.changed` |
| `stat` / `readFile` / `writeFile` | idem `:134 / :152 / :165` | operações básicas |
| `move` / `copy` / `createFile` / `createFolder` | idem `:174 / :188 / :211 / :225` | operações de arquivo |
| `canDelete` / `watch` | idem `:240 / :264` | verificação pré-delete + watcher |
| `FileType` / `FileChangeType` / `FileChangesEvent` | idem `:449 / :977 / :1007` | enums/eventos |
| `FileService` (orquestração) | `platform/files/common/fileService.ts:26` | fila de operações + etag |
| `FileService.writeFile` (semântica atômica/etag) | idem `:383` (evento `FileOperation` em `:183`, "modified since" em `:536`) | base da nossa escrita atômica |
| `DiskFileSystemProviderClient` | `platform/files/common/diskFileSystemProviderClient.ts:26` | FS real: `stat :79`, `readdir :87`, `readFile :95`, `writeFile :160`, `delete :196`, `rename :200`, `copy :204`, `watch :250` |

**Mapeamento (contrato → implementação):**

| `FileSystemPort` (nosso) | Implementação em `server/fs/fsHost.ts` (Node) | Semântica herdada |
|---|---|---|
| `list` | `readdir` com `withFileTypes` (ref. `:87`) | ordenação no `ExplorerNode` (4.2), não no host |
| `readFile` / `readFileBinary` | `fs.readFile` (ref. `:95`); binário com `maxBytes` + mime | UTF-8 por padrão |
| `writeFile(atomic:true)` | **temp + rename** na mesma pasta (ref. `FileService.writeFile :383`); fila serial **por uri** (uma operação por recurso de cada vez, espelhando a barreira de `FileOperation` `:183`); etag = mtime anterior (rejeita "modified since", ref. `:536`) | **zero escrita parcial em falha** (RNF-VAL-04) |
| `stat` / `createFile` / `createFolder` | `fs.stat` / `createFile(,{flag:'wx'})` / `mkdir({recursive})` (ref. `:79/:211/:225`) | conflito → erro tipado `file_exists` |
| `copy` / `move` / `remove` | `fs.cp` / `fs.rename` / `rm({recursive,force})` (ref. `:204/:200/:196`) | `move` = rename; fallback copy+delete entre mounts |
| `watch` | → §2.2 | |
| `onEvent` (`fs.changed`) | → §2.2 | |

**Regras (congeladas):**
- **Path traversal bloqueado:** todo URI é resolvido contra `workspaceRoot`; `..`/resolve fora da raiz → erro `forbidden_path`.
- Escrita **sempre** atômica (`atomic: true` é obrigatório no tipo).
- Sem API paralela: nada de `fs` direto em componente React (04_15 §0.6).
- Endpoints HTTP do Single Port (plugin `vite-plugin-fs.ts`, Q7): **`GET /fs/root`** (descoberta da raiz no boot do cliente — Q9: raiz vem da config do plugin/server, nunca picker; resposta é SEMPRE `WorkspaceUri` `file://...`, nunca PATH cru — bug 4.4), `GET /fs/list`, `GET /fs/read`, `GET /fs/download` (stream), `POST /fs/write`, `POST /fs/stat`, `POST /fs/createFile`, `POST /fs/mkdir`, `POST /fs/delete`, `POST /fs/copy`, `POST /fs/rename`, `POST /fs/upload` (chunked), `WS /fs/watch`. Nota 4.4: `createFile`/`mkdir`/`write`/`delete`/`copy`/`rename` respondem **201/204 sem corpo** — clientes devem tolerar corpo vazio (ler texto antes de parsear). Backend em `server/fs/index.ts` (handlers reusáveis por `vite-plugin-fs.ts` **e** `server.mjs`).

### 2.2 FileWatcherAdapter — watcher (VS Code) → evento `fs.changed` (nosso)

**Upstream de referência (confirmado, `7debcd0e`):**

| Upstream | Arquivo:linha | Papel |
|---|---|---|
| `FileWatcherService.watch(requests)` | `platform/files/common/watcher.ts:274` | API de watch (recursivo/não-recursivo) |
| Tipos de request (`IRecursiveWatchRequest` etc.) | idem `:55–:89` | formato do request |
| `IUniversalWatcher` | idem `:178` | contrato do watcher |
| `EventCoalescer` | idem `:378` | coalescer de eventos (base do nosso debounce) |
| `NodeJSFSWatcher` (`fs.watch` real) | `platform/files/node/watcher/nodejs/nodejsWatcher.ts:108` (`startWatching`), `:126` (`stopWatching`) | watcher nativo |
| `FileChangeType` | `platform/files/common/files.ts:977` | `CHANGED/ADDED/DELETED` → nosso `changed/added/removed` |
| `FileChangesEvent` | idem `:1007` | forma do evento |

**Implementação (nosso):**
- `server/fs/watcher.ts`: watcher **recursivo** (no Linux, `fs.watch` recursivo quando disponível; senão, walk + registro por diretório expandido) **somente sobre a raiz aberta** + diretórios expandidos (evento `explorer.nodeExpanded` ajusta o conjunto — economia de FDs, mesmo critério do VS Code de "watch only expanded").
- **Coalescência:** janela de 300 ms por uri (espelho do `EventCoalescer`), normalização `CHANGED→changed` etc.
- Transporte: `WS /fs/watch` → adapter browser (dentro do módulo, `core/watchClient.ts`) → `onEvent` → evento público `fs.changed` do `contract.ts` → árvore atualiza **sem reload manual** (VAL-EXP-03).
- Regra: watcher não escreve nada; o **único** produtor de `fs.changed` é este adapter (produtor único, `docs/04` integridade 3).

### 2.3 SearchAdapter — `ISearchService` (VS Code) → `SearchService` (nosso, dentro do módulo)

**Upstream de referência (confirmado, `7debcd0e`):**

| Upstream | Arquivo:linha | Papel |
|---|---|---|
| `ISearchService` (`textSearch` `:47`, `fileSearch` `:51`) | `workbench/services/search/common/search.ts:45` | contrato que nosso `ISearchApi` espelha (subset) |
| `ITextQueryProps` (contentPattern, folderQueries, include/exclude, maxResults) | idem `:128` | forma do query |
| `IFileMatch` / `ITextSearchMatch` / `ISearchComplete` | idem `:195 / :214 / :264` | forma do resultado → nosso `SearchMatch` |
| `SearchService` (orquestração) | `workbench/services/search/common/searchService.ts:28` (`textSearch :82`) | fluxo que portamos |
| `QueryBuilder` (parse de input do usuário) | `workbench/services/search/common/queryBuilder.ts:106` | **portado** p/ `core/search/queryBuilder.ts` |
| `TextSearchQuery2` / `TextSearchMatch2` | `workbench/services/search/common/searchExtTypes.ts:96 / :295` | protocolo de provider |
| `ExcludeSettingOptions` (globs padrão de exclusão) | idem `:506` | base dos excludes padrão |
| UI: `SearchView` / `SearchWidget` / `SearchFindInput` (toggles Aa/ab/.\*) | `workbench/contrib/search/browser/searchView.ts:128`, `searchWidget.ts:115`, `searchFindInput.ts:18` | **adaptado** (não copiado) para `ui/SearchPanel.tsx` |
| Modelo da árvore de resultados | `workbench/contrib/search/browser/searchTreeModel/` (`searchModel.ts`, `fileMatch.ts`, `folderMatch.ts`, `match.ts`, `searchResult.ts`) | **portado** p/ `core/search/model.ts` |
| `ReplaceService` (substituir tudo) | `workbench/contrib/search/browser/replaceService.ts:97` | lógica portada → escrita via `deps.fs.writeFile(atomic)` |
| Busca raw em Node | `workbench/services/search/node/rawSearchService.ts:24`, `node/ripgrepSearchProvider.ts:14` | referência do engine; **nossa** engine = walker próprio em `server/fs/searchEngine.ts` (sem ripgrep binário) |

**Contrato (nosso — espelho do `ISearchApi` do §1):**
- `query()`: debounce **250 ms**; cancelamento — **última busca vence** (token/cancellation); escopo = raiz do módulo + include/exclude; **excludes padrão congelados:** `node_modules`, `.git`, `dist`, `build`, `out`, `.next`, `coverage`, `.venv`, `__pycache__`, arquivos binários (detecção por byte nulo).
- `replaceAll()`: substituição **somente** via `deps.fs.writeFile(atomic: true)`; retorna contagem `{ files, replacements }` (A6.6).
- Resultados limitados: `maxResults` default **2.000 matches / 500 arquivos** → flag `truncated: true` (estado "resultados truncados" na UI).
- Execução no backend Node (`/fs/search` request/response + progress por `WS /fs/watch` reutilizado com tipo `search.progress`) — nunca no thread principal do React (04_15 4.6 "não fazer").

### 2.4 MenuAdapter — `MenuRegistry`/`IMenuService` (VS Code) → `CommandRegistry` (nosso)

**Upstream de referência (confirmado, `7debcd0e`):**

| Upstream | Arquivo:linha | Papel |
|---|---|---|
| `MenuId.ExplorerContext` | `platform/actions/common/actions.ts:114` | menu de contexto do Explorer |
| `MenuId.OpenEditorsContext` | idem `:147` | menu da seção Editores Abertos |
| `IMenuService` | idem `:392` | resolução de menus por `when` |
| Registros do menu Explorer (18 `appendMenuItem`) | `workbench/contrib/files/browser/fileActions.contribution.ts:478–:680` (New File `:478`, New Folder `:489`, Open to the Side `:500`, Open With `:507`, Compare `:517/:524/:531`, Cut `:538`, Copy `:548`, Paste `:558`, **Download `:569–585`**, **Upload `:586–602`**, Copy Path `:603`, Copy Relative Path `:610`, Add Folder `:617`, Remove Folder `:627`, Rename `:637`, Move to Trash `:648`, Delete Permanently `:662`) | **tabela fonte** dos nossos itens (grupos/ordem/when) |
| Itens do menu "Editores Abertos" | idem `:296–:467` | seção correspondente |
| `CanCreateContext` (exemplo de `when`) | `workbench/contrib/files/browser/views/explorerView.ts:1096` | subset de `ContextKeyExpr` que portamos |

**Implementação (nosso):**
- `core/menus/explorerMenus.ts`: **tabela declarativa** portada dos itens acima (mantendo **grupo e ordem** do upstream e as regras de habilitação do `04_03 §2`), cada item → `deps.menus.register({ id, title: <PT-BR do 04_01>, run })` no `mount()`; unregister no `dispose()`.
- **Context keys (congelados):** `explorerResourceIsFolder`, `explorerResourceIsRoot`, `explorerResourceParentReadOnly`, `resourceCopied`, `resourceCut`, `multiSelectionActive`, `explorerViewletFocus` — publicados via `deps.menus.setContext()` em cada `selectionChanged`/operação (mesma semântica do `ContextKeyService` upstream, sem portar a engine).
- **`when` evaluator (subset):** `!`, `&&`, `||`, `===`, `!==` sobre context keys — `core/menus/when.ts` + testes unit (substitui `ContextKeyExpr`/`IMenuService`).
- **Download/Upload** entram no menu **e** no header (overflow) exatamente como no vídeo (`04_01`, `04_03`); Download em pasta/multi apenas se o backend suportar (stratégia `directory-picker`, senão desabilitado — A3.3/A3.4).
- Regra: o componente do menu **apenas** lista itens habilitados pelo `when` + dispara `deps.menus.execute(id)`; **zero lógica de negócio inline** (VAL-EXP-08).
- Itens **fora de escopo** desta fase (marcados no upstream): Add/Remove Folder to Workspace (Q4 single-root), Compare (depende de diff central — `04_02` §não-escopo), Open With (sem providers externos).

### 2.5 Garantia: `app.tsx` só chama o contrato

**Obrigatório (frozen):**
1. `App.tsx` importa **um único caminho** do módulo: `./modules/explorer-search/index.js`.
2. O que `App.tsx` faz com o módulo:
   ```ts
   import { createExplorerSearchModule, type IExplorerSearchModule } from './modules/explorer-search/index.js';
   // orquestração apenas — sem lógica interna:
   const explorerSearch: IExplorerSearchModule = createExplorerSearchModule({ fs, menus, contextMenu, workspaceRoot });
   explorerSearch.mount(explorerSlotRef.current);
   explorerSearch.explorer.openFolder({ uri: workspaceRoot });
   const off = explorerSearch.onEvent(e => {
     if (e.type === 'explorer.fileOpened') editorAttach.open({ uri: e.uri, kind: 'code', sessionId });
   });
   ```
3. **Proibido em `App.tsx`:** importar `modules/explorer-search/core/*`, `/ui/*`, `/explorer/*`, `/search/*`; guardar estado de árvore/seleção; renderizar nó da árvore; chamar `deps.fs` para "atalhar" o módulo.
4. **Enforcement automatizado:** teste unit de fronteira (novo, `src/modules/explorer-search/__tests__/frontier.test.ts`): lê o fonte de `App.tsx` e assevera (a) o único import do módulo é o barrel `index.js`; (b) não há referências a serviços internos. Roda no `npm test` de toda sub-fatia (custo ~0 ms).
5. **Quebra isolada (métrica de sucesso do LEGO):** teste E2E dedicado (4.9): injeta falha no módulo (ex.: `dispose()` + remontagem falha) e assevera que o terminal PTY continua `data-pty-status="open"` e responde a input — se quebrar, a fronteira foi violada.

---

## 3. Contratos aditivos espelhados no módulo (espelho de `docs/04`)

> Os tipos do `contract.ts` (§1) **espelham** estes aditivos. Quando `platform/packages/contracts/` for materializado (futura decisão), o barrel do módulo passa a re-exportar de lá — **sem mudar assinaturas**.

| Contrato | Mudança vs. `docs/04` | Compatibilidade |
|---|---|---|
| `FileSystemPort` | aditivo: `stat`, `createFile`, `createFolder`, `copy`, `readFileBinary`, `upload/download` (via eventos), `onEvent` | aditivo — não remove nada |
| `ExplorerService` | materializado **dentro do módulo** (`core/explorerService.ts`) com a API do `contract.ts` (superset do `docs/04` §6: + cut/copy/paste/rename/delete/download/upload/collapseAll/sort/select) | aditivo |
| `SearchService` | **novo** — `query` (handle cancelável) + `replaceAll` (atomic) | novo |
| `EditorService` (anexo) | aditivo: `surface: 'attach'`, `sessionId`, `setAttachVisible` (NUNCA desmonta), `setAttachWidth` (clamp 280–1200 px / 25–75%), `closeAll(sessionId)` — espelho da Regra 10 do `docs/18` | aditivo (campos opcionais) |
| `CommandRegistry` | sem mudança de forma do `docs/04` §11; ganha o uso de `setContext`/`getContext` para os context keys §2.4 | compatível |
| `BrowserPort`/`BrowserSessionService` | **mantido como FUTURO (4.8)** — contrato preservado aqui e em `04_07 §3`; fora do ciclo atual | fora de escopo agora |

**Eventos (adicionais à tabela do `docs/04`):** os listados em `ExplorerSearchEvent` (§1) — todos com produtor único (o módulo) e consumidores previsíveis (App.tsx, EditorService attach, status bar).

**Proibições herdadas do `docs/04` (continuem valendo):** `any` em porta de serviço; contrato sem dono/consumidor; evento com 2 produtores; escrita de arquivo fora do `FileSystemPort`; mudança de contrato sem revisão documental.

---

## 4. Matriz de correspondência upstream → AGENTE WINDOW (síntese)

| Upstream (`7debcd0e`) | Nosso equivalente | Onde vive |
|---|---|---|
| `IFileService` + `FileService` + `DiskFileSystemProviderClient` | `FileSystemPort` + `fsHost.ts` (backend Node) | `server/fs/fsHost.ts` + `contract.ts` |
| `FileWatcherService` + `NodeJSFSWatcher` + `EventCoalescer` | watcher adapter + `fs.changed` | `server/fs/watcher.ts` + `core/watchClient.ts` |
| `ISearchService` + `QueryBuilder` + `searchTreeModel` + `ReplaceService` | `ISearchApi` + engine Node | `core/search/*` + `server/fs/searchEngine.ts` |
| `MenuRegistry`/`IMenuService`/`MenuId`/`ContextKeyExpr` | `CommandRegistry` + context keys + `when` subset | `core/menus/*` |
| `ExplorerModel`/`ExplorerItem`/`ExplorerService` (contrib/files) | `ExplorerNode`/`ExplorerService` (core puro) | `core/explorerModel.ts`, `core/explorerService.ts` |
| `BrowserFileUpload`/`FileDownload` (fileImportExport.ts) | `core/transfer/*` (via `deps.fs`) | `core/transfer/upload.ts`, `core/transfer/download.ts` |
| `FileDragAndDrop` (explorerViewer.ts) | política DnD pura + handlers React | `core/dndPolicy.ts` + `ui/ExplorerTree.tsx` |
| View engine (`CompressibleAsyncDataTree`, delegates, renderers) | **DESCARTADO** → React tree própria (22 px, tokens) | `ui/*` (reescrita) |

---

## 5. Eixos cobertos (VISUAL / COMPORTAMENTO / EVENTO / VALIDAÇÃO)

| Eixo | Onde está neste documento |
|---|---|
| **VISUAL** | Contratos não descrevem pixels (Q9): o visual continua 100% sob `04_01`/`04_05`/`04_06`; este documento só fixa os **tipos** que a UI consome. |
| **COMPORTAMENTO** | §2 — semântica de cada adapter (atômica + fila por recurso, coalescência 300 ms, debounce 250 ms + última busca vence, `when` por context keys, Q3 criar-no-pai). |
| **EVENTO** | §1 `ExplorerSearchEvent` (produtor único) + §2.2 (único produtor de `fs.changed`) + §3 (tabela de adições ao `docs/04`). |
| **VALIDAÇÃO** | §2.5 (teste de fronteira do `App.tsx` + E2E de quebra isolada), §3 (matriz de compatibilidade), proibições herdadas + testes nomeados por sub-fatia no `04_15`. |

---

## 6. Registro de revisão

| Data | Revisão | Autor |
|---|---|---|
| 2026-09-16 | Proposta inicial (contratos aditivos) | Arena Agent |
| 2026-09-20 | **REV-LEGO (FINAL):** `contract.ts` do módulo + 4 adapters detalhados com upstream verificado (`8a7bf87a` / `7debcd0e`) + garantia de fronteira do `App.tsx` + decisões Q7/Q8/Q9 + estado real do repo (sem `platform/packages/`) | Arena Agent (a) — aprovado para congelamento, aguardando assinatura do usuário |
