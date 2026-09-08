import type { WebSocket, WebSocketServer } from 'ws';
import type { PtyManager } from './ptyManager.js';
import type { ClientMessage, ErrorMessage, ExitMessage, OpenedMessage, OutputMessage } from './types.js';

export function setupWebSocketHandler(wss: WebSocketServer, ptyManager: PtyManager): void {
  const socketSessions = new Map<WebSocket, Set<string>>();

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
          message: 'Malformed JSON message received',
        };
        ws.send(JSON.stringify(errorMsg));
        return;
      }

      if (!clientMsg || !clientMsg.type || !clientMsg.sessionId) {
        const errorMsg: ErrorMessage = {
          type: 'error',
          code: 'INVALID_MESSAGE',
          message: 'Missing type or sessionId in message',
        };
        ws.send(JSON.stringify(errorMsg));
        return;
      }

      const { sessionId } = clientMsg;

      switch (clientMsg.type) {
        case 'open': {
          try {
            const openedInfo = await ptyManager.openSession({
              sessionId,
              cols: clientMsg.cols,
              rows: clientMsg.rows,
              shellId: clientMsg.shellId,
            });

            sessions.add(sessionId);
            const openedMsg: OpenedMessage = {
              type: 'opened',
              sessionId,
              pid: openedInfo.pid,
              shell: openedInfo.shell,
              shellPath: openedInfo.shellPath,
              availableProfiles: openedInfo.availableProfiles,
              scrollback: openedInfo.scrollback,
            };
            ws.send(JSON.stringify(openedMsg));
          } catch (err: unknown) {
            sessions.delete(sessionId);
            const error = err as Error & { code?: string };
            const errorMsg: ErrorMessage = {
              type: 'error',
              sessionId,
              code: (error.code as ErrorMessage['code']) || 'SPAWN_FAILED',
              message: error.message || 'Falha ao iniciar processo de terminal',
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
            message: `Unknown message type: ${(clientMsg as { type: string }).type}`,
          };
          ws.send(JSON.stringify(errorMsg));
        }
      }
    });

    ws.on('close', () => {
      socketSessions.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('[wsHandler] WebSocket client error:', err);
    });
  });
}
