# BACKLOG ESTRATÉGICO — Réplica Agents Window (VS Code)

## Intenção Original
- **Objetivo:** construir uma réplica de alta fidelidade e 100% funcional da Agents Window do VS Code, eliminando mocks onde houver integração real exigida.
- **Estado Atual:** Onda 1 e Onda 2 permanecem registradas como entregas históricas validadas, porém o **Terminal Real foi reaberto** após a regressão reproduzida em 2026-09-07 e após a aprovação do `BLUEPRINT_TERMINAL_REAL.md` **Revisão 3**.
- **Meta Final:** encerrar o terminal com a fundação corrigida (`RC1`–`RC4`), servidor único em `/pty`, paridade visual aprovada e cadeia final `typecheck + test + playwright + build` verde na mesma sessão documental.

---

## Onda 1 — Produção Real: Filesystem & Terminal (histórico)
> Pré-requisito histórico: Sessões 01 a 05 concluídas e validadas

### Itens

| ID | Entregável | Descrição (entregue ou planejada) | Arquivos Impactados | Critério de Aceite | Status |
|----|------------|-----------------------------------|----------------------|---------------------|--------|
| W1-01 | Sessões List Real (Sessão 04) | Agrupamento completo (Hoje/Fixadas), 3 chats aninhados, workspace capping 3, drag seguro e teclado | `SessionSidebar.tsx`, `sessionsList.ts`, `dragAndDrop.ts` | E2E `sessao_02` passa (5/5) e typecheck 0 erros | CONCLUÍDO |
| W1-02 | Layout Topologia (Sessão 05) | Docked controller, session sync, CannotClose tabs e regra R-070 | `sessionLayout.ts`, `sessionLayoutSync.ts`, `App.tsx` | E2E `sessao_09` passa (5/5) | CONCLUÍDO |
| W1-03 | File System Access API (Sessão 08) | Entregue: `showDirectoryPicker` real, árvore do disco, persistência do handle em IndexedDB e fallback honesto; E2E prova a chamada nativa | `src/domain/fileSystem.ts`, `AuxiliaryBar.tsx`, `App.tsx` | E2E `sessao_08` 5/5 e chamada real de `showDirectoryPicker` instrumentada | CONCLUÍDO |
| W1-04 | Terminal Real xterm.js (Sessão 11) | **Marco histórico:** backend PTY + WebSocket entregue e Gate 0 verde em 2026-09-06. **Situação atual:** a trilha foi reaberta pela regressão Arena (2026-09-07) e pela Revisão 3 do blueprint; o follow-up executável está agora na **Onda TR** abaixo. | `pty-server/`, `TerminalPanel.tsx`, `usePtySession.ts` | Evidência histórica em `GATES_EXECUCAO.md` §6; replanejamento atual em `BLUEPRINT_TERMINAL_REAL.md` Rev. 3 | CONCLUÍDO (HISTÓRICO) |

### Meta da Onda 1
- **Critério binário histórico:** Filesystem e Terminal reais integrados sem mocks, com testes unitários passando.
- **Status:** CONCLUÍDO (histórico; terminal reaberto em onda corretiva posterior)

### CONTRATOS_DA_ONDA 1 — Registro Histórico
```yaml
FONTE: "04_gestao_completo/documentacao_viva/BLUEPRINT_TERMINAL_REAL.md (Revisão 2, agora parcialmente revisada pela Revisão 3)"

FATOS_HISTORICOS:
  - "Gate 0 ficou verde em 2026-09-06 e permanece como evidência histórica de uma execução real."
  - "A regressão observada em 2026-09-07 NÃO apaga esse fato; ela apenas reabre a frente do terminal."
  - "A Revisão 3 substitui formalmente a estratégia de porta dedicada + discovery para o trabalho futuro."
```

---

## Onda 2 — Custom Views, Mobile & Fechamento de Produção (histórico)
> Pré-requisito histórico: Onda 1 concluída

### Itens

| ID | Entregável | Descrição | Arquivos Impactados | Critério de Aceite | Status |
|----|------------|-----------|----------------------|---------------------|--------|
| W2-01 | Custom View Grid (Sessão 08) | Superfície full-surface mutuamente exclusiva com Sessions Part/Editor/Aux/Panel, desired vs effective visibility, dismiss e persistência | `src/domain/customView.ts`, `App.tsx`, `CustomizationsView.tsx` | E2E `sessao_10` 6/6 + 15 unitários de `customView` | CONCLUÍDO |
| W2-02 | Responsividade Mobile (Sessão 10A) | Gate por toque (`pointer:coarse` + maxTouchPoints), dock bottom-bar, alvos de 44px e gesto de swipe lateral | `mobileLayout.ts`, `App.tsx`, `app.css` | E2E `sessao_06` 5/5 em 390x780 com toque e handlers de swipe | CONCLUÍDO |
| W2-03 | Suíte Final de E2E & Screenshots (Sessão 10B) | Asserções reais e screenshots de evidência | `e2e/*.spec.ts`, `test-results/` | `npx playwright test` verde na execução histórica correspondente | CONCLUÍDO |
| W2-04 | Build de Produção Limpo | Code-splitting com `manualChunks` no `vite.config.ts` isolando `monaco-editor` e `@xterm/xterm` | `vite.config.ts`, `dist/` | `npm run build` concluir com exit code 0 | CONCLUÍDO |

### Meta da Onda 2
- **Critério binário histórico:** E2E completo e build de produção concluído com evidência real.
- **Status:** CONCLUÍDO

### CONTRATOS_DA_ONDA 2
```yaml
OUTPUT_SCHEMAS:
  W2-01: "GridState -> { panes: PaneItem[], activePaneId: string, splitDirection: 'horizontal' | 'vertical' }"

ESCOPO_CONGELADO:
  - "src/components/SessionSidebar.tsx"

DECISOES_EXTRAS:
  - "Não adicionar novos frameworks visuais; utilizar apenas CSS customizado existente"
```

---

## Onda TR — Terminal Real: Correção de Regressão + Servidor Único + Paridade Visual
> Pré-requisito: diagnóstico de regressão documentado em `GATES_EXECUCAO.md` §7
> Fontes mandatórias: `documentacao_viva/BLUEPRINT_TERMINAL_REAL.md` **Revisão 3** + `terminal_vscode_completo/plano_implementacao/README.md` + `terminal_vscode_completo/plano_implementacao/REVISAO_CRITICA.md`

### Itens

| ID | Entregável | Descrição (planejada) | Arquivos Impactados | Critério de Aceite | Status |
|----|------------|------------------------|----------------------|---------------------|--------|
| TR-01 | Fase E1 — Fundação / RC1–RC4 | Corrigir loop de `setState`, re-subscribe do output, reconexão ao mesmo PTY e resize inicial; filtrar PowerShell fora do Windows | `src/providers/TerminalSessionProvider.tsx`, `src/components/TerminalPanel.tsx`, `src/hooks/usePtySession.ts`, `pty-server/src/ptyManager.ts`, `pty-server/src/wsHandler.ts`, `pty-server/src/shellDetector.ts` | `probe-terminal.mjs` verde: prompt visível antes do input, `echo` aparece no output e o mesmo PID sobrevive ao fechar/reabrir o painel | ✅ CONCLUÍDO — Validado 2026-09-08 |
| TR-02 | Fase E2 — Servidor Único / Porta Única | Eliminar processo standalone + discovery de porta; servir terminal na mesma origem via `/pty` em dev e produção | `vite.config.ts`, `vite-plugin-pty.ts`, `server.mjs`, `src/hooks/usePtySession.ts`, `pty-server/` | Nenhuma chamada a `discoverPtyPort()` ou `/pty-port`; app e WS funcionando na mesma origem | ✅ CONCLUÍDO — Validado 2026-09-08 |
| TR-03 | Fase E3 — Paridade Visual | Internalizar e executar o blueprint detalhado da E3: tokens, CSS, chrome React, tabs, shell picker, split visual e tema reativo sobre `xterm.js` | `src/components/TerminalPanel.tsx`, `src/components/terminal/*`, `src/hooks/useXtermTerminal.ts`, `src/hooks/useTerminalTheme.ts`, `src/domain/terminalInstances.ts`, `src/styles/terminal-vscode.css`, `src/styles/xterm-vscode.css`, `terminal_vscode_completo/plano_implementacao/*` | Painel desktop flat, abas à direita, action bar/shell picker consistentes, clear sem ressuscitar, split com sash redimensionável, tema reativo sem recriar PTY, contexto por botão direito e regressão E1/E2 protegida por Gate 0 + Sessão 11 + `sessao_11b_visual` + `sessao_11c_clear_active` + `sessao_11d_split_sash` + `sessao_11e_theme_states` + `sessao_11f_context_menu` | ✅ CONCLUÍDO — Etapas 0, 1, 2, 3, 4, 5 e 6 aplicadas/validadas; limpeza final de CSS e alinhamento dos contratos estáticos concluídos |
| TR-04 | Fase E4 — Fechamento / Régua Final | Reforçar `sessao_11`, **reconciliar os gaps vistos na validação local Windows** (bootstrap do `pty-server`, click-outside do menu, N terminais/lista, layout/base, PTY/WebSocket, supressão de demo/debug, resize vertical, X vs lixeira) e só então validar suíte completa, build e arquivamento documental na mesma sessão | `e2e/sessao_11_*`, `GATES_EXECUCAO.md`, `CURRENT_STATE.md`, `DECISION_LOG.md`, `PHASE_SUMMARY.md` | `npm run typecheck` + `npm run test` + `npx playwright test` + `npm run build` todos verdes; divergências locais Windows eliminadas; docs vivos atualizados | PENDENTE — reconciliação local aberta antes do fechamento final |

### Meta da Onda TR
- **Critério binário:** terminal real revalidado sob a Revisão 3, com arquitetura de servidor único e paridade visual aprovada.
- **Status:** EM ANDAMENTO — E1 ✅, E2 ✅ e checkpoint E3 verde na régua interna; a validação local Windows reabriu uma reconciliação obrigatória antes da E4 final

### CONTRATOS_DA_ONDA TR — Revisão 3 (vigente)
```yaml
FONTE: "04_gestao_completo/documentacao_viva/BLUEPRINT_TERMINAL_REAL.md (Revisão 3)"

ORDEM_OBRIGATORIA:
  - "1. Fechar E1 com sonda real verde antes de qualquer refatoração de arquitetura/visual."
  - "2. Só depois avançar para E2 (servidor único / porta única)."
  - "3. Só depois avançar para E3 (paridade visual)."
  - "4. E4 fecha a cadeia final e atualiza toda a documentação viva na mesma sessão."

DECISOES_IMUTAVEIS_DESTA_REVISAO:
  - "Esconder/fechar painel, trocar de terminal ou trocar de sessão NÃO mata o PTY."
  - "A régua mínima do terminal exige prompt visível antes de input e o mesmo PID após toggle do painel."
  - "A arquitetura vigente remove o discovery de porta e centraliza tudo na mesma origem com endpoint /pty."
  - "A E3 segue o blueprint detalhado internalizado em terminal_vscode_completo/plano_implementacao/."
  - "Paridade visual continua sendo reimplementação React sobre xterm.js, sem reabrir a base funcional da E1/E2."
  - "No desktop, o terminal da E3 é flat/ponta a ponta; mobile/single-pane/dock preservam o comportamento próprio do app."
  - "A E3 mantém lucide-react 16px nesta onda; codicon fica como melhoria pós-E3."
  - "Limpar terminal atua só na instância ativa e o conteúdo limpo não pode ressuscitar ao reabrir o painel."
  - "Dev e preview seguem a origem do servidor ativo (`vite --host 0.0.0.0:5173`, `server.mjs` default `0.0.0.0:4173`) mantendo WS same-origin em /pty."

FORA_DE_ESCOPO:
  - "Exposição remota do terminal para redes externas e autenticação dedicada."
  - "Ir para Diretório Recente / Executar Comando Recente (WB-01, WB-02)."
  - "Executar Arquivo Ativo / Executar Texto Selecionado (WB-03, WB-04)."
  - "Serviço de Voz (WB-05)."
  - "Output real do painel inferior."
```

---

## Onda B — Extensões do Terminal Real
> Pré-requisito atualizado: **Onda TR concluída**
> Decisão registrada: itens permanecem adiados e não devem contaminar o escopo da Revisão 3

| ID | Feature | Motivo do adiamento | Status |
|----|---------|---------------------|--------|
| WB-01 | "Ir para Diretório Recente" | Exige histórico de diretórios persistido acima do terminal real. | PENDENTE |
| WB-02 | "Executar Comando Recente" | Exige histórico persistido de comandos, separado do PTY em si. | PENDENTE |
| WB-03 | "Executar Arquivo Ativo" | Integração editor↔terminal, fora da onda corretiva atual. | PENDENTE |
| WB-04 | "Executar Texto Selecionado" | Integração editor↔terminal, fora da onda corretiva atual. | PENDENTE |
| WB-05 | "Iniciar Serviço de Voz" | Sem relação com o PTY e sem blueprint próprio aprovado. | BLOQUEADO — aguarda blueprint próprio |

---

## Regras do Backlog
1. Itens só mudam de status definitivo após validação real registrada em `GATES_EXECUCAO.md` na mesma sessão.
2. Nenhum número novo entra nos documentos vivos sem execução correspondente.
3. Contratos definidos em `CONTRATOS_DA_ONDA` são fatos imutáveis até revisão formal posterior.
4. A Revisão 3 do terminal substitui formalmente a arquitetura de porta dedicada/discovery da Revisão 2 para todo trabalho futuro.
