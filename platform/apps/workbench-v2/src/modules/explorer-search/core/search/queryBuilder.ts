// ============================================================================
// core/search/queryBuilder.ts — 4.6 c1. Porta do que `services/search/common/
// queryBuilder.ts:106` (QueryBuilder) faz com o input do usuário:
//   • pattern + toggles (case/word/regex) → RegExp segura (regex inválida →
//     SearchQueryError 'invalid_query');
//   • "files to include/exclude" (`*.ts, src/**`) → lista de globs
//     normalizada (sem barra → `**/x`; pasta com `/` final → `x/**`),
//     mesma regra do upstream (`expandPatterns`/`escapeGlobPattern :683`).
// PURO (FT-07): sem node:, sem DOM. Usado pelo server (engine) e pelo core.
// ============================================================================
import type { SearchQuery } from '../../contract';

export class SearchQueryError extends Error {
  readonly code = 'invalid_query' as const;
  constructor(message: string) {
    super(message);
    this.name = 'SearchQueryError';
  }
}

export interface CompiledQuery {
  /** RegExp com flag `g` (+ `i` quando não case-sensitive). Criar UMA por arquivo
   *  via `freshRegExp()` — `lastIndex` é estado mutável. */
  freshRegExp(): RegExp;
  readonly source: string;
  readonly flags: string;
  readonly includes: readonly GlobMatcher[];
  readonly excludes: readonly GlobMatcher[];
}

export interface GlobMatcher {
  readonly glob: string;
  /** Testa um caminho POSIX relativo à raiz (sem `./`, sem barra inicial). */
  test(relPath: string): boolean;
}

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Espelho de `searchWidget`/`queryBuilder`: whole word = `\b` só quando o
 *  pattern começa/termina com caractere de palavra (upstream `strings.ts
 *  createRegExp`). */
export function buildSearchRegExpSource(query: SearchQuery): string {
  const raw = query.pattern;
  let source = query.isRegExp ? raw : escapeRegExp(raw);
  if (query.isWholeWord) {
    if (/^\w/.test(raw)) source = `\\b${source}`;
    if (/\w$/.test(raw)) source = `${source}\\b`;
  }
  return source;
}

/** `*.ts, src/**, docs/` → globs normalizados na sintaxe do VS Code. */
export function parsePatternList(input: string | undefined): string[] {
  if (!input) return [];
  return input
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => s.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, ''))
    .map((s) => (s.endsWith('/') ? `${s}**` : s))
    .map((s) => (s.includes('/') ? s : `**/${s}`));
}

/** Glob mínimo do upstream (`glob.ts`): `**`, `*`, `?`, `{a,b}`, `[...]`. */
export function globToRegExp(glob: string): RegExp {
  let re = '^';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // `**/` casa zero ou mais segmentos; `**` no fim casa tudo
        if (glob[i + 2] === '/') {
          re += '(?:.*/)?';
          i += 2;
        } else {
          re += '.*';
          i += 1;
        }
      } else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else if (c === '{') {
      const end = glob.indexOf('}', i);
      if (end < 0) {
        re += '\\{';
        continue;
      }
      re += `(?:${glob.slice(i + 1, end).split(',').map((alt) => globToRegExp(alt).source.slice(1, -1)).join('|')})`;
      i = end;
    } else if (c === '[') {
      const end = glob.indexOf(']', i);
      if (end < 0) {
        re += '\\[';
        continue;
      }
      re += glob.slice(i, end + 1);
      i = end;
    } else re += escapeRegExp(c);
  }
  // pasta casa também tudo abaixo dela (`src` ≡ `src/**` no upstream para pastas)
  return new RegExp(`${re}(?:/.*)?$`);
}

export function compileGlobs(input: string | undefined): GlobMatcher[] {
  return parsePatternList(input).map((glob) => {
    const re = globToRegExp(glob);
    return { glob, test: (relPath: string) => re.test(relPath) };
  });
}

export function compileSearchQuery(query: SearchQuery): CompiledQuery {
  if (typeof query.pattern !== 'string' || query.pattern.length === 0) {
    throw new SearchQueryError('pattern vazio');
  }
  const source = buildSearchRegExpSource(query);
  const flags = query.isCaseSensitive ? 'g' : 'gi';
  try {
    new RegExp(source, flags);
  } catch (e) {
    throw new SearchQueryError(`expressão regular inválida: ${(e as Error).message}`);
  }
  // regex que casa vazio ("a*") faria loop infinito → tratado no engine (avança 1)
  return {
    source,
    flags,
    freshRegExp: () => new RegExp(source, flags),
    includes: compileGlobs(query.include),
    excludes: compileGlobs(query.exclude),
  };
}

/** Decide se um ARQUIVO (caminho relativo POSIX) entra na busca. */
export function fileMatchesQuery(compiled: CompiledQuery, relPath: string): boolean {
  if (compiled.excludes.some((g) => g.test(relPath))) return false;
  if (compiled.includes.length === 0) return true;
  return compiled.includes.some((g) => g.test(relPath));
}

/** Poda de PASTAS: só descarta quando um exclude casa a pasta inteira. */
export function folderExcludedByQuery(compiled: CompiledQuery, relPath: string): boolean {
  return compiled.excludes.some((g) => g.test(relPath));
}
