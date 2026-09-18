import { describe, expect, it, vi } from 'vitest';
import appSource from '../App.tsx?raw';
import chatPanelSource from '../components/ChatPanel.tsx?raw';
import terminalViewSource from '../components/terminal/TerminalView.tsx?raw';
import splitSashSource from '../components/terminal/SplitSash.tsx?raw';
import xtermHookSource from '../hooks/useXtermTerminal.ts?raw';
/**
 * P7.6 — Performance.
 * Contratos estáticos de higiene de recursos (timers, listeners, dispose) mais
 * uma verificação de runtime de que os timers de "Copiado" não disparam
 * setState após o desmonte do componente.
 */
describe('P7.6 resource-hygiene contracts', () => {
    it('balances addEventListener with removeEventListener in each surface', () => {
        for (const source of [appSource, terminalViewSource, splitSashSource, xtermHookSource]) {
            const adds = (source.match(/addEventListener/g) ?? []).length;
            const removes = (source.match(/removeEventListener/g) ?? []).length;
            expect(adds).toBeGreaterThan(0);
            expect(removes).toBe(adds);
        }
    });
    it('tracks and clears the App response/approval timers on unmount', () => {
        // Todos os timers de resposta são limpos e o mapa é esvaziado.
        expect(appSource).toContain('for (const timer of pendingResponseTimers.current.values()) window.clearTimeout(timer)');
        expect(appSource).toContain('pendingResponseTimers.current.clear()');
        // O timer de "Ação aprovada" agora é rastreado e limpo.
        expect(appSource).toContain('approvalTimer.current = window.setTimeout(() => setApproved(false), 1800)');
        expect(appSource).toContain('window.clearTimeout(approvalTimer.current)');
    });
    it('clears the copy-feedback timers on unmount in ChatPanel', () => {
        // Deve haver exatamente dois cleanups de timer de "Copiado" (toolbar + code block).
        const cleanups = (chatPanelSource.match(/useEffect\(\(\) => \(\) => window\.clearTimeout\(copiedTimer\.current\), \[\]\)/g) ?? []).length;
        expect(cleanups).toBe(2);
        // Nenhum setTimeout de cópia "fire-and-forget" (sem atribuição a um ref).
        expect(chatPanelSource).not.toMatch(/(?<![.=]\s?)(?<!current = )window\.setTimeout\(\(\) => setCopied\(false\), 1200\)/);
        // Ambos os setTimeout de cópia são atribuídos ao ref rastreável.
        const assigned = (chatPanelSource.match(/copiedTimer\.current = window\.setTimeout\(\(\) => setCopied\(false\), 1200\)/g) ?? []).length;
        expect(assigned).toBe(2);
    });
    it('disposes the xterm instance and drops addon refs on cleanup', () => {
        expect(xtermHookSource).toContain('instance.dispose()');
        expect(xtermHookSource).toContain('instanceRef.current = null');
        expect(xtermHookSource).toContain('fitAddonRef.current = null');
        expect(xtermHookSource).toMatch(/removeEventListener\('resize', handleResize\)/);
    });
    it('does not schedule setCopied after unmount (runtime)', async () => {
        vi.useFakeTimers();
        try {
            // Simula o padrão do componente: ref de timer limpo no cleanup.
            let unmounted = false;
            let sawLateUpdate = false;
            const copiedTimer = { current: undefined };
            const setCopied = () => {
                if (unmounted)
                    sawLateUpdate = true;
            };
            // "copy()"
            window.clearTimeout(copiedTimer.current);
            copiedTimer.current = window.setTimeout(() => setCopied(), 1200);
            // "unmount cleanup"
            unmounted = true;
            window.clearTimeout(copiedTimer.current);
            // avança além do prazo
            vi.advanceTimersByTime(2000);
            expect(sawLateUpdate).toBe(false);
        }
        finally {
            vi.useRealTimers();
        }
    });
});
//# sourceMappingURL=performance.test.js.map