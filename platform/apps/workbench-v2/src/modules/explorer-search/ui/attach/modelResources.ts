// Recursos Monaco do módulo: sobrevivem à troca de host/layout, sem possuir abas.
// EditorService continua sendo a única fonte de grupos, dirty e fechamento.
import type * as Monaco from 'monaco-editor';
import type { EditorService } from '../../core/editor/editorService';
import type { WorkspaceUri } from '../../contract';

export interface ModelEntry {
  model: Monaco.editor.ITextModel | null;
  viewState: Monaco.editor.ICodeEditorViewState | null;
  viewStates?: Map<string, Monaco.editor.ICodeEditorViewState | null>;
  savedVersionId: number;
  status: 'loading' | 'text' | 'image' | 'binary' | 'error';
  error?: string;
  image?: { dataBase64: string; mime: string };
  sub?: Monaco.IDisposable;
}
interface Resources {
  sessions: Map<string, Map<WorkspaceUri, ModelEntry>>;
  listeners: Map<string, Set<() => void>>;
  off: () => void;
}
const resources = new WeakMap<EditorService, Resources>();
// O sufixo é o contrato de GRUPO_SECUNDARIO; as vistas compartilham o modelo da sessão.
export const modelSession = (group: string): string => group.endsWith('#2') ? group.slice(0, -2) : group;

export function discardModel(entries: Map<WorkspaceUri, ModelEntry>, uri: WorkspaceUri): void {
  const entry = entries.get(uri);
  if (!entry) return;
  entries.delete(uri);
  entry.sub?.dispose();
  entry.model?.dispose();
}
function resourceFor(editor: EditorService): Resources {
  let resource = resources.get(editor);
  if (resource) return resource;
  resource = { sessions: new Map(), listeners: new Map(), off: () => {} };
  const own = resource;
  own.off = editor.onEvent((event) => {
    if (event.type === 'editor.groupPromoted') {
      for (const entry of own.sessions.get(event.sessionId)?.values() ?? []) {
        const state = entry.viewStates?.get(event.fromGroupId);
        if (state) { entry.viewStates?.set(event.sessionId, state); entry.viewState = state; }
      }
      return;
    }
    if (event.type === 'editor.splitChanged' && !event.split) {
      for (const entry of own.sessions.get(event.sessionId)?.values() ?? []) entry.viewStates?.delete(`${event.sessionId}#2`);
      return;
    }
    if (event.type !== 'editor.tabClosed') return;
    const session = modelSession(event.sessionId);
    // tabClosed também é emitido ao mover entre grupos; nesse caso o recurso
    // já tem dono no destino e deve conservar texto/undo/versão salva.
    if (editor.groupIdOf(session, event.uri)) return;
    const entries = own.sessions.get(session);
    if (entries) discardModel(entries, event.uri);
  });
  resources.set(editor, own);
  return own;
}
export function modelEntries(editor: EditorService, group: string): Map<WorkspaceUri, ModelEntry> {
  const resource = resourceFor(editor);
  const session = modelSession(group);
  let entries = resource.sessions.get(session);
  if (!entries) { entries = new Map(); resource.sessions.set(session, entries); }
  return entries;
}
export function onModelsChanged(editor: EditorService, group: string, cb: () => void): () => void {
  const resource = resourceFor(editor);
  const session = modelSession(group);
  let listeners = resource.listeners.get(session);
  if (!listeners) { listeners = new Set(); resource.listeners.set(session, listeners); }
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
export function modelsChanged(editor: EditorService, group: string): void {
  for (const cb of resourceFor(editor).listeners.get(modelSession(group)) ?? []) cb();
}
export function disposeModelResources(editor: EditorService): void {
  const resource = resources.get(editor);
  if (!resource) return;
  resource.off();
  for (const entries of resource.sessions.values()) for (const uri of entries.keys()) discardModel(entries, uri);
  resource.listeners.clear();
  resources.delete(editor);
}
