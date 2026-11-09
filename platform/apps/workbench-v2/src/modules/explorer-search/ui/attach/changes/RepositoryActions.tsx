import { useEffect, useState } from 'react';
import type { GitRepositoryAction, GitRepositoryDetails, GitService } from '../../../core/git/gitService';
import { AttachDialog } from '../AttachDialog';

export function RepositoryActions({ git, branch }: { git: GitService; branch: string | null }) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<GitRepositoryDetails>();
  const [name, setName] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedRemote, setSelectedRemote] = useState('');
  const [confirm, setConfirm] = useState<{ action: GitRepositoryAction; target?: string; expectedBranch?: string; message: string; detail: string }>();
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let current = true;
    git.repositoryDetails().then(next => {
      if (!current) return;
      setDetails(next);
      setSelectedBranch(value => next.branches.includes(value) ? value : next.branches.find(item => item !== branch) ?? '');
      setSelectedRemote(value => next.remotes.includes(value) ? value : next.remotes[0] ?? '');
    }, cause => { if (current) setError(cause instanceof Error ? cause.message : String(cause)); });
    return () => { current = false; };
  }, [branch, git, open, revision]);

  const run = async (action: GitRepositoryAction, target?: string, expectedBranch?: string) => {
    setConfirm(undefined);
    setBusy(true);
    setError('');
    try {
      await git.repositoryAction(action, target, expectedBranch);
      if (action === 'create') setName('');
    } catch {
      // A mensagem do serviço aparece na barra de erro de Source Control.
    } finally {
      setRevision(value => value + 1);
      setBusy(false);
    }
  };

  return (
    <details className="scm-repository-actions" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
      <summary>Repository Actions{branch && <> · {branch}</>}</summary>
      {open && <>
        {error && <p role="alert">{error}</p>}
        {details && <>
          <fieldset disabled={busy}>
            <legend>Branches</legend>
            <form onSubmit={event => { event.preventDefault(); if (name.trim()) void run('create', name.trim()); }}>
              <input aria-label="New branch name" placeholder="Branch name" value={name} onChange={event => setName(event.target.value)} />
              <button type="submit" disabled={!name.trim()}>Create Branch</button>
            </form>
            <select aria-label="Branch" value={selectedBranch} onChange={event => setSelectedBranch(event.target.value)}>
              <option value="">Select Branch</option>
              {details.branches.map(item => <option key={item}>{item}</option>)}
            </select>
            <div className="scm-repository-buttons">
              <button type="button" disabled={!selectedBranch || selectedBranch === branch || details.merging} onClick={() => void run('switch', selectedBranch)}>Checkout</button>
              <button type="button" disabled={!selectedBranch || selectedBranch === branch || details.merging} onClick={() => void run('merge', selectedBranch)}>Merge</button>
              <button type="button" disabled={!selectedBranch || selectedBranch === branch} onClick={() => setConfirm({ action: 'delete', target: selectedBranch, message: `Excluir a branch local “${selectedBranch}”?`, detail: 'O Git só exclui a branch se ela já estiver integrada. A branch remota não será afetada.' })}>Delete Branch</button>
            </div>
            {details.merging && <button type="button" onClick={() => setConfirm({ action: 'abort-merge', message: 'Cancelar o merge em andamento?', detail: 'As resoluções feitas durante o merge podem ser descartadas.' })}>Abort Merge</button>}
          </fieldset>
          <fieldset disabled={busy || !details.remotes.length}>
            <legend>Remotes</legend>
            <select aria-label="Remote" value={selectedRemote} onChange={event => setSelectedRemote(event.target.value)}>
              {details.remotes.length ? details.remotes.map(remote => <option key={remote}>{remote}</option>) : <option value="">No remote configured</option>}
            </select>
            <div className="scm-repository-buttons">
              <button type="button" disabled={!selectedRemote} onClick={() => void run('fetch', selectedRemote)}>Fetch</button>
              <button type="button" disabled={!selectedRemote || !branch || details.merging} onClick={() => void run('pull', selectedRemote, branch ?? undefined)}>Pull</button>
              <button type="button" disabled={!selectedRemote || !branch} onClick={() => setConfirm({ action: 'push', target: selectedRemote, expectedBranch: branch ?? undefined, message: `Enviar “${branch}” para “${selectedRemote}”?`, detail: 'Os commits desta branch serão publicados no remoto selecionado.' })}>Push</button>
            </div>
          </fieldset>
          <details>
            <summary>History</summary>
            <ol>{details.history.map(commit => <li key={commit.oid} title={commit.oid}><code>{commit.oid.slice(0, 7)}</code> {commit.subject}</li>)}</ol>
          </details>
          <button type="button" disabled={busy} onClick={() => { setError(''); setRevision(value => value + 1); }}>Refresh Repository</button>
        </>}
      </>}
      {confirm && <AttachDialog
        kind="warning" message={confirm.message} detail={confirm.detail} onCancel={() => setConfirm(undefined)}
        buttons={[
          { id: 'cancel', label: 'Cancelar', primary: true, onSelect: () => setConfirm(undefined) },
          { id: 'confirm', label: 'Confirmar', onSelect: () => void run(confirm.action, confirm.target, confirm.expectedBranch) },
        ]}
      />}
    </details>
  );
}
