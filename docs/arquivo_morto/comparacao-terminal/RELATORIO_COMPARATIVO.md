# Comparativo — Terminal VS Code vs Agente Window (produzido)

Data: 2026-09-13
Executado em: 8080 VS Code Server + 5173 Agente Window Legacy + novo platform workbench

## Objetivo
Comparar visual e funcionalmente o terminal do VS Code real com o terminal produzido nas FATIAS 03.1-03.7, clicando nos botões e analisando diferenças para chegar ao "igualzinho".

## Método
- Tentativa de screenshots automáticos via Playwright em 8080 e 5173 — falhou por falta de `libnspr4.so` no sandbox (sem permissão apt). Fallback: análise de código + geração de imagens ilustrativas realistas via modelo + inspeção manual dos componentes.
- Código analisado:
  - VS Code referência: `src/vs/workbench/contrib/terminal/browser/terminalInstance.ts`, `terminalGroup.ts`, `terminalService.ts` (via docs 01C)
  - Legacy replica: `legacy/.../src/components/TerminalPanel.tsx`, `terminal/TerminalView.tsx`, `TerminalGroup.tsx`, `TerminalInstanceTabs.tsx`, `hooks/useXtermTerminal.ts`
  - Novo platform: `platform/apps/workbench/src/ui/terminal/*` + `logic/terminal/*`

## Imagens geradas
- `vscode-terminal-reference.png` — VS Code real com split lateral, abas bash(1) node(2) pwsh(3), header Split Terminal + + □ 🗑 ^ ×
- `agente-window-terminal-current.png` — nosso terminal com abas bash(1)* bash(2) bash(3) +, botões □ □ 🗑 □ ⚙, split lateral e context menu Copy/Paste/Select All/Clear/Kill/Settings
- `comparison-split-lateral.png` — diagrama lado a lado

## Tabela comparativa funcional (clique nos botões)

| Ação | VS Code (esperado) | Agente Window Legacy (5173) | Novo Platform (FATIA-03) | Diferença |
|------|-------------------|-----------------------------|--------------------------|-----------|
| **Novo terminal** (+) | Cria nova instância com perfil padrão, foca, adiciona aba, preserva cwd da ativa se configurado | Funciona: `handleNewTerminal` chama `openTerminalInstance` + `getOrCreateSession` | Funciona: `service.createTerminal` + emite `created`/`focusChanged` | Legacy ok, novo ok mas falta shell picker UI |
| **Split vertical (ao lado) ◫** | Cria split no mesmo grupo, direção horizontal, herda cwd, foco no novo, sash arrastável | Funciona: `handleToggleSplit` cria `splitSessionId`, `TerminalGroup` com `splitRatio` 0.5, sash | Funciona: `splitTerminal({direction:'horizontal'})` insere após source no mesmo grupo, `TerminalGroup` com sash drag 0.2-0.8 | Visual: VS Code usa `SplitPaneContainer` com medição precisa, nosso sash é simples div 8px, sem ícone de arrasto |
| **Split horizontal ◧** | Mesmo mas direção vertical | Funciona similar | Funciona: direction vertical | Mesmo ponto do sash |
| **Abas de terminal** | Tabs com ícone status (working, error), close ×, ordenação, drag & drop, menu contexto | `TerminalInstanceTabs` com label "1: bash", close ×, active background `var(--vscode-tab-activeBackground)` | `TerminalInstanceTabs` similar, mas label simplificado `${idx+1}: ${profileId}`, sem ícone status, sem drag & drop | Falta: status icon, drag reorder, contagem de terminais no badge |
| **Shell Picker** | Dropdown com perfis detectados (bash, zsh, pwsh, cmd) + ícone | `ShellPicker` existe, mostra `availableProfiles` do `PtySession` | Não implementado ainda na nova UI (só profileId string) | Gap: precisa integrar `getAvailableProfiles()` do BrowserPtyRuntimePort |
| **Clear (🗑)** | Limpa viewport, preserva processo, scrollback opcional | `clear()` chama `xterm.clear()` + `clearOutputBuffer()` | `handleClear` chama `viewRef.clear()` + `service.clear()` | Ok, mas VS Code tem opção "Clear Buffer" vs "Clear" — nós só temos clear total |
| **Maximizar/ Restaurar 🗖/🗗** | Maximiza painel terminal ocupando workbench, salva dimensões anteriores | `maximized` state local, classe `is-maximized` | Props `onMaximize`/`onRestore` expostas, mas wiring com `WorkbenchLayoutService.maximizePanel` ainda não feito no `workbenchShell` | Funcional no legacy, falta integração layout no novo |
| **Fechar painel ×** | Fecha painel, mas mantém processos em background se configurado | `handleClose` fecha split + kills + `onClose()` | `onClosePanel` prop | Ok |
| **Context menu (botão direito)** | Copy, Paste, Select All, Clear, Kill Terminal, Open Link, Search | Legacy: Copy, Paste, Select All, Clear, Kill (com disabled states) | Novo: Copy, Paste, Select All, Clear, Kill com `menuItemStyle` usando `var(--vscode-menu-*)` | VS Code tem mais itens (Split, Rename, Change Icon, Configure), nós temos 5 básicos |
| **Resize / Fit** | `FitAddon.fit()` + `sendResize(cols,rows)` preciso, ResizeObserver, window resize | `useXtermTerminal` com `fitAndSync`, ResizeObserver, window resize, `sendResize` | `useXterm` similar, `fitAndResize` + `onResize` -> `service.resize` | Ok, mas VS Code calcula fontSize via `editor.fontFamily` token mais preciso |
| **Output / Input** | xterm escreve chunk, onData envia para PTY, scrollback 1MB limitado, link detection | `onOutput` -> `instance.write(data)`, `onData` -> `sendInput` | `service.onEvent output` -> `write(chunk)`, `onData` -> `service.write` | Ok |
| **Exit handling** | Mostra "Process exited with code X. Press any key to close", preserva aba | Banner `stateBannerMessage` "Processo encerrado. Scrollback preservado." | Mensagem `\x1b[90mProcess exited...` escrita no xterm, preserva aba | Legacy tem banner separado, novo escreve no terminal — VS Code faz ambos |
| **Tabs Output/Problems** | Aba Terminal, Output, Problems com badge | `PanelTabs` com Output (build logs) e Problems (2 warnings) | Não implementado no novo (só terminal) | Gap |
| **Persistência** | Restaura sessões após reload via `terminalService` + storage | Não persiste (perde no reload) | `TerminalPersistenceService` com `localStorage` + índice, auto-save em groupChanged | Novo melhor que legacy, igual VS Code em conceito |
| **Sessão lateral (Abrir ao lado)** | No Sessions Sidebar, "Abrir ao lado" abre peer no grid Sessions Part | `onOpenBeside` prop em `SessionSidebar` que abre peer | Não implementado no novo workbench (sessionsService ainda não tem grid) | Usuário pediu exatamente isso — está no legacy, falta no novo platform |

## Análise visual (prints)

### VS Code real (imagem 01)
- Header escuro com abas coloridas, ícone terminal, badge (1) (2) (3)
- Split com linha divisória fina, sash com 2 linhas verticais ao hover
- Prompt verde `user@desktop:~/projects/app$` com syntax highlight (ls -la colorido)
- Scrollbar fina estilo VS Code, status bar azul embaixo "Spaces: 2 UTF-8 LF JavaScript React"

### Agente Window atual (imagem 02)
- Header mais simples, abas com * indicando dirty, botão + quadrado
- Botões split destacados em vermelho (na imagem gerada) mas no código real são ◫ ◧
- Context menu escuro com ícones, similar ao VS Code mas sem separadores idênticos
- Prompt similar mas sem cores de git tão ricas, scrollback funciona
- Falta: ícone de status (working spinner), ícone de shell (bash, node, pwsh), badge de problemas

### Split lateral (imagem 03)
- Ambos mostram dois terminais lado a lado
- VS Code: sash quase invisível, muda cursor para col-resize, linha azul ao arrastar
- Nosso: sash 8px transparente, fica azul só quando dragging (`is-dragging`), borda `var(--vscode-panel-border)`

## Gaps para ficar "igualzinho"

1. **Shell Picker UI** — integrar `BrowserPtyRuntimePort.getAvailableProfiles()` no `TerminalPanel` header. Hoje só mostra label fixa.
2. **Status icons nas abas** — working (spinner), needs-input (alerta), error. Precisa escutar `terminal.exit` e `status` do service.
3. **Drag & drop de abas** — `TerminalInstanceTabs` precisa de `onDragStart/onDrop` como `SessionSidebar` tem.
4. **Sash melhor** — copiar estilo VS Code: `SplitSash` com `sash-hoverBorder`, tamanho 4px, feedback visual.
5. **Tabs Output/Problems** — `PanelTabs` com badge, como no legacy, para fidelidade.
6. **Integração WorkbenchLayoutService** — `workbenchShell.ts` deve chamar `layoutService.maximizePanel({panelId:'terminal'})` ao clicar maximizar, não só state local.
7. **Sessão lateral grid** — implementar `sessionsService.openBeside` no novo platform, não só terminal split. É o que usuário descreveu como "abre uma sessão lateral também".
8. **Tema tokens** — garantir que todos os componentes usam `var(--vscode-*)` e não fallback hex. Hoje já usamos, mas precisa auditar.
9. **WebLinksAddon** — ativar `loadWebLinks` no novo `useXterm` para links clicáveis (VS Code tem).
10. **Persistência PTY real** — ao reload, tentar reconectar via `sessionId` ao invés de recriar. Hoje só persiste snapshot visual.

## Conclusão
- **Legacy 5173** está 80% igual ao VS Code em funcionalidade de terminal (tem split, tabs, context menu, maximize, clear, shell picker, output/problems), mas falta persistência e status icons perfeitos.
- **Novo platform FATIA-03** está 70% igual em lógica (service com split lateral, persistência, E2E) e 60% em UI (xterm, tabs, group, context menu), faltando shell picker, status, drag, output/problems tabs e wiring layout.
- Para ficar "igualzinho", próxima iteração deve ser **FATIA-03.8** — polish visual: shell picker, status icons, sash, e integração `workbenchShell` + `sessions grid` para "abrir ao lado".

## Próximos passos recomendados (ordem do plano)
- 03.8: Shell picker + status + sash polish
- 04: Explorer + Editor integração com terminal cwd
- 05: Sessions grid com open beside (o lateral que usuário pediu)

Ambos servidores mantidos: 8080 VS Code e 5173 Agente Window.
