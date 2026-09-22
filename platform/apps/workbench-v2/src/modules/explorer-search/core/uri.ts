// ============================================================================
// modules/explorer-search/core/uri.ts — Operações puras sobre WorkspaceUri
// (file:///a/b/c). Subset de vs/base/common/{uri,resources}.ts — sem scheme
// genérico: WorkspaceUri é sempre file:// (ver contract.ts).
// Espelho upstream: joinPath/dirname/basename/isEqual/isEqualOrParent.
// Sem imports, sem DOM, sem fs.
// ============================================================================
import type { WorkspaceUri } from '../contract';

/** file:// + normalização de path posix (remove "..", ".", "//", barra final). */
export function asWorkspaceUri(path: string): WorkspaceUri {
  return (`file://${normalizePosixPath(path)}`) as WorkspaceUri;
}

export function normalizePosixPath(p: string): string {
  // p pode vir completo (file:///a/b) ou cru (/a/b)
  let raw = p.startsWith('file://') ? p.slice('file://'.length) : p;
  if (!raw.startsWith('/')) raw = `/${raw}`;
  const parts: string[] = [];
  for (const seg of raw.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      parts.pop();
      continue;
    }
    parts.push(seg);
  }
  return `/${parts.join('/')}`;
}

export function uriPath(uri: WorkspaceUri): string {
  return normalizePosixPath(uri);
}

export function uriBasename(uri: WorkspaceUri): string {
  const p = uriPath(uri);
  const idx = p.lastIndexOf('/');
  return p.slice(idx + 1);
}

export function uriDirname(uri: WorkspaceUri): WorkspaceUri {
  const p = uriPath(uri);
  const idx = p.lastIndexOf('/');
  const parent = idx <= 0 ? '/' : p.slice(0, idx);
  return asWorkspaceUri(parent);
}

export function uriJoinPath(base: WorkspaceUri, ...segments: string[]): WorkspaceUri {
  return asWorkspaceUri([uriPath(base), ...segments].join('/'));
}

export function uriEquals(a: WorkspaceUri, b: WorkspaceUri): boolean {
  return uriPath(a) === uriPath(b);
}

/** true se `child` for igual a `parent` ou descendente dele (espelho de
 *  isEqualOrParent upstream). Semântica de prefixo por segmento. */
export function uriIsEqualOrParent(child: WorkspaceUri, parent: WorkspaceUri): boolean {
  const c = uriPath(child);
  const p = uriPath(parent);
  if (p === '/') return true;
  return c === p || c.startsWith(p.endsWith('/') ? p : `${p}/`);
}

/** Caminho relativo de `uri` em relação a `base` (undefined se não descendente). */
export function uriRelative(base: WorkspaceUri, uri: WorkspaceUri): string | undefined {
  if (!uriIsEqualOrParent(uri, base)) return undefined;
  const b = uriPath(base);
  const u = uriPath(uri);
  if (b === '/') return u.slice(1);
  return u.slice(b.length + 1);
}
