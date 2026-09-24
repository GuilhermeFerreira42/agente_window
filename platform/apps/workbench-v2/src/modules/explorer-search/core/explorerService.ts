// ============================================================================
// modules/explorer-search/core/explorerService.ts — ExplorerService (port).
// Fonte upstream (7debcd0e):
//   workbench/contrib/files/browser/explorerService.ts:34 (class),
//   :153 sortOrderConfiguration, :240 findClosest, :244 findClosestRoot,
//   :297 select (auto-reveal com resolveTo), :342 refresh (forgetChildren),
//   :354+ onDidRunOperation (eventos CREATE/MOVE/DELETE/COPY).
// DESIGN LEGO: zero DI — recebe deps.fs pelo construtor; eventos via Emitter
// próprio; estado autoritativo no core (10F); sem React/DOM/fs.
//
// CONVENÇÃO DO CONTRATO (04_10 §1, congelada):
//  - createFile/createFolder recebem o URI FINAL do arquivo/pasta (já com o
//    nome digitado). A resolução Q3 (contexto arquivo → criar no PAI) é feita
//    pelo helper público `resolveCreateParent` usado pela UI 4.4 ao montar o
//    URI depois do input inline.
// ============================================================================
import type {
  ExplorerSearchEvent,
  FileSystemPortLike,
  IExplorerSearchApi,
  SortOrder,
  WorkspaceUri,
} from '../contract';
import { Emitter } from './emitter';
import { ExplorerItem, ExplorerModel } from './explorerModel';
import { TreeState } from './treeState';
import { collectDroppedFiles, uploadFiles } from './transfer/upload';
import { downloadFiles } from './transfer/download';
import {
  uriBasename,
  uriDirname,
  uriIsEqualOrParent,
  uriJoinPath,
  uriRelative,
} from './uri';

export type ClipboardKind = 'cut' | 'copy';

export class ExplorerService implements IExplorerSearchApi {
  private readonly model = new ExplorerModel();
  private readonly tree: TreeState;
  private readonly events = new Emitter<ExplorerSearchEvent>();
  private sortOrder: SortOrder = 'default';
  private clipboard: { kind: ClipboardKind | null; uris: WorkspaceUri[] } = {
    kind: null,
    uris: [],
  };
  private root: ExplorerItem | null = null;

  constructor(
    private readonly fs: FileSystemPortLike,
    transferOpts: { save?: (data: Blob, suggestedName: string) => Promise<void>; baseUrl?: string } = {},
  ) {
    this.transferSave = transferOpts.save;
    this.transferBaseUrl = transferOpts.baseUrl;
    this.tree = new TreeState(fs, () => this.sortOrder);
  }

  // ---- raiz ----
  async openFolder(input: { uri: WorkspaceUri }): Promise<void> {
    const stat = await this.fs.stat({ uri: input.uri });
    if (stat.kind !== 'directory') {
      throw new Error(`openFolder: "${input.uri}" não é uma pasta`);
    }
    this.model.clearRoot();
    this.root = this.model.setRoot({
      uri: input.uri,
      kind: 'directory',
      name: uriBasename(input.uri),
    });
    if (this.root) {
      await this.tree.ensureResolved(this.root);
      this.tree.expand(this.root);
    }
    this.events.fire({ type: 'explorer.rootChanged', uri: input.uri });
  }

  // ---- navegação ----
  async open(input: { uri: WorkspaceUri }): Promise<void> {
    const item = this.mustFind(input.uri);
    if (item.isDirectory) {
      if (this.tree.isExpanded(item.resource)) {
        this.tree.collapse(item);
        this.events.fire({ type: 'explorer.nodeCollapsed', uri: item.resource });
      } else {
        await this.tree.ensureResolved(item);
        this.tree.expand(item);
        this.events.fire({ type: 'explorer.nodeExpanded', uri: item.resource });
      }
      this.tree.select([item.resource], item.resource);
    } else {
      this.events.fire({ type: 'explorer.fileOpened', uri: input.uri });
      this.tree.select([input.uri], input.uri);
    }
    this.publishSelection();
  }

  async reveal(input: { uri: WorkspaceUri }): Promise<void> {
    const item = await this.resolvePath(input.uri);
    this.events.fire({ type: 'explorer.revealRequested', uri: input.uri });
    if (!item) return;
    await this.tree.resolveAndExpandAncestors(item);
    this.tree.select([item.resource], item.resource);
    this.publishSelection();
  }

  async refresh(options?: { uri?: WorkspaceUri }): Promise<void> {
    // espelho upstream explorerService.refresh (:342): forgetChildren (mantém
    // expansão e seleção — A2.6) seguido de re-resolve preguiçoso.
    if (!this.root) return;
    const target = options?.uri ? this.model.findClosest(options.uri) : this.root;
    if (!target) return;
    if (target.isDirectory) {
      target.forgetChildren();
      await this.tree.ensureResolved(target);
      // upstream tree.refresh(): descendentes expandidos são re-resolvidos
      // (senão a UI mostra a pasta aberta e vazia até novo clique).
      await this.resolveExpandedDescendants(target);
    }
  }

  private async resolveExpandedDescendants(dir: ExplorerItem): Promise<void> {
    for (const child of await this.tree.ensureResolved(dir)) {
      if (child.isDirectory && this.tree.isExpanded(child.resource)) {
        await this.resolveExpandedDescendants(child);
      }
    }
  }

  async expand(input: { uri: WorkspaceUri }): Promise<void> {
    const item = this.mustFind(input.uri);
    if (item.isDirectory) {
      await this.tree.ensureResolved(item);
      this.tree.expand(item);
      this.events.fire({ type: 'explorer.nodeExpanded', uri: item.resource });
    }
  }

  async collapse(input: { uri: WorkspaceUri }): Promise<void> {
    const item = this.mustFind(input.uri);
    this.tree.collapse(item);
    this.events.fire({ type: 'explorer.nodeCollapsed', uri: item.resource });
  }

  collapseAll(): void {
    this.tree.collapseAll();
    // VS Code (explorerView.collapseAll → tree.collapseAll): com uma única pasta
    // no workspace a raiz é o pane-header e permanece expandida — só os
    // descendentes colapsam. Sem isto a árvore ficaria vazia.
    if (this.root) this.tree.expand(this.root);
    this.events.fire({ type: 'explorer.allCollapsed' });
  }

  // ---- resolução Q3 (helper público em uso pela UI 4.4 e pelos testes) ----

  /** Dado o contexto (item clicado/selecionado), retorna a pasta onde uma
   *  criação Nova→ deve acontecer — Q3: arquivo clicado cria no pai. */
  resolveCreateParent(contextUri: WorkspaceUri): WorkspaceUri {
    const item = this.mustFind(contextUri);
    if (item.isDirectory) return item.resource;
    return item.parent?.resource ?? item.resource;
  }

  // ---- operações de arquivo (uri FINAL com nome — convenção do contrato) ----

  async createFile(input: { uri: WorkspaceUri }): Promise<void> {
    await this.resolveParentIfPossible(uriDirname(input.uri));
    await this.ensureNotExists(input.uri, 'explorer.create.conflict');
    await this.fs.createFile({ uri: input.uri, content: '' });
    await this.refreshAfterOp(uriDirname(input.uri));
    // VAL-EXP-04: a seleção acompanha o novo nó (VS Code: criar foca o criado).
    this.select({ uris: [input.uri] });
  }

  async createFolder(input: { uri: WorkspaceUri }): Promise<void> {
    await this.resolveParentIfPossible(uriDirname(input.uri));
    await this.ensureNotExists(input.uri, 'explorer.create.conflict');
    await this.fs.createFolder({ uri: input.uri });
    await this.refreshAfterOp(uriDirname(input.uri));
    this.select({ uris: [input.uri] });
  }

  private async ensureNotExists(uri: WorkspaceUri, code: string): Promise<void> {
    if (this.model.findClosest(uri)) {
      this.events.fire({
        type: 'error',
        code,
        message: `Já existe "${uriBasename(uri)}" em "${uriDirname(uri)}".`,
      });
      throw new ExplorerCreateConflictError(uri);
    }
  }

  async rename(input: { uri: WorkspaceUri; newName: string }): Promise<void> {
    const item = this.mustFind(input.uri);
    const to = uriJoinPath(uriDirname(input.uri), input.newName);
    if (input.newName !== item.name && item.parent) {
      // Detecção de conflito no estado do DISCO (pasta pai resolvida primeiro).
      await this.tree.ensureResolved(item.parent);
      if (item.parent.getChild(input.newName)) {
        this.events.fire({
          type: 'error',
          code: 'explorer.rename.conflict',
          message: `Já existe "${input.newName}" em "${uriDirname(to)}".`,
        });
        throw new ExplorerRenameConflictError(to);
      }
    }
    await this.fs.move({ from: input.uri, to });
    // Cascata de URIs no estado da árvore — expansão/seleção sobrevivem ao
    // rename de pastas (espelho do updateResourceCache upstream).
    this.tree.remapUrisUnder(input.uri, to);
    if (item.parent) item.parent.removeChild(item);
    await this.refreshAfterOp(uriDirname(to));
    this.publishSelection();
  }

  async remove(input: { uris: WorkspaceUri[]; useTrash?: boolean }): Promise<void> {
    for (const uri of input.uris) {
      const item = this.mustFind(uri);
      await this.fs.remove({ uri, recursive: item.isDirectory });
      if (item.parent) item.parent.removeChild(item);
      this.dropSelectionUnder(uri);
      this.dropExpandedUnder(uri);
      await this.refreshAfterOp(uriDirname(uri));
    }
    this.publishSelection();
  }

  private dropSelectionUnder(uri: WorkspaceUri): void {
    const remaining = this.tree
      .getSelection()
      .filter((s) => !uriIsEqualOrParent(s, uri));
    this.tree.select(remaining, remaining[remaining.length - 1]);
  }

  private dropExpandedUnder(uri: WorkspaceUri): void {
    this.tree.dropExpandedUnder(uri);
  }

  private readonly transferSave: ((data: Blob, suggestedName: string) => Promise<void>) | undefined;
  private readonly transferBaseUrl: string | undefined;

  /** 4.4 — upload do SO (delega ao core/transfer — port
   *  BrowserFileUpload). A VIEW faz upload com diálogo de conflito;
   *  por aqui, 'ask' sem dialog cai em 'skip' (serviço não tem UI). */
  async upload(input: { target: WorkspaceUri; entries: unknown[]; conflict: 'ask' | 'overwrite' | 'skip' }): Promise<void> {
    const records = await collectDroppedFiles(input.entries as ArrayLike<unknown>);
    const result = await uploadFiles({
      fs: this.fs,
      target: input.target,
      records,
      baseUrl: this.transferBaseUrl,
      conflict: input.conflict,
      askConflict: async () => 'skip',
      onProgress: (p) => this.events.fire({
        type: 'fs.uploadProgress',
        filesTotal: p.filesTotal, filesDone: p.filesDone,
        bytesDone: p.bytesDone, bytesTotal: p.bytesTotal,
        currentName: p.currentName,
      }),
    });
    this.events.fire({ type: 'fs.uploadFinished', filesCreated: result.filesCreated, skipped: result.skipped });
    await this.refresh({ uri: input.target }).catch(() => undefined);
  }

  /** 4.4 — download (delega ao core/transfer). A persistência em disco do
   *  cliente vem do `save` injetado na construção (factory passa saveBlob). */
  async download(input: { uris: WorkspaceUri[] }): Promise<void> {
    for (const uri of input.uris) this.events.fire({ type: 'fs.downloadStarted', uri });
    await downloadFiles({
      fs: this.fs,
      uris: input.uris,
      baseUrl: this.transferBaseUrl,
      save: this.transferSave ?? (async () => undefined),
    });
  }

  // ---- clipboard (cut/copy/paste) ----

  cut(input: { uris: WorkspaceUri[] }): void {
    this.tree.select(input.uris, input.uris[input.uris.length - 1]);
    this.clipboard = { kind: 'cut', uris: [...this.tree.getSelection()] };
    this.publishSelection();
  }

  copy(input: { uris: WorkspaceUri[] }): void {
    this.tree.select(input.uris, input.uris[input.uris.length - 1]);
    this.clipboard = { kind: 'copy', uris: [...this.tree.getSelection()] };
    this.publishSelection();
  }

  async paste(input: { target: WorkspaceUri }): Promise<void> {
    const kind = this.clipboard.kind;
    if (!kind || this.clipboard.uris.length === 0) return;
    // VS Code: colar sobre arquivo ≡ colar no pai (soft, sem diálogo).
    const context = this.mustFind(input.target);
    const target = context.isDirectory ? context : context.parent ?? context;
    if (target.isDirectory) await this.tree.ensureResolved(target);
    let pasted = 0;
    for (const srcUri of this.clipboard.uris) {
      const src = this.model.findClosest(srcUri);
      if (!src) continue;
      const dest = uriJoinPath(target.resource, src.name);
      if (target.getChild(src.name)) {
        // COLISÃO: o service devolve explicitamente (UI da 4.4 abre ConflictDialog).
        this.events.fire({
          type: 'error',
          code: 'explorer.paste.conflict',
          message: `Já existe "${src.name}" em "${target.resource}". Paste abortado`,
        });
        continue;
      }
      if (kind === 'copy') {
        await this.fs.copy({ from: srcUri, to: dest });
      } else {
        await this.fs.move({ from: srcUri, to: dest });
        // Move: desanexa localmente para não precisar reler a pasta de origem.
        if (src.parent) src.parent.removeChild(src);
      }
      pasted++;
    }
    if (kind === 'cut' && pasted > 0) this.clipboard = { kind: null, uris: [] };
    await this.refreshAfterOp(target.resource);
  }

  getClipboardState(): { kind: ClipboardKind | null; uris: WorkspaceUri[] } {
    return { kind: this.clipboard.kind, uris: [...this.clipboard.uris] };
  }

  // ---- seleção/sort/DnD ----

  select(input: { uris: WorkspaceUri[] }): void {
    const present = input.uris.filter((u) => !!this.model.findClosest(u));
    this.tree.select(present, present[present.length - 1]);
    this.publishSelection();
  }

  getSelection(): WorkspaceUri[] {
    return this.tree.getSelection();
  }

  setSortOrder(input: { order: SortOrder }): void {
    if (this.sortOrder === input.order) return;
    this.sortOrder = input.order;
    // UI re-rendera com o novo comparador no próximo row-rebuild (4.4).
  }

  getSortOrder(): SortOrder {
    return this.sortOrder;
  }

  /** Executa o plano de drop decidido pelo dndPolicy (move/copy) — separado
   *  para a decisão permanecer pura e testável. */
  async moveInto(input: { sources: WorkspaceUri[]; targetDir: WorkspaceUri }): Promise<void> {
    const target = this.mustFind(input.targetDir);
    if (target.isDirectory) await this.tree.ensureResolved(target);
    for (const srcUri of input.sources) {
      const src = this.model.findClosest(srcUri);
      if (!src) continue;
      const dest = uriJoinPath(target.resource, src.name);
      if (target.getChild(src.name)) {
        this.events.fire({
          type: 'error',
          code: 'explorer.move.conflict',
          message: `Já existe "${src.name}" em "${target.resource}".`,
        });
        continue;
      }
      await this.fs.move({ from: srcUri, to: dest });
      if (src.parent) src.parent.removeChild(src);
    }
    await this.refreshAfterOp(target.resource);
  }

  async copyInto(input: { sources: WorkspaceUri[]; targetDir: WorkspaceUri }): Promise<void> {
    const target = this.mustFind(input.targetDir);
    if (target.isDirectory) await this.tree.ensureResolved(target);
    for (const srcUri of input.sources) {
      const src = this.model.findClosest(srcUri);
      if (!src) continue;
      const dest = uriJoinPath(target.resource, src.name);
      if (target.getChild(src.name)) {
        this.events.fire({
          type: 'error',
          code: 'explorer.copy.conflict',
          message: `Já existe "${src.name}" em "${target.resource}".`,
        });
        continue;
      }
      await this.fs.copy({ from: srcUri, to: dest });
    }
    await this.refreshAfterOp(target.resource);
  }

  // ---- eventos públicos ----

  onEvent(cb: (e: ExplorerSearchEvent) => void): () => void {
    return this.events.add(cb);
  }

  private publishSelection(): void {
    this.events.fire({
      type: 'explorer.selectionChanged',
      uris: this.tree.getSelection(),
    });
  }

  // ---- helpers internos ----

  /** Resolve a pasta pai (se estiver no modelo) para a checagem de conflito
   *  refletir o disco, mesmo com lazy loading (A2.1). */
  private async resolveParentIfPossible(dirUri: WorkspaceUri): Promise<void> {
    const parent = this.model.findClosest(dirUri);
    if (parent?.isDirectory) await this.tree.ensureResolved(parent);
  }

  private mustFind(uri: WorkspaceUri): ExplorerItem {
    const item = this.model.findClosest(uri);
    if (!item) throw new Error(`Recurso não está no workspace: ${uri}`);
    return item;
  }

  private async resolvePath(uri: WorkspaceUri): Promise<ExplorerItem | null> {
    const existing = this.model.findClosest(uri);
    if (existing) return existing;
    if (!this.root) return null;
    if (!uriIsEqualOrParent(uri, this.root.resource)) return null;
    const rel = uriRelative(this.root.resource, uri);
    if (rel == null || rel === '') return this.root;
    let cur: ExplorerItem = this.root;
    this.tree.expand(cur);
    for (const part of rel.split('/')) {
      await this.tree.ensureResolved(cur);
      const next = cur.getChild(part);
      if (!next) return null;
      cur = next;
    }
    return cur;
  }

  private async refreshAfterOp(dirUri: WorkspaceUri): Promise<void> {
    const parent = this.model.findClosest(dirUri);
    if (parent) {
      parent.forgetChildren();
      await this.tree.ensureResolved(parent);
    } else if (this.root) {
      await this.refresh();
    }
  }

  // ---- portas de teste (NÃO vazar no barrel/contrato) ----
  // ---- consultas de apresentação (UI 4.4 — leitura imutável do estado) ----

  /** Raiz montada (null antes de openFolder). */
  getRootItem(): ExplorerItem | null {
    return this.root;
  }

  /** Linhas visíveis da apresentação (espelho do WorkbenchCompressibleAsyncDataTree
   *  flatten): profundidade + item, respeitando expansão e ordenação vigente. */
  getVisibleRows(): Array<{ item: ExplorerItem; depth: number }> {
    if (!this.root) return [];
    return this.tree.visibleRows(this.root);
  }

  /** Diretório encontrado sem lançar (usado pela UI para estados de drop). */
  findItem(uri: WorkspaceUri): ExplorerItem | null {
    return this.model.findClosest(uri) ?? null;
  }

  /** Expansão lida pela UI (renderer) — sem expor o TreeState interno. */
  isExpandedUri(uri: WorkspaceUri): boolean {
    return this.tree.isExpanded(uri);
  }

  getModelRoot(): ExplorerItem | null {
    return this.root;
  }
  getTreeForTests(): TreeState {
    return this.tree;
  }
  dispose(): void {
    this.events.dispose();
    this.model.clearRoot();
    this.root = null;
  }
}

export class ExplorerCreateConflictError extends Error {
  constructor(uri: WorkspaceUri) {
    super(`Conflito ao criar: ${uri}`);
    this.name = 'ExplorerCreateConflictError';
  }
}
export class ExplorerRenameConflictError extends Error {
  constructor(uri: WorkspaceUri) {
    super(`Conflito ao renomear para: ${uri}`);
    this.name = 'ExplorerRenameConflictError';
  }
}
