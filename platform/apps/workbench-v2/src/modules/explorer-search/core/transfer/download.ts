// ============================================================================
// modules/explorer-search/core/transfer/download.ts — Baixar arquivo/pasta.
// Base upstream (7debcd0e): DOWNLOAD_COMMAND_ID (contrib/files/browser/
// fileActions.ts:74) + BrowserFileDownload — no browser: fetch do endpoint
// streaming do Single Port (4.3) + File System Access API quando disponível,
// com fallback blob+anchor (A4.7).
//   Arquivo → GET /fs/download (stream) → salva 1:1 (A4.5 hash-preserving).
//   Pasta   → walk recursivo → ZIP client-side (STORED, sem compressão),
//             preservando estrutura relativa (A4.6); cancelável (AbortSignal).
// ============================================================================

import type { FileSystemPortLike, WorkspaceUri } from '../../contract';
import { uriBasename, uriJoinPath, uriRelative } from '../uri';

export interface DownloadProgress {
  filesDone: number;
  filesTotal: number;
  currentName: string;
}

async function fetchFileBlob(uri: WorkspaceUri, base: string, signal?: AbortSignal): Promise<Blob> {
  const res = await fetch(`${base}/fs/download?uri=${encodeURIComponent(uri)}`, { signal });
  if (!res.ok) {
    let message = res.statusText;
    try {
      message = ((await res.json()) as { message?: string }).message ?? message;
    } catch {
      /* mantém statusText */
    }
    throw new Error(`download falhou para ${uri}: ${message}`);
  }
  return res.blob();
}

export interface DownloadFilesInput {
  fs: FileSystemPortLike;
  uris: WorkspaceUri[];
  baseUrl?: string;
  /** Persistência do arquivo baixado — DOM fica na UI (ui/transfer/saveBlob). */
  save: (data: Blob, suggestedName: string) => Promise<void>;
  onProgress?: (p: DownloadProgress) => void;
  signal?: AbortSignal;
}

export async function downloadFiles(input: DownloadFilesInput): Promise<void> {
  const { fs, uris, save, onProgress, signal } = input;
  const base = input.baseUrl ?? '';
  for (const target of uris) {
    if (signal?.aborted) throw new DOMException('Download cancelado', 'AbortError');
    const st = await fs.stat({ uri: target });
    if (st.kind === 'file') {
      const blob = await fetchFileBlob(target, base, signal);
      await save(blob, uriBasename(target));
      continue;
    }
    // ---- pasta: walk + zip STORED client-side (A4.6) ----
    const entries: Array<{ path: string; blob: Blob }> = [];
    const files: WorkspaceUri[] = [];
    const walk = async (dir: WorkspaceUri): Promise<void> => {
      const list = await fs.list({ uri: dir });
      for (const entry of list) {
        if (signal?.aborted) throw new DOMException('Download cancelado', 'AbortError');
        if (entry.kind === 'directory') await walk(entry.uri);
        else files.push(entry.uri);
      }
    };
    await walk(target);
    let filesDone = 0;
    for (const fileUri of files) {
      onProgress?.({ filesDone, filesTotal: files.length, currentName: uriRelative(target, fileUri) ?? fileUri });
      const blob = await fetchFileBlob(fileUri, base, signal);
      const rel = uriRelative(target, fileUri);
      entries.push({ path: rel ?? uriBasename(fileUri), blob });
      filesDone++;
    }
    const zip = await buildZipStoreAsync(entries);
    await save(zip, `${uriBasename(target)}.zip`);
  }
}

// ---------------------------------------------------------------------------
// ZIP client-side (STORED): CRC32 + local headers + central directory + EOCD
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(v: number): Uint8Array {
  const b = new Uint8Array(2);
  b[0] = v & 0xff;
  b[1] = (v >>> 8) & 0xff;
  return b;
}
function u32(v: number): Uint8Array {
  const b = new Uint8Array(4);
  b[0] = v & 0xff;
  b[1] = (v >>> 8) & 0xff;
  b[2] = (v >>> 16) & 0xff;
  b[3] = (v >>> 24) & 0xff;
  return b;
}
const ENC = new TextEncoder();

/** Monta um ZIP STORED (sem compressão — estrutura intacta, abre no SO). */
export async function buildZipStoreAsync(
  entries: Array<{ path: string; blob: Blob }>,
): Promise<Blob> {
  const parts: BlobPart[] = [];
  const central: BlobPart[] = [];
  let offset = 0;
  const pushLocal = (bytes: BlobPart[]): number => {
    let size = 0;
    for (const p of bytes) {
      size += p instanceof Uint8Array ? p.byteLength : (p as ArrayBuffer).byteLength ?? 0;
    }
    parts.push(...bytes);
    offset += size;
    return offset - size;
  };

  const dosTime = (d: Date): { time: number; date: number } => ({
    time: ((d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2)) & 0xffff,
    date: (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff,
  });

  // TS 5.7+: Uint8Array<ArrayBufferLike> não bate com BlobPart — montamos
  // como unknown[] e fazemos um único cast estrutural na construção do Blob.
  const recordOffsets: Array<{ rec: unknown[]; offset: number }> = [];

  for (const entry of entries) {
    const nameBytes = ENC.encode(entry.path);
    const data = new Uint8Array(await entry.blob.arrayBuffer());
    const crc = crc32(data);
    const { time, date } = dosTime(new Date());
    const localHeader: unknown[] = [
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(time), u16(date),
      u32(crc), u32(data.byteLength), u32(data.byteLength),
      u16(nameBytes.byteLength), u16(0), nameBytes,
    ];
    const localOffset = pushLocal(localHeader as BlobPart[]);
    parts.push(data);
    offset += data.byteLength;

    const centralRec: unknown[] = [
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(time), u16(date),
      u32(crc), u32(data.byteLength), u32(data.byteLength),
      u16(nameBytes.byteLength), u16(0), u16(0), u16(0), u16(0),
      u32(0), u32(localOffset), nameBytes,
    ];
    recordOffsets.push({ rec: centralRec as unknown[], offset: localOffset });
  }

  const centralStart = offset;
  for (const { rec } of recordOffsets) {
    for (const p of rec) {
      central.push(p as BlobPart);
      offset += (p as Uint8Array).byteLength ?? 0;
    }
  }
  const centralSize = offset - centralStart;

  const eocd: unknown[] = [
    u32(0x06054b50), u16(0), u16(0),
    u16(entries.length), u16(entries.length),
    u32(centralSize), u32(centralStart), u16(0),
  ];

  return new Blob([...parts, ...central, ...eocd] as BlobPart[], { type: 'application/zip' });
}
