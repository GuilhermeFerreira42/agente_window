// ============================================================================
// fsHostCrossPlatform.test.ts — URI <-> path em Windows E Linux, sem depender
// do SO da máquina de teste (PathApi injetável: path.win32 / path.posix).
// Motivo: no Windows `file://` + `C:\Users\...` gerava URI inválida, o
// `/fs/root` do Single Port vinha com barras invertidas e o módulo
// explorer-search nunca montava (App caía no picker antigo).
// Forma esperada = a de node:url.pathToFileURL, SEM percent-encoding
// (convenção do módulo: path cru na URI; core/uri.ts não decodifica).
// ============================================================================
import { posix, win32 } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FsHostError, resolveRootPath, toFsPath, toWorkspaceUri } from '../server/fs/fsHost';
import type { WorkspaceUri } from '../contract';

const u = (s: string) => s as WorkspaceUri;

describe('fsHost cross-platform — Windows (path.win32)', () => {
  const rootWin = 'C:\\Users\\dev\\agente_window';

  it('resolveRootPath: path cru do vite.config (com barra final) → sem barra final', () => {
    expect(resolveRootPath('C:\\Users\\dev\\agente_window\\', win32)).toBe(rootWin);
    expect(resolveRootPath(rootWin, win32)).toBe(rootWin);
  });

  it('resolveRootPath: aceita WorkspaceUri file:///C:/... e FS_TEST_ROOT estilo file://', () => {
    expect(resolveRootPath('file:///C:/Users/dev/agente_window', win32)).toBe(rootWin);
    expect(resolveRootPath('file:///C:/Users/dev/agente_window/', win32)).toBe(rootWin);
  });

  it('toWorkspaceUri: gera file:///C:/... com barras normais (forma do pathToFileURL)', () => {
    const uri = toWorkspaceUri(rootWin, rootWin, win32);
    expect(uri).toBe('file:///C:/Users/dev/agente_window');
    expect(uri).not.toContain('\\');
    // Mesma forma que o Node produz para o mesmo path (sem o encoding, que
    // aqui não se aplica pois não há caracteres reservados).
    expect(uri).toBe(pathToFileURL(rootWin, { windows: true } as never).href.replace(/\/$/, ''));
  });

  it('toWorkspaceUri: filho e nome com espaço ficam crus (sem %20) e posix', () => {
    expect(toWorkspaceUri(rootWin, 'C:\\Users\\dev\\agente_window\\src\\a b.ts', win32))
      .toBe('file:///C:/Users/dev/agente_window/src/a b.ts');
  });

  it('toFsPath: file:///C:/... → C:\\... e round-trip estável', () => {
    const uri = u('file:///C:/Users/dev/agente_window/src/index.ts');
    const fsPath = toFsPath(rootWin, uri, win32);
    expect(fsPath).toBe('C:\\Users\\dev\\agente_window\\src\\index.ts');
    expect(toWorkspaceUri(rootWin, fsPath, win32)).toBe(uri);
  });

  it('toFsPath: a própria raiz é aceita', () => {
    expect(toFsPath(rootWin, u('file:///C:/Users/dev/agente_window'), win32)).toBe(rootWin);
    expect(toFsPath(rootWin, u('file:///C:/Users/dev/agente_window/'), win32)).toBe(rootWin);
  });

  it('toFsPath: bloqueia travessia (..), prefixo parcial e outro drive', () => {
    expect(() => toFsPath(rootWin, u('file:///C:/Users/dev/agente_window/../escape.txt'), win32))
      .toThrowError(FsHostError);
    expect(() => toFsPath(rootWin, u('file:///C:/Users/dev/agente_window2/x'), win32))
      .toThrowError(/fora da raiz/);
    expect(() => toFsPath(rootWin, u('file:///D:/Users/dev/agente_window/x'), win32))
      .toThrowError(/fora da raiz/);
  });

  it('toFsPath: raiz de drive (C:\\) não vira "C:" relativo', () => {
    expect(toFsPath('C:\\', u('file:///C:/'), win32)).toBe('C:\\');
    expect(toFsPath('C:\\', u('file:///C:/x.txt'), win32)).toBe('C:\\x.txt');
  });
});

describe('fsHost cross-platform — Linux (path.posix) permanece idêntico ao anterior', () => {
  const rootPosix = '/home/user/agente_window';

  it('resolveRootPath: path cru e file:// → mesmo valor, sem barra final', () => {
    expect(resolveRootPath('/home/user/agente_window/', posix)).toBe(rootPosix);
    expect(resolveRootPath('file:///home/user/agente_window', posix)).toBe(rootPosix);
  });

  it('toWorkspaceUri/toFsPath: file:///home/... cru (sem encoding), round-trip', () => {
    const fsPath = '/home/user/agente_window/src/a b.ts';
    const uri = toWorkspaceUri(rootPosix, fsPath, posix);
    expect(uri).toBe('file:///home/user/agente_window/src/a b.ts');
    expect(toFsPath(rootPosix, uri, posix)).toBe(fsPath);
    expect(toFsPath(rootPosix, u('file:///home/user/agente_window'), posix)).toBe(rootPosix);
  });

  it('toFsPath: travessia continua bloqueada', () => {
    expect(() => toFsPath(rootPosix, u('file:///home/user/agente_window/../x'), posix)).toThrowError(FsHostError);
    expect(() => toFsPath(rootPosix, u('file:///../../tmp/escape'), posix)).toThrowError(/fora da raiz/);
  });
});
