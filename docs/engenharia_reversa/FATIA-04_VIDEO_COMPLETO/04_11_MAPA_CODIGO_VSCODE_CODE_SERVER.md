# 04_11 — MAPA DE CÓDIGO: ONDE CADA COMPORTAMENTO VIVE (arquivo:linha REAL)

> **REV 2026-09-20 (LEGO) — checkouts confirmados e verificados linha a linha nesta sessão:**
> - **Base 1 (VS Code main):** `microsoft/vscode` @ **`7debcd0e2acdea1c52de81bf9ee1620444407dda`** — acesso local em `/home/user/.cache/code-server/lib/vscode/` (submódulo; raiz dos caminhos `src/vs/...`).
> - **Base 2 (code-server):** `coder/code-server` @ **`8a7bf87a4d66914e328d97815e2faa9f25097866`** — em `/home/user/.cache/code-server/`.
> - **Base 3 (projeto):** `agente_window/` (checkout atual: `platform/apps/workbench-v2/` + `platform/services/pty-server/`; **sem** `platform/packages/`).
> **Método:** todo número de linha abaixo foi obtido por `grep` sobre o checkout pinado (2026-09-20). Diferenças em relação ao mapa anterior (coleta 2026-09-16 em outro `main`) estão marcadas com **(Δ)**. Regra: ao codar, reconfirmar por busca textual (linhas mudam com o tempo).

---

## 1. Explorer — estrutura, árvore e header (Base 1)

| Comportamento | Arquivo (rel. `lib/vscode/src/vs/`) | Linha (verificada) |
|---|---|---|
| Classe da view do Explorer | `workbench/contrib/files/browser/views/explorerView.ts` | **177** `export class ExplorerView extends ViewPane implements IExplorerView` |
| ID da view | `workbench/contrib/files/common/files.ts` | **34** `VIEW_ID = 'workbench.explorer.fileView'` |
| Ordenações (`SortOrder`) | idem | **125** `const enum SortOrder` |
| **Modelo do Explorer** (`ExplorerModel`, `ExplorerItem`) | `workbench/contrib/files/common/explorerModel.ts` | **26** `export class ExplorerModel`, **89** `export class ExplorerItem` **(Δ)** — no mapa antigo estava em `browser/`; neste checkout vive em `common/` |
| Serviço de estado (sort, findClosest, select, refresh) | `workbench/contrib/files/browser/explorerService.ts` | **34** `export class ExplorerService implements IExplorerService`, **153** `sortOrderConfiguration`, **240** `findClosest`, **244** `findClosestRoot`, **297** `select`, **342** `refresh` |
| Data source lazy da árvore | `workbench/contrib/files/browser/views/explorerViewer.ts` | **92** `export class ExplorerDataSource implements IAsyncDataSource<…>` |
| Delegação / altura de linha | idem | **78** `export class ExplorerDelegate`, **80** `ITEM_HEIGHT = 22` |
| Renderer (ícones/labels/estados) | idem | **825** `export class FilesRenderer implements ICompressibleTreeRenderer<…>` |
| Pastas comprimidas (`a/b/c`) | idem | **2098** `ExplorerCompressionDelegate` — **DESCARTAR** (não aparece no vídeo; ver §11) |
| Ações do header (4 botões + overflow) | `workbench/contrib/files/browser/views/explorerView.ts` | **1103** `registerAction2` New File (id `:1106`, precondition `:1110`), **1126** New Folder (id `:1129`), **1149** Refresh (id `:1152`), **1177** Collapse All (id `:1180`) **(Δ)** — mapa antigo: 1107–1210 |
| Precondition de criação (`CanCreateContext`) | idem | **1096** `const CanCreateContext = ContextKeyExpr.or(…)` **(Δ)** — mapa antigo: 1101 |
| Estado vazio da view | `workbench/contrib/files/browser/views/emptyView.ts` | **26** `export class EmptyView extends ViewPane` |
| Viewlet/container (foco, ações da view) | `workbench/contrib/files/browser/explorerViewlet.ts` | (arquivo) ações de foco `workbench.explorer.fileView.focus` |

## 2. Explorer — menu de contexto (Base 1)

| Item | Arquivo | Linha (verificada) |
|---|---|---|
| `MenuId.ExplorerContext` | `platform/actions/common/actions.ts` | **114** `static readonly ExplorerContext = new MenuId('ExplorerContext')` |
| `MenuId.OpenEditorsContext` | idem | **147** |
| `IMenuService` (resolução por `when`) | idem | **392** `export interface IMenuService` |
| Registros do menu Explorer (18 `appendMenuItem`) | `workbench/contrib/files/browser/fileActions.contribution.ts` | **478** New File, **489** New Folder, **500** Open to the Side, **507** Open With, **517/524/531** Compare (3), **538** Cut, **548** Copy, **558** Paste, **569–585** **Download** (grupo `5b_importexport`, order 10), **586–602** **Upload** (order 20), **603** Copy Path, **610** Copy Relative Path, **617** Add Folder to Workspace, **627** Remove Folder, **637** Rename, **648** Move to Trash, **662** Delete Permanently |
| Menu de "Editores Abertos" | idem | **296–467** (16 `appendMenuItem` em `MenuId.OpenEditorsContext`) **(Δ)** — mapa antigo: 386–460 |
| Menu de título (New Text File / Open File) | idem | **674/675** |

## 3. Ações de arquivo (comandos) — Base 1

| Comando/símbolo | Arquivo (`workbench/contrib/files/browser/`) | Linha (verificada) |
|---|---|---|
| `NEW_FILE_COMMAND_ID = 'explorer.newFile'` | `fileActions.ts` | **65** |
| `NEW_FOLDER_COMMAND_ID = 'explorer.newFolder'` | idem | **67** |
| `DOWNLOAD_COMMAND_ID = 'explorer.download'` | idem | **74** |
| `UPLOAD_COMMAND_ID = 'explorer.upload'` | idem | **76** |
| Registro da ação New File / New Folder (Action2) | idem | **985** / **992** |
| `downloadFileHandler` | idem | **1073** (registro em **1093–1094**) |
| Ação de Upload | idem | **1119** |
| Handlers de Cut/Copy/Paste/Rename/Delete (base da matriz de habilitação) | idem | `grep` por `CUT_COMMAND_ID`/`COPY_COMMAND_ID`/`PASTE_COMMAND_ID`/`RENAME` — portar a **matriz** do `04_03 §2`, não as classes (elas dependem de DI) |

## 4. I/O, upload e download — o coração do vídeo 3.1 (Base 1)

| Símbolo | Arquivo (`workbench/contrib/files/browser/fileImportExport.ts`) | Linha (verificada) |
|---|---|---|
| `export class BrowserFileUpload` | — | **72** |
| detecção de origem do drop (`isDragEvent`) | idem | **107** |
| `doUpload(target, source, progress, token)` | idem | **134** |
| `doUploadEntry(entry, parentResource, …)` (recursão de pasta) | idem | **205** |
| `doUploadFileBuffered(resource, file, progressReporter, token)` | idem | **315** |
| `export class ExternalFileImport` (desktop) | idem | **393** — **DESCARTAR** (Electron) |
| `doImport` / `importResources` | idem | **431** / **509** — referência apenas |
| `export class FileDownload` | idem | **598** |
| `LAST_USED_DOWNLOAD_PATH_STORAGE_KEY` | idem | **600** |
| `download()` (ponto de entrada, progress) | idem | **623** |
| `doDownload(sources, …)` (despacho browser vs nativo) | idem | **633** |
| `doDownloadBrowser(resource, …)` | idem | **652** |
| `downloadFolderBrowser` (preserva estrutura relativa) | idem | **680** (`triggerDownload` em **702**) |
| `downloadFileBufferedBrowser` (File System Access API) | idem | **707** |
| `downloadFileUnbufferedBrowser` (fallback blob/stream) | idem | **742** |
| helpers `triggerDownload`, `isDragEvent` | `base/browser/dom.ts` | import em `fileImportExport.ts:26` |
| Confirmação de sobrescrita múltipla | `fileImportExport.ts` | `getMultipleFilesOverwriteConfirm` (import em `explorerViewer.ts:57`) |

## 5. Drag & drop — Base 1

| Comportamento | Arquivo (`workbench/contrib/files/browser/views/explorerViewer.ts`) | Linha (verificada) |
|---|---|---|
| `export class FileDragAndDrop implements ITreeDragAndDrop<ExplorerItem>` | — | **1571** |
| `onDragOver(data, target, targetIndex, targetSector, originalEvent)` | idem | **1601** |
| drop de abas do editor (`fillEditorsDragData`) | idem | **1772** (helper em `workbench/browser/dnd.ts:202`) |
| **decisão drop externo (OS→árvore): Import vs Upload** | idem | **~1812–1830** (despacho em **1829**) |
| `handleExplorerDrop` (mover/copiar interno, `Alt` = copiar) | idem | **1836** |
| `onDragEnd()` | idem | **2061** |
| `ResourcesDropHandler`, `CompositeDragAndDropObserver` | idem | **86** / **450** (infra DnD do VS Code — **DESCARTAR**, ver §11) |

## 6. Platform de arquivos (alvo dos adapters `FileSystemPort`) — Base 1

| Símbolo | Arquivo (`lib/vscode/src/vs/`) | Linha (verificada) |
|---|---|---|
| `export interface IFileService` | `platform/files/common/files.ts` | **28** |
| `onDidFilesChange` | idem | **95** |
| `stat` / `readFile` / `writeFile` | idem | **134 / 152 / 165** |
| `move` / `copy` / `createFile` / `createFolder` | idem | **174 / 188 / 211 / 225** |
| `canDelete` / `watch` | idem | **240 / 264** |
| `FileType` | idem | **449** |
| `IFileSystemProvider` (`watch :685`, `stat :687`, `readdir :689`, `delete :690`, `readFile :709`, `writeFile :710`, `copy :722`) | idem | **~680–725** |
| `FileChangeType` / `FileChangesEvent` | idem | **977 / 1007** |
| `export class FileService` (orquestração: filas, etag, eventos `FileOperation`) | `platform/files/common/fileService.ts` | **26** (evento `_onDidRunOperation` **:183**, `writeFile` **:383**, "modified since" **:536**, `readFile` **:542**) |
| `DiskFileSystemProviderClient` (FS real em Node) | `platform/files/common/diskFileSystemProviderClient.ts` | **26** (`stat :79`, `realpath :83`, `readdir :87`, `readFile :95`, `writeFile :160`, `delete :196`, `rename :200`, `copy :204`, `watch :250`) |
| Watcher: requests/universal watcher | `platform/files/common/watcher.ts` | **55–89** (tipos), **96** `IWatcher`, **178** `IUniversalWatcher`, **274** `async watch(requests)`, **378** `EventCoalescer` |
| Watcher Node real (`fs.watch`) | `platform/files/node/watcher/nodejs/nodejsWatcher.ts` | **108** `startWatching`, **126** `stopWatching` |
| Watcher Parcel (alternativa) | `platform/files/node/watcher/parcel/parcelWatcher.ts` | (arquivo) — referência, não usamos |
| Ponte workbench→server no contexto web: `ExtHostFileSystem` (lado servidor, FS real) | `workbench/api/common/extHostFileSystem.ts` | **113** `export class ExtHostFileSystem` (validação de provider `:225–246`) |
| Contraparte renderer: `mainThreadFileSystem.ts` | `workbench/api/browser/mainThreadFileSystem.ts` | (arquivo) — **referência do padrão browser↔server que o nosso `vite-plugin-fs.ts` espelha** |

## 7. Search — Base 1 (novo detalhamento com linhas verificadas)

| Símbolo | Arquivo (`lib/vscode/src/vs/`) | Linha (verificada) |
|---|---|---|
| `export interface ISearchService` (`textSearch :47`, `fileSearch :51`, `registerSearchResultProvider :54`) | `workbench/services/search/common/search.ts` | **45** |
| `ITextQueryProps` (contentPattern, folderQueries, include/exclude, maxResults) | idem | **128** |
| `IFileMatch` / `ITextSearchMatch` / `ISearchComplete` | idem | **195 / 214 / 264** |
| `export class SearchService` (orquestração base) | `workbench/services/search/common/searchService.ts` | **28** (`textSearch :82`, `textSearchSplitSyncAsync :116`, `fileSearch :165`) |
| Variante browser/web (worker local) | `workbench/services/search/browser/searchService.ts` | arquivo (212 linhas) — referência de registro no web |
| `export class QueryBuilder` (parse do input do usuário: include/exclude/pastas) | `workbench/services/search/common/queryBuilder.ts` | **106** (`ISearchPatternBuilder :45`, `escapeGlobPattern :683`) |
| `TextSearchQuery2` / `TextSearchMatch2` / `TextSearchResult2` | `workbench/services/search/common/searchExtTypes.ts` | **96 / 295 / 337** |
| `ExcludeSettingOptions` (globs padrão de exclusão) | idem | **506** |
| Busca raw em Node | `workbench/services/search/node/rawSearchService.ts` | **24** `class SearchService implements IRawSearchService` |
| Provider ripgrep (referência de engine) | `workbench/services/search/node/ripgrepSearchProvider.ts` | **14** `class RipgrepSearchProvider` — **não usamos** (sem binário); nosso engine = walker próprio |
| `export class SearchView extends ViewPane` | `workbench/contrib/search/browser/searchView.ts` | **128** (`SearchViewDataSource :2601`, `RefreshTreeController :2709`) |
| `export class SearchWidget` (input + toggles + include/exclude) | `workbench/contrib/search/browser/searchWidget.ts` | **115** |
| `export class SearchFindInput` (toggles `Aa`/`ab`/`.*`) | `workbench/contrib/search/browser/searchFindInput.ts` | **18** |
| `export class ReplaceService` (substituir tudo) | `workbench/contrib/search/browser/replaceService.ts` | **97** |
| Modelo da árvore de resultados | `workbench/contrib/search/browser/searchTreeModel/` | `searchModel.ts`, `fileMatch.ts`, `folderMatch.ts`, `match.ts`, `searchResult.ts` (pasta inteira) |
| Contribuição/ações da view | `workbench/contrib/search/browser/search.contribution.ts`, `searchActionsTopBar.ts` | (arquivos) — referência de ações (nova busca, limpar, toggles) |

## 8. Menus/comandos (alvo do adapter `CommandRegistry`) — Base 1

Ver §2 (linhas `actions.ts:114/147/392` + `fileActions.contribution.ts:296–680`) e §3. Complemento:

| Símbolo | Arquivo | Linha |
|---|---|---|
| `MenuRegistry` (namespace) + `Action2`/`registerAction2` | `platform/actions/common/actions.ts` | namespace em torno de **~420–460** (evento `MenuRegistryChangeEvent :433`); usamos o **padrão** de registro, não a classe |
| `MenuService` (implementação) | `platform/actions/common/menuService.ts` | **19** `export class MenuService implements IMenuService` — **DESCARTADO** (substituído por `when.ts` + `CommandRegistry`) |

## 9. Browser interno + IA com acesso a HTML — **FUTURO (sub-fatia 4.8)**

> Mantido do mapa anterior como **referência para quando a 4.8 for reaberta** (decisão Q8: fora do ciclo atual). Linhas referenciadas à coleta de 2026-09-16; **revalidar sobre o checkout pinado no dia da implementação** (o branch `main` evolui).

| Componente | Arquivo | Âncora |
|---|---|---|
| Serviço de página/abas | `contrib/browserView/common/browserView.ts` | `IBrowserViewWorkbenchService` |
| Serviço Playwright (getSummary/getHTML/invoke) | `platform/browserView/common/playwrightService.ts` | `interface IPlaywrightService :35`, `waitForPageAndGetSummary :39`, `getSummary :47`, `invokeFunctionRaw :58` |
| Nomes canônicos das 10 tools + `recordPage` (nova) | `platform/browserView/common/browserChatToolReferenceNames.ts` | arquivo inteiro |
| ToolSet "browser" | `contrib/browserView/electron-browser/tools/browserTools.contribution.ts` | `IAgentNetworkFilterService :11` |
| Tools individuais | `contrib/browserView/electron-browser/tools/` | `openBrowserTool.ts`, `readBrowserTool.ts`, `screenshotBrowserTool.ts`, `navigateBrowserTool.ts`, `clickBrowserTool.ts`, `typeBrowserTool.ts`, `hoverElementTool.ts`, `dragElementTool.ts`, `handleDialogBrowserTool.ts`, `listBrowserPagesTool.ts`, `runPlaywrightCodeTool.ts` |
| Simple Browser web (iframe — **anti-referência**) | `extensions/simple-browser/src/simpleBrowserView.ts` | `:168` Focus Lock, `:169` `<iframe sandbox>` — **não replicar** (Q2: screencast CDP) |

**Conclusão (inalterada):** replicar a *arquitetura* do browserView (Playwright/CDP por sessão), **não** o iframe.

## 10. Base 2 — `code-server` @ `8a7bf87a` (arquitetura web que fundamenta o Q7)

| Componente | Caminho (rel. `/home/user/.cache/code-server/`) | Linha (verificada) |
|---|---|---|
| Gerenciador de sessões editor (WS) | `src/node/vscodeSocket.ts` | **85** `export class EditorSessionManager`, **147** `export class EditorSessionManagerClient` |
| Proxy HTTP do server | `src/node/proxy.ts` | (arquivo) |
| Boot do server | `src/node/main.ts` | (arquivo) |
| Patches aplicados ao VS Code (web-ification) | `patches/*.diff` | `integration.diff`, `external-file-actions.diff`, `clipboard.diff`, `local-storage.diff`, `proxy-uri.diff`, `series/` |
| Estrutura | `src/{browser,common,node}` + `lib/vscode` (submódulo `7debcd0e`) | `src/common/{emitter,http,util}.ts` |

**Leitura arquitetural (o que nos interessa):** no code-server, o workbench roda **no browser** e o acesso a `file://` atravessa a ponte workbench↔extension-host **no servidor** (`ExtHostFileSystem` §6 → `DiskFileSystemProviderClient` §6 → FS real). É exatamente o mesmo padrão Single Port que a Casa Nova já usa para o PTY: **frontend no browser, execução real no processo Node do Vite/server, transporte via WS/HTTP na mesma porta**. Nosso `vite-plugin-fs.ts` + `server/fs/` reproduz esse padrão **sem** editar nenhum arquivo blindado (Q7).

## 11. O que vai ser COPIADO, ADAPTADO ou DESCARTADO (decisão LEGO por arquivo)

### A. COPIAR (lógica pura — portar com troca de imports por adapters; sem DI, sem view engine)

| De (Base 1, linha) | Para (módulo) | O que portar |
|---|---|---|
| `contrib/files/common/explorerModel.ts:26/89` (`ExplorerModel`, `ExplorerItem`) | `core/explorerModel.ts` | árvore em memória, expanded/collapsed, seleção, roots, `findClosest`, eventos de mudança — **sem** `IFileService` injetado: recebe `deps.fs` |
| `contrib/files/browser/explorerService.ts:34…` (`ExplorerService`) | `core/explorerService.ts` | `sortOrder`, `findClosest(:240)`, `select(:297)`, `refresh(:342)` + operações create/rename/move/delete/cut/copy/paste (orquestram `deps.fs`) |
| `explorerViewer.ts:1571–2098` (só a **decisão**: `onDragOver:1601`, despacho externo/interno `~1812–1830`, `handleExplorerDrop:1836`) | `core/dndPolicy.ts` | função pura `(dragData, target, modifiers) → ação` (move/copy/nada) + regras de confirmação (`Alt` copia, `Esc` cancela) |
| `fileImportExport.ts:72–315` (`BrowserFileUpload`, `doUpload:134`, `doUploadEntry:205`, `doUploadFileBuffered:315`) | `core/transfer/upload.ts` | recursão de entrada (pasta do SO), progresso, cancelamento, colisão — **I/O via `deps.fs`** |
| `fileImportExport.ts:598–769` (`FileDownload`, `doDownload:633`, `doDownloadBrowser:652`, folder `:680`, buffered `:707`, unbuffered `:742`) | `core/transfer/download.ts` | estratégia save-picker/directory-picker/fallback blob, streaming, hash de integridade |
| `services/search/common/queryBuilder.ts:106` (`QueryBuilder`) | `core/search/queryBuilder.ts` | parse do input (include/exclude/folder, case/word/regex) |
| `services/search/common/search.ts:45…` (tipos `ISearchService`/`IFileMatch:195`/`ITextSearchMatch:214`/`ISearchComplete:264`) | `contract.ts` / `core/search/types.ts` | subset tipado (já refletido no `contract.ts` do `04_10` §1) |
| `contrib/search/browser/searchTreeModel/*` (`searchModel`, `fileMatch`, `folderMatch`, `match`, `searchResult`) | `core/search/model.ts` | agrupamento resultado→pasta→arquivo→match, contagens, truncamento |
| `contrib/search/browser/replaceService.ts:97` (lógica de substituir) | `core/search/replace.ts` | aplicação de substituição + contagem — **escrita via `deps.fs.writeFile(atomic)`** |
| `platform/files/common/fileService.ts:26/183/383/536` (fila por recurso, etag/modified-since) | `server/fs/fsHost.ts` | serialização de escrita atômica (temp+rename) e rejeição de "modified since" |
| `platform/files/common/diskFileSystemProviderClient.ts:79–250` (operações de FS real) | `server/fs/fsHost.ts` | mapeamento direto p/ `fs/promises` (stat/readdir/read/write/delete/rename/copy) |
| `platform/files/common/watcher.ts:274/378` + `nodejs/nodejsWatcher.ts:108/126` (watch + coalescer) | `server/fs/watcher.ts` | watch recursivo + coalescência 300 ms → `fs.changed` |

### B. ADAPTAR (reescrita em React mantendo 100% o comportamento documentado — Q9)

| De (Base 1, linha) | Para | O que preservar |
|---|---|---|
| `explorerViewer.ts:92` (`ExplorerDataSource` lazy) | `core/treeState.ts` + `ui/ExplorerTree.tsx` | carregar **apenas o ramo expandido**; re-expandir não relê o disco (A2.1) |
| `explorerViewer.ts:78/80` (`ExplorerDelegate`, `ITEM_HEIGHT=22`) | `ui/explorer.css` | linha **22 px**, hover/ativo por tokens `--vscode-list-*` |
| `explorerViewer.ts:825` (`FilesRenderer`) | `ui/ExplorerTree.tsx` | ícones, estados (dirty/selected/drop), prefixos `┌└├` de split — ícones lucide (padrão Casa Nova), cores por token |
| `explorerView.ts:1103–1191` (ações do header) | `ui/ExplorerHeader.tsx` | **5 botões** (new-file, new-folder, refresh, collapse-all, overflow) + tooltips/aria do `04_01` |
| `explorerViewer.ts:1601/2061` (handlers DOM de drag) | `ui/ExplorerTree.tsx` (DnD interno + entrada do SO) | visual `grab`/`dropBackground`/`opacity 0.5`; `webkitGetAsEntry()` para pastas do OS |
| `searchView.ts:128` + `searchWidget.ts:115` + `searchFindInput.ts:18` | `ui/SearchPanel.tsx` (aba do anexo) | widget de busca com toggles `Aa`/`ab`/`.*`, campos include/exclude, estados vazios, resultados por pasta (A6.*) |
| `views/emptyView.ts:26` | `ui/*Sections*.tsx` | estado vazio "Nenhum editor aberto" (A2.4) |
| `files.ts:34/125` (VIEW_ID, SortOrder) | `core/constants.ts` | IDs/ordenações canônicos |

### C. DESCARTAR (substituído pelo nosso ecossistema)

| O que descarta | Substituído por |
|---|---|
| DI do VS Code (`IInstantiationService`, injeção de `this.fileService`, `_serviceBrand`) | deps injetados no `contract.ts` (§04_10 §1) |
| Engine de árvore (`ICompressibleAsyncDataTree`, `ITreeDragAndDrop`, delegates/renderers) | React tree própria (mantendo 22 px + lazy) |
| `MenuRegistry`/`MenuService`/`MenuId`/`ContextKeyService`/`ContextKeyExpr` (`actions.ts:114/392`, `menuService.ts:19`) | `CommandRegistry` + context keys + `when.ts` (04_10 §2.4) |
| `IEditorService`/`IEditorGroupsService` (editor **central**) | `EditorService` **anexo** (4.7) — Q1: anexo só em `platform/`, área central do legado intocada |
| `IFileDialogService`/`IHostService` | `core/transfer/*` (save-picker/blob) |
| `INotificationService`, `IDialogService`, `IProgressService`, `IQuickInputService`, `IThreadService`, `ITelemetryService`, `ITracerService`, `IConfigurationService` (settings) | eventos de erro do módulo + estado local (sem camada de settings nesta fase) |
| `IWorkspaceContextService` / multi-root | single-root (Q4) |
| `nls.localize` / i18n | labels PT-BR do `04_01` |
| `IKeybindingService` (keybindings do VS Code) | atalhos existentes do shell da Casa Nova (`src/domain/keyboardNavigation.ts` — referência) |
| Caminhos Electron-only: `ExternalFileImport` (`fileImportExport.ts:393`), `doDownloadNative` | — (somente web: File System Access API + fallback blob) |
| Extension host / `vscode.d.ts` API / `extHost*` | — (nossa ponte = `vite-plugin-fs.ts`, Q7) |
| `ExplorerCompressionDelegate` (`explorerViewer.ts:2098`) — pastas comprimidas `a/b/c` | **fora de escopo do vídeo** (`04_01` não documenta); deixar para fatia futura se for pedido |
| Comparação de arquivos (Compare ×3, `fileActions.contribution.ts:517–531`) | depende de diff central (fora do módulo; seção futura) |
| Open With / providers externos (`:507`) | sem providers de extensão nesta fase |
| Add/Remove Folder to Workspace (`:617/:627`) | Q4 single-root |
| URI schemes do VS Code (`file:`, `inmemory:`) | `WorkspaceUri` do `docs/04` (mesmo formato `file://…`) |

## 12. Base 3 — projeto atual (estado real verificado 2026-09-20)

| Item | Caminho (`agente_window/`) | Nota |
|---|---|---|
| **Casa Nova (base ativa)** | `platform/apps/workbench-v2/` | porta **5174**, Single Port (`vite-plugin-pty.ts` + `singlePort.ts`), React 18 + Vite + xterm + monaco + tailwind |
| `App.tsx` (orquestrador — vai receber o módulo) | `platform/apps/workbench-v2/src/App.tsx` | **único** ponto de wiring do módulo (§04_10 §2.5) |
| `components/` (shell + terminal V2) | `platform/apps/workbench-v2/src/components/` (incl. `terminal/VSCodeTerminal.tsx` ~1.745 linhas) | terminal V2 **homologado** (`sessao_11_terminal_interactive_v2` 3/3) — **BLINDADO na prática** (`docs/18` §6, analogia Casa Nova) |
| `domain/` (lógica existente — referência de comportamento) | `src/domain/` — `fileSystem.ts` (File System Access API, sem backend), `search.ts`, `editorTabs.ts`, `dragAndDrop.ts`, `keyboardNavigation.ts`, `layoutController.ts`, `sessionsService.ts`, … | **referência de comportamento** para o transplant (mesmos domínios); o módulo **não** importa estes arquivos (fronteira LEGO) |
| `hooks/` | `src/hooks/` — `usePtySession.ts`, `useTerminalTheme.ts`, `useXtermTerminal.ts` | `useTerminalTheme` **blindado** (`docs/18` Regra 9) |
| `styles/` | `src/styles/` — `app.css`, `theme.css`, `terminal-vscode.css`, `xterm-vscode.css` | `terminal-vscode.css` **blindado**; `theme.css`/`app.css` recebem apenas **tokens novos** |
| Testes unit (Vitest) | `src/__tests__/*.test.{ts,tsx}` — **156 arquivos**; `vitest.config.ts` include `src/**/*.{test,spec}.{ts,tsx}` + thresholds de coverage | `npm test` no pacote |
| Testes E2E (Playwright) | `e2e/*.spec.ts` — **20 specs** (incl. `sessao_11_terminal_interactive_v2.spec.ts` e `sessao_11_terminal_pty_real.spec.ts`); `playwright.config.ts` baseURL `http://127.0.0.1:5174` | anti-regressão obrigatória |
| Servidor preview | `server.mjs` (porta 4173; WS PTY via `platform/services/pty-server/dist/singlePort.js`) | recebe **montagem aditiva** do handler FS (Q7) |
| **Casa Velha (blindada)** | `legacy/` (porta 5173; `legacy/src`, `legacy/services/pty-server`) | intocável — zero imports cruzados |
| `platform/packages/` | **não existe no checkout atual** | contratos vivem no módulo (`04_10` §0) |
| Workspace root | `platform/package.json` (workspaces: `apps/workbench-v2`, `services/pty-server`) | **não** tem `package.json` na raiz do repo neste checkout |

## 13. Eixos cobertos (VISUAL / COMPORTAMENTO / EVENTO / VALIDAÇÃO)

| Eixo | Como este mapa serve |
|---|---|
| **VISUAL** | §1 (22 px, renderer, header 5 botões), §7 (widget de busca), §12 (tokens da Casa Nova). Onde cada pixel documentado em `04_01`/`04_06` nasce no upstream e onde nasce no nosso. |
| **COMPORTAMENTO** | §1–§5 (lazy, create/rename, DnD, upload/download), §6 (I/O atômico + fila), §7 (debounce/cancel/replace). Cada linha aponta a implementação que será portada/adaptada (§11 A/B). |
| **EVENTO** | §6 (`onDidFilesChange:95`, `FileChangeType:977` → `fs.changed`), §5 (handlers de drop), §7 (progresso de busca → `search.progress`). |
| **VALIDAÇÃO** | §12 (suíte real da Casa Nova: 156 unit + 20 e2e, baseURL 5174) + §11 (o que é testável por unit pura: `dndPolicy`, `queryBuilder`, `model`, `when`) + specs novas do `04_15`. |
