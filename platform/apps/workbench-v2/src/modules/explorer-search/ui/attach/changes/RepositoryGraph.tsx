import type { GitRepositoryDetails } from '../../../core/git/gitService';

const ROW_HEIGHT = 22;
const LANE_WIDTH = 12;
const CENTER = ROW_HEIGHT / 2;
const laneX = (lane: number) => lane * LANE_WIDTH + LANE_WIDTH / 2;

export function RepositoryGraph({ history, branch }: { history: GitRepositoryDetails['history']; branch: string | null }) {
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
            <svg className="scm-graph-lanes" width={width} height={ROW_HEIGHT} aria-hidden="true">
              {through.map(column => <path key={column} d={`M${laneX(column)} 0 V${ROW_HEIGHT}`} />)}
              {incoming !== -1 && <path d={`M${x} 0 V${CENTER}`} />}
              {parents.map(column => <path key={column} d={`M${x} ${CENTER} C${x} ${ROW_HEIGHT},${laneX(column)} ${CENTER},${laneX(column)} ${ROW_HEIGHT}`} />)}
              <circle cx={x} cy={CENTER} r={index === 0 ? 5 : 4} className={index === 0 ? 'scm-graph-head' : undefined} />
            </svg>
            <span className="scm-history-subject">{commit.subject}</span>
            {commit.author && <span className="scm-history-author">{commit.author}</span>}
            {index === 0 && branch && <span className="scm-history-branch" title={branch}>{branch}</span>}
          </li>
        );
      })}
    </ol>
  );
}
