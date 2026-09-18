/**
 * File System Access API — Acesso real ao disco via navegador.
 *
 * Permite escolher uma pasta do computador, listar arquivos reais,
 * e ler conteúdo sem backend. Funciona em Chrome/Edge modernos.
 *
 * Referência: https://developer.chrome.com/articles/file-system-access/
 */
export interface FileSystemEntry {
    name: string;
    kind: 'file' | 'directory';
    handle: FileSystemHandle;
    path: string;
    children?: FileSystemEntry[];
}
export interface FileSystemState {
    rootHandle: FileSystemDirectoryHandle | null;
    rootName: string;
    entries: FileSystemEntry[];
    loading: boolean;
    error: string | null;
}
/** Verifica se o navegador suporta File System Access API. */
export declare function isFileSystemAccessSupported(): boolean;
/** Abre diálogo para escolher pasta real do computador. */
export declare function pickDirectory(): Promise<FileSystemDirectoryHandle | null>;
/** Lê recursivamente os entries de um diretório. */
export declare function readDirectoryEntries(dirHandle: FileSystemDirectoryHandle, parentPath?: string, maxDepth?: number, currentDepth?: number): Promise<FileSystemEntry[]>;
/** Lê o conteúdo de um arquivo como texto. */
export declare function readFileContent(fileHandle: FileSystemFileHandle): Promise<string>;
/** Verifica permissão de leitura para um handle. */
export declare function verifyPermission(handle: FileSystemHandle, readWrite?: boolean): Promise<boolean>;
/** Serializa handle para salvar no IndexedDB (persistência entre reloads). */
export declare function serializeHandle(handle: FileSystemDirectoryHandle): FileSystemDirectoryHandle;
/** Restaura handle do IndexedDB. */
export declare function deserializeHandle(data: unknown): FileSystemDirectoryHandle | null;
export declare function saveRootHandle(handle: FileSystemDirectoryHandle): Promise<void>;
export declare function loadRootHandle(): Promise<FileSystemDirectoryHandle | null>;
export declare function clearRootHandle(): Promise<void>;
//# sourceMappingURL=fileSystem.d.ts.map