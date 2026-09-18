import { describe, expect, it } from 'vitest';
import editorArea from '../components/EditorArea.tsx?raw';
import chatInput from '../components/ChatInput.tsx?raw';
import appCss from '../styles/app.css?raw';
/**
 * P7.7 — Acessibilidade.
 * Contratos estáticos de teclado, roles/ARIA, regiões dinâmicas, foco visível
 * e reduced motion sobre o código-fonte.
 */
describe('P7.7 — Acessibilidade', () => {
    it('todo controle interativo não-nativo expõe teclado (Enter/Espaço)', () => {
        // O cabeçalho de diff é um role="button" e precisa responder ao teclado.
        expect(editorArea).toMatch(/role="button"/);
        expect(editorArea).toMatch(/event\.key === 'Enter' \|\| event\.key === ' '/);
    });
    it('o container de resultados de busca é rotulado como grupo', () => {
        // O container ganha aria-label quando há itens; os itens continuam
        // sendo <button> nativos (com aria-label próprio), sem sobrescrever o role.
        expect(editorArea).toMatch(/className="search-results" aria-label=\{results\.length > 0 \? 'Resultados da busca' : undefined\}/);
        expect(editorArea).toMatch(/className="search-result" type="button"/);
    });
    it('o listbox de menções marca aria-selected nas opções', () => {
        expect(chatInput).toMatch(/role="listbox"/);
        expect(chatInput).toMatch(/role="option" aria-selected=\{false\}/);
    });
    it('regiões dinâmicas anunciam mudanças (aria-live / role status/alert)', () => {
        expect(editorArea).toMatch(/aria-live="polite"/);
        expect(editorArea).toMatch(/role="alert"/);
        expect(editorArea).toMatch(/role="status"/);
    });
    it('há indicador de foco visível global por teclado', () => {
        expect(appCss).toMatch(/button:focus-visible/);
        expect(appCss).toMatch(/\[tabindex\]:focus-visible/);
    });
    it('reduced motion é respeitado no CSS', () => {
        expect(appCss).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
        expect(appCss).toMatch(/animation: none !important/);
    });
});
//# sourceMappingURL=accessibility.test.js.map