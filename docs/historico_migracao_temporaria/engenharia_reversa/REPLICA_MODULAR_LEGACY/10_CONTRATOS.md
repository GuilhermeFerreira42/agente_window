# 10 — CONTRATOS — DOC-02

## FileSystemPort
interface FileSystemPort {
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string, options?: {atomic?: boolean}): Promise<void>
  readdir(path: string): Promise<FileEntry[]>
  mkdir(path: string): Promise<void>
  rename(oldPath: string, newPath: string): Promise<void>
  delete(path: string): Promise<void>
  exists(path: string): Promise<boolean>
  watch(path: string, cb: (event) => void): {dispose: ()=>void}
}
- Atomic: temp file + rename
- Queue per resource: fila por path
- Security: bloqueia ../, null byte

## ExplorerService
interface ExplorerService {
  getTree(root: string): TreeNode[]
  expand(nodeId: string): void
  collapse(nodeId: string): void
  reveal(path: string): void
  onDidChangeTree: Event
}

## EditorService
interface EditorService {
  openTab(path: string): void
  closeTab(id: string): void
  attachSideEditor(): void
}

## TerminalService
interface TerminalService {
  create(profile: ShellProfile): TerminalInstance
  split(id: string): void
  kill(id: string): void
  resize(id: string, cols: number, rows: number): void
}

## BrowserPort (futuro)
interface BrowserPort {
  navigate(url: string): Promise<void>
  getHTML(): Promise<string>
  evaluate(js: string): Promise<any>
  screenshot(): Promise<Buffer>
}
