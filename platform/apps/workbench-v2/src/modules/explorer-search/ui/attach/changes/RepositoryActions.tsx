import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { GitRepositoryAction, GitRepositoryDetails, GitService } from '../../../core/git/gitService';
import { AttachDialog } from '../AttachDialog';
import { RepositoryGraph } from './RepositoryGraph';

export function RepositoryActions({ git, branch, onCommit, commitBusy, commitRevision, children }: {
  git: GitService; branch: string | null; onCommit: () => void; commitBusy: boolean; commitRevision: number; children: ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const historyRef = useRef<HTMLElement>(null);
  const [changesOpen, setChangesOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(true);
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
    const dismiss = (event: PointerEvent) => {
      if (!confirm && !menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || confirm) return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [open, confirm]);

  useEffect(() => {
    if (!open && !historyOpen) return;
    let current = true;
    git.repositoryDetails().then(next => {
      if (!current) return;
      setError('');
      setDetails(next);
      setSelectedBranch(value => next.branches.includes(value) ? value : next.branches.find(item => item !== branch) ?? '');
      setSelectedRemote(value => next.remotes.includes(value) ? value : next.remotes[0] ?? '');
    }, cause => { if (current) setError(cause instanceof Error ? cause.message : String(cause)); });
    return () => { current = false; };
  }, [branch, git, open, historyOpen, revision, commitRevision]);

  useEffect(() => {
    if (!historyOpen) return;
    const timer = window.setInterval(() => {
      if (!document.hidden && historyRef.current?.getClientRects().length) {
        setRevision(value => value + 1);
      }
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [historyOpen]);

  const refresh = () => {
    setError('');
    setRevision(value => value + 1);
    void git.refreshNow();
  };

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
    <>
      <div className="scm-section-header">
        <button type="button" className="scm-section-toggle" aria-expanded={changesOpen} onClick={() => setChangesOpen(value => !value)}>
          <span aria-hidden="true" className={`codicon codicon-chevron-${changesOpen ? 'down' : 'right'}`} />Changes
        </button>
        <button type="button" className="scm-toolbar-button codicon codicon-check" title="Commit" aria-label="Commit changes" disabled={commitBusy} onClick={onCommit} />
        <button type="button" className="scm-toolbar-button codicon codicon-refresh" title="Refresh" aria-label="Refresh Source Control" onClick={refresh} />
        <div ref={menuRef} className="scm-repository-menu">
          <button ref={triggerRef} type="button" className="scm-toolbar-button codicon codicon-ellipsis" title="Repository Actions"
            aria-label="Repository Actions" aria-expanded={open} onClick={() => setOpen(value => !value)} />
          {open && <div className="scm-repository-actions" role="region" aria-label="Git operations">
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
            </>}
          </div>}
        </div>
      </div>
      <div className="scm-changes-body" hidden={!changesOpen}>{children}</div>
      <section ref={historyRef} className="scm-history" aria-label="Repository History">
        <div className="scm-section-header">
          <button type="button" className="scm-section-toggle" aria-expanded={historyOpen} onClick={() => setHistoryOpen(value => !value)}>
            <span aria-hidden="true" className={`codicon codicon-chevron-${historyOpen ? 'down' : 'right'}`} />Graph
          </button>
          <button type="button" className="scm-toolbar-button codicon codicon-refresh" title="Refresh History" aria-label="Refresh History" onClick={refresh} />
        </div>
        {historyOpen && <div className="scm-history-body">
          {error && <p role="alert">{error}</p>}
          {details && (details.history.length ? <RepositoryGraph history={details.history} branch={branch} /> : <p>No commits yet.</p>)}
        </div>}
      </section>
      {confirm && <AttachDialog
        kind="warning" message={confirm.message} detail={confirm.detail} onCancel={() => setConfirm(undefined)}
        buttons={[
          { id: 'cancel', label: 'Cancelar', primary: true, onSelect: () => setConfirm(undefined) },
          { id: 'confirm', label: 'Confirmar', onSelect: () => void run(confirm.action, confirm.target, confirm.expectedBranch) },
        ]}
      />}
    </>
  );
}
