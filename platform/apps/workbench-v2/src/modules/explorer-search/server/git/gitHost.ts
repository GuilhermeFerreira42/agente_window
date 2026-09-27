// ============================================================================
// modules/explorer-search/server/git/gitHost.ts — Adapter Git do Single Port.
// 4.7-b c1 (04_21 §4): fala com o binário `git` via execFile (SEM shell), com
// cwd = raiz do repo, timeout, e uris SEMPRE validadas contra a raiz do
// workspace (mesma guarda de travessia do FsHost). Zero dependência nova.
// Espelha o que a extensão git oficial faz para: status (porcelain v2 -z),
// stage (add -A --), unstage (reset -q HEAD -- | rm --cached em repo vazio),
// discard (checkout -q -- | clean -f -q -- untracked), commit (-m), init.
// ============================================================================
import { execFile } from 'node:child_process';
import type { WorkspaceUri } from '../../contract';
import nodePath from 'node:path';
import { FsHostError, resolveRootPath, toFsPath, toWorkspaceUri, type PathApi } from '../fs/fsHost';

export type GitCode = 'M' | 'A' | 'D' | 'R' | 'C' | 'T' | 'U' | '?' | '!' | '.';

export interface GitHostEntry {
  uri: WorkspaceUri;
  /** Caminho posix relativo à raiz do repo. */
  path: string;
  /** Coluna X do porcelain (index / staged). '?' para untracked, '!' ignorado. */
  index: GitCode;
  /** Coluna Y do porcelain (working tree). */
  worktree: GitCode;
  /** Renomeado/copiado: caminho original. */
  originalPath?: string;
}

export interface GitHostStatus {
  isRepo: boolean;
  branch: string | null;
  entries: GitHostEntry[];
}

export type GitErrorCode = 'forbidden_path' | 'not_a_repo' | 'invalid_message' | 'nothing_to_commit' | 'git_unavailable' | 'io';

export class GitHostError extends Error {
  constructor(readonly code: GitErrorCode, message: string) {
    super(message);
    this.name = 'GitHostError';
  }
}

const EXEC_TIMEOUT_MS = 15_000;

export interface ExecLike {
  (cwd: string, args: string[]): Promise<{ stdout: string; stderr: string; code: number }>;
}

/** execFile sem shell; devolve código em vez de lançar (o chamador decide). */
export const nodeGitExec: ExecLike = (cwd, args) =>
  new Promise((resolve) => {
    execFile(
      'git',
      args,
      { cwd, timeout: EXEC_TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024, encoding: 'utf-8', windowsHide: true,
        env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', LC_ALL: 'C' } },
      (err, stdout, stderr) => {
        const code = (err as NodeJS.ErrnoException | null)?.code;
        if (err && (code === 'ENOENT' || code === 'EACCES')) {
          resolve({ stdout: '', stderr: 'git_unavailable', code: -1 });
          return;
        }
        const exit = err ? ((err as { code?: number | string }).code as number) ?? 1 : 0;
        resolve({ stdout: String(stdout ?? ''), stderr: String(stderr ?? ''), code: typeof exit === 'number' ? exit : 1 });
      },
    );
  });

function asCode(ch: string): GitCode {
  return (['M', 'A', 'D', 'R', 'C', 'T', 'U', '?', '!', '.'] as const).includes(ch as GitCode) ? (ch as GitCode) : '.';
}

/**
 * Parser de `git status --porcelain=v2 -z --branch` (puro, testável).
 * Registros separados por NUL; renames (`2`) trazem o caminho original no
 * campo NUL seguinte. Linhas `#` = cabeçalho de branch.
 */
export function parsePorcelainV2(raw: string): { branch: string | null; records: Array<Omit<GitHostEntry, 'uri'>> } {
  const fields = raw.split('\0');
  const records: Array<Omit<GitHostEntry, 'uri'>> = [];
  let branch: string | null = null;
  for (let i = 0; i < fields.length; i++) {
    const rec = fields[i];
    if (!rec) continue;
    if (rec.startsWith('# branch.head ')) {
      const head = rec.slice('# branch.head '.length);
      branch = head === '(detached)' ? null : head;
      continue;
    }
    if (rec.startsWith('#')) continue;
    const kind = rec[0];
    if (kind === '?' || kind === '!') {
      records.push({ path: rec.slice(2), index: kind, worktree: kind });
      continue;
    }
    if (kind === '1') {
      // 1 XY sub mH mI mW hH hI path
      const m = /^1 (.)(.) \S+ \S+ \S+ \S+ \S+ \S+ (.*)$/s.exec(rec);
      if (m) records.push({ path: m[3], index: asCode(m[1]), worktree: asCode(m[2]) });
      continue;
    }
    if (kind === '2') {
      // 2 XY sub mH mI mW hH hI Xscore path NUL origPath
      const m = /^2 (.)(.) \S+ \S+ \S+ \S+ \S+ \S+ \S+ (.*)$/s.exec(rec);
      if (m) {
        const originalPath = fields[i + 1] ?? '';
        i += 1;
        records.push({ path: m[3], index: asCode(m[1]), worktree: asCode(m[2]), originalPath });
      }
      continue;
    }
    if (kind === 'u') {
      // u XY sub m1 m2 m3 mW h1 h2 h3 path
      const m = /^u (.)(.) \S+ \S+ \S+ \S+ \S+ \S+ \S+ \S+ (.*)$/s.exec(rec);
      if (m) records.push({ path: m[3], index: 'U', worktree: 'U' });
    }
  }
  return { branch, records };
}

export interface GitHostOptions {
  /** Raiz do workspace (guarda de travessia). */
  workspaceRoot: WorkspaceUri | string;
  exec?: ExecLike;
  /** API de path injetável (testes simulam Windows com path.win32). */
  pathApi?: PathApi;
}

/** Igualdade de caminhos do SO. No Windows (sep "\\") o sistema de arquivos é
 *  case-insensitive e `git rev-parse --show-toplevel` pode devolver drive/pastas
 *  com caixa diferente da do cwd do Node (`c:/users/x` vs `C:\\Users\\x`). */
export function samePath(a: string, b: string, p: PathApi = nodePath): boolean {
  return p.sep === '\\' ? a.toLowerCase() === b.toLowerCase() : a === b;
}

export class GitHost {
  private readonly rootPath: string;
  private readonly exec: ExecLike;
  private readonly p: PathApi;

  constructor(options: GitHostOptions) {
    this.p = options.pathApi ?? nodePath;
    this.rootPath = resolveRootPath(String(options.workspaceRoot), this.p);
    this.exec = options.exec ?? nodeGitExec;
  }

  /** Resolve o repo (uri de pasta dentro do workspace) para caminho do SO. */
  private repoPath(repo: WorkspaceUri): string {
    return toFsPath(this.rootPath, repo, this.p);
  }

  /** Caminhos relativos ao repo (posix), todos dentro do workspace. */
  private relPaths(repo: WorkspaceUri, uris: WorkspaceUri[]): string[] {
    const base = this.repoPath(repo);
    return uris.map((u) => {
      const abs = toFsPath(this.rootPath, u, this.p);
      const rel = abs.slice(base.length).replace(/^[\\/]+/, '').split('\\').join('/');
      if (rel.length === 0 || abs.length < base.length) {
        throw new GitHostError('forbidden_path', `URI fora do repositório: ${u}`);
      }
      return rel;
    });
  }

  private async run(cwd: string, args: string[]): Promise<string> {
    const r = await this.exec(cwd, args);
    if (r.code === -1) throw new GitHostError('git_unavailable', 'git não encontrado no PATH');
    if (r.code !== 0) throw new GitHostError('io', r.stderr.trim() || `git ${args[0]} falhou (${r.code})`);
    return r.stdout;
  }

  async isRepo(repo: WorkspaceUri): Promise<boolean> {
    const cwd = this.repoPath(repo);
    const r = await this.exec(cwd, ['rev-parse', '--show-toplevel']);
    if (r.code === -1) throw new GitHostError('git_unavailable', 'git não encontrado no PATH');
    if (r.code !== 0) return false;
    // Só conta como repo se o toplevel for ESTA pasta (não um pai fora dela).
    const top = resolveRootPath(r.stdout.trim(), this.p);
    return samePath(top, resolveRootPath(cwd, this.p), this.p);
  }

  async status(repo: WorkspaceUri): Promise<GitHostStatus> {
    const cwd = this.repoPath(repo);
    if (!(await this.isRepo(repo))) return { isRepo: false, branch: null, entries: [] };
    const out = await this.run(cwd, ['status', '--porcelain=v2', '-z', '--branch', '--untracked-files=all']);
    const { branch, records } = parsePorcelainV2(out);
    const entries: GitHostEntry[] = records
      .filter((r) => r.index !== '!')
      .map((r) => ({ ...r, uri: toWorkspaceUri(this.rootPath, `${cwd}/${r.path}`, this.p) }))
      .sort((a, b) => a.path.localeCompare(b.path));
    return { isRepo: true, branch, entries };
  }

  async init(repo: WorkspaceUri): Promise<void> {
    const cwd = this.repoPath(repo);
    await this.run(cwd, ['init', '-q']);
  }

  async stage(repo: WorkspaceUri, uris: WorkspaceUri[]): Promise<void> {
    const cwd = this.repoPath(repo);
    const rel = this.relPaths(repo, uris);
    if (rel.length === 0) return;
    await this.run(cwd, ['add', '-A', '--', ...rel]);
  }

  private async hasHead(cwd: string): Promise<boolean> {
    return (await this.exec(cwd, ['rev-parse', '--verify', '-q', 'HEAD'])).code === 0;
  }

  async unstage(repo: WorkspaceUri, uris: WorkspaceUri[]): Promise<void> {
    const cwd = this.repoPath(repo);
    const rel = this.relPaths(repo, uris);
    if (rel.length === 0) return;
    if (await this.hasHead(cwd)) await this.run(cwd, ['reset', '-q', 'HEAD', '--', ...rel]);
    else await this.run(cwd, ['rm', '-q', '--cached', '-r', '--', ...rel]);
  }

  /** Discard = `git.clean` da extensão: rastreado → checkout; untracked → apagar. */
  async discard(repo: WorkspaceUri, uris: WorkspaceUri[]): Promise<void> {
    const cwd = this.repoPath(repo);
    const rel = this.relPaths(repo, uris);
    if (rel.length === 0) return;
    const st = await this.status(repo);
    const byPath = new Map(st.entries.map((e) => [e.path, e]));
    const untracked = rel.filter((p) => byPath.get(p)?.worktree === '?');
    const tracked = rel.filter((p) => byPath.get(p) && byPath.get(p)!.worktree !== '?');
    if (tracked.length > 0) await this.run(cwd, ['checkout', '-q', '--', ...tracked]);
    if (untracked.length > 0) await this.run(cwd, ['clean', '-f', '-q', '--', ...untracked]);
  }

  async commit(repo: WorkspaceUri, message: string): Promise<{ oid: string }> {
    const cwd = this.repoPath(repo);
    if (message.trim().length === 0) throw new GitHostError('invalid_message', 'Please provide a commit message');
    const st = await this.status(repo);
    if (!st.isRepo) throw new GitHostError('not_a_repo', 'A pasta aberta não tem repositório Git');
    const staged = st.entries.some((e) => e.index !== '.' && e.index !== '?' && e.index !== 'U');
    if (!staged) throw new GitHostError('nothing_to_commit', 'There are no staged changes to commit');
    await this.run(cwd, ['commit', '-q', '-m', message]);
    const oid = (await this.run(cwd, ['rev-parse', 'HEAD'])).trim();
    return { oid };
  }
}

export { FsHostError };
