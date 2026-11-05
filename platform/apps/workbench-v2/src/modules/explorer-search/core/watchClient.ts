// ============================================================================
// modules/explorer-search/core/watchClient.ts — WS `fs.changed` do Single Port.
// Espelho upstream (7debcd0e): watchClient (versus remoteFileSystemProvider)
// — long-running WebSocket com re-subscribe ao reconectar. Subset: 1 socket,
// N inscrições de watch (id local imediato), broadcast de `fs.changed` do
// contrato em subscribers (o service que consome cria em 4.4+).
// Sem imports externos (core puro — FT-07): usa global `WebSocket` do browser
// (injetável via socketFactory em testes).
// ============================================================================
import type { WorkspaceUri } from '../contract';

export interface FsChangedEvent {
  type: 'fs.changed';
  changes: Array<{ uri: WorkspaceUri; kind: 'added' | 'removed' | 'changed' }>;
}

/** Subset de WebSocket usado (browser ou fake em testes). */
export interface WatchSocketLike {
  send(data: string): void;
  close(): void;
  addEventListener(ev: 'open' | 'message' | 'close' | 'error', cb: (arg?: unknown) => void): void;
}
export type WatchSocketFactory = (url: string) => WatchSocketLike;

export interface ExplorerFsWatchClientOptions {
  /** URL ws://.../fs/watch (default: deriva de location.host). */
  url?: string;
  socketFactory?: WatchSocketFactory;
  /** ms de backoff inicial (default 250ms, cap 5000ms). */
  reconnectBaseMs?: number;
}

function defaultWsUrl(): string {
  const loc = (globalThis as { location?: { host?: string; protocol?: string } }).location;
  const proto = loc?.protocol === 'https:' ? 'wss' : 'ws';
  const host = loc?.host ?? '127.0.0.1:5174';
  return `${proto}://${host}/fs/watch`;
}

export class ExplorerFsWatchClient {
  private readonly url: string;
  private readonly socketFactory: WatchSocketFactory;
  private readonly reconnectBaseMs: number;

  private socket: WatchSocketLike | undefined;
  private disposed = false;
  private readonly watchers = new Set<WorkspaceUri>();
  private readonly listeners = new Set<(e: FsChangedEvent) => void>();
  private counter = 0;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private readyListeners: (() => void)[] = [];

  constructor(options: ExplorerFsWatchClientOptions = {}) {
    this.url = options.url ?? defaultWsUrl();
    this.socketFactory =
      options.socketFactory ??
      ((url) => new WebSocket(url) as unknown as WatchSocketLike);
    this.reconnectBaseMs = options.reconnectBaseMs ?? 250;
  }

  /** Inscrição idempotente; resolve imediatamente com watcherId local. */
  watch(uri: WorkspaceUri): string {
    this.watchers.add(uri);
    if (this.socket && this.open) {
      this.send({ op: 'watch', uri });
    }
    // garante conexão subindo mesmo com watcher registrado depois
    this.connect();
    return `fs-watch-${++this.counter}`;
  }

  onEvent(cb: (e: FsChangedEvent) => void): () => void {
    this.listeners.add(cb);
    if (this.listeners.size > 0 && !this.socket && !this.disposed) this.connect();
    return () => this.listeners.delete(cb);
  }

  /** Subir a conexão (idempotente). */
  connect(): void {
    if (this.disposed || this.socket) return;
    const socket = this.socketFactory(this.url);
    this.socket = socket;
    this.openFlag = false;

    socket.addEventListener('open', () => {
      this.openFlag = true;
      this.reconnectAttempts = 0;
      // re-inscreve todos os watchers registrados (upstream: re-subscribe)
      for (const uri of this.watchers) this.send({ op: 'watch', uri });
      for (const ready of this.readyListeners.splice(0)) ready();
    });
    socket.addEventListener('message', (arg) => {
      try {
        const data = (arg as { data?: unknown })?.data ?? arg;
        const msg = JSON.parse(String(data)) as Record<string, unknown> & FsChangedEvent;
        if (msg?.type === 'fs.changed') {
          for (const cb of [...this.listeners]) cb(msg);
        }
      } catch {
        /* mensagem fora do protocolo — tolerante (upstream) */
      }
    });
    const handleDown = () => {
      this.openFlag = false;
      this.socket = undefined;
      this.scheduleReconnect();
    };
    socket.addEventListener('close', handleDown);
    socket.addEventListener('error', handleDown);
  }

  /** Promise que resolve na próxima conexão (usado em testes/health). */
  untilReady(): Promise<void> {
    if (this.open) return Promise.resolve();
    return new Promise((resolve) => this.readyListeners.push(resolve));
  }

  get open(): boolean {
    // Não temos readyState no subset: tratamos por flag de open no listener.
    return this.socket != null && this.openFlag;
  }

  private openFlag = false;

  private send(obj: Record<string, unknown>): void {
    if (this.open) {
      try {
        this.socket?.send(JSON.stringify(obj));
      } catch {
        /* cai — o reconnect re-subscreve */
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.disposed || this.reconnectTimer) return;
    const delay = Math.min(this.reconnectBaseMs * 2 ** this.reconnectAttempts++, 5000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      if (!this.disposed && (this.watchers.size > 0 || this.listeners.size > 0)) {
        this.connect();
      }
    }, delay);
  }

  dispose(): void {
    this.disposed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.socket?.close();
    this.socket = undefined;
    this.watchers.clear();
    this.listeners.clear();
    this.readyListeners = [];
  }
}
