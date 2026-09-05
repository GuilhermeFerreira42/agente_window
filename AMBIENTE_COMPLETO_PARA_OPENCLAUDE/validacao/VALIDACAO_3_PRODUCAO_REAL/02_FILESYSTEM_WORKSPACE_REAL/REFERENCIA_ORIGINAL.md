# REFERENCIA ORIGINAL - FILESYSTEM & WORKSPACE

## Original: sessions/browser/sessionWorkspace.ts + sessionsSetUpService.ts + seu vídeo [06:13]

No seu vídeo original você mostra:
- [05:33] "Novo chat" -> consegue criar novo grupo
- [05:48] "Aqui eu consegui criar um novo grupo e quando eu abri o já tinha esse daqui, aí eu já consigo novo arquivo, nova pasta"
- [06:13] "sumiu aquele negócio aqui ah tá no novo grupo eu consigo adicionar as pastas que eu quero aí eu tá selecionado essa pasta né? Mas eu quero selecionar a pasta entrega por exemplo ó que maravilha teste ó que maravilha ou eu quero selecionar outra pasta qualquer do meu PC pasta download que maravilha. Consigo adicionar."

## Original: File System Access API (Electron no original, mas na web usamos File System Access API)

Original em Electron tem acesso real ao disco via Node fs. Na web replica, usamos File System Access API:

```ts
// Padrão web moderno - equivalente ao original Electron
export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  return await window.showDirectoryPicker({ mode: 'read' })
}

export async function readDirectoryRecursive(dirHandle, path='') {
  const entries = []
  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file') {
      entries.push({ name: entry.name, kind: 'file', handle: entry, path: `${path}/${entry.name}` })
    } else if (entry.kind === 'directory') {
      const subEntries = await readDirectoryRecursive(entry, `${path}/${entry.name}`)
      entries.push(...subEntries)
    }
  }
  return entries
}

export async function readFileContent(fileHandle): Promise<string> {
  const file = await fileHandle.getFile()
  return await file.text()
}
```

## Original: Workspace Files tree - estrutura real
Original mostra árvore com pastas do disco, não mock. Cada arquivo ao clicar abre conteúdo real no Monaco.
