/**
 * File System Access API — Acesso real ao disco via navegador.
 *
 * Permite escolher uma pasta do computador, listar arquivos reais,
 * e ler conteúdo sem backend. Funciona em Chrome/Edge modernos.
 *
 * Referência: https://developer.chrome.com/articles/file-system-access/
 */

export interface FileSystemEntry {
  name: string
  kind: 'file' | 'directory'
  handle: FileSystemHandle
  path: string
  children?: FileSystemEntry[]
}

export interface FileSystemState {
  rootHandle: FileSystemDirectoryHandle | null
  rootName: string
  entries: FileSystemEntry[]
  loading: boolean
  error: string | null
}

/** Verifica se o navegador suporta File System Access API. */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

/** Abre diálogo para escolher pasta real do computador. */
export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) {
    console.warn('[FileSystem] File System Access API não suportada neste navegador')
    return null
  }

  try {
    const picker = (window as unknown as {
      showDirectoryPicker: (options?: { mode?: 'read' | 'readwrite'; startIn?: string }) => Promise<FileSystemDirectoryHandle>
    }).showDirectoryPicker
    const handle = await picker({
      mode: 'read',
      startIn: 'documents',
    })
    return handle as FileSystemDirectoryHandle
  } catch (error) {
    // Usuário cancelou o diálogo
    if ((error as Error).name === 'AbortError') {
      return null
    }
    console.error('[FileSystem] Erro ao escolher pasta:', error)
    return null
  }
}

/** Lê recursivamente os entries de um diretório. */
export async function readDirectoryEntries(
  dirHandle: FileSystemDirectoryHandle,
  parentPath: string = '',
  maxDepth: number = 3,
  currentDepth: number = 0,
): Promise<FileSystemEntry[]> {
  if (currentDepth >= maxDepth) return []

  const entries: FileSystemEntry[] = []

  try {
    const iterable = dirHandle as unknown as { values: () => AsyncIterable<FileSystemHandle & { kind: 'file' | 'directory' }> }
    for await (const entry of iterable.values()) {
      const path = parentPath ? `${parentPath}/${entry.name}` : entry.name
      const fsEntry: FileSystemEntry = {
        name: entry.name,
        kind: entry.kind,
        handle: entry,
        path,
      }

      if (entry.kind === 'directory' && currentDepth < maxDepth - 1) {
        fsEntry.children = await readDirectoryEntries(
          entry as FileSystemDirectoryHandle,
          path,
          maxDepth,
          currentDepth + 1,
        )
      }

      entries.push(fsEntry)
    }
  } catch (error) {
    console.error('[FileSystem] Erro ao ler diretório:', error)
  }

  // Ordenar: pastas primeiro, depois arquivos, ambos em ordem alfabética
  return entries.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

/** Lê o conteúdo de um arquivo como texto. */
export async function readFileContent(fileHandle: FileSystemFileHandle): Promise<string> {
  try {
    const file = await fileHandle.getFile()
    return await file.text()
  } catch (error) {
    console.error('[FileSystem] Erro ao ler arquivo:', error)
    throw error
  }
}

/** Verifica permissão de leitura para um handle. */
export async function verifyPermission(
  handle: FileSystemHandle,
  readWrite: boolean = false,
): Promise<boolean> {
  const options: { mode?: 'readwrite' } = {}
  if (readWrite) options.mode = 'readwrite'

  try {
    const h = handle as FileSystemHandle & {
      queryPermission?: (options: { mode?: 'readwrite' }) => Promise<PermissionState>
      requestPermission?: (options: { mode?: 'readwrite' }) => Promise<PermissionState>
    }
    // Verifica se já temos permissão
    if (typeof h.queryPermission === 'function' && (await h.queryPermission(options)) === 'granted') {
      return true
    }

    // Solicita permissão
    if (typeof h.requestPermission === 'function' && (await h.requestPermission(options)) === 'granted') {
      return true
    }

    return false
  } catch (error) {
    console.error('[FileSystem] Erro ao verificar permissão:', error)
    return false
  }
}

/** Serializa handle para salvar no IndexedDB (persistência entre reloads). */
export function serializeHandle(handle: FileSystemDirectoryHandle): FileSystemDirectoryHandle {
  // File System handles são serializáveis nativamente
  return handle
}

/** Restaura handle do IndexedDB. */
export function deserializeHandle(data: unknown): FileSystemDirectoryHandle | null {
  if (!data) return null
  return data as FileSystemDirectoryHandle
}

/** IndexedDB helpers para persistir o directory handle. */
const DB_NAME = 'agents-filesystem'
const STORE_NAME = 'handles'
const ROOT_KEY = 'rootDirectory'

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveRootHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(handle, ROOT_KEY)
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (error) {
    console.error('[FileSystem] Erro ao salvar handle:', error)
  }
}

export async function loadRootHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).get(ROOT_KEY)
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('[FileSystem] Erro ao carregar handle:', error)
    return null
  }
}

export async function clearRootHandle(): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(ROOT_KEY)
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (error) {
    console.error('[FileSystem] Erro ao limpar handle:', error)
  }
}

