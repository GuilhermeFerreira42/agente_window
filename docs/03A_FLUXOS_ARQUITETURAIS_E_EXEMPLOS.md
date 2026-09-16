# 03A — FLUXOS ARQUITETURAIS — DOC-02

## Fluxo 1 — Abrir arquivo
ExplorerView -> ExplorerService.openFile -> FileSystemPort.readFile -> EditorService.openTab -> EditorArea render

## Fluxo 2 — Terminal PTY
TerminalPanel -> TerminalService.create -> pty-server /pty WS -> pendingOutputRef buffer até xterm montar -> flush -> fitAllInstancesRef rAF

## Fluxo 3 — Resize Terminal
Sash drag -> getBoundingClientRect() do .right-section -> ratio clamp 0.15-0.85 -> injeta --terminal-height inline

## Fluxo 4 — Maximizar Terminal
Botão maximize -> position absolute inset 0 zIndex 100 ancorado em .right-section relative -> não cobre ActivityBar

## Fluxo 5 — Preservação
PlatformTerminalBridge -> display contents/none -> WS não desconecta ao fechar painel

## Fluxo 6 — Tema dinâmico
useTerminalTheme -> MutationObserver em documentElement -> buildTheme() lendo var(--vscode-terminal-*) -> term.options.theme

## Fluxo 7 — Browser interno (futuro FATIA-04)
Editor tab browser -> BrowserService.navigate -> browser-runtime Chromium -> CDP screencast -> imagem frontend + getHTML para IA
