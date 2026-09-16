# 01 — FONTE DA VERDADE — DOC-02

## O que é o AGENTE WINDOW
Ambiente de desenvolvimento com layout inspirado no VS Code: ActivityBar, SideBar, Editor Area, Panel (Terminal, Problems, Output, Debug, Ports), StatusBar, TitleBar, Chat.

## Fonte visual absoluta — DOC-02
A partir deste DOC-02, a única referência visual e de layout é:
`legacy/AMBIENTE_COMPLETO_PARA_OPENCLAUDE/02_replica_final/src/`
- App.tsx (95KB)
- components/
- domain/
- styles/app.css

Qualquer implementação modular deve replicar este layout pixel a pixel.

A referência anterior baseada em vídeo de 8m35s (Google Antigravity) e a implementação atual em `platform/apps/workbench/` que dela derivou são descontinuadas e não devem ser usadas como referência visual.

## Fonte arquitetural
Arquitetura alvo modular com contratos:
- `platform/packages/contracts/` — contratos (FileSystemPort, ExplorerService, EditorService, SearchService, BrowserPort, TerminalService)
- `platform/packages/shared/` — utilitários
- `platform/services/` — serviços operacionais (pty-server, browser-runtime, model-provider)
- `platform/apps/workbench-v2/` — nova fundação modular que replica visualmente o 02_replica_final

O `legacy/02_replica_final` permanece como legado de referência, somente leitura durante a construção da nova fundação.

## Decisão normativa DOC-02
Objetivo único: construir nova fundação modular visualmente idêntica ao 02_replica_final, mas com arquitetura modular testável.
Quando pronta e validada, esta nova fundação substituirá tanto o legacy quanto o platform atual, tornando-se base para FATIA-04 em diante.
O terminal estabilizado em `legacy/.../VSCodeTerminal.tsx` e `PlatformTerminalBridge.tsx` deve ser portado como módulo, preservando os 14 contratos do docs/18.
