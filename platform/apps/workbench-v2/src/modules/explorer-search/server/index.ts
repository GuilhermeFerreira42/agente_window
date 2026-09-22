// ============================================================================
// modules/explorer-search/server/index.ts — BARREL do lado servidor.
// Consumido APENAS por vite.config.ts (dev) e server.mjs (preview) — separado
// do barrel do cliente (../index.ts) porque este lado importa node:*/ws.
// FT-01: fora do módulo só se importa o barrel do app OU o barrel do server.
// ============================================================================
export { fsPlugin, type FsPluginOptions } from './vite-plugin-fs';
export {
  createExplorerFsServer,
  FS_HTTP_PREFIX,
  FS_WATCH_PATH,
  type ExplorerFsServer,
  type ExplorerFsServerOptions,
} from './fs/index';
export { FsHost, FsHostError, assertWorkspaceRoot, toFsPath, toWorkspaceUri } from './fs/fsHost';
export { ExplorerFsWatcher, type FsChangedBatch, type FsChangedChange } from './fs/watcher';
