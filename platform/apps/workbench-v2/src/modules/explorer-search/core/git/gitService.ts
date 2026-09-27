// ============================================================================
// modules/explorer-search/core/git/gitService.ts — Serviço Git PURO (4.7-b c1).
// Espelha o modelo da Source Control View (04_21 §1): dois grupos na mesma
// lista — "Staged Changes" (coluna index) e "Changes" (coluna worktree;
// untracked entra aqui com letra U, padrão git.untrackedChanges=mixed).
// • refresh(): debounce GIT_REFRESH_DEBOUNCE_MS + "último vence" (token).
// • stage/unstage/discard/commit/init delegam ao port e re-statam.
// • Reage a fs.changed (qualquer mudança no workspace → refresh agendado).
// PURO (FT-07): sem DOM/node — timers via globalThis.setTimeout.
// ============================================================================
import type { ExplorerSearchEvent, WorkspaceUri } from '../../contract';
import { Emitter } from '../emitter';

export type GitCode = 'M' | 'A' | 'D' | 'R' | 'C' | 'T' | 'U' | '?' | '!' | '.';

export interface GitEntry {
  uri: WorkspaceUri;
  path: string;
  index: GitCode;
  worktree: GitCode;
  originalPath?: string;
}

export interface GitStatus {
  isRepo: boolean;
  branch: string | null;
  entries: GitEntry[];
}

export interface GitPortLike {
  status(root: WorkspaceUri): Promise<GitStatus>;
  init(root: WorkspaceUri): Promise<void>;
  stage(root: WorkspaceUri, uris: WorkspaceUri[]): Promise<void>;
  unstage(root: WorkspaceUri, uris: WorkspaceUri[]): Promise<void>;
  discard(root: WorkspaceUri, uris: WorkspaceUri[]): Promise<void>;
  commit(root: WorkspaceUri, message: string): Promise<{ oid: string }>;
}

/** Item como a SCM View desenha: letra + token de cor + riscado. */
export interface GitResourceItem {
  uri: WorkspaceUri;
  path: string;
  /** Nome do arquivo (label). */
  name: string;
  /** Pasta relativa ao repo (description); '' na raiz. */
  folder: string;
  /** Letra à direita (`.monaco-icon-label:after`): M A D R C U ! */
  letter: string;
  /** Tooltip oficial da extensão (Modified, Untracked, …). */
  tooltip: string;
  /** Token de cor (sem hex): --vscode-gitDecoration-*ResourceForeground. */
  colorToken: string;
  strikethrough: boolean;
  /** true = deletado no disco (clique não abre). */
  deleted: boolean;
}

export type GitGroupId = 'index' | 'workingTree';

export interface GitResourceGroup {
  id: GitGroupId;
  /** Texto oficial: "Staged Changes" | "Changes". */
  label: string;
  items: GitResourceItem[];
}

export interface GitServiceState {
  loading: boolean;
  isRepo: boolean;
  branch: string | null;
  groups: GitResourceGroup[];
  /** Último erro de operação (mensagem do servidor), limpo no próximo sucesso. */
  error: string | null;
}

export const GIT_REFRESH_DEBOUNCE_MS = 300;
export const GIT_GROUP_LABELS: Record<GitGroupId, string> = { index: 'Staged Changes', workingTree: 'Changes' };

const TOOLTIP: Record<string, string> = {
  M: 'Modified', A: 'Added', D: 'Deleted', R: 'Renamed', C: 'Copied', T: 'Type Changed', U: 'Untracked', '!': 'Ignored',
  IM: 'Index Modified', IA: 'Index Added', ID: 'Index Deleted', IR: 'Index Renamed', IC: 'Index Copied', UU: 'Conflict',
};

function tokenFor(code: GitCode, staged: boolean): string {
  switch (code) {
    case 'M': case 'T': return staged ? '--vscode-gitDecoration-stageModifiedResourceForeground' : '--vscode-gitDecoration-modifiedResourceForeground';
    case 'A': case 'C': return '--vscode-gitDecoration-addedResourceForeground';
    case 'D': return staged ? '--vscode-gitDecoration-stageDeletedResourceForeground' : '--vscode-gitDecoration-deletedResourceForeground';
    case 'R': return '--vscode-gitDecoration-renamedResourceForeground';
    case '?': return '--vscode-gitDecoration-untrackedResourceForeground';
    case 'U': return '--vscode-gitDecoration-conflictingResourceForeground';
    case '!': return '--vscode-gitDecoration-ignoredResourceForeground';
    default: return '--vscode-foreground';
  }
}

function itemOf(e: GitEntry, code: GitCode, staged: boolean): GitResourceItem {
  const slash = e.path.lastIndexOf('/');
  const letter = code === '?' ? 'U' : code === 'U' ? '!' : code;
  const tooltip = code === '?' ? TOOLTIP.U : code === 'U' ? TOOLTIP.UU : (staged ? TOOLTIP[`I${code}`] : TOOLTIP[code]) ?? code;
  return {
    uri: e.uri,
    path: e.path,
    name: slash >= 0 ? e.path.slice(slash + 1) : e.path,
    folder: slash >= 0 ? e.path.slice(0, slash) : '',
    letter,
    tooltip,
    colorToken: tokenFor(code, staged),
    strikethrough: code === 'D',
    deleted: code === 'D',
  };
}

/** Deriva os grupos da SCM View a partir das colunas X/Y do porcelain (puro). */
export function buildGroups(entries: GitEntry[]): GitResourceGroup[] {
  const index: GitResourceItem[] = [];
  const workingTree: GitResourceItem[] = [];
  for (const e of entries) {
    if (e.index === '!') continue;
    if (e.index === 'U' || e.worktree === 'U') { workingTree.push(itemOf(e, 'U', false)); continue; }
    if (e.index === '?') { workingTree.push(itemOf(e, '?', false)); continue; }
    if (e.index !== '.') index.push(itemOf(e, e.index, true));
    if (e.worktree !== '.') workingTree.push(itemOf(e, e.worktree, false));
  }
  const groups: GitResourceGroup[] = [];
  if (index.length > 0) groups.push({ id: 'index', label: GIT_GROUP_LABELS.index, items: index });
  groups.push({ id: 'workingTree', label: GIT_GROUP_LABELS.workingTree, items: workingTree });
  return groups;
}

export interface GitServiceOptions {
  debounceMs?: number;
  setTimeout?: (cb: () => void, ms: number) => unknown;
  clearTimeout?: (h: unknown) => void;
}

export class GitService {
  private readonly events = new Emitter<ExplorerSearchEvent>();
  private readonly changed = new Emitter<GitServiceState>();
  private state: GitServiceState = { loading: false, isRepo: false, branch: null, groups: buildGroups([]), error: null };
  private root: WorkspaceUri | null = null;
  private timer: unknown = null;
  private token = 0;
  private disposed = false;
  private readonly debounceMs: number;
  private readonly setT: (cb: () => void, ms: number) => unknown;
  private readonly clearT: (h: unknown) => void;

  constructor(private readonly port: GitPortLike, opts: GitServiceOptions = {}) {
    this.debounceMs = opts.debounceMs ?? GIT_REFRESH_DEBOUNCE_MS;
    this.setT = opts.setTimeout ?? ((cb, ms) => globalThis.setTimeout(cb, ms));
    this.clearT = opts.clearTimeout ?? ((h) => globalThis.clearTimeout(h as ReturnType<typeof setTimeout>));
  }

  onEvent(cb: (e: ExplorerSearchEvent) => void): () => void { return this.events.add(cb); }
  onStateChanged(cb: (s: GitServiceState) => void): () => void { return this.changed.add(cb); }
  getState(): GitServiceState { return this.state; }
  getRoot(): WorkspaceUri | null { return this.root; }

  /** Define a raiz (= raiz do workspace) e faz o primeiro status imediato. */
  setRoot(root: WorkspaceUri): Promise<void> {
    this.root = root;
    return this.refreshNow();
  }

  /** Reação a fs.changed (qualquer arquivo do workspace): refresh agendado. */
  handleFsChanged(): void { this.refresh(); }

  /** Agenda um status (debounce; chamadas seguidas colapsam). */
  refresh(): void {
    if (this.disposed || !this.root) return;
    if (this.timer !== null) this.clearT(this.timer);
    this.timer = this.setT(() => { this.timer = null; void this.refreshNow(); }, this.debounceMs);
  }

  /** Status imediato; se outro começou depois, o mais antigo é descartado. */
  async refreshNow(): Promise<void> {
    if (this.disposed || !this.root) return;
    const my = ++this.token;
    this.set({ ...this.state, loading: true });
    try {
      const st = await this.port.status(this.root);
      if (my !== this.token || this.disposed) return;
      this.set({ loading: false, isRepo: st.isRepo, branch: st.branch, groups: buildGroups(st.entries), error: this.state.error });
      this.events.fire({ type: 'git.statusChanged', isRepo: st.isRepo, branch: st.branch, count: st.entries.length });
    } catch (e) {
      if (my !== this.token || this.disposed) return;
      this.set({ ...this.state, loading: false, error: (e as Error).message ?? String(e) });
    }
  }

  private async op(fn: (root: WorkspaceUri) => Promise<unknown>): Promise<void> {
    if (!this.root) return;
    try {
      await fn(this.root);
      this.set({ ...this.state, error: null });
    } catch (e) {
      this.set({ ...this.state, error: (e as Error).message ?? String(e) });
      throw e;
    } finally {
      await this.refreshNow();
    }
  }

  init(): Promise<void> { return this.op((r) => this.port.init(r)); }
  stage(uris: WorkspaceUri[]): Promise<void> { return this.op((r) => this.port.stage(r, uris)); }
  unstage(uris: WorkspaceUri[]): Promise<void> { return this.op((r) => this.port.unstage(r, uris)); }
  discard(uris: WorkspaceUri[]): Promise<void> { return this.op((r) => this.port.discard(r, uris)); }
  stageAll(): Promise<void> { return this.stage(this.urisOf('workingTree')); }
  unstageAll(): Promise<void> { return this.unstage(this.urisOf('index')); }

  async commit(message: string): Promise<{ oid: string }> {
    let out = { oid: '' };
    await this.op(async (r) => { out = await this.port.commit(r, message); });
    return out;
  }

  /** Há algo no index? (regra do botão Commit / diálogo "stage all?") */
  hasStaged(): boolean { return this.state.groups.some((g) => g.id === 'index' && g.items.length > 0); }
  hasWorkingTreeChanges(): boolean { return this.urisOf('workingTree').length > 0; }

  private urisOf(id: GitGroupId): WorkspaceUri[] {
    return this.state.groups.find((g) => g.id === id)?.items.map((i) => i.uri) ?? [];
  }

  private set(s: GitServiceState): void {
    this.state = s;
    this.changed.fire(s);
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer !== null) this.clearT(this.timer);
    this.timer = null;
  }
}
