// ============================================================================
// ui/attach/changes/CommitInput.tsx — 4.7 c4 "Input de Commit" (04_21 §7 DoD).
// DOM/medidas da SCM View (04_21 §1): `.scm-editor > .scm-input` (padding-left 11,
// radius 4, 1 linha = 26 px, cresce até 134 px) + `.button-container > .monaco-button`
// "✓ Commit" (padding 4 8, radius 4, lh 16, font 12, largura total). Ctrl+Enter
// comita. Validação inline (`.scm-editor-validation`) para mensagem vazia.
// Puro: não conhece git — recebe `onCommit(message)`; quem decide é o ChangesPane.
// ============================================================================
import React, { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import { CHANGES_STRINGS as S } from './changesStrings';

export interface CommitInputProps {
  branch: string | null;
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  /** Texto de validação sob o input (null = nada). */
  validation: string | null;
  busy?: boolean;
}
export interface CommitInputHandle { focus(): void }

export const CommitInput = forwardRef<CommitInputHandle, CommitInputProps>(function CommitInput({ branch, value, onChange, onCommit, validation, busy }, ref) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => ({ focus: () => taRef.current?.focus() }), []);
  // auto-grow: 1 linha (26 px) até 134 px, como o editor de 1 linha da SCM
  useEffect(() => {
    const el = taRef.current; if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(134, Math.max(26, el.scrollHeight))}px`;
  }, [value]);
  return (
    <div className="scm-editor" data-testid="scm-commit">
      <div className={`scm-input${validation ? ' has-validation' : ''}`}>
        <textarea ref={taRef} className="scm-input-textarea" data-testid="scm-commit-input" rows={1} value={value} disabled={busy}
          placeholder={S.commitPlaceholder(branch)} aria-label={S.commitPlaceholder(branch)} spellCheck={false}
          aria-invalid={!!validation} aria-describedby={validation ? 'scm-commit-validation' : undefined}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onCommit(); } }} />
        {validation && <div id="scm-commit-validation" className="scm-editor-validation" role="alert" data-testid="scm-commit-validation">{validation}</div>}
      </div>
      <div className="button-container">
        <a className="monaco-button monaco-text-button scm-commit-button" role="button" tabIndex={0} data-testid="scm-commit-button"
          title={S.commitTitle} aria-label={S.commitTitle} aria-disabled={busy}
          onClick={() => { if (!busy) onCommit(); }}
          onKeyDown={(e) => { if (!busy && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onCommit(); } }}>
          <span className="codicon codicon-check" aria-hidden="true" />
          <span className="scm-commit-label">{S.commit}</span>
        </a>
      </div>
    </div>
  );
});
