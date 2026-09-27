// ============================================================================
// ui/attach/EditorTabs.tsx — 4.7 c3. Faixa de abas do Editor Anexo, fiel ao
// `tabsTitleControl.ts` (DOM e classes do workbench, medidas da 04_20 §1):
// faixa 35 px · aba padding-left 10 / right 0, min-width fit-content, border-right
// 1 px · label 13 px · ícone Seti 16 px + 6 px · ativa com
// `tab-border-top-container` 1 px · preview = label itálico ·
// `.tab-actions` 28×20 com ✕ 20×20 r6 (`codicon-close`) · dirty → `codicon-close-dirty`
// (●) que vira ✕ no hover da aba · clique ativa · dblclick pina · botão do meio fecha.
// Estado vive no EditorService (puro); aqui só DOM + eventos.
// ============================================================================
import React from 'react';
import type { WorkspaceUri } from '../../contract';
import type { EditorService } from '../../core/editor/editorService';
import { uriBasename, uriPath } from '../../core/uri';
import { fileIconLabelClasses } from './fileIconClasses';
import { useEditorVersion } from './useEditorVersion';
import { CHANGES_STRINGS } from './changes/changesStrings';

export interface EditorTabsProps {
  editor: EditorService;
  sessionId: string;
  /** Fechar aba dirty: o serviço bloqueia; quem decide (diálogo Save/Don't Save) é o c5. */
  onCloseBlocked?: (input: { sessionId: string; uri: WorkspaceUri }) => void;
  /** Slot dos `editor-actions` à direita (c6: maximizar). */
  actions?: React.ReactNode;
}

export function EditorTabs({ editor, sessionId, onCloseBlocked, actions }: EditorTabsProps) {
  useEditorVersion(editor, sessionId);
  const tabs = editor.getTabs(sessionId);

  const requestClose = (uri: WorkspaceUri) => {
    if (!editor.close({ sessionId, uri })) onCloseBlocked?.({ sessionId, uri });
  };

  return (
    <div className="tabs-and-actions-container" data-testid="attach-tabs">
      <div className="monaco-scrollable-element">
        <div className="tabs-container" role="tablist" aria-label="Abas do editor anexo">
          {tabs.map((t) => {
            const isChanges = t.kind === 'changes';
            const name = isChanges ? CHANGES_STRINGS.tabLabel : uriBasename(t.uri);
            const cls = ['tab', 'tab-actions-right', 'sizing-fit', 'has-icon',
              t.active ? 'active' : '', t.preview ? 'preview' : '', t.dirty ? 'dirty' : ''].filter(Boolean).join(' ');
            return (
              <div
                key={t.uri}
                className={cls}
                role="tab"
                aria-selected={t.active}
                aria-label={`${name}${t.dirty ? ', unsaved' : ''}${t.preview ? ', preview' : ''}`}
                title={isChanges ? CHANGES_STRINGS.openChanges : uriPath(t.uri)}
                tabIndex={t.active ? 0 : -1}
                data-uri={t.uri}
                data-kind={t.kind}
                onClick={() => editor.activate({ sessionId, uri: t.uri })}
                onDoubleClick={() => editor.pin({ sessionId, uri: t.uri })}
                onMouseUp={(e) => { if (e.button === 1) { e.preventDefault(); if (!isChanges) requestClose(t.uri); } }}
                onAuxClick={(e) => { if (e.button === 1) e.preventDefault(); }}
                onKeyDown={(e) => { if (!isChanges && (e.key === 'Delete' || (e.key === 'w' && (e.ctrlKey || e.metaKey)))) { e.preventDefault(); requestClose(t.uri); } }}
              >
                {t.active && <div className="tab-border-top-container" />}
                <div className="tab-label">
                  {isChanges ? (
                    <div className="monaco-icon-label" aria-hidden="true">
                      <span className="codicon codicon-source-control" />
                      <span className="monaco-icon-label-container">
                        <span className="monaco-icon-name-container"><a className="label-name">{name}</a></span>
                      </span>
                    </div>
                  ) : (
                    <div className={fileIconLabelClasses(name, [t.preview ? 'italic' : ''])} aria-hidden="true">
                      <span className="monaco-icon-label-container">
                        <span className="monaco-icon-name-container"><a className="label-name">{name}</a></span>
                      </span>
                    </div>
                  )}
                </div>
                {/* 4.7-b c2: a aba fixa "Changes" não tem ✕ (fecha só por API/menu futuro) */}
                {!isChanges && <div className="tab-actions">
                  <div className="monaco-action-bar">
                    <ul className="actions-container" role="toolbar">
                      <li className="action-item" role="presentation">
                        <a
                          className={`action-label codicon ${t.dirty ? 'codicon-close-dirty' : 'codicon-close'}`}
                          role="button"
                          tabIndex={-1}
                          aria-label={t.dirty ? 'Close (unsaved)' : 'Close (Ctrl+W)'}
                          title={t.dirty ? 'Close (unsaved changes)' : 'Close (Ctrl+W)'}
                          onClick={(e) => { e.stopPropagation(); requestClose(t.uri); }}
                          onDoubleClick={(e) => e.stopPropagation()}
                        />
                      </li>
                    </ul>
                  </div>
                </div>}
                <div className="tab-border-bottom-container" />
              </div>
            );
          })}
        </div>
      </div>
      <div className="editor-actions">{actions}</div>
    </div>
  );
}
