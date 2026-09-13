/**
 * Tipos base compartilhados — AGENTE WINDOW
 * Fonte: docs/04_CONTRATOS_TECNICOS.md - Convenções de tipos
 */

export type WorkspaceUri = `file://${string}` | `mem://${string}` | `chat-session://${string}`;
export type SessionId = string;
export type TerminalId = string;
export type ToolCallId = string;
export type ProviderId = string;
export type ViewId =
  | 'terminal'
  | 'explorer'
  | 'chat'
  | 'editor'
  | 'search'
  | 'changes'
  | 'browser'
  | 'commandPalette';

export interface FileNode {
  uri: WorkspaceUri;
  name: string;
  kind: 'file' | 'directory';
  readonly?: boolean;
}
