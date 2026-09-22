// ============================================================================
// modules/explorer-search/core/explorerModel.ts — ExplorerModel/ExplorerItem (port).
// Fonte upstream (7debcd0e):
//   workbench/contrib/files/common/explorerModel.ts:26 (ExplorerModel),
//   :89 (ExplorerItem), :202 (static create), :233 (mergeLocalWithDisk),
//   :404 (removeChild/forgetChildren/move/updateResource), :461 (rename),
//   :474 (find). Carne pura: DI de IFileService/config trocada pelo adapter
//   FileSystemPort (deps.fs) injetado apenas no nível do service — aqui não há
//   I/O, só mecânica de árvore em memória. Sem React/DOM/fs.
// Subset (out-of-scope do vídeo): fileNesting, pastas comprimidas, symlinks-lock
// UX, multi-root (Q4). caseSensitivity = true (backend ext4, 4.3).
// ============================================================================
import type { WorkspaceUri } from '../contract';
import {
  asWorkspaceUri,
  uriBasename,
  uriEquals,
  uriIsEqualOrParent,
  uriJoinPath,
  uriPath,
} from './uri';

export interface ExplorerItemInit {
  uri: WorkspaceUri;
  name?: string;
  kind: 'file' | 'directory';
  mtimeMs?: number;
  readonly?: boolean;
}

export class ExplorerItem {
  /** usado em testes — espelho do `_isDirectoryResolved` upstream */
  _isDirectoryResolved = false;
  error: Error | undefined = undefined;

  private _parent: ExplorerItem | undefined;
  private _isDirectory: boolean;
  private _mtimeMs: number | undefined;
  private _readonly: boolean | undefined;
  private _name: string;
  private _resource: WorkspaceUri;

  private readonly _children = new Map<string, ExplorerItem>();

  constructor(init: ExplorerItemInit, parent?: ExplorerItem) {
    this._resource = asWorkspaceUri(uriPath(init.uri));
    this._name = init.name ?? uriBasename(this._resource);
    this._isDirectory = init.kind === 'directory';
    this._mtimeMs = init.mtimeMs;
    this._readonly = init.readonly;
    this._parent = parent;
  }

  // ---- getters portados ----
  get resource(): WorkspaceUri {
    return this._resource;
  }
  set resource(v: WorkspaceUri) {
    this._resource = asWorkspaceUri(uriPath(v));
  }
  get isDirectoryResolved(): boolean {
    return this._isDirectoryResolved;
  }
  get isDirectory(): boolean {
    return this._isDirectory;
  }
  get isReadonly(): boolean {
    return this._readonly === true;
  }
  get mtimeMs(): number | undefined {
    return this._mtimeMs;
  }
  get name(): string {
    return this._name;
  }
  get parent(): ExplorerItem | undefined {
    return this._parent;
  }
  get root(): ExplorerItem {
    if (!this._parent) return this;
    return this._parent.root;
  }
  get isRoot(): boolean {
    return this === this.root;
  }
  get children(): Map<string, ExplorerItem> {
    return this._children;
  }

  getId(): string {
    return `${this.root.resource}::${this._resource}`;
  }

  toString(): string {
    return `ExplorerItem: ${this._name}`;
  }

  // ---- criação/merge portados ----

  /** Porte upstream `ExplorerItem.create` (recursive). */
  static create(raw: ExplorerItemInit & { children?: ExplorerItemInitWithChildren[] }, parent?: ExplorerItem): ExplorerItem {
    const item = new ExplorerItem(raw, parent);
    if (item.isDirectory) {
      item._isDirectoryResolved = !!raw.children;
      if (raw.children) {
        for (const child of raw.children) {
          item.addChild(ExplorerItem.create(child, item));
        }
      }
    }
    return item;
  }

  /** Porte upstream `mergeLocalWithDisk` (explorerModel.ts:233): só mescla
   *  elementos resolvidos — protege dados locais não carregados. */
  static mergeLocalWithDisk(disk: ExplorerItem, local: ExplorerItem): void {
    if (disk.resource !== local.resource) return; // merge exige mesmo recurso

    const mergingDirectories = disk.isDirectory || local.isDirectory;
    if (mergingDirectories && local._isDirectoryResolved && !disk._isDirectoryResolved) {
      return; // não sobrescreve resolvido com não resolvido
    }

    local.resource = disk.resource;
    if (!local.isRoot) local.updateName(disk.name);
    local._isDirectory = disk.isDirectory;
    local._mtimeMs = disk._mtimeMs;
    local._isDirectoryResolved = disk._isDirectoryResolved;
    local._readonly = disk._readonly;
    local.error = disk.error;

    if (mergingDirectories && disk._isDirectoryResolved) {
      const oldLocalChildren = new Map<WorkspaceUri, ExplorerItem>();
      local.children.forEach((c) => oldLocalChildren.set(c.resource, c));

      local.children.clear();
      disk.children.forEach((diskChild) => {
        const former = oldLocalChildren.get(diskChild.resource);
        if (former) {
          ExplorerItem.mergeLocalWithDisk(diskChild, former);
          local.addChild(former);
          oldLocalChildren.delete(diskChild.resource);
        } else {
          local.addChild(ExplorerItem.create(snapshotOf(diskChild), local));
        }
      });
    }
  }

  /** Porte upstream `addChild` — chave platform-aware (aqui caseSensitive=true). */
  addChild(child: ExplorerItem): void {
    child._parent = this;
    child.updateResource(false);
    this._children.set(this.platformAwareName(child.name), child);
  }

  getChild(name: string): ExplorerItem | undefined {
    return this._children.get(this.platformAwareName(name));
  }

  removeChild(child: ExplorerItem): void {
    this._children.delete(this.platformAwareName(child.name));
  }

  forgetChildren(): void {
    this._children.clear();
    this._isDirectoryResolved = false;
  }

  private updateName(value: string): void {
    this._parent?.removeChild(this);
    this._name = value;
    this._parent?.addChild(this);
  }

  /** Porte upstream `move` — move o item para outra pasta (atualiza recurso recursivo). */
  move(newParent: ExplorerItem): void {
    this._parent?.removeChild(this);
    newParent.removeChild(this); // remove qualquer versão anterior mesmo nome
    newParent.addChild(this);
    this.updateResource(true);
  }

  private updateResource(recursive: boolean): void {
    if (this._parent) {
      this._resource = uriJoinPath(this._parent.resource, this._name);
    }
    if (recursive && this.isDirectory) {
      this.children.forEach((c) => c.updateResource(true));
    }
  }

  /** Porte upstream `rename` (merge de nome + atualização recursiva de path). */
  rename(renamed: { name: string; mtimeMs?: number }): void {
    this.updateName(renamed.name);
    this._mtimeMs = renamed.mtimeMs;
    this.updateResource(true);
  }

  /** Porte upstream `find` — retorna o item que casa com o recurso ou null.
   *  Implementado iterativamente sobre os segmentos do path. */
  find(resource: WorkspaceUri): ExplorerItem | null {
    if (this.resource === asWorkspaceUri(uriPath(resource))) return this;
    if (!uriIsEqualOrParent(resource, this.resource)) return null;
    // Se mergulhar num diretório não resolvido, não há filhos a buscar.
    const parts = uriPath(resource).slice(uriPath(this.resource).length).split('/').filter(Boolean);
    let node: ExplorerItem = this;
    for (const part of parts) {
      const next: ExplorerItem | undefined = node.getChild(part);
      if (!next) return null;
      node = next;
    }
    return node;
  }

  private platformAwareName(name: string): string {
    // Backend ext4 em linux (decisão 4.2): case-sensitive.
    return name;
  }
}

export interface ExplorerItemInitWithChildren extends ExplorerItemInit {
  children?: ExplorerItemInitWithChildren[] | undefined;
}

/** Cópia rasa para uso dentro do merge (não carrega filhos silenciosamente). */
function snapshotOf(item: ExplorerItem): ExplorerItemInitWithChildren {
  const init: ExplorerItemInitWithChildren = {
    uri: item.resource,
    name: item.name,
    kind: item.isDirectory ? 'directory' : 'file',
    mtimeMs: item.mtimeMs,
    readonly: item.isReadonly || undefined,
  };
  if (item.isDirectory && item._isDirectoryResolved) {
    init.children = [...item.children.values()].map(snapshotOf);
  }
  return init;
}

/** Porte upstream `ExplorerModel` (explorerModel.ts:26) — single-root (Q4). */
export class ExplorerModel {
  private _root: ExplorerItem | null = null;
  private readonly _onDidChangeRoot = () => undefined;

  get root(): ExplorerItem | null {
    return this._root;
  }
  get roots(): ExplorerItem[] {
    return this._root ? [this._root] : [];
  }

  setRoot(root: ExplorerItemInit): ExplorerItem {
    this._root = ExplorerItem.create({ ...root, kind: 'directory' });
    this._onDidChangeRoot();
    return this._root;
  }

  clearRoot(): void {
    this._root = null;
  }

  /** Porte upstream `findClosest` (com single-root simplifica para root.find). */
  findClosest(resource: WorkspaceUri): ExplorerItem | null {
    if (!this._root) return null;
    if (!uriIsEqualOrParent(resource, this._root.resource) && !uriEquals(resource, this._root.resource)) return null;
    return this._root.find(resource);
  }
}
