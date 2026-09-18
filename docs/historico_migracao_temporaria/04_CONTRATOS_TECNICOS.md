# 04 — CONTRATOS TÉCNICOS — DOC-02

## FileSystemPort
- readFile(path): Promise<string>
- writeFile(path, content, atomic=true): temp + rename, fila por recurso
- readdir(path): FileEntry[]
- mkdir, rename, delete, exists, watch
- Segurança: bloqueia ../, null byte, separador Windows

## ExplorerService
- getTree(root): TreeNode[]
- expand/collapse, reveal, selection
- clipboard: copy, cut, paste
- eventos: onDidChangeTree, onDidChangeSelection

## EditorService
- openTab, closeTab, reveal
- attachSideEditor (anexo lateral futuro)
- tabs visíveis por sessão

## SearchService
- search(query): SearchResult[]

## BrowserPort
- navigate(url), goBack, goForward, reload
- screenshot, evaluate(js), getHTML() para IA
- viewport desktop/mobile

## TerminalService
- createTerminal(profile), split, kill, resize
- persist/restore por sessão
- data-attributes: data-pty-status, data-pty-pid, data-pty-shell-path
- classes: .terminal-container, .terminal-panes.is-split, .terminal-container-split

## Layout
- Tokens: --titlebar-height 35px, --statusbar-height 22px, --activitybar-width 48px
- .right-section {position:relative; flex:1; display:flex; flex-direction:column; overflow:hidden}
- .terminal-panel {flex: 0 0 var(--terminal-height)}
