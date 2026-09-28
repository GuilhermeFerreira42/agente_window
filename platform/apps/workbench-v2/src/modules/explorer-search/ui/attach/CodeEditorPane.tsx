// ============================================================================
// ui/attach/CodeEditorPane.tsx — 4.7 c4. Monaco REAL dentro do Editor Anexo.
//   • UMA instância `IStandaloneCodeEditor` por AttachArea, criada uma vez e
//     nunca destruída ao recolher (display:none → Regra 10 docs/18);
//   • UM modelo por URI (cache): trocar de aba = `setModel` + restore do
//     viewState (cursor/scroll) salvo ao sair; undo vive no modelo;
//   • dirty REAL: `alternativeVersionId !== savedVersionId` → `editor.setDirty`
//     (undo total volta a limpo, como o textFileModel);
//   • reveal (Search → linha/coluna): `revealLineInCenter` + decoração de linha
//     `attach-reveal-highlight` (token `--vscode-editor-findMatchHighlightBackground`),
//     removida ao mover o cursor — fecha D2.20;
//   • leitura via FileSystemPortLike (readFile / readFileBinary): imagem →
//     Image Preview no anexo; falha → ERROR EDITOR (nunca conteúdo sintético);
//   • opções: fontSize 14 / lineHeight 19 / minimap off / padding.top 12 (spec c4).
// Cores: tema `vs-dark`/`vs` segue a classe `theme-light` do documento.
// ============================================================================
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type * as Monaco from 'monaco-editor';
type monaco = typeof Monaco;
// Carregado sob demanda (import dinâmico): o pacote não resolve em Node/vitest
// e só é necessário quando o anexo existe de fato.
let monacoPromise: Promise<monaco> | null = null;
const loadMonaco = (): Promise<monaco> => (monacoPromise ??= import('monaco-editor'));
import type { FileSystemPortLike, WorkspaceUri } from '../../contract';
import type { EditorService } from '../../core/editor/editorService';
import { uriBasename } from '../../core/uri';
import { useEditorVersion } from './useEditorVersion';

export const ATTACH_MONACO_OPTIONS: Monaco.editor.IStandaloneEditorConstructionOptions = {
  fontSize: 14,
  lineHeight: 19,
  minimap: { enabled: false },
  padding: { top: 12 },
  automaticLayout: true,
  scrollBeyondLastLine: true,
  renderLineHighlight: 'line',
  fixedOverflowWidgets: true,
};

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico', 'avif']);
function isImageName(name: string): boolean {
  const i = name.lastIndexOf('.');
  return i > 0 && IMAGE_EXT.has(name.slice(i + 1).toLowerCase());
}
/** Linguagem pela extensão usando o registro do próprio Monaco. */
export function languageFor(monaco: monaco, name: string): string {
  const lower = name.toLowerCase();
  const i = lower.lastIndexOf('.');
  const ext = i >= 0 ? lower.slice(i) : '';
  for (const lang of monaco.languages.getLanguages()) {
    if (lang.filenames?.some((f) => f.toLowerCase() === lower)) return lang.id;
    if (ext && lang.extensions?.some((e) => e.toLowerCase() === ext)) return lang.id;
  }
  return 'plaintext';
}
export function currentTheme(): 'vs' | 'vs-dark' {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('theme-light') ? 'vs' : 'vs-dark';
}

interface Entry {
  model: Monaco.editor.ITextModel | null;
  viewState: Monaco.editor.ICodeEditorViewState | null;
  savedVersionId: number;
  status: 'loading' | 'text' | 'image' | 'error';
  error?: string;
  image?: { dataBase64: string; mime: string };
  sub?: Monaco.IDisposable;
}

export interface CodeEditorPaneProps {
  editor: EditorService;
  sessionId: string;
  fs: Pick<FileSystemPortLike, 'readFile' | 'readFileBinary'> & Partial<Pick<FileSystemPortLike, 'watch'>>;
  /** Gancho para o barrel expor a instância (E2E/c5 save). */
  onEditorReady?: (ed: Monaco.editor.IStandaloneCodeEditor, api: CodeEditorPaneApi) => void;
  /** c5: Ctrl+S dentro do Monaco → salvar a URI ativa. */
  onSaveRequest?: (uri: WorkspaceUri) => void;
  /** c5: mensagem de falha de save da URI ativa (some na próxima edição). */
  saveError?: string | null;
}
export interface CodeEditorPaneApi {
  /** Conteúdo atual do modelo da URI (c5: save). */
  getContent(uri: WorkspaceUri): string | null;
  /** Marca a versão atual como salva (c5: após writeFile) → dirty false. */
  markSaved(uri: WorkspaceUri): void;
  /** Descarta o modelo (c5: fechar sem salvar / conflito externo). */
  discard(uri: WorkspaceUri): void;
  /** c5: substitui o conteúdo pelo do disco (edição única → undo preserva), zera dirty, mantém cursor/scroll. */
  reload(uri: WorkspaceUri, content: string): void;
  /** c5: modelo carregado para a URI? */
  has(uri: WorkspaceUri): boolean;
}

export function CodeEditorPane({ editor, sessionId, fs, onEditorReady, onSaveRequest, saveError }: CodeEditorPaneProps) {
  const saveRef = useRef(onSaveRequest);
  saveRef.current = onSaveRequest;
  useEditorVersion(editor, sessionId);
  const hostRef = useRef<HTMLDivElement>(null);
  const edRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<monaco | null>(null);
  const entries = useRef(new Map<WorkspaceUri, Entry>());
  const currentUri = useRef<WorkspaceUri | null>(null);
  const highlight = useRef<Monaco.editor.IEditorDecorationsCollection | null>(null);
  const pendingReveal = useRef<Map<WorkspaceUri, { line: number; column?: number }>>(new Map());
  const [, bump] = useState(0);
  const rerender = () => bump((x) => x + 1);

  const active = editor.getActive(sessionId);
  // 4.7-b c2: a aba fixa "Changes" não é um arquivo — o Monaco fica sem modelo e oculto.
  const activeUri = active && active.kind !== 'changes' && active.kind !== 'diff' ? active.uri : null;

  // ---- instância única do Monaco (criada quando o pacote carrega) ----
  useLayoutEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;
    void loadMonaco().then((monaco) => {
      if (cancelled || !hostRef.current || edRef.current) return;
      monacoRef.current = monaco;
      const ed = monaco.editor.create(hostRef.current, { ...ATTACH_MONACO_OPTIONS, theme: currentTheme(), model: null });
      edRef.current = ed;
      highlight.current = ed.createDecorationsCollection();
      const clearHl = ed.onDidChangeCursorPosition(() => highlight.current?.clear());
      // Ctrl+S / Cmd+S (workbench.action.files.save)
      ed.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => { if (currentUri.current) saveRef.current?.(currentUri.current); });
      // tema segue o shell (classe theme-light no <html>)
      const mo = new MutationObserver(() => monaco.editor.setTheme(currentTheme()));
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      onEditorReady?.(ed, {
        getContent: (uri) => entries.current.get(uri)?.model?.getValue() ?? null,
        markSaved: (uri) => {
          const e = entries.current.get(uri);
          if (!e?.model) return;
          e.savedVersionId = e.model.getAlternativeVersionId();
          editor.setDirty({ sessionId, uri, dirty: false });
        },
        discard: (uri) => disposeEntry(uri),
        reload: (uri, content) => {
          const e = entries.current.get(uri);
          if (!e?.model) return;
          if (e.model.getValue() === content) { e.savedVersionId = e.model.getAlternativeVersionId(); editor.setDirty({ sessionId, uri, dirty: false }); return; }
          const full = e.model.getFullModelRange();
          e.model.pushEditOperations([], [{ range: full, text: content }], () => null);
          e.savedVersionId = e.model.getAlternativeVersionId();
          editor.setDirty({ sessionId, uri, dirty: false });
        },
        has: (uri) => !!entries.current.get(uri)?.model,
      });
      cleanup = () => {
        clearHl.dispose();
        mo.disconnect();
        // desmontagem REAL (só no unmountAttach do módulo, nunca ao recolher)
        for (const uri of [...entries.current.keys()]) disposeEntry(uri);
        ed.dispose();
        edRef.current = null;
      };
      rerender();
    });
    return () => { cancelled = true; cleanup?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const disposeEntry = (uri: WorkspaceUri) => {
    const e = entries.current.get(uri);
    if (!e) return;
    if (currentUri.current === uri) { edRef.current?.setModel(null); currentUri.current = null; }
    e.sub?.dispose();
    e.model?.dispose();
    entries.current.delete(uri);
  };

  // ---- fechar aba → descarta modelo; reveal pedido → guarda até o modelo existir ----
  useEffect(() => editor.onEvent((e) => {
    if (!('sessionId' in e) || e.sessionId !== sessionId) return;
    if (e.type === 'editor.tabClosed') disposeEntry(e.uri);
    if (e.type === 'editor.revealRequested') {
      pendingReveal.current.set(e.uri, { line: e.line, column: e.column });
      applyReveal(e.uri);
    }
  }), [editor, sessionId]);

  const applyReveal = (uri: WorkspaceUri) => {
    const ed = edRef.current;
    const monaco = monacoRef.current;
    const req = pendingReveal.current.get(uri);
    const entry = entries.current.get(uri);
    if (!ed || !monaco || !req || !entry?.model || currentUri.current !== uri) return;
    pendingReveal.current.delete(uri);
    const line = Math.max(1, Math.min(req.line, entry.model.getLineCount()));
    const column = Math.max(1, req.column ?? 1);
    ed.setPosition({ lineNumber: line, column });
    ed.revealLineInCenter(line);
    highlight.current?.set([{
      range: new monaco.Range(line, 1, line, 1),
      options: { isWholeLine: true, className: 'attach-reveal-highlight', stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges },
    }]);
    ed.focus();
  };

  // ---- carregar/trocar modelo quando a aba ativa muda ----
  useEffect(() => {
    const ed = edRef.current;
    const monaco = monacoRef.current;
    if (!ed || !monaco) return;
    // salva viewState da anterior
    if (currentUri.current && currentUri.current !== activeUri) {
      const prev = entries.current.get(currentUri.current);
      if (prev) prev.viewState = ed.saveViewState();
    }
    if (!activeUri) { ed.setModel(null); currentUri.current = null; return; }
    let entry = entries.current.get(activeUri);
    if (!entry) {
      entry = { model: null, viewState: null, savedVersionId: 0, status: 'loading' };
      entries.current.set(activeUri, entry);
      const uri = activeUri;
      const name = uriBasename(uri);
      void (async () => {
        try {
          if (isImageName(name)) {
            const bin = await fs.readFileBinary({ uri, maxBytes: 8 * 1024 * 1024 });
            const e = entries.current.get(uri); if (!e) return;
            e.status = 'image'; e.image = bin;
          } else {
            const read = await fs.readFile({ uri });
            const e = entries.current.get(uri); if (!e) return;
            const model = monaco.editor.createModel(read.content, languageFor(monaco, name), monaco.Uri.parse(`attach:${sessionId}${uri.replace(/^file:\/\//, '')}`));
            e.model = model;
            e.savedVersionId = model.getAlternativeVersionId();
            e.status = 'text';
            e.sub = model.onDidChangeContent(() => {
              editor.setDirty({ sessionId, uri, dirty: model.getAlternativeVersionId() !== e.savedVersionId });
            });
            // conflito externo (c5): garante watcher na pasta do arquivo (watcher existente, modo lazy)
            void fs.watch?.({ uri: uri.replace(/\/[^/]*$/, '') as WorkspaceUri }).catch(() => undefined);
          }
        } catch (err) {
          const e = entries.current.get(uri); if (!e) return;
          e.status = 'error'; e.error = err instanceof Error ? err.message : String(err);
        }
        rerender();
      })();
    }
    currentUri.current = activeUri;
    if (entry.model) {
      if (ed.getModel() !== entry.model) {
        ed.setModel(entry.model);
        if (entry.viewState) ed.restoreViewState(entry.viewState);
      }
      applyReveal(activeUri);
    } else {
      ed.setModel(null);
    }
  });

  const entry = activeUri ? entries.current.get(activeUri) : undefined;
  const showMonaco = !!entry && entry.status === 'text';
  const name = activeUri ? uriBasename(activeUri) : '';

  return (
    <div className="attach-editor-pane" data-testid="attach-editor-pane">
      {saveError && showMonaco && <div className="attach-save-error" role="alert" data-testid="attach-save-error">{saveError}</div>}
      <div ref={hostRef} className="attach-monaco-host" style={{ display: showMonaco ? undefined : 'none' }} />
      {entry?.status === 'image' && entry.image && (
        <div className="attach-image-preview" data-testid="image-preview-pane">
          <div className="attach-pane-banner"><span>Image Preview</span><span className="attach-pane-name">{name}</span><span className="attach-pane-badge">REAL</span></div>
          <div className="attach-image-body"><img src={`data:${entry.image.mime};base64,${entry.image.dataBase64}`} alt={name} /></div>
        </div>
      )}
      {entry?.status === 'error' && (
        <div className="attach-read-error" role="alert" data-testid="file-read-error">
          <div className="attach-pane-banner error"><span>Não foi possível ler o arquivo</span><span className="attach-pane-name">{name}</span></div>
          <div className="attach-error-detail">{entry.error}</div>
          <div className="attach-error-hint">A leitura veio do backend Single Port (/fs/read). Verifique se o arquivo existe em disco.</div>
        </div>
      )}
    </div>
  );
}
