import { describe, expect, it } from 'vitest';
import { DEFAULT_PULLDOWN_CONFIG, IDLE_PULLDOWN, pulldownEnd, pulldownMove, pulldownStart, } from '../domain/pulldownDismiss';
describe('pulldown-to-dismiss (R-049)', () => {
    it('não arma o gesto quando o conteúdo não está no topo do scroll', () => {
        const state = pulldownStart(10, 10, 0, 40);
        expect(state.active).toBe(false);
        expect(state).toEqual(IDLE_PULLDOWN);
    });
    it('arma no topo e aplica resistência ao deslocamento', () => {
        let state = pulldownStart(0, 0, 0, 0);
        expect(state.active).toBe(true);
        state = pulldownMove(state, 0, 100, 50);
        // resistance 0.5 → offset 50 (nunca 1:1 com o dedo).
        expect(state.offset).toBe(100 * DEFAULT_PULLDOWN_CONFIG.resistance);
    });
    it('cancela quando o movimento é predominantemente horizontal', () => {
        let state = pulldownStart(0, 0, 0, 0);
        state = pulldownMove(state, 200, 40, 30);
        expect(state.active).toBe(false);
        expect(state.offset).toBe(0);
    });
    it('não gera offset para movimento para cima', () => {
        let state = pulldownStart(0, 100, 0, 0);
        state = pulldownMove(state, 0, 40, 30);
        expect(state.offset).toBe(0);
    });
    it('dispensa quando o deslocamento passa do limiar de distância', () => {
        let state = pulldownStart(0, 0, 0, 0);
        state = pulldownMove(state, 0, 200, 400); // rawDistance 200 >= 120
        const { dismiss, state: after } = pulldownEnd(state, 420);
        expect(dismiss).toBe(true);
        expect(after).toEqual(IDLE_PULLDOWN);
    });
    it('dispensa por flick rápido mesmo com deslocamento menor', () => {
        let state = pulldownStart(0, 0, 0, 0);
        // 80px em 20ms → velocidade 4 px/ms (>= 0.5), abaixo do limiar de distância.
        state = pulldownMove(state, 0, 80, 20);
        const { dismiss } = pulldownEnd(state, 20);
        expect(dismiss).toBe(true);
    });
    it('não dispensa arrasto curto e lento', () => {
        let state = pulldownStart(0, 0, 0, 0);
        // 40px em 2000ms → 0.02 px/ms, e 40 < 120.
        state = pulldownMove(state, 0, 40, 2000);
        const { dismiss } = pulldownEnd(state, 2000);
        expect(dismiss).toBe(false);
    });
    it('pulldownEnd em estado ocioso nunca dispensa', () => {
        const { dismiss } = pulldownEnd(IDLE_PULLDOWN, 100);
        expect(dismiss).toBe(false);
    });
});
//# sourceMappingURL=pulldownDismiss.test.js.map