// ============================================================================
// ui/attach/diff/DiffPane.tsx — 4.7-c c1 "Diff mínimo" (04_21 §7).
// Monaco DiffEditor READ-ONLY, side-by-side, sem minimap, 14/19 px (mesmas
// opções do CodeEditorPane). Um único DiffEditor por sessão, reaproveitado a
// cada troca de payload (models originais/modificados recriados e descartados).
// Se original === modified → estado vazio "No changes detected" (codicon-check).
// Proibido aqui (escopo fechado pelo usuário): edição, stage por hunk,
// navegação entre arquivos, integração com commit.
// ============================================================================
import React, { useEffect, useRef, useState } from 'react';
import type * as Monaco from 'monaco-editor';
import type { AttachDiffPayload } from '../../../contract';
import { uriBasename } from '../../../core/uri';
import { ATTACH_MONACO_OPTIONS, currentTheme, languageFor } from '../CodeEditorPane';
import { DIFF_STRINGS } from './diffStrings';
import './diff.css';

type monaco = typeof Monaco;
let monacoPromise: Promise<monaco> | null = null;
const loadMonaco = (): Promise<monaco> => (monacoPromise ??= import('monaco-editor'));

export const ATTACH_DIFF_OPTIONS: Monaco.editor.IStandaloneDiffEditorConstructionOptions = {
  fontSize: ATTACH_MONACO_OPTIONS.fontSize,
  lineHeight: ATTACH_MONACO_OPTIONS.lineHeight,
  minimap: { enabled: false },
  automaticLayout: true,
  readOnly: true,
  originalEditable: false,
  renderSideBySide: true,
  renderOverviewRuler: true,
  enableSplitViewResizing: true,
  scrollBeyondLastLine: true,
  fixedOverflowWidgets: true,
  renderLineHighlight: 'line',
  // 4.7-c: sem "revert"/inline actions — diff é só leitura
  renderMarginRevertIcon: false,
  // FATIA-05 5.3 (docs/24 §4 5.3): perfil `agentsWindow` — sem menu da calha nem indicadores
  renderGutterMenu: false,
  renderIndicators: false,
  ignoreTrimWhitespace: false,
};

export interface DiffPaneProps {
  sessionId: string;
  payload: AttachDiffPayload;
  /** Só testes/hook DEV. */
  onReady?: (editor: Monaco.editor.IStandaloneDiffEditor) => void;
}

export function DiffPane({ sessionId, payload, onReady }: DiffPaneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const edRef = useRef<Monaco.editor.IStandaloneDiffEditor | null>(null);
  const monacoRef = useRef<monaco | null>(null);
  const modelsRef = useRef<{ original: Monaco.editor.ITextModel; modified: Monaco.editor.ITextModel } | null>(null);
  const [ready, setReady] = useState(false);
  const identical = payload.original === payload.modified;

  // cria o DiffEditor uma vez
  useEffect(() => {
    let disposed = false;
    void loadMonaco().then((monaco) => {
      if (disposed || !hostRef.current) return;
      monacoRef.current = monaco;
      const ed = monaco.editor.createDiffEditor(hostRef.current, { ...ATTACH_DIFF_OPTIONS, theme: currentTheme() });
      edRef.current = ed;
      const mo = new MutationObserver(() => monaco.editor.setTheme(currentTheme()));
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      setReady(true);
      onReady?.(ed);
      return () => mo.disconnect();
    });
    return () => {
      disposed = true;
      modelsRef.current?.original.dispose(); modelsRef.current?.modified.dispose(); modelsRef.current = null;
      edRef.current?.dispose(); edRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // troca de payload → novos models
  useEffect(() => {
    const ed = edRef.current; const monaco = monacoRef.current;
    if (!ready || !ed || !monaco || identical) return;
    const name = uriBasename(payload.resource);
    const lang = languageFor(monaco, name);
    const base = `attach-diff:${sessionId}${payload.resource.replace(/^file:\/\//, '')}`;
    const original = monaco.editor.createModel(payload.original, lang, monaco.Uri.parse(`${base}?original`));
    const modified = monaco.editor.createModel(payload.modified, lang, monaco.Uri.parse(`${base}?modified`));
    const old = modelsRef.current;
    ed.setModel({ original, modified });
    modelsRef.current = { original, modified };
    old?.original.dispose(); old?.modified.dispose();
  }, [ready, identical, payload, sessionId]);

  return (
    <div className="attach-editor-pane attach-diff-pane" data-testid="attach-diff-pane" data-identical={identical} data-resource={payload.resource} role="region" aria-label={payload.title}>
      {identical && (
        <div className="attach-diff-empty" data-testid="attach-diff-empty">
          <span className="codicon codicon-check" aria-hidden="true" />
          <span className="attach-diff-empty-text">{DIFF_STRINGS.noChanges}</span>
        </div>
      )}
      <div ref={hostRef} className="attach-diff-host" style={{ display: identical ? 'none' : undefined }} />
    </div>
  );
}
