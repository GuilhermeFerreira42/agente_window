import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WebSocketServer } from 'ws';

// 1. Fail-fast check for node-pty
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pty = await import('node-pty');
  if (typeof pty.spawn !== 'function') {
    throw new Error('node-pty spawn function not found');
  }
} catch (err) {
  console.error(
    '[pty-server] ERRO FATAL: node-pty não pôde ser carregado.\n' +
    'O módulo nativo não foi compilado corretamente.\n\n' +
    'Windows: instale Visual Studio Build Tools 2019+ e node-gyp:\n' +
    '  npm install -g windows-build-tools\n\n' +
    'Linux/macOS: instale build-essential (apt) ou Xcode CLI Tools.\n' +
    '  sudo apt-get install build-essential python3\n\n' +
    'Depois reinstale: cd pty-server && npm install\n',
    err
  );
  process.exit(1);
}

import { PtyManager } from './ptyManager.js';
import { setupWebSocketHandler } from './wsHandler.js';

const START_PORT = Number(process.env.PTY_PORT) || 7681;
const MAX_PORT = START_PORT + 18; // 7681 to 7699 default

const ptyManager = new PtyManager();

function createServerWithPort(port: number): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      // CORS headers for local dev & production
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);

      if (url.pathname === '/pty-port' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ port }));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    });

    server.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        server.close();
        if (port < MAX_PORT) {
          resolve(createServerWithPort(port + 1));
        } else {
          reject(
            new Error(
              `[pty-server] Nenhuma porta disponível no intervalo ${START_PORT}-${MAX_PORT}. Encerre outros processos ou configure PTY_PORT.`
            )
          );
        }
      } else {
        reject(err);
      }
    });

    // Invariant: listen ONLY on 127.0.0.1
    server.listen(port, '127.0.0.1', () => {
      resolve({ server, port });
    });
  });
}

async function start() {
  try {
    const { server, port } = await createServerWithPort(START_PORT);

    // Save port to temp file for discovery fallback
    const portFilePath = path.join(os.tmpdir(), 'pty-server.port');
    try {
      fs.writeFileSync(portFilePath, port.toString(), 'utf-8');
    } catch {
      // Non-fatal if temp write fails
    }

    const wss = new WebSocketServer({ server });
    setupWebSocketHandler(wss, ptyManager);

    console.log(`[pty-server] Escutando em http://127.0.0.1:${port} e ws://127.0.0.1:${port}`);

    const shutdown = () => {
      console.log('\n[pty-server] Encerrando servidor PTY...');
      ptyManager.closeAllSessions();
      wss.close();
      server.close(() => {
        try {
          if (fs.existsSync(portFilePath)) fs.unlinkSync(portFilePath);
        } catch {
          // ignore
        }
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('[pty-server] Falha fatal na inicialização:', err);
    process.exit(1);
  }
}

start();
