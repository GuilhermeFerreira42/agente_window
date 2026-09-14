/**
 * NodePtyRuntimePort — implementação do TerminalRuntimePort para Node (pty-server)
 * FATIA-03.1 — Bridge PTY real lado servidor — isolada
 * Fonte: docs/engenharia_reversa/01_TERMINAL/01F + docs/04
 * Justificativa: encapsula PtyManager sem expor node-pty para camadas superiores
 */

import type { TerminalRuntimePort, TerminalEvent } from '@contracts/terminal.js';
import type { SessionId, TerminalId, WorkspaceUri } from '@contracts/common.js';
import { PtyManager } from '../../../services/pty-server/src/ptyManager.js';

export class NodePtyRuntimePort implements TerminalRuntimePort {
  private ptyManager: PtyManager;
  private listeners = new Set<(event: TerminalEvent) => void>();
  private disposers: (() => void)[] = [];

  constructor(ptyManager?: PtyManager) {
    this.ptyManager = ptyManager ?? new PtyManager();

    const disposeData = this.ptyManager.onData((sessionId, data) => {
      this.emit({ type: 'terminal.output', terminalId: sessionId as TerminalId, chunk: data });
    });

    const disposeExit = this.ptyManager.onExit((sessionId, code) => {
      this.emit({ type: 'terminal.exit', terminalId: sessionId as TerminalId, exitCode: code });
    });

    this.disposers.push(disposeData, disposeExit);
  }

  async create(input: {
    sessionId: SessionId;
    cwd: WorkspaceUri;
    profileId: string;
    cols: number;
    rows: number;
  }): Promise<{ terminalId: TerminalId }> {
    const terminalId = `${input.sessionId}:term:${Date.now()}:${Math.random().toString(36).slice(2, 6)}` as TerminalId;

    let cwdPath: string | undefined;
    if (input.cwd?.startsWith('file://')) {
      cwdPath = input.cwd.replace('file://', '');
    }

    const result = await this.ptyManager.openSession({
      sessionId: terminalId,
      cols: input.cols,
      rows: input.rows,
      shellId: input.profileId,
      cwd: cwdPath,
    });

    if (result.scrollback) {
      this.emit({ type: 'terminal.output', terminalId, chunk: result.scrollback });
    }

    return { terminalId };
  }

  async write(input: { terminalId: TerminalId; data: string }): Promise<void> {
    this.ptyManager.writeInput(input.terminalId, input.data);
  }

  async resize(input: { terminalId: TerminalId; cols: number; rows: number }): Promise<void> {
    this.ptyManager.resize(input.terminalId, input.cols, input.rows);
  }

  async clear(_input: { terminalId: TerminalId }): Promise<void> {
    return;
  }

  async kill(input: { terminalId: TerminalId }): Promise<void> {
    this.ptyManager.closeSession(input.terminalId);
  }

  onEvent(listener: (event: TerminalEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: TerminalEvent): void {
    for (const l of this.listeners) {
      try {
        l(event);
      } catch (err) {
        console.error('[NodePtyRuntimePort] listener error', err);
      }
    }
  }

  getManager(): PtyManager {
    return this.ptyManager;
  }

  dispose(): void {
    for (const d of this.disposers) d();
    this.disposers = [];
    this.listeners.clear();
    this.ptyManager.closeAllSessions();
  }
}
