// ============================================================================
// when.test.ts — avaliador `when` (subset contextkey.ts). Semântica congelada:
// bare key = truthy; `key === true`→truthy; `key === false`→!truthy
// (undefined conta false); demais literais usam igualdade solta (==) upstream;
// `!==` nega; precedência ! > && > ||; parênteses; erro com prefixo "[when] ".
// ============================================================================
import { describe, expect, it } from 'vitest';
import { compileWhen, evaluateWhen, WhenSyntaxError } from '../core/menus/when';

describe('when — subconjunto de context keys (Comparando contextkey.ts)', () => {
  const ctx = (map: Record<string, boolean | string | number | undefined>) => (k: string) => map[k];

  it('bare key = truthy; undefined = false', () => {
    expect(evaluateWhen("view == 'workbench.explorer.fileView'", ctx({ view: 'workbench.explorer.fileView' }))).toBe(true);
    expect(evaluateWhen('isWindows', ctx({ isWindows: true }))).toBe(true);
    expect(evaluateWhen('isWindows', ctx({ isWindows: false }))).toBe(false);
    expect(evaluateWhen('missingKey', ctx({}))).toBe(false);
  });

  it('! nega qualquer subexpressão', () => {
    expect(evaluateWhen('!isWindows', ctx({ isWindows: false }))).toBe(true);
    expect(evaluateWhen('!!isWindows', ctx({ isWindows: true }))).toBe(true);
    expect(evaluateWhen('!(a || b)', ctx({ a: false, b: false }))).toBe(true);
  });

  it('precedência: ! > && > || (espelho do parser upstream)', () => {
    expect(evaluateWhen('a || b && c', ctx({ a: false, b: true, c: true }))).toBe(true);
    expect(evaluateWhen('a || b && c', ctx({ a: false, b: true, c: false }))).toBe(false);
    expect(evaluateWhen('(a || b) && c', ctx({ a: false, b: true, c: false }))).toBe(false);
  });

  it("igualdade com string literal (e aspas duplas)", () => {
    expect(evaluateWhen("mode === 'debug'", ctx({ mode: 'debug' }))).toBe(true);
    expect(evaluateWhen('mode === "debug"', ctx({ mode: 'debug' }))).toBe(true);
    expect(evaluateWhen("mode === 'run'", ctx({ mode: 'debug' }))).toBe(false);
    expect(evaluateWhen("mode !== 'run'", ctx({ mode: 'debug' }))).toBe(true);
  });

  it('boolean literal: === true → truthy; === false → !truthy (undefined=false)', () => {
    expect(evaluateWhen('dev === true', ctx({ dev: 1 }))).toBe(true);
    expect(evaluateWhen('dev === false', ctx({}))).toBe(true); // undefined conta como false
    expect(evaluateWhen('dev === false', ctx({ dev: true }))).toBe(false);
    expect(evaluateWhen('dev !== true', ctx({}))).toBe(true);
  });

  it('números usam igualdade solta (==) do upstream', () => {
    expect(evaluateWhen('count === 1', ctx({ count: 1 }))).toBe(true);
    expect(evaluateWhen('count === 1', ctx({ count: '1' }))).toBe(true); // loose
    expect(evaluateWhen('count !== 1', ctx({ count: 2 }))).toBe(true);
  });

  it('parse único + re-avaliação com contexto novo', () => {
    const ev = compileWhen("viewItem === 'file' && focused");
    expect(ev.source).toBe("viewItem === 'file' && focused");
    expect(ev.evaluate(ctx({ viewItem: 'file', focused: true }))).toBe(true);
    expect(ev.evaluate(ctx({ viewItem: 'file', focused: false }))).toBe(false);
  });

  it('erros de sintaxe levam prefixo [when] ', () => {
    for (const bad of ['', 'a &&', '(a', "a === 'x", 'a === b', 'a ? b']) {
      expect(() => compileWhen(bad), `expressão "${bad}"`).toThrowError(WhenSyntaxError);
    }
    expect(() => compileWhen('a &&')).toThrow(/\[when\] /);
  });
});
