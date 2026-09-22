// ============================================================================
// fakeFs.ts — FileSystemPortLike em memória (puro, sem disco/DOM).
// Usado por todos os testes do core 4.2 (04_15 DoD: unit 100% com fs fake).
// ============================================================================
import type { FileSystemPortLike, WorkspaceUri } from '../contract';
import {
  asWorkspaceUri,
  uriBasename,
  uriDirname,
  uriIsEqualOrParent,
  uriPath,
} from '../core/uri';

type Node = {
  kind: 'file' | 'directory';
  mtimeMs: number;
  readonly: boolean;
};

export interface FakeFsOptions {
  /** conteúdo inicial (opcional) — utlizado em testes de stat/atomics na 4.3. */
  readonlySeed?: Record<string, boolean>;
}

export class FakeFsPort implements FileSystemPortLike {
  private readonly nodes = new Map<string, Node>(); // chave = path posix normalizado
  calls = { list: 0, stat: 0, move: 0, copy: 0, remove: 0, createFile: 0, createFolder: 0, readFile: 0 };
  private listeners: ((e: { type: 'fs.changed'; changes: Array<{ uri: WorkspaceUri; kind: 'added' | 'removed' | 'changed' }> }) => void)[] = [];

  constructor(private readonly rootUri: WorkspaceUri, private readonly opts: FakeFsOptions = {}) {
    this.mknode(uriPath(rootUri), 'directory');
  }

  /** API utilitária de setup (não faz parte da porta). */
  seed(paths: Array<{ path: string; kind: 'file' | 'directory'; mtimeMs?: number; readonly?: boolean }>): void {
    for (const p of paths) {
      this.mknode(p.path, p.kind, { mtimeMs: p.mtimeMs, readonly: p.readonly });
    }
  }

  private key(uri: WorkspaceUri): string {
    if (!uriIsEqualOrParent(uri, this.rootUri)) throw new Error(`fora da raiz: ${uri}`);
    return uriPath(uri);
  }

  private mknode(posixPath: string, kind: 'file' | 'directory', extra: { mtimeMs?: number; readonly?: boolean } = {}): void {
    this.nodes.set(posixPath, {
      kind,
      mtimeMs: extra.mtimeMs ?? Date.now(),
      readonly: extra.readonly ?? this.opts.readonlySeed?.[posixPath] ?? false,
    });
  }

  private get(uri: WorkspaceUri): Node {
    const node = this.nodes.get(this.key(uri));
    if (!node) throw Object.assign(new Error(`ENOENT: ${uri}`), { code: 'ENOENT' });
    return node;
  }

  private entriesOf(dir: WorkspaceUri): Array<{ uri: WorkspaceUri; name: string; kind: 'file' | 'directory' }> {
    const dirPath = uriPath(dir);
    const prefix = dirPath === '/' ? '/' : `${dirPath}/`;
    const out: Array<{ uri: WorkspaceUri; name: string; kind: 'file' | 'directory' }> = [];
    for (const [path, node] of this.nodes) {
      if (path === dirPath || !path.startsWith(prefix)) continue;
      const rest = path.slice(prefix.length);
      if (rest.includes('/')) continue; // apenas filhos diretos
      out.push({ uri: asWorkspaceUri(path), name: rest, kind: node.kind });
    }
    return out;
  }

  private ensureDir(uri: WorkspaceUri): void {
    if (this.get(uri).kind !== 'directory') throw Object.assign(new Error(`ENOTDIR: ${uri}`), { code: 'ENOTDIR' });
  }

  // ---- a porta congelada ----
  async list(input: { uri: WorkspaceUri }) {
    this.calls.list++;
    this.ensureDir(input.uri);
    return this.entriesOf(input.uri);
  }

  async stat(input: { uri: WorkspaceUri }) {
    this.calls.stat++;
    const node = this.get(input.uri);
    return {
      uri: input.uri,
      size: node.kind === 'file' ? 128 : 0,
      mtimeMs: node.mtimeMs,
      readonly: node.readonly,
      kind: node.kind,
    };
  }

  async readFile(input: { uri: WorkspaceUri }) {
    this.calls.readFile++;
    const node = this.get(input.uri);
    if (node.kind !== 'file') throw Object.assign(new Error(`EISDIR: ${input.uri}`), { code: 'EISDIR' });
    return { content: `<conteúdo fake de ${uriBasename(input.uri)}>`, encoding: 'utf-8' as const };
  }

  async readFileBinary() {
    return { dataBase64: '', mime: 'application/octet-stream' };
  }

  async writeFile(): Promise<void> {
    throw new Error('writeFile não usado nos testes do core (4.2)');
  }

  async createFile(input: { uri: WorkspaceUri; content?: string }) {
    this.calls.createFile++;
    const parent = this.get(uriDirname(input.uri));
    if (parent.kind !== 'directory') throw Object.assign(new Error('EROFS/ENOTDIR'), { code: 'ENOTDIR' });
    this.nodes.set(uriPath(input.uri), { kind: 'file', mtimeMs: Date.now(), readonly: false });
    this.fireChange([{ uri: input.uri, kind: 'added' }]);
  }

  async createFolder(input: { uri: WorkspaceUri }) {
    this.calls.createFolder++;
    const parent = this.get(uriDirname(input.uri));
    if (parent.kind !== 'directory') throw Object.assign(new Error('EROFS/ENOTDIR'), { code: 'ENOTDIR' });
    this.nodes.set(uriPath(input.uri), { kind: 'directory', mtimeMs: Date.now(), readonly: false });
    this.fireChange([{ uri: input.uri, kind: 'added' }]);
  }

  async copy(input: { from: WorkspaceUri; to: WorkspaceUri }) {
    this.calls.copy++;
    const src = this.get(input.from);
    this.get(uriDirname(input.to));
    this.nodes.set(uriPath(input.to), { ...src });
    if (src.kind === 'directory') {
      const prefix = `${uriPath(input.from)}/`;
      for (const [path, node] of [...this.nodes]) {
        if (!path.startsWith(prefix)) continue;
        this.nodes.set(`${uriPath(input.to)}${path.slice(uriPath(input.from).length)}`, { ...node });
      }
    }
    this.fireChange([{ uri: input.to, kind: 'added' }]);
  }

  async move(input: { from: WorkspaceUri; to: WorkspaceUri }) {
    this.calls.move++;
    const src = this.get(input.from);
    this.get(uriDirname(input.to));
    const moving = [...this.nodes].filter(([p]) => uriIsEqualOrParent(asWorkspaceUri(p), input.from));
    for (const [p] of moving) this.nodes.delete(p);
    for (const [p, node] of moving) {
      const rel = p.slice(uriPath(input.from).length);
      this.nodes.set(`${uriPath(input.to)}${rel}`, node);
    }
    void src;
    this.fireChange([{ uri: input.from, kind: 'removed' }, { uri: input.to, kind: 'added' }]);
  }

  async remove(input: { uri: WorkspaceUri; recursive?: boolean }) {
    this.calls.remove++;
    const node = this.get(input.uri);
    if (node.kind === 'directory' && !input.recursive) throw new Error('EISDIR sem recursive');
    for (const p of [...this.nodes.keys()]) {
      if (uriIsEqualOrParent(asWorkspaceUri(p), input.uri)) this.nodes.delete(p);
    }
    this.fireChange([{ uri: input.uri, kind: 'removed' }]);
  }

  async watch(): Promise<{ watcherId: string }> {
    return { watcherId: 'fake-watch' };
  }

  onEvent(cb: (e: { type: 'fs.changed'; changes: Array<{ uri: WorkspaceUri; kind: 'added' | 'removed' | 'changed' }> }) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((c) => c !== cb);
    };
  }

  private fireChange(changes: Array<{ uri: WorkspaceUri; kind: 'added' | 'removed' | 'changed' }>): void {
    for (const cb of this.listeners) cb({ type: 'fs.changed', changes });
  }
}
