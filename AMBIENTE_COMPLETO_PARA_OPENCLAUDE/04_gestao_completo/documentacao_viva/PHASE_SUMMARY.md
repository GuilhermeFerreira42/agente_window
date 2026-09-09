# PHASE_SUMMARY — Resumo Executivo das Fases Concluídas

> As métricas de cada fase são **snapshots históricos** do momento em que a fase fechou.
> O número corrente do projeto está sempre em `GATES_EXECUCAO.md`.

## Fase 04 — SESSIONS_LIST_AGRUPAMENTO
> Data de Conclusão: 2026-09-04 | Status: ✅ Validado com E2E

### Objetivo
Substituir a lista de sessões mockada por uma implementação de alta fidelidade ao VS Code, incluindo agrupamento temporal canônico, 3 chats aninhados, workspace capping, navegação por teclado e drag & drop seguro.

### Entregáveis
- `src/components/SessionSidebar.tsx` — Remoção de filtros falsos, renderização de `NestedChatRow`, context menu completo e roving index.
- `src/domain/sessionsList.ts` — Precedência `archived > pinned > custom > quickChats > date`, capping 3 e rótulo "Mais antigos".
- `src/domain/dragAndDrop.ts` — `canReorderSessions` com bloqueio de itens arquivados.
- `src/domain/keyboardNavigation.ts` — Atalhos F2, Delete, Enter/Space e setas.

### Métricas de Teste
- **Typecheck:** 0 erros
- **Unitários:** 12/12 testes específicos passando (348 total no projeto)
- **E2E Playwright:** 5/5 testes em `sessao_02_sessions_list` aprovados

---

## Fase 05 — LAYOUT_TOPOLOGIA
> Data de Conclusão: 2026-09-04 | Status: ✅ Validado com E2E

### Objetivo
Consolidar a topologia single-pane reativa, sincronização de layout entre sessões via observable e regras estritas de abas transientes (R-070).

### Entregáveis
- `src/domain/sessionLayout.ts` — Docked auxiliary controller e captura/restauração por ID.
- `src/domain/sessionLayoutSync.ts` — Sincronização automática na alternância de sessões.
- `src/App.tsx` — Proteção `CannotClose` para abas gerenciadas.

### Métricas de Teste
- **E2E Playwright:** 5/5 testes em `sessao_09_bugs_criticos` aprovados
- **Integridade:** Persistência no LocalStorage sem vazamento entre sessões

---

## Fase 06 — RÉGUA DE TESTES CONFIÁVEL
> Data de Conclusão: 2026-09-05 | Status: ✅ Validado (typecheck + 353 unitários + 49 E2E)

### Objetivo
Tornar a suíte capaz de FALHAR antes de escrever qualquer feature nova. O diagnóstico que motivou a fase: 48 testes E2E com apenas 34 `expect`, 10 deles sem nenhuma asserção, 0 verificações de geometria e 6 specs apontando para uma porta morta (5175).

### Entregáveis
- `e2e/helpers.ts` — `BASE_URL` única, `resetApp`, leitura de `localStorage`, medição por `boundingBox`, coletor de erros de console.
- `playwright.config.ts` — `webServer` sobe o Vite (5173) automaticamente.
- 10 specs reescritas (49 testes) com asserções de estado, geometria e persistência; inclui o cenário do vídeo [00:33] com aba Browser ativa (aux transiente).
- `src/__tests__/e2eAssertionContract.test.ts` — trava permanente contra testes sem assert.

### Bugs REAIS encontrados pela nova régua (todos corrigidos)
| # | Bug | Arquivo |
|---|-----|---------|
| 1 | Monaco sem `MonacoEnvironment.getWorker`: 98 erros `toUrl` de runtime | `src/main.tsx` |
| 2 | `TextModel got disposed before DiffEditorWidget model got reset` ao ocultar o editor | `src/components/EditorArea.tsx` |
| 3 | `onToggleFolder` inexistente (abrir pasta real quebrava) | `src/App.tsx` |
| 4 | `npm run typecheck` era no-op (`tsc --noEmit` com `tsconfig.json` sem arquivos) | `package.json` |
| 5 | Linha da sessão sem nome acessível: `role="button"` absorvia o rótulo dos filhos | `src/components/SessionSidebar.tsx` |
| 6 | Alvo de toque do dock mobile com 34px (MOBILE.md exige 44px) | `src/styles/app.css` |

### Métricas de Teste (executadas, não estimadas)
- **Typecheck real (`tsc -b --force`):** 0 erros
- **Lint:** 0 erros, 2 warnings
- **Unitários:** 353/353 (42 arquivos)
- **E2E:** 49/49 em ~4,6 min, 51 screenshots em `test-results/`
- **Densidade de asserção:** 34 → 160 `expect` (0 testes sem assert)

---

## Fase 07 — CUSTOM VIEW GRID (Sessão 08)
> Data de Conclusão: 2026-09-05 | Status: ✅ Validado (typecheck + 368 unitários + 55 E2E)

### Objetivo
Fechar o último gap 100% aberto da Validação 3: AI Customizations era apenas mais uma aba do editor, e `.custom-view-grid` existia só no CSS (`app.css:4908`), sem nenhum TSX consumidor.

### Entregáveis
- `src/domain/customView.ts` (novo) — `ICustomViewService` do original em forma pura: *desired* vs *effective visibility*, `openCustomView`/`closeCustomView`, dismiss ao abrir sessão, dismiss no back do phone e persistência em `workbench.customView.v1`.
- `src/App.tsx` — a view cobre Sessions Part, Editor, Auxiliary Bar e Panel; Title Bar, Sidebar e o dock do phone permanecem; fechar restaura exatamente a visibilidade retida.
- `src/components/CustomizationsView.tsx` — modo `embedded` (o título vem do cabeçalho do grid, sem heading duplicado).
- `src/styles/app.css` — cabeçalho e conteúdo do grid full-surface.
- `e2e/sessao_10_custom_view_grid.spec.ts` (novo) — 6 testes cobrindo os 4 critérios de aceite do pacote + geometria + árvore real.

### Critérios de aceite do pacote (todos verdes)
1. Abrir AI Customizations → Sessions Part, Editor, Aux e Panel somem; só Title Bar e Sidebar ficam ✅
2. Clicar numa sessão → custom view fecha e o estado anterior volta ✅
3. F5 com custom view ativa → continua ativa ✅
4. No phone, o back dispensa a custom view ✅

### Extra da fase — resíduo da Sessão 05 fechado
`LAYOUT.md` exige um grid **não-proporcional**: Sidebar, Editor e Auxiliary Bar preservam o tamanho estabelecido; só a Sessions Part absorve o resize da janela. A réplica encolhia as duas colunas proporcionalmente. Um `ResizeObserver` passou a reconverter o split em % para manter os **pixels** do editor (E2E `sessao_05` T6: editor Δ≤12px, chat absorve 231 de 240px).

### Métricas de Teste
- **Typecheck (`tsc -b --force`):** 0 erros · **Lint:** 0 erros
- **Unitários:** 368/368 (43 arquivos), sendo 15 novos de `customView`
- **E2E:** 56/56 (11 specs), sendo 7 novos

---

## Fase 08 — CONSOLIDAÇÃO DA DOCUMENTAÇÃO VIVA
> Data de Conclusão: 2026-09-05 | Status: ✅ Concluída (gates reexecutados do zero)

### Objetivo
Acabar com a fonte dupla de verdade: relatórios de análise nasciam soltos no workspace, nunca voltavam para os documentos vivos e passaram a contradizê-los.

### Divergências encontradas e eliminadas
| Onde | O que dizia | Verdade apurada em 2026-09-05 |
|---|---|---|
| `docs/gestao/KANBAN.md` (KANBAN duplicado) | "348/348 testes", Custom View Grid em `EM ANDAMENTO` | 368/368; Custom View Grid `CONCLUÍDO` |
| `02_replica_final/docs/gestao/KANBAN.md` (3º KANBAN) | 9 módulos no BACKLOG, só o 04 "FEITO" | 9,5 de 10 módulos entregues |
| `CONTEXTO_GERAL.md` | "E2E 40/40", "~98%", e "leia APENAS este arquivo" | E2E 56/56; ~90%; ordem de leitura é a do `CLAUDE.md` |
| `STATUS_ATUAL.md` | (41 bytes: só o título) | arquivo-fantasma, arquivado |

### Entregáveis
- `GATES_EXECUCAO.md` (novo) — saída bruta dos 4 gates com exit codes.
- `arquivo_historico/` (novo) — 11 relatórios/status soltos preservados fora do caminho de leitura.
- `CLAUDE.md` — nova regra de governança documental (invariante nº 8).
- KANBAN canônico único, com a estrutura fixa de 9 colunas × 5 seções preservada.

### Métricas de Teste (execução desta fase)
- **Typecheck:** exit 0 · **Unitários:** 368/368 (43 arquivos) · **E2E:** 56/56 (5,4 min, 58 screenshots)
- **Build:** exit 134 — OOM do V8, bloqueio de ambiente registrado

---

## Fase 09 — VERIFICAÇÃO SESSÃO 11 & DIAGNÓSTICO `.platform`
> Data de Conclusão: 2026-09-05 | Status: ✅ Validado (typecheck + 370 unitários + 62 E2E)

### Objetivo
Retomar a Sessão 11 (Terminal Real com PTY) descrita como bloqueada por um crash `Cannot read properties of null (reading 'platform')` ao montar o `TerminalPanel`, diagnosticar a causa raiz e garantir a suíte `e2e/sessao_11_terminal_pty_real.spec.ts` verde.

### Achados
- **Ambiente era a causa real do bloqueio.** O workspace restaurado de `codigo_completo.txt` não trazia `node_modules`, o `pty-server` não estava buildado (sem `dist/index.js` → o `webServer` do Playwright nem subia) e faltavam as bibliotecas do Chromium no SO. Montado o ambiente (`npm install`, `cd pty-server && npm install` com node-pty nativo, `npx playwright install chromium` + `sudo npx playwright install-deps chromium`), a suíte E2E passou integralmente.
- **Crash `.platform` NÃO se reproduziu.** Análise estática do `lib/xterm.mjs`: o objeto "process" (`xe`) só recebe `process` real, `globalThis.vscode.process` ou fica `undefined` — nunca `null`; o guard `if (typeof xe === "object")` é seguro. `navigator.platform` é lido só no branch web. Logo não há ponto de acesso `null.platform` no código do xterm sob o bundle ESM que o Vite carrega.
- **Violação de contrato corrigida:** `e2e/debug_terminal_toggle.spec.ts` violava o `e2eAssertionContract` (porta hardcoded, `console.log`, `test(...)` sem indentação). Reescrito para conformidade → unitários 370/370.

### Métricas de Teste (executadas nesta sessão)
- **Typecheck (`tsc -b --force`):** 0 erros
- **Unitários:** 370/370 (44 arquivos)
- **E2E:** 62/62 (12 specs, ~5,2 min) — inclui Sessão 11 T1–T5
- **Build:** exit 134 — OOM do V8 (bloqueio de ambiente persiste; exige ≥ 4 GB)

---

## Fase 10 — RESOLUÇÃO BUILD OOM, SWIPE MOBILE & FOCO DO TERMINAL
> Data de Conclusão: 2026-09-05 | Status: ✅ Validado (4/4 gates verdes: Typecheck + Unitários + E2E + Build)

### Objetivo
Resolver os três itens remanescentes do sprint: o bloqueio histórico de build por estouro de heap no V8 (exit 134), o suporte ao gesto de swipe mobile para a barra lateral, e a sincronização e ergonomia de foco no terminal real.

### Entregáveis
- `vite.config.ts` — Configuração de `build.rollupOptions.output.manualChunks` separando `@xterm/xterm` e `monaco-editor` em chunks dedicados (`xterm-vendor` e `monaco-vendor`).
- `src/App.tsx` — Handlers de toque (`onTouchStart`, `onTouchEnd`) para alternar a visibilidade da barra lateral por swipe (deslizar para direita a partir da borda para abrir, e para esquerda para fechar).
- `src/components/TerminalPanel.tsx` — Auto-foco do cursor `term.focus()` ao montar ou alternar entre sessões ativas e tecla `Escape` customizada para desfocar o xterm.

### Métricas de Teste (100% Verdes)
- **Typecheck (`tsc -b --force`):** 0 erros
- **Unitários:** 370/370 (44 arquivos)
- **E2E:** 62/62 (12 specs)
- **Build de Produção (`tsc -b && vite build`):** ✅ **Exit Code 0 — Sucesso em ~1 min** (sem OOM)

---

## Fase 11 — Validação Gate 0 & Persistência de Histórico
> Data de Conclusão: 2026-09-06 | Status: ✅ Validado (Gate 0 Verde)

### Objetivo
Resolver a falha do Gate 0 (Sessão 11) onde o output do terminal era perdido ao fechar e reabrir o painel, mesmo com o WebSocket persistindo no `TerminalSessionProvider`. A solução exige que a interface recupere o estado visual do PTY ao remontar.

### Entregáveis
- `src/hooks/usePtySession.ts` — Implementação de `outputBuffer` (Ref) para acumular a saída do PTY (limite 1MB). Ao registrar um novo listener via `onOutput`, o buffer é enviado imediatamente, restaurando a tela do terminal.

### Métricas de Teste
- **Gate 0 (E2E):** `npx playwright test e2e/gate0_validation.spec.ts` aprovado.
- **Resultado:** Confirmação de que "GATE0_TEST" permanece visível após a sequência Abrir → Digitar → Fechar → Reabrir.



---

## Fase 13 — REALINHAMENTO DO BLUEPRINT DO TERMINAL REAL
> Data de Conclusão: 2026-09-07 | Status: ✅ Documentação sincronizada (sem execução de código)

### Objetivo
Atualizar a documentação viva para refletir o `BLUEPRINT_TERMINAL_REAL.md` Revisão 3, após o diagnóstico da regressão Arena (`RC1`–`RC4`) e antes de qualquer nova implementação no terminal.

### Entregáveis
- `documentacao_viva/BLUEPRINT_TERMINAL_REAL.md` — promovido para a **Revisão 3** aprovada.
- `documentacao_viva/CURRENT_STATE.md` — handoff reescrito para deixar explícito que o terminal foi reaberto e agora segue a sequência `E1 -> E2 -> E3 -> E4`.
- `documentacao_viva/BACKLOG_FUTURO.md` — inclusão da **Onda TR** com os itens `TR-01` a `TR-04` e contratos imutáveis da revisão.
- `documentacao_viva/DECISION_LOG.md` — registro formal da substituição da arquitetura de discovery por servidor único, da nova estratégia de paridade visual e da regra de não considerar o terminal encerrado antes do fechamento da Revisão 3.

### Observações de Validação
- **Nenhum gate foi reexecutado nesta fase documental.**
- A última evidência real continua em `documentacao_viva/GATES_EXECUCAO.md`:
  - §6 = Gate 0 histórico verde de 2026-09-06
  - §7 = diagnóstico de regressão Arena em 2026-09-07
- A próxima execução válida do terminal deve começar pela **Fase E1 / TR-01** e só avançar após a sonda real ficar verde.

---

## Fase 14 — E2 SERVIDOR ÚNICO / PORTA ÚNICA (VALIDAÇÃO LOCAL)
> Data de Conclusão: 2026-09-08 | Status: ✅ Validado localmente com 100% de sucesso

### Objetivo
Validar localmente (Windows) a migração do terminal para arquitetura single-port `/pty`, eliminando o processo standalone `pty-server` com discovery de porta (7681–7699) e endpoint `/pty-port`. Confirmar que app + WebSocket do terminal são servidos na mesma origem, em dev e produção.

### Validações Executadas (Todas com Evidência Real)

| Componente | Comando | Exit Code | Resultado |
|------------|---------|-----------|-----------|
| **PTY Server** | `npm ci` | 0 | ✅ 11 pacotes auditados em 3s |
| | `npm run typecheck` | 0 | ✅ 0 erros TypeScript (`tsc --noEmit`) |
| | `npm test` | 0 | ✅ 5/5 testes passando (detecção de shell, spawn PTY, ponte WS single-port, fallback timers) |
| | `npm run build` | 0 | ✅ Compilado para `dist/` |
| **App Principal** | `npm ci` | 0 | ✅ 498 pacotes auditados em 14s |
| | `npm run typecheck` | 0 | ✅ 0 erros TypeScript (`tsc -b --force`) |
| | `npm test` | 0 | ✅ 44 arquivos / 371 testes passando (Vitest) |
| **Dev Integrado** | `npm run dev` | — | ✅ Sobe em 5173, terminal via `/pty` same-origin |
| **Probe Terminal (dev)** | `node probe-terminal.mjs` | 0 | ✅ `PROBE_OK` (prompt, echo e PID preservado) |
| **Gate 0 E2E (dev)** | `npx playwright test e2e/gate0_validation.spec.ts` | 0 | ✅ 1/1 passed (prompt antes do input, mesmo PID após toggle) |
| **Sessão 11 E2E (dev)** | `npx playwright test e2e/sessao_11_terminal_pty_real.spec.ts` | 0 | ✅ 6/6 passed (T1 a T6 100% verdes em 23.2s) |
| **Build Local** | `npm run build` | 0 | ✅ Exit code 0 em 28.22s, chunks otimizados (manualChunks) |
| **Preview Integrado** | `npm run preview` | — | ✅ Sobe em 4173, serve `dist/` + terminal `/pty` same-origin |
| **Probe Terminal (preview)** | `BASE_URL=http://localhost:4173 node probe-terminal.mjs` | 0 | ✅ `PROBE_OK` em produção integrada |
| **Gate 0 E2E (preview)** | `BASE_URL=http://localhost:4173 npx playwright test e2e/gate0_validation.spec.ts` | 0 | ✅ 1/1 passed em produção integrada |

### Critérios de Aceite da E2 — Todos Atendidos ✅

1. ✅ Terminal conecta via `/pty` na mesma origem da app (dev 5173, preview 4173)
2. ✅ Fluxo principal **não depende mais** de `discoverPtyPort()` — `grep -r` retorna vazio
3. ✅ Fluxo principal **não depende mais** de `/pty-port` — `grep -r` retorna vazio
4. ✅ Em dev, app sobe e terminal funciona sem processo separado obrigatório no fluxo principal
5. ✅ E1 preservada:
   - Prompt antes do input ✅ (Gate 0, Sessão 11 T1, probe)
   - `echo` no output ✅ (Gate 0, Sessão 11 T1, probe)
   - Mesmo PID após toggle ✅ (Gate 0, Sessão 11 T6, probe)
   - Scrollback preservado ✅ (Sessão 11 T6)
   - Erro visível/honesto ✅ (Sessão 11 T5)
6. ✅ Build local da app passa (exit code 0 em 28.22s)
7. ✅ Preview/produção integrada serve app + terminal com mesma origem (`server.mjs` + `vite-plugin-pty.ts`)

### Arquivos Principais da E2 Confirmados

**Novos/Alterados:**
- `pty-server/src/singlePort.ts` — Ponte WebSocket single-port (`/pty`), `createPtyWebSocketBridge()`, `assertNodePtyAvailable()`
- `pty-server/src/ptyManager.ts` — Ajuste de finalização no Windows (`ptyProcess.kill()` sem sinal) e `.unref()` nos timers
- `pty-server/src/index.ts` — Processo standalone aposentado (mantido apenas para compat, não usado no fluxo principal)
- `pty-server/src/__tests__/ptyServer.test.ts` — Testes da ponte single-port e reconexão mesmo PTY
- `02_replica_final/src/hooks/usePtySession.ts` — Resolve WS same-origin em `/pty` via `location.host`, sem discovery
- `02_replica_final/vite-plugin-pty.ts` — Plugin Vite integra PTY no dev server via `upgrade`
- `02_replica_final/vite.config.ts` — Registra `ptyPlugin()`, `server.host = '0.0.0.0'`
- `02_replica_final/server.mjs` — Preview/produção integrado: Express/HTTP + WS `/pty` + static `dist/`
- `02_replica_final/probe-terminal.mjs` — Sonda E1/E2 com waitForFunction para renderização de prompt
- `02_replica_final/package.json` — Script `preview` builda pty-server e roda `server.mjs`

### Próximo Passo
**Fase E3 — Paridade Visual do Terminal** (TR-03 no BACKLOG_FUTURO.md):
- Tokens de cor, CSS e ícones do VS Code real sobre `xterm.js`
- `TerminalTabsList.tsx` com abas à direita, tema `#1e1e1e`, borda ativa correta
- Screenshot E2E como critério de aceite




---

## Fase 15 — INTERNALIZAÇÃO DO PLANO OPERACIONAL DA E3
> Data de Conclusão: 2026-09-09 | Status: ✅ Documentação sincronizada para início da execução

### Objetivo
Absorver o blueprint detalhado da **Onda TR — Fase E3 (Paridade Visual do Terminal)** pela governança viva do projeto, mover `TR-03` para **EM ANDAMENTO** e deixar explícito o próximo passo operacional da implementação sem reabrir E1/E2.

### Entregáveis
- `KANBAN.md` — `TR-03` movido para **EM ANDAMENTO**, com referência ao blueprint detalhado e próxima ação definida como **Etapa 0**.
- `documentacao_viva/CURRENT_STATE.md` — handoff reescrito para refletir que a E3 agora está internalizada e pronta para execução direta.
- `documentacao_viva/BACKLOG_FUTURO.md` — Onda TR atualizada com `TR-03` em andamento, decisões operacionais da E3 e topologia real same-origin da E2.
- `documentacao_viva/DECISION_LOG.md` — registro formal da internalização do plano, da correção do contrato textual de host/porta e das decisões fechadas da E3.
- `documentacao_viva/BLUEPRINT_TERMINAL_REAL.md` — macro-blueprint passa a apontar explicitamente para o plano detalhado em `terminal_vscode_completo/plano_implementacao/`.

### Observações de Validação
- **Nenhum gate de código foi reexecutado nesta fase documental.**
- A última evidência executada do terminal continua em `documentacao_viva/GATES_EXECUCAO.md`, especialmente a validação local da E2 e os gates históricos do terminal real.
- A fase seguinte deixa de ser "planejar a E3" e passa a ser **executar a Etapa 0 do plano detalhado**.

---

## Fase 16 — E3 ETAPA 4 / TERMINALGROUP + SPLITSASH
> Data de Conclusão: 2026-09-09 | Status: ✅ Código e validação concluídos

### Objetivo
Introduzir a camada visual redimensionável do split do terminal, extraindo `TerminalGroup` e `SplitSash`, sem quebrar a base same-origin em `/pty`, a persistência do PTY e os fluxos já estabilizados das Etapas 0–3.

### Entregáveis
- `src/components/terminal/TerminalGroup.tsx` — novo compositor do grupo de panes do terminal.
- `src/components/terminal/SplitSash.tsx` — separador real com drag para redimensionamento horizontal do split.
- `src/components/TerminalPanel.tsx` — adoção de `splitRatio`, delegação do split ao `TerminalGroup` e reexecução de `fitAndSync()` após resize.
- `src/styles/terminal-vscode.css` — estilos do sash e das panes agrupadas.
- `src/__tests__/SplitSash.test.tsx` e `src/__tests__/TerminalGroup.test.tsx` — nova cobertura unitária.
- `e2e/sessao_11d_split_sash.spec.ts` — validação prática do sash com redimensionamento real e terminal funcional depois do resize.

### Validação Executada
- `npm run typecheck` ✅
- `npx vitest run src/__tests__/SplitSash.test.tsx src/__tests__/TerminalGroup.test.tsx src/__tests__/PanelTabs.test.tsx src/__tests__/ShellPicker.test.tsx src/__tests__/terminalInstances.test.ts src/__tests__/TerminalInstanceTabs.test.tsx src/__tests__/TerminalPanel.test.tsx src/__tests__/themeTokens.test.ts src/__tests__/usePtySession.test.ts` ✅ (`9 arquivos / 26 testes`)
- `node probe-terminal.mjs` ✅ (`PROBE_OK`, `PID=3765`)
- `npx playwright test e2e/gate0_validation.spec.ts e2e/sessao_11_terminal_pty_real.spec.ts e2e/sessao_11b_visual.spec.ts e2e/sessao_11c_clear_active.spec.ts e2e/sessao_11d_split_sash.spec.ts` ✅ (`10/10`)
- VS Code restaurado com `TMPDIR=/home/user/.cache bash /home/user/restore-code-server.sh` e novo start do serviço em `:8080` ✅

### Resultado Líquido
- Split do terminal agora tem **sash real e redimensionável**.
- As duas panes continuam funcionais após o resize.
- A base E1/E2, a multi-instância da Etapa 2 e o `clear` focado da Etapa 3 permaneceram verdes.
- Próxima frente operacional: **Etapa 5** (tema reativo completo + estados erro/closed/maximizado refinados).

---

## Fase 17 — E3 ETAPA 5 / TEMA REATIVO + ESTADOS POR INSTÂNCIA
> Data de Conclusão: 2026-09-09 | Status: ✅ Código e validação concluídos

### Objetivo
Fechar a Etapa 5 da E3 garantindo troca de tema dark/light no xterm sem recriar PTY, exposição de estado real por instância e feedback honesto para `error`/`closed`, preservando a base same-origin estabilizada nas fases E1/E2.

### Entregáveis
- `src/hooks/useXtermTerminal.ts` — reaplicação de `theme` na instância viva com `refresh()` e `fitAndSync()` sem recriar terminal.
- `src/components/terminal/TerminalView.tsx` — exposição de `data-pty-status`, `data-pty-pid` e `data-pty-shell-path` por instância/pane.
- `src/components/TerminalPanel.tsx` — banner de estado para `error`/`closed` e leitura da sessão visível para feedback operacional honesto.
- `src/styles/terminal-vscode.css` — refinamentos visuais dos estados `error`/`closed` e do banner.
- `src/__tests__/useTerminalTheme.test.ts`, `src/__tests__/useXtermTerminal.test.tsx` e ajuste em `src/__tests__/TerminalPanel.test.tsx` — cobertura unitária da Etapa 5.
- `e2e/sessao_11e_theme_states.spec.ts` — validação prática da troca de tema sem recriar PTY e do estado `closed` com scrollback preservado.

### Validação Executada
- `npm run typecheck` ✅
- `npx vitest run src/__tests__/SplitSash.test.tsx src/__tests__/TerminalGroup.test.tsx src/__tests__/PanelTabs.test.tsx src/__tests__/ShellPicker.test.tsx src/__tests__/terminalInstances.test.ts src/__tests__/TerminalInstanceTabs.test.tsx src/__tests__/TerminalPanel.test.tsx src/__tests__/themeTokens.test.ts src/__tests__/usePtySession.test.ts src/__tests__/useTerminalTheme.test.ts src/__tests__/useXtermTerminal.test.tsx` ✅ (`11 arquivos / 29 testes`)
- `node probe-terminal.mjs` ✅ (`PROBE_OK`, `PID=4963`)
- `npx playwright test e2e/gate0_validation.spec.ts e2e/sessao_11_terminal_pty_real.spec.ts e2e/sessao_11b_visual.spec.ts e2e/sessao_11c_clear_active.spec.ts e2e/sessao_11d_split_sash.spec.ts e2e/sessao_11e_theme_states.spec.ts` ✅ (`12/12`)

### Resultado Líquido
- O tema do terminal agora reage ao toggle dark/light **sem recriar PTY**.
- Cada instância/pane expõe seu próprio estado operacional e metadados essenciais no DOM.
- `closed` mantém scrollback visível e `error`/`closed` exibem feedback honesto no painel.
- Próxima frente operacional: **E4** (build de fechamento + arquivamento documental final da Onda TR).


---

## Fase 18 — E3 ETAPA 6 / CONTEXTO DO TERMINAL + REGRESSÃO MOBILE
> Data de Conclusão: 2026-09-09 | Status: ✅ Parcial da Etapa 6 concluído

### Objetivo
Abrir a Etapa 6 em bloco pequeno e seguro, integrando o menu de contexto do terminal com ações reais por instância/pane e revalidando que a camada visual do terminal não quebrou o modo mobile/single-pane.

### Entregáveis
- `src/components/TerminalPanel.tsx` — integra `ContextMenu` reutilizável ao terminal e direciona ações para a instância/pane focada.
- `src/components/terminal/TerminalView.tsx` — passa a encaminhar `onContextMenu` e expõe operações de seleção na handle da view.
- `src/hooks/useXtermTerminal.ts` — adiciona `hasSelection()`, `getSelection()` e `selectAll()` sem recriar o terminal.
- `src/__tests__/TerminalPanel.test.tsx` — nova cobertura unitária do menu de contexto.
- `e2e/sessao_11f_context_menu.spec.ts` — validação prática do botão direito, fechamento com Escape e kill honesto via contexto.

### Validação Executada
- `npm ci` no app e no `pty-server` ✅ (restauração de dependências para reexecutar os gates)
- `npm run typecheck` ✅
- `npx vitest run src/__tests__/SplitSash.test.tsx src/__tests__/TerminalGroup.test.tsx src/__tests__/PanelTabs.test.tsx src/__tests__/ShellPicker.test.tsx src/__tests__/terminalInstances.test.ts src/__tests__/TerminalInstanceTabs.test.tsx src/__tests__/TerminalPanel.test.tsx src/__tests__/themeTokens.test.ts src/__tests__/usePtySession.test.ts src/__tests__/useTerminalTheme.test.ts src/__tests__/useXtermTerminal.test.tsx` ✅ (`11 arquivos / 31 testes`)
- `node probe-terminal.mjs` ✅ (`PROBE_OK`, `PID=5675`)
- `npx playwright test e2e/gate0_validation.spec.ts e2e/sessao_11_terminal_pty_real.spec.ts e2e/sessao_11b_visual.spec.ts e2e/sessao_11c_clear_active.spec.ts e2e/sessao_11d_split_sash.spec.ts e2e/sessao_11e_theme_states.spec.ts e2e/sessao_11f_context_menu.spec.ts e2e/sessao_06_mobile.spec.ts` ✅ (`19/19`)
- VS Code restaurado e religado em `:8080`; app Vite religada em `:5173` ✅

### Resultado Líquido
- O terminal agora abre menu de contexto via botão direito com `Copiar`, `Colar`, `Selecionar tudo`, `Limpar terminal` e `Encerrar processo`.
- As ações respeitam a instância/pane focada, sem regressão perceptível na base E1/E2/E3 já verde.
- A régua mobile (`sessao_06_mobile`) permaneceu verde após o novo encaixe visual/comportamental.
- **Ainda falta concluir a Etapa 6** com limpeza/consolidação final de CSS, suíte completa de fechamento e build da E4.


---

## Fase 19 — E3 ETAPA 6 / LIMPEZA FINAL DE CSS + ALINHAMENTO DE TESTES
> Data de Conclusão: 2026-09-09 | Status: ✅ Código e validação concluídos

### Objetivo
Fechar a Etapa 6 da E3 removendo CSS legado/duplicado do terminal do `app.css`, consolidando o chrome do terminal nos stylesheets dedicados e realinhando os contratos estáticos da suíte para a arquitetura final da E3.

### Entregáveis
- `src/styles/app.css` — remoção dos blocos legados/duplicados do terminal que já pertenciam à camada dedicada.
- `src/styles/terminal-vscode.css` — consolidação das regras do terminal, incluindo variantes `single-pane` e `custom-view-active`.
- `src/__tests__/layoutDensity.test.ts` — contratos de layout do terminal passam a validar os arquivos dedicados de CSS e os imports em `main.tsx`.
- `src/__tests__/iconLabels.test.ts` — contratos de ícones do terminal passam a refletir a composição por subcomponentes (`TerminalActionBar`, `ShellPicker`, `TerminalInstanceTabs`).
- `src/__tests__/performance.test.tsx` — contratos de listeners/dispose passam a mirar `TerminalView`, `SplitSash` e `useXtermTerminal`.

### Validação Executada
- `npm ci` no app e no `pty-server` ✅
- `npm run typecheck` ✅
- `npm run test` ✅ (`52 arquivos / 389 testes`)
- `node probe-terminal.mjs` ✅ (`PROBE_OK`, `PID=6939`)
- `npx playwright install chromium && npx playwright install-deps chromium` ✅
- `npx playwright test e2e/sessao_11_terminal_pty_real.spec.ts e2e/sessao_11c_clear_active.spec.ts e2e/sessao_11d_split_sash.spec.ts` ✅ (`8/8`)

### Resultado Líquido
- O CSS do terminal ficou **isolado** na camada dedicada (`terminal-vscode.css` + `xterm-vscode.css`).
- Os contratos estáticos foram alinhados à arquitetura final da E3, eliminando acoplamentos antigos ao `app.css` e ao `TerminalPanel` monolítico.
- A régua prática continuou verde após a limpeza final, incluindo abrir terminal, maximizar/restaurar, split, digitação e `clear`.
- Próxima frente operacional: **E4** (build de fechamento + arquivamento documental final).
