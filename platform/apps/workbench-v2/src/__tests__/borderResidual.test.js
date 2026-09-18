import { describe, expect, it } from 'vitest';
import appSource from '../styles/app.css?raw';
/**
 * E12 (R-070) — Borda residual do .chat-pane.
 *
 * Quando o chat é a ÚLTIMA superfície da banda central (side pane fechado,
 * detail-only ou chat centralizado) não há coluna à direita, então a borda
 * direita do chat viraria uma linha vertical solta. Estes contratos garantem
 * que ela é zerada nesses estados — e SÓ nesses — preservando a divisória
 * quando há editor/aux à direita.
 */
describe('E12 — borda residual do chat-pane', () => {
    it('mantém a borda-direita base do .chat-pane (divisória quando há editor à direita)', () => {
        // A regra base continua existindo: com editor/aux visível, o chat tem divisória.
        expect(appSource).toMatch(/\.chat-pane\s*\{[^}]*border-right:\s*var\(--vscode-strokeThickness\)\s+solid\s+var\(--vscode-agentsPanel-border\)/);
    });
    it('zera a borda-direita quando o chat é a última superfície (centered/closed/detail-only)', () => {
        // Bloco de regra que agrupa os três estados de "última superfície".
        const zeroingBlock = appSource.match(/((?:\.desktop-surface-group\.[a-z-]+(?:\s*>\s*)?\.chat-pane,?\s*)+)\{([^}]*)\}/);
        expect(zeroingBlock, 'bloco de zeragem da borda não encontrado').toBeTruthy();
        const [, selectors, body] = zeroingBlock;
        expect(body).toMatch(/border-right:\s*0/);
        // Cobre os três estados de última-superfície.
        expect(selectors).toContain('chat-centered');
        expect(selectors).toContain('side-pane-closed');
        expect(selectors).toContain('side-pane-detail-only');
        // Usa o combinador de filho direto (não descendente), para não afetar o
        // chat-region aninhado quando há barra de abas do editor à direita.
        expect(selectors).toMatch(/chat-centered\s*>\s*\.chat-pane/);
        expect(selectors).toMatch(/side-pane-closed\s*>\s*\.chat-pane/);
        expect(selectors).toMatch(/side-pane-detail-only\s*>\s*\.chat-pane/);
    });
});
//# sourceMappingURL=borderResidual.test.js.map