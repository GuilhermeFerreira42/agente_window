export interface ShellProfile {
  id: string;
  label: string;
  path: string;
}

export interface OpenMessage {
  type: 'open';
  sessionId: string;
  cols?: number;
  rows?: number;
  shellId?: string;
  cwd?: string;
}

export interface InputMessage {
  type: 'input';
  sessionId: string;
  data: string;
}

export interface ResizeMessage {
  type: 'resize';
  sessionId: string;
  cols: number;
  rows: number;
}

export interface CloseMessage {
  type: 'close';
  sessionId: string;
}

export type ClientMessage = OpenMessage | InputMessage | ResizeMessage | CloseMessage;

export interface OpenedMessage {
  type: 'opened';
  sessionId: string;
  pid: number;
  shell: string;
  shellPath: string;
  availableProfiles: ShellProfile[];
  scrollback?: string;
}

export interface OutputMessage {
  type: 'output';
  sessionId: string;
  data: string;
}

export interface ExitMessage {
  type: 'exit';
  sessionId: string;
  code: number;
}

export interface ErrorMessage {
  type: 'error';
  sessionId?: string;
  code: 'SHELL_NOT_FOUND' | 'PTY_NATIVE_MISSING' | 'INVALID_MESSAGE' | 'SESSION_NOT_FOUND' | 'SPAWN_FAILED';
  message: string;
}

export type ServerMessage = OpenedMessage | OutputMessage | ExitMessage | ErrorMessage;
