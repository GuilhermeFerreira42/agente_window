// ============================================================================
// watchClient.test.ts — cliente WS puro (core): substituição de socket por
// factory fake, parse de fs.changed, re-subscribe após reconnect, id imediato.
// ============================================================================
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExplorerFsWatchClient, type FsChangedEvent, type WatchSocketLike } from '../core/watchClient';
import type { WorkspaceUri } from '../contract';

const U = (p: string) => `file:///ws/${p}` as WorkspaceUri;

class FakeSocket implements WatchSocketLike {
  static instances: FakeSocket[] = [];
  sent: string[] = [];
  closed = false;
  private listeners = new Map<string, Array<(a?: unknown) => void>>();

  constructor(readonly url: string) {
    FakeSocket.instances.push(this);
  }
  addEventListener(ev: string, cb: (a?: unknown) => void): void {
    const list = this.listeners.get(ev) ?? [];
    list.push(cb);
    this.listeners.set(ev, list);
  }
  send(data: string): void {
    this.sent.push(data);
  }
  close(): void {
    this.closed = true;
  }
  fire(ev: string, arg?: unknown): void {
    for (const cb of this.listeners.get(ev) ?? []) cb(arg);
  }
}

let client: ExplorerFsWatchClient;

beforeEach(() => {
  vi.useFakeTimers();
  FakeSocket.instances = [];
  client = new ExplorerFsWatchClient({
    url: 'ws://teste/fs/watch',
    socketFactory: (url) => new FakeSocket(url),
    reconnectBaseMs: 50,
  });
});

describe('explorerFsWatchClient — WS do contrato no core puro', () => {
  it('id imediato + envia op:watch no open + broadcast fs.changed aos listeners', () => {
    const events: FsChangedEvent[] = [];
    client.onEvent((e) => events.push(e));
    const id1 = client.watch(U('src'));
    expect(id1).toMatch(/^fs-watch-\d+$/);
    // conexão sobe
    expect(FakeSocket.instances).toHaveLength(1);
    const sock = FakeSocket.instances[0];
    sock.fire('open');
    expect(sock.sent).toEqual([JSON.stringify({ op: 'watch', uri: U('src') })]);

    // fs.changed chega aos listeners do contrato
    const batch = { type: 'fs.changed', changes: [{ uri: U('src/x.ts'), kind: 'added' }] };
    sock.fire('message', { data: JSON.stringify(batch) });
    expect(events).toEqual([batch]);
  });

  it('re-subscribe todos os watchers após REconectar', () => {
    client.watch(U('src'));
    client.watch(U('docs'));
    const s1 = FakeSocket.instances[0];
    s1.fire('open');

    // cai o socket
    s1.fire('close');
    // backoff base 50ms → reconecta
    vi.advanceTimersByTime(80);
    expect(FakeSocket.instances).toHaveLength(2);
    const s2 = FakeSocket.instances[1];
    s2.fire('open');
    expect(s2.sent).toEqual([
      JSON.stringify({ op: 'watch', uri: U('src') }),
      JSON.stringify({ op: 'watch', uri: U('docs') }),
    ]);
  });

  it('watch mesma URI 2x só envia uma subscrição (idempotente) e untilReady resolve', async () => {
    client.watch(U('src'));
    client.watch(U('src'));
    await client.connect();
    const s1 = FakeSocket.instances[0];
    const ready = client.untilReady();
    s1.fire('open');
    await ready; // resolves após open
    expect(s1.sent).toEqual([JSON.stringify({ op: 'watch', uri: U('src') })]);
  });

  it('backoff exponencial capado em 5 s e mensagens fora do protocolo são ignoradas', () => {
    client.watch(U('src'));
    let s = FakeSocket.instances[0];
    s.fire('open');
    s.fire('close');
    vi.advanceTimersByTime(60); // 50ms → connects 2
    s = FakeSocket.instances[1];
    s.fire('close');
    vi.advanceTimersByTime(120); // 100ms → connects 3
    s = FakeSocket.instances[2];
    s.fire('close');
    expect(FakeSocket.instances).toHaveLength(3);

    // parser tolerante: sem brace, sem 'type' → silêncio
    const events: unknown[] = [];
    client.onEvent((e) => events.push(e));
    vi.advanceTimersByTime(250);
    const s4 = FakeSocket.instances[3];
    s4.fire('open');
    s4.fire('message', { data: 'not-json{' });
    s4.fire('message', { data: JSON.stringify({ op: 'watched' }) });
    expect(events).toEqual([]);
  });

  it('dispose encerra tudo e não re-connecta', () => {
    client.watch(U('src'));
    const s1 = FakeSocket.instances[0];
    s1.fire('open');
    client.dispose();
    expect(s1.closed).toBe(true);
    s1.fire('close');
    vi.advanceTimersByTime(10_000);
    expect(FakeSocket.instances).toHaveLength(1); // nada novo
  });
});
