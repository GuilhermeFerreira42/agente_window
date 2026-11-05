// ============================================================================
// core/search/textMatcher.ts — 4.6 c2. Casamento/substituição em texto (PURO,
// FT-07). Usado pelo engine do servidor (c1) e pelo fallback local do
// SearchService (qualquer FileSystemPortLike sem endpoint /fs/search).
// ============================================================================
import type { SearchMatch, WorkspaceUri } from '../../contract';
import type { CompiledQuery } from './queryBuilder';

/** Preview = a linha inteira sem `\r` (o widget recorta/realça no cliente,
 *  como o `searchModel` upstream faz com `preview.text`). line/column 1-based. */
export function matchesInContent(content: string, compiled: CompiledQuery, limit: number, uri: WorkspaceUri): SearchMatch[] {
  const out: SearchMatch[] = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length && out.length < limit; i++) {
    const line = lines[i].endsWith('\r') ? lines[i].slice(0, -1) : lines[i];
    const re = compiled.freshRegExp();
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex++; // regex que casa vazio: nunca travar
        continue;
      }
      out.push({ uri, line: i + 1, column: m.index + 1, preview: line });
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** Substituição linha a linha (mesma semântica do `replaceService.ts:97`:
 *  `$1`… só valem em modo regex; no literal a replacement é texto cru). */
export function replaceInContent(content: string, compiled: CompiledQuery, replacement: string, isRegExp: boolean): { content: string; count: number } {
  let count = 0;
  const rep = isRegExp ? replacement : replacement.replace(/\$/g, '$$$$');
  const out = content.split('\n').map((rawLine) => {
    const hasCR = rawLine.endsWith('\r');
    const line = hasCR ? rawLine.slice(0, -1) : rawLine;
    const re = compiled.freshRegExp();
    const next = line.replace(re, (...args) => {
      const matched = args[0] as string;
      if (matched.length === 0) return matched;
      count++;
      // reaproveita a expansão nativa de $1/$& via replace em cópia isolada
      return matched.replace(compiled.freshRegExp(), rep);
    });
    return hasCR ? `${next}\r` : next;
  });
  return { content: out.join('\n'), count };
}

/** Texto que UMA ocorrência vira depois da substituição (preview do
 *  `.replaceMatch` e também usado pela troca pontual). `preserveCase` segue o
 *  `buildReplaceStringWithCasePreserved` (base/common/search.ts): tudo
 *  maiúsculo / tudo minúsculo / Inicial maiúscula. */
export function replacementFor(matched: string, compiled: CompiledQuery, replacement: string, isRegExp: boolean, preserveCase = false): string {
  const rep = isRegExp ? replacement : replacement.replace(/\$/g, '$$$$');
  let out = matched.replace(compiled.freshRegExp(), rep);
  if (preserveCase && matched.length > 0 && out.length > 0) {
    if (matched === matched.toUpperCase() && matched !== matched.toLowerCase()) out = out.toUpperCase();
    else if (matched === matched.toLowerCase()) out = out.toLowerCase();
    else if (matched[0] === matched[0].toUpperCase() && matched[0] !== matched[0].toLowerCase()) out = out[0].toUpperCase() + out.slice(1);
  }
  return out;
}

/** Substitui SÓ as ocorrências listadas em `targets` (line/column 1-based, o
 *  mesmo par devolvido por matchesInContent). Ocorrências que não casam mais
 *  na posição indicada (arquivo mudou) são ignoradas e contadas em `missed`. */
export function replaceMatchesInContent(
  content: string, compiled: CompiledQuery, replacement: string, isRegExp: boolean,
  targets: ReadonlyArray<{ line: number; column: number }>, preserveCase = false,
): { content: string; count: number; missed: number } {
  const byLine = new Map<number, Set<number>>();
  for (const t of targets) {
    if (!byLine.has(t.line)) byLine.set(t.line, new Set());
    byLine.get(t.line)!.add(t.column);
  }
  let count = 0;
  let missed = 0;
  const lines = content.split('\n');
  for (const [lineNo, cols] of byLine) {
    const raw = lines[lineNo - 1];
    if (raw === undefined) { missed += cols.size; continue; }
    const hasCR = raw.endsWith('\r');
    const line = hasCR ? raw.slice(0, -1) : raw;
    const sticky = new RegExp(compiled.source, `${compiled.flags.replace('g', '')}y`);
    // da direita para a esquerda para as colunas anteriores não se deslocarem
    const sorted = [...cols].sort((a, b) => b - a);
    let next = line;
    for (const col of sorted) {
      sticky.lastIndex = col - 1;
      const m = sticky.exec(line);
      if (!m || m.index !== col - 1 || m[0].length === 0) { missed++; continue; }
      next = next.slice(0, col - 1) + replacementFor(m[0], compiled, replacement, isRegExp, preserveCase) + next.slice(col - 1 + m[0].length);
      count++;
    }
    lines[lineNo - 1] = hasCR ? `${next}\r` : next;
  }
  return { content: lines.join('\n'), count, missed };
}
