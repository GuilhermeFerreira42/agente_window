// ============================================================================
// modules/explorer-search/core/treeState.ts — Estado da árvore (lazy loading).
// Fonte upstream (7debcd0e): ExplorerDataSource (views/explorerViewer.ts:92)
// — carrega apenas o ramo expandido; re-expandir NÃO relê o disco (A2.1).
//   Estado de expansão/seleção vive aqui (não no modelo, não na UI).
// Sem React/DOM/fs — I/O só via deps.fs (FileSystemPortLike) injetado.
// ============================================================================
import type { FileSystemPortLike, SortOrder, WorkspaceUri } from '../contract';
import { compareExplorerItems } from './sorter';
import { EXPLORER_DEFAULT_EXCLUDES } from './constants';

const EXPLORER_EXCLUDED_NAMES: ReadonlySet<string> = new Set<string>(EXPLORER_DEFAULT_EXCLUDES);
import { ExplorerItem } from './explorerModel';
import { uriIsEqualOrParent, uriJoinPath, uriPath, uriRelative } from './uri';

const MAX_CONCURRENT_STATS = 64;
type FileStat = Awaited<ReturnType<FileSystemPortLike['stat']>>;
type PendingStat = {
  generation: number;
  uri: WorkspaceUri;
  resolve(value: FileStat | undefined): void;
  reject(error: unknown): void;
};
type Resolution = { generation: number; promise: Promise<ExplorerItem[]> };

export interface VisibleExplorerRow {
  item: ExplorerItem;
  depth: number;
}

/** Estado de apresentação da árvore: expansão, seleção, lazy loading. */
export class TreeState {
  private readonly expanded = new Set<WorkspaceUri>();
  private readonly selected = new Set<WorkspaceUri>();
  private focusUri: WorkspaceUri | null = null;
  private generation = 0;
  private activeStats = 0;
  private readonly pendingStats: PendingStat[] = [];
  private readonly resolutions = new Map<WorkspaceUri, Resolution>();

  constructor(
    private readonly fs: FileSystemPortLike,
    private readonly getSortOrder: () => SortOrder,
  ) {}

  // ---- expansão ----
  get expandedUris(): ReadonlySet<WorkspaceUri> {
    return this.expanded;
  }
  isExpanded(uri: WorkspaceUri): boolean {
    return this.expanded.has(uri);
  }
  expand(item: ExplorerItem): void {
    if (item.isDirectory) this.expanded.add(item.resource);
  }
  collapse(item: ExplorerItem): void {
    // colapsar um nó esconde também os descendentes — igual ao VS Code
    const toRemove: WorkspaceUri[] = [];
    for (const uri of this.expanded) {
      if (uri === item.resource || uriPath(uri).startsWith(`${uriPath(item.resource)}/`)) {
        toRemove.push(uri);
      }
    }
    for (const uri of toRemove) this.expanded.delete(uri);
  }
  collapseAll(): void {
    this.expanded.clear();
  }

  /** Remove do set de expansão tudo que estiver sob `uri` (sem tocar no modelo). */
  dropExpandedUnder(uri: WorkspaceUri): void {
    for (const e of [...this.expanded]) {
      if (uriIsEqualOrParent(e, uri)) this.expanded.delete(e);
    }
  }

  /** Rename/move: traduz URIs expandidos e selecionados de `from` p/ `to`
   *  (preserva expansão parcial de sub-árvores — espelho da reindexação
   *  upstream de fileService.updateResourceCache). */
  remapUrisUnder(from: WorkspaceUri, to: WorkspaceUri): void {
    const remap = (u: WorkspaceUri): WorkspaceUri => {
      if (!uriIsEqualOrParent(u, from)) return u;
      const rel = uriRelative(from, u) ?? '';
      return rel === '' ? to : uriJoinPath(to, rel);
    };
    const expanded = [...this.expanded].map(remap);
    this.expanded.clear();
    for (const u of expanded) this.expanded.add(u);
    const selected = [...this.selected].map(remap);
    this.selected.clear();
    for (const u of selected) this.selected.add(u);
    if (this.focusUri) this.focusUri = remap(this.focusUri);
  }

  // ---- seleção ----
  get selectedUris(): ReadonlySet<WorkspaceUri> {
    return this.selected;
  }
  get focusedUri(): WorkspaceUri | null {
    return this.focusUri;
  }
  select(uris: WorkspaceUri[], focus?: WorkspaceUri): void {
    this.selected.clear();
    for (const u of uris) this.selected.add(u);
    this.focusUri = focus ?? uris[uris.length - 1] ?? null;
  }
  toggleSelect(uri: WorkspaceUri): void {
    if (this.selected.has(uri)) {
      this.selected.delete(uri);
      if (this.focusUri === uri) this.focusUri = null;
    } else {
      this.selected.add(uri);
      this.focusUri = uri;
    }
  }
  clearSelection(): void {
    this.selected.clear();
    this.focusUri = null;
  }
  resetForRoot(): void {
    this.expanded.clear();
    this.clearSelection();
  }
  getSelection(): WorkspaceUri[] {
    return [...this.selected];
  }

  // ---- lazy loading + shared stat queue (port ExplorerDataSource:92) ----
  /** Invalida trabalho não iniciado e torna obsoletos resultados em voo.
   *  Operações de filesystem já iniciadas terminam normalmente para liberar
   *  seus slots; nenhum resultado de uma geração antiga é aplicado à árvore. */
  beginGeneration(): number {
    this.generation++;
    this.resolutions.clear();
    const retained: PendingStat[] = [];
    for (const task of this.pendingStats) {
      if (task.generation === this.generation) retained.push(task);
      else task.resolve(undefined);
    }
    this.pendingStats.length = 0;
    this.pendingStats.push(...retained);
    this.drainStats();
    return this.generation;
  }

  get currentGeneration(): number {
    return this.generation;
  }

  isCurrentGeneration(generation: number): boolean {
    return generation === this.generation;
  }

  /** Usa a mesma fila limitada para stats de raiz e metadados dos filhos. */
  stat(uri: WorkspaceUri, generation = this.generation): Promise<FileStat | undefined> {
    if (!this.isCurrentGeneration(generation)) return Promise.resolve(undefined);
    return new Promise<FileStat | undefined>((resolve, reject) => {
      this.pendingStats.push({ generation, uri, resolve, reject });
      this.drainStats();
    });
  }

  private drainStats(): void {
    while (this.activeStats < MAX_CONCURRENT_STATS && this.pendingStats.length > 0) {
      const task = this.pendingStats.shift()!;
      if (!this.isCurrentGeneration(task.generation)) {
        task.resolve(undefined);
        continue;
      }
      this.activeStats++;
      void Promise.resolve()
        .then(() => this.fs.stat({ uri: task.uri }))
        .then(
          (result) => task.resolve(this.isCurrentGeneration(task.generation) ? result : undefined),
          (error: unknown) => {
            if (this.isCurrentGeneration(task.generation)) task.reject(error);
            else task.resolve(undefined);
          },
        )
        .finally(() => {
          this.activeStats--;
          this.drainStats();
        });
    }
  }

  /** Resolve filhos de um item UMA vez por diretório; chamadas concorrentes
   *  compartilham a mesma listagem e os mesmos stats. */
  ensureResolved(item: ExplorerItem, generation = this.generation): Promise<ExplorerItem[]> {
    if (!item.isDirectory || !this.isCurrentGeneration(generation)) return Promise.resolve([]);
    if (item.isDirectoryResolved) return Promise.resolve(this.childrenOf(item));
    const existing = this.resolutions.get(item.resource);
    if (existing?.generation === generation) return existing.promise;

    const promise = this.resolveDirectory(item, generation);
    this.resolutions.set(item.resource, { generation, promise });
    void promise.then(
      () => { if (this.resolutions.get(item.resource)?.promise === promise) this.resolutions.delete(item.resource); },
      () => { if (this.resolutions.get(item.resource)?.promise === promise) this.resolutions.delete(item.resource); },
    );
    return promise;
  }

  private async resolveDirectory(item: ExplorerItem, generation: number): Promise<ExplorerItem[]> {
    const entries = (await this.fs.list({ uri: item.resource }))
      .filter((e) => !EXPLORER_EXCLUDED_NAMES.has(e.name));
    if (!this.isCurrentGeneration(generation)) return [];
    // Enrich metadata with bounded complete operations. A failed stat preserves
    // the existing fallback (undefined mtime/readonly); fixtures with failures
    // are not considered N/N metadata-complete in the acceptance harness.
    const stats = await Promise.all(
      entries.map(async (e): Promise<readonly [WorkspaceUri, { mtimeMs: number; readonly: boolean } | undefined]> => {
        try {
          const stat = await this.stat(e.uri, generation);
          if (!stat) return [e.uri, undefined] as const;
          return [e.uri, { mtimeMs: stat.mtimeMs, readonly: stat.readonly }] as const;
        } catch {
          return [e.uri, undefined] as const;
        }
      }),
    );
    if (!this.isCurrentGeneration(generation)) return [];
    const statByUri = new Map(stats);
    item.children.clear();
    for (const entry of entries) {
      const stat = statByUri.get(entry.uri);
      item.addChild(
        new ExplorerItem(
          { uri: entry.uri, name: entry.name, kind: entry.kind, mtimeMs: stat?.mtimeMs, readonly: stat?.readonly },
          item,
        ),
      );
    }
    item._isDirectoryResolved = true;
    item.error = undefined;
    return this.childrenOf(item);
  }

  /** Filhos ordenados pelo sortOrder atual (semântica FileSorter). */
  childrenOf(item: ExplorerItem): ExplorerItem[] {
    return [...item.children.values()].sort(
      compareExplorerItems(this.getSortOrder()),
    );
  }

  /** Espelho do fluxo de explorerService.select (resolveTo): resolve a cadeia
   *  inteira de diretórios até o item e a expande. */
  async resolveAndExpandAncestors(item: ExplorerItem): Promise<void> {
    const chain: ExplorerItem[] = [];
    let cur: ExplorerItem | undefined = item;
    while (cur && !cur.isRoot) {
      chain.unshift(cur);
      cur = cur.parent;
    }
    let n: ExplorerItem = item.root;
    this.expand(n);
    for (const step of chain) {
      await this.ensureResolved(n);
      const next = n.getChild(step.name);
      if (!next) return;
      n = next;
      this.expand(n);
      await this.ensureResolved(n);
    }
  }

  /** Linhas visíveis da árvore (flatten para a UI — 22 px fica na 4.4). */
  visibleRows(root: ExplorerItem | null): VisibleExplorerRow[] {
    if (!root) return [];
    const rows: VisibleExplorerRow[] = [{ item: root, depth: 0 }];
    const walk = (item: ExplorerItem, depth: number) => {
      for (const child of this.childrenOf(item)) {
        rows.push({ item: child, depth });
        if (child.isDirectory && this.isExpanded(child.resource)) {
          walk(child, depth + 1);
        }
      }
    };
    if (this.isExpanded(root.resource)) walk(root, 1);
    return rows;
  }
}
