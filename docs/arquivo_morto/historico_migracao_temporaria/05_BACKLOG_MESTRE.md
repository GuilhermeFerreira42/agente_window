# 05 — BACKLOG MESTRE — DOC-02

## Épico único: Réplica Modular Exata do 02_replica_final

### Fase 0 — Inventário Visual (obrigatório primeiro)
- [ ] Mapear todos os tokens CSS de 02_replica_final/src/styles/app.css
- [ ] Medir layout: ActivityBar 48px, TitleBar 35px, StatusBar 22px, Sidebar, Panel
- [ ] Listar componentes: Titlebar, ActivityBar, SessionSidebar, ExplorerView, EditorArea, TerminalPanel, AuxiliaryBar, StatusBar
- [ ] Listar comportamentos: resize, maximize, tabs, drag, command palette, tema
- [ ] Documentar em docs/engenharia_reversa/REPLICA_MODULAR_LEGACY/01_INVENTARIO_VISUAL.md

### Fase 1 — Esqueleto Modular V2
- [ ] Criar platform/apps/workbench-v2/ com mesma estrutura visual do legacy
- [ ] Portar App.tsx 95KB como shell modularizado mas visualmente idêntico
- [ ] Replicar TitleBar, ActivityBar, SideBar, EditorArea vazia, Panel vazio, StatusBar
- [ ] Rodar em 5174 lado a lado com legacy 5173

### Fase 2 — Terminal PTY Real como módulo
- [ ] Portar VSCodeTerminal.tsx 68KB + PlatformTerminalBridge 909B como módulo
- [ ] Portar useTerminalTheme + terminal-vscode.css
- [ ] Conectar com platform/services/pty-server/
- [ ] Validar 6 testes E2E sessao_11_terminal_pty_real

### Fase 3 — FileSystem e Explorer Esqueleto
- [ ] Implementar FileSystemPort com atomicidade temp+rename e fila por recurso (código já validado na FATIA-04 4.1 anterior: 68/68 testes)
- [ ] ExplorerView esqueleto modular que consome FileSystemPort
- [ ] Manter aparência idêntica ao Explorer do legacy

### Fase 4 — Validação Final Pixel-Perfect e Anti-Regressão
- [ ] Comparação visual 5173 vs 5174
- [ ] Checklist 14 itens docs/18
- [ ] tsc --noEmit 0 erros
- [ ] Testes unitários e E2E passando

Após esta DOC-02 pronta, inicia FATIA-04 novamente sobre a nova fundação validada.
