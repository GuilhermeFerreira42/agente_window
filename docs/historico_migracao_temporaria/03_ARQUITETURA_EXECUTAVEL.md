# 03 — ARQUITETURA EXECUTÁVEL — DOC-02

## Visão
Arquitetura alvo: **Monolito Modular** com contratos.
Nova fundação replica visualmente o `legacy/AMBIENTE_COMPLETO_PARA_OPENCLAUDE/02_replica_final/`, mas internamente é modular.

## Camadas

### Camada 1 — Contracts (platform/packages/contracts/)
- FileSystemPort: read, write atomic (temp+rename), readdir, mkdir, rename, delete, watch
- ExplorerService: tree, expand/collapse, selection, clipboard
- EditorService: tabs, open, close, attach side editor
- SearchService: ripgrep search
- BrowserPort: navigate, screenshot, evaluate, getHTML para IA
- TerminalService: create, split, kill, resize, persist

### Camada 2 — Services (platform/services/)
- pty-server: node-pty, WebSocket /pty, /api/ports dinâmico
- browser-runtime: Chromium + Playwright CDP, screencast
- model-provider: IA backend separado

### Camada 3 — Agent Runtime (platform/packages/agent-runtime/)
- Implementações dos contratos
- Cada runtime recebe porta (FileHost) e não importa UI

### Camada 4 — Workbench V2 (platform/apps/workbench-v2/)
- UI que replica exatamente o 02_replica_final
- Componentes: Titlebar, ActivityBar, SideBar, ExplorerView, EditorArea, TerminalPanel, StatusBar
- Cada componente só importa seu serviço via contrato
- Proibido: import direto de interno de outro módulo

### Comunicação
- Eventos: fs.changed, explorer.selectionChanged
- Comandos: command.execute
- Estado: observableValue / transaction

## Regra de isolamento
Um módulo nunca importa arquivo interno de outro. Só via contrato público ou evento.

## Tokens
Todo CSS usa var(--vscode-*) , --terminal-height. Zero hardcoded.
