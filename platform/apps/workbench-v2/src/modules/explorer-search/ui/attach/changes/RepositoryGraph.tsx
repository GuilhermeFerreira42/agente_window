import { useEffect, useState } from 'react';
import { Cloud, GitBranch } from 'lucide-react';
import type { GitCommitChanges, GitRepositoryDetails } from '../../../core/git/gitService';
import { fileIconLabelClasses } from '../fileIconClasses';

export interface CommitGraphActions {
  loadCommit(oid: string): Promise<GitCommitChanges>;
  openCommitFile(oid: string, parent: string | null, file: GitCommitChanges['files'][number]): Promise<void>;
}

function CommitFiles({ oid, loadCommit, openCommitFile }: { oid: string } & CommitGraphActions) {
  const [changes, setChanges] = useState<GitCommitChanges>();
  const [error, setError] = useState('');
  useEffect(() => {
    let current = true;
    void loadCommit(oid).then(result => {
      if (current) setChanges(result);
    }, () => {
      if (current) setError('Não foi possível carregar os arquivos do commit. Reabra o commit para tentar novamente.');
    });
    return () => { current = false; };
  }, [loadCommit, oid]);

  return (
    <div className="scm-commit-files">
      {error && <p role="alert">{error}</p>}
      {!changes && !error && <p role="status">Carregando arquivos…</p>}
      {changes?.files.length === 0 && <p>Este commit não alterou arquivos em relação ao primeiro pai.</p>}
      {changes?.files.map(file => {
        const slash = file.path.lastIndexOf('/');
        const name = file.path.slice(slash + 1);
        return <button type="button" key={file.uri} className="scm-commit-file" title={file.path} onClick={() => {
          setError('');
          void openCommitFile(oid, changes.parent, file).catch(() => setError('Não foi possível abrir o diff deste arquivo.'));
        }}>
          <span className={fileIconLabelClasses(name, ['scm-commit-file-label'])}>
            <span>{name}</span>
            {slash !== -1 && <small>{file.path.slice(0, slash)}</small>}
          </span>
          <span className="scm-commit-file-status" data-status={file.status} aria-label="Status">{file.status}</span>
        </button>;
      })}
    </div>
  );
}

const ROW_HEIGHT = 22;
const LANE_WIDTH = 12;
const CENTER = ROW_HEIGHT / 2;
const laneX = (lane: number) => lane * LANE_WIDTH + LANE_WIDTH / 2;

export function RepositoryGraph({ history, branch, loadCommit, openCommitFile }: {
  history: GitRepositoryDetails['history']; branch: string | null;
} & Partial<CommitGraphActions>) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const lanes: Array<string | null> = [];
  const visible = new Set(history.map(commit => commit.oid));
  const rows = history.map(commit => {
    const incoming = lanes.indexOf(commit.oid);
    let lane = incoming;
    if (lane === -1) lane = lanes.indexOf(null);
    if (lane === -1) lane = lanes.length;
    const through = lanes.flatMap((oid, index) => oid && index !== lane ? [index] : []);
    lanes[lane] = null;
    const parents = (commit.parents ?? []).filter(oid => visible.has(oid)).map(oid => {
      const existing = lanes.indexOf(oid);
      if (existing !== -1) return existing;
      const empty = lanes.indexOf(null);
      const next = empty === -1 ? lanes.length : empty;
      lanes[next] = oid;
      return next;
    });
    return { commit, incoming, lane, through, parents };
  });
  const width = Math.max(1, lanes.length) * LANE_WIDTH;
  return (
    <ol className="scm-graph-rows">
      {rows.map(({ commit, incoming, lane, through, parents }, index) => {
        const x = laneX(lane);
        return (
          <li key={commit.oid} title={`${commit.subject} (${commit.oid})`} data-commit={commit.oid} data-parent-count={commit.parents?.length}>
            <button type="button" className="scm-graph-row" disabled={!loadCommit || !openCommitFile}
              aria-expanded={expanded === commit.oid} onClick={() => setExpanded(value => value === commit.oid ? null : commit.oid)}>
              <svg className="scm-graph-lanes" width={width} height={ROW_HEIGHT} aria-hidden="true">
                {through.map(column => <path key={column} data-lane={column % 3} d={`M${laneX(column)} 0 V${ROW_HEIGHT}`} />)}
                {incoming !== -1 && <path data-lane={lane % 3} d={`M${x} 0 V${CENTER}`} />}
                {parents.map(column => <path key={column} data-lane={column % 3} d={`M${x} ${CENTER} C${x} ${ROW_HEIGHT},${laneX(column)} ${CENTER},${laneX(column)} ${ROW_HEIGHT}`} />)}
                <circle data-lane={lane % 3} cx={x} cy={CENTER} r={index === 0 ? 5 : 4} className={index === 0 ? 'scm-graph-head' : undefined} />
              </svg>
              <span className="scm-history-subject">{commit.subject}</span>
              {commit.author && <span className="scm-history-author">{commit.author}</span>}
              {(commit.refs ?? (index === 0 && branch ? [{ name: branch, remote: false }] : [])).map(ref => (
                <span key={ref.name} className="scm-history-branch" data-remote={ref.remote} title={ref.name}>
                  {ref.remote ? <Cloud size={12} aria-hidden="true" /> : <GitBranch size={12} aria-hidden="true" />}
                  <span>{ref.name}</span>
                </span>
              ))}
            </button>
            {expanded === commit.oid && loadCommit && openCommitFile && (
              <CommitFiles key={commit.oid} oid={commit.oid} loadCommit={loadCommit} openCommitFile={openCommitFile} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
