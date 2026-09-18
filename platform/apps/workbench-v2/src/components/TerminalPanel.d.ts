/**
 * TerminalPanel — 100% fiel ao VS Code, sem resquícios legados
 * Versão limpa: apenas delega para VSCodeTerminal via PlatformTerminalBridge
 * Elimina abas horizontais estilo navegador, mantém apenas terminal real
 * Refs: 09_terminal_menu_contexto_acoes.png, 12_terminal_split_duplo.png, 14_terminal_split_quadruplo_menu.png
 */
export interface TerminalSnapshot {
    lines: string[];
    cleared: boolean;
}
interface TerminalPanelProps {
    visible: boolean;
    sessionId: string;
    sessionLabel?: string;
    workspace: string;
    snapshot?: TerminalSnapshot;
    onSnapshot?: (sessionId: string, snapshot: TerminalSnapshot) => void;
    onClose: () => void;
}
export declare function TerminalPanel({ visible, sessionId, workspace, onClose }: TerminalPanelProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=TerminalPanel.d.ts.map