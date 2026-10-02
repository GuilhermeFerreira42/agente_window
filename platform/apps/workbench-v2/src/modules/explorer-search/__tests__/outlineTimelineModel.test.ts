// 5.6 — núcleo puro do Outline/Timeline (flatten, kinds, tempo relativo, lados do diff).
import { describe, expect, it } from 'vitest';
import { flattenSymbols, symbolAtLine, symbolKindName } from '../core/outline/outlineModel';
import { relativeTime, resolveCommitDiff, toTimelineItems, type TimelinePortLike } from '../core/timeline/timelineModel';
import { BrowserTimelinePort } from '../core/timeline/browserTimelinePort';
import type { WorkspaceUri } from '../contract';

const rng = (l1: number, l2 = l1) => ({ startLineNumber: l1, startColumn: 1, endLineNumber: l2, endColumn: 1 });

describe('outlineModel', () => {
  it('achata em pré-ordem, ordenado por posição, com depth e kind em kebab', () => {
    const rows = flattenSymbols([
      { name: 'helper', kind: 11, range: rng(6, 8), selectionRange: rng(6) },
      { name: 'Greeter', kind: 4, range: rng(1, 4), selectionRange: rng(1), children: [
        { name: 'greet', kind: 5, range: rng(3), selectionRange: rng(3) },
        { name: 'name', kind: 6, range: rng(2), selectionRange: rng(2) },
      ] },
    ]);
    expect(rows.map((r) => [r.name, r.depth, r.kind, r.line])).toEqual([
      ['Greeter', 0, 'class', 1], ['name', 1, 'property', 2], ['greet', 1, 'method', 3], ['helper', 0, 'function', 6],
    ]);
    expect(new Set(rows.map((r) => r.id)).size).toBe(4);
  });
  it('symbolKindName cobre a tabela e cai em misc', () => {
    expect(symbolKindName(8)).toBe('constructor'); expect(symbolKindName(21)).toBe('enum-member'); expect(symbolKindName(99)).toBe('misc');
  });
  it('symbolAtLine devolve o mais interno', () => {
    const rows = flattenSymbols([{ name: 'A', kind: 4, range: rng(1, 10), selectionRange: rng(1), children: [{ name: 'm', kind: 5, range: rng(3, 5), selectionRange: rng(3) }] }]);
    expect(symbolAtLine(rows, 4)).toBe(rows[1].id); expect(symbolAtLine(rows, 8)).toBe(rows[0].id); expect(symbolAtLine(rows, 20)).toBeNull();
  });
});

describe('timelineModel', () => {
  const now = 1_700_000_000_000;
  it('relativeTime como fromNow do VS Code', () => {
    expect(relativeTime(now - 5_000, now)).toBe('now');
    expect(relativeTime(now - 45_000, now)).toBe('45 secs ago');
    expect(relativeTime(now - 60_000, now)).toBe('1 min ago');
    expect(relativeTime(now - 3 * 3_600_000, now)).toBe('3 hrs ago');
    expect(relativeTime(now - 2 * 86_400_000, now)).toBe('2 days ago');
    expect(relativeTime(now - 400 * 86_400_000, now)).toBe('1 yr ago');
  });
  it('toTimelineItems: mais novo primeiro, título nome (sha7), pai do inicial null', () => {
    const items = toTimelineItems([
      { sha: 'a'.repeat(40), parents: [], author: 'A', timestamp: now - 86_400_000, message: 'first' },
      { sha: 'b'.repeat(40), parents: ['a'.repeat(40)], author: 'B', timestamp: now, message: 'second' },
    ], 'hist.txt', now);
    expect(items.map((i) => i.label)).toEqual(['second', 'first']);
    expect(items[0].title).toBe('hist.txt (bbbbbbb)'); expect(items[0].parentSha).toBe('a'.repeat(40)); expect(items[1].parentSha).toBeNull();
    expect(items[0].relative).toBe('now'); expect(items[1].relative).toBe('1 day ago');
  });
  it('resolveCommitDiff: pai:arquivo × sha:arquivo; inicial → original vazio', async () => {
    const calls: string[] = [];
    const port: TimelinePortLike = { log: async () => [], showAt: async (_r, _u, sha) => { calls.push(sha); return `content@${sha}`; } };
    const items = toTimelineItems([{ sha: 'b'.repeat(40), parents: ['a'.repeat(40)], author: '', timestamp: now, message: 'x' }, { sha: 'a'.repeat(40), parents: [], author: '', timestamp: now - 1, message: 'y' }], 'f', now);
    const d1 = await resolveCommitDiff(port, 'file:///r' as WorkspaceUri, 'file:///r/f' as WorkspaceUri, items[0]);
    expect(d1).toEqual({ original: `content@${'a'.repeat(40)}`, modified: `content@${'b'.repeat(40)}`, title: 'f (bbbbbbb)' });
    const d2 = await resolveCommitDiff(port, 'file:///r' as WorkspaceUri, 'file:///r/f' as WorkspaceUri, items[1]);
    expect(d2.original).toBe(''); expect(d2.modified).toBe(`content@${'a'.repeat(40)}`);
    expect(calls).toHaveLength(3);
  });
  it('BrowserTimelinePort fala POST /git/log e /git/show com sha; erro carrega code/status', async () => {
    const seen: Array<{ url: string; body: unknown }> = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      seen.push({ url, body: JSON.parse(String(init.body)) });
      if (url.endsWith('/git/log')) return new Response(JSON.stringify({ entries: [{ sha: 'c'.repeat(40), parents: [], author: 'x', timestamp: 1, message: 'm' }] }), { status: 200 });
      if (url.endsWith('/git/show')) return new Response(JSON.stringify({ content: 'v1\n' }), { status: 200 });
      return new Response(JSON.stringify({ code: 'forbidden_path', message: 'fora' }), { status: 403, statusText: 'Forbidden' });
    }) as unknown as typeof fetch;
    const port = new BrowserTimelinePort('', fetchImpl);
    const log = await port.log('file:///r' as WorkspaceUri, 'file:///r/f' as WorkspaceUri);
    expect(log[0].sha).toBe('c'.repeat(40));
    expect(await port.showAt('file:///r' as WorkspaceUri, 'file:///r/f' as WorkspaceUri, 'c'.repeat(40))).toBe('v1\n');
    expect(seen[0]).toEqual({ url: '/git/log', body: { root: 'file:///r', uri: 'file:///r/f' } });
    expect(seen[1].body).toEqual({ root: 'file:///r', uri: 'file:///r/f', ref: 'c'.repeat(40) });
    await expect(new BrowserTimelinePort('', (async () => new Response(JSON.stringify({ code: 'forbidden_path', message: 'fora' }), { status: 403 })) as unknown as typeof fetch).log('file:///r' as WorkspaceUri, 'file:///x' as WorkspaceUri)).rejects.toMatchObject({ code: 'forbidden_path', status: 403 });
  });
});
