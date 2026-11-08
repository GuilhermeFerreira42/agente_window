import { describe, expect, it } from 'vitest';
import { EditorService, GRUPO_SECUNDARIO } from '../core/editor/editorService';
import type { WorkspaceUri } from '../contract';

const A = 'file:///fixture/a.md' as WorkspaceUri;
const B = 'file:///fixture/b.txt' as WorkspaceUri;
function setup() { const editor = new EditorService(); editor.open({ sessionId: 's1', uri: A, kind: 'code', pinned: true }); return editor; }
describe('D179: vistas de um arquivo e grupos vazios', () => {
  it('restaura duas vistas da mesma URI com apresentação independente', () => {
    const editor = new EditorService();
    editor.open({ sessionId: 's1', uri: A, kind: 'code', pinned: true, presentation: 'preview' });
    editor.open({ sessionId: GRUPO_SECUNDARIO('s1'), uri: A, kind: 'code', pinned: true, presentation: 'code' });
    expect(editor.getActive('s1')).toMatchObject({ uri: A, presentation: 'preview' });
    expect(editor.getActive(GRUPO_SECUNDARIO('s1'))).toMatchObject({ uri: A, presentation: 'code' });
    editor.setPresentation({ sessionId: 's1', uri: A, presentation: 'code' });
    editor.setPresentation({ sessionId: GRUPO_SECUNDARIO('s1'), uri: A, presentation: 'preview' });
    expect(editor.getActive('s1')?.presentation).toBe('code');
  });
  it('duplicar a vista mostra o mesmo arquivo nos dois grupos', () => {
    const editor = setup();
    expect(editor.duplicateToSide('s1')).toBe(GRUPO_SECUNDARIO('s1'));
    expect(editor.getActive('s1')?.uri).toBe(A);
    expect(editor.getActive(GRUPO_SECUNDARIO('s1'))?.uri).toBe(A);
  });
  it('dirty e saved são do arquivo na sessão, sem limpar outra sessão', () => {
    const editor = setup(); editor.duplicateToSide('s1');
    editor.open({ sessionId: 's2', uri: A, kind: 'code', pinned: true });
    editor.setDirty({ sessionId: GRUPO_SECUNDARIO('s1'), uri: A, dirty: true });
    editor.setDirty({ sessionId: 's2', uri: A, dirty: true });
    expect(editor.getActive('s1')?.dirty).toBe(true);
    editor.markSaved({ sessionId: 's1', uri: A });
    expect(editor.getActive(GRUPO_SECUNDARIO('s1'))?.dirty).toBe(false);
    expect(editor.getActive('s2')?.dirty).toBe(true);
  });
  it('fechar uma vista conserva dirty; a última exige decisão', () => {
    const editor = setup(); editor.duplicateToSide('s1');
    editor.setDirty({ sessionId: 's1', uri: A, dirty: true });
    expect(editor.close({ sessionId: GRUPO_SECUNDARIO('s1'), uri: A })).toBe(true);
    expect(editor.isSplit('s1')).toBe(false);
    expect(editor.close({ sessionId: 's1', uri: A })).toBe(false);
    expect(editor.getActive('s1')?.dirty).toBe(true);
  });
  it('último arquivo fechado não deixa divisão vazia', () => {
    const editor = setup(); editor.split('s1');
    editor.close({ sessionId: 's1', uri: A });
    expect(editor.isSplit('s1')).toBe(false);
    expect(editor.groupIds('s1')).toEqual(['s1']);
  });
  it('fechar o principal vazio promove os arquivos restantes sem descartá-los', () => {
    const editor = setup(); editor.split('s1');
    editor.open({ sessionId: GRUPO_SECUNDARIO('s1'), uri: B, kind: 'code', pinned: true });
    editor.setDirty({ sessionId: GRUPO_SECUNDARIO('s1'), uri: B, dirty: true });
    editor.close({ sessionId: 's1', uri: A });
    expect(editor.isSplit('s1')).toBe(false);
    expect(editor.getActive('s1')).toMatchObject({ uri: B, dirty: true });
  });
  it('fechar divisão com vista duplicada não descarta o rascunho principal', () => {
    const editor = setup(); editor.duplicateToSide('s1');
    editor.setDirty({ sessionId: 's1', uri: A, dirty: true });
    expect(editor.unsplit({ sessionId: 's1' })).toBe(true);
    expect(editor.getActive('s1')?.dirty).toBe(true);
  });
});

describe('D180: grupos sucessivos', () => {
  it('cada divisão cria novo grupo à direita do foco, inclusive acima de nove', () => {
    const editor = setup();
    for (let i = 0; i < 11; i++) editor.duplicateToSide('s1');
    expect(editor.groupIds('s1')).toHaveLength(12);
    expect(editor.focusedGroupId('s1')).toBe('s1#12');
    for (const id of editor.groupIds('s1')) expect(editor.getActive(id)?.uri).toBe(A);
    editor.focusGroupId('s1', 's1#2');
    editor.duplicateToSide('s1');
    expect(editor.groupIds('s1').slice(1, 3)).toEqual(['s1#2', 's1#13']);
    editor.setDirty({ sessionId: 's1#12', uri: A, dirty: true });
    expect(editor.groupIds('s1').every(id => editor.getActive(id)?.dirty)).toBe(true);
  });
  it('fechar grupo de cópias dirty mantém o último dono e normaliza foco', () => {
    const editor = setup(); editor.duplicateToSide('s1'); editor.duplicateToSide('s1');
    editor.setDirty({ sessionId: 's1#3', uri: A, dirty: true });
    expect(editor.closeGroup('s1', 's1#3')).toBe(true);
    expect(editor.focusedGroupId('s1')).toBe('s1');
    expect(editor.closeGroup('s1', 's1#2')).toBe(true);
    expect(editor.closeGroup('s1', 's1')).toBe(false);
    expect(editor.getActive('s1')?.dirty).toBe(true);
  });
  it('grupo com arquivo único dirty exige confirmação sem perder irmãos', () => {
    const editor = setup(); editor.duplicateToSide('s1'); editor.duplicateToSide('s1');
    editor.open({ sessionId: 's1#3', uri: B, kind: 'code', pinned: true });
    editor.setDirty({ sessionId: 's1#3', uri: B, dirty: true });
    expect(editor.closeGroup('s1', 's1#3')).toBe(false);
    expect(editor.groupIds('s1')).toHaveLength(3);
    expect(editor.closeGroup('s1', 's1#3', true)).toBe(true);
    expect(editor.getActive('s1')?.uri).toBe(A);
  });
  it('promove somente um grupo e conserva os demais na mesma sessão', () => {
    const editor = setup(); editor.duplicateToSide('s1'); editor.duplicateToSide('s1');
    editor.open({ sessionId: 's2', uri: B, kind: 'code', pinned: true });
    expect(editor.close({ sessionId: 's1', uri: A })).toBe(true);
    expect(editor.groupIds('s1')).toEqual(['s1', 's1#3']);
    expect(editor.getActive('s1')?.uri).toBe(A);
    expect(editor.getActive('s2')?.uri).toBe(B);
  });
});
