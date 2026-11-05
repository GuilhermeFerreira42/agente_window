// 4.7-c c1 — EditorService: aba fixa "Diff" (04_21 §7).
import { describe, expect, it } from 'vitest';
import { ATTACH_CHANGES_URI, ATTACH_DIFF_URI, EditorService } from '../core/editor/editorService';
import type { ExplorerSearchEvent, WorkspaceUri } from '../contract';

const S = 's1';
const A = 'file:///w/a.ts' as WorkspaceUri;
const diffA = { resource: A, title: 'a.ts (Working Tree)', original: 'x', modified: 'y' };
const diffB = { resource: 'file:///w/b.ts' as WorkspaceUri, title: 'b.ts (Index)', original: '1', modified: '1' };

function mk() {
  const svc = new EditorService(); const ev: ExplorerSearchEvent[] = [];
  svc.onEvent((e) => ev.push(e)); return { svc, ev };
}

describe('EditorService — aba fixa Diff (4.7-c)', () => {
  it('abre 1 aba diff, não-preview, não-dirty, ativa, com payload', () => {
    const { svc, ev } = mk();
    svc.open({ sessionId: S, uri: ATTACH_DIFF_URI, kind: 'diff', diff: diffA });
    const tabs = svc.getTabs(S);
    expect(tabs).toHaveLength(1);
    expect(tabs[0]).toMatchObject({ kind: 'diff', preview: false, dirty: false, active: true, diff: diffA });
    expect(svc.getDiff(S)).toEqual(diffA);
    expect(ev.find((e) => e.type === 'editor.tabOpened')).toMatchObject({ kind: 'diff', preview: false });
  });
  it('sem payload não abre nada', () => {
    const { svc } = mk();
    svc.open({ sessionId: S, uri: ATTACH_DIFF_URI, kind: 'diff' });
    expect(svc.getTabs(S)).toHaveLength(0);
  });
  it('segundo open troca o payload na MESMA aba e emite editor.diffChanged', () => {
    const { svc, ev } = mk();
    svc.open({ sessionId: S, uri: ATTACH_DIFF_URI, kind: 'diff', diff: diffA });
    svc.open({ sessionId: S, uri: A, kind: 'code' });
    svc.open({ sessionId: S, uri: ATTACH_DIFF_URI, kind: 'diff', diff: diffB });
    expect(svc.getTabs(S).filter((t) => t.kind === 'diff')).toHaveLength(1);
    expect(svc.getDiff(S)).toEqual(diffB);
    expect(svc.getActive(S)?.uri).toBe(ATTACH_DIFF_URI);
    expect(ev.filter((e) => e.type === 'editor.diffChanged')).toHaveLength(1);
  });
  it('posiciona logo após Changes quando ela existe; senão em primeiro', () => {
    const { svc } = mk();
    svc.open({ sessionId: S, uri: A, kind: 'code' });
    svc.open({ sessionId: S, uri: ATTACH_DIFF_URI, kind: 'diff', diff: diffA });
    expect(svc.getTabs(S).map((t) => t.kind)).toEqual(['diff', 'code']);
    const { svc: s2 } = mk();
    s2.open({ sessionId: S, uri: A, kind: 'code' });
    s2.open({ sessionId: S, uri: ATTACH_CHANGES_URI, kind: 'changes' });
    s2.open({ sessionId: S, uri: ATTACH_DIFF_URI, kind: 'diff', diff: diffA });
    expect(s2.getTabs(S).map((t) => t.kind)).toEqual(['changes', 'diff', 'code']);
  });
  it('imune a Close All; fecha só por close explícito; setDirty ignorado', () => {
    const { svc } = mk();
    svc.open({ sessionId: S, uri: ATTACH_CHANGES_URI, kind: 'changes' });
    svc.open({ sessionId: S, uri: ATTACH_DIFF_URI, kind: 'diff', diff: diffA });
    svc.open({ sessionId: S, uri: A, kind: 'code' });
    expect(svc.closeAll({ sessionId: S })).toBe(true);
    expect(svc.getTabs(S).map((t) => t.kind)).toEqual(['changes', 'diff']);
    svc.setDirty({ sessionId: S, uri: ATTACH_DIFF_URI, dirty: true });
    expect(svc.getTabs(S)[1].dirty).toBe(false);
    svc.close({ sessionId: S, uri: ATTACH_DIFF_URI });
    expect(svc.getTabs(S).map((t) => t.kind)).toEqual(['changes']);
    expect(svc.getDiff(S)).toBeNull();
  });
  it('isolada por sessão', () => {
    const { svc } = mk();
    svc.open({ sessionId: S, uri: ATTACH_DIFF_URI, kind: 'diff', diff: diffA });
    expect(svc.getDiff('s2')).toBeNull();
  });
});
