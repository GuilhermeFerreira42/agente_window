// ============================================================================
// modules/explorer-search/core/transfer/upload.ts — Upload SO→Explorer (web).
// PORT fiel: BrowserFileUpload (upstream 7debcd0e,
// contrib/files/browser/fileImportExport.ts — classe em :72,
// doUpload :134, doUploadEntry :205, doUploadFileBuffered :315).
//
// Regras portadas:
//   1. Detecção via webkitGetAsEntry() (permite PASTAS do OS); fallback
//      items[].getAsFile() (flat — E2E/safari).
//   2. Recursividade de pastas: estrutura relativa é recriada no destino.
//   3. Progresso em arquivos+bytes (evento fs.uploadProgress do contrato).
//   4. Confirmação de sobrescrita (A4.3): 'ask' resolve por Promise (dialog).
//   5. Cancelamento via AbortSignal — nenhum arquivo parcial: o destino só
//      existe depois do rename atômico do server (4.3); abortar = temp limpo.
//   6. Destino sob o cursor (resolvido pelo dndPolicy antes de chegar aqui).
//   7. Pastas-mãe criadas ANTES do POST (server /fs/upload não auto-mkdir).
// ============================================================================

import type { FileSystemPortLike, WorkspaceUri } from '../../contract';
import { uriJoinPath, uriDirname } from '../uri';

export interface UploadFileRecord {
  /** Caminho relativo ao alvo do drop (ex.: `projeto/src/a.txt`). */
  relativePath: string;
  file: File;
}

export interface UploadProgress {
  filesDone: number;
  filesTotal: number;
  bytesDone: number;
  bytesTotal: number;
  currentName: string;
}

export type UploadConflictResolution = 'replace' | 'skip' | 'cancel';

export interface UploadFilesInput {
  fs: FileSystemPortLike;
  target: WorkspaceUri;
  records: UploadFileRecord[];
  baseUrl?: string;
  conflict: 'overwrite' | 'skip' | 'ask';
  /** Só chamada quando conflict==='ask' e existe colisão real. */
  askConflict?: (input: { name: string; isFirst: boolean }) => Promise<UploadConflictResolution>;
  onProgress?: (p: UploadProgress) => void;
  signal?: AbortSignal;
}

export interface UploadFilesResult {
  filesCreated: number;
  skipped: string[];
}

// ---------------------------------------------------------------------------
// Coleta das entradas do drop (webkitGetAsEntry — port do :134 doUpload)
// ---------------------------------------------------------------------------

interface WebkitEntryLike {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath?: string;
  file?: (success: (f: File) => void, error?: (e: unknown) => void) => void;
  createReader?: () => {
    readEntries: (success: (entries: WebkitEntryLike[]) => void, error?: (e: unknown) => void) => void;
  };
}

interface DataTransferItemLike {
  kind: string;
  webkitGetAsEntry?: () => WebkitEntryLike | null;
  getAsFile?: () => File | null;
}

function entryFile(entry: WebkitEntryLike): Promise<File> {
  return new Promise((resolve, reject) => {
    if (!entry.file) return reject(new Error('entrada sem método file()'));
    entry.file(resolve, reject);
  });
}

/** readEntries do Chrome entrega lotes e exige repetição até vir vazio
 *  (comportamento documentado no MDN — o VS Code depende dele também). */
async function readAllEntries(reader: NonNullable<WebkitEntryLike['createReader']> extends infer _T
  ? ReturnType<NonNullable<WebkitEntryLike['createReader']>>
  : never): Promise<WebkitEntryLike[]> {
  const all: WebkitEntryLike[] = [];
  for (;;) {
    const batch = await new Promise<WebkitEntryLike[]>((resolve, reject) =>
      reader.readEntries(resolve, reject),
    );
    if (batch.length === 0) return all;
    all.push(...batch);
  }
}

async function walkEntry(entry: WebkitEntryLike, prefix: string, out: UploadFileRecord[]): Promise<void> {
  const path = prefix ? `${prefix}/${entry.name}` : entry.name;
  if (entry.isFile) {
    const file = await entryFile(entry);
    out.push({ relativePath: path, file });
    return;
  }
  if (entry.isDirectory && entry.createReader) {
    const children = await readAllEntries(entry.createReader());
    for (const child of children) {
      await walkEntry(child, path, out);
    }
  }
}

/** Port do main doUpload:/134 — percorre DataTransferItems coletando
 *  {relativePath, file} (pastas → recursão; arquivos → flat). */
export async function collectDroppedFiles(items: ArrayLike<unknown>): Promise<UploadFileRecord[]> {
  const out: UploadFileRecord[] = [];
  const arr = Array.from(items as unknown[]);
  const asEntry = (it: unknown): WebkitEntryLike | null => {
    const item = it as DataTransferItemLike;
    if (item?.kind === 'file' && typeof item.webkitGetAsEntry === 'function') {
      try {
        return item.webkitGetAsEntry();
      } catch {
        return null;
      }
    }
    return null;
  };

  let usedEntries = false;
  for (const raw of arr) {
    const entry = asEntry(raw);
    if (!entry) continue;
    usedEntries = true;
    await walkEntry(entry, '', out);
  }
  if (!usedEntries) {
    // fallback flat (itens File simples — ex.: DataTransfer sintético do E2E)
    for (const raw of arr) {
      const file = (raw as DataTransferItemLike)?.getAsFile?.() ?? null;
      if (file) out.push({ relativePath: file.name, file });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Upload propriamente (port do doUploadEntry :205 + buffered :315)
// ---------------------------------------------------------------------------

const dirCache = new Set<WorkspaceUri>();

async function ensureParentDirs(fs: FileSystemPortLike, fileUri: WorkspaceUri): Promise<void> {
  let dir = uriDirname(fileUri);
  const chain: WorkspaceUri[] = [];
  while (!dirCache.has(dir)) {
    chain.unshift(dir);
    const parent = uriDirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  for (const d of chain) {
    try {
      await fs.createFolder({ uri: d });
    } catch {
      // file_exists (já existe) é o caso normal de corrida — ignora
    }
    dirCache.add(d);
  }
}

/** Limpa o cache de pastas criadas (usado em testes). */
export function resetUploadDirCache(): void {
  dirCache.clear();
}

export async function uploadFiles(input: UploadFilesInput): Promise<UploadFilesResult> {
  const { fs, target, records, conflict, askConflict, onProgress, signal } = input;
  const base = input.baseUrl ?? '';
  const filesTotal = records.length;
  const bytesTotal = records.reduce((acc, r) => acc + r.file.size, 0);
  let filesDone = 0;
  let bytesDone = 0;
  let filesCreated = 0;
  const skipped: string[] = [];

  const throwIfAborted = () => {
    if (signal?.aborted) throw new DOMException('Upload cancelado', 'AbortError');
  };

  for (const rec of records) {
    throwIfAborted();
    const dest = uriJoinPath(target, ...rec.relativePath.split('/').filter(Boolean));
    onProgress?.({ filesDone, filesTotal, bytesDone, bytesTotal, currentName: rec.relativePath });

    // ---- colisão (A4.3: Replace/Skip/Cancel) ----
    let exists = false;
    try {
      await fs.stat({ uri: dest });
      exists = true;
    } catch {
      exists = false; // file_not_found → caminho livre
    }
    if (exists) {
      if (conflict === 'skip') {
        skipped.push(rec.relativePath);
        bytesDone += rec.file.size;
        filesDone++;
        continue;
      }
      if (conflict === 'ask') {
        const action = (await askConflict?.({ name: rec.relativePath, isFirst: filesDone === 0 })) ?? 'skip';
        if (action === 'cancel') throw new DOMException('Upload cancelado pelo usuário', 'AbortError');
        if (action === 'skip') {
          skipped.push(rec.relativePath);
          bytesDone += rec.file.size;
          filesDone++;
          continue;
        }
        // 'replace' → segue para sobrescrever
      }
    }

    throwIfAborted();
    await ensureParentDirs(fs, dest);
    const res = await fetch(`${base}/fs/upload`, {
      method: 'POST',
      headers: {
        'x-explorer-uri': dest,
        'Content-Type': 'application/octet-stream',
      },
      body: rec.file,
      signal,
    });
    if (!res.ok) {
      let message = res.statusText;
      try {
        message = ((await res.json()) as { message?: string }).message ?? message;
      } catch {
        /* mantém statusText */
      }
      throw new Error(`upload falhou para ${rec.relativePath}: ${message}`);
    }
    filesCreated++;
    filesDone++;
    bytesDone += rec.file.size;
    onProgress?.({ filesDone, filesTotal, bytesDone, bytesTotal, currentName: rec.relativePath });
  }

  return { filesCreated, skipped };
}

// Aviso de ferro-fundido para o TS: DOMException existe em Node 18+ e browsers.
void DOMException;
