// ============================================================================
// modules/explorer-search/ui/transfer/saveBlob.ts — persistência de download
// NA CAMADA DE UI (DOM permitido aqui — core mantém-se puro, FT-07).
// File System Access API quando disponível (Picker real) + fallback
// blob+anchor (A4.7). Cancelamento do picker NÃO tenta fallback (AbortError).
// ============================================================================

interface FsAccessWritable {
  write(data: BlobPart): Promise<void>;
  close(): Promise<void>;
}
interface FsAccessFileHandle { createWritable(): Promise<FsAccessWritable> }

export async function saveBlob(data: Blob, suggestedName: string): Promise<void> {
  const w = globalThis as unknown as {
    showSaveFilePicker?: (o: { suggestedName: string }) => Promise<FsAccessFileHandle>;
  };
  if (typeof w.showSaveFilePicker === 'function') {
    try {
      const handle = await w.showSaveFilePicker({ suggestedName });
      const writable = await handle.createWritable();
      await writable.write(data);
      await writable.close();
      return;
    } catch (e) {
      // Usuário cancelou o picker → aborta silencioso (não cai para blob).
      if ((e as DOMException)?.name === 'AbortError') return;
      // outras falhas do FS Access → tenta fallback blob
    }
  }
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // revoga depois do click ser processado (chrome precisa de um tick)
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
