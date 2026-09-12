# 04 — CONTRATOS TÉCNICOS

## Objetivo
Definir os contratos mínimos que isolam Runtime, Workbench, Lógica e UI. Estes contratos existem para impedir acoplamento direto, permitir troca de implementação e manter a IA executora presa ao desenho aprovado.

## Convenções de tipos
```ts
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
```

## 1. Contrato do Runtime do Agente
```ts
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

export type AgentRuntimeEvent =
  | { type: 'chat.chunk'; sessionId: SessionId; turnId: string; text: string }
  | { type: 'chat.thinking'; sessionId: SessionId; turnId: string; label: string }
  | { type: 'tool.pending'; sessionId: SessionId; turnId: string; toolCallId: ToolCallId; toolName: string; input: Record<string, unknown> }
  | { type: 'tool.result'; sessionId: SessionId; turnId: string; toolCallId: ToolCallId; ok: boolean; output: unknown }
  | { type: 'turn.completed'; sessionId: SessionId; turnId: string }
  | { type: 'turn.failed'; sessionId: SessionId; turnId: string; reason: string };
```
Regra: a UI nunca fala com provider diretamente; ela fala com `ChatSessionService`, que por sua vez usa `AgentRuntimeAdapter`.

## 2. Contrato do Model Provider
```ts
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

export interface ProviderChunk {
  kind: 'thinking' | 'text' | 'toolCall' | 'done' | 'error';
  text?: string;
  toolCall?: { id: ToolCallId; name: string; input: Record<string, unknown> };
  error?: string;
}
```
Regra: trocar provider não pode exigir mudança de layout, componentes ou fluxo visual.

## 3. Contrato da camada de Tools
```ts
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
```
Regra: qualquer tool com `requiresApproval = true` deve passar por gate humano antes de `execute()`.

## 4. Contrato do Terminal
```ts
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
```
Regra: terminais são reais, não mocks permanentes na versão final.

## 5. Contrato do Filesystem
```ts
export interface FileSystemPort {
  list(input: { uri: WorkspaceUri }): Promise<Array<FileNode>>;
  readFile(input: { uri: WorkspaceUri }): Promise<{ content: string; encoding: 'utf-8' }>;
  writeFile(input: { uri: WorkspaceUri; content: string; atomic: true }): Promise<void>;
  move(input: { from: WorkspaceUri; to: WorkspaceUri }): Promise<void>;
  remove(input: { uri: WorkspaceUri; recursive?: boolean }): Promise<void>;
  watch(input: { uri: WorkspaceUri }): Promise<{ watcherId: string }>;
}

export interface FileNode {
  uri: WorkspaceUri;
  name: string;
  kind: 'file' | 'directory';
  readonly?: boolean;
}
```
Regra: escrita direta fora deste contrato é proibida.

## 6. Contrato do Layout / Workbench
```ts
export interface WorkbenchLayoutService {
  togglePart(input: { part: 'leftSidebar' | 'rightSidebar' | 'panel' | 'auxiliaryBar' }): void;
  resizePart(input: { part: string; pixels: number }): void;
  maximizePanel(input: { panelId: ViewId }): void;
  restorePanel(input: { panelId: ViewId }): void;
  splitEditor(input: { direction: 'horizontal' | 'vertical' }): void;
  serialize(): WorkbenchLayoutSnapshot;
  hydrate(snapshot: WorkbenchLayoutSnapshot): void;
}

export interface WorkbenchLayoutSnapshot {
  version: 1;
  visibleParts: string[];
  dimensions: Record<string, number>;
  activeViews: Record<string, ViewId>;
}
```
Regra: a geometria do workbench pertence ao serviço de layout, não aos componentes isolados.

## 7. Contrato das Sessões de Chat
```ts
export interface ChatSessionService {
  createSession(input: { title?: string }): Promise<{ sessionId: SessionId }>;
  listSessions(): Promise<Array<{ sessionId: SessionId; title: string; unread: boolean }>>;
  activateSession(input: { sessionId: SessionId }): Promise<void>;
  sendUserMessage(input: { sessionId: SessionId; text: string; attachments: WorkspaceUri[] }): Promise<void>;
  approveTool(input: { sessionId: SessionId; toolCallId: ToolCallId }): Promise<void>;
  rejectTool(input: { sessionId: SessionId; toolCallId: ToolCallId; reason?: string }): Promise<void>;
}
```
Regra: histórico, unread e estado do turno pertencem ao serviço de sessão, não ao componente de chat.

## 8. Contrato de Persistência
```ts
export interface PersistencePort {
  load<T>(key: string): Promise<T | null>;
  save<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}
```
Regra: snapshots devem ter `version` e migração definida quando o schema mudar.

## 9. Contrato de Comandos e Contextos
```ts
export interface CommandRegistry {
  register(command: { id: string; title: string; run: () => Promise<void> | void }): () => void;
  execute(commandId: string): Promise<void>;
  setContext(key: string, value: boolean | string | number): void;
}
```
Regra: menus e atalhos disparam comandos; não executam lógica de negócio inline.

## 10. Contrato de Tema
```ts
export interface ThemeService {
  getToken(token: string): string;
  applyTheme(themeId: string): Promise<void>;
  onThemeChanged(listener: (themeId: string) => void): () => void;
}
```
Regra: componentes visuais não podem hardcodar cor em hex/rgb para elementos de sistema.

## Eventos mínimos do sistema

| Evento | Emissor | Consumidores típicos |
|---|---|---|
| `chat.chunk` | runtime do agente | chat UI, histórico da sessão |
| `tool.pending` | runtime do agente | gate de aprovação, timeline da sessão |
| `terminal.output` | runtime PTY | terminal UI, snapshot de sessão |
| `terminal.exit` | runtime PTY | terminal service, badge/status da aba |
| `fs.changed` | watcher de filesystem | explorer service, editor, dirty state |
| `layout.changed` | layout service | workbench UI |
| `theme.changed` | theme service | todos os componentes themable |

## Regras de integridade
1. Um contrato novo precisa nascer com tipo, dono e consumidor definidos.
2. Todo contrato que cruza fronteira de processo precisa ser serializável.
3. Todo evento precisa ter produtor único e consumidores previsíveis.
4. Toda mudança de contrato exige revisão documental antes de implementação.
5. O uso de `any` em porta de serviço é proibido.
