// ============================================================================
// modules/explorer-search/core/outline/outlineModel.ts — 5.6 (A0.6) Outline.
// PURO (FT-07): recebe os DocumentSymbol do Monaco (já como dados) e devolve a
// lista achatada que a view desenha (VS Code: outlinePane → tree; aqui lista
// indentada, ordenada por posição como `outline.sortOrder: position`).
// ============================================================================

/** Subconjunto de `monaco.languages.DocumentSymbol` (dados, sem classes). */
export interface OutlineSymbolInput {
  name: string;
  detail?: string;
  /** `monaco.languages.SymbolKind` (número). */
  kind: number;
  range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number };
  selectionRange: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number };
  children?: OutlineSymbolInput[];
}

export interface OutlineRow {
  id: string;
  name: string;
  detail: string;
  /** Nome do kind em kebab (ex. 'class', 'method') → codicon `symbol-<kind>`. */
  kind: string;
  /** Profundidade 0-based (aria-level = depth + 1). */
  depth: number;
  line: number;
  column: number;
  endLine: number;
}

// monaco.languages.SymbolKind (ordem numérica oficial, 0..25).
const KIND_NAMES = [
  'file', 'module', 'namespace', 'package', 'class', 'method', 'property', 'field', 'constructor',
  'enum', 'interface', 'function', 'variable', 'constant', 'string', 'number', 'boolean', 'array',
  'object', 'key', 'null', 'enum-member', 'struct', 'event', 'operator', 'type-parameter',
];

/** Nome do kind → classe `codicon-symbol-<kind>` (fallback 'misc' como o VS Code). */
export function symbolKindName(kind: number): string {
  return KIND_NAMES[kind] ?? 'misc';
}

/** Achata a árvore em pré-ordem, filhos ordenados por posição. */
export function flattenSymbols(symbols: readonly OutlineSymbolInput[]): OutlineRow[] {
  const out: OutlineRow[] = [];
  const walk = (list: readonly OutlineSymbolInput[], depth: number, prefix: string) => {
    const sorted = [...list].sort((a, b) => a.range.startLineNumber - b.range.startLineNumber || a.range.startColumn - b.range.startColumn);
    sorted.forEach((s, i) => {
      const id = `${prefix}${i}:${s.name}`;
      out.push({
        id, name: s.name, detail: s.detail ?? '', kind: symbolKindName(s.kind), depth,
        line: s.selectionRange.startLineNumber, column: s.selectionRange.startColumn, endLine: s.range.endLineNumber,
      });
      if (s.children && s.children.length > 0) walk(s.children, depth + 1, `${id}/`);
    });
  };
  walk(symbols, 0, '');
  return out;
}

/** Linha (1-based) do cursor → id do símbolo mais interno que a contém (realce "seguir cursor"). */
export function symbolAtLine(rows: readonly OutlineRow[], line: number): string | null {
  let best: OutlineRow | null = null;
  for (const r of rows) if (r.line <= line && line <= r.endLine && (!best || r.depth >= best.depth)) best = r;
  return best?.id ?? null;
}
