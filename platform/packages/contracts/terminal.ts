/**
 * Contrato do Terminal — AGENTE WINDOW
 * Fonte: docs/04_CONTRATOS_TECNICOS.md seção 4 + docs/engenharia_reversa/01_TERMINAL/01F
 */
import type { SessionId, TerminalId, WorkspaceUri } from './common.js';

export interface TerminalRuntimePort {
  create(input: {
    sessionId: SessionId;
    cwd: WorkspaceUri;
    profileId: string;
    cols: number;
    rows: number;
  }): Promise<{ terminalId: TerminalId }>;
  write(input: { terminalId: TerminalId; data: string }): Promise<void>;
  resize(input: { terminalId: TerminalId; cols: number; rows: number }): Promise<void>;
  clear(input: { terminalId: TerminalId }): Promise<void>;
  kill(input: { terminalId: TerminalId }): Promise<void>;
  onEvent(listener: (event: TerminalEvent) => void): () => void;
}

export type TerminalEvent =
  | { type: 'terminal.output'; terminalId: TerminalId; chunk: string }
  | { type: 'terminal.exit'; terminalId: TerminalId; exitCode: number | null }
  | { type: 'terminal.cwd'; terminalId: TerminalId; cwd: WorkspaceUri };
