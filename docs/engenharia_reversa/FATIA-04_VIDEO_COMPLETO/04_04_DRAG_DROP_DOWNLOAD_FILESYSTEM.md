# 04_04 — DRAG & DROP, UPLOAD DO SO E DOWNLOAD PARA A MÁQUINA LOCAL

> Requisitos do vídeo: **3.1** — “Drag & Drop: arrastar arquivos do Sistema Operacional para dentro do Explorer no navegador e fazer upload” + “Baixar arquivo direto para máquina local (Download) — diferencial que o VS Code Web não tem” *(nota: o VS Code main **tem**; ver §3)*.

---

## 1. Três tipos distintos de drag & drop (não confundir)

| Tipo | Origem → destino | Mecanismo | Evidência |
|---|---|---|---|
| **DnD interno** | nó da árvore → pasta da árvore | `DataTransfer` com recursos internos (`ElementsDragAndDropData`) | `[E-vscode]` `explorerViewer.ts:1571` `FileDragAndDrop`, `:1601 onDragOver`, `:2061 onDragEnd`, `:1841 handleExplorerDrop` |
| **DnD interno profundo** | aba de editor → pasta | `fillEditorsDragData(...)` | `[E-vscode]` `workbench/browser/dnd.ts:202-205` |
| **DnD externo (OS → navegador)** | Windows Explorer/gerenciador → árvore | `NativeDragAndDropData` → `ExternalFileImport` (desktop) **ou** `BrowserFileUpload` (web) | `[E-vscode]` `explorerViewer.ts:1805-1830` |

**Trecho decisivo** `[E-vscode]` `explorerViewer.ts:1812-1830`:

```ts
// External file DND (Import/Upload file)
if (data instanceof NativeDragAndDropData) {
  // Use local file import when supported
  if (!isWeb || (isTemporaryWorkspace(...) && WebFileSystemAccess.supported(mainWindow))) {
    const fileImport = this.instantiationService.createInstance(ExternalFileImport);
    await fileImport.import(resolvedTarget, originalEvent, mainWindow);
  }
  // Otherwise fallback to browser based file upload
  else {
    const browserUpload = this.instantiationService.createInstance(BrowserFileUpload);
    await browserUpload.upload(target, originalEvent);
  }
}
// In-Explorer DND (Move/Copy file)
else {
  await this.handleExplorerDrop(data as ElementsDragAndDropData<ExplorerItem, ExplorerItem[]>, ...);
}
```

`[SPEC]` No AGENTE WINDOW (produto **web**), o caminho será sempre o equivalente ao `BrowserFileUpload`, porque não há Electron.

---

## 2. Upload: `BrowserFileUpload` (operação real, com progresso)

**Evidência** `[E-vscode]` `src/vs/workbench/contrib/files/browser/fileImportExport.ts`:

| Símbolo | Linha | Papel |
|---|---|---|
| `export class BrowserFileUpload` | 72 | Classe de upload web |
| `private async doUpload(target, source: IWebkitDataTransfer, progress, token)` | 134 | Percorre entradas do drop |
| `private async doUploadEntry(entry, parentResource, target, progress, operation, token)` | 205 | Resolve entrada → recurso destino (lida com diretórios do OS) |
| `private async doUploadFileBuffered(resource, file, progressReporter, token)` | 315 | Escreve em blocos, reportando bytes |
| `export class ExternalFileImport` | 393 | Caminho desktop/Electron (não se aplica ao nosso produto web) |
| `private async doImport(...)` / `importResources(...)` | 431 / 509 | Import de recursos externos |

**Comportamentos obrigatórios extraídos:**
1. **Detecção de tipo**: o drop externo usa `IWebkitDataTransfer` (`DataTransferItem.webkitGetAsEntry()`), não apenas `files` — é o que permite **arrastar pastas inteiras**.
2. **Recursividade**: pastas do OS são percorridas criando a estrutura correspondente no destino.
3. **Progresso**: `IProgress<IProgressStep>` com contagem de arquivos e bytes (o VS Code mostra um *progress bar* no canto com “Uploading 12 files”).
4. **Confirmação de sobrescrita**: `getMultipleFilesOverwriteConfirm(...)` (importado em `explorerViewer.ts:57`) — quando há colisão, pergunta “Replace / Skip / Cancel”.
5. **Cancelamento**: `CancellationToken` — o usuário pode abortar no meio do upload.
6. **Destino**: pasta sob o cursor (se pasta) ou pasta-pai do item (se arquivo).
7. **Feedback visual de alvo**: `--vscode-list-dropBackground` + `toggleDropEffect(dataTransfer, 'copy', ...)` (`dnd.ts:641`).

**VALIDAÇÃO (`VAL-EXP-09`):** arrastar 1 arquivo de 2 MB do SO → aparece na árvore e no disco com conteúdo idêntico (hash); arrastar pasta com 20 arquivos → estrutura replicada; arrastar sobre arquivo existente → diálogo de sobrescrita; cancelar no meio → estado consistente (nenhum arquivo parcial).

---

## 3. Download para a máquina local (o “diferencial” do vídeo)

O VS Code main **implementa** e expõe no menu de contexto. Evidências literais:

| Símbolo | Arquivo:linha |
|---|---|
| `export const DOWNLOAD_COMMAND_ID = 'explorer.download';` | `fileActions.ts:74` |
| `export const DOWNLOAD_LABEL = nls.localize('download', "Download...");` | `fileActions.ts:75` |
| `const downloadFileHandler = async (accessor) => { ... }` | `fileActions.ts:1073` |
| `registerAction2(... id: DOWNLOAD_COMMAND_ID, handler: downloadFileHandler)` | `fileActions.ts:1093-1094` |
| Item no menu de contexto (grupo `5b_importexport`, ordem 10) | `fileActions.contribution.ts:586-602` |
| Registro do comando | `fileActions.contribution.ts:573-574` |
| `export class FileDownload` | `fileImportExport.ts:598` |
| `private static readonly LAST_USED_DOWNLOAD_PATH_STORAGE_KEY = 'workbench.explorer.downloadPath'` | `fileImportExport.ts:600` |
| `download(source: ExplorerItem[])` | `fileImportExport.ts:612` |
| `private async doDownload(sources, progress, cts)` | `fileImportExport.ts:633` |
| `private async doDownloadBrowser(resource, progress, cts)` | `fileImportExport.ts:652` |
| `private async downloadFileBufferedBrowser(resource, target, operation, token)` | `fileImportExport.ts:707` |
| `private async downloadFileUnbufferedBrowser(resource, target, operation, token)` | `fileImportExport.ts:743` |
| `private async downloadFolderBrowser(folder, targetFolder, operation, token)` | `fileImportExport.ts:772` |
| `private async doDownloadNative(...)` | `fileImportExport.ts:818` |
| `maxBlobDownloadSize` (limite para download em blob único) | `fileImportExport.ts:696` |

**Comportamento detalhado (browser):**
1. **Arquivo →** `showSaveFilePicker()` (File System Access API) obtém um `FileSystemWritableFileStream`; o conteúdo é lido do `FileService` e escrito em stream (**sem carregar tudo em memória** quando o provedor suporta stream; senão, buffered respeitando `maxBlobDownloadSize`).
2. **Pasta →** `showDirectoryPicker()` e `downloadFolderBrowser` recria a árvore recursivamente no diretório escolhido.
3. **Fallback sem File System Access →** download por blob (`triggerDownload` de `base/browser/dom.ts`, importado em `fileImportExport.ts:26`) — abre o “Salvar como…” do navegador.
4. **Progresso** por arquivo e total (`IDownloadOperation { filesDownloaded, totalBytesDownloaded, fileBytesDownloaded }`, linhas 587-596).
5. **Memória de destino**: última pasta usada é gravada em `workbench.explorer.downloadPath` (linha 600).
6. **Multi-seleção**: `download(source: ExplorerItem[])` aceita N itens.

**Requisito de produto (`[SPEC]`):**
- item **“Download…”** no menu de contexto com ícone `codicon-download`;
- multi-seleção → baixa todos (arquivo por arquivo, com progresso agregado);
- pasta → mantém estrutura relativa;
- nome padrão = nome do recurso; colisão local resolve pelo próprio SO;
- **nunca** bloquear a UI (operação assíncrona com progresso e cancelamento).

**Nota de compatibilidade:** `File System Access API` (`showSaveFilePicker`, `showDirectoryPicker`) exige Chromium e contexto seguro (HTTPS ou `localhost`). Em produção, o workbench precisa **detectar suporte** — exatamente como o VS Code faz com `WebFileSystemAccess.supported(mainWindow)` e a context key `HasWebFileSystemAccess` (`fileActions.contribution.ts:598`).

**VALIDAÇÃO (`VAL-EXP-07`):**
- [ ] baixar arquivo de texto → conteúdo idêntico ao do servidor;
- [ ] baixar binário de ~50 MB → sucesso, progresso visível, sem travar a UI;
- [ ] baixar pasta com 3 níveis → estrutura preservada;
- [ ] em navegador sem File System Access → cai no fallback de blob;
- [ ] baixar com multi-seleção de 5 arquivos → 5 arquivos salvos.

---

## 4. DnD interno (mover/copiar com regra de colisão)

- **VISUAL:** item arrastado com `opacity 0.5`; pasta-alvo com fundo `--vscode-list-dropBackground`; cursor `copy` ou `move` conforme modificador (`Alt` alterna copiar/mover no VS Code).
- **COMPORTAMENTO:** soltar em pasta = mover (ou copiar com `Alt`); soltar sobre arquivo = move para a pasta-pai do arquivo; colisão → diálogo “Replace/Skip”; confirmação global controlada pelo setting `explorer.confirmDragAndDrop` (`[E-vscode]` `explorerViewer.ts:1572` → `CONFIRM_DND_SETTING_KEY = 'explorer.confirmDragAndDrop'`).
- **EVENTO:** `move`/`copy` no `FileSystemPort` → `fs.changed { kind: 'rename' }` (a árvore **não** recarrega tudo: atualiza o ramo).
- **VALIDAÇÃO (`VAL-EXP-10`):** mover arquivo entre pastas → árvore e disco coerentes; copiar com `Alt` → origem preservada; colisão → diálogo; `Esc` durante o arrasto → nenhuma operação.

---

## 5. O que precisa existir no contrato (`FileSystemPort`)

`[E-projeto]` contrato atual (`platform/packages/contracts/filesystem.ts`) tem: `list`, `readFile`, `writeFile(atomic)`, `move`, `remove`, `watch`.

`[SPEC]` A FASE 4 exige **ampliar** para cobrir o vídeo (proposta completa em `04_10` §1):

```ts
export interface FileSystemPort {
  list(input: { uri: WorkspaceUri }): Promise<FileNode[]>;
  readFile(input: { uri: WorkspaceUri }): Promise<{ content: string; encoding: 'utf-8' }>;
  writeFile(input: { uri: WorkspaceUri; content: string; atomic: true }): Promise<void>;
  move(input: { from: WorkspaceUri; to: WorkspaceUri }): Promise<void>;
  copy(input: { from: WorkspaceUri; to: WorkspaceUri }): Promise<void>;      // NOVO (Cut/Copy/Paste)
  remove(input: { uri: WorkspaceUri; recursive?: boolean; useTrash?: boolean }): Promise<void>;
  createFile(input: { uri: WorkspaceUri; content?: string }): Promise<void>; // NOVO
  createFolder(input: { uri: WorkspaceUri }): Promise<void>;                 // NOVO
  watch(input: { uri: WorkspaceUri }): Promise<{ watcherId: string }>;

  // NOVOS — transferência entre navegador e máquina local
  download(input: { uris: WorkspaceUri[]; destination?: 'picker' | 'blob' }): Promise<DownloadResult>;
  upload(input: { target: WorkspaceUri; entries: UploadEntry[]; onProgress?: (p: UploadProgress) => void; token?: CancellationToken }): Promise<UploadResult>;
  stat(input: { uri: WorkspaceUri }): Promise<FileNodeStat>;                 // NOVO (tamanho/mtime p/ download e outline)
}
```

**Regras de integridade já vigentes que continuam valendo:** escrita atômica obrigatória (`atomic: true`), `ResourceQueue`/`Barrier` (serialização por recurso — `[E-vscode]` engenharia reversa `06B` §3), zero escrita parcial em falha (`RNF-VAL-04`).

---

## 6. Segurança (obrigatório documentar)

| Risco | Mitigação |
|---|---|
| Path traversal em upload (`../`) | validar e normalizar URI no `FileSystemPort`; rejeitar `..` em qualquer segmento (o `restore_to_zip.py` do projeto já usa a mesma defesa) |
| Sobrescrita silenciosa | confirmação explícita por arquivo/grupo |
| Download de arquivo gigante | stream + limite configurável (equivalente a `maxBlobDownloadSize`) |
| Upload de milhares de arquivos | limite de concorrência + progresso + cancelamento |
| Conteúdo executável | nunca executar automaticamente; apenas gravar |

---

## 7. Eventos desta área (contrato)

| Evento | Payload | Consumidores |
|---|---|---|
| `fs.uploadStarted` | `{ target, totalFiles, totalBytes }` | status bar, notificações |
| `fs.uploadProgress` | `{ file, uploadedBytes }` | progress UI |
| `fs.uploadFinished` | `{ target, filesCreated }` | explorer (refresh do ramo) |
| `fs.downloadStarted/Progress/Finished` | `{ uris, ... }` | progress UI |
| `fs.changed` | `{ kind, uri }` | explorer, editor, outline, timeline |
