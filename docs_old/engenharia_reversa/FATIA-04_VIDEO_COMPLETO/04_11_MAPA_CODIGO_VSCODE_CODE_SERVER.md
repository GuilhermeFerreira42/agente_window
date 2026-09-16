# 04_11 — MAPA DE CÓDIGO: ONDE CADA COMPORTAMENTO VIVE

> **Base 1 (autoridade de comportamento):** clone `microsoft/vscode` **main** em `.cache/vscode` (18.926 arquivos).
> **Base 2:** fork `code-server` (17.768 arquivos, dentro do pacote restaurado) — mesma árvore `src/vs/...`, com patches.
> **Base 3:** projeto atual (`agente_window/`).
> Linhas = posição na coleta de **2026-09-16** (`main` corrente); podem deslocar com o tempo — sempre confirmar por busca textual.

## 1. Explorer — estrutura, árvore e header

| Comportamento | Arquivo | Linha/âncora |
|---|---|---|
| Classe da view do Explorer | `src/vs/workbench/contrib/files/browser/views/explorerView.ts` | 177 `export class ExplorerView extends ViewPane implements IExplorerView` |
| ID da view | `src/vs/workbench/contrib/files/common/files.ts` | 34 `VIEW_ID = 'workbench.explorer.fileView'` |
| Data source lazy da árvore | `views/explorerViewer.ts` | 92 `export class ExplorerDataSource implements IAsyncDataSource<…>` |
| Delegação/altura de linha | `views/explorerViewer.ts` | 78 `ExplorerDelegate`, **80** `ITEM_HEIGHT = 22` |
| Renderer (ícones/labels/badges) | `views/explorerViewer.ts` | 825 `export class FilesRenderer implements ICompressibleTreeRenderer<…>` |
| Pastas comprimidas (`a/b/c`) | `views/explorerViewer.ts` | 2098 `ExplorerCompressionDelegate` |
| Serviço de estado do Explorer | `contrib/files/browser/explorerService.ts` | 155 `sortOrder`, 240 `findClosest`, 244 `findClosestRoot` |
| View container (viewlet) | `contrib/files/browser/explorerViewlet.ts` | 119/134/149 ações `workbench.explorer.fileView.focus` |
| Ações do header (4 botões) | `views/explorerView.ts` | **1107-1210**: `createFileFromExplorer`(New File, 10), `createFolderFromExplorer`(New Folder, 20), `refreshFilesExplorer`(30), `collapseExplorerFolders`(40) |
| Precondition de criação | `views/explorerView.ts` | 1101 `CanCreateContext` |
| Estado vazio | `contrib/files/browser/views/emptyView.ts` | arquivo inteiro |

## 2. Explorer — menu de contexto

| Item | Arquivo | Linha |
|---|---|---|
| Menu `ExplorerContext` (definição) | `src/vs/platform/actions/common/actions.ts` | 114 |
| Registros do menu | `contrib/files/browser/fileActions.contribution.ts` | **478–680** (18 `appendMenuItem`) |
| New File / New Folder no menu | idem | 478, 489 |
| Open to the Side / Open With | idem | 500, 507 |
| Compare (3 itens) | idem | 517, 524, 531 |
| Cut / Copy / Paste | idem | 537, 548, 558 |
| **Download…** (grupo `5b_importexport`, ordem 10) | idem | **569–585** |
| **Upload…** (ordem 20) | idem | **586–602** |
| Copy Path / Copy Relative Path | idem | 603, 610 |
| Add/Remove Folder to Workspace | idem | 617, 627 |
| Rename | idem | 637 |
| Move to Trash / Delete Permanently | idem | 648, 662 |
| Menu de “Editores Abertos” | idem | 386–460 (`MenuId.OpenEditorsContext`) |
| Menu de aba de editor (New Text File / Open File) | idem | 661–665 |

## 3. Ações de arquivo (comandos)

| Comando | Arquivo | Linha |
|---|---|---|
| `NEW_FILE_COMMAND_ID = 'explorer.newFile'` | `fileActions.ts` | 65 |
| `NEW_FOLDER_COMMAND_ID = 'explorer.newFolder'` | `fileActions.ts` | 67 |
| `DOWNLOAD_COMMAND_ID = 'explorer.download'` + label | `fileActions.ts` | 74-75 |
| `UPLOAD_COMMAND_ID = 'explorer.upload'` + label | `fileActions.ts` | 76 |
| `downloadFileHandler` | `fileActions.ts` | 1073-1090 |
| Registro da ação de download | `fileActions.ts` | 1093-1094 |
| Upload via handler browser | `fileActions.ts` | 1108 (`BrowserFileUpload`) |

## 4. I/O, upload e download (o coração do vídeo 3.1)

| Símbolo | Arquivo | Linha |
|---|---|---|
| `export class BrowserFileUpload` | `contrib/files/browser/fileImportExport.ts` | 72 |
| `doUpload(target, source: IWebkitDataTransfer, progress, token)` | idem | 134 |
| `doUploadEntry(entry, parentResource, …)` | idem | 205 |
| `doUploadFileBuffered(resource, file, progressReporter, token)` | idem | 315 |
| `export class ExternalFileImport` (desktop) | idem | 393 |
| `doImport(...)` / `importResources(...)` | idem | 431 / 509 |
| `export class FileDownload` | idem | 598 |
| `LAST_USED_DOWNLOAD_PATH_STORAGE_KEY = 'workbench.explorer.downloadPath'` | idem | 600 |
| `download(source: ExplorerItem[])` | idem | 612 |
| `doDownload(...)` | idem | 633 |
| `doDownloadBrowser(...)` | idem | 652 |
| `downloadFileBufferedBrowser(...)` | idem | 707 |
| `downloadFileUnbufferedBrowser(...)` | idem | 743 |
| `downloadFolderBrowser(...)` | idem | 772 |
| `doDownloadNative(...)` | idem | 818 |
| `triggerDownload`, `isDragEvent` (helpers) | `src/vs/base/browser/dom.ts` | import em `fileImportExport.ts:26` |
| Confirmação de sobrescrita de múltiplos arquivos | `fileImportExport.ts` | `getMultipleFilesOverwriteConfirm` (import `explorerViewer.ts:57`) |

## 5. Drag & drop

| Comportamento | Arquivo | Linha |
|---|---|---|
| `export class FileDragAndDrop implements ITreeDragAndDrop<ExplorerItem>` | `views/explorerViewer.ts` | 1571 |
| Setting `explorer.confirmDragAndDrop` | idem | 1572 |
| `onDragOver(...)` (reação e drop effect) | idem | 1601 |
| `onDragEnd()` | idem | 2061 |
| Drop externo (OS → árvore) — decisão Import vs Upload | idem | **1812-1830** |
| `handleExplorerDrop` (mover/copiar interno) | idem | 1841 |
| `toggleDropEffect(...)` | `workbench/browser/dnd.ts` | 641 |
| `fillEditorsDragData(...)` (arrastar aba para pasta) | idem | 202-205 |
| `ResourcesDropHandler`, `CompositeDragAndDropObserver` | idem | 86, 450 |

## 6. Editor (grupos/abas) e o desvio para “anexo lateral”

| Comportamento | Arquivo |
|---|---|
| Grupo de editores (referência de comportamento) | `workbench/browser/parts/editor/editorGroupView.ts` |
| Área central multi-grupo | `parts/editor/editorPart.ts`, `auxiliaryEditorPart.ts` |
| Breadcrumbs/tabs | `parts/editor/breadcrumbs.ts`, `breadcrumbsControl.ts` |
| Drop de arquivo no centro (referência) | `parts/editor/editorDropTarget.ts` |
| Modelo de arquivo/editor (registry) | `contrib/files/browser/editors/fileEditorHandler.ts`, `files.contribution.ts:89` (`createFileEditor`) |
| Menus de aba (Close/Split/Compare) | `contrib/files/browser/fileActions.contribution.ts:386-460`, `editorActions.ts` |

> **Importante:** o vídeo **não** usa o grupo central do VS Code. O anexo lateral é decisão de produto do AGENTE WINDOW (`04_05`); aqui só se aproveitam **padrões** (abas, dirty, foco, menus).

## 7. Seções do Explorer

| Seção | Arquivo | Âncora |
|---|---|---|
| Editores Abertos | `contrib/files/browser/views/openEditorsView.ts` | 85 (ID), ações em 943/979/1001/1025 |
| Settings relacionados | `contrib/files/browser/files.contribution.ts` | 421-436 (`explorer.openEditors.visible/minVisible/sortOrder`) |
| Linha do Tempo | `contrib/timeline/browser/timeline.contribution.ts` | 47 (`id: 'timeline'`), `timelinePane.ts` |
| Estrutura de Código | `contrib/outline/browser/outline.contribution.ts` | 43 (`'id': 'outline'`), `outlinePane.ts`, `outlineActions.ts` |

## 8. Search (dentro da sessão no nosso caso)

| Comportamento | Arquivo |
|---|---|
| View/contêiner de busca | `contrib/search/browser/search.contribution.ts`, `searchView.ts` |
| Widget de entrada + toggles | `contrib/search/browser/searchWidget.ts`, `patternInputWidget.ts` |
| Substituição | `contrib/search/browser/replace.ts`, `replaceService.ts` |
| Busca rápida de texto | `contrib/search/browser/quickTextSearch/` |

## 9. Browser interno + IA com acesso a página (REQUISITO CRÍTICO)

| Componente | Arquivo | Âncora |
|---|---|---|
| Serviço de página/abas do browser | `contrib/browserView/common/browserView.ts` (`IBrowserViewWorkbenchService`) | arquivo |
| Serviço **CDP** | `contrib/browserView/electron-browser/browserViewCDPService.ts` | arquivo |
| Serviço **Playwright** | `platform/browserView/common/playwrightService.ts` | 35 `interface IPlaywrightService`; 39 `waitForPageAndGetSummary`; 47 `getSummary` (DOM + visual); 58 `invokeFunctionRaw`; 60+ `invokeFunction` com timeout/deferral |
| Tipos CDP | `platform/browserView/common/cdp/` | diretório |
| Nomes canônicos das tools | `platform/browserView/common/browserChatToolReferenceNames.ts` | arquivo inteiro (10 nomes) |
| ToolSet “browser” + registro | `contrib/browserView/electron-browser/tools/browserTools.contribution.ts` | 11 (`IAgentNetworkFilterService`), ToolSet `'browser'` |
| Tools individuais | `contrib/browserView/electron-browser/tools/` | `openBrowserTool.ts`, `openBrowserToolNonAgentic.ts`, `readBrowserTool.ts`, `screenshotBrowserTool.ts`, `navigateBrowserTool.ts`, `clickBrowserTool.ts`, `typeBrowserTool.ts`, `hoverElementTool.ts`, `dragElementTool.ts`, `handleDialogBrowserTool.ts`, `listBrowserPagesTool.ts`, **`runPlaywrightCodeTool.ts`** |
| Editor/widgets do browser | `contrib/browserView/electron-browser/browserEditor.ts`, `widgets/browserUrlBarWidget.ts`, `overlayManager.ts` |
| Features | `features/browserDevToolsFeature.ts`, `browserEditorChatFeatures.ts`, `browserSearchFeatures.ts`, `browserHistoryFeature.ts`, `browserPermissionsFeature.ts`, `browserRemoteFeatures.ts`, `browserDataStorageFeatures.ts`, `browserAutoReloadFeatures.ts`, `browserEditorFindFeature.ts`, `browserEditorZoomFeature.ts`, `browserEditorEmulationFeatures.ts`, `browserEditorErrorFeatures.ts`, `browserFavoritesFeature.ts`, `browserTabManagementFeatures.ts`, `browserWelcomeFeature.ts`, `webContentsViewRendererFeature.ts` |
| Simple Browser **web** (iframe, sem acesso a DOM) | `extensions/simple-browser/src/simpleBrowserView.ts` | 130 (CSP), 168 (**Focus Lock**), 169 (`<iframe sandbox="allow-scripts allow-forms allow-same-origin allow-downloads">`), 109 (`webview.html = …`) |

**Conclusão para o nosso produto web:** replicar a *arquitetura* do browserView do VS Code (Playwright/CDP por sessão), **não** o iframe do simple-browser.

## 10. Sidebar / Activity Bar (contexto do Explorer)

| Componente | Arquivo |
|---|---|
| Sidebar (largura, cores, attività bar interna) | `workbench/browser/parts/sidebar/sidebarPart.ts` |
| Atividades/rail | `workbench/browser/parts/activitybar/activitybarPart.ts` |
| Ações de visibilidade da sidebar | `workbench/browser/parts/sidebar/sidebarActions.ts` |
| Parte composta (visibilidade/pinagem) | `workbench/browser/parts/paneCompositePart.ts` |
| Layout global (posição/visibilidade) | `workbench/browser/layout.ts` |

## 11. No fork `code-server` (base 2)

- Estrutura idêntica de `src/vs/...` (é VS Code + patches de servidor web); logo, **todo caminho acima vale** também em `code-server/src/vs/...`.
- Diferenças relevantes: ausência do caminho Electron (todo `electron-browser/*` do browserView não roda no web) → confirma a necessidade de runtime próprio de browser para o nosso produto.
- O pacote do projeto também contém `code-server-main/` (build do servidor usado no VS Code do usuário) — **referência de comportamento**, nunca autoridade arquitetural (`docs/00`, tabela de conjuntos).

## 12. No projeto atual (base 3) — o que já existe

| Item | Caminho |
|---|---|
| Contratos | `platform/packages/contracts/{common,filesystem,explorer,editor,terminal,chat,commands,theme,persistence,workbench}.ts` |
| Lógica pronta | `platform/apps/workbench/src/logic/terminal/terminalService.ts` (16 KB), `terminalPersistence.ts`, `logic/workbench/workbenchLayoutService.ts` (6,5 KB), `logic/commands/commandRegistry.ts` |
| Vazios (FATIA-04) | `logic/explorer/.gitkeep`, `ui/explorer/.gitkeep`, `packages/agent-runtime/filesystem/.gitkeep` |
| UI de terminal (blindada) | `platform/apps/workbench/src/ui/terminal/*` (🟡 protegido) |
| Legado (blindado) | `legacy/.../components/terminal/VSCodeTerminal.tsx` (68,8 KB), `PlatformTerminalBridge.tsx` (908 B), `hooks/useTerminalTheme.ts` (3,7 KB), `styles/terminal-vscode.css` |
| Legado útil para FASE 4 | `legacy/.../src/domain/fileSystem.ts` (6,7 KB), `domain/search.ts` (2,0 KB), `domain/editorTabs.ts` (1,4 KB), `components/EditorArea.tsx`, `components/ContextMenu.tsx`, `domain/dragAndDrop.ts` (3,3 KB) |
| Specs E2E reaproveitáveis | `legacy/.../e2e/` — 21 arquivos, incl. `sessao_11_terminal_pty_real.spec.ts`, `sessao_08_filesystem.spec.ts`, `sessao_07_browser_editor.spec.ts`, `helpers.ts` |

---

## 13. Eixos cobertos (VISUAL / COMPORTAMENTO / EVENTO / VALIDAÇÃO)

| Eixo | Como este mapa serve |
|---|---|
| **VISUAL** | §1 (renderer da árvore: `FilesRenderer`, altura 22 px, ícones), §6/§9 (abas, barra de URL do browser), §10 (sidebar/activity bar). Onde o visual do VS Code é construído. |
| **COMPORTAMENTO** | §1 (data source lazy, ações do header), §2/§3 (menus e comandos), §4/§5 (upload/download/DnD), §7 (seções), §8 (busca). |
| **EVENTO** | §5 (`onDragOver`, drop externo vs interno), §4 (handlers de download/upload), §9 (tools de browser e serviço Playwright por sessão). Cada linha aponta o handler que o evento aciona. |
| **VALIDAÇÃO** | §12 (specs E2E reaproveitáveis do projeto: `sessao_07_browser_editor`, `sessao_08_filesystem`, `sessao_11_terminal_pty_real`, `helpers.ts`) + §1/§4 (comportamentos a cobrir em unit com fixtures). |
