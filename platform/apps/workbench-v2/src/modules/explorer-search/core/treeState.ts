// ============================================================================
// modules/explorer-search/core/treeState.ts — Estado da árvore (lazy loading).
// Fonte upstream (7debcd0e): ExplorerDataSource (views/explorerViewer.ts:92)
// — carrega apenas o ramo expandido; re-expandir NÃO relê o disco (A2.1).
//   Estado de expansão/seleção vive aqui (não no modelo, não na UI).
// Sem React/DOM/fs — I/O só via deps.fs (FileSystemPortLike) injetado.
// ============================================================================
import type { FileSystemPortLike, SortOrder, WorkspaceUri } from '../contract';
import { compareExplorerItems } from './sorter';
import { ExplorerItem } from './explorerModel';
import { uriIsEqualOrParent, uriJoinPath, uriPath, uriRelative } from './uri';

export interface VisibleExplorerRow {
  item: ExplorerItem;
  depth: number;
}

/** Estado de apresentação da árvore: expansão, seleção, lazy loading. */
export class TreeState {
  private readonly expanded = new Set<WorkspaceUri>();
  private readonly selected = new Set<WorkspaceUri>();
  private focusUri: WorkspaceUri | null = null;

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
  getSelection(): WorkspaceUri[] {
    return [...this.selected];
  }

  // ---- lazy loading (port ExplorerDataSource:92) ----
  /** Resolve filhos de um item do modelo UMA vez por diretório; chamadas
   *  subsequentes não relêem o disco (A2.1). */
  async ensureResolved(item: ExplorerItem): Promise<ExplorerItem[]> {
    if (!item.isDirectory) return []; // arquivos não têm filhos (guard p/ callers genéricos)
    if (item.isDirectoryResolved) return this.childrenOf(item);
    const entries = await this.fs.list({ uri: item.resource });
    // Upstream: IFileStat vem COMPLETO (mtime, readonly) de statDir. Nossa
    // lista (contrato congelado 04_10 §2.1) só carrega uri/name/kind — então
    // enriquecemos com stat() em lote (1x por diretório = A2.1) para o
    // FileSorter 'modified' e para a política readonly do DnD funcionarem.
    const stats = await Promise.all(
      entries.map(async (e): Promise<readonly [WorkspaceUri, { mtimeMs: number; readonly: boolean } | undefined]> => {
        try {
          const s = await this.fs.stat({ uri: e.uri });
          return [e.uri, { mtimeMs: s.mtimeMs, readonly: s.readonly }] as const;
        } catch {
          return [e.uri, undefined] as const;
        }
      }),
    );
    const statByUri = new Map(stats);
    item.children.clear();
    for (const e of entries) {
      const st = statByUri.get(e.uri);
      item.addChild(
        new ExplorerItem(
          { uri: e.uri, name: e.name, kind: e.kind, mtimeMs: st?.mtimeMs, readonly: st?.readonly },
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
