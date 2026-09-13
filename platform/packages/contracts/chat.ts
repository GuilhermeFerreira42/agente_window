/**
 * Contratos de Chat / Runtime / Tools / Provider — AGENTE WINDOW
 * Fonte: docs/04_CONTRATOS_TECNICOS.md seções 1,2,3,9
 */
import type { SessionId, ToolCallId, ProviderId, WorkspaceUri } from './common.js';

export interface ToolDescriptor {
  id: string;
  name: string;
  requiresApproval: boolean;
  inputSchema: Record<string, unknown>;
}

export interface ToolExecutionAdapter {
  listTools(): Promise<ToolDescriptor[]>;
  execute(input: {
    sessionId: SessionId;
    toolCallId: ToolCallId;
    toolName: string;
    payload: Record<string, unknown>;
  }): Promise<{ ok: boolean; output: unknown; error?: string }>;
}

export type AgentRuntimeEvent =
  | { type: 'chat.chunk'; sessionId: SessionId; turnId: string; text: string }
  | { type: 'chat.thinking'; sessionId: SessionId; turnId: string; label: string }
  | { type: 'tool.pending'; sessionId: SessionId; turnId: string; toolCallId: ToolCallId; toolName: string; input: Record<string, unknown> }
  | { type: 'tool.result'; sessionId: SessionId; turnId: string; toolCallId: ToolCallId; ok: boolean; output: unknown }
  | { type: 'turn.completed'; sessionId: SessionId; turnId: string }
  | { type: 'turn.failed'; sessionId: SessionId; turnId: string; reason: string };

export interface AgentRuntimeAdapter {
  startTurn(input: {
    sessionId: SessionId;
    prompt: string;
    attachments: WorkspaceUri[];
    providerId?: ProviderId;
    mode?: string;
  }): Promise<{ turnId: string }>;
  continueTurn(input: { sessionId: SessionId; turnId: string }): Promise<void>;
  cancelTurn(input: { sessionId: SessionId; turnId: string }): Promise<void>;
  onEvent(listener: (event: AgentRuntimeEvent) => void): () => void;
}

export interface ProviderChunk {
  kind: 'thinking' | 'text' | 'toolCall' | 'done' | 'error';
  text?: string;
  toolCall?: { id: ToolCallId; name: string; input: Record<string, unknown> };
  error?: string;
}

export interface ModelProviderAdapter {
  readonly id: ProviderId;
  readonly label: string;
  listModels(): Promise<Array<{ id: string; label: string }>>;
  send(input: {
    sessionId: SessionId;
    messages: Array<{ role: 'system' | 'user' | 'assistant' | 'tool'; content: string }>;
    tools: ToolDescriptor[];
    model?: string;
  }): AsyncIterable<ProviderChunk>;
}

export interface ChatSessionService {
  createSession(input: { title?: string }): Promise<{ sessionId: SessionId }>;
  listSessions(): Promise<Array<{ sessionId: SessionId; title: string; unread: boolean }>>;
  activateSession(input: { sessionId: SessionId }): Promise<void>;
  sendUserMessage(input: { sessionId: SessionId; text: string; attachments: WorkspaceUri[] }): Promise<void>;
  approveTool(input: { sessionId: SessionId; toolCallId: ToolCallId }): Promise<void>;
  rejectTool(input: { sessionId: SessionId; toolCallId: ToolCallId; reason?: string }): Promise<void>;
}
