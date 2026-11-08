import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type * as Monaco from 'monaco-editor';
import { createEditorCommandBridge } from '../ui/center/editorCommandBridge';
import { EditorService } from '../core/editor/editorService';
import { asWorkspaceUri } from '../core/uri';
import { modelEntries, disposeModelResources } from '../ui/attach/modelResources';
import { FakeFsPort } from './fakeFs';
import type { CommandRegistryLike } from '../contract';

function testRegistry(): CommandRegistryLike {
  const commands = new Map<string, (ctx?: unknown) => Promise<void> | void>();
  return {
    register(command) { commands.set(command.id, command.run); return () => { commands.delete(command.id); }; },
    async execute(id, ctx) { await commands.get(id)?.(ctx); },
    setContext() {}, getContext() { return undefined; },
  };
}

const cleanups: Array<() => void> = [];
afterEach(async () => { await act(async () => { cleanups.splice(0).reverse().forEach(fn => fn()); await new Promise(resolve => setTimeout(resolve, 0)); }); });
function setup() {
  const root = asWorkspaceUri('file:///C:/fixture'), source = asWorkspaceUri('file:///C:/fixture/source.ts');
  const fs = new FakeFsPort(root), menus = testRegistry(), editor = new EditorService();
  const bridge = createEditorCommandBridge({ deps: { fs, menus, workspaceRoot: root, contextMenu: { open() {} } }, editor, session: () => 's1', navigate: vi.fn(), close: vi.fn() });
  const host = document.createElement('div'); document.body.appendChild(host);
  const unmount = bridge.mount(host);
  cleanups.push(() => { unmount(); bridge.dispose(); disposeModelResources(editor); editor.dispose(); host.remove(); });
  return { fs, menus, editor, bridge, host, source };
}
async function enter(command: string, menus: CommandRegistryLike, path: string) {
  await act(() => menus.execute(command, { sessionId: 's1' }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: path } });
  await act(async () => { fireEvent.submit(screen.getByRole('textbox').closest('form')!); });
}
describe('comandos de arquivo: fronteira e gravação', () => {
  it('preserva espaços, acentos, porcentagem e cerquilha na URI interna', async () => {
    const { fs, menus, editor } = setup();
    const create = vi.spyOn(fs, 'createFile').mockResolvedValue();
    await enter('workbench.action.files.newFile', menus, 'nível com espaço/100% #1.txt');
    expect(create).toHaveBeenCalledWith({ uri: asWorkspaceUri('file:///C:/fixture/nível com espaço/100% #1.txt'), content: '' });
    expect(editor.getActive('s1')?.uri).toBe('file:///C:/fixture/nível com espaço/100% #1.txt');
  });
  it('recusa caminho fora da raiz sem executar criação', async () => {
    const { fs, menus } = setup();
    const create = vi.spyOn(fs, 'createFile');
    await enter('workbench.action.files.newFile', menus, '../fora.ts');
    expect(await screen.findByRole('alert')).toHaveTextContent('dentro do projeto');
    expect(create).not.toHaveBeenCalled();
  });
  it('erro ao salvar como conserva origem dirty e diálogo', async () => {
    const { fs, menus, editor, bridge, host, source } = setup();
    editor.open({ sessionId: 's1', uri: source, kind: 'code', pinned: true });
    editor.setDirty({ sessionId: 's1', uri: source, dirty: true });
    modelEntries(editor, 's1').set(source, { model: { getValue: () => 'rascunho', dispose() {} } as unknown as Monaco.editor.ITextModel, savedVersionId: 1, viewState: null, status: 'text' });
    host.getClientRects = () => ({ length: 1 }) as DOMRectList;
    bridge.register('s1', { getDomNode: () => host } as unknown as Monaco.editor.IStandaloneCodeEditor);
    vi.spyOn(fs, 'createFile').mockRejectedValue(new Error('EEXIST: destino existente'));
    await enter('workbench.action.files.saveAs', menus, 'existente.ts');
    expect(await screen.findByRole('alert')).toHaveTextContent('EEXIST');
    expect(editor.getActive('s1')?.uri).toBe(source);
    expect(editor.getTabs('s1')[0].dirty).toBe(true);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
  it('digitação durante salvar como mantém a origem com conteúdo novo pendente', async () => {
    const { fs, menus, editor, bridge, host, source } = setup();
    editor.open({ sessionId: 's1', uri: source, kind: 'code', pinned: true });
    editor.setDirty({ sessionId: 's1', uri: source, dirty: true });
    let content = 'snapshot';
    modelEntries(editor, 's1').set(source, { model: { getValue: () => content, dispose() {} } as unknown as Monaco.editor.ITextModel, savedVersionId: 1, viewState: null, status: 'text' });
    host.getClientRects = () => ({ length: 1 }) as DOMRectList;
    bridge.register('s1', { getDomNode: () => host, focus() {} } as unknown as Monaco.editor.IStandaloneCodeEditor);
    let release!: () => void;
    const create = vi.spyOn(fs, 'createFile').mockImplementation(() => new Promise<void>(resolve => { release = resolve; }));
    await enter('workbench.action.files.saveAs', menus, 'copia.ts');
    await waitFor(() => expect(create).toHaveBeenCalled());
    content = 'texto posterior';
    await act(async () => release());
    expect(create).toHaveBeenCalledWith({ uri: asWorkspaceUri('file:///C:/fixture/copia.ts'), content: 'snapshot' });
    expect(editor.getTabs('s1').find(tab => tab.uri === source)?.dirty).toBe(true);
    expect(modelEntries(editor, 's1').get(source)?.model?.getValue()).toBe('texto posterior');
    expect(editor.getActive('s1')?.uri).toContain('copia.ts');
  });
});
