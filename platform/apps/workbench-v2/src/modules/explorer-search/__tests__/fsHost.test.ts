// ============================================================================
// fsHost.test.ts — VAL-FS-01 (escrita atômica persistida), VAL-FS-02 (N
// escritas concorrentes na mesma URI → sem corrupção, ordem preservada),
// traversal → forbidden_path, wx, copy/move/remove, binário base64+mime.
// fs REAL em tmpdir (04_15 4.3 DoD: integração Node).
// ============================================================================
import { mkdtempSync, rmSync, existsSync, writeFileSync, mkdirSync, chmodSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FsHost, FsHostError, toFsPath, toWorkspaceUri } from '../server/fs/fsHost';
import type { WorkspaceUri } from '../contract';

let fixture: string;
let host: FsHost;

const uri = (p: string): WorkspaceUri => `file://${join(fixture, p)}` as WorkspaceUri;

beforeEach(() => {
  fixture = mkdtempSync(join(tmpdir(), 'fshost-'));
  host = new FsHost(`file://${fixture}` as WorkspaceUri);
  mkdirSync(join(fixture, 'src'));
  writeFileSync(join(fixture, 'src', 'a.txt'), 'alfa');
  writeFileSync(join(fixture, 'README.md'), '# doc');
});

afterEach(() => {
  rmSync(fixture, { recursive: true, force: true });
});

describe('fsHost — leitura (list/stat/read/binário)', () => {
  it('list e stat com mtime/size/kind/readonly', async () => {
    const entries = await host.list(uri(''));
    const names = entries.map((e) => e.name).sort();
    expect(names).toEqual(['README.md', 'src']);
    const kind = Object.fromEntries(entries.map((e) => [e.name, e.kind]));
    expect(kind.src).toBe('directory');
    expect(kind['README.md']).toBe('file');
    // toWorkspaceUri: URIs absolutas, posix, dentro da raiz
    expect(entries[0].uri.startsWith(`file://${fixture}/`)).toBe(true);

    const st = await host.stat(uri('src/a.txt'));
    expect(st).toMatchObject({ kind: 'file', size: 4 });
    expect(st.mtimeMs).toBeGreaterThan(0);
    expect(st.readonly).toBe(false);

    // readonly por bits de modo (mode & 0o222 === 0)
    chmodSync(join(fixture, 'README.md'), 0o444);
    expect((await host.stat(uri('README.md'))).readonly).toBe(true);
  });

  it('readFile utf-8; readFileBinary base64 com mime e maxBytes', async () => {
    const r = await host.readFile(uri('src/a.txt'));
    expect(r).toEqual({ content: 'alfa', encoding: 'utf-8' });

    const b = await host.readFileBinary(uri('src/a.txt'));
    expect(b.mime).toBe('text/plain');
    expect(Buffer.from(b.dataBase64, 'base64').toString()).toBe('alfa');

    const capped = await host.readFileBinary(uri('src/a.txt'), 2);
    expect(Buffer.from(capped.dataBase64, 'base64').toString()).toBe('al');
  });

  it('downloadPath: stream só para arquivo; pasta → erro tipado', async () => {
    const dl = await host.downloadPath(uri('src/a.txt'));
    expect(dl.mime).toBe('text/plain');
    expect(dl.size).toBe(4);
    await expect(host.downloadPath(uri('src'))).rejects.toThrow(FsHostError);
  });
});

describe('fsHost — guarda de path traversal (congelada 04_10 §2.1)', () => {
  it('resolve fora da raiz (../, /etc, absoluto) → forbidden_path', async () => {
    expect(() => toFsPath(fixture, uri('../escape.txt'))).toThrowError(FsHostError);
    await expect(host.list(uri('../../'))).rejects.toMatchObject({ code: 'forbidden_path' });
    await expect(host.readFile('file:///etc/passwd' as WorkspaceUri)).rejects.toMatchObject({ code: 'forbidden_path' });
    // globbing com barra final e ./ — fora
    expect(() => toFsPath(fixture, 'file:///../../tmp/escape')).toThrowError(/fora da raiz|Forbidden/);
  });

  it('normaliza e aceita caminhos legítimos (dentro da raiz)', () => {
    expect(toFsPath(fixture, uri('src/a.txt'))).toBe(join(fixture, 'src', 'a.txt'));
    expect(toWorkspaceUri(fixture, join(fixture, 'src', 'a.txt'))).toBe(
      `file://${fixture}/src/a.txt`,
    );
  });
});

describe('fsHost — operações de escrita (wx/cp/rename/rm/atômica)', () => {
  it('createFile wx: cria; segunda vez → file_exists (409)', async () => {
    await host.createFile(uri('novo.txt'), 'oi');
    expect(existsSync(join(fixture, 'novo.txt'))).toBe(true);
    await expect(host.createFile(uri('novo.txt'))).rejects.toMatchObject({ code: 'file_exists' });
  });

  it('createFolder (mkdir -p); copy recursiva; move; remove recursive', async () => {
    await host.createFolder(uri('docs/reports'));
    expect(existsSync(join(fixture, 'docs', 'reports'))).toBe(true);

    await host.createFile(uri('docs/reports/r1.md'), 'x');
    await host.copy(uri('docs'), uri('docs-bak'));
    expect(existsSync(join(fixture, 'docs-bak', 'reports', 'r1.md'))).toBe(true);

    await host.move(uri('docs-bak'), uri('docs-moved'));
    expect(existsSync(join(fixture, 'docs-moved', 'reports', 'r1.md'))).toBe(true);

    await host.remove(uri('docs-moved'), true);
    expect(existsSync(join(fixture, 'docs-moved'))).toBe(false);

    // remove de arquivo com recursive=false funciona
    await host.createFile(uri('tmp-file.txt'), 'x');
    await host.remove(uri('tmp-file.txt'));
    expect(existsSync(join(fixture, 'tmp-file.txt'))).toBe(false);
  });

  it('VAL-FS-01: writeFileAtomic persiste conteúdo e não deixa .tmp', async () => {
    await host.writeFileAtomic(uri('atomic.txt'), 'conteúdo-final-⚛');
    const persisted = (await host.readFile(uri('atomic.txt'))).content;
    expect(persisted).toBe('conteúdo-final-⚛');
    // nenhum temp residual na pasta
    expect((await host.list(uri(''))).map((e) => e.name)).not.toContainEqual(
      expect.stringMatching(/vscode-fstmp/),
    );
    // sobrescrita atômica também funciona
    await host.writeFileAtomic(uri('atomic.txt'), 'v2');
    expect((await host.readFile(uri('atomic.txt'))).content).toBe('v2');
  });

  it('VAL-FS-02: 24 escritas concorrentes na MESMA URI → sem corrupção, última vence', async () => {
    const N = 24;
    const writes = Array.from({ length: N }, (_, i) =>
      host.writeFileAtomic(uri('race.txt'), `linha-${String(i).padStart(3, '0')}-X${'='.repeat(i)}`),
    );
    await Promise.all(writes);
    const final = (await host.readFile(uri('race.txt'))).content;
    // sem corrupção = conteúdo é EXATAMENTE uma das submissões (nunca misturado)
    expect(final).toBe(`linha-023-X${'='.repeat(23)}`); // fila serial → última
    expect(statSync(join(fixture, 'race.txt')).size).toBe(final.length);
  });

  it('erros Node mapeados: ENOENT → file_not_found; EACCES/EPERM → forbidden_path', async () => {
    await expect(host.readFile(uri('fantasma.txt'))).rejects.toMatchObject({ code: 'file_not_found' });
    await expect(host.list(uri('fantasma-dir'))).rejects.toMatchObject({ code: 'file_not_found' });
  });
});
