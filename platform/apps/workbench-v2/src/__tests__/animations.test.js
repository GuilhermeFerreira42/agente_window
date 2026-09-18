import { describe, expect, it } from 'vitest';
import appCss from '../styles/app.css?raw';
/**
 * P7.5 — Animações.
 * Verifica que as keyframes, o gating por @supports do shimmer e o cleanup sob
 * prefers-reduced-motion permaneçam fiéis à referência.
 */
describe('P7.5 animation contracts', () => {
    it('defines the reference keyframes', () => {
        for (const name of [
            'session-needs-input-pulse',
            'session-needs-input-accent-pulse',
            'session-title-shimmer',
            'chat-input-working-border-spin',
            'chat-ellipsis',
            'icon-spin',
        ]) {
            expect(appCss).toMatch(new RegExp(`@keyframes ${name}`));
        }
    });
    it('keeps the needs-input pulse cadence and warning tint of the reference', () => {
        expect(appCss).toContain('session-needs-input-accent-pulse 3s ease-in-out infinite');
        expect(appCss).toContain('session-needs-input-pulse 2s ease-in-out infinite');
        expect(appCss).toMatch(/session-needs-input-accent-pulse\s*\{[\s\S]*?list-warningForeground\) 12%/);
    });
    it('keeps the in-progress shimmer at 6s steps(90, jump-none)', () => {
        expect(appCss).toContain('session-title-shimmer 6s steps(90, jump-none) infinite');
        expect(appCss).toMatch(/@keyframes session-title-shimmer\s*\{[\s\S]*?background-position: 120% 0[\s\S]*?background-position: -120% 0/);
    });
    it('gates the transparent-text shimmer behind @supports and non-reduced motion', () => {
        // Como na referência: evita blocos preenchidos por gradiente quando o clip de texto não é honrado.
        expect(appCss).toMatch(/@supports \(\(background-clip: text\) or \(-webkit-background-clip: text\)\)/);
        const supportsBlock = appCss.slice(appCss.indexOf('@supports ((background-clip'));
        expect(supportsBlock).toMatch(/@media not \(prefers-reduced-motion: reduce\)/);
        expect(supportsBlock).toContain('-webkit-text-fill-color: transparent');
    });
    it('rotates the composer working border as a linear conic beam', () => {
        expect(appCss).toContain('animation: chat-input-working-border-spin 4s linear infinite');
    });
    it('cleans up every animated state under prefers-reduced-motion', () => {
        const reduced = appCss.slice(appCss.indexOf('@media (prefers-reduced-motion: reduce)'));
        // Guarda global de duração/iteração.
        expect(reduced).toMatch(/animation-duration:\s*0\.001ms\s*!important/);
        expect(reduced).toMatch(/animation-iteration-count:\s*1\s*!important/);
        // Estados que devem ser explicitamente zerados (sem shimmer/pulse/beam residual).
        for (const sel of [
            '.session-row.is-needs-input:not(.is-selected) .session-status-icon',
            '.nested-chat-row.is-needs-input .nested-chat-icon',
            '.chat-input-container.is-working::before',
            '.chat-input-container.is-working::after',
            '.spin-icon',
        ]) {
            expect(reduced).toContain(sel);
        }
        expect(reduced).toMatch(/animation:\s*none\s*!important/);
    });
});
//# sourceMappingURL=animations.test.js.map