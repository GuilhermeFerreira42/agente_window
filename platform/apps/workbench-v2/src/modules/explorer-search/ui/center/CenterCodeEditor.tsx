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
import { Breadcrumbs, BreadcrumbsSimbolos, simbolosAteCursor } from '../attach/Breadcrumbs';
import { GRUPO_SECUNDARIO } from '../../core/editor/editorService';
import { CenterSplitPane } from './CenterSplitPane';
import type { OutlineRow } from '../../core/outline/outlineModel';
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
  /** FATIA 15 Onda 3 (D169): raiz do workspace, para o breadcrumb mostrar o
   *  caminho RELATIVO (é o que o dono vê no Explorer). Ausente → caminho absoluto. */
  workspaceRoot?: WorkspaceUri;
  /** D169: capacidades de divisão. Ausentes = o painel secundário nunca aparece
   *  (módulo antigo) e o shell esconde a ação — falha visível, não botão falso. */
  splitCapabilities?: {
    isSplit(): boolean;
    /** `false` = bloqueado por aba dirty no lado secundário. */
    unsplit(force?: boolean): boolean;
    /** D169: marca o lado clicado — é ele que recebe o próximo arquivo aberto. */
    setFocusSide(side: 'principal' | 'secundario'): void;
    focusSideOf(): 'principal' | 'secundario';
  };
  /** Fonte dos símbolos para o breadcrumb — o MESMO tracker do Outline. */
  outline?: {
    rows(): readonly OutlineRow[];
    reveal(line: number, column: number): void;
    cursorPosition(): { line: number; column: number } | null;
    onChanged(cb: () => void): () => void;
  };
}

export function CenterCodeEditor({
  editor, sessionId, fs, onEditorReady, onSave, onReload, onCloseRequester, workspaceRoot, outline, splitCapabilities,
}: CenterCodeEditorProps) {
  useEditorVersion(editor, sessionId);
  // Diálogos e erro de save — mesma dupla do AttachArea (c5), menos o 'save' por
  // clique na faixa: aqui o pedido vem de fora, via onCloseRequester.
  // D169: `alvo` diz o que fechar depois da resposta. Fechar uma aba e fechar a
  // divisão inteira são o mesmo fluxo (c5) com consequências diferentes — antes
  // de existir split só havia aba, então um campo a mais é o acréscimo mínimo.
  const [dialog, setDialog] = useState<
    { kind: 'save' | 'conflict'; uri: WorkspaceUri; alvo?: 'aba' | 'divisao' } | null
  >(null);
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
    onCloseRequester((input) => {
      if (input.sessionId !== sessionId) return;
      // O serviço já decide se há dirty real: fechar limpo é imediato; só a
      // recusa por alteração pendente precisa da decisão Salvar/Descartar.
      if (editor.close({ sessionId, uri: input.uri })) return;
      setDialog({ kind: 'save', uri: input.uri });
    });
    return () => onCloseRequester(null);
  }, [editor, sessionId, onCloseRequester]);

  const doSave = async (uri: WorkspaceUri): Promise<boolean> => {
    if (!onSave) return false;
    try {
      await onSave(uri);
      setSaveError(null);
      return true;
    } catch (err) {
      editor.activate({ sessionId: editor.groupIdOf(sessionId, uri) ?? sessionId, uri });
      setSaveError({
        uri,
        message: ATTACH_STRINGS.saveFailed(uriBasename(uri), err instanceof Error ? err.message : String(err)),
      });
      return false;
    }
  };

  const activeTab = editor.getActive(sessionId);

  /**
   * D169 — a divisão é do SERVIÇO, não deste componente: quem chama
   * `attach.split()` é o shell (que tem o gate E15). Aqui só reflito o estado,
   * ouvindo `editor.splitChanged`, para montar/desmontar o painel 2. Guardar em
   * `useState` local seria uma segunda verdade sobre "existe divisão?" — e o F5
   * restauraria abas sem restaurar o booleano.
   */
  const [dividido, setDividido] = useState<boolean>(() => splitCapabilities?.isSplit() ?? false);
  useEffect(() => {
    setDividido(splitCapabilities?.isSplit() ?? false);
    return editor.onEvent((e) => {
      if (!('sessionId' in e) || e.sessionId !== sessionId) return;
      if (e.type === 'editor.splitChanged') setDividido(e.split);
    });
  }, [editor, sessionId, splitCapabilities]);

  /**
   * Fechar a divisão inteira. Dirty bloqueia (regra do serviço) e a resposta vai
   * para o MESMO diálogo do c5 — Salvar / Não Salvar / Cancelar. Não criei um
   * segundo fluxo de confirmação: o usuário já conhece este.
   */
  const fecharDivisao = () => {
    if (!splitCapabilities) return;
    if (splitCapabilities.unsplit()) return;      // sem dirty: fechou agora
    const suja = editor.getTabs(GRUPO_SECUNDARIO(sessionId)).find((tab) => tab.dirty);
    if (!suja) return;                            // não deveria acontecer: o serviço só bloqueia por dirty
    setDialog({ kind: 'save', uri: suja.uri, alvo: 'divisao' });
  };

  /**
   * FATIA 15 Onda 3 (D169) — trilha de símbolos do breadcrumb.
   *
   * Recalcula em três eventos, que são os três que o VS Code usa: o cursor mudou,
   * os símbolos mudaram (o provedor do TS só registra depois do worker subir) e o
   * modelo trocou. Sem `outline` (shell sem a capacidade), a trilha fica vazia —
   * o caminho do arquivo continua aparecendo, então nada mente.
   */
  const [trilha, setTrilha] = useState<OutlineRow[]>([]);
  const [versaoSimbolos, setVersaoSimbolos] = useState(0);
  useEffect(() => {
    if (!outline) return;
    return outline.onChanged(() => setVersaoSimbolos((v) => v + 1));
  }, [outline]);
  const activeUri = activeTab && activeTab.kind !== 'diff' ? activeTab.uri : null;
  useEffect(() => {
    if (!outline || !activeUri) { setTrilha([]); return; }
    let vivo = true;
    // O cursor muda a cada tecla: recalcular no evento de conteúdo é o mesmo
    // debounce que o tracker já faz, então aqui basta reler no próximo quadro.
    const ler = () => {
      if (!vivo) return;
      const pos = outline.cursorPosition();
      setTrilha(pos ? simbolosAteCursor(outline.rows(), pos.line) : []);
    };
    ler();
    const id = window.setInterval(ler, 400);
    return () => { vivo = false; window.clearInterval(id); };
  }, [outline, activeUri, versaoSimbolos]);
  // FATIA 15 Onda 2c-ii (D152 §2): a aba ativa do módulo também pode ser um DIFF
  // (`kind: 'diff'` → tipo `diff-arquivo` no centro). O DiffPane é o MESMO componente
  // que a coluna usa (Regra 8 LEGO), e o CodeEditorPane continua montado ao lado —
  // com a aba diff ativa ele fica com `setModel(null)` e host `display:none`, que é
  // exatamente o que o AttachArea faz hoje. Manter os dois montados é o que preserva
  // os modelos do Monaco ao alternar arquivo ↔ diff (RF15-2: alternar sem perder estado).
  const diffPayload = activeTab && activeTab.kind === 'diff' ? (activeTab.diff ?? null) : null;
  const isDiffActive = !!diffPayload;

  return (
    <div
      className={`explorer-viewlet attach-viewlet center-code-editor${dividido ? ' is-split' : ''}`}
      data-testid="center-code-editor"
      // D169: clique em qualquer parte do painel principal o torna o lado ATIVO.
      // Em captura para pegar também os cliques dentro do Monaco (que não sobem
      // como focus de React) sem interferir na seleção de texto.
      onPointerDownCapture={() => { if (dividido) splitCapabilities?.setFocusSide('principal'); }}
    >
      {/* D169: breadcrumb do editor definitivo — caminho do arquivo (relativo à
          raiz) + trilha de símbolos do cursor. Só com arquivo ativo: em diff e em
          aba vazia não há arquivo a descrever, e uma barra vazia é ruído. */}
      {activeUri && (
        <div className="center-breadcrumbs" data-testid="center-breadcrumbs">
          <Breadcrumbs root={(workspaceRoot ?? activeUri) as WorkspaceUri} uri={activeUri as WorkspaceUri} />
          <BreadcrumbsSimbolos trilha={trilha} onIr={(row) => outline?.reveal(row.line, row.column)} />
        </div>
      )}
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
          key={sessionId}
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

      {/* D169 — o SEGUNDO grupo. Montado só quando o serviço diz que há divisão:
          o estado vive lá (sobrevive a anexo↔maximizado, que é layout do shell).
          O corpo é o mesmo CodeEditorPane; o modelo do Monaco é por painel porque
          cada grupo tem abas próprias — a mesma URI nunca está nos dois lados. */}
      {dividido && (
        <CenterSplitPane
          editor={editor}
          sessionId={sessionId}
          fs={fs}
          onEditorReady={onEditorReady}
          onCloseBlocked={(input) => setDialog({ kind: 'save', uri: input.uri })}
          onSave={async (uri) => { await doSave(uri); }}
          saveError={saveError}
          onCloseSplit={fecharDivisao}
          onFocusSide={() => splitCapabilities?.setFocusSide('secundario')}
          workspaceRoot={workspaceRoot}
          outline={outline}
        />
      )}

      {dialog?.kind === 'save' && (
        <AttachDialog
          kind="warning"
          testId="center-save-dialog"
          message={dialog.alvo === 'divisao'
            ? `Fechar o editor dividido? Há alterações não salvas em ${uriBasename(dialog.uri)}.`
            : ATTACH_STRINGS.saveTitle(uriBasename(dialog.uri))}
          detail={ATTACH_STRINGS.saveDetail}
          onCancel={() => setDialog(null)}
          buttons={[
            {
              id: 'save',
              label: ATTACH_STRINGS.save,
              primary: true,
              onSelect: () => {
                const { uri: u, alvo } = dialog;
                setDialog(null);
                void doSave(u).then((ok) => {
                  if (!ok) return;
                  if (alvo === 'divisao') fecharDivisao();
                  else editor.close({ sessionId: editor.groupIdOf(sessionId, u) ?? sessionId, uri: u });
                });
              },
            },
            {
              id: 'dontSave',
              label: ATTACH_STRINGS.dontSave,
              onSelect: () => {
                const { uri: u, alvo } = dialog;
                setDialog(null);
                editor.close({ sessionId: editor.groupIdOf(sessionId, u) ?? sessionId, uri: u, force: true });
                if (alvo === 'divisao') fecharDivisao();
              },
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
