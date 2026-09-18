import { jsx as _jsx } from "react/jsx-runtime";
/**
 * TerminalPanel — 100% fiel ao VS Code, sem resquícios legados
 * Versão limpa: apenas delega para VSCodeTerminal via PlatformTerminalBridge
 * Elimina abas horizontais estilo navegador, mantém apenas terminal real
 * Refs: 09_terminal_menu_contexto_acoes.png, 12_terminal_split_duplo.png, 14_terminal_split_quadruplo_menu.png
 */
import { PlatformTerminalBridge } from './terminal/PlatformTerminalBridge';
export function TerminalPanel({ visible, sessionId, workspace, onClose }) {
    return (_jsx(PlatformTerminalBridge, { visible: visible, sessionId: sessionId, workspace: workspace, onClose: onClose }));
}
//# sourceMappingURL=TerminalPanel.js.map