# 01 — INVENTÁRIO VISUAL — LEGACY 02_replica_final

## Objetivo Fase 0
Medir completamente o `legacy/AMBIENTE_COMPLETO_PARA_OPENCLAUDE/02_replica_final/` para replicar idêntico.

## O que medir

### Tokens CSS (de styles/app.css)
- --titlebar-height: 35px
- --statusbar-height: 22px
- --activitybar-width: 48px
- --sidebar-width: medir
- --terminal-height: dinâmico
- --vscode-*: todos os tokens de cor

### Layout
- .workbench-main {flex:1, display:flex, overflow:hidden}
- .right-section {position:relative, flex:1, display:flex, flex-direction:column}
- ActivityBar: 48px, ícones, estados active
- SideBar: largura, header, actions
- EditorArea: tabs, breadcrumbs, content
- Panel: 5 abas (Problems, Output, Debug, Terminal, Ports), altura, sash 4px ns-resize, maximize
- StatusBar: 22px
- TitleBar: 35px

### Componentes
- App.tsx: estados, sessions, visibleSessionIds, sidebarVisible, auxiliaryVisible, terminalVisible
- SessionSidebar, ChatPanel, EditorArea, TerminalPanel, AuxiliaryBar, Titlebar
- Terminal: VSCodeTerminal.tsx 68KB, PlatformTerminalBridge, useTerminalTheme, terminal-vscode.css
- Explorer atual simples

### Comportamentos
- Resize sidebar e terminal via sash
- Maximize terminal (absolute inset 0, não fixed)
- Single terminal sem tabs list, multi com tabs list
- Drag&drop tabs terminal
- Tema claro/escuro reativo
- Preservação terminal ao fechar painel
- /api/ports dinâmico

## Entrega
Preencher este arquivo com medidas exatas após leitura do código legacy.

## Validação
Comparação 5173 vs 5174 lado a lado, sem diferença perceptível.
