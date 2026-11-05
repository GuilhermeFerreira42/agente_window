# 01I — Ordem de Implementação: Terminal

1. Confirmar `TerminalRuntimePort` e tipos de evento.
2. Implementar bridge PTY real no runtime.
3. Implementar `TerminalService` com lifecycle e isolamento por sessão.
4. Implementar grupos, split e foco integrados ao `WorkbenchLayoutService`.
5. Integrar xterm.js e resize.
6. Implementar ações `clear`, close, maximize e restore.
7. Implementar persistência de snapshot por sessão.
8. Rodar testes focados, probe e E2E do terminal.

## Arquivos-alvo típicos
- runtime PTY
- serviço de terminais
- store de sessão/layout
- painel/UI do terminal
- testes focados e E2E do terminal
