import { describe, expect, it } from 'vitest';
import titlebarSource from '../components/Titlebar.tsx?raw';
import auxiliarySource from '../components/AuxiliaryBar.tsx?raw';
import editorSource from '../components/EditorArea.tsx?raw';
import chatInputSource from '../components/ChatInput.tsx?raw';
import chatPanelSource from '../components/ChatPanel.tsx?raw';
import terminalPanelSource from '../components/TerminalPanel.tsx?raw';
import terminalActionBarSource from '../components/terminal/TerminalActionBar.tsx?raw';
import shellPickerSource from '../components/terminal/ShellPicker.tsx?raw';
import terminalInstanceTabsSource from '../components/terminal/TerminalInstanceTabs.tsx?raw';
import appSource from '../App.tsx?raw';
/**
 * P7.3 — Ícones e labels.
 * A referência do VS Code expõe cada controle de ícone com tooltip (title) e um
 * accessible name. Estes contratos garantem que os controles icon-only da réplica
 * mantenham aria-label + title equivalentes e que ícones decorativos fiquem ocultos
 * para o leitor de tela.
 */
function buttonTags(source) {
    const tags = [];
    const re = /<button\b/g;
    let m;
    while ((m = re.exec(source))) {
        const end = source.indexOf('>', m.index);
        tags.push(source.slice(m.index, end + 1));
    }
    return tags;
}
/** Um controle icon-only precisa de um accessible name (aria-label/labelledby). */
function iconOnlyButtonsHaveNames(source) {
    const re = /<button\b/g;
    let m;
    while ((m = re.exec(source))) {
        const end = source.indexOf('>', m.index);
        const tag = source.slice(m.index, end + 1);
        const close = source.indexOf('</button>', end);
        const inner = close === -1 ? '' : source.slice(end + 1, close);
        const text = inner.replace(/<[^>]*>/g, '').replace(/\{[^}]*\}/g, '').trim();
        const hasName = /aria-label|aria-labelledby/.test(tag);
        if (!text && !hasName)
            return false;
    }
    return true;
}
describe('P7.3 icon and label contracts', () => {
    it('gives every icon-only button an accessible name across surfaces', () => {
        for (const source of [
            titlebarSource,
            auxiliarySource,
            editorSource,
            chatInputSource,
            chatPanelSource,
            terminalPanelSource,
            terminalActionBarSource,
            shellPickerSource,
            terminalInstanceTabsSource,
            appSource,
        ]) {
            expect(iconOnlyButtonsHaveNames(source)).toBe(true);
        }
    });
    it('keeps the titlebar controls faithful with aria-label and tooltip parity', () => {
        for (const label of [
            'Nova sessão',
            'Abrir navegador no editor',
            'Abrir busca no editor',
            'Alternar terminal',
            'Alternar lista de sessões',
            'Alternar barra auxiliar',
            'Conta',
        ]) {
            expect(titlebarSource).toContain(`aria-label="${label}"`);
        }
        // Command Center pill expõe o nome equivalente a "Show Sessions" da referência.
        expect(titlebarSource).toContain('aria-label="Mostrar sessões"');
        expect(titlebarSource).toContain('title="Mostrar sessões"');
    });
    it('adds hover tooltips to the previously title-less icon controls', () => {
        expect(auxiliarySource).toContain('aria-label="Alternar Checks" title="Alternar Checks"');
        expect(appSource).toContain('aria-label="Fechar aviso" title="Fechar aviso"');
    });
    it('marks decorative icons as aria-hidden in the titlebar brand and status counts', () => {
        expect(titlebarSource).toContain('className="brand-mark" aria-hidden="true"');
        expect(auxiliarySource).toContain('aria-hidden="true"');
    });
    it('imports terminal icons from lucide-react via dedicated subcomponents', () => {
        for (const source of [
            titlebarSource,
            auxiliarySource,
            editorSource,
            chatPanelSource,
            terminalActionBarSource,
            shellPickerSource,
            terminalInstanceTabsSource,
        ]) {
            expect(source).toContain("from 'lucide-react'");
        }
        expect(terminalPanelSource).not.toContain("from 'lucide-react'");
        // Nenhum <img>/emoji como substituto de ícone nas superfícies principais.
        for (const source of [titlebarSource, auxiliarySource, editorSource]) {
            expect(source).not.toMatch(/<img\b/);
        }
    });
    it('keeps at least one title tooltip on each primary toolbar surface', () => {
        for (const source of [titlebarSource, editorSource, chatInputSource, auxiliarySource, terminalActionBarSource]) {
            const tags = buttonTags(source);
            expect(tags.some((t) => t.includes('title='))).toBe(true);
        }
    });
});
//# sourceMappingURL=iconLabels.test.js.map