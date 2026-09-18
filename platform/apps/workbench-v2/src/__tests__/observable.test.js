import { describe, expect, it, vi } from 'vitest';
import { autorun, derived, observableValue, transaction } from '../domain/observable';
describe('observable engine (R-030)', () => {
    it('autorun roda uma vez imediatamente e de novo quando a dependência muda', () => {
        const count = observableValue('count', 0);
        const seen = [];
        const run = autorun('t', () => seen.push(count.get()));
        expect(seen).toEqual([0]);
        count.set(1);
        count.set(2);
        expect(seen).toEqual([0, 1, 2]);
        run.dispose();
    });
    it('set com valor igual (Object.is) não dispara o autorun', () => {
        const value = observableValue('v', 'a');
        const spy = vi.fn(() => value.get());
        const run = autorun('t', spy);
        expect(spy).toHaveBeenCalledTimes(1);
        value.set('a');
        expect(spy).toHaveBeenCalledTimes(1);
        value.set('b');
        expect(spy).toHaveBeenCalledTimes(2);
        run.dispose();
    });
    it('derived memoiza e só propaga quando o valor computado muda', () => {
        const n = observableValue('n', 1);
        const isEven = derived('isEven', () => n.get() % 2 === 0);
        const seen = [];
        const run = autorun('t', () => seen.push(isEven.get()));
        expect(seen).toEqual([false]);
        n.set(3); // ainda ímpar → derived não muda → autorun NÃO re-roda
        expect(seen).toEqual([false]);
        n.set(4); // par → derived muda → autorun re-roda
        expect(seen).toEqual([false, true]);
        run.dispose();
    });
    it('dependências dinâmicas: para de reagir a observables não mais lidos', () => {
        const toggle = observableValue('toggle', true);
        const a = observableValue('a', 'a0');
        const b = observableValue('b', 'b0');
        const seen = [];
        const run = autorun('t', () => seen.push(toggle.get() ? a.get() : b.get()));
        expect(seen).toEqual(['a0']);
        toggle.set(false); // agora lê b
        expect(seen).toEqual(['a0', 'b0']);
        a.set('a1'); // não é mais dependência → sem re-run
        expect(seen).toEqual(['a0', 'b0']);
        b.set('b1');
        expect(seen).toEqual(['a0', 'b0', 'b1']);
        run.dispose();
    });
    it('transaction agrupa sets em uma única execução do autorun', () => {
        const x = observableValue('x', 0);
        const y = observableValue('y', 0);
        const spy = vi.fn(() => x.get() + y.get());
        const run = autorun('t', spy);
        expect(spy).toHaveBeenCalledTimes(1);
        transaction(() => {
            x.set(1);
            y.set(1);
        });
        expect(spy).toHaveBeenCalledTimes(2); // não 3
        run.dispose();
    });
    it('dispose para as re-execuções', () => {
        const v = observableValue('v', 0);
        const seen = [];
        const run = autorun('t', () => seen.push(v.get()));
        v.set(1);
        run.dispose();
        v.set(2);
        expect(seen).toEqual([0, 1]);
    });
    it('derived encadeado propaga por múltiplos níveis', () => {
        const n = observableValue('n', 2);
        const doubled = derived('doubled', () => n.get() * 2);
        const label = derived('label', () => `= ${doubled.get()}`);
        const seen = [];
        const run = autorun('t', () => seen.push(label.get()));
        expect(seen).toEqual(['= 4']);
        n.set(5);
        expect(seen).toEqual(['= 4', '= 10']);
        run.dispose();
    });
});
//# sourceMappingURL=observable.test.js.map