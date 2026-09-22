// ============================================================================
// modules/explorer-search/core/menus/when.ts — Avaliador de `when` (subset).
// Fonte upstream (7debcd0e): platform/contextkey/common/contextkey.ts
//  - ContextKeyEqualsExpr (:829) — key === value (loose ==; bool→Defined/Not)
//  - ContextKeyNotEqualsExpr (:1044), ContextKeyNotExpr (:1119),
//    ContextKeyAndExpr (:1595), ContextKeyOrExpr (:1794)
// Subset CONGELADO (04_10 §2.4): `key`, `!`, `&&`, `||`, `===`, `!==` e
// parênteses, valores boolean|string|number. Sem constantes `true/false`
// mágicas, sem `in`, sem `!=` (apenas `!==`).
// ============================================================================

export type WhenValue = boolean | string | number | undefined;
export type WhenContext = (key: string) => WhenValue;

// ---- AST ----
type WhenAst =
  | { kind: 'key'; key: string }
  | { kind: 'not'; expr: WhenAst }
  | { kind: 'and'; left: WhenAst; right: WhenAst }
  | { kind: 'or'; left: WhenAst; right: WhenAst }
  | { kind: 'eq'; key: string; value: WhenValue; negate: boolean };

export class WhenSyntaxError extends Error {
  constructor(message: string) {
    super(`[when] ${message}`);
    this.name = 'WhenSyntaxError';
  }
}

// ---- Lexer ----
interface Token {
  kind: 'ident' | 'bang' | 'and' | 'or' | 'lparen' | 'rparen' | 'eqeq' | 'neq' | 'literal';
  text: string;
  value?: WhenValue;
}

function lex(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const push = (kind: Token['kind'], text: string, value?: WhenValue) =>
    tokens.push(value !== undefined ? { kind, text, value } : { kind, text });

  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '!') {
      if (expr[i + 1] === '=' && expr[i + 2] === '=') { push('neq', '!=='); i += 3; }
      else if (expr[i + 1] === '=') { push('neq', '!='); i += 2; }
      else { push('bang', '!'); i++; }
      continue;
    }
    if (ch === '&' && expr[i + 1] === '&') { push('and', '&&'); i += 2; continue; }
    if (ch === '|' && expr[i + 1] === '|') { push('or', '||'); i += 2; continue; }
    if (ch === '(') { push('lparen', '('); i++; continue; }
    if (ch === ')') { push('rparen', ')'); i++; continue; }
    if (ch === '=' && expr[i + 1] === '=' && expr[i + 2] === '=') { push('eqeq', '==='); i += 3; continue; }
    if (ch === '=' && expr[i + 1] === '=') { push('eqeq', '=='); i += 2; continue; }
    if (ch === "'" || ch === '"') {
      const quote = ch;
      let j = i + 1;
      let text = '';
      while (j < expr.length && expr[j] !== quote) {
        if (expr[j] === '\\' && j + 1 < expr.length) { text += expr[j + 1]; j += 2; }
        else { text += expr[j]; j++; }
      }
      if (j >= expr.length) throw new WhenSyntaxError(`string não fechada: ${expr.slice(i)}`);
      push('literal', quote, text);
      i = j + 1;
      continue;
    }
    // identificador/número/literal boolean
    let j = i;
    while (j < expr.length && /[\w.-]/.test(expr[j])) j++;
    if (j === i) throw new WhenSyntaxError(`caractere inesperado '${ch}' em "${expr}"`);
    const word = expr.slice(i, j);
    if (word === 'true') push('literal', word, true);
    else if (word === 'false') push('literal', word, false);
    else if (/^-?\d+(\.\d+)?$/.test(word)) push('literal', word, Number(word));
    else push('ident', word);
    i = j;
  }
  return tokens;
}

// ---- Parser (recursiva-descida: or → and → unary → primary) ----
class WhenParser {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  parse(): WhenAst {
    const ast = this.parseOr();
    if (this.pos !== this.tokens.length) {
      throw new WhenSyntaxError(`token inesperado no fim da expressão: "${this.tokens[this.pos].text}"`);
    }
    return ast;
  }

  private peek(): Token | undefined { return this.tokens[this.pos]; }
  private take(): Token { const t = this.tokens[this.pos++]; if (!t) throw new WhenSyntaxError('expressão truncada'); return t; }

  private parseOr(): WhenAst {
    let left = this.parseAnd();
    while (this.peek()?.kind === 'or') {
      this.take();
      left = { kind: 'or', left, right: this.parseAnd() };
    }
    return left;
  }

  private parseAnd(): WhenAst {
    let left = this.parseUnary();
    while (this.peek()?.kind === 'and') {
      this.take();
      left = { kind: 'and', left, right: this.parseUnary() };
    }
    return left;
  }

  private parseUnary(): WhenAst {
    const t = this.peek();
    if (t?.kind === 'bang') {
      this.take();
      return { kind: 'not', expr: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): WhenAst {
    const t = this.take();
    if (t.kind === 'lparen') {
      const expr = this.parseOr();
      const close = this.take();
      if (close.kind !== 'rparen') throw new WhenSyntaxError('falta ")" na expressão');
      return expr;
    }
    if (t.kind !== 'ident') {
      throw new WhenSyntaxError(`esperava context key, recebi "${t.text}"`);
    }
    const key = t.text;
    const next = this.peek();
    // key === value / key !== value
    if (next?.kind === 'eqeq' || next?.kind === 'neq') {
      this.take();
      const v = this.take();
      if (v.kind !== 'literal') {
        throw new WhenSyntaxError(`lado direito de ${next.text} precisa ser literal (string/ número/ boolean) — recebi "${v.text}"`);
      }
      return { kind: 'eq', key, value: v.value, negate: next.kind === 'neq' };
    }
    // `key` solta = truthy (DefinedExpr upstream)
    return { kind: 'key', key };
  }
}

// ---- Fábrica de evaluador ----
export interface WhenEvaluator {
  evaluate: (get: WhenContext) => boolean;
  readonly source: string;
}

/** Compila uma expressão `when` (tokenizada+parseada uma vez) e avalia contra o contexto. */
export function compileWhen(expr: string): WhenEvaluator {
  const trimmed = expr.trim();
  if (trimmed.length === 0) {
    throw new WhenSyntaxError('expressão vazia');
  }
  const ast = new WhenParser(lex(trimmed)).parse();

  const walk = (node: WhenAst, get: WhenContext): boolean => {
    switch (node.kind) {
      case 'key':
        return !!get(node.key);
      case 'not':
        return !walk(node.expr, get);
      case 'and':
        return walk(node.left, get) && walk(node.right, get);
      case 'or':
        return walk(node.left, get) || walk(node.right, get);
      case 'eq': {
        // Semântica upstream ContextKeyEqualsExpr.create:
        //  - `key === true`   → truthy(context[key])
        //  - `key === false`  → !truthy(context[key]) (undefined conta como false)
        //  - `key === <literal>` → igualdade solta (==) do upstream
        const contextValue = get(node.key);
        const value = node.value;
        let result: boolean;
        if (typeof node.value === 'boolean') {
          result = value ? !!contextValue : !contextValue;
        } else {
          // eslint-disable-next-line eqeqeq — semântica loose intencional (upstream)
          result = contextValue == value;
        }
        return node.negate ? !result : result;
      }
    }
  };

  return {
    source: trimmed,
    evaluate: (get) => walk(ast, get),
  };
}

/** Conveniência: parser + avaliação de uma vez (uso em testes e paths simples). */
export function evaluateWhen(expr: string, get: WhenContext): boolean {
  return compileWhen(expr).evaluate(get);
}
