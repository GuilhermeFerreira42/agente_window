// ============================================================================
// modules/explorer-search/server/vite-plugin-fs.ts — Plugin do dev server.
// Monta os handlers FS no MESMO Vite (Single Port, Q7) — sem tocar no PTY.
// Raiz do workspace:
//   env FS_TEST_ROOT (fixture E2E isolada) > options.root (passada pelo
//   vite.config.ts, resolvida relativa a ele via fileURLToPath + ../../..
//   — NUNCA absoluto hardcoded).
// ============================================================================
import type { Plugin } from 'vite';
import { WebSocketServer } from 'ws';
import { createExplorerFsServer, FS_WATCH_PATH, type ExplorerFsServer } from './fs/index';
import { WATCHER_COALESCE_MS } from '../core/constants';

export interface FsPluginOptions {
  /** Raiz default (repo root). Sobrescrita por FS_TEST_ROOT em tests E2E. */
  root: string;
}

export function fsPlugin(options: FsPluginOptions): Plugin {
  let fsServer: ExplorerFsServer | undefined;

  return {
    name: 'explorer-search-fs-single-port',
    apply: 'serve',
    async configureServer(server) {
      const root = process.env.FS_TEST_ROOT ?? options.root;
      fsServer = await createExplorerFsServer({
        root: root as `file://${string}` | string as `file://${string}`,
        watcherCoalesceMs: WATCHER_COALESCE_MS,
        createWsServer: () => new WebSocketServer({ noServer: true }),
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
        `[explorer-search-fs] Single Port ativa → raiz ${root} (watch: ${fsServer.watcherMode()}, ws ${FS_WATCH_PATH})`,
      );
    },
  };
}
