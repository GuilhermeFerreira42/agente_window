// ============================================================================
// ui/attach/changes/ConfirmDialog.tsx — 4.7-b c3. Confirmação de Discard com os
// textos oficiais da extensão git (04_21 §1.4) sobre a MESMA casca
// `.monaco-dialog-box` homologada no 4.7 c5 (AttachDialog: aria-modal, focus
// trap, Enter = primário, Esc = cancelar). Puro: decide texto/botão a partir
// dos itens; quem executa é o ChangesPane.
// ============================================================================
import React from 'react';
import type { GitResourceItem } from '../../../core/git/gitService';
import { AttachDialog } from '../AttachDialog';
import { CHANGES_STRINGS as S } from './changesStrings';

export interface DiscardRequest { items: GitResourceItem[]; all?: boolean }

/** Texto/botão exatamente como `git.clean` / `git.cleanAll` (commands.ts). */
export function discardCopy(req: DiscardRequest): { message: string; detail: string; confirm: string } {
  const untracked = req.items.filter((i) => i.letter === 'U');
  const tracked = req.items.filter((i) => i.letter !== 'U');
  const n = req.items.length;
  const untrackedQ = untracked.length === 1 ? S.deleteUntrackedOne(untracked[0].name) : S.deleteUntrackedMany(untracked.length);
  const untrackedD = untracked.length === 1 ? S.deleteUntrackedDetail : S.deleteUntrackedManyDetail;
  const trackedQ = tracked.length === 1 ? S.discardOne(tracked[0].name) : S.discardAllMessage(tracked.length);
  if (tracked.length === 0) return { message: untrackedQ, detail: untrackedD, confirm: untracked.length === 1 ? S.deleteFile : S.deleteFiles };
  if (untracked.length === 0) {
    return tracked.length === 1
      ? { message: trackedQ, detail: '', confirm: S.discardFile }
      : { message: trackedQ, detail: S.discardDetail, confirm: S.discardAllFiles(n) };
  }
  // misto (cleanAll com untracked): `${untrackedQ} ${trackedQ}` + detalhe dos rastreados
  return { message: `${untrackedQ} ${trackedQ}`, detail: S.discardDetail, confirm: S.discardAllFiles(n) };
}

export interface ConfirmDialogProps { request: DiscardRequest; onConfirm: () => void; onCancel: () => void }

export function ConfirmDialog({ request, onConfirm, onCancel }: ConfirmDialogProps) {
  const copy = discardCopy(request);
  return (
    <AttachDialog kind="warning" testId="scm-confirm-dialog" message={copy.message} detail={copy.detail} onCancel={onCancel}
      buttons={[
        { id: 'confirm', label: copy.confirm, primary: true, onSelect: onConfirm },
        { id: 'cancel', label: S.cancel, onSelect: onCancel },
      ]} />
  );
}
