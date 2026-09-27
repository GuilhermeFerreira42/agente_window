// ============================================================================
// ui/attach/changes/ChangesPane.tsx — 4.7-b c2. Conteúdo da aba fixa "Changes"
// do Editor Anexo = Source Control View transplantada (04_21 §0/§1).
//   • `.scm-view` (classes do workbench) com lista 22 px (ChangesList);
//   • sem repositório → frase oficial do VS Code + "Initialize Repository"
//     (decisão do usuário 2026-09-26: entra no MVP, `git init` real via /git/init);
//   • detecção pelo estado do GitService (`isRepo`), nunca por erro HTTP;
//   • estado vive no GitService (puro); aqui só assinatura + DOM.
// ============================================================================
import React, { useEffect, useState } from 'react';
import type { WorkspaceUri } from '../../../contract';
import type { GitResourceGroup, GitResourceItem, GitService, GitServiceState } from '../../../core/git/gitService';
import { ConfirmDialog, type DiscardRequest } from './ConfirmDialog';
import type { GroupActionId, ResourceActionId } from './ChangesList';
import { uriBasename } from '../../../core/uri';
import { CHANGES_STRINGS } from './changesStrings';
import './changes.css';

export interface ChangesPaneProps {
  git: GitService;
  root: WorkspaceUri;
  /** Clique num recurso não-deletado → abre o ARQUIVO no anexo (diff = 4.7-c). */
  onOpenFile: (uri: WorkspaceUri) => void;
}

export function ChangesPane({ git, root, onOpenFile }: ChangesPaneProps) {
  const [state, setState] = useState<GitServiceState>(() => git.getState());
  useEffect(() => git.onStateChanged(setState), [git]);
  // primeira montagem: garante raiz + status (idempotente; o barrel também chama)
  useEffect(() => { if (git.getRoot() !== root) void git.setRoot(root); }, [git, root]);

  const onOpen = (item: GitResourceItem) => onOpenFile(item.uri);
  const repoName = uriBasename(root) || root;

  // c3 — ações (o GitService re-stata sozinho após cada operação)
  const [discard, setDiscard] = useState<DiscardRequest | null>(null);
  const run = (p: Promise<unknown>) => { void p.catch(() => undefined); };
  const onAction = (action: ResourceActionId, item: GitResourceItem) => {
    if (action === 'stage') run(git.stage([item.uri]));
    else if (action === 'unstage') run(git.unstage([item.uri]));
    else setDiscard({ items: [item] });
  };
  const onGroupAction = (action: GroupActionId, group: GitResourceGroup) => {
    if (action === 'stage-all') run(git.stage(group.items.map((i) => i.uri)));
    else if (action === 'unstage-all') run(git.unstage(group.items.map((i) => i.uri)));
    else setDiscard({ items: group.items, all: true });
  };
  const confirmDiscard = () => {
    if (!discard) return;
    const uris = discard.items.map((i) => i.uri);
    setDiscard(null);
    run(git.discard(uris));
  };

  return (
    <div className="scm-view show-file-icons" data-testid="scm-view" data-loading={state.loading} data-is-repo={state.isRepo} role="region" aria-label="Source Control">
      {state.error && <div className="scm-error" role="alert" data-testid="scm-error">{state.error}</div>}
      {!state.isRepo && !state.loading ? (
        <div className="scm-no-repo" data-testid="scm-no-repo">
          <p>{CHANGES_STRINGS.noRepo}</p>
          <div className="button-container">
            <a className="monaco-button monaco-text-button" role="button" tabIndex={0}
              onClick={() => { void git.init().catch(() => undefined); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void git.init().catch(() => undefined); } }}>
              {CHANGES_STRINGS.initialize}
            </a>
          </div>
        </div>
      ) : (
        <ChangesListLazy state={state} repoName={repoName} onRefresh={() => { void git.refreshNow(); }} onOpen={onOpen} onAction={onAction} onGroupAction={onGroupAction} />
      )}
      {discard && <ConfirmDialog request={discard} onConfirm={confirmDiscard} onCancel={() => setDiscard(null)} />}
    </div>
  );
}

// import direto (sem lazy real): mantém um único ponto de troca caso a lista vire virtualizada
import { ChangesList } from './ChangesList';
function ChangesListLazy(props: React.ComponentProps<typeof ChangesList>) { return <ChangesList {...props} />; }
