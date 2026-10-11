// ============================================================================
// modules/explorer-search/server/vite-plugin-fs.ts — Plugin do dev server.
// Monta os handlers FS no MESMO Vite (Single Port, Q7) — sem tocar no PTY.
// Raiz do workspace:
//   env FS_TEST_ROOT (fixture E2E isolada) > options.root (passada pelo
//   vite.config.ts, resolvida relativa a ele via fileURLToPath + ../../..
//   — NUNCA absoluto hardcoded).
// ============================================================================
import type { Plugin } from 'vite';
import { realpath, stat } from 'node:fs/promises';
import { WebSocketServer } from 'ws';
import { createExplorerFsServer, FS_WATCH_PATH, type ExplorerFsServer } from './fs/index';
import { WATCHER_COALESCE_MS } from '../core/constants';
import { createExplorerGitServer, GIT_HTTP_PREFIX, type ExplorerGitServer } from './git/index';

export interface FsPluginOptions {
  /** Raiz default (repo root). Sobrescrita por FS_TEST_ROOT em tests E2E. */
  root: string;
}

export function fsPlugin(options: FsPluginOptions): Plugin {
  let fsServer: ExplorerFsServer | undefined;
  let gitServer: ExplorerGitServer | undefined;

  return {
    name: 'explorer-search-fs-single-port',
    apply: 'serve',
    async configureServer(server) {
      let root = process.env.FS_TEST_ROOT ?? options.root;
      const activateRoot = async (nextRoot: string) => {
        const nextFsServer = await createExplorerFsServer({
          root: nextRoot as `file://${string}` | string as `file://${string}`,
          watcherCoalesceMs: WATCHER_COALESCE_MS,
          createWsServer: () => new WebSocketServer({ noServer: true }),
        });
        const previous = fsServer;
        root = nextRoot;
        fsServer = nextFsServer;
        gitServer = createExplorerGitServer({ workspaceRoot: nextRoot });
        previous?.dispose();
      };
      await activateRoot(root);

      // 4.7-b c1: adapter Git no MESMO plugin/porta (LEGO — sem processo extra).
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith(GIT_HTTP_PREFIX)) {
          next();
          return;
        }
        gitServer!
          .tryHandleHttp(req, res)
          .then((handled) => {
            if (!handled) next();
          })
          .catch((err) => {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ code: 'io', message: String(err) }));
          });
      });

      // 06.4a / D38: troca aditiva da raiz ativa, validada no servidor.
      server.middlewares.use((req, res, next) => {
        if (req.url !== '/fs/workspace' || req.method !== 'POST') { next(); return; }
        void (async () => {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          const input = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { path?: string };
          if (!input.path?.trim()) throw new Error('Workspace path is required');
          const canonical = await realpath(input.path.trim());
          if (!(await stat(canonical)).isDirectory()) throw new Error('Workspace path is not a directory');
          await activateRoot(canonical);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ root: canonical }));
        })().catch((err) => {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ code: 'invalid_workspace', message: err instanceof Error ? err.message : String(err) }));
        });
      });

      // Handlers HTTP no middleware stack (Single Port, mesma origem do app).
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/fs/')) {
          next();
          return;
        }
        fsServer!
          .tryHandleHttp(req, res)
          .then((handled) => {
            if (!handled) next();
          })
          .catch((err) => {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ code: 'io', message: String(err) }));
          });
      });

      // Upgrade WS /fs/watch — não-destrutivo (caminha junto do /pty do PTY).
      const httpServer = server.httpServer;
      if (httpServer) {
        httpServer.on('upgrade', (req, socket, head) => {
          fsServer!.tryHandleUpgrade(req, socket, head);
        });
        httpServer.once('close', () => {
          fsServer?.dispose();
          fsServer = undefined;
        });
      }

      console.log(
        `[explorer-search-fs] Single Port ativa → raiz ${root} (watch: ${fsServer!.watcherMode()}, ws ${FS_WATCH_PATH})`,
      );
    },
  };
}
