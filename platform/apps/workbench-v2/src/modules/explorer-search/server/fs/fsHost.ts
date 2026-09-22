// ============================================================================
// modules/explorer-search/server/fs/fsHost.ts — I/O real (Node fs/promises).
// Fonte upstream (7debcd0e):
//   platform/files/common/fileService.ts:383 (writeFile) — temp+rename atômico,
//     fila serial por uri (barreira de FileOperation :183); etag modified-since
//     (:536) NÃO entra: o contrato 04_10 §2.1 congelou writeFile sem etag
//     (registrado em docs/12).
//   platform/files/common/diskFileSystemProviderClient.ts:79-250 — stat/list/
//     readFile/writeFile/delete/rename/copy semânticos (fs.* direto no disco).
// Regras congeladas (04_10 §2.1):
//   - Path traversal BLOQUEADO: todo URI resolvido contra root; fora da raiz →
//     ForbiddenPathError (`forbidden_path`, HTTP 403).
//   - Escrita SEMPRE atômica (same-dir temp + rename).
//   - Fila serial por URI para escritas (VAL-FS-02).
// Sem imports fora do módulo; apenas node:* (FT-02 permitido em server/**).
// ============================================================================
import { constants as fsConstants } from 'node:fs';
import {
  access,
  cp,
  mkdir,
  open,
  readFile as nodeReadFile,
  readdir,
  rename,
  rm,
  stat as nodeStat,
  writeFile as nodeWriteFile,
} from 'node:fs/promises';
import { basename, dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { randomBytes } from 'node:crypto';
import type { WorkspaceUri } from '../../contract';

export type FsErrorCode = 'forbidden_path' | 'file_exists' | 'file_not_found' | 'io';

/** Erro tipado espelhado para o cliente (`code` atravessa o HTTP). */
export class FsHostError extends Error {
  constructor(
    readonly code: FsErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'FsHostError';
  }
}

export interface FsHostEntry {
  uri: WorkspaceUri;
  name: string;
  kind: 'file' | 'directory';
}

export interface FsHostStat {
  uri: WorkspaceUri;
  size: number;
  mtimeMs: number;
  readonly: boolean;
  kind: 'file' | 'directory';
}

/** MIME mínimo para readFileBinary/download (subset consciente). */
const MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.json': 'application/json',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.ts': 'text/plain',
  '.tsx': 'text/plain',
  '.jsx': 'text/plain',
  '.css': 'text/css',
  '.html': 'text/html',
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.wasm': 'application/wasm',
  '.zip': 'application/zip',
};

function mimeOf(path: string): string {
  return MIME_BY_EXT[extname(path).toLowerCase()] ?? 'application/octet-stream';
}

/** Guarda de travessia: resolve lexicamente e exige prefixo por SEGMENTO. */
export function toFsPath(rootPath: string, uri: WorkspaceUri): string {
  const rawPath = uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
  // WorkspaceUri é ABSOLUTA (file:///home/user/...). resolve() colapsa ".",
  // "..", "//" e barra final — depois basta exigir relação por segmentos.
  const resolved = normalize(resolve(rawPath));
  const root = normalize(rootPath);
  if (resolved !== root && !resolved.startsWith(root + sep)) {
    throw new FsHostError('forbidden_path', `URI fora da raiz do workspace: ${uri}`);
  }
  return resolved;
}

/** WorkspaceUri é ABSOLUTA (espelho do path posix em file://). rootPath é
 *  mantido só para consistência de assinatura (chamadores guardam/fora da raiz
 *  já foram barrados por toFsPath). */
export function toWorkspaceUri(rootPath: string, fsPath: string): WorkspaceUri {
  void rootPath;
  return `file://${normalize(fsPath)}` as WorkspaceUri;
}

export class FsHost {
  readonly rootPath: string;

  constructor(root: WorkspaceUri) {
    const raw = root.startsWith('file://') ? root.slice('file://'.length) : root;
    this.rootPath = resolve(normalize(raw));
  }

  private pathOf(uri: WorkspaceUri): string {
    return toFsPath(this.rootPath, uri);
  }

  private uriOf(path: string): WorkspaceUri {
    return toWorkspaceUri(this.rootPath, path);
  }

  // ---- leituras ----
  async list(uri: WorkspaceUri): Promise<FsHostEntry[]> {
    const dir = this.pathOf(uri);
    const dirents = await readdir(dir, { withFileTypes: true }).catch((e) => {
      throw mapNodeError(e, uri);
    });
    return dirents.map((d) => ({
      uri: this.uriOf(join(dir, d.name)),
      name: d.name,
      kind: d.isDirectory() ? ('directory' as const) : ('file' as const),
    }));
  }

  async stat(uri: WorkspaceUri): Promise<FsHostStat> {
    const path = this.pathOf(uri);
    const st = await nodeStat(path).catch((e) => {
      throw mapNodeError(e, uri);
    });
    return {
      uri,
      size: st.size,
      mtimeMs: st.mtimeMs,
      readonly: (st.mode & 0o222) === 0,
      kind: st.isDirectory() ? 'directory' : 'file',
    };
  }

  async readFile(uri: WorkspaceUri): Promise<{ content: string; encoding: 'utf-8' }> {
    const path = this.pathOf(uri);
    const content = await nodeReadFile(path, 'utf-8').catch((e) => {
      throw mapNodeError(e, uri);
    });
    return { content, encoding: 'utf-8' };
  }

  async readFileBinary(uri: WorkspaceUri, maxBytes?: number): Promise<{ dataBase64: string; mime: string }> {
    const path = this.pathOf(uri);
    const buf = await nodeReadFile(path).catch((e) => {
      throw mapNodeError(e, uri);
    });
    const sliced = maxBytes != null && buf.length > maxBytes ? buf.subarray(0, maxBytes) : buf;
    return { dataBase64: Buffer.from(sliced).toString('base64'), mime: mimeOf(path) };
  }

  /** Fluxo de download (stream bruto) — montado pelo HTTP handler. */
  async downloadPath(uri: WorkspaceUri): Promise<{ path: string; mime: string; size: number }> {
    const st = await this.stat(uri);
    if (st.kind === 'directory') {
      throw new FsHostError('io', `download de pasta não é stream (4.4 monta client-side): ${uri}`);
    }
    const path = this.pathOf(uri);
    return { path, mime: mimeOf(path), size: st.size };
  }

  // ---- escritas (temp+rename atômico, fila serial por URI) ----

  /** Fila por URI (espelho da barreira serial de FileOperation por recurso). */
  private readonly writeQueues = new Map<string, Promise<unknown>>();

  private enqueue<T>(key: string, op: () => Promise<T>): Promise<T> {
    const prev = this.writeQueues.get(key) ?? Promise.resolve();
    const next = prev.then(op, op); // continua mesmo após erro da anterior
    this.writeQueues.set(
      key,
      next.catch(() => undefined),
    );
    return next;
  }

  /** Escrita ATÔMICA: temp na mesma pasta + rename (zero escrita parcial). */
  async writeFileAtomic(uri: WorkspaceUri, content: string): Promise<void> {
    const finalPath = this.pathOf(uri);
    return this.enqueue(finalPath, async () => {
      const tmpPath = join(
        dirname(finalPath),
        `.vscode-fstmp-${Date.now()}-${randomBytes(4).toString('hex')}`,
      );
      try {
        await nodeWriteFile(tmpPath, content, { encoding: 'utf-8', flag: 'w' });
        await rename(tmpPath, finalPath);
      } catch (e) {
        await rm(tmpPath, { force: true }).catch(() => undefined);
        throw mapNodeError(e, uri);
      }
    });
  }

  /** Upload streamado (body raw) — mesma semântica atômica em pedaços. */
  async writeStreamAtomic(uri: WorkspaceUri, chunks: AsyncIterable<Buffer>): Promise<void> {
    const finalPath = this.pathOf(uri);
    return this.enqueue(finalPath, async () => {
      const tmpPath = join(
        dirname(finalPath),
        `.vscode-fstmp-${Date.now()}-${randomBytes(4).toString('hex')}`,
      );
      try {
        const out = await open(tmpPath, 'w');
        try {
          for await (const chunk of chunks) {
            await out.write(chunk);
          }
        } finally {
          await out.close();
        }
        await rename(tmpPath, finalPath);
      } catch (e) {
        await rm(tmpPath, { force: true }).catch(() => undefined);
        throw mapNodeError(e, uri);
      }
    });
  }

  async createFile(uri: WorkspaceUri, content?: string): Promise<void> {
    const path = this.pathOf(uri);
    return this.enqueue(path, async () => {
      // flag 'wx' = falha se existir (espelho canCreate → FILE_EXISTS upstream).
      await nodeWriteFile(path, content ?? '', { encoding: 'utf-8', flag: 'wx' }).catch((e) => {
        throw mapNodeError(e, uri);
      });
    });
  }

  async createFolder(uri: WorkspaceUri): Promise<void> {
    const path = this.pathOf(uri);
    await mkdir(path, { recursive: true }).catch((e) => {
      throw mapNodeError(e, uri);
    });
  }

  async copy(from: WorkspaceUri, to: WorkspaceUri): Promise<void> {
    const fromPath = this.pathOf(from);
    const toPath = this.pathOf(to);
    await cp(fromPath, toPath, { recursive: true, errorOnExist: true, force: false }).catch((e) => {
      throw mapNodeError(e, to);
    });
  }

  async move(from: WorkspaceUri, to: WorkspaceUri): Promise<void> {
    const fromPath = this.pathOf(from);
    const toPath = this.pathOf(to);
    return this.enqueue(`${fromPath}::${toPath}`, async () => {
      try {
        await rename(fromPath, toPath);
      } catch (e) {
        // Cross-device (mounts diferentes): fallback copy+delete (upstream move).
        if ((e as NodeJS.ErrnoException)?.code === 'EXDEV') {
          await cp(fromPath, toPath, { recursive: true });
          await rm(fromPath, { recursive: true, force: true });
          return;
        }
        throw mapNodeError(e, to);
      }
    });
  }

  async remove(uri: WorkspaceUri, recursive?: boolean): Promise<void> {
    const path = this.pathOf(uri);
    return this.enqueue(path, async () => {
      await rm(path, { recursive: recursive === true, force: false }).catch((e) => {
        throw mapNodeError(e, uri);
      });
    });
  }

  /** Acessibilidade de escrita (usado por probes/health futuro). */
  async canWrite(uri: WorkspaceUri): Promise<boolean> {
    try {
      await access(this.pathOf(uri), fsConstants.W_OK);
      return true;
    } catch {
      return false;
    }
  }
}

/** Mapeamento de erros Node → FsHostError tipado (code atravessa o HTTP). */
export function mapNodeError(e: unknown, uri: WorkspaceUri): FsHostError {
  const err = e as NodeJS.ErrnoException;
  switch (err?.code) {
    case 'ENOENT':
      return new FsHostError('file_not_found', `não encontrado: ${uri}`);
    case 'EEXIST':
      return new FsHostError('file_exists', `já existe: ${uri}`);
    case 'EACCES':
    case 'EPERM':
      return new FsHostError('forbidden_path', `sem permissão: ${uri} (${err.code})`);
    case 'ENOTDIR':
    case 'EISDIR':
    case 'ENOTEMPTY':
    case 'ENOTEMPTYDIR':
      return new FsHostError('io', `${err.code}: ${uri}`);
    default:
      return new FsHostError('io', `${err?.code ?? 'io'}: ${uri} — ${err?.message ?? String(e)}`);
  }
}

/** Varre para garantir que o diretório raiz EXISTE e é diretório. */
export async function assertWorkspaceRoot(root: WorkspaceUri): Promise<void> {
  const raw = root.startsWith('file://') ? root.slice('file://'.length) : root;
  const st = await nodeStat(resolve(normalize(raw))).catch(() => {
    throw new FsHostError('file_not_found', `raiz do workspace não existe: ${root}`);
  });
  if (!st.isDirectory()) {
    throw new FsHostError('io', `raiz do workspace não é diretório: ${root}`);
  }
}

export { basename as fsBasename, dirname as fsDirname };
