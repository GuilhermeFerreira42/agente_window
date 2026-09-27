// ============================================================================
// ui/attach/AttachArea.tsx — 4.7 c1. Container do Editor Anexo dentro da
// barra auxiliar (Opção A aprovada 2026-09-26): [anexo][sash 6 px][árvore]
// — editor à ESQUERDA da árvore (print editor/34). Só layout: conteúdo
// (abas/editor) entra em c2–c4 via `children`.
//   • largura governada por `--attach-width` (constants.ATTACH_WIDTH_CSS_VAR);
//   • esconder = `display:none` no MESMO nó (data-mount-id estável; 0 unmounts);
//   • sash: role=separator, cursor ew-resize, hover acende após 300 ms
//     (sash.ts: `hoverDelay`), dblclick = largura padrão, ←/→ = ±10 px;
//   • sem position:fixed (A5.7); clamp vem do store (px e % do container).
// ============================================================================
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ATTACH_SASH_WIDTH_PX, ATTACH_WIDTH_CSS_VAR } from '../../core/constants';
import { ATTACH_KEYBOARD_STEP_PX, type AttachLayoutStore } from '../../core/attach/attachLayout';
import type { EditorService } from '../../core/editor/editorService';
import type { FileSystemPortLike, WorkspaceUri } from '../../contract';
import { EditorTabs } from './EditorTabs';
import { CodeEditorPane, type CodeEditorPaneProps } from './CodeEditorPane';
import { Breadcrumbs } from './Breadcrumbs';
import { useEditorVersion } from './useEditorVersion';
import { AttachDialog } from './AttachDialog';
import { ATTACH_STRINGS } from './attachStrings';
import { AttachEmptyState } from './AttachEmptyState';
import { ChangesPane } from './changes/ChangesPane';
import type { GitService } from '../../core/git/gitService';
import { ATTACH_CHANGES_URI } from '../../core/editor/editorService';
import { CHANGES_STRINGS } from './changes/changesStrings';
import { uriBasename } from '../../core/uri';
import '../explorer.css';
import './attach.css';

export const SASH_HOVER_DELAY_MS = 300;

export interface AttachAreaProps {
  store: AttachLayoutStore;
  sessionId: string;
  /** c3: modelo de abas (puro) + raiz para breadcrumbs relativos. */
  editor: EditorService;
  root: WorkspaceUri;
  onCloseBlocked?: (input: { sessionId: string; uri: WorkspaceUri }) => void;
  /** c4: leitura de arquivos para o Monaco do anexo. */
  fs: Pick<FileSystemPortLike, 'readFile' | 'readFileBinary'> & Partial<Pick<FileSystemPortLike, 'watch'>>;
  onEditorReady?: CodeEditorPaneProps['onEditorReady'];
  /** c5: salva a URI (writeFile atomic) — rejeita em falha; dirty limpa só após resolver. */
  onSave?: (uri: WorkspaceUri) => Promise<void>;
  /** c5: recarrega do disco (conflito externo → "Recarregar"). */
  onReload?: (uri: WorkspaceUri) => Promise<void>;
  /** 4.7-b c2: serviço Git (aba fixa "Changes"). Ausente → sem botão/aba. */
  git?: GitService;
  children?: React.ReactNode;
}

let mountSeq = 0;

export function AttachArea({ store, sessionId, editor, root, onCloseBlocked, fs, onEditorReady, onSave, onReload, git, children }: AttachAreaProps) {
  useEditorVersion(editor, sessionId);
  // c5 — diálogos (fechar dirty / conflito externo) e erro de save
  const [dialog, setDialog] = useState<{ kind: 'save' | 'conflict'; uri: WorkspaceUri } | null>(null);
  const [saveError, setSaveError] = useState<{ uri: WorkspaceUri; message: string } | null>(null);
  useEffect(() => editor.onEvent((e) => {
    if (!('sessionId' in e) || e.sessionId !== sessionId) return;
    if (e.type === 'editor.externalChange' && e.dirty) setDialog((d) => d ?? { kind: 'conflict', uri: e.uri });
    if (e.type === 'editor.dirtyChanged' && e.dirty) setSaveError((s) => (s?.uri === e.uri ? null : s));
    if (e.type === 'editor.tabClosed') { setSaveError((s) => (s?.uri === e.uri ? null : s)); setDialog((d) => (d?.uri === e.uri ? null : d)); }
  }), [editor, sessionId]);
  const doSave = async (uri: WorkspaceUri): Promise<boolean> => {
    if (!onSave) return false;
    try { await onSave(uri); setSaveError(null); return true; }
    catch (err) { setSaveError({ uri, message: ATTACH_STRINGS.saveFailed(uriBasename(uri), err instanceof Error ? err.message : String(err)) }); return false; }
  };
  const requestClose = (input: { sessionId: string; uri: WorkspaceUri }) => {
    setDialog({ kind: 'save', uri: input.uri });
    onCloseBlocked?.(input);
  };
  const onRootKeyDown = (e: React.KeyboardEvent) => {
    // c6 — Esc com o anexo maximizado → restore imediato (captura, antes do Monaco)
    if (e.key === 'Escape' && store.isMaximized()) { e.preventDefault(); e.stopPropagation(); store.setMaximized(false); return; }
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 's' || e.key === 'S')) {
      const a = editor.getActive(sessionId);
      if (a) { e.preventDefault(); e.stopPropagation(); void doSave(a.uri); }
    }
  };
  const activeTab = editor.getActive(sessionId);
  const [mountId] = useState(() => `attach-${Date.now().toString(36)}-${++mountSeq}`);
  const [visible, setVisible] = useState(() => store.isVisible(sessionId));
  const [width, setWidth] = useState(() => store.getWidth());
  const [maximized, setMaximized] = useState(() => store.isMaximized());
  const [maxWidth, setMaxWidth] = useState(() => store.getMaximizedWidth());
  // transição 200 ms SÓ na troca maximizar/restaurar (sash e setWidth são instantâneos, como no VS Code)
  const [animating, setAnimating] = useState(false);
  const firstMax = useRef(true);
  useEffect(() => {
    if (firstMax.current) { firstMax.current = false; return; }
    setAnimating(true);
    const t = setTimeout(() => setAnimating(false), 220);
    return () => clearTimeout(t);
  }, [maximized]);
  const [sashHover, setSashHover] = useState(false);
  const [dragging, setDragging] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // eventos do store → estado
  useEffect(() => store.onEvent((e) => {
    if (e.type === 'attach.visibilityChanged' && e.sessionId === sessionId) setVisible(e.visible);
    if (e.type === 'attach.widthChanged') setWidth(e.width);
    if (e.type === 'attach.maximizedChanged') setMaximized(e.maximized);
  }), [store, sessionId]);
  useEffect(() => { setVisible(store.isVisible(sessionId)); }, [store, sessionId]);

  // container que limita o clamp em % = pai da barra auxiliar (banda útil da sessão)
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      const bar = el.closest('.auxiliary-bar') as HTMLElement | null;
      const container = (bar?.parentElement ?? el.parentElement) as HTMLElement | null;
      const w = container?.getBoundingClientRect().width || window.innerWidth;
      store.setContainerWidth(w);
      setWidth(store.getWidth());
      setMaxWidth(store.getMaximizedWidth());
    };
    measure();
    const target = (el.closest('.auxiliary-bar')?.parentElement ?? el.parentElement) as Element | null;
    if (!target || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(target);
    return () => ro.disconnect();
  }, [store]);

  // ---- sash ----
  const onSashPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startW = store.getWidth();
    setDragging(true);
    const move = (ev: PointerEvent) => { store.setWidth(startW + (ev.clientX - startX)); };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };
  const onSashEnter = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setSashHover(true), SASH_HOVER_DELAY_MS);
  };
  const onSashLeave = () => {
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null; }
    setSashHover(false);
  };
  useEffect(() => () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); }, []);
  const onSashKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); store.setWidth(store.getWidth() + ATTACH_KEYBOARD_STEP_PX); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); store.setWidth(store.getWidth() - ATTACH_KEYBOARD_STEP_PX); }
    else if (e.key === 'Home') { e.preventDefault(); store.setWidth(0); }
    else if (e.key === 'End') { e.preventDefault(); store.setWidth(Number.MAX_SAFE_INTEGER); }
    else if (e.key === 'Enter') { e.preventDefault(); store.resetWidth(); }
  };

  // c6 — maximizado: largura = teto do clamp (dentro da banda da sessão); a
  // largura do usuário fica intacta no store e volta no restore.
  const style = { [ATTACH_WIDTH_CSS_VAR]: `${maximized ? maxWidth : width}px`, display: visible ? undefined : 'none' } as React.CSSProperties;
  const isChangesActive = activeTab?.kind === 'changes';
  const openChanges = () => editor.open({ sessionId, uri: ATTACH_CHANGES_URI, kind: 'changes', pinned: true });
  const headerActions = (
    <>
      {git && (
        <button type="button" className="action-label codicon codicon-source-control" data-testid="attach-open-changes"
          aria-pressed={isChangesActive} title={CHANGES_STRINGS.openChanges} aria-label={CHANGES_STRINGS.openChanges}
          onClick={openChanges} />
      )}
      <button type="button" className={`action-label codicon ${maximized ? 'codicon-screen-normal' : 'codicon-screen-full'}`}
        data-testid="attach-maximize" aria-pressed={maximized}
        title={maximized ? ATTACH_STRINGS.restore : ATTACH_STRINGS.maximize} aria-label={maximized ? ATTACH_STRINGS.restore : ATTACH_STRINGS.maximize}
        onClick={() => store.toggleMaximized()} />
      <button type="button" className="action-label codicon codicon-close" data-testid="attach-collapse"
        title={ATTACH_STRINGS.collapse} aria-label={ATTACH_STRINGS.collapse}
        onClick={() => { store.setVisible(sessionId, false); }} />
    </>
  );

  return (
    <div
      ref={rootRef}
      className={`explorer-attach-area${dragging ? ' is-dragging' : ''}${maximized ? ' is-maximized' : ''}${animating ? ' is-animating' : ''}`}
      style={style}
      data-maximized={maximized}
      data-mount-id={mountId}
      data-session-id={sessionId}
      data-visible={visible}
      aria-hidden={!visible}
      data-testid="explorer-attach-area"
      onKeyDownCapture={onRootKeyDown}
    >
      <div className="explorer-attach-content">
        <div className="explorer-viewlet attach-viewlet">
          {activeTab ? (
            <div className="title tabs show-file-icons">
              <EditorTabs editor={editor} sessionId={sessionId} onCloseBlocked={requestClose} actions={headerActions} />
              {!isChangesActive && <Breadcrumbs root={root} uri={activeTab.uri} />}
            </div>
          ) : (
            <div className="title tabs attach-empty-title-bar"><div className="tabs-and-actions-container"><div className="monaco-scrollable-element" /><div className="editor-actions">{headerActions}</div></div></div>
          )}
          <div className="editor-container">
            {!activeTab && <AttachEmptyState />}
            {isChangesActive && git && (
              <ChangesPane git={git} root={root} onOpenFile={(uri) => editor.open({ sessionId, uri, kind: 'code' })} />
            )}
            <CodeEditorPane editor={editor} sessionId={sessionId} fs={fs} onEditorReady={onEditorReady}
              onSaveRequest={(uri) => { void doSave(uri); }}
              saveError={saveError && saveError.uri === activeTab?.uri ? saveError.message : null} />
            {children}
          </div>
        </div>
      </div>
      {dialog?.kind === 'save' && (
        <AttachDialog kind="warning" testId="attach-save-dialog"
          message={ATTACH_STRINGS.saveTitle(uriBasename(dialog.uri))} detail={ATTACH_STRINGS.saveDetail}
          onCancel={() => setDialog(null)}
          buttons={[
            { id: 'save', label: ATTACH_STRINGS.save, primary: true, onSelect: () => { const u = dialog.uri; void doSave(u).then((ok) => { if (ok) editor.close({ sessionId, uri: u, force: true }); }); setDialog(null); } },
            { id: 'dontSave', label: ATTACH_STRINGS.dontSave, onSelect: () => { editor.close({ sessionId, uri: dialog.uri, force: true }); setDialog(null); } },
            { id: 'cancel', label: ATTACH_STRINGS.cancel, onSelect: () => setDialog(null) },
          ]} />
      )}
      {dialog?.kind === 'conflict' && (
        <AttachDialog kind="warning" testId="attach-conflict-dialog"
          message={ATTACH_STRINGS.conflictTitle(uriBasename(dialog.uri))} detail={ATTACH_STRINGS.conflictDetail}
          onCancel={() => setDialog(null)}
          buttons={[
            { id: 'reload', label: ATTACH_STRINGS.reload, primary: true, onSelect: () => { void onReload?.(dialog.uri); setDialog(null); } },
            { id: 'keep', label: ATTACH_STRINGS.keep, onSelect: () => setDialog(null) },
          ]} />
      )}
      <div
        className={`explorer-attach-sash${sashHover || dragging ? ' hover' : ''}`}
        role="separator"
        aria-orientation="vertical"
        aria-label="Redimensionar editor anexo"
        aria-valuenow={width}
        tabIndex={0}
        style={{ width: ATTACH_SASH_WIDTH_PX }}
        onPointerDown={onSashPointerDown}
        onPointerEnter={onSashEnter}
        onPointerLeave={onSashLeave}
        onDoubleClick={() => store.resetWidth()}
        onKeyDown={onSashKeyDown}
      />
    </div>
  );
}
