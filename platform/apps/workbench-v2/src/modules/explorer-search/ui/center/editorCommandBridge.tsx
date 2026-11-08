import { createRoot, type Root } from 'react-dom/client';
import type * as Monaco from 'monaco-editor';
import type { IExplorerSearchModuleDeps, WorkspaceUri } from '../../contract';
import type { EditorService } from '../../core/editor/editorService';
import { GRUPO_SECUNDARIO } from '../../core/editor/editorService';
import { modelEntries } from '../attach/modelResources';
import { EditorFileDialog, type FileCommand } from './EditorFileDialog';
import { EditorShortcutDialog, type ShortcutRow } from './EditorShortcutDialog';
import { WorkspaceSymbolsDialog } from './WorkspaceSymbolsDialog';
import { supportsDocumentPreview } from '../attach/DocumentPreview';

/** Adaptador UI: registry existente → arquivo/serviço/diálogo existentes. */
export function createEditorCommandBridge({ deps, editor, session, navigate, close }: {
  deps: IExplorerSearchModuleDeps; editor: EditorService; session(): string | null;
  navigate(sessionId: string, uri: WorkspaceUri): void;
  close(sessionId: string, uri: WorkspaceUri, groupId: string): void;
}) {
  let root: Root | null = null;
  let unmount: (() => void) | null = null;
  const editors = new Map<string, Monaco.editor.IStandaloneCodeEditor>();
  const activeGroup = (sid: string) => editor.focusGroupOf(sid) === 'secundario' ? GRUPO_SECUNDARIO(sid) : sid;
  const instance = (sid: string) => {
    const candidate = editors.get(activeGroup(sid));
    const node = candidate?.getDomNode();
    return node?.isConnected && node.getClientRects().length ? candidate! : null;
  };
  const pathUri = (path: string) => {
    const base = deps.workspaceRoot.replace(/\/$/, '') + '/';
    const relative = path.replace(/\\/g, '/');
    if (!relative || relative.startsWith('/') || /^[a-z]+:/i.test(relative) || relative.split('/').some(p => p === '..' || p === '.' || !p)) throw new Error('Informe um caminho relativo dentro do projeto.');
    return (base + relative.split('/').map(encodeURIComponent).join('/')) as WorkspaceUri;
  };
  const showFile = (mode: FileCommand, sid: string) => {
    if (!root) throw new Error('O seletor de arquivos ainda não está disponível.');
    const sourceGroup = activeGroup(sid);
    const source = editor.getActive(sourceGroup);
    if (mode === 'save-as' && (!source || source.kind !== 'code' || !instance(sid))) throw new Error('Abra um arquivo de código para salvar como.');
    const dismiss = () => { root?.render(null); instance(sid)?.focus(); };
    root.render(<EditorFileDialog key={Date.now()} mode={mode} root={deps.workspaceRoot} fs={deps.fs} onCancel={dismiss} onAccept={async path => {
      const uri = pathUri(path);
      let snapshot: string | undefined;
      if (mode === 'open') {
        if ((await deps.fs.stat({ uri })).kind !== 'file') throw new Error('Escolha um arquivo.');
      } else {
        snapshot = mode === 'save-as' && source ? modelEntries(editor, sid).get(source.uri)?.model?.getValue() : '';
        if (snapshot === undefined) throw new Error('O conteúdo ainda não foi carregado.');
        // createFile usa criação exclusiva: falha conserva origem e diálogo.
        await deps.fs.createFile({ uri, content: snapshot });
      }
      if (mode === 'save-as' && source && modelEntries(editor, sid).get(source.uri)?.model?.getValue() === snapshot) {
        editor.close({ sessionId: sourceGroup, uri: source.uri, force: true });
      }
      editor.open({ sessionId: activeGroup(sid), uri, kind: 'code', pinned: true });
      navigate(sid, uri);
      dismiss();
    }} />);
  };
  const showCommands = (sid: string, palette = false) => {
    if (!root) throw new Error('A lista de comandos ainda não está disponível.');
    const ed = instance(sid);
    const previous = document.activeElement;
    const dismiss = () => { root?.render(null); if (ed) ed.focus(); else if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
    const rows: ShortcutRow[] = ed?.getSupportedActions().map(action => ({
      id: action.id.replace(/^.*:(?=(?:editor\.action\.|workbench\.action\.))/, ''), label: action.label, enabled: action.isSupported(),
      run: async () => { dismiss(); await action.run(); },
    })) ?? [];
    const extra = [
      ['workbench.action.quickOpen', 'Abrir arquivo rapidamente'], ['workbench.action.files.newFile', 'Novo arquivo'],
      ['workbench.action.files.saveAs', 'Salvar como'], ['workbench.action.splitEditor', 'Dividir editor'],
      ['workbench.action.openSettings', 'Abrir configurações'], ['workbench.action.toggleSidebarVisibility', 'Alternar barra lateral'],
      ['workbench.action.terminal.toggleTerminal', 'Alternar terminal integrado'], ['workbench.action.toggleFullScreen', 'Alternar tela cheia'],
      ['workbench.action.showAllSymbols', 'Símbolos no projeto'],
    ];
    for (const [id, label] of extra) if (!rows.some(row => row.id === id)) rows.push({ id, label, enabled: !['workbench.action.files.saveAs', 'workbench.action.splitEditor'].includes(id) || !!ed, run: async () => { dismiss(); await deps.menus.execute(id, { sessionId: sid }); } });
    root.render(<EditorShortcutDialog rows={rows} commands={palette} onCancel={dismiss} />);
  };
  const commands: Record<string, (sid: string) => void | Promise<void>> = {
    'workbench.action.quickOpen': sid => showFile('open', sid),
    'workbench.action.files.openFile': sid => showFile('open', sid),
    'workbench.action.files.newFile': sid => showFile('new', sid),
    'workbench.action.files.saveAs': sid => showFile('save-as', sid),
    'workbench.action.files.save': async sid => {
      const group = activeGroup(sid), tab = editor.getActive(group);
      const ed = instance(sid) ?? (tab?.presentation === 'preview' ? editors.get(group) : null);
      if (!ed) throw new Error('Abra um arquivo de código para salvar.');
      await ed.getAction('workbench.action.files.save')?.run();
    },
    'workbench.action.closeActiveEditor': sid => { const group = activeGroup(sid), tab = editor.getActive(group); if (tab) close(sid, tab.uri, group); },
    'workbench.action.showCommands': async sid => { const ed = instance(sid); if (ed) { ed.focus(); await ed.getAction('editor.action.quickCommand')?.run(); } else showCommands(sid, true); },
    'workbench.action.openGlobalKeybindings': sid => showCommands(sid),
    'editor.action.togglePreview': sid => {
      const group = activeGroup(sid), tab = editor.getActive(group);
      if (!tab || tab.kind !== 'code' || !supportsDocumentPreview(tab.uri)) throw new Error('A visualização está disponível para arquivos Markdown e texto.');
      editor.setPresentation({ sessionId: group, uri: tab.uri, presentation: tab.presentation === 'preview' ? 'code' : 'preview' });
    },
    'workbench.action.showAllSymbols': sid => {
      if (!root) throw new Error('A busca de símbolos ainda não está disponível.');
      const dismiss = () => { root?.render(null); instance(sid)?.focus(); };
      root.render(<WorkspaceSymbolsDialog fs={deps.fs} root={deps.workspaceRoot}
        modelFor={uri => modelEntries(editor, sid).get(uri)?.model ?? null}
        onCancel={dismiss} onPick={(uri, row) => {
          editor.open({ sessionId: activeGroup(sid), uri, kind: 'code', pinned: true, line: row.line, column: row.column });
          navigate(sid, uri); dismiss();
        }} />);
    },
    'workbench.action.focusFirstEditorGroup': sid => { editor.setFocusGroup({ sessionId: sid, side: 'principal' }); instance(sid)?.focus(); },
    'workbench.action.focusSecondEditorGroup': sid => { if (editor.isSplit(sid)) { editor.setFocusGroup({ sessionId: sid, side: 'secundario' }); instance(sid)?.focus(); } },
  };
  const offs = Object.entries(commands).map(([id, run]) => deps.menus.register({ id, title: id, run: async ctx => {
    const sid = ctx && typeof ctx === 'object' && 'sessionId' in ctx && typeof ctx.sessionId === 'string' ? ctx.sessionId : session();
    if (sid) await run(sid);
  } }));
  return {
    mount(host: HTMLElement) {
      unmount?.();
      const container = document.createElement('div');
      host.appendChild(container);
      const ownRoot = createRoot(container);
      root = ownRoot;
      let removed = false;
      const cleanup = () => {
        if (removed) return;
        removed = true;
        if (root === ownRoot) { root = null; unmount = null; }
        container.remove();
        setTimeout(() => ownRoot.unmount(), 0);
      };
      unmount = cleanup;
      return cleanup;
    },
    register(group: string, ed: Monaco.editor.IStandaloneCodeEditor) { editors.set(group, ed); },
    dispose() { unmount?.(); editors.clear(); offs.forEach(off => off()); },
  };
}
