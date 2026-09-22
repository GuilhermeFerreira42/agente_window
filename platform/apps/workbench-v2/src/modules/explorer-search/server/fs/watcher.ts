// ============================================================================
// modules/explorer-search/server/fs/watcher.ts — ExplorerFsWatcher (backend)
// Watch do FS real + coalescência + lotes FsChangedBatch (04_15 4.3 DoD).
// Modos alinhados ao VS Code explorerView (A2.1):
//   - `lazy-per-dir` (DEFAULT): watchers seguem dirs listados/ensureWatch —
//     nunca a árvore toda. Defensivo em hosts compartilhados (inotify estoura
//     com node_modules; Vite/chokidar disputa o mesmo limite do kernel).
//   - `recursive` (opt-in via ExplorerFsWatcherOptions.recursive === true):
//     fs.watch recursivo na raiz; erro em runtime (ENOSPC) → fallback lazy.
// ============================================================================

import * as fs from 'node:fs';
import * as path from 'node:path';
import { toFsPath, toWorkspaceUri, type FsHost } from './fsHost';
import type { WorkspaceUri } from '../../contract';

/** Lote transmitido no WS /fs/watch — shape do contrato `fs.changed`. */
export interface FsChangedBatch {
  type: 'fs.changed';
  changes: Array<{ uri: WorkspaceUri; kind: 'added' | 'removed' | 'changed' }>;
}

/** Elemento de `FsChangedBatch.changes` (alias público do server barrel). */
export type FsChangedChange = FsChangedBatch['changes'][number];

type WatcherMode = 'recursive' | 'lazy-per-dir';

export interface ExplorerFsWatcherOptions {
  /** ms de coalescência (default 300 = WATCHER_COALESCE_MS). */
  coalesceMs?: number;
  /**
   * Tenta watch recursivo da raiz primeiro (Node ≥20 Linux/macOS/Windows).
   * DEFAULT FALSE — em hosts com inotify compartilhado o recursive sobre
   * árvores grandes (node_modules) estoura o limite do kernel e DERRUBA os
   * watchers dos outros processos (incl. o próprio Vite). Ativar apenas em
   * hosts dedicados/pequenos.
   */
  recursive?: boolean;
  /** Máx. de watchers lazy de diretório (default 128). */
  maxWatchers?: number;
}

const NOISE = /(^|[/\\])(\.git|node_modules|__pycache__|\.pytest_cache|\.tox|\.nox|\.venv|\.next|\.nuxt|\.turbo|\.cache|dist|out|target|coverage)([/\\]|$)/;

export class ExplorerFsWatcher {
  private readonly rootPath: string;
  private readonly coalesceMs: number;
  private readonly recursiveRequested: boolean;
  private readonly maxWatchers: number;

  private listeners = new Set<(batch: FsChangedBatch) => void>();
  private dirWatchers = new Map<string, fs.FSWatcher>(); // fsPath → watcher
  private rootWatcher: fs.FSWatcher | null = null;
  private pendingAdded = new Set<WorkspaceUri>();
  private pendingRemoved = new Set<WorkspaceUri>();
  private pendingChanged = new Set<WorkspaceUri>();
  private flushTimer: NodeJS.Timeout | null = null;
  private disposed = false;

  mode: WatcherMode = 'lazy-per-dir';

  constructor(host: FsHost, opts: ExplorerFsWatcherOptions = {}) {
    // FsHost já carrega a raiz como path absoluto resolvido (guarda traversal).
    this.rootPath = host.rootPath;
    this.coalesceMs = opts.coalesceMs ?? 300;
    this.recursiveRequested = opts.recursive === true;
    this.maxWatchers = opts.maxWatchers ?? 128;
  }

  /** Inicia o watch. Devolve o modo efetivo (testável). */
  start(): WatcherMode {
    if (this.recursiveRequested && this.tryRecursive()) {
      this.mode = 'recursive';
      return this.mode;
    }
    this.mode = 'lazy-per-dir';
    this.watchDir(this.rootPath); // raiz SEMPRE observada (necessário p/ E2E)
    return this.mode;
  }

  subscribe(cb: (batch: FsChangedBatch) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** A2.1: diretório listado passa a ser observado (modo lazy). */
  ensureWatch(uri: WorkspaceUri): void {
    if (this.disposed || this.mode !== 'lazy-per-dir') return;
    const fsPath = toFsPath(this.rootPath, uri);
    if (!this.isInside(fsPath) || NOISE.test(fsPath)) return;
    let stat: fs.Stats;
    try {
      stat = fs.statSync(fsPath);
    } catch {
      return; // arquivo ou inexistente — só dirs interessam
    }
    if (!stat.isDirectory()) return;
    this.watchDir(fsPath);
  }

  dispose(): void {
    this.disposed = true;
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.rootWatcher?.removeAllListeners();
    this.rootWatcher?.close();
    this.rootWatcher = null;
    for (const w of this.dirWatchers.values()) {
      w.removeAllListeners();
      w.close();
    }
    this.dirWatchers.clear();
    this.listeners.clear();
    this.pendingAdded.clear();
    this.pendingRemoved.clear();
    this.pendingChanged.clear();
  }

  // ------------------------------------------------------------------ interno

  private isInside(fsPath: string): boolean {
    return fsPath === this.rootPath || fsPath.startsWith(this.rootPath + path.sep);
  }

  /** fs.watch recursivo; 'error' em runtime (ENOSPC) → fallback lazy-per-dir. */
  private tryRecursive(): boolean {
    let w: fs.FSWatcher;
    try {
      w = fs.watch(this.rootPath, { recursive: true }, (event, filename) => {
        if (filename == null) return;
        this.handleEvent(event, path.join(this.rootPath, filename.toString()));
      });
    } catch {
      return false;
    }
    w.on('error', (err) => {
      const code = (err as NodeJS.ErrnoException)?.code ?? (err as Error)?.message ?? '';
      console.warn(
        `[explorer-fs-watcher] recursive falhou (${String(code)}) — fallback lazy-per-dir`,
      );
      w.removeAllListeners();
      w.close();
      if (this.rootWatcher === w) this.rootWatcher = null;
      if (!this.disposed && this.mode === 'recursive') {
        this.mode = 'lazy-per-dir';
        this.watchDir(this.rootPath);
      }
    });
    this.rootWatcher = w;
    return true;
  }

  private watchDir(fsDirPath: string): void {
    if (this.disposed) return;
    if (this.dirWatchers.has(fsDirPath)) return;
    if (this.dirWatchers.size >= this.maxWatchers) return;
    let w: fs.FSWatcher;
    try {
      w = fs.watch(fsDirPath, (event, filename) => {
        if (filename == null) return;
        this.handleEvent(event, path.join(fsDirPath, filename.toString()));
      });
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code ?? String(err);
      console.warn(`[explorer-fs-watcher] watch dir falhou (${String(code)}): ${fsDirPath}`);
      return;
    }
    w.on('error', (err) => {
      // Watcher individual falhou (dir removido / ENOSPC): descarta e segue.
      const code = (err as NodeJS.ErrnoException)?.code ?? (err as Error)?.message ?? '';
      console.warn(`[explorer-fs-watcher] watcher dir erro (${String(code)}): ${fsDirPath}`);
      w.removeAllListeners();
      w.close();
      this.dirWatchers.delete(fsDirPath);
    });
    this.dirWatchers.set(fsDirPath, w);
  }

  private handleEvent(event: string, fsPath: string): void {
    if (this.disposed) return;
    if (!this.isInside(fsPath) || NOISE.test(fsPath)) return; // filtro NA EMISSÃO
    const uri = toWorkspaceUri(this.rootPath, fsPath);
    if (event === 'rename') {
      // rename = added ou removed — decide por existência no disco.
      let exists = false;
      try {
        exists = fs.existsSync(fsPath);
      } catch {
        exists = false;
      }
      if (exists) {
        this.pendingRemoved.delete(uri);
        this.pendingAdded.add(uri);
      } else {
        this.pendingAdded.delete(uri);
        this.pendingRemoved.add(uri);
      }
    } else {
      // 'change'
      if (!this.pendingAdded.has(uri) && !this.pendingRemoved.has(uri)) {
        this.pendingChanged.add(uri);
      }
    }
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), this.coalesceMs);
      this.flushTimer.unref?.();
    }
  }

  private flush(): void {
    this.flushTimer = null;
    if (this.disposed || this.listeners.size === 0) {
      this.pendingAdded.clear();
      this.pendingRemoved.clear();
      this.pendingChanged.clear();
      return;
    }
    const changes: FsChangedBatch['changes'] = [];
    for (const uri of this.pendingAdded)
      if (!this.pendingRemoved.has(uri)) changes.push({ uri, kind: 'added' });
    for (const uri of this.pendingRemoved)
      if (!this.pendingAdded.has(uri)) changes.push({ uri, kind: 'removed' });
    for (const uri of this.pendingChanged)
      if (!this.pendingAdded.has(uri) && !this.pendingRemoved.has(uri))
        changes.push({ uri, kind: 'changed' });
    this.pendingAdded.clear();
    this.pendingRemoved.clear();
    this.pendingChanged.clear();
    if (changes.length === 0) return;
    const batch: FsChangedBatch = { type: 'fs.changed', changes };
    for (const cb of [...this.listeners]) {
      try {
        cb(batch);
      } catch {
        /* listener bugado não derruba o watcher */
      }
    }
  }
}
