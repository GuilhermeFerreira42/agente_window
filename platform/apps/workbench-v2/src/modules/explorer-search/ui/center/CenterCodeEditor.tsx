// ============================================================================
// ui/center/CenterCodeEditor.tsx — Fatia 15, Onda 2b (D146 §2, passo 2b).
//
// O corpo da aba central CAPAZ DE SALVAR. É o CodeEditorPane do anexo — o mesmo
// componente, reaproveitado e não reescrito (Regra 8 LEGO) — montado sem
// cabeçalho, sem faixa de abas, sem breadcrumbs, sem sash e sem empty state:
// no centro quem manda na faixa, no vazio e no layout é o shell.
//
// Do que este corpo é dono, e só disto:
//   • Ctrl+S dentro do Monaco → onSave(uri) → writeFile atômico (RF15-1);
//   • falha de save → mensagem na URI ativa, que some na próxima edição;
//   • mudança externa no disco com a aba dirty → diálogo Recarregar/Manter;
//   • pedido de fechar aba vindo de FORA (a faixa é do shell) → diálogo
//     Salvar/Não Salvar/Cancelar, EXECUTADO AQUI, porque só aqui estão doSave e
//     editor.close(force). O shell não alcança o EditorService (Regra 2), então
//     ele pede e o módulo age — é o que `attach.requestCloseTab` faz.
//
// Por que `.attach-viewlet` na raiz: as 75 regras que dão estilo ao
// CodeEditorPane (attach-editor-pane, attach-monaco-host, image preview, error
// editor, attach-save-error, diálogos) são todas escopadas em `.attach-viewlet`
// no attach.css. Montar o corpo sem essa classe deixaria o editor funcional e
// sem estilo nenhum. `.explorer-viewlet` vem junto por causa do codicon.ttf e
// da paleta Seti; o fundo dela (--vscode-sideBar-background) é sobrescrito no
// center.css, porque no centro a cor é a do editor.
//
// O que NÃO está aqui de propósito: faixa de abas, empty state, sash,
// maximizar, persistência. No centro isso é do shell (Onda 2c).
// ============================================================================
import React, { useEffect, useState } from 'react';
import type { EditorService } from '../../core/editor/editorService';
import type { WorkspaceUri } from '../../contract';
import { uriBasename } from '../../core/uri';
import { CodeEditorPane, type CodeEditorPaneProps } from '../attach/CodeEditorPane';
import { DiffPane } from '../attach/diff/DiffPane';
import { DiffPaneBoundary } from '../attach/diff/DiffPaneBoundary';
import { AttachDialog } from '../attach/AttachDialog';
import { ATTACH_STRINGS } from '../attach/attachStrings';
import { useEditorVersion } from '../attach/useEditorVersion';
import '../explorer.css';
import '../attach/attach.css';
import './center.css';

/** Quem atende um pedido de fechar aba vindo de fora do módulo (a faixa do shell). */
export type CenterCloseRequester = (input: { sessionId: string; uri: WorkspaceUri }) => void;

export interface CenterCodeEditorProps {
  /** Modelo de abas (puro) — o MESMO EditorService do anexo: uma fonte de verdade. */
  editor: EditorService;
  sessionId: string;
  /** Leitura de arquivos para o Monaco (tipo idêntico ao do CodeEditorPane). */
  fs: CodeEditorPaneProps['fs'];
  /** Gancho do barrel para registrar a instância do Monaco e a api do painel. */
  onEditorReady?: CodeEditorPaneProps['onEditorReady'];
  /** Salva a URI (writeFile atomic) — rejeita em falha; dirty limpa só após resolver. */
  onSave?: (uri: WorkspaceUri) => Promise<void>;
  /** Recarrega do disco (conflito externo → "Recarregar"). */
  onReload?: (uri: WorkspaceUri) => Promise<void>;
  /** Registra com o factory quem atende `attach.requestCloseTab` desta sessão:
   *  chamado com a função no mount e com null no unmount. */
  onCloseRequester?: (requester: CenterCloseRequester | null) => void;
}

export function CenterCodeEditor({
  editor, sessionId, fs, onEditorReady, onSave, onReload, onCloseRequester,
}: CenterCodeEditorProps) {
  useEditorVersion(editor, sessionId);
  // Diálogos e erro de save — mesma dupla do AttachArea (c5), menos o 'save' por
  // clique na faixa: aqui o pedido vem de fora, via onCloseRequester.
  const [dialog, setDialog] = useState<{ kind: 'save' | 'conflict'; uri: WorkspaceUri } | null>(null);
  const [saveError, setSaveError] = useState<{ uri: WorkspaceUri; message: string } | null>(null);

  useEffect(() => editor.onEvent((e) => {
    if (!('sessionId' in e) || e.sessionId !== sessionId) return;
    if (e.type === 'editor.externalChange' && e.dirty) setDialog((d) => d ?? { kind: 'conflict', uri: e.uri });
    if (e.type === 'editor.dirtyChanged' && e.dirty) setSaveError((s) => (s?.uri === e.uri ? null : s));
    if (e.type === 'editor.tabClosed') {
      setSaveError((s) => (s?.uri === e.uri ? null : s));
      setDialog((d) => (d?.uri === e.uri ? null : d));
    }
  }), [editor, sessionId]);

  // Registra o atendente de "fechar aba" para o factory. setDialog é estável,
  // então o efeito só roda quando o próprio gancho muda.
  useEffect(() => {
    if (!onCloseRequester) return;
    onCloseRequester((input) => { setDialog({ kind: 'save', uri: input.uri }); });
    return () => onCloseRequester(null);
  }, [onCloseRequester]);

  const doSave = async (uri: WorkspaceUri): Promise<boolean> => {
    if (!onSave) return false;
    try {
      await onSave(uri);
      setSaveError(null);
      return true;
    } catch (err) {
      setSaveError({
        uri,
        message: ATTACH_STRINGS.saveFailed(uriBasename(uri), err instanceof Error ? err.message : String(err)),
      });
      return false;
    }
  };

  const activeTab = editor.getActive(sessionId);
  // FATIA 15 Onda 2c-ii (D152 §2): a aba ativa do módulo também pode ser um DIFF
  // (`kind: 'diff'` → tipo `diff-arquivo` no centro). O DiffPane é o MESMO componente
  // que a coluna usa (Regra 8 LEGO), e o CodeEditorPane continua montado ao lado —
  // com a aba diff ativa ele fica com `setModel(null)` e host `display:none`, que é
  // exatamente o que o AttachArea faz hoje. Manter os dois montados é o que preserva
  // os modelos do Monaco ao alternar arquivo ↔ diff (RF15-2: alternar sem perder estado).
  const diffPayload = activeTab && activeTab.kind === 'diff' ? (activeTab.diff ?? null) : null;
  const isDiffActive = !!diffPayload;

  return (
    <div className="explorer-viewlet attach-viewlet center-code-editor" data-testid="center-code-editor">
      <div className="editor-container">
        {isDiffActive && (
          <DiffPaneBoundary
            resetKey={`${diffPayload.title}:${diffPayload.original.length}:${diffPayload.modified.length}`}
            fileName={diffPayload.title}
          >
            <DiffPane sessionId={sessionId} payload={diffPayload} />
          </DiffPaneBoundary>
        )}
        <CodeEditorPane
          editor={editor}
          sessionId={sessionId}
          fs={fs}
          onEditorReady={onEditorReady}
          onSaveRequest={(uri) => { void doSave(uri); }}
          saveError={saveError && saveError.uri === activeTab?.uri ? saveError.message : null}
        />
        {/* Marca de estado honesto: nenhum diff e nenhum arquivo legivel na aba ativa. */}
        {!isDiffActive && !activeTab && (
          <div className="editor-surface-empty" role="status" data-testid="center-empty-state">
            <strong>Nenhuma aba aberta</strong>
            <span>Abra um arquivo pelo Explorer, pela busca ou pelo Source Control.</span>
          </div>
        )}
      </div>

      {dialog?.kind === 'save' && (
        <AttachDialog
          kind="warning"
          testId="center-save-dialog"
          message={ATTACH_STRINGS.saveTitle(uriBasename(dialog.uri))}
          detail={ATTACH_STRINGS.saveDetail}
          onCancel={() => setDialog(null)}
          buttons={[
            {
              id: 'save',
              label: ATTACH_STRINGS.save,
              primary: true,
              onSelect: () => {
                const u = dialog.uri;
                void doSave(u).then((ok) => { if (ok) editor.close({ sessionId, uri: u, force: true }); });
                setDialog(null);
              },
            },
            {
              id: 'dontSave',
              label: ATTACH_STRINGS.dontSave,
              onSelect: () => { editor.close({ sessionId, uri: dialog.uri, force: true }); setDialog(null); },
            },
            { id: 'cancel', label: ATTACH_STRINGS.cancel, onSelect: () => setDialog(null) },
          ]}
        />
      )}

      {dialog?.kind === 'conflict' && (
        <AttachDialog
          kind="warning"
          testId="center-conflict-dialog"
          message={ATTACH_STRINGS.conflictTitle(uriBasename(dialog.uri))}
          detail={ATTACH_STRINGS.conflictDetail}
          onCancel={() => setDialog(null)}
          buttons={[
            {
              id: 'reload',
              label: ATTACH_STRINGS.reload,
              primary: true,
              onSelect: () => { const u = dialog.uri; setDialog(null); void onReload?.(u); },
            },
            { id: 'keep', label: ATTACH_STRINGS.keep, onSelect: () => setDialog(null) },
          ]}
        />
      )}
    </div>
  );
}
