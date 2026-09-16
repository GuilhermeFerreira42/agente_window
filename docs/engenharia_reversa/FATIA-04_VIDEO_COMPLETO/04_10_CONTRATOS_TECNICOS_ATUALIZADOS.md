# 04_10 — PROPOSTA DE ATUALIZAÇÃO DOS CONTRATOS (`docs/04`)

> **Natureza:** proposta documental. Nada foi alterado no código do projeto.
> **Regra do `docs/04`:** “Um contrato novo precisa nascer com tipo, dono e consumidor definidos” e “mudança de contrato exige revisão documental antes de implementação”.
> **Estado atual verificado** `[E-projeto]` em `platform/packages/contracts/`: `common.ts`, `filesystem.ts`, `explorer.ts`, `editor.ts` (+ `chat`, `commands`, `persistence`, `terminal`, `theme`, `workbench`).

---

## 1. `FileSystemPort` — ampliação (donos: Runtime; consumidores: Explorer, Editor, Search, Browser clone)

### 1.1 Estado atual (`platform/packages/contracts/filesystem.ts`)
```ts
export interface FileSystemPort {
  list(input: { uri: WorkspaceUri }): Promise<Array<FileNode>>;
  readFile(input: { uri: WorkspaceUri }): Promise<{ content: string; encoding: 'utf-8' }>;
  writeFile(input: { uri: WorkspaceUri; content: string; atomic: true }): Promise<void>;
  move(input: { from: WorkspaceUri; to: WorkspaceUri }): Promise<void>;
  remove(input: { uri: WorkspaceUri; recursive?: boolean }): Promise<void>;
  watch(input: { uri: WorkspaceUri }): Promise<{ watcherId: string }>;
}
```

### 1.2 Proposta (aditivo — não remove nada)
```ts
export interface FileNodeStat {
  uri: WorkspaceUri;
  name: string;
  kind: 'file' | 'directory';
  size: number;
  mtimeMs: number;
  readonly: boolean;
}

export interface UploadEntry {          // entrada vinda do DnD do SO
  relativePath: string;                 // preserva estrutura de pastas
  kind: 'file' | 'directory';
  file?: File;                          // File do DataTransfer (web)
}

export interface UploadProgress { filesTotal: number; filesDone: number; bytesTotal: number; bytesDone: number; currentName: string; }
export interface UploadResult   { filesCreated: number; bytesWritten: number; skipped: string[]; }

export interface DownloadResult { filesSaved: number; bytesWritten: number; cancelled: boolean; }

export interface FileSystemPort {
  // — existentes —
  list(input: { uri: WorkspaceUri }): Promise<Array<FileNode>>;
  readFile(input: { uri: WorkspaceUri }): Promise<{ content: string; encoding: 'utf-8' }>;
  writeFile(input: { uri: WorkspaceUri; content: string; atomic: true }): Promise<void>;
  move(input: { from: WorkspaceUri; to: WorkspaceUri }): Promise<void>;
  remove(input: { uri: WorkspaceUri; recursive?: boolean }): Promise<void>;
  watch(input: { uri: WorkspaceUri }): Promise<{ watcherId: string }>;

  // — NOVOS (FATIA-04) —
  stat(input: { uri: WorkspaceUri }): Promise<FileNodeStat>;
  createFile(input: { uri: WorkspaceUri; content?: string }): Promise<void>;
  createFolder(input: { uri: WorkspaceUri }): Promise<void>;
  copy(input: { from: WorkspaceUri; to: WorkspaceUri }): Promise<void>;
  download(input: { uris: WorkspaceUri[]; strategy?: 'auto' | 'save-picker' | 'directory-picker' | 'blob' }): Promise<DownloadResult>;
  upload(input: { target: WorkspaceUri; entries: UploadEntry[]; onProgress?: (p: UploadProgress) => void; conflict?: 'ask' | 'overwrite' | 'skip'; token?: CancellationToken }): Promise<UploadResult>;
  readFileBinary(input: { uri: WorkspaceUri; maxBytes?: number }): Promise<{ dataBase64: string; mime: string }>;
}
```

**Regras preservadas:** `atomic: true` obrigatório na escrita normal; serialização por recurso (fila/barreira); proibido escrever fora deste contrato (`docs/04` §5).

---

## 2. `ExplorerService` — ampliação (dono: Lógica; consumidores: UI do Explorer, comandos, menus)

### 2.1 Estado atual (`platform/packages/contracts/explorer.ts`)
```ts
setRoot, expand, collapse, open, reveal, refresh
```

### 2.2 Proposta
```ts
export type SortOrder = 'default' | 'name' | 'type' | 'modified';

export interface ExplorerService {
  // — existentes —
  setRoot(input: { uri: WorkspaceUri }): Promise<void>;
  expand(input: { uri: WorkspaceUri }): Promise<void>;
  collapse(input: { uri: WorkspaceUri }): Promise<void>;
  open(input: { uri: WorkspaceUri }): Promise<void>;          // delega a EditorService.open
  reveal(input: { uri: WorkspaceUri }): Promise<void>;        // expande ancestrais + foco
  refresh(input?: { uri?: WorkspaceUri }): Promise<void>;

  // — NOVOS (vídeo 3.1) —
  createFile(input: { uri: WorkspaceUri; content?: string }): Promise<void>;
  createFolder(input: { uri: WorkspaceUri }): Promise<void>;
  rename(input: { uri: WorkspaceUri; newName: string }): Promise<void>;
  delete(input: { uris: WorkspaceUri[]; useTrash?: boolean }): Promise<void>;
  cut(input: { uris: WorkspaceUri[] }): void;     // marca para colar
  copy(input: { uris: WorkspaceUri[] }): void;
  paste(input: { target: WorkspaceUri }): Promise<void>;
  download(input: { uris: WorkspaceUri[] }): Promise<DownloadResult>;
  upload(input: { target: WorkspaceUri; entries: UploadEntry[] }): Promise<UploadResult>;
  collapseAll(): void;
  setSortOrder(input: { order: SortOrder }): void;
  select(input: { uris: WorkspaceUri[] }): void;
  getSelection(): WorkspaceUri[];
  getClipboardState(): { kind: 'cut' | 'copy' | null; uris: WorkspaceUri[] };
}
```

**Regra inalterada:** o Explorer **não** lê/escreve arquivos — apenas coordena (`10F`).

---

## 3. `EditorService` — ampliação para **anexo lateral por sessão** (dono: Lógica; consumidores: Explorer, Chat, Search, Browser)

### 3.1 Estado atual (`platform/packages/contracts/editor.ts`)
```ts
EditorResource { uri; kind: 'code'|'browser'|'search'|'changes'|'diff'; title }
EditorService { open, close, split, reveal, save }
```

### 3.2 Proposta
```ts
export type EditorSurface = 'attach';           // FASE 4: somente o anexo lateral
export interface EditorResource {
  uri: WorkspaceUri | string;                    // browser pode usar URL http(s)
  kind: 'code' | 'browser' | 'search' | 'changes' | 'diff' | 'record';
  title: string;
  // novos:
  surface?: EditorSurface;                       // default 'attach'
  sessionId?: SessionId;                         // a que sessão a aba pertence
  pinned?: boolean;
}

export interface EditorAttachState {
  sessionId: SessionId;
  visible: boolean;                              // controla display: contents | none
  widthPx: number;
  openTabs: Array<{ uri: string; kind: EditorResource['kind']; dirty: boolean }>;
  activeTab?: string;
}

export interface EditorService {
  // — existentes —
  open(resource: EditorResource): Promise<void>;
  close(input: { uri: WorkspaceUri | string }): Promise<void>;
  split(input: { direction: 'horizontal' | 'vertical' }): void;
  reveal(input: { uri: WorkspaceUri; line?: number; column?: number }): Promise<void>;
  save(input: { uri: WorkspaceUri }): Promise<void>;

  // — NOVOS (vídeo 3.2) —
  closeAll(input: { sessionId: SessionId }): Promise<void>;
  closeOthers(input: { uri: string }): Promise<void>;
  getAttachState(input: { sessionId: SessionId }): EditorAttachState;
  setAttachWidth(input: { sessionId: SessionId; pixels: number }): void;   // clamp [280, 1200]
  setAttachVisible(input: { sessionId: SessionId; visible: boolean }): void; // NUNCA desmonta
}
```

**Contrato de recolhimento (obrigatório):** `setAttachVisible(false)` → `display: none` no wrapper, sem desmontar (espelho da Regra 10 do `docs/18`).

---

## 4. `SearchService` — novo (dono: Lógica; consumidores: anexo, comandos)

```ts
export interface SearchQuery { pattern: string; isRegExp?: boolean; isCaseSensitive?: boolean; isWholeWord?: boolean; include?: string; exclude?: string; }
export interface SearchMatch { uri: WorkspaceUri; line: number; column: number; preview: string; }
export interface SearchResult { matches: SearchMatch[]; fileCount: number; matchCount: number; truncated: boolean; }

export interface SearchService {
  search(input: { sessionId: SessionId; root: WorkspaceUri; query: SearchQuery; token?: CancellationToken }): Promise<SearchResult>;
  replaceAll(input: { sessionId: SessionId; root: WorkspaceUri; query: SearchQuery; replacement: string }): Promise<{ files: number; replacements: number }>;
}
```

---

## 5. `BrowserPort` / `BrowserSessionService` — novo (**crítico**, vídeo 3.3/3.4)

> Contrato completo em `04_07` §3. Resumo dos pontos de integração:

```ts
export interface BrowserSessionService {
  open(input: { sessionId: SessionId; url: string }): Promise<{ pageId: BrowserPageId; summary: BrowserPageSummary }>;
  list(input: { sessionId: SessionId }): Promise<Array<{ pageId: BrowserPageId; url: string; title: string; active: boolean }>>;
  read(input: { sessionId: SessionId; pageId: BrowserPageId }): Promise<BrowserPageSummary>;   // DOM + visual
  html(input: { sessionId: SessionId; pageId: BrowserPageId; selector?: string }): Promise<{ html: string; bytes: number }>;
  screenshot(...): Promise<{ mime: 'image/png'; dataBase64: string }>;
  navigate(...): Promise<BrowserPageSummary>;
  click/type/hover/drag/handleDialog(...): Promise<void>;
  invoke<T>(input: { sessionId: SessionId; pageId: BrowserPageId; fnDef: string; args?: unknown[]; timeoutMs?: number }): Promise<T>;
  record(input: { sessionId: SessionId; pageId: BrowserPageId; action: 'start' | 'stop' }): Promise<{ videoUri?: WorkspaceUri }>;
  onEvent(listener: (e: BrowserEvent) => void): () => void;
}
```

**Onde vive:** `platform/apps/workbench/src/logic/browser/` (serviço) + `platform/services/browser-runtime/` (Playwright/Chromium) + `platform/packages/contracts/browser.ts` (tipos).
**Tools para a IA:** registradas como `ToolDescriptor` em `platform/packages/tools-sdk/` com nomes idênticos aos canônicos do VS Code (`openBrowserPage`, `readPage`, `clickElement`, …) — ver `04_07` §3.1.

---

## 6. Eventos — adições ao `docs/04` (tabela “Eventos mínimos do sistema”)

| Evento | Emissor | Consumidores |
|---|---|---|
| `explorer.nodeExpanded` / `nodeCollapsed` / `allCollapsed` | ExplorerService | UI da árvore |
| `explorer.selectionChanged` | ExplorerService | menus, timeline, outline, comandos |
| `explorer.fileOpened` | ExplorerService | EditorService, chat de contexto |
| `editor.attachOpened` / `attachCollapsed` / `attachResized` | EditorService | WorkbenchLayoutService, UI |
| `editor.resourceRenamed` / `resourceDeleted` | EditorService | Explorer, abas, breadcrumbs |
| `search.started/progress/finished/cancelled/replaceApplied` | SearchService | widget de busca |
| `browser.loaded/navigated/closed/dialog/recording.*` | BrowserSessionService | anexo, chat, timeline |
| `fs.uploadStarted/Progress/Finished`, `fs.downloadStarted/Progress/Finished` | FileSystemPort | status bar, explorer, notificações |
| `fs.changed` (existente) | watcher | Explorer, Editor, Outline, Timeline |

---

## 7. Impacto em contratos existentes (matriz de compatibilidade)

| Contrato | Mudança | Quebra compatibilidade? | Ação necessária |
|---|---|---|---|
| `FileSystemPort` | aditivo (novos métodos) | ❌ | atualizar implementações (browser/node) |
| `ExplorerService` | aditivo | ❌ | UI e comandos passam a usar |
| `EditorService` | aditivo + `surface`/`sessionId` | ⚠️ leve (novos campos opcionais) | default `surface: 'attach'` para não quebrar chamadas antigas |
| `SearchService` | **novo** | — | criar contrato + serviço |
| `BrowserSessionService` | **novo** | — | criar contrato + serviço + runtime |
| `ToolDescriptor` | sem mudança de forma | ❌ | registrar novas tools com `requiresApproval` |

**Proibições do `docs/04` que continuam valendo:** `any` em porta de serviço; contrato sem dono/consumidor; evento com mais de um produtor; escrever arquivo fora do `FileSystemPort`.

---

## 8. Eixos cobertos (VISUAL / COMPORTAMENTO / EVENTO / VALIDAÇÃO)

| Eixo | Onde está |
|---|---|
| **VISUAL** | Contratos não descrevem pixels: a camada visual está em `04_01`, `04_05` §1, `04_06` §2 e `04_07` §1; este documento define apenas os **tipos** que a UI consome. |
| **COMPORTAMENTO** | §1–§5 — assinaturas e regras preservadas de cada porta/serviço (atomicidade, coordenação sem I/O, recolher sem desmontar, escopo de sessão). |
| **EVENTO** | §6 — tabela de eventos novos (`explorer.*`, `editor.attach*`, `search.*`, `browser.*`, `fs.upload*/download*`) com emissor e consumidores. |
| **VALIDAÇÃO** | §7 — matriz de compatibilidade (o que quebra, o que é aditivo) + regra “contrato novo precisa de dono e consumidor” + proibições herdadas do `docs/04`. |
