# 17 — COMITÊ TERMINAL FIDELIDADE — DOC-02

Mantido da DOC anterior, com atualização:

Terminal estabilizado em `legacy/.../VSCodeTerminal.tsx` (68KB) com 5 bugs críticos corrigidos e 6 E2E passando deve ser portado como módulo para nova fundação, preservando:

- pendingOutputRef + fitAllInstancesRef + rAF
- display: contents/none no PlatformTerminalBridge
- MutationObserver em useTerminalTheme
- position: absolute inset 0 ancorado em .right-section para maximize
- data-pty-status/pid/shell-path e classes .terminal-container, .terminal-panes.is-split
- /api/ports dinâmico
- crypto.randomUUID() para IDs
- draggable tabs

Na nova fundação modular, terminal deve funcionar idêntico.
