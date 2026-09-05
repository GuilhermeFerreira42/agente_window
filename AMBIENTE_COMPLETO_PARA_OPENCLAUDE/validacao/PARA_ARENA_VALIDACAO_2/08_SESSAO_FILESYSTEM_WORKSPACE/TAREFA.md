# TAREFA - FILESYSTEM REAL - MOTOR REAL

### Objetivo: Jogar fora mock e conectar ao disco real via File System Access API

### Passo 1 - Implementar File System Access API
Criar novo arquivo `domain/fileSystem.ts`:
```ts
export interface FileSystemEntry { name: string, kind: 'file'|'directory', handle: FileSystemHandle, path: string }

export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  return await window.showDirectoryPicker()
}

export async function readDirectoryRecursive(dirHandle: FileSystemDirectoryHandle, path=''): Promise<FileSystemEntry[]> {
  // for await (const entry of dirHandle.values()) ...
}

export async function readFileContent(fileHandle: FileSystemFileHandle): Promise<string> {
  const file = await fileHandle.getFile()
  return await file.text()
}
```

### Passo 2 - Conectar SessionLanding chip
Arquivo: SessionLanding.tsx
- Chip "workspace-local" onClick => chamar pickDirectory()
- Ao escolher pasta, chamar onSubmit com workspace path real
- Salvar handle no estado para listar arquivos

### Passo 3 - Workspace Files real
Arquivo: AuxiliaryBar.tsx
- Hoje mostra tree mockada de browser/contrib/workbench
- Correto: receber fileSystemEntries reais via props
- Renderizar árvore recursiva com expand/collapse por sessão (expandedFoldersBySession já existe)
- Ao clicar arquivo, chamar onOpenFile(path) que lê conteúdo real e abre no editor

### Passo 4 - Remover mock de diffFiles
- buildProjectDiffFiles deve receber fileHandle real e gerar diff com conteúdo real, não const a=1
- Ou, para MVP produção, desabilitar Changes view até ter diff real, mas Files deve ser real

### Passo 5 - Permissões
- Lidar com Permissions API, pedir permissão de leitura
- Salvar directoryHandle em IndexedDB para persistir entre reloads (File System Access API permite)

### Critério:
- Clicar em "Nova sessão em workspace-local" abre diálogo real do Windows para escolher pasta
- Escolher pasta com 10 arquivos -> Workspace Files lista 10 arquivos reais
- Clicar em arquivo -> Monaco mostra conteúdo real do disco
- F5 -> pasta continua selecionada (handle salvo)
