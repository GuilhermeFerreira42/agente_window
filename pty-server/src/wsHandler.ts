import type { WebSocket, WebSocketServer } from 'ws';
import type { PtyManager } from './ptyManager.js';
import type { ClientMessage, ErrorMessage, ExitMessage, OpenedMessage, OutputMessage } from './types.js';

export function setupWebSocketHandler(wss: WebSocketServer, ptyManager: PtyManager): void {
  // Map ws -> set of sessionIds opened by this connection
  const socketSessions = new Map<WebSocket, Set<string>>();

  // Global listeners from ptyManager to forward to connected sockets
  ptyManager.onData((sessionId, data) => {
    const msg: OutputMessage = { type: 'output', sessionId, data };
    const json = JSON.stringify(msg);
    for (const [ws, sessions] of socketSessions.entries()) {
      if (sessions.has(sessionId) && ws.readyState === ws.OPEN) {
        ws.send(json);
      }
    }
  });

  ptyManager.onExit((sessionId, code) => {
    const msg: ExitMessage = { type: 'exit', sessionId, code };
    const json = JSON.stringify(msg);
    for (const [ws, sessions] of socketSessions.entries()) {
      if (sessions.has(sessionId) && ws.readyState === ws.OPEN) {
        ws.send(json);
        sessions.delete(sessionId);
      }
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    const sessions = new Set<string>();
    socketSessions.set(ws, sessions);

    ws.on('message', async (raw: string | Buffer) => {
      let clientMsg: ClientMessage;
      try {
        clientMsg = JSON.parse(raw.toString());
      } catch {
        const errorMsg: ErrorMessage = {
          type: 'error',
          code: 'INVALID_MESSAGE',
          message: 'Malformed JSON message received'
        };
        ws.send(JSON.stringify(errorMsg));
        return;
      }

      if (!clientMsg || !clientMsg.type || !clientMsg.sessionId) {
        const errorMsg: ErrorMessage = {
          type: 'error',
          code: 'INVALID_MESSAGE',
          message: 'Missing type or sessionId in message'
        };
        ws.send(JSON.stringify(errorMsg));
        return;
      }

      const { sessionId } = clientMsg;

      switch (clientMsg.type) {
        case 'open': {
          try {
            sessions.add(sessionId);
            const openedInfo = await ptyManager.openSession({
              sessionId,
              cols: clientMsg.cols,
              rows: clientMsg.rows,
              shellId: clientMsg.shellId
            });

            const openedMsg: OpenedMessage = {
              type: 'opened',
              sessionId,
              pid: openedInfo.pid,
              shell: openedInfo.shell,
              shellPath: openedInfo.shellPath,
              availableProfiles: openedInfo.availableProfiles
            };
            ws.send(JSON.stringify(openedMsg));
          } catch (err: any) {
            const code = err.code || 'SPAWN_FAILED';
            const errorMsg: ErrorMessage = {
              type: 'error',
              sessionId,
              code,
              message: err.message || 'Falha ao iniciar processo de terminal'
            };
            ws.send(JSON.stringify(errorMsg));
          }
          break;
        }

        case 'input': {
          if (typeof clientMsg.data === 'string') {
            ptyManager.writeInput(sessionId, clientMsg.data);
          }
          break;
        }

        case 'resize': {
          if (typeof clientMsg.cols === 'number' && typeof clientMsg.rows === 'number') {
            ptyManager.resize(sessionId, clientMsg.cols, clientMsg.rows);
          }
          break;
        }

        case 'close': {
          sessions.delete(sessionId);
          ptyManager.closeSession(sessionId);
          const exitMsg: ExitMessage = { type: 'exit', sessionId, code: 0 };
          ws.send(JSON.stringify(exitMsg));
          break;
        }

        default: {
          const errorMsg: ErrorMessage = {
            type: 'error',
            sessionId,
            code: 'INVALID_MESSAGE',
            message: `Unknown message type: ${(clientMsg as any).type}`
          };
          ws.send(JSON.stringify(errorMsg));
        }
      }
    });

    ws.on('close', () => {
      const activeSessions = socketSessions.get(ws);
      if (activeSessions) {
        for (const sessionId of activeSessions) {
          ptyManager.closeSession(sessionId);
        }
      }
      socketSessions.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('[wsHandler] WebSocket client error:', err);
    });
  });
}
