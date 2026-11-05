// gitHost.win32.test.ts — portabilidade Windows do GitHost (simulada com path.win32).
// Motivação: no Windows real a aba Changes ficava vazia — `git rev-parse --show-toplevel`
// devolve "C:/Users/x/repo" (barras normais, caixa possivelmente diferente) e a
// comparação com o cwd do Node ("C:\\Users\\x\\repo") era case-sensitive e literal.
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GitHost, samePath, type ExecLike } from '../server/git/gitHost';
import type { WorkspaceUri } from '../contract';

const ROOT_URI = 'file:///C:/Users/Usuario/Desktop/agente_window' as WorkspaceUri;
const PORCELAIN = ['# branch.head main', '1 .M N... 100644 100644 100644 abc abc src\\a.ts'.replace('src\\a.ts', 'src/a.ts'), '? novo.txt', ''].join('\0');

function fakeGit(toplevel: string): { exec: ExecLike; calls: Array<{ cwd: string; args: string[] }> } {
  const calls: Array<{ cwd: string; args: string[] }> = [];
  const exec: ExecLike = async (cwd, args) => {
    calls.push({ cwd, args });
    if (args[0] === 'rev-parse' && args[1] === '--show-toplevel') return { stdout: `${toplevel}\n`, stderr: '', code: 0 };
    if (args[0] === 'status') return { stdout: PORCELAIN, stderr: '', code: 0 };
    return { stdout: '', stderr: '', code: 0 };
  };
  return { exec, calls };
}

describe('GitHost no Windows (path.win32)', () => {
  it('samePath: case-insensitive só quando sep é "\\\\"', () => {
    expect(samePath('C:\\A\\b', 'c:\\a\\B', path.win32)).toBe(true);
    expect(samePath('/a/b', '/A/b', path.posix)).toBe(false);
  });

  it('cwd do git é o caminho NTFS (C:\\...), não a URI; toplevel com barras normais e caixa diferente ainda conta como repo', async () => {
    const g = fakeGit('c:/users/usuario/desktop/agente_window');
    const host = new GitHost({ workspaceRoot: ROOT_URI, exec: g.exec, pathApi: path.win32 });
    const st = await host.status(ROOT_URI);
    expect(g.calls[0].cwd).toBe('C:\\Users\\Usuario\\Desktop\\agente_window');
    expect(st.isRepo).toBe(true);
    expect(st.branch).toBe('main');
    expect(st.entries.map((e) => e.uri)).toEqual([
      'file:///C:/Users/Usuario/Desktop/agente_window/novo.txt',
      'file:///C:/Users/Usuario/Desktop/agente_window/src/a.ts',
    ]);
  });

  it('toplevel de um repo PAI (fora da pasta) continua não contando como repo', async () => {
    const g = fakeGit('C:/Users/Usuario');
    const host = new GitHost({ workspaceRoot: ROOT_URI, exec: g.exec, pathApi: path.win32 });
    expect((await host.status(ROOT_URI)).isRepo).toBe(false);
  });

  it('stage recebe caminhos relativos posix ("src/a.ts"), nunca "C:\\..."', async () => {
    const g = fakeGit('C:/Users/Usuario/Desktop/agente_window');
    const host = new GitHost({ workspaceRoot: ROOT_URI, exec: g.exec, pathApi: path.win32 });
    await host.stage(ROOT_URI, [`${ROOT_URI}/src/a.ts` as WorkspaceUri]);
    const add = g.calls.find((c) => c.args[0] === 'add')!;
    expect(add.args).toEqual(['add', '-A', '--', 'src/a.ts']);
  });
});
