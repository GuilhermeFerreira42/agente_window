/**
 * TerminalPanel — 100% fiel ao VS Code, sem resquícios legados
 * Versão limpa: apenas delega para VSCodeTerminal via PlatformTerminalBridge
 * Elimina abas horizontais estilo navegador, mantém apenas terminal real
 * Refs: 09_terminal_menu_contexto_acoes.png, 12_terminal_split_duplo.png, 14_terminal_split_quadruplo_menu.png
 */

import { PlatformTerminalBridge } from './terminal/PlatformTerminalBridge';

export interface TerminalSnapshot {
  lines: string[];
  cleared: boolean;
}

interface TerminalPanelProps {
  visible: boolean;
  sessionId: string;
  sessionLabel?: string;
  /**
   * C-1/F4 — raiz real da sessão. `null`/ausente = sessão sem pasta (Chat):
   * o painel fica indisponível e NENHUM shell sobe com cwd implícito. O
   * antigo `''` mascarava a ausência de raiz como se fosse um diretório.
   */
  workspace?: string | null;
  snapshot?: TerminalSnapshot;
  onSnapshot?: (sessionId: string, snapshot: TerminalSnapshot) => void;
  onClose: () => void;
}

export function TerminalPanel({ visible, sessionId, workspace, onClose }: TerminalPanelProps) {
  return (
    <PlatformTerminalBridge
      visible={visible}
      sessionId={sessionId}
      workspace={workspace}
      onClose={onClose}
    />
  );
}
