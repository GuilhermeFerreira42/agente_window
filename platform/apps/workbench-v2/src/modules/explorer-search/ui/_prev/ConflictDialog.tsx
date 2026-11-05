// ============================================================================
// modules/explorer-search/ui/ConflictDialog.tsx — Replace/Skip/Cancel (A4.3)
// Port da decisão do getMultipleFilesOverwriteConfirm (upstream explorerViewer
// .ts:57) — o upload pergunta por colisão real; resposta resolve a Promise
// que o core/transfer/upload.ts aguarda.
// ============================================================================

import React from 'react';

export interface ConflictDialogState {
  name: string;
  resolve: (action: 'replace' | 'skip' | 'cancel') => void;
}

export function ConflictDialog({
  state,
}: {
  state: ConflictDialogState;
}): React.ReactElement {
  React.useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.stopPropagation();
        state.resolve('cancel');
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [state]);

  return (
    <div className="explorer-dialog-backdrop" role="presentation" data-testid="explorer-conflict-dialog">
      <div className="explorer-dialog" role="alertdialog" aria-modal="true" aria-labelledby="explorer-conflict-title">
        <p className="explorer-dialog-title" id="explorer-conflict-title">Arquivo já existe</p>
        <p className="explorer-dialog-message">
          Já existe um arquivo chamado “{state.name}” no destino. Deseja substituí-lo?
        </p>
        <div className="explorer-dialog-actions">
          <button
            type="button"
            className="explorer-dialog-btn is-primary"
            onClick={() => state.resolve('replace')}
            data-testid="conflict-replace"
          >
            Replace
          </button>
          <button
            type="button"
            className="explorer-dialog-btn"
            onClick={() => state.resolve('skip')}
            data-testid="conflict-skip"
          >
            Skip
          </button>
          <button
            type="button"
            className="explorer-dialog-btn"
            onClick={() => state.resolve('cancel')}
            data-testid="conflict-cancel"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
