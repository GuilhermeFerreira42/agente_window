// ============================================================================
// modules/explorer-search/core/fs/browserFsPort.ts — FileSystemPort HTTP.
// Adapter browser (04_10 §2.1 mapeamento, 04_15 §4.3): fala com o Single Port
// (/fs/*) via fetch; binário com maxBytes; erros carregam `code` do servidor.
// Sem imports externos (core puro — FT-07): usa globals web (fetch).
// ============================================================================
import type { FileSystemPortLike, WorkspaceUri } from '../../contract';
import type { ExplorerFsWatchClient } from '../watchClient';

export interface BrowserFsPortOptions {
  /** Base URL do Single Port (default: mesma origem do app). */
  baseUrl?: string;
  /** Cliente de watch (injetável para testes e no wiring 4.4). */
  watchClient: ExplorerFsWatchClient;
}

/** Erro de I/O espelhado do servidor (`code` preserva a semântica). */
export class BrowserFsError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'BrowserFsError';
  }
}

export class BrowserFsPort implements FileSystemPortLike {
  private readonly base: string;
  private readonly watchClient: ExplorerFsWatchClient;

  constructor(options: BrowserFsPortOptions) {
    this.base = options.baseUrl ?? '';
    this.watchClient = options.watchClient;
  }

  private async json<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.base}${path}`, init);
    if (!res.ok) {
      let code = 'io';
      let message = res.statusText;
      try {
        const data = (await res.json()) as { code?: string; message?: string };
        code = data.code ?? code;
        message = data.message ?? message;
      } catch {
        /* corpo não-JSON — segue com status */
      }
      throw new BrowserFsError(code, message, res.status);
    }
    // Corpo vazio é VÁLIDO fora de GET (201/204 do server: createFile/mkdir/write).
    // Ler como texto e só parsear quando não-vazio — /fs/upload 201 TEM corpo
    // ({uri}) e os GETs sempre têm JSON. (BUG 4.4-E2E: res.json() em corpo vazio
    // quebrava o commit inline após o create ter SUCESSO no disco.)
    const text = await res.text();
    return (text.length > 0 ? JSON.parse(text) : undefined) as T;
  }

  /** Descoberta da raiz configurada no servidor (Q9: boot sem picker).
   *  Conveniência do ADAPTER — não faz parte da FileSystemPortLike congelada. */
  async discoverRoot(): Promise<WorkspaceUri> {
    const data = await this.json<{ root: WorkspaceUri }>('/fs/root');
    return data.root;
  }

  private post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    return this.json<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  // ---- a porta congelada ----
  list(input: { uri: WorkspaceUri }) {
    return this.json<{ entries: Array<{ uri: WorkspaceUri; name: string; kind: 'file' | 'directory' }> }>(
      `/fs/list?uri=${encodeURIComponent(input.uri)}`,
    ).then((r) => r.entries);
  }

  stat(input: { uri: WorkspaceUri }) {
    return this.post<{ uri: WorkspaceUri; size: number; mtimeMs: number; readonly: boolean; kind: 'file' | 'directory' }>(
      '/fs/stat',
      { uri: input.uri },
    );
  }

  readFile(input: { uri: WorkspaceUri }) {
    return this.json<{ content: string; encoding: 'utf-8' }>(
      `/fs/read?uri=${encodeURIComponent(input.uri)}`,
    );
  }

  readFileBinary(input: { uri: WorkspaceUri; maxBytes?: number }) {
    const max = input.maxBytes != null ? `&maxBytes=${input.maxBytes}` : '';
    return this.json<{ dataBase64: string; mime: string }>(
      `/fs/read?binary=1${max}&uri=${encodeURIComponent(input.uri)}`,
    );
  }

  writeFile(input: { uri: WorkspaceUri; content: string; atomic: true }): Promise<void> {
    return this.post('/fs/write', { uri: input.uri, content: input.content });
  }

  createFile(input: { uri: WorkspaceUri; content?: string }): Promise<void> {
    return this.post('/fs/createFile', { uri: input.uri, content: input.content });
  }

  createFolder(input: { uri: WorkspaceUri }): Promise<void> {
    return this.post('/fs/mkdir', { uri: input.uri });
  }

  copy(input: { from: WorkspaceUri; to: WorkspaceUri }): Promise<void> {
    return this.post('/fs/copy', { from: input.from, to: input.to });
  }

  move(input: { from: WorkspaceUri; to: WorkspaceUri }): Promise<void> {
    return this.post('/fs/rename', { from: input.from, to: input.to });
  }

  remove(input: { uri: WorkspaceUri; recursive?: boolean }): Promise<void> {
    return this.post('/fs/delete', { uri: input.uri, recursive: input.recursive === true });
  }

  watch(input: { uri: WorkspaceUri }): Promise<{ watcherId: string }> {
    // watchClient é ciclo de vida do próprio porto (criado no wiring, 4.4).
    return Promise.resolve({ watcherId: this.watchClient.watch(input.uri) });
  }

  onEvent(
    cb: (e: {
      type: 'fs.changed';
      changes: Array<{ uri: WorkspaceUri; kind: 'added' | 'removed' | 'changed' }>;
    }) => void,
  ): () => void {
    return this.watchClient.onEvent(cb);
  }

  dispose(): void {
    void this;
  }
}
