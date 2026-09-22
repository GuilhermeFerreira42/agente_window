// ============================================================================
// uri.test.ts — subset de vs/base/common/{uri,resources}.ts (LEGO 4.2).
// ============================================================================
import { describe, expect, it } from 'vitest';
import {
  asWorkspaceUri,
  normalizePosixPath,
  uriBasename,
  uriDirname,
  uriEquals,
  uriIsEqualOrParent,
  uriJoinPath,
  uriPath,
  uriRelative,
} from '../core/uri';

describe('uri — file:// WorkspaceUri helpers', () => {
  it('normalizePosixPath: colapsa ".", "..", "//" e barra final', () => {
    expect(normalizePosixPath('/a//b/./c')).toBe('/a/b/c');
    expect(normalizePosixPath('/a/b/../c')).toBe('/a/c');
    expect(normalizePosixPath('/a/b/')).toBe('/a/b');
    expect(normalizePosixPath('a/b')).toBe('/a/b');
    expect(normalizePosixPath('file:///x/../y')).toBe('/y');
    expect(normalizePosixPath('/')).toBe('/');
  });

  it('asWorkspaceUri: normaliza antes de fixar o scheme', () => {
    expect(asWorkspaceUri('/a/./b/')).toBe('file:///a/b');
    expect(asWorkspaceUri('file:///a//b')).toBe('file:///a/b');
  });

  it('basename / dirname / joinPath', () => {
    expect(uriBasename('file:///a/b/c.ts')).toBe('c.ts');
    expect(uriBasename('file:///a')).toBe('a');
    expect(uriDirname('file:///a/b/c.ts')).toBe('file:///a/b');
    expect(uriDirname('file:///a')).toBe('file:///');
    expect(uriJoinPath('file:///a', 'b', 'c.ts')).toBe('file:///a/b/c.ts');
    expect(uriJoinPath('file:///a/', 'b')).toBe('file:///a/b');
  });

  it('equals usa path normalizado (case-sensitive, ext4)', () => {
    expect(uriEquals('file:///a/b', 'file:///a//b/')).toBe(true);
    expect(uriEquals('file:///a/B', 'file:///a/b')).toBe(false);
  });

  it('isEqualOrParent: semântica de prefixo por segmento (sem falso irmão)', () => {
    expect(uriIsEqualOrParent('file:///a/b', 'file:///a/b')).toBe(true);
    expect(uriIsEqualOrParent('file:///a/b/c', 'file:///a/b')).toBe(true);
    expect(uriIsEqualOrParent('file:///a/bc', 'file:///a/b')).toBe(false);
    expect(uriIsEqualOrParent('file:///a/b', 'file:///a/b/c')).toBe(false);
    expect(uriIsEqualOrParent('file:///qualquer/coisa', 'file:///')).toBe(true);
  });

  it('relative: de base para descendente; undefined quando fora', () => {
    expect(uriRelative('file:///a', 'file:///a/b/c')).toBe('b/c');
    expect(uriRelative('file:///a/b', 'file:///a/b')).toBe('');
    expect(uriRelative('file:///a', 'file:///x/y')).toBeUndefined();
    expect(uriRelative('file:///', 'file:///a')).toBe('a');
  });

  it('uriPath round-trip', () => {
    expect(uriPath('file:////srv/proj/')).toBe('/srv/proj');
  });
});
