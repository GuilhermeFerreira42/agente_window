// ============================================================================
// editorService.test.ts — 4.7 c2. EditorService PURO (zero DOM): abas por
// sessão, preview único (editorGroupModel.ts), promoção por pin/edição,
// dirty por aba, MRU ao fechar, eventos editor.*/attach*.
// ============================================================================
import { describe, expect, it } from 'vitest';
import { EditorService } from '../core/editor/editorService';
import type { ExplorerSearchEvent, WorkspaceUri } from '../contract';

const A = 'file:///ws/a.ts' as WorkspaceUri;
const B = 'file:///ws/b.ts' as WorkspaceUri;
const C = 'file:///ws/c.ts' as WorkspaceUri;
const S1 = 'sess-1';
const S2 = 'sess-2';

function setup() {
  const svc = new EditorService();
  const events: ExplorerSearchEvent[] = [];
  svc.onEvent((e) => events.push(e));
  const types = () => events.map((e) => e.type);
  return { svc, events, types };
}

describe('EditorService — abas por sessão (04_05 §2.2)', () => {
  it('1. abrir 2 arquivos = 2 abas; a segunda fica ativa', () => {
    const { svc } = setup();
    svc.open({ sessionId: S1, uri: A, kind: 'code', pinned: true });
    svc.open({ sessionId: S1, uri: B, kind: 'code', pinned: true });
    expect(svc.getTabs(S1).map((t) => t.uri)).toEqual([A, B]);
    expect(svc.getActive(S1)?.uri).toBe(B);
  });

  it('2. mesma URI → foca a aba existente, não duplica', () => {
    const { svc, types } = setup();
    svc.open({ sessionId: S1, uri: A, kind: 'code', pinned: true });
    svc.open({ sessionId: S1, uri: B, kind: 'code', pinned: true });
    svc.open({ sessionId: S1, uri: A, kind: 'code' });
    expect(svc.getTabs(S1)).toHaveLength(2);
    expect(svc.getActive(S1)?.uri).toBe(A);
    expect(types().filter((t) => t === 'editor.tabOpened')).toHaveLength(2);
  });

  it('3. sessões são independentes: abas de S1 não aparecem em S2', () => {
    const { svc } = setup();
    svc.open({ sessionId: S1, uri: A, kind: 'code' });
    svc.open({ sessionId: S2, uri: B, kind: 'code' });
    expect(svc.getTabs(S1).map((t) => t.uri)).toEqual([A]);
    expect(svc.getTabs(S2).map((t) => t.uri)).toEqual([B]);
    expect(svc.getTabs('sess-vazia')).toEqual([]);
  });
});

describe('EditorService — preview único (editorGroupModel: clique simples)', () => {
  it('4. clique simples abre como preview; segundo preview SUBSTITUI o primeiro (mesma posição)', () => {
    const { svc, types } = setup();
    svc.open({ sessionId: S1, uri: A, kind: 'code' });
    expect(svc.getTabs(S1)[0]).toMatchObject({ uri: A, preview: true });
    svc.open({ sessionId: S1, uri: B, kind: 'code' });
    const tabs = svc.getTabs(S1);
    expect(tabs).toHaveLength(1);
    expect(tabs[0]).toMatchObject({ uri: B, preview: true, active: true });
    expect(types()).toContain('editor.tabClosed');
  });

  it('5. preview é substituído na posição dele, não no fim da fila', () => {
    const { svc } = setup();
    svc.open({ sessionId: S1, uri: A, kind: 'code', pinned: true });
    svc.open({ sessionId: S1, uri: B, kind: 'code' }); // preview no índice 1
    svc.open({ sessionId: S1, uri: C, kind: 'code', pinned: true });
    svc.open({ sessionId: S1, uri: 'file:///ws/d.ts' as WorkspaceUri, kind: 'code' });
    expect(svc.getTabs(S1).map((t) => t.uri)).toEqual([A, 'file:///ws/d.ts', C]);
  });

  it('6. pin (duplo clique) promove o preview; um novo preview então abre em nova aba', () => {
    const { svc } = setup();
    svc.open({ sessionId: S1, uri: A, kind: 'code' });
    svc.pin({ sessionId: S1, uri: A });
    expect(svc.getTabs(S1)[0].preview).toBe(false);
    svc.open({ sessionId: S1, uri: B, kind: 'code' });
    expect(svc.getTabs(S1).map((t) => t.uri)).toEqual([A, B]);
  });

  it('7. abrir a URI do preview com pinned:true promove sem duplicar', () => {
    const { svc } = setup();
    svc.open({ sessionId: S1, uri: A, kind: 'code' });
    svc.open({ sessionId: S1, uri: A, kind: 'code', pinned: true });
    expect(svc.getTabs(S1)).toHaveLength(1);
    expect(svc.getTabs(S1)[0].preview).toBe(false);
  });
});

describe('EditorService — dirty (04_05 §2.9)', () => {
  it('8. editar marca dirty, emite dirtyChanged e promove o preview a pinado', () => {
    const { svc, events } = setup();
    svc.open({ sessionId: S1, uri: A, kind: 'code' });
    svc.setDirty({ sessionId: S1, uri: A, dirty: true });
    expect(svc.getTabs(S1)[0]).toMatchObject({ dirty: true, preview: false });
    expect(events.find((e) => e.type === 'editor.dirtyChanged')).toMatchObject({ sessionId: S1, uri: A, dirty: true });
    // idempotente: mesmo valor não re-emite
    const n = events.length;
    svc.setDirty({ sessionId: S1, uri: A, dirty: true });
    expect(events.length).toBe(n);
  });

  it('9. fechar aba dirty sem force é BLOQUEADO (retorna false, aba continua) — c5 decide via diálogo', () => {
    const { svc } = setup();
    svc.open({ sessionId: S1, uri: A, kind: 'code' });
    svc.setDirty({ sessionId: S1, uri: A, dirty: true });
    expect(svc.close({ sessionId: S1, uri: A })).toBe(false);
    expect(svc.getTabs(S1)).toHaveLength(1);
    expect(svc.close({ sessionId: S1, uri: A, force: true })).toBe(true);
    expect(svc.getTabs(S1)).toHaveLength(0);
  });

  it('10. dirty NÃO é substituído por um novo preview (não perde edição)', () => {
    const { svc } = setup();
    svc.open({ sessionId: S1, uri: A, kind: 'code' });
    svc.setDirty({ sessionId: S1, uri: A, dirty: true });
    svc.open({ sessionId: S1, uri: B, kind: 'code' });
    expect(svc.getTabs(S1).map((t) => t.uri)).toEqual([A, B]);
  });
});

describe('EditorService — fechar / recolher (Regra 10 docs/18)', () => {
  it('11. fechar a ativa ativa a mais recentemente usada (MRU), como o VS Code', () => {
    const { svc } = setup();
    svc.open({ sessionId: S1, uri: A, kind: 'code', pinned: true });
    svc.open({ sessionId: S1, uri: B, kind: 'code', pinned: true });
    svc.open({ sessionId: S1, uri: C, kind: 'code', pinned: true });
    svc.activate({ sessionId: S1, uri: A });
    svc.activate({ sessionId: S1, uri: C });
    svc.close({ sessionId: S1, uri: C });
    expect(svc.getActive(S1)?.uri).toBe(A);
  });

  it('12. fechar a última aba emite editor.attachCollapsed (só display:none — quem esconde é o layout)', () => {
    const { svc, events } = setup();
    svc.open({ sessionId: S1, uri: A, kind: 'code' });
    expect(events.find((e) => e.type === 'editor.attachExpanded')).toMatchObject({ sessionId: S1 });
    svc.close({ sessionId: S1, uri: A });
    expect(events.find((e) => e.type === 'editor.attachCollapsed')).toMatchObject({ sessionId: S1 });
    expect(svc.getActive(S1)).toBeNull();
  });

  it('13. closeAll fecha só as limpas; com force fecha todas e recolhe', () => {
    const { svc, types } = setup();
    svc.open({ sessionId: S1, uri: A, kind: 'code', pinned: true });
    svc.open({ sessionId: S1, uri: B, kind: 'code', pinned: true });
    svc.setDirty({ sessionId: S1, uri: B, dirty: true });
    expect(svc.closeAll({ sessionId: S1 })).toBe(false);
    expect(svc.getTabs(S1).map((t) => t.uri)).toEqual([B]);
    expect(types()).not.toContain('editor.attachCollapsed');
    expect(svc.closeAll({ sessionId: S1, force: true })).toBe(true);
    expect(svc.getTabs(S1)).toEqual([]);
    expect(types()).toContain('editor.attachCollapsed');
  });

  it('14. open com line/column emite editor.revealRequested (consumido pelo pane no c4)', () => {
    const { svc, events } = setup();
    svc.open({ sessionId: S1, uri: A, kind: 'code', line: 12, column: 3 });
    expect(events.find((e) => e.type === 'editor.revealRequested')).toMatchObject({ sessionId: S1, uri: A, line: 12, column: 3 });
  });

  it('15. dispose limpa estado e para de emitir', () => {
    const { svc, events } = setup();
    svc.open({ sessionId: S1, uri: A, kind: 'code' });
    svc.dispose();
    const n = events.length;
    svc.open({ sessionId: S1, uri: B, kind: 'code' });
    expect(events.length).toBe(n);
  });
});

describe('EditorService — c5 save / conflito externo', () => {
  it('16. markSaved limpa dirty (dirtyChanged false) e emite editor.saved', () => {
    const { svc, events } = setup();
    svc.open({ sessionId: S1, uri: A, kind: 'code' });
    svc.setDirty({ sessionId: S1, uri: A, dirty: true });
    svc.markSaved({ sessionId: S1, uri: A });
    expect(svc.getTabs(S1)[0].dirty).toBe(false);
    expect(events.filter((e) => e.type === 'editor.dirtyChanged').pop()).toMatchObject({ dirty: false });
    expect(events.find((e) => e.type === 'editor.saved')).toMatchObject({ sessionId: S1, uri: A });
  });
  it('17. notifyExternalChange emite editor.externalChange por sessão com o estado dirty; URI fechada → nada', () => {
    const { svc, events } = setup();
    svc.open({ sessionId: S1, uri: A, kind: 'code', pinned: true });
    svc.open({ sessionId: S2, uri: A, kind: 'code', pinned: true });
    svc.setDirty({ sessionId: S2, uri: A, dirty: true });
    expect(svc.notifyExternalChange(A)).toEqual([{ sessionId: S1, dirty: false }, { sessionId: S2, dirty: true }]);
    expect(events.filter((e) => e.type === 'editor.externalChange')).toHaveLength(2);
    expect(svc.notifyExternalChange(B)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 4.7-b c2 — aba fixa "Changes" (kind: 'changes')
// ---------------------------------------------------------------------------
import { ATTACH_CHANGES_URI } from '../core/editor/editorService';
describe('EditorService — aba fixa "Changes" (4.7-b c2)', () => {
  const S = 's1';
  const f = (p: string) => `file:///ws/${p}` as WorkspaceUri;
  it('abre como primeira aba, não-preview, e continua primeira após abrir arquivos (preview e pinado)', () => {
    const svc = new EditorService();
    svc.open({ sessionId: S, uri: f('a.ts'), kind: 'code' });
    svc.open({ sessionId: S, uri: ATTACH_CHANGES_URI, kind: 'changes' });
    svc.open({ sessionId: S, uri: f('b.ts'), kind: 'code' });
    svc.open({ sessionId: S, uri: f('c.ts'), kind: 'code', pinned: true });
    const tabs = svc.getTabs(S);
    expect(tabs[0]).toMatchObject({ uri: ATTACH_CHANGES_URI, kind: 'changes', preview: false, dirty: false });
    expect(tabs.map((t) => t.uri)).toEqual([ATTACH_CHANGES_URI, f('b.ts'), f('c.ts')]); // a.ts (preview) foi substituída por b.ts
    expect(svc.hasChanges(S)).toBe(true);
  });
  it('é única por sessão (reabrir só ativa) e nunca fica dirty', () => {
    const svc = new EditorService();
    svc.open({ sessionId: S, uri: ATTACH_CHANGES_URI, kind: 'changes' });
    svc.open({ sessionId: S, uri: f('a.ts'), kind: 'code' });
    svc.open({ sessionId: S, uri: ATTACH_CHANGES_URI, kind: 'changes' });
    expect(svc.getTabs(S).filter((t) => t.kind === 'changes')).toHaveLength(1);
    expect(svc.getActive(S)?.uri).toBe(ATTACH_CHANGES_URI);
    svc.setDirty({ sessionId: S, uri: ATTACH_CHANGES_URI, dirty: true });
    expect(svc.getTabs(S)[0].dirty).toBe(false);
  });
  it('closeAll fecha só os arquivos; Changes fica e o anexo NÃO recolhe; close explícito fecha e aí recolhe', () => {
    const svc = new EditorService();
    const ev: string[] = [];
    svc.onEvent((e) => ev.push(e.type));
    svc.open({ sessionId: S, uri: ATTACH_CHANGES_URI, kind: 'changes' });
    svc.open({ sessionId: S, uri: f('a.ts'), kind: 'code', pinned: true });
    expect(svc.closeAll({ sessionId: S })).toBe(true);
    expect(svc.getTabs(S).map((t) => t.kind)).toEqual(['changes']);
    expect(ev).not.toContain('editor.attachCollapsed');
    expect(svc.close({ sessionId: S, uri: ATTACH_CHANGES_URI })).toBe(true);
    expect(svc.getTabs(S)).toEqual([]);
    expect(ev).toContain('editor.attachCollapsed');
  });
  it('closeAll com arquivo dirty devolve false e mantém Changes + dirty', () => {
    const svc = new EditorService();
    svc.open({ sessionId: S, uri: ATTACH_CHANGES_URI, kind: 'changes' });
    svc.open({ sessionId: S, uri: f('a.ts'), kind: 'code', pinned: true });
    svc.setDirty({ sessionId: S, uri: f('a.ts'), dirty: true });
    expect(svc.closeAll({ sessionId: S })).toBe(false);
    expect(svc.getTabs(S).map((t) => t.uri)).toEqual([ATTACH_CHANGES_URI, f('a.ts')]);
  });
});
