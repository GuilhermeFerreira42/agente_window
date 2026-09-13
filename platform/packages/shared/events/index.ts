/**
 * Eventos mínimos do sistema — AGENTE WINDOW
 * Fonte: docs/04_CONTRATOS_TECNICOS.md - Eventos mínimos
 */

export const SYSTEM_EVENTS = {
  CHAT_CHUNK: 'chat.chunk',
  CHAT_THINKING: 'chat.thinking',
  TOOL_PENDING: 'tool.pending',
  TOOL_RESULT: 'tool.result',
  TURN_COMPLETED: 'turn.completed',
  TURN_FAILED: 'turn.failed',
  TERMINAL_OUTPUT: 'terminal.output',
  TERMINAL_EXIT: 'terminal.exit',
  TERMINAL_CWD: 'terminal.cwd',
  FS_CHANGED: 'fs.changed',
  LAYOUT_CHANGED: 'layout.changed',
  THEME_CHANGED: 'theme.changed',
} as const;

export type SystemEventType = (typeof SYSTEM_EVENTS)[keyof typeof SYSTEM_EVENTS];
