// ============================================================================
// modules/explorer-search/core/timeline/timelineModel.ts — 5.6 (A0.6) Timeline.
// PURO (FT-07): entradas do `git log` de um arquivo → itens da view (label =
// mensagem, description = autor, tempo relativo como `fromNow` do VS Code).
// ============================================================================
import type { WorkspaceUri } from '../../contract';

/** Espelho de `GitLogEntry` (server/git/gitHost) — o módulo não importa do server. */
export interface TimelineCommit {
  sha: string;
  parents: string[];
  author: string;
  /** epoch ms. */
  timestamp: number;
  message: string;
}

export interface TimelineItem {
  id: string;
  sha: string;
  /** sha do pai (lado original do diff); null no commit inicial (original vazio). */
  parentSha: string | null;
  label: string;
  author: string;
  timestamp: number;
  /** Ex.: "3 days ago". */
  relative: string;
  /** Título da aba diff: "nome (sha7)". */
  title: string;
}

export interface TimelinePortLike {
  /** `POST /git/log` — [] fora de repo / sem histórico. */
  log(root: WorkspaceUri, uri: WorkspaceUri, limit?: number): Promise<TimelineCommit[]>;
  /** `POST /git/show` com sha → conteúdo (ausente → ''). */
  showAt(root: WorkspaceUri, uri: WorkspaceUri, sha: string): Promise<string>;
}

/** `fromNow` (vs/base/common/date.ts) simplificado, sempre em inglês (peça nova). */
export function relativeTime(timestamp: number, now: number = Date.now()): string {
  const seconds = Math.round((now - timestamp) / 1000);
  if (seconds < 30) return 'now';
  const unit = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many} ago`;
  const minutes = Math.round(seconds / 60);
  if (seconds < 60) return unit(seconds, 'sec', 'secs');
  if (minutes < 60) return unit(minutes, 'min', 'mins');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return unit(hours, 'hr', 'hrs');
  const days = Math.round(hours / 24);
  if (days < 7) return unit(days, 'day', 'days');
  const weeks = Math.round(days / 7);
  if (weeks < 4) return unit(weeks, 'wk', 'wks');
  const months = Math.round(days / 30);
  if (months < 12) return unit(months, 'mo', 'mos');
  return unit(Math.round(days / 365), 'yr', 'yrs');
}

export function toTimelineItems(commits: readonly TimelineCommit[], fileName: string, now: number = Date.now()): TimelineItem[] {
  return [...commits]
    .sort((a, b) => b.timestamp - a.timestamp)
    .map((c) => ({
      id: c.sha, sha: c.sha, parentSha: c.parents[0] ?? null, label: c.message || '(no message)', author: c.author,
      timestamp: c.timestamp, relative: relativeTime(c.timestamp, now), title: `${fileName} (${c.sha.slice(0, 7)})`,
    }));
}

/** Lados do diff de um commit: pai:arquivo × sha:arquivo (commit inicial → original ''). */
export async function resolveCommitDiff(port: TimelinePortLike, root: WorkspaceUri, uri: WorkspaceUri, item: TimelineItem): Promise<{ original: string; modified: string; title: string }> {
  const [original, modified] = await Promise.all([
    item.parentSha ? port.showAt(root, uri, item.parentSha) : Promise.resolve(''),
    port.showAt(root, uri, item.sha),
  ]);
  return { original, modified, title: item.title };
}
