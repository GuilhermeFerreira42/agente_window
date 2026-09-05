# TAREFA PARA ARENA - FILESYSTEM REAL

## Objetivo: Jogar fora mock e conectar ao disco real via File System Access API

### Passo 1 - Criar File System service novo
Criar arquivo `src/domain/fileSystem.ts`:

```ts
export interface FileSystemEntry {
  name: string;
  kind: 'file' | 'directory';
  handle: FileSystemHandle;
  path: string;
  children?: FileSystemEntry[];
}

export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  // @ts-ignore - File System Access API
  return await window.showDirectoryPicker({ mode: 'read' })
}

export async function readDirectoryRecursive(
  dirHandle: FileSystemDirectoryHandle,
  basePath = ''
): Promise<FileSystemEntry[]> {
  const entries: FileSystemEntry[] = []
  // @ts-ignore
  for await (const entry of dirHandle.values()) {
    const path = `${basePath}/${entry.name}`.replace('//', '/')
    if (entry.kind === 'file') {
      entries.push({ name: entry.name, kind: 'file', handle: entry, path })
    } else {
      const children = await readDirectoryRecursive(entry as FileSystemDirectoryHandle, path)
      entries.push({ name: entry.name, kind: 'directory', handle: entry, path, children })
    }
  }
  return entries
}

export async function readFileContent(fileHandle: FileSystemFileHandle): Promise<string> {
  const file = await fileHandle.getFile()
  return await file.text()
}

export async function saveDirectoryHandle(handle: FileSystemDirectoryHandle) {
  // Salvar em IndexedDB para persistir entre reloads
  const db = await openDB()
  await db.put('handles', handle, 'workspace')
}

function openDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open('agents-window', 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore('handles')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
```

### Passo 2 - Conectar SessionLanding chip
Arquivo: `src/components/SessionLanding.tsx`

**ANTES:**
```tsx
<span className="session-landing-chip"><FolderGit2 />{workspace}</span>
```

**DEPOIS:**
```tsx
interface SessionLandingProps {
  workspace: string
  onSubmit: (text: string) => void
  onPickWorkspace?: () => Promise<void> // NOVO
}

<button 
  className="session-landing-chip" 
  onClick={onPickWorkspace}
  title="Escolher pasta real"
>
  <FolderGit2 size={14} />{workspace}<ChevronDown size={13} />
</button>
```

Em App.tsx:
```ts
const handlePickWorkspace = async () => {
  try {
    const dirHandle = await pickDirectory()
    const entries = await readDirectoryRecursive(dirHandle)
    setFileSystemEntries(entries)
    setWorkspacePath(dirHandle.name)
    await saveDirectoryHandle(dirHandle)
  } catch (e) {
    console.error('User cancelled picker', e)
  }
}
```

### Passo 3 - Workspace Files real
Arquivo: `src/components/AuxiliaryBar.tsx`

**ANTES:** const folders = [...] hardcoded

**DEPOIS:**
```tsx
interface AuxiliaryBarProps {
  fileSystemEntries: FileSystemEntry[] // NOVO - real
  // ...
}

function FilesDetails({ fileSystemEntries, expandedFolders, onToggleFolder, onOpenFile }) {
  // Renderizar árvore recursiva real
  const renderEntry = (entry: FileSystemEntry, depth = 0) => {
    if (entry.kind === 'directory') {
      return (
        <div key={entry.path} style={{ paddingLeft: depth * 12 }}>
          <button onClick={() => onToggleFolder(entry.path)}>
            {expandedFolders[entry.path] ? '▼' : '▶'} {entry.name}
          </button>
          {expandedFolders[entry.path] && entry.children?.map(child => renderEntry(child, depth + 1))}
        </div>
      )
    }
    return (
      <button key={entry.path} onClick={() => onOpenFile(entry.path, entry.handle)} style={{ paddingLeft: depth * 12 + 16 }}>
        {entry.name}
      </button>
    )
  }
  return <>{fileSystemEntries.map(e => renderEntry(e))}</>
}
```

### Passo 4 - Abrir arquivo real no Monaco
Em App.tsx onOpenFile:
```ts
const handleOpenFile = async (path: string, handle?: FileSystemFileHandle) => {
  if (!handle) return
  const content = await readFileContent(handle)
  const tab: EditorTab = {
    id: `file-${Date.now()}`,
    type: 'file',
    title: path.split('/').pop() || path,
    path,
    sessionId: activeSessionId,
    content // NOVO - conteúdo real
  }
  setEditorTabs(prev => [...prev, tab])
  setActiveTabId(tab.id)
}
```

Em EditorArea.tsx, Monaco recebe content real:
```tsx
<Editor value={activeTab.content} ... />
```

### Critério de aceite E2E:
1. Clicar chip workspace-local -> showDirectoryPicker é chamado, abre diálogo Windows
2. Mockar pasta com 3 arquivos: a.txt, b.ts, c.md -> AuxiliaryBar lista 3 arquivos reais (não browser/contrib/workbench)
3. Clicar em b.ts -> EditorArea abre tab com conteúdo "conteúdo real de b.ts" (não const a=1)
4. Reload -> pasta ainda selecionada (handle salvo em IndexedDB)
5. Screenshot: Workspace Files com arquivos reais do disco

### Arquivos afetados:
- Novo: src/domain/fileSystem.ts
- src/components/SessionLanding.tsx (chip clicável)
- src/components/AuxiliaryBar.tsx (remover hardcoded, usar fileSystemEntries)
- src/App.tsx (pickDirectory, readFileContent, save handle)
- src/components/EditorArea.tsx (Monaco com content real)
- src/data.ts (remover buildProjectDiffFiles mock)
