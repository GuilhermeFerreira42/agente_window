# 18 — PROTOCOLO ANTI-REGRESSÃO — DOC-02

## Objetivo
Blindar o que já foi conquistado e garantir que nova fundação replica exatamente o legacy.

## Componentes blindados (referência legacy, devem ser replicados idênticos)

| Componente | Localização Referência | Proteção | Estado |
|---|---|---|---|
| Terminal PTY Real | legacy/.../VSCodeTerminal.tsx | BLINDADO | 90% fidelidade, WS real, buffer pendingOutputRef |
| Ponte Persistência | legacy/.../PlatformTerminalBridge.tsx | BLINDADO | display contents/none |
| Tema Dinâmico | legacy/.../useTerminalTheme.ts | BLINDADO | MutationObserver |
| Estilos Terminal | legacy/.../terminal-vscode.css | BLINDADO | vars --terminal-height |
| Painel 5 abas | legacy/.../VSCodeTerminal.tsx | BLINDADO | Problems, Output, Debug, Terminal, Ports |
| Bridge PTY Vite | legacy/.../vite-plugin-pty.ts + platform/services/pty-server | BLINDADO | /api/ports dinâmico |
| Layout Base | legacy/.../styles/app.css, App.tsx | PROTEGIDO | .right-section relative, tokens 35px,22px,48px |

## Contratos invioláveis
Regras 1 a 14 do terminal (altura via --terminal-height, sidebar auto-hide, preservação PTY, fidelidade tabs, 5 abas, maximize absolute, anti-tela-branca, sash via getBoundingClientRect, tema dinâmico, display contents/none, crypto.randomUUID, /api/ports, drag&drop, data-pty-*)

## Checklist homologação nova fundação (DOC-02)
1. Resize terminal injeta --terminal-height
2. Maximize absolute inset 0 ancorado em .right-section, ActivityBar visível
3. Single terminal sem sidebar, multi com sidebar
4. Anti-tela-branca: + 3x rápido sem branco
5. Tema reativo claro/escuro
6. Preservação background via display contents/none
7. Portas dinâmicas /api/ports
8. Drag&drop tabs
9. data-pty-* atributos presentes
10. Visual idêntico legacy 5173 vs nova 5174
11. tsc 0 erros
12. Testes 68/68 + 6 E2E

Qualquer violação é regressão e deve ser corrigida antes de homologar.
