/**
 * BrowserPtyRuntimePort — implementação do TerminalRuntimePort para browser via WebSocket
 * FATIA-03.1 — Bridge PTY real — isolada, sem tocar layout global
 * Fonte: docs/engenharia_reversa/01_TERMINAL/01F, 01G + docs/04_CONTRATOS_TECNICOS
 * Local: platform/packages/agent-runtime/pty/
 * Justificativa: expõe PTY real para UI via /pty sem importar node-pty na camada visual
 */

import type { TerminalRuntimePort, TerminalEvent } from '@contracts/terminal.js';
import type { SessionId, TerminalId, WorkspaceUri } from '@contracts/common.js';

function resolveWsUrl(): string {
  if (typeof window !== 'undefined' && (window as any).location?.host) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/pty`;
  }
  return 'ws://localhost:5173/pty';
}

export interface BrowserPtyRuntimeOptions {
  wsUrl?: string;
}

export class BrowserPtyRuntimePort implements TerminalRuntimePort {
  private ws: WebSocket | null = null;
  private listeners = new Set<(event: TerminalEvent) => void>();
  private pendingCreates = new Map<TerminalId, { resolve: (v: { terminalId: TerminalId }) => void; reject: (e: Error) => void }>();
  private connected = false;
  private queue: string[] = [];
  private lastProfiles: { id: string; label: string; path: string }[] = [];
  private wsUrl: string;

  constructor(options?: BrowserPtyRuntimeOptions) {
    this.wsUrl = options?.wsUrl ?? resolveWsUrl();
    this.connect();
  }

  private connect(): void {
    try {
      const ws = new WebSocket(this.wsUrl);
      this.ws = ws;

      ws.onopen = () => {
        this.connected = true;
        for (const msg of this.queue) ws.send(msg);
        this.queue = [];
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (!msg.sessionId && msg.type !== 'error') return;
          const terminalId = (msg.sessionId ?? 'unknown') as TerminalId;

          switch (msg.type) {
            case 'opened': {
              const pending = this.pendingCreates.get(terminalId);
              if (pending) {
                pending.resolve({ terminalId });
                this.pendingCreates.delete(terminalId);
              }
              if (msg.availableProfiles && Array.isArray(msg.availableProfiles)) {
                this.lastProfiles = msg.availableProfiles.map((p: any) => ({
                  id: p.id ?? p.label ?? p.path,
                  label: p.label ?? p.id ?? p.path,
                  path: p.path ?? '',
                }));
              }
              if (msg.scrollback) {
                this.emit({ type: 'terminal.output', terminalId, chunk: msg.scrollback });
              }
              break;
            }
            case 'output': {
              this.emit({ type: 'terminal.output', terminalId, chunk: msg.data });
              break;
            }
            case 'exit': {
              this.emit({ type: 'terminal.exit', terminalId, exitCode: msg.code });
              break;
            }
            case 'error': {
              console.error('[BrowserPtyRuntime] error', msg);
              if (msg.sessionId) {
                const pending = this.pendingCreates.get(msg.sessionId as TerminalId);
                if (pending) {
                  pending.reject(new Error(msg.message));
                  this.pendingCreates.delete(msg.sessionId as TerminalId);
                }
              }
              if (terminalId !== 'unknown') {
                this.emit({ type: 'terminal.output', terminalId, chunk: `\r\n\x1b[31m[PTY Error] ${msg.message}\x1b[0m\r\n` });
              }
              break;
            }
          }
        } catch (err) {
          console.error('[BrowserPtyRuntime] parse error', err);
        }
      };

      ws.onerror = (err) => {
        console.error('[BrowserPtyRuntime] ws error', err);
      };

      ws.onclose = () => {
        this.connected = false;
        setTimeout(() => this.connect(), 1000);
      };
    } catch (err) {
      console.error('[BrowserPtyRuntime] connect failed', err);
    }
  }

  private send(obj: unknown): void {
    const json = JSON.stringify(obj);
    if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(json);
    } else {
      this.queue.push(json);
    }
  }

  async create(input: {
    sessionId: SessionId;
    cwd: WorkspaceUri;
    profileId: string;
    cols: number;
    rows: number;
  }): Promise<{ terminalId: TerminalId }> {
    const terminalId = `${input.sessionId}:term:${Date.now()}:${Math.random().toString(36).slice(2, 6)}` as TerminalId;

    return new Promise((resolve, reject) => {
      this.pendingCreates.set(terminalId, { resolve, reject });
      this.send({
        type: 'open',
        sessionId: terminalId,
        cols: input.cols,
        rows: input.rows,
        shellId: input.profileId,
      });

      setTimeout(() => {
        if (this.pendingCreates.has(terminalId)) {
          this.pendingCreates.delete(terminalId);
          reject(new Error('Timeout creating terminal'));
        }
      }, 5000);
    });
  }

  async write(input: { terminalId: TerminalId; data: string }): Promise<void> {
    this.send({ type: 'input', sessionId: input.terminalId, data: input.data });
  }

  async resize(input: { terminalId: TerminalId; cols: number; rows: number }): Promise<void> {
    this.send({ type: 'resize', sessionId: input.terminalId, cols: input.cols, rows: input.rows });
  }

  async clear(_input: { terminalId: TerminalId }): Promise<void> {
    return;
  }

  async kill(input: { terminalId: TerminalId }): Promise<void> {
    this.send({ type: 'close', sessionId: input.terminalId });
  }

  onEvent(listener: (event: TerminalEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getAvailableProfiles(): { id: string; label: string; path: string }[] {
    return this.lastProfiles.length > 0
      ? this.lastProfiles
      : [
          { id: 'bash', label: 'Bash', path: '/bin/bash' },
          { id: 'sh', label: 'sh', path: '/bin/sh' },
        ];
  }

  private emit(event: TerminalEvent): void {
    for (const l of this.listeners) {
      try {
        l(event);
      } catch (err) {
        console.error('[BrowserPtyRuntime] listener error', err);
      }
    }
  }

  dispose(): void {
    this.ws?.close();
    this.listeners.clear();
    this.pendingCreates.clear();
  }
}
