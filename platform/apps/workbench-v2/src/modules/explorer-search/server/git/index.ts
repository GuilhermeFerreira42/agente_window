// ============================================================================
// modules/explorer-search/server/git/index.ts — Handler HTTP /git/* (Single Port).
// 4.7-b c1 (04_21 §4). Todas POST com JSON { root: WorkspaceUri(pasta do repo) }:
//   /git/status   {}                      → { isRepo, branch, entries }
//   /git/init     {}                      → 200 {}
//   /git/stage    { uris }                → 204
//   /git/unstage  { uris }                → 204
//   /git/discard  { uris }                → 204   (checkout -- | clean -f --)
//   /git/commit   { message }             → 200 { oid }
//   /git/show     { uri, ref }            → 200 { content }   (4.7-c; ref: HEAD | index | worktree; ausente → '')
// Erro: { code, message } — forbidden_path 403 · not_a_repo 404 ·
//        invalid_message 400 · nothing_to_commit 409 · git_unavailable 503 · io 500
// ============================================================================
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { WorkspaceUri } from '../../contract';
import { GitHost, GitHostError, isCommitSha, type ExecLike } from './gitHost';

export const GIT_HTTP_PREFIX = '/git/';

export interface ExplorerGitServerOptions {
  workspaceRoot: WorkspaceUri | string;
  exec?: ExecLike;
}

export interface ExplorerGitServer {
  tryHandleHttp(req: IncomingMessage, res: ServerResponse): Promise<boolean>;
}

function statusOf(code: string): number {
  switch (code) {
    case 'forbidden_path': return 403;
    case 'not_a_repo': return 404;
    case 'invalid_message': return 400;
    case 'nothing_to_commit': return 409;
    case 'git_unavailable': return 503;
    default: return 500;
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf-8');
  return raw.length === 0 ? {} : (JSON.parse(raw) as Record<string, unknown>);
}

function urisOf(body: Record<string, unknown>): WorkspaceUri[] {
  const raw = body.uris;
  if (!Array.isArray(raw) || raw.some((u) => typeof u !== 'string')) {
    throw new GitHostError('io', 'uris deve ser string[]');
  }
  return raw as WorkspaceUri[];
}

export function createExplorerGitServer(options: ExplorerGitServerOptions): ExplorerGitServer {
  const host = new GitHost({ workspaceRoot: options.workspaceRoot, exec: options.exec });

  return {
    async tryHandleHttp(req, res) {
      const url = req.url ?? '';
      if (!url.startsWith(GIT_HTTP_PREFIX)) return false;
      const op = url.slice(GIT_HTTP_PREFIX.length).split('?')[0];
      if (req.method !== 'POST') {
        sendJson(res, 405, { code: 'io', message: 'use POST' });
        return true;
      }
      try {
        const body = await readJsonBody(req);
        const root = body.root;
        if (typeof root !== 'string') throw new GitHostError('io', 'root ausente');
        const repo = root as WorkspaceUri;
        switch (op) {
          case 'status':
            sendJson(res, 200, await host.status(repo));
            return true;
          case 'init':
            await host.init(repo);
            sendJson(res, 200, {});
            return true;
          case 'stage':
            await host.stage(repo, urisOf(body));
            res.statusCode = 204; res.end();
            return true;
          case 'unstage':
            await host.unstage(repo, urisOf(body));
            res.statusCode = 204; res.end();
            return true;
          case 'discard':
            await host.discard(repo, urisOf(body));
            res.statusCode = 204; res.end();
            return true;
          case 'commit':
            sendJson(res, 200, await host.commit(repo, typeof body.message === 'string' ? body.message : ''));
            return true;
          case 'show': {
            const ref = body.ref;
            // 5.6 (A0.6, aditivo): ref também pode ser um sha de commit (Timeline → diff pai:arquivo × sha:arquivo).
            if (typeof body.uri !== 'string' || (ref !== 'HEAD' && ref !== 'index' && ref !== 'worktree' && !isCommitSha(ref))) throw new GitHostError('io', 'uri/ref inválidos');
            sendJson(res, 200, await host.show(repo, body.uri as WorkspaceUri, ref));
            return true;
          }
          case 'log': { // 5.6 (A0.6, aditivo): POST /git/log { root, uri, limit? } → { entries }
            if (typeof body.uri !== 'string') throw new GitHostError('io', 'uri inválida');
            sendJson(res, 200, await host.log(repo, body.uri as WorkspaceUri, typeof body.limit === 'number' ? body.limit : undefined));
            return true;
          }
          default:
            return false;
        }
      } catch (e) {
        const err = e as { code?: string; message?: string };
        const code = typeof err?.code === 'string' ? err.code : 'io';
        sendJson(res, statusOf(code), { code, message: err?.message ?? String(e) });
        return true;
      }
    },
  };
}
