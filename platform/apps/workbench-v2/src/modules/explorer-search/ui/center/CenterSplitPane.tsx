// ============================================================================
// ui/center/CenterSplitPane.tsx — FATIA 15 Onda 3 (D169). O SEGUNDO grupo do
// editor central.
//
// O que havia antes: `handleSplitEditor` (App.tsx) emitia
// "Divisão indisponível…" ou abria uma ABA FALSA chamada "Files (divisão)" com
// `path: 'workspace/split'` — nenhuma área nova, nenhum arquivo independente.
// Medido no browser: os dois caminhos existiam e nenhum dividia nada.
//
// O que este componente é: o MESMO Lego que o centro já usa, apontado para o
// grupo secundário do EditorService.
//   • `EditorTabs`  → faixa de abas do grupo 2 (mesmo DOM do VS Code, com ✕,
//                     dirty, preview, botão do meio);
//   • `CodeEditorPane` → corpo Monaco completo (salvar, breadcrumb, Modelos);
//   • `Breadcrumbs` → mesma faixa de caminho+símbolos do painel principal.
//
// Por que NÃO criei um "SplitEditorService": o EditorService já é o dono das
// abas e já tem o conceito de grupo (o `Map` é indexado por id de grupo desde
// sempre). A única coisa que faltava era um segundo id por sessão — e é isso que
// `editorService.split()` cria. Um serviço paralelo seria a segunda fonte de
// verdade que a Regra 2 proíbe.
//
// Estado: nada de `useState` para abas/ativa — a faixa e o corpo leem o serviço
// (via `useEditorVersion`), então abrir/fechar/ativar refletem na hora e não há
// como divergirem.
// ============================================================================
import React from 'react';
import type { WorkspaceUri } from '../../contract';
import { GRUPO_SECUNDARIO, type EditorService } from '../../core/editor/editorService';
import type { OutlineRow } from '../../core/outline/outlineModel';
import { Breadcrumbs, BreadcrumbsSimbolos, simbolosAteCursor } from '../attach/Breadcrumbs';
import { CodeEditorPane, type CodeEditorPaneProps } from '../attach/CodeEditorPane';
import { EditorTabs } from '../attach/EditorTabs';
import { useEditorVersion } from '../attach/useEditorVersion';

export interface CenterSplitPaneProps {
  editor: EditorService;
  /** Sessão LÓGICA (a do grupo principal). O id de grupo é derivado aqui. */
  sessionId: string;
  fs: CodeEditorPaneProps['fs'];
  onEditorReady?: CodeEditorPaneProps['onEditorReady'];
  /** Fechar aba dirty: o serviço bloqueia; o diálogo é o mesmo do centro (c5). */
  onCloseBlocked: (input: { sessionId: string; uri: WorkspaceUri }) => void;
  onSave?: (uri: WorkspaceUri) => Promise<void>;
  saveError?: { uri: WorkspaceUri; message: string } | null;
  /** Fecha a divisão inteira (o ✕ do cabeçalho do painel). */
  onCloseSplit: () => void;
  /** D169: clique aqui marca este lado como o foco dos próximos arquivos. */
  onFocusSide: () => void;
  workspaceRoot?: WorkspaceUri;
  outline?: {
    rows(): readonly OutlineRow[];
    reveal(line: number, column: number): void;
    cursorPosition(): { line: number; column: number } | null;
    onChanged(cb: () => void): () => void;
  };
}

export function CenterSplitPane({
  editor, sessionId, fs, onEditorReady, onCloseBlocked, onSave, saveError, onCloseSplit, onFocusSide, workspaceRoot, outline,
}: CenterSplitPaneProps) {
  const grupoId = GRUPO_SECUNDARIO(sessionId);
  // O painel lê o grupo e reage a QUALQUER evento dele (a versão é por grupo).
  useEditorVersion(editor, grupoId);

  const activeTab = editor.getActive(grupoId);
  const activeUri = activeTab && activeTab.kind !== 'diff' ? activeTab.uri : null;

  // Breadcrumb do painel 2 — mesma composição do principal. Aqui o cursor é o do
  // editor DESTE painel; o tracker de símbolos é compartilhado (ele segue o
  // editor com posse), então a trilha pode descrever o outro lado por alguns
  // milissegundos após o foco trocar. Preferi isso a criar um segundo tracker:
  // o pedido era uma fonte de símbolos, não duas.
  const [trilha, setTrilha] = React.useState<OutlineRow[]>([]);
  const [versao, setVersao] = React.useState(0);
  React.useEffect(() => {
    if (!outline) return;
    return outline.onChanged(() => setVersao((v) => v + 1));
  }, [outline]);
  React.useEffect(() => {
    if (!outline || !activeUri) { setTrilha([]); return; }
    let vivo = true;
    const ler = () => {
      if (!vivo) return;
      const pos = outline.cursorPosition();
      setTrilha(pos ? simbolosAteCursor(outline.rows(), pos.line) : []);
    };
    ler();
    const id = window.setInterval(ler, 400);
    return () => { vivo = false; window.clearInterval(id); };
  }, [outline, activeUri, versao]);

  return (
    <div
      className="center-split-pane"
      data-testid="center-split-pane"
      data-group={grupoId}
      onPointerDownCapture={onFocusSide}
    >
      <EditorTabs
        editor={editor}
        sessionId={grupoId}
        onCloseBlocked={onCloseBlocked}
        // D169: o `actions` é o slot que o EditorTabs já oferece (nasceu para o
        // botão de maximizar). Usá-lo aqui mantém a faixa do painel 2 na MESMA
        // altura da faixa do painel 1 — um cabeçalho próprio desalinhava as duas
        // abas em 24 px (medido no browser).
        actions={(
          <button
            type="button"
            className="toolbar-button"
            title="Fechar editor dividido"
            aria-label="Fechar editor dividido"
            onClick={onCloseSplit}
          >✕</button>
        )}
      />
      {activeUri && (
        <div className="center-breadcrumbs" data-testid="center-split-breadcrumbs">
          <Breadcrumbs root={(workspaceRoot ?? activeUri) as WorkspaceUri} uri={activeUri as WorkspaceUri} />
          <BreadcrumbsSimbolos trilha={trilha} onIr={(row) => outline?.reveal(row.line, row.column)} />
        </div>
      )}
      {!activeUri && (
        <div className="center-split-empty" data-testid="center-split-empty">
          <span>Escolha um arquivo no Explorer para abrir deste lado, ou use “Abrir ao lado” na aba.</span>
        </div>
      )}
      <div className="editor-container">
        <CodeEditorPane
          key={grupoId}
          editor={editor}
          sessionId={grupoId}
          fs={fs}
          onEditorReady={onEditorReady}
          onSaveRequest={(uri) => { void onSave?.(uri); }}
          saveError={saveError?.uri === activeUri ? saveError.message : null}
        />
      </div>
    </div>
  );
}
