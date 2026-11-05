// ============================================================================
// transfer.test.ts — core/transfer (4.4): coleta webkitGetAsEntry (A4.2),
// upload com conflito ask/skip/replace+cancel (A4.3/A4.4), download zip
// client-side STORED com estrutura relativa (A4.6) + CRC32 conhecido.
// Mock de fetch injetável — zero rede real. DOM-free (core puro, FT-07).
// ============================================================================

import { afterEach, describe, expect, it, vi } from 'vitest';

// jsdom: Blob.arrayBuffer() ausente — polyfill via FileReader (só no teste;
// browsers/node reais já têm a API).
if (typeof Blob !== 'undefined' && typeof Blob.prototype.arrayBuffer !== 'function') {
  Blob.prototype.arrayBuffer = function arrayBuffer(): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this);
    });
  };
}
import { collectDroppedFiles, uploadFiles, resetUploadDirCache } from '../core/transfer/upload';
import { crc32, buildZipStoreAsync, downloadFiles } from '../core/transfer/download';
import { FakeFsPort } from './fakeFs';
import { asWorkspaceUri } from '../core/uri';

// ---------------------------------------------------------------------------
// webkitGetAsEntry mocks (FileSystemEntry tree do Chrome)
// ---------------------------------------------------------------------------

function entryFileObj(name: string, content: string) {
  const file = new File([content], name);
  return {
    isFile: true, isDirectory: false, name,
    file: (ok: (f: File) => void) => ok(file),
  };
}

function entryDir(name: string, children: unknown[]) {
  return {
    isFile: false, isDirectory: true, name,
    createReader: () => {
      let done = false;
      return {
        readEntries: (ok: (e: unknown[]) => void) => {
          if (done) return ok([]);
          done = true;
          ok(children);
        },
      };
    },
  };
}

describe('collectDroppedFiles (port doUpload :134)', () => {
  it('pasta do OS vira lista com caminhos relativos recursivos', async () => {
    const tree = entryDir('projeto', [
      entryFileObj('a.txt', 'A'),
      entryDir('src', [entryFileObj('main.ts', 'code'), entryFileObj('util.ts', 'u')]),
    ]);
    const items = [{ kind: 'file', webkitGetAsEntry: () => tree }];
    const records = await collectDroppedFiles(items as never);
    const paths = records.map((r) => r.relativePath).sort();
    expect(paths).toEqual(['projeto/a.txt', 'projeto/src/main.ts', 'projeto/src/util.ts']);
  });

  it('fallback flat quando webkitGetAsEntry não existe (getAsFile)', async () => {
    const f1 = new File(['x'], 'x.bin');
    const items = [{ kind: 'file', getAsFile: () => f1 }];
    const records = await collectDroppedFiles(items as never);
    expect(records.map((r) => r.relativePath)).toEqual(['x.bin']);
  });
});

// ---------------------------------------------------------------------------
// uploadFiles — fs fake mínimo + fetch mock
// ---------------------------------------------------------------------------

function makeDeps(opts?: { existing?: Set<string> }) {
  const existing = opts?.existing ?? new Set<string>();
  const created = new Set<string>();
  const folders = new Set<string>();
  const fs = {
    stat: vi.fn(async ({ uri }: { uri: string }) => {
      if (!existing.has(uri)) {
        const err = new Error('não existe') as Error & { code: string };
        err.code = 'file_not_found';
        throw err;
      }
      return { uri, size: 1, mtimeMs: 0, readonly: false, kind: 'file' as const };
    }),
    createFolder: vi.fn(async ({ uri }: { uri: string }) => {
      if (folders.has(uri)) {
        const err = new Error('já existe') as Error & { code: string };
        err.code = 'file_exists';
        throw err;
      }
      folders.add(uri);
    }),
  };
  return { fs, existing, created, folders };
}

describe('uploadFiles (A4.1–A4.4)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetUploadDirCache();
  });

  it('envia octet-stream com x-explorer-uri e cria pastas-mãe ANTES (server não auto-mkdir)', async () => {
    const { fs } = makeDeps();
    const posted: Array<{ uri: string | null; size: number }> = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      posted.push({
        uri: (init.headers as Record<string, string>)['x-explorer-uri'],
        size: (init.body as File).size,
      });
      return { ok: true } as Response;
    }));
    const records = [
      { relativePath: 'projeto/src/main.ts', file: new File(['abc'], 'main.ts') },
    ];
    const out = await uploadFiles({
      fs: fs as never,
      target: asWorkspaceUri('/ws'),
      records,
      conflict: 'overwrite',
    });
    expect(out.filesCreated).toBe(1);
    expect(fs.createFolder).toHaveBeenCalledWith({ uri: asWorkspaceUri('/ws/projeto') });
    expect(fs.createFolder).toHaveBeenCalledWith({ uri: asWorkspaceUri('/ws/projeto/src') });
    expect(posted).toEqual([{ uri: asWorkspaceUri('/ws/projeto/src/main.ts'), size: 3 }]);
  });

  it('colisão + ask → Replace sobrescreve; Skip pula; Cancel aborta (A4.3/A4.4)', async () => {
    const { fs, existing } = makeDeps({ existing: new Set([asWorkspaceUri('/ws/a.txt')]) });
    const posted: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      posted.push((init.headers as Record<string, string>)['x-explorer-uri']);
      return { ok: true } as Response;
    }));
    const records = [{ relativePath: 'a.txt', file: new File(['1'], 'a.txt') }];

    // replace
    const outReplace = await uploadFiles({
      fs: fs as never, target: asWorkspaceUri('/ws'), records, conflict: 'ask',
      askConflict: async () => 'replace',
    });
    expect(outReplace.filesCreated).toBe(1);

    // skip
    const outSkip = await uploadFiles({
      fs: fs as never, target: asWorkspaceUri('/ws'), records, conflict: 'ask',
      askConflict: async () => 'skip',
    });
    expect(outSkip.filesCreated).toBe(0);
    expect(outSkip.skipped).toEqual(['a.txt']);

    // cancel → AbortError, nenhum POST adicional
    const postedBefore = posted.length;
    await expect(uploadFiles({
      fs: fs as never, target: asWorkspaceUri('/ws'), records, conflict: 'ask',
      askConflict: async () => 'cancel',
    })).rejects.toMatchObject({ name: 'AbortError' });
    expect(posted.length).toBe(postedBefore);
  });

  it('progresso por arquivo+bytes chega em onProgress', async () => {
    const { fs } = makeDeps();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true }) as Response));
    const seen: Array<{ filesDone: number; bytesDone: number }> = [];
    await uploadFiles({
      fs: fs as never,
      target: asWorkspaceUri('/ws'),
      records: [
        { relativePath: 'a', file: new File(['12'], 'a') },
        { relativePath: 'b', file: new File(['345'], 'b') },
      ],
      conflict: 'overwrite',
      onProgress: (p) => seen.push({ filesDone: p.filesDone, bytesDone: p.bytesDone }),
    });
    expect(seen.at(-1)).toEqual({ filesDone: 2, bytesDone: 5 });
  });
});

// ---------------------------------------------------------------------------
// ZIP client-side (A4.6) + CRC32
// ---------------------------------------------------------------------------

describe('zip STORED (A4.6)', () => {
  it('crc32 bate com o vetor conhecido ("hello")', () => {
    expect(crc32(new TextEncoder().encode('hello'))).toBe(0x3610a686);
    expect(crc32(new TextEncoder().encode(''))).toBe(0);
  });

  it('buildZipStoreAsync gera EOCD válido e lista central com os caminhos relativos', async () => {
    const zip = await buildZipStoreAsync([
      { path: 'pasta/a.txt', blob: new Blob(['hello']) },
      { path: 'pasta/sub/b.bin', blob: new Blob(['xy']) },
    ]);
    const bytes = new Uint8Array(await zip.arrayBuffer());
    // assinatura local header PK\x03\x04 no início
    expect([bytes[0], bytes[1], bytes[2], bytes[3]]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    // EOCD PK\x05\x06 no final (−22 bytes)
    const eocd = bytes.slice(bytes.length - 22, bytes.length - 18);
    expect([eocd[0], eocd[1], eocd[2], eocd[3]]).toEqual([0x50, 0x4b, 0x05, 0x06]);
    // 2 entradas no EOCD (offset bytes.length-12 = count u16 LE)
    const count = bytes[bytes.length - 12] | (bytes[bytes.length - 11] << 8);
    expect(count).toBe(2);
    // textos dos caminhos presentes no blob
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('pasta/a.txt');
    expect(text).toContain('pasta/sub/b.bin');
    expect(text).toContain('hello');
  });
});

describe('downloadFiles — G1 multi-seleção → 1 ZIP (adaptação web de fileImportExport.ts:633/652/680)', () => {
  afterEach(() => vi.unstubAllGlobals());

  function seeded() {
    const fs = new FakeFsPort(asWorkspaceUri('/ws'));
    fs.seed([
      { path: '/ws/a.txt', kind: 'file' },
      { path: '/ws/b.txt', kind: 'file' },
      { path: '/ws/dir', kind: 'directory' },
      { path: '/ws/dir/c.txt', kind: 'file' },
    ]);
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      const uri = decodeURIComponent(String(url).split('uri=')[1]);
      return { ok: true, blob: async () => new Blob([`conteudo:${uri.split('/').pop()}`]) } as unknown as Response;
    }));
    return fs;
  }

  it('1 arquivo → 1 download do próprio arquivo (sem zip)', async () => {
    const fs = seeded(); const saved: Array<{ name: string; size: number }> = [];
    await downloadFiles({ fs, uris: [asWorkspaceUri('/ws/a.txt')], save: async (b, n) => { saved.push({ name: n, size: b.size }); } });
    expect(saved.map((s) => s.name)).toEqual(['a.txt']);
  });

  it('2 arquivos + 1 pasta → UM ÚNICO zip <pai>.zip com arquivos na raiz e pasta com caminhos relativos', async () => {
    const fs = seeded(); const saved: Array<{ name: string; blob: Blob }> = [];
    await downloadFiles({ fs, uris: [asWorkspaceUri('/ws/a.txt'), asWorkspaceUri('/ws/b.txt'), asWorkspaceUri('/ws/dir')], save: async (b, n) => { saved.push({ name: n, blob: b }); } });
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe('ws.zip');
    const bytes = new Uint8Array(await saved[0].blob.arrayBuffer());
    const count = bytes[bytes.length - 12] | (bytes[bytes.length - 11] << 8);
    expect(count).toBe(3);
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('a.txt');
    expect(text).toContain('b.txt');
    expect(text).toContain('dir/c.txt');
    expect(text).toContain('conteudo:c.txt');
  });
});
