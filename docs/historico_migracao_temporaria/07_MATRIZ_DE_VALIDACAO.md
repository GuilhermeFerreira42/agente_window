# 07 — MATRIZ DE VALIDAÇÃO — DOC-02

## Validações obrigatórias

### Inventário
- [ ] Tokens mapeados (titlebar, statusbar, activitybar, sidebar, terminal)
- [ ] Componentes listados com arquivo:linha do legacy

### Esqueleto
- [ ] platform/apps/workbench-v2/ roda em 5174
- [ ] Layout idêntico ao legacy em 5173 (sem diferença visual)
- [ ] tsc --noEmit 0 erros

### Terminal
- [ ] VSCodeTerminal portado, 68KB, com pendingOutputRef + fitAllInstancesRef + rAF
- [ ] PlatformTerminalBridge com display contents/none
- [ ] useTerminalTheme com MutationObserver
- [ ] 6 testes E2E sessao_11_terminal_pty_real passando

### FileSystem
- [ ] Atomicidade temp+rename
- [ ] Fila por recurso (sem corrida)
- [ ] Segurança ../ bloqueado
- [ ] 68/68 testes platform passando

### Anti-Regressão
- [ ] 14 itens docs/18 validados manualmente
- [ ] Resize terminal injeta --terminal-height
- [ ] Maximize absolute inset 0 ancorado em .right-section
- [ ] Single terminal sem sidebar, multi com sidebar
- [ ] data-pty-* atributos presentes

### Final
- [ ] Comparação pixel-perfect aprovada
- [ ] Documentação viva atualizada
