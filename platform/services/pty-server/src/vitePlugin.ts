/**
 * vitePlugin — integra o PTY WebSocket bridge ao dev server Vite
 * FATIA-03.1 — Bridge PTY real — mínimo necessário fora do escopo permitido
 * Justificativa: sem este plugin, o BrowserPtyRuntimePort não consegue conectar em /pty na superfície real da aplicação.
 * Fonte: legacy/AMBIENTE_COMPLETO_PARA_OPENCLAUDE/02_replica_final/vite-plugin-pty.ts (referência/transição)
 */

import type { Plugin } from 'vite';
import { assertNodePtyAvailable, createPtyWebSocketBridge } from './singlePort.js';

export function ptyPlugin(): Plugin {
  let detachUpgrade: (() => void) | undefined;
  let disposeBridge: (() => void) | undefined;

  return {
    name: 'agents-window-pty-single-port',
    apply: 'serve',
    async configureServer(server) {
      await assertNodePtyAvailable();

      const bridge = createPtyWebSocketBridge();
      if (!server.httpServer) {
        bridge.dispose();
        throw new Error('[vite-plugin-pty] HTTP server indisponível para integrar o terminal');
      }

      detachUpgrade = bridge.attachToServer(server.httpServer);
      disposeBridge = () => {
        detachUpgrade?.();
        bridge.dispose();
      };

      server.httpServer.once('close', () => {
        disposeBridge?.();
        detachUpgrade = undefined;
        disposeBridge = undefined;
      });
    },
  };
}

export { assertNodePtyAvailable, createPtyWebSocketBridge } from './singlePort.js';
