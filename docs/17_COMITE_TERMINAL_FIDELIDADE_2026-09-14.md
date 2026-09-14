# COMITÊ — Avaliação Fidelidade Terminal 100% VS Code — 2026-09-14

**Solicitante:** usuário reportou "ainda nao esta bom, nao esta com a representacao 100% fiel"
**Objetivo:** preparar material para discussão com equipe sobre próximos passos
**Artefatos base:** `VSCodeTerminal.tsx` 34KB auto-contido, `platform/.../TerminalPanel.tsx` sem tabs horizontais, `ANALISE_TERMINAL_CODE_SERVER_CLONE.md`, refs 09/12/14

---

## 1. O que foi entregue até agora (FATIA-03.1 a 03.10)

### Infraestrutura (03.1 a 03.2)
- Bridge PTY real: WS `/pty` com queue até open, pendingCreates timeout 5s, reconnect 1s, PtyManager com buffer 1MB, idle 30min, shellDetector
- TerminalServiceImpl: lifecycle create/write/resize/clear/kill, split lateral clona cwd/profile, groups com direction horizontal/vertical, serialize/hydrate snapshot leve, attachPersistence auto-save
- Validação: 9 testes VAL-T + 5 pty-server + 25 total unit/E2E

### UI (03.3 a 03.5)
- useXterm: Terminal + FitAddon + WebLinks, tokens CSS var(--vscode-*), ResizeObserver, tema reativo
- TerminalView: escuta output/exit/cwd, envia input, preserva aba ao exit com mensagem "Process exited..."
- TerminalGroup: 1 único ref09, 2 duplo ref12 com splitRatio drag 0.5, 4 quadruplo ref14 grid 1fr*4 ou 2x2 gap 1px panel-border
- TerminalPanel: header 35px PanelTabs Saída|Terminal|Output|Problems, ShellPicker lucide, ações 22px btnStyle, drawer 200px sideBar-background lista vertical active #094771 borderLeft #007acc, context menu 5 itens, more menu "Modos de Exibição..."

### Integração visível (03.8 a 03.10)
- PlatformTerminalBridge: instancia BrowserPtyRuntimePort + TerminalServiceImpl + Persistence, renderiza novo TerminalPanel, props compatíveis legacy para troca localizada sem reescrever App.tsx
- VSCodeTerminal auto-contido 34KB: elimina imports platform no caminho crítico, resolve tela cinza, WS direto /pty, sem depender de aliases @contracts que falhavam no Vite dev
- Remoção abas browser-like: TerminalInstanceTabs horizontal removido de platform TerminalPanel, mantido apenas drawer vertical igual VS Code refs 12/14
- Servidores: 8080 VS Code Server 200 OK + 5173 Agente Window 200 OK mantidos

---

## 2. Por que não é 100% fiel? Checklist detalhado

| # | Item | VS Code original (lib/vscode 1453+2990 linhas) | Nosso atual | Gap | Severidade | Esforço para 100% |
|---|------|-----------------------------------------------|-------------|-----|------------|-------------------|
| 1 | **Codicons** | Fonte codicon oficial VS Code (codicon-split-horizontal, trash, new-terminal, layout-panel-off) 16px com ligatures | lucide-react 16px — similar mas stroke diferente | Visual levemente diferente | Baixa | Baixo — copiar woff2 MIT |
| 2 | **Sash split** | SplitPaneContainer mede pixels, sash 4px com hover #007acc, drag com feedback, distribuição proporcional N terminais | flex ratio 0.5 drag, gap 1px, sash simplificado 8px transparente | Funcional mas não pixel-perfect | Média | Médio — reimplementar SplitPaneContainer |
| 3 | **Context menu** | 12+ itens: Copy, Paste, Select All, Clear, Split, Kill, Rename, Change Icon/Color, Move to new window, Show/Hide Tabs | 5 itens: Copiar/Colar/Selecionar tudo/Limpar/Encerrar | Falta 7 itens | Alta | Baixo — adicionar itens |
| 4 | **More menu** | "Modos de Exibição e Mais Ações..." + submenus Split In Group, Join Group, Resize, Show Tabs, quadruplo com layout options | Título + 5 opções simplificadas, sem submenu real | Sem join group, sem resize options | Média-Alta | Médio — implementar submenu |
| 5 | **Status icons** | Spinner working, bell, warning, success, needs-input com cor e animação | ●/○ estático | Sem feedback processo | Média | Baixo — spinner CSS |
| 6 | **ShellPicker** | Dropdown com ícone terminal, ChevronDown, lista perfis com ícone + path + args + default indicator + busca | Dropdown simples com Check, profiles bash/pwsh sem path | Sem path, sem codicon | Média | Baixo — adicionar path |
| 7 | **Drawer header** | "TERMINAIS" uppercase tracking 0.5px, toolbar Plus/Trash no header drawer, drag reorder | "Terminais" capitalizado, toolbar no header mas sem tracking, sem drag | Detalhe tipografia + drag | Baixa | Baixo |
| 8 | **Tema dinâmico** | ColorRegistry via ThemeService, reage a troca tema claro/escuro, contraste, transparência | getComputedStyle(var(--vscode-*)) + inline — cobre 80% mas não reage dinâmica tema | Não reage troca tema | Baixa | Médio — ThemeService |
| 9 | **WebLinks/Search/Unicode** | WebLinksAddon clicável, SearchAddon Ctrl+F, Unicode11Addon, accessibility | WebLinksAddon presente mas Search/Unicode não | Falta busca | Baixa | Baixo |
| 10 | **Persistência integrada** | StorageService workspaceId + layout + environment + terminal, integrado WorkbenchLayoutService | localStorage simples envelope versionado, não integrado WorkbenchLayoutService | Funciona mas não integrado | Baixa | Médio |
| 11 | **Maximize via service** | WorkbenchLayoutService.maximizePanel/restorePanel com evento onDidChange | State local useState maximized — não via service | Quebra fidelidade layout | Média | Baixo — wiring service |
| 12 | **Dual implementação** | Singleton TerminalService gerencia tudo | Duas impl: legacy VSCodeTerminal direto WS + platform TerminalServiceImpl separado — drift | Débito técnico | Alta | Médio — Opção B |
| 13 | **Menu system** | IMenuService + MenuRegistry com contribuições, keybindings | Div estática | Sem keybindings, sem contribuições | Média | Alto — MenuService |

**Fidelidade atual estimada:** 85% funcional, 70% pixel-perfect vs VS Code original

---

## 3. Causas raiz

1. **Duas implementações paralelas**: `legacy/.../VSCodeTerminal.tsx` (usado na app real 5173) e `platform/.../ui/terminal/` (nova arquitetura alvo, não usado). Cria drift e impede evolução única.
2. **Simplificação proposital para evitar tela cinza**: VSCodeTerminal auto-contido evita imports platform que quebravam Vite dev, mas perde integração com TerminalServiceImpl e WorkbenchLayoutService.
3. **Codicons vs Lucide**: decisão de usar lucide-react (já usado no legado) vs codicons oficiais VS Code — lucide é próximo mas não idêntico.
4. **SplitPaneContainer**: VS Code tem componente complexo pixel-perfect. Nosso flex ratio é MVP funcional.
5. **Menu system**: VS Code usa sistema de menus com registry. Nosso menu é div estática para MVP.

---

## 4. Opções para próximos passos — para comitê decidir

### Opção A — Polish incremental no VSCodeTerminal atual
**Escopo:** fechar gaps visuais baixo esforço sem tocar arquitetura
- Codicons reais (copiar woff2 MIT do VS Code)
- Sash 4px hover #007acc
- Context menu +7 itens (Split, Rename, Change Icon)
- Status spinner CSS
- ShellPicker com path
- Maximize via props (já existe) mas documentar

**Pros:** mantém 5173 funcionando, sem risco regressão, 1-2 dias, fecha comitê com demo 85%→88% fiel
**Contras:** não resolve dual impl, nunca 100% sem SplitPaneContainer e MenuService, débito técnico permanece
**Custo:** 1-2 dias dev
**Fidelidade final:** 85%→88%
**Risco:** Baixo

### Opção B — Migrar app real para 100% platform (RECOMENDADA médio prazo)
**Escopo:** eliminar dual, usar TerminalServiceImpl + BrowserPtyRuntimePort + platform TerminalPanel como single source of truth
- Reescrever `legacy/src/components/TerminalPanel.tsx` para importar platform TerminalPanel
- Garantir `vite.config.ts` alias @contracts → platform/packages/contracts (já existe mas precisa validar sem tela cinza)
- Remover VSCodeTerminal auto-contido, unificar testes
- Wiring WorkbenchLayoutService para maximize/restore
- Validar 5173 sem cinza com alias resolvido

**Pros:** elimina dual impl, alinha com arquitetura alvo platform/, resolve débito técnico, permite evolução futura FATIA-08 hardening, 85%→95% fidelidade
**Contras:** requer tocar App.tsx e vite.config.ts (proibido antes, precisa autorização), risco tela cinza se alias falhar, 3-5 dias
**Custo:** 3-5 dias dev
**Fidelidade final:** 85%→95%
**Risco:** Médio (tela cinza mitigável com lazy import)

### Opção C — Reuso direto do terminal do VS Code (lib/vscode)
**Escopo:** extrair `lib/vscode/src/vs/workbench/contrib/terminal/browser/` (terminalService 1453 linhas + terminalInstance 2990 linhas) e adaptar para nosso workbench
- Copiar terminal contrib do VS Code
- Adaptar dependency injection (InstantiationService, ColorRegistry)
- Integrar com nosso PtyManager
- Tema e layout

**Pros:** 100% fiel por definição, é o próprio código VS Code
**Contras:** dependência pesada, bundle grande, perde controle custom "Terminal do Host do Agente", complexidade alta, foge escopo FATIA-03, 1-2 semanas
**Custo:** 1-2 semanas dev senior
**Fidelidade final:** 95%→100%
**Risco:** Alto (bundle, DI, manutenção)

---

## 5. Recomendação técnica

**Curto prazo (esta semana, para comitê):**
- Opção A para fechar comitê com demo aceitável 85-88% fiel, sem bloquear FATIA-04 Explorer
- Registrar gaps conhecidos como débito técnico aceito, documentar em `docs/12` e `ANALISE_TERMINAL_CODE_SERVER_CLONE.md`
- Decidir nível aceite: 85% com gaps documentados é suficiente para FATIA-03 ou 100% obrigatório?

**Médio prazo (próxima sprint):**
- Opção B para eliminar dual e alinhar com arquitetura platform/ — pré-requisito para FATIA-08 hardening
- Autorizar tocar App.tsx e vite.config.ts com justificativa explícita
- Migrar codicons oficiais MIT

**Longo prazo (pós V1):**
- Avaliar Opção C apenas se cliente exigir pixel-perfect absoluto e aceitar bundle maior e custo manutenção

---

## 6. Perguntas para comitê decidir

1. **Nível aceite FATIA-03:** 85% funcional com gaps documentados é suficiente para considerar FATIA-03 concluída e avançar para FATIA-04, ou 100% pixel-perfect é obrigatório antes?
2. **Autorização tocar App.tsx:** podemos autorizar tocar `App.tsx` e `vite.config.ts` para Opção B (migrar para platform) ou mantemos proibição e ficamos com dual impl?
3. **Codicons vs Lucide:** podemos copiar codicons oficiais VS Code (licença MIT) para ficar idêntico, ou mantemos lucide-react como aproximação?
4. **Paralelizar FATIA-04:** Explorer + Filesystem pode iniciar em paralelo mesmo com terminal 85%, ou deve aguardar 100%?
5. **Validador visual:** quem valida final? Comparação manual com refs 09/12/14 screenshots ou teste automatizado screenshot com Playwright?
6. **Prioridade:** investir mais 1-2 dias em polish terminal (Opção A) ou avançar para Explorer que é P0 para V1?

---

## 7. Artefatos para comitê

- **Código atual:** `legacy/.../terminal/VSCodeTerminal.tsx` (34KB auto-contido) + `platform/.../ui/terminal/TerminalPanel.tsx` (sem tabs horizontais)
- **Referências visuais:** `docs/referencias_visuais/` + refs 09_terminal_menu_contexto_acoes.png, 12_terminal_split_duplo.png, 14_terminal_split_quadruplo_menu.png
- **Análise clone:** `docs/ANALISE_TERMINAL_CODE_SERVER_CLONE.md` + clone real `/home/user/.cache/code-server/lib/vscode/src/vs/workbench/contrib/terminal/browser/`
- **Servidores:** 8080 VS Code Server 200 OK + 5173 Agente Window 200 OK
- **Testes:** 25 unit/E2E + 5 pty-server passando
- **Docs atualizadas:** `docs/12` COMITÊ 2026-09-14 + `docs/11` FATIA-03.11

---

## 8. Próximo passo aguardando comitê

- Não implementar mais polish até decisão comitê — evitar retrabalho
- Manter ambos servidores rodando 8080+5173
- Atualizar kanban para "Em revisão comitê"
- Registrar decisão comitê em `docs/12` e `docs/11` após reunião

**Data:** 2026-09-14
**Autor:** Arena Agent
**Status:** Aguardando comitê
