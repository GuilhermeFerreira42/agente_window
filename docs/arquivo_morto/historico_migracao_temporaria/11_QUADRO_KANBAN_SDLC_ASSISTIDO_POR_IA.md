# 11 — QUADRO KANBAN — DOC-02

## Fluxo SDLC

| Fase | Nome | Entrada | Saída | Status |
|---|---|---|---|---|
| 0 | Inventário Visual | legacy/02_replica_final | 01_INVENTARIO_VISUAL.md | Planejado |
| 1 | Esqueleto Modular V2 | Inventário | workbench-v2 rodando 5174 idêntico | Planejado |
| 2 | Terminal como Módulo | Esqueleto | Terminal PTY real portado, 6 E2E passando | Planejado |
| 3 | FileSystem + Explorer Esqueleto | Terminal | FileSystem atomic + Explorer modular | Planejado |
| 4 | Validação Final | Tudo | Pixel-perfect + anti-regressão + homologação | Planejado |

## Detalhamento Fase 0 — Inventário
- Medir App.tsx, app.css, components/*, domain/*
- Documentar tokens, medidas, comportamentos
- Entregar em docs/engenharia_reversa/REPLICA_MODULAR_LEGACY/01_INVENTARIO_VISUAL.md

## Detalhamento Fase 1 — Esqueleto
- Criar platform/apps/workbench-v2/src/ com mesma divisão visual do legacy
- TitleBar 35px, ActivityBar 48px, StatusBar 22px, SideBar, EditorArea, Panel
- Shell App.tsx modularizado mas visualmente idêntico
- Rodar em 5174

## Detalhamento Fase 2 — Terminal
- Portar VSCodeTerminal.tsx 68KB + PlatformTerminalBridge + useTerminalTheme + terminal-vscode.css
- Preservar pendingOutputRef, fitAllInstancesRef, display contents/none, MutationObserver
- Conectar com pty-server existente
- Validar 6 E2E

## Detalhamento Fase 3 — FileSystem
- Implementar FileSystemPort com temp+rename e fila por recurso (código já validado 68/68 testes)
- ExplorerView esqueleto modular

## Detalhamento Fase 4 — Validação
- Comparação 5173 vs 5174
- 14 itens docs/18
- typecheck 0 erros
- Atualizar 12_DOCUMENTACAO_VIVA

## Próxima após DOC-02
- FATIA-04 completa (Explorer completo + Editor em anexo + Browser com IA) sobre a nova fundação
