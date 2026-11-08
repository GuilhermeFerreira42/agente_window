import { describe, expect, it, vi } from 'vitest';
import { EditorService, GRUPO_SECUNDARIO } from '../core/editor/editorService';
import { asWorkspaceUri } from '../core/uri';
import { disposeModelResources, modelEntries, type ModelEntry } from '../ui/attach/modelResources';

const uri = asWorkspaceUri('/fixture/a.ts');
function entry() {
  const dispose = vi.fn();
  const subDispose = vi.fn();
  const value: ModelEntry = {
    model: { dispose } as unknown as NonNullable<ModelEntry['model']>, sub: { dispose: subDispose },
    viewState: null, savedVersionId: 1, status: 'text',
  };
  return { value, dispose, subDispose };
}
describe('recursos Monaco sobrevivem ao host, sem duplicar o dono das abas', () => {
  it('remontagem reutiliza o modelo, sessões distintas isolam os recursos e dispose libera ambos', () => {
    const editor = new EditorService();
    const first = entry(); const second = entry();
    modelEntries(editor, 's1').set(uri, first.value);
    modelEntries(editor, 's2').set(uri, second.value);
    expect(modelEntries(editor, 's1').get(uri)).toBe(first.value);
    expect(modelEntries(editor, 's2').get(uri)).toBe(second.value);
    expect(first.dispose).not.toHaveBeenCalled();
    disposeModelResources(editor);
    expect(first.dispose).toHaveBeenCalledOnce();
    expect(second.dispose).toHaveBeenCalledOnce();
    expect(first.subDispose).toHaveBeenCalledOnce();
    editor.dispose();
  });

  it('mover aba dirty para o split conserva o recurso; fechamento real o libera', () => {
    const editor = new EditorService();
    editor.open({ sessionId: 's1', uri, kind: 'code', pinned: true });
    editor.open({ sessionId: 's1', uri: asWorkspaceUri('/fixture/b.ts'), kind: 'code', pinned: true });
    editor.split('s1');
    const resource = entry();
    modelEntries(editor, 's1').set(uri, resource.value);
    editor.setDirty({ sessionId: 's1', uri, dirty: true });
    expect(editor.moveTab({ sessionId: 's1', uri, to: 'secundario' })).toBe(true);
    expect(modelEntries(editor, GRUPO_SECUNDARIO('s1')).get(uri)).toBe(resource.value);
    expect(resource.dispose).not.toHaveBeenCalled();
    expect(editor.close({ sessionId: GRUPO_SECUNDARIO('s1'), uri })).toBe(false);
    expect(resource.dispose).not.toHaveBeenCalled();
    editor.close({ sessionId: GRUPO_SECUNDARIO('s1'), uri, force: true });
    expect(resource.dispose).toHaveBeenCalledOnce();
    expect(modelEntries(editor, 's1').has(uri)).toBe(false);
    disposeModelResources(editor); editor.dispose();
  });
});

it('D180: fechar um grupo intermediário limpa só sua vista, sem descartar o modelo compartilhado', () => {
  const editor = new EditorService();
  editor.open({ sessionId: 's1', uri, kind: 'code', pinned: true });
  editor.duplicateToSide('s1'); editor.duplicateToSide('s1');
  const resource = entry(); resource.value.viewStates = new Map([['s1', null], ['s1#2', null], ['s1#3', null]]);
  modelEntries(editor, 's1').set(uri, resource.value);
  expect(editor.closeGroup('s1', 's1#2')).toBe(true);
  expect([...resource.value.viewStates.keys()]).toEqual(['s1', 's1#3']);
  expect(resource.dispose).not.toHaveBeenCalled();
  expect(modelEntries(editor, 's1#3').get(uri)).toBe(resource.value);
  disposeModelResources(editor); editor.dispose();
});
