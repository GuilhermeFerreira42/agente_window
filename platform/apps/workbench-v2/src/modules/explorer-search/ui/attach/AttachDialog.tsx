// ============================================================================
// ui/attach/AttachDialog.tsx — 4.7 c5. `.monaco-dialog-box` (base/browser/ui/
// dialog/dialog.ts) — mesma casca medida na 4.6 (498 px, radius 12, botões
// 26 px): ícone `codicon-dialog-warning`, mensagem + detalhe, N botões
// (primário = 1.º, foco inicial), Enter = primário, Esc = cancelar, focus trap
// (Tab circula dentro), aria-modal, portal no body.
// ============================================================================
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ATTACH_STRINGS } from './attachStrings';

export interface AttachDialogButton { id: string; label: string; primary?: boolean; onSelect: () => void }
export interface AttachDialogProps {
  kind: 'warning' | 'info';
  message: string;
  detail?: string;
  buttons: AttachDialogButton[];
  onCancel: () => void;
  testId?: string;
}

export function AttachDialog({ kind, message, detail, buttons, onCancel, testId }: AttachDialogProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    boxRef.current?.querySelector<HTMLElement>('.monaco-button.primary')?.focus();
    return () => prev?.focus?.();
  }, []);
  const focusables = () => Array.from(boxRef.current?.querySelectorAll<HTMLElement>('[tabindex="0"]') ?? []);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel(); return; }
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      const focusedBtn = buttons.find((b) => target.getAttribute('data-button-id') === b.id);
      e.preventDefault(); e.stopPropagation();
      (focusedBtn ?? buttons.find((b) => b.primary) ?? buttons[0])?.onSelect();
      return;
    }
    if (e.key === 'Tab') {
      const list = focusables();
      if (!list.length) return;
      const i = list.indexOf(document.activeElement as HTMLElement);
      e.preventDefault();
      const next = e.shiftKey ? (i <= 0 ? list.length - 1 : i - 1) : (i >= list.length - 1 ? 0 : i + 1);
      list[next].focus();
    }
  };
  return createPortal(
    <div className="monaco-dialog-modal-block dimmed explorer-search-dialog attach-dialog" onKeyDown={onKeyDown} onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }} data-testid={testId}>
      <div ref={boxRef} className="monaco-dialog-box" role="dialog" tabIndex={-1} aria-modal="true" aria-labelledby="attach-dialog-message" aria-describedby="attach-dialog-detail">
        <div className="dialog-buttons-row">
          <div className="dialog-buttons">
            {buttons.map((b) => (
              <a key={b.id} className={`monaco-button monaco-text-button${b.primary ? ' primary' : ' secondary'}`} tabIndex={0} role="button" data-button-id={b.id}
                onClick={b.onSelect} onKeyDown={(e) => { if (e.key === ' ') { e.preventDefault(); e.stopPropagation(); b.onSelect(); } }}>{b.label}</a>
            ))}
          </div>
        </div>
        <div className="dialog-message-row">
          <div className={`dialog-icon codicon codicon-dialog-${kind}`} aria-label={ATTACH_STRINGS.warning} />
          <div className="dialog-message-container">
            <div id="attach-dialog-message" className="dialog-message">{message}</div>
            {detail && <div id="attach-dialog-detail" className="dialog-message-detail">{detail}</div>}
          </div>
        </div>
        <div className="dialog-toolbar-row">
          <div className="dialog-toolbar">
            <div className="monaco-action-bar">
              <ul className="actions-container" role="toolbar">
                <li className="action-item" role="presentation"><a className="action-label codicon codicon-dialog-close" role="button" aria-label={ATTACH_STRINGS.closeDialog} tabIndex={0} onClick={onCancel} /></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
