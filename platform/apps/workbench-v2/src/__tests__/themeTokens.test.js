import { describe, expect, it } from 'vitest';
import themeSource from '../styles/theme.css?raw';
import appSource from '../styles/app.css?raw';
import terminalSource from '../styles/terminal-vscode.css?raw';
import xtermSource from '../styles/xterm-vscode.css?raw';
function collectTokens(source, pattern) {
    return new Set(Array.from(source.matchAll(pattern), (match) => match[1]));
}
describe('Dark+ theme token contract', () => {
    const declaredTokens = collectTokens(themeSource, /(--vscode-[\w-]+)\s*:/g);
    const referencedTokens = collectTokens(`${appSource}\n${terminalSource}\n${xtermSource}`, /var\(\s*(--vscode-[\w-]+)/g);
    it('declares every VS Code token referenced by replica CSS', () => {
        const missing = [...referencedTokens].filter((token) => !declaredTokens.has(token)).sort();
        expect(missing).toEqual([]);
    });
    it('keeps the Agents-specific shell/chat-input/terminal tokens centralized', () => {
        const required = [
            '--vscode-agents-background',
            '--vscode-agentsPanel-background',
            '--vscode-agentsPanel-border',
            '--vscode-agentsCard-border',
            '--vscode-agentsBottomPanel-border',
            '--vscode-agentsGradient-tintColor',
            '--vscode-agentsChatInput-background',
            '--vscode-agentsChatInput-border',
            '--vscode-agentsChatInput-focusBorder',
            '--vscode-agentsChatInput-foreground',
            '--vscode-agentsChatInput-placeholderForeground',
            '--vscode-icon-foreground',
            '--vscode-menu-background',
            '--vscode-menu-border',
            '--vscode-menu-foreground',
            '--vscode-panelTitle-activeBorder',
            '--vscode-progressBar-background',
            '--vscode-terminal-background',
            '--vscode-terminal-foreground',
            '--vscode-terminalCursor-foreground',
            '--vscode-terminalCursor-background',
            '--vscode-terminal-selectionBackground',
            '--vscode-terminal-tab-activeBorder',
            '--vscode-terminal-tab-activeBackground',
            '--vscode-sash-hoverBorder',
            '--vscode-terminal-ansiBlack',
            '--vscode-terminal-ansiRed',
            '--vscode-terminal-ansiGreen',
            '--vscode-terminal-ansiYellow',
            '--vscode-terminal-ansiBlue',
            '--vscode-terminal-ansiMagenta',
            '--vscode-terminal-ansiCyan',
            '--vscode-terminal-ansiWhite',
            '--vscode-terminal-ansiBrightBlack',
            '--vscode-terminal-ansiBrightRed',
            '--vscode-terminal-ansiBrightGreen',
            '--vscode-terminal-ansiBrightYellow',
            '--vscode-terminal-ansiBrightBlue',
            '--vscode-terminal-ansiBrightMagenta',
            '--vscode-terminal-ansiBrightCyan',
            '--vscode-terminal-ansiBrightWhite',
        ];
        expect(required.every((token) => declaredTokens.has(token))).toBe(true);
    });
    it('does not introduce raw hex or rgb colors into replica component CSS', () => {
        const cssBundle = `${appSource}\n${terminalSource}\n${xtermSource}`;
        expect(cssBundle).not.toMatch(/(?<![\w-])#[0-9a-fA-F]{3,8}\b/);
        expect(cssBundle).not.toMatch(/\brgba?\(/);
        expect(cssBundle).not.toMatch(/\bhsla?\(/);
    });
    it('disables state motion explicitly when reduced motion is requested', () => {
        expect(appSource).toContain('@media (prefers-reduced-motion: reduce)');
        expect(appSource).toContain('.chat-input-container.is-working::before');
        expect(appSource).toContain('animation: none !important;');
    });
});
//# sourceMappingURL=themeTokens.test.js.map