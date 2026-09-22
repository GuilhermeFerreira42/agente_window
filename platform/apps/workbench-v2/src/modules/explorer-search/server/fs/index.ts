// ============================================================================
// modules/explorer-search/server/fs/index.ts — Handler HTTP + WS (Single Port).
// Endpoints congelados em 04_10 §2.1:
//   GET  /fs/list?uri=            → { entries: FsHostEntry[] }
//   GET  /fs/read?uri=[&binary=1&maxBytes=N] → { content, encoding } | { dataBase64, mime }
//   GET  /fs/download?uri=        → stream bruto (Content-Disposition)
//   POST /fs/write   { uri, content }                    → 204
//   POST /fs/stat    { uri }                             → stat
//   POST /fs/createFile { uri, content? }   (wx — file_exists/409)
//   POST /fs/mkdir   { uri }                             → 201
//   POST /fs/delete  { uri, recursive? }                 → 204
//   POST /fs/copy    { from, to }
//   POST /fs/rename  { from, to }                        (move)
//   POST /fs/upload  (headers x-explorer-uri; body octet-stream) → { uri }
//   WS   /fs/watch   { op:'watch', uri } ⇄ { op:'watched' } | fs.changed
// Erro padronizado: { code, message } — code = FsErrorCode ("io" default).
// Reutilizável por vite-plugin-fs.ts (dev) e server.mjs (preview) — 04_15 4.3.
// ============================================================================
import type { IncomingMessage } from 'node:http';
import type { IncomingMessage as IMRequest } from 'node:http';
import type { ServerResponse } from 'node:http';
import type { Duplex } from 'node:stream';
import { createReadStream } from 'node:fs';
import { URL } from 'node:url';
import type { WorkspaceUri } from '../../contract';
import {
  assertWorkspaceRoot,
  FsHost,
  FsHostError,
  toWorkspaceUri,
} from './fsHost';
import { ExplorerFsWatcher, type FsChangedBatch } from './watcher';

export const FS_HTTP_PREFIX = '/fs/';
export const FS_WATCH_PATH = '/fs/watch';

export interface ExplorerFsServerOptions {
  /** Raiz do workspace (guardo contra path traversal; Q4: prefixo por segmento). */
  root: WorkspaceUri;
  /** ms de coalescência do watcher (default 300 = WATCHER_COALESCE_MS). */
  watcherCoalesceMs?: number;
  /** Fábrica do WebSocketServer (injetada p/ isolar 'ws' no adapter). */
  createWsServer: () => WsServerLike;
}

/** Subset do ws.WebSocketServer (noServer=true + handleUpgrade/close). */
export interface WsServerLike {
  handleUpgrade(
    req: IncomingMessage,
    socket: Duplex,
    head: Buffer,
    cb: (ws: WsSocketLike, req: IncomingMessage) => void,
  ): void;
  close(cb?: () => void): void;
  on(event: 'connection', cb: (ws: WsSocketLike, req: IncomingMessage) => void): void;
}

/** Subset do ws.WebSocket usado aqui. */
export interface WsSocketLike {
  send(data: string): void;
  close(): void;
  on(event: 'message', cb: (data: unknown) => void): void;
  on(event: 'close', cb: () => void): void;
  on(event: 'error', cb: (err: unknown) => void): void;
}

export interface ExplorerFsServer {
  readonly root: WorkspaceUri;
  readonly watcherMode: () => string;
  /** true se o request foi tratado (senão o caller deve passar adiante). */
  tryHandleHttp(req: IncomingMessage, res: ServerResponse): Promise<boolean>;
  /** true se o upgrade foi tratado (false → caller decide; ex.: PTY). */
  tryHandleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): boolean;
  dispose(): void;
}

interface FsHttpError extends Error {
  code?: string;
}

function statusOf(code: string): number {
  switch (code) {
    case 'forbidden_path':
      return 403;
    case 'file_not_found':
      return 404;
    case 'file_exists':
      return 409;
    default:
      return 500;
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function sendError(res: ServerResponse, e: unknown): void {
  const err = e as FsHttpError;
  const code = typeof err?.code === 'string' ? err.code : 'io';
  sendJson(res, statusOf(code), { code, message: err?.message ?? String(e) });
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString('utf-8');
  if (raw.length === 0) return {};
  return JSON.parse(raw) as Record<string, unknown>;
}

export async function createExplorerFsServer(
  options: ExplorerFsServerOptions,
): Promise<ExplorerFsServer> {
  await assertWorkspaceRoot(options.root);
  const host = new FsHost(options.root);
  const watcher = new ExplorerFsWatcher(host, { coalesceMs: options.watcherCoalesceMs });
  watcher.start();
  const wss = options.createWsServer();

  // Broadcast fs.changed para todos os clientes WS inscritos.
  const sockets = new Set<WsSocketLike>();
  const unsubWatch = watcher.subscribe((batch: FsChangedBatch) => {
    const payload = JSON.stringify(batch);
    for (const ws of [...sockets]) {
      try {
        ws.send(payload);
      } catch {
        /* cliente caindo — cleanup no 'close' */
      }
    }
  });

  wss.on('connection', (ws) => {
    sockets.add(ws);
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(String(data)) as { op?: string; uri?: WorkspaceUri };
        if (msg?.op === 'watch' && typeof msg.uri === 'string') {
          watcher.ensureWatch(msg.uri);
          ws.send(JSON.stringify({ op: 'watched', uri: msg.uri }));
        }
      } catch {
        /* mensagem ignorável — protocolo tolerante (upstream watchClient) */
      }
    });
    ws.on('close', () => sockets.delete(ws));
    ws.on('error', () => sockets.delete(ws));
    ws.send(JSON.stringify({ op: 'ready', root: options.root }));
  });

  return {
    root: options.root,
    watcherMode: () => watcher.mode,

    async tryHandleHttp(req, res): Promise<boolean> {
      const url = new URL(req.url ?? '/', 'http://explorer-fs.local');
      const p = url.pathname;
      if (!p.startsWith(FS_HTTP_PREFIX) || p === FS_WATCH_PATH) return false;

      try {
        // ---- GET ----
        const queryUri = (key = 'uri'): WorkspaceUri => {
          const v = url.searchParams.get(key);
          if (v == null || v.length === 0) {
            throw new FsHostError('io', `precisa de query param "${key}"`);
          }
          return v as WorkspaceUri;
        };

        // ---- GET ----
        // Descoberta da raiz no boot do cliente (Q9: sem picker — a raiz vem
        // da config do plugin/server; o App pergunta AQUI, nunca ao usuário).
        // CONTRATO: `root` é WorkspaceUri (file://...). options.root pode vir
        // como path crus (vite.config) — normalizado via host.rootPath.
        if (req.method === 'GET' && p === '/fs/root') {
          sendJson(res, 200, { root: toWorkspaceUri(host.rootPath, host.rootPath) });
          return true;
        }
        if (req.method === 'GET' && p === '/fs/list') {
          const uri = queryUri();
          const entries = await host.list(uri);
          watcher.ensureWatch(uri); // modo lazy: watchers seguem o A2.1
          sendJson(res, 200, { entries });
          return true;
        }
        if (req.method === 'GET' && p === '/fs/read') {
          const uri = queryUri();
          if (url.searchParams.get('binary') === '1') {
            const maxBytes = url.searchParams.get('maxBytes');
            const out = await host.readFileBinary(uri, maxBytes == null ? undefined : Number(maxBytes));
            sendJson(res, 200, out);
          } else {
            sendJson(res, 200, await host.readFile(uri));
          }
          return true;
        }
        if (req.method === 'GET' && p === '/fs/download') {
          const uri = queryUri();
          const dl = await host.downloadPath(uri);
          res.statusCode = 200;
          res.setHeader('Content-Type', dl.mime);
          res.setHeader('Content-Length', String(dl.size));
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="${encodeURIComponent(dl.path.split('/').pop() ?? 'download')}"`,
          );
          createReadStream(dl.path).pipe(res);
          return true;
        }

        // ---- POST ----
        if (req.method !== 'POST') {
          // método estranho DENTRO do prefixo: responde (não pendurar o server).
          sendJson(res, 405, { code: 'io', message: `método ${req.method} não suportado em ${p}` });
          return true;
        }

        // /fs/upload é OCTET-STREAM — o body NÃO pode ser drenado como JSON.
        if (p === '/fs/upload') {
          const uri = req.headers['x-explorer-uri'] as string | undefined;
          if (!uri || typeof uri !== 'string') {
            sendError(res, new FsHostError('io', 'upload sem header x-explorer-uri'));
            return true;
          }
          await host.writeStreamAtomic(uri as WorkspaceUri, (async function* () {
            for await (const chunk of req) yield chunk as Buffer;
          })());
          sendJson(res, 201, { uri });
          return true;
        }

        const body = await readJsonBody(req);
        const needUri = (key = 'uri'): WorkspaceUri => {
          const v = body[key];
          if (typeof v !== 'string' || v.length === 0) {
            throw new FsHostError('io', `precisa de "${key}" no body`);
          }
          return v as WorkspaceUri;
        };
        switch (p) {
          case '/fs/write': {
            await host.writeFileAtomic(needUri(), String(body.content ?? ''));
            res.statusCode = 204;
            res.end();
            return true;
          }
          case '/fs/stat': {
            sendJson(res, 200, await host.stat(needUri()));
            return true;
          }
          case '/fs/createFile': {
            await host.createFile(needUri(), body.content as string | undefined);
            res.statusCode = 201;
            res.end();
            return true;
          }
          case '/fs/mkdir': {
            await host.createFolder(needUri());
            res.statusCode = 201;
            res.end();
            return true;
          }
          case '/fs/delete': {
            await host.remove(needUri(), body.recursive === true);
            res.statusCode = 204;
            res.end();
            return true;
          }
          case '/fs/copy': {
            await host.copy(needUri('from'), needUri('to'));
            res.statusCode = 204;
            res.end();
            return true;
          }
          case '/fs/rename': {
            await host.move(needUri('from'), needUri('to'));
            res.statusCode = 204;
            res.end();
            return true;
          }
          default:
            sendJson(res, 404, { code: 'io', message: `endpoint desconhecido: ${p}` });
            return true;
        }
      } catch (e) {
        sendError(res, e);
        return true;
      }
    },

    tryHandleUpgrade(req, socket, head): boolean {
      const url = new URL(req.url ?? '/', 'http://explorer-fs.local');
      if (url.pathname !== FS_WATCH_PATH) return false;
      wss.handleUpgrade(req, socket, head, (ws, upgradedReq) => {
        void upgradedReq;
        // 'connection' foi configurado acima; reemitimos via handleUpgrade
        (wss as unknown as { emit?: (ev: string, ...args: unknown[]) => void }).emit?.('connection', ws, req);
        void 0;
      });
      return true;
    },

    dispose(): void {
      unsubWatch();
      for (const ws of [...sockets]) {
        try {
          ws.close();
        } catch {
          /* noop */
        }
      }
      sockets.clear();
      wss.close();
      watcher.dispose();
    },
  };
}

// Tipo re-exportado para o handler precisar das mensagens do Node HTTP.
export type { IMRequest };
