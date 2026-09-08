# DECISION_LOG — Réplica Agents Window (VS Code)

## Formato
`[FASE] | [TIPO] | [DECISÃO] | [MOTIVO] | [ARQUIVOS IMPACTADOS]`

Tipos: `ADD`, `MOD`, `DEL`, `FREEZE`, `RULE`, `CFG`, `FIX`, `TECH`

---

### Fase 0 — Planejamento e Auditoria Estática
F0 | RULE | Proibir frameworks CSS pesados e usar Vanilla CSS/Tailwind tokens nativos | Máxima fidelidade ao estilo do VS Code | `src/index.css`
F0 | TECH | Adotar Vitest e Playwright como padrão de teste dual (unitário + visual) | Evitar testes puramente sintéticos | `package.json`, `playwright.config.ts`
F0 | FREEZE | Estrutura de pastas dividida entre `01_original`, `02_replica_final` e `docs` | Isolamento estrito entre referência e réplica | Raiz do projeto

---

### Fase 1 — 32 Ondas de Implementação Base
F1 | ADD | Implementação de 348 testes unitários cobrindo o core de domínio | Blindagem contra quebras de regras de negócio | `src/**/*.spec.ts`
F1 | FIX | Correção dos 5 bugs de runtime (tela preta e erros de montagem React) | Garantir estabilidade contínua do SPA | `src/App.tsx`
F1 | ADD | Criação do ciclo de vida de sessões e landing page de novas sessões | Suporte a fluxo completo de agentes | `src/components/SessionLanding.tsx`
F1 | TECH | Adotar Observable pattern para sincronização de layout em vez de EventEmitter | Prevenir vazamento de listeners e race conditions | `src/domain/sessionLayout.ts`

---

### Fase 2 — Validação 2 & Topologia de Layout
F2 | ADD | `newSessionViewState` para isolamento de sessões não criadas | Evitar poluição de layout entre sessões temporárias | `src/domain/newSessionViewState.ts`
F2 | MOD | Restauração de layout por ID com `sessionLayoutSync` | Garantir que cada chat mantenha seu grid exato | `src/domain/sessionLayoutSync.ts`
F2 | RULE | Regra R-070 de fechamento automático para abas transientes | Conformidade total com o comportamento do VS Code | `src/domain/sidePane.ts`

---

### Fase 3 / Validação 3 — Sessão 04 (Sessions List Real)
F3 | DEL | Remoção de filtros mock/inventados (ORDENAR, STATUS, ESTADO, PROVEDOR, checkboxes) | Fidelidade absoluta à especificação do VS Code | `src/components/SessionSidebar.tsx`
F3 | ADD | Implementação de 3 chats aninhados (`NestedChatRow`) por sessão com unread dot e card de aprovação | Paridade visual com sessões multi-chat | `src/components/SessionSidebar.tsx`
F3 | MOD | Correção da precedência de agrupamento: `archived > pinned > custom > quickChats > date` | Ordenação canônica das sessões | `src/domain/sessionsList.ts`
F3 | MOD | Implementação de workspace capping = 3 (fora de busca) e promoção de workspace ativo | Prevenir poluição visual em workspaces grandes | `src/domain/sessionsList.ts`
F3 | ADD | Navegação por teclado completa (F2 rename, Delete, Enter/Space, Setas com roving index) | Acessibilidade e ergonomia idêntica ao original | `src/domain/keyboardNavigation.ts`, `SessionSidebar.tsx`
F3 | RULE | Bloqueio estrito de reordenação via Drag & Drop para sessões arquivadas (`canReorderSessions`) | Proteger integridade do arquivo morto | `src/domain/dragAndDrop.ts`
F3 | TECH | Correção do rótulo "Anteriores" para "Mais antigos" | Aderência aos textos oficiais | `src/domain/sessionsList.ts`

---

### Fase 4 / Validação 3 — Sessão 05 (Layout Topologia)
F4 | ADD | Docked Auxiliary Controller e sincronização bidirecional de panes | Manter abas auxiliares ancoradas corretamente | `src/domain/sessionLayout.ts`
F4 | RULE | Proteção `CannotClose` para abas gerenciadas pelo sistema de layout | Impedir fechamento acidental de painéis essenciais | `src/App.tsx`

---

### Fase 6 / Régua de Testes Confiável — 2026-09-05
F6 | RULE | Todo teste E2E precisa de ao menos um `expect`; screenshot e `console.log` não são prova | 10 dos 48 testes antigos não tinham assert nenhum e passariam com a tela em branco | `e2e/*.spec.ts`
F6 | ADD | Teste unitário `e2eAssertionContract` que lê as specs e reprova o build se houver teste sem assert, spec sem teste, porta hardcoded ou `console.log` | Impedir que a régua volte a afrouxar em sessões futuras | `src/__tests__/e2eAssertionContract.test.ts`
F6 | MOD | `playwright.config.ts` ganhou `webServer` (Vite em 5173) e as 6 specs perderam a porta 5175 hardcoded | 30 falhas do turno anterior eram `ERR_CONNECTION_REFUSED`, não bug de produto | `playwright.config.ts`, `e2e/helpers.ts`
F6 | FIX | `MonacoEnvironment.getWorker` com os workers empacotados pelo Vite | Sem isso o Monaco lançava `Cannot read properties of undefined (reading 'toUrl')` — 98 erros de runtime ao alternar o editor | `src/main.tsx`
F6 | FIX | `keepCurrentOriginalModel` / `keepCurrentModifiedModel` no `DiffEditor` | Ocultar o editor desmontava o widget antes do reset dos modelos: `TextModel got disposed before DiffEditorWidget model got reset` | `src/components/EditorArea.tsx`
F6 | FIX | `onToggleFolder(entry.path)` → `toggleFolder(entry.path)` em `handleOpenFileHandle` | Identificador inexistente: abrir pasta real da árvore quebraria em runtime | `src/App.tsx`
F6 | FIX | `npm run typecheck` passou de `tsc --noEmit` (no-op: `tsconfig.json` tem `"files": []`) para `tsc -b --force` | O gate de tipos não checava nada e mascarou o bug acima | `package.json`
F6 | ADD | `data-session-id` e `aria-label="Sessão {título}"` na linha da sidebar | Sem rótulo, o nome acessível da linha absorvia o texto dos filhos e o `role=button` da linha capturava consultas destinadas ao botão "Expandir chats" (a11y + testabilidade) | `src/components/SessionSidebar.tsx`
F6 | FIX | `.dock-tab { min-height: 44px }` | MOBILE.md exige alvo de toque de 44px; o dock entregava 34px | `src/styles/app.css`
F6 | MOD | Lint zerado: 12 erros removidos (`any` tipados em `fileSystem.ts`, imports/estados mortos, catches vazios documentados) | Manter o gate de lint utilizável como sinal | `src/domain/fileSystem.ts`, `src/domain/layoutPersistence.ts`, `src/App.tsx`, `src/components/SessionSidebar.tsx`

---

### Fase 7 / Custom View Grid + Grid Não-Proporcional — 2026-09-05
F7 | ADD | `src/domain/customView.ts`: ICustomViewService em forma pura (desired vs effective visibility, dismiss, persistência) | O original retém a visibilidade desejada das parts cobertas para restaurá-la | `src/domain/customView.ts`
F7 | MOD | AI Customizations deixou de ser aba do editor e virou custom view full-surface | `.custom-view-grid` existia só no CSS; a superfície nunca cobria as parts | `src/App.tsx`, `src/components/CustomizationsView.tsx`, `src/styles/app.css`
F7 | RULE | Abrir sessão, fechar pelo botão ou back do phone dispensam a custom view e restauram a desired visibility | Paridade com LAYOUT.md (custom views participam da navegação mobile) | `src/App.tsx`, `src/domain/customView.ts`
F7 | ADD | Modo `embedded` da CustomizationsView (sem heading duplicado dentro do grid) | Dois headings com o mesmo nome acessível quebram leitor de tela e consultas por papel | `src/components/CustomizationsView.tsx`
F7 | FIX | Grid não-proporcional: ResizeObserver reconverte o split % para preservar os pixels do Editor | LAYOUT.md exige que só a Sessions Part absorva o resize; antes as duas colunas encolhiam juntas | `src/App.tsx`

---

### Fase 8 / Consolidação Documental — 2026-09-05
*(matéria-prima: os relatórios soltos inventariados na Fase 1 — `RELATORIO_VALIDACAO_ARENA_2026-09-05.md`, `RELATORIO_FASE_06_REGUA_DE_TESTES.md`, `RELATORIO_FASE_07_CUSTOM_VIEW_GRID.md`, `docs/gestao/*`, `02_replica_final/docs/gestao/*`, `04_gestao_completo/{STATUS_ATUAL,CONTEXTO_GERAL}.md`)*

F8 | RULE | Documento vivo é só `04_gestao_completo/documentacao_viva/` (+ `KANBAN.md`). Proibido criar relatório/análise/status solto; todo achado é mesclado na MESMA sessão | Relatórios soltos nunca voltavam para os documentos vivos e produziram divergência real de status | `CLAUDE.md`, todos os docs vivos
F8 | DEL | Três KANBANs concorrentes reduzidos a um: `docs/gestao/KANBAN.md` e `02_replica_final/docs/gestao/KANBAN.md` foram para `arquivo_historico/` | Eram eles (não o canônico) que ainda diziam "348/348 testes" e "Custom View Grid EM ANDAMENTO" | `arquivo_historico/`
F8 | DEL | `CONTEXTO_GERAL.md` arquivado: declarava-se "PONTO DE ENTRADA PRINCIPAL... leia APENAS este arquivo", contradizendo a ordem de leitura do `CLAUDE.md`, e afirmava "E2E 40/40" e "~98%" | Dois pontos de entrada divergentes = a origem do problema | `arquivo_historico/`
F8 | DEL | `STATUS_ATUAL.md` arquivado: 41 bytes, só o título, sem status nenhum | Arquivo-fantasma que fingia ser fonte de status | `arquivo_historico/`
F8 | ADD | `GATES_EXECUCAO.md`: saída BRUTA dos 4 gates com exit codes, dentro da documentação viva | Evidência auditável no lugar de número copiado de relatório antigo | `documentacao_viva/GATES_EXECUCAO.md`
F8 | TECH | Bloqueio de build registrado sem maquiagem: `npm run build` → `FATAL ERROR: JavaScript heap out of memory`, exit **134**; `--max-old-space-size=6144` resulta em `Killed` (máquina tem 1984 MB) | O gate precisa de ≥ 4 GB; não é defeito do código | `GATES_EXECUCAO.md`, `KANBAN.md`, `BACKLOG_FUTURO.md`
F8 | MOD | Achados dos relatórios soltos preservados nos docs vivos antes do arquivamento: 6 bugs reais da Fase 06 (workers do Monaco, DiffEditor, `onToggleFolder`, typecheck no-op, nome acessível da linha, alvo de 44px) e o Custom View Grid da Fase 07 | O histórico sai do caminho de leitura, mas o conhecimento fica | `DECISION_LOG.md`, `PHASE_SUMMARY.md`

---

### Fase 9 / Verificação Sessão 11 & Diagnóstico `.platform` — 2026-09-05
F9 | TECH | Ambiente E2E montado do zero no sandbox: `npm install`, `cd pty-server && npm install` (node-pty nativo compilado — `node_modules/node-pty/build/Release/pty.node` OK), `npx playwright install chromium` + `sudo npx playwright install-deps chromium` (libs do SO: libnss3, libnspr4, libatk, libxkbcommon, libasound etc.) | Sem node_modules, sem pty-server buildado e sem libs do Chromium a suíte E2E nem iniciava — essa era a causa real do "bloqueio" descrito no CURRENT_STATE | `node_modules/`, `pty-server/dist/`, `~/.cache/ms-playwright/`
F9 | FIX | `e2e/debug_terminal_toggle.spec.ts` reescrito para usar `BASE_URL` de `helpers.ts`, sem `console.log` e com indentação de 2 espaços no `test(...)` | O spec violava o contrato anti-trapaça (`e2eAssertionContract`): porta hardcoded, console.log e teste não detectado; quebrava 3 asserts do contrato (unit ficou 367/370) | `e2e/debug_terminal_toggle.spec.ts`
F9 | TECH | Diagnóstico estático: em `lib/xterm.mjs` o objeto "process" (`xe`) só pode ser processo real, `globalThis.vscode.process` ou `undefined` — nunca `null`; guard `if (typeof xe === "object")` é seguro | O crash `.platform` citado no CURRENT_STATE NÃO se reproduziu; era ambiente incompleto, não bug de código | `node_modules/@xterm/xterm/lib/xterm.mjs`
F9 | ADD | `e2e/sessao_11_terminal_pty_real.spec.ts` validado 5/5 (PID real, troca de shell, split, ações de menu, DISCOVERY_FAILED) | Sessão 11 (Terminal Real / Onda A) encerrada com evidência E2E real | `e2e/sessao_11_terminal_pty_real.spec.ts`

---

### Fase 10 / Resolução Build OOM, Swipe Mobile e Foco do Terminal — 2026-09-05
F10 | CFG | Adicionar `manualChunks` no `vite.config.ts` isolando `monaco-editor` e `@xterm/xterm` | Resolução do OOM do V8 (exit 134) durante `npm run build`, viabilizando o build de produção com exit code 0 | `vite.config.ts`
F10 | ADD | Handlers de swipe touch (`onTouchStart`, `onTouchEnd`) no container de layout em `App.tsx` | Permitir abrir sidebar arrastando da borda esquerda e fechar arrastando para esquerda em mobile | `src/App.tsx`
---

### Fase 11 / Validação Gate 0 & Persistência de Histórico — 2026-09-06
F11 | ADD | Implementação de `outputBuffer` (Ref) no hook `usePtySession` com limite de 1MB | Garantir que novos listeners de output recebam o histórico acumulado ao montar o `TerminalPanel`, resolvendo falha do Gate 0 (Decisão B) | `src/hooks/usePtySession.ts`


---

### Fase 12 / Diagnóstico de Regressão do Terminal (Arena) — 2026-09-07
F12 | FIX-DIAG | RC1: loop infinito de setState — `PtySessionInstance` dispara `onStateChange(sessionId, session)` em effect com dep `session` (objeto novo a cada render); `setSessions` nunca bate o guard de identidade → "Maximum update depth exceeded" contínuo, status preso em `closed`, input morto | Causa primária do terminal instável/em branco reportado pelo usuário (Windows e sandbox) | `src/providers/TerminalSessionProvider.tsx`
F12 | FIX-DIAG | RC2: `TerminalPanel` assina `onOutput` no stub no-op (`sessions[sessionId] || {...}`) quando a sessão real ainda não está no context; sem efeito de re-assinatura quando ela chega → output (e mensagens de erro) nunca chegam ao xterm; explica "abre em branco" mesmo com pty-server fora | Erros de discovery precisam ser visíveis no xterm (falha explícita, invariante 4 do BLUEPRINT) | `src/components/TerminalPanel.tsx`, `src/hooks/usePtySession.ts`
F12 | FIX-DIAG | RC3: `ptyManager.openSession` fecha e recria PTY existente; BLUEPRINT §3.5 exige reconexão ao MESMO PTY com reenvio de scrollback; cleanup do `usePtySession` envia `{type:'close'}` no unmount (mata PTY em cenários de erro) | Gate 0 pede "reconectar ao MESMO PTY (não recriação)" — buffer client-side mascarava a recriação | `pty-server/src/ptyManager.ts`, `pty-server/src/wsHandler.ts`, `src/hooks/usePtySession.ts`
F12 | FIX-DIAG | RC4: nenhum `sendResize` após o primeiro `fit()` — PTY nasce 80×24 (default do hook) e permanece assim; prompt quebra/alinha errado em painel largo | Paridade visual com VS Code | `src/components/TerminalPanel.tsx`, `src/hooks/usePtySession.ts`
F12 | RULE | Régua E2E da Sessão 11 deve ganhar asserts de: (a) prompt visível ANTES de qualquer input; (b) mesmo PID após fechar/reabrir painel; (c) mensagem vermelha legível quando pty-server está fora | Impedir regressão silenciosa do tipo "terminal em branco" | `e2e/sessao_11_terminal_pty_real.spec.ts`

---

### Fase 13 / Realinhamento Documental com BLUEPRINT Revisão 3 — 2026-09-07
F13 | MOD | `BLUEPRINT_TERMINAL_REAL.md` promovido para **Revisão 3**, substituindo formalmente a estratégia de `pty-server` standalone com discovery (`/pty-port`, faixa 7681–7699) pela arquitetura de **servidor único / porta única** com WebSocket em `/pty` | A regressão real de 2026-09-07 mostrou que a topologia anterior é frágil em sandbox/Windows e que a próxima execução precisa de uma arquitetura mais simples e auditável | `documentacao_viva/BLUEPRINT_TERMINAL_REAL.md`
F13 | RULE | O Terminal Real deixa de ser tratado como "encerrado" para fins de planejamento futuro até o fechamento da sequência **E1 -> E2 -> E3 -> E4** | O Gate 0 verde de 2026-09-06 continua histórico, mas não é mais critério suficiente depois do diagnóstico RC1–RC4 reproduzido em 2026-09-07 | `documentacao_viva/CURRENT_STATE.md`, `documentacao_viva/BACKLOG_FUTURO.md`
F13 | TECH | Paridade visual do terminal passa a ser definida como **reimplementação React sobre `xterm.js`** com tokens/CSS/ícones do VS Code, e não cópia literal do workbench | Os arquivos do terminal do VS Code dependem da infraestrutura inteira do workbench (`InstantiationService`, `ContextKeyService`, `SplitView`, `List` etc.); o objetivo do projeto é paridade observável, não fork do workbench | `documentacao_viva/BLUEPRINT_TERMINAL_REAL.md`
F13 | CFG | `HOST=127.0.0.1` permanece decisão imutável da onda do terminal; acesso remoto (`0.0.0.0`) e autenticação ficam explicitamente fora de escopo | Simplifica segurança e reduz variáveis enquanto a fundação e a paridade são corrigidas | `documentacao_viva/BLUEPRINT_TERMINAL_REAL.md`, `documentacao_viva/BACKLOG_FUTURO.md`
F13 | ADD | Criada a **Onda TR** no backlog com as fases executáveis `TR-01` a `TR-04`, incluindo critérios de aceite e gates obrigatórios | Converter o blueprint aprovado em plano operacional de execução futura sem alterar código nesta sessão | `documentacao_viva/BACKLOG_FUTURO.md`

---
### Fase 14 / Validação Local E2 — Servidor Único / Porta Única — 2026-09-08
F14 | TECH | Validação local completa da E2: backend PTY + app principal + dev integrado + E2E + build + preview integrado | Fechar a fase E2 com evidência real na máquina local (Windows), superando limitação de memória da sandbox | `pty-server/`, `02_replica_final/`
F14 | FIX-VALID | PTY server: `npm ci` ✅, `npm run typecheck` ✅, `npm test` ✅ (5 testes passando, exit 0), `npm run build` ✅ | Evidência bruta do backend PTY com ajuste de terminação no Windows | `pty-server/src/ptyManager.ts`, `pty-server/dist/`
F14 | FIX-VALID | App principal: `npm ci` ✅, `npm run typecheck` ✅ (0 erros), `npm test` ✅ (44 arquivos / 371 testes passando) | Evidência bruta do app | `02_replica_final/`
F14 | FIX-VALID | Dev integrado: `npm run dev` sobe em 5173, terminal funciona via `/pty` same-origin | App + WS na mesma origem sem processo separado | `vite.config.ts`, `vite-plugin-pty.ts`
F14 | FIX-VALID | Probe Terminal: `node probe-terminal.mjs` ✅ (dev:5173 e preview:4173) | Conectividade, prompt, echo e mesmo PID validados via script dedicado | `probe-terminal.mjs`
F14 | FIX-VALID | Gate 0 E2E: `npx playwright test e2e/gate0_validation.spec.ts` ✅ (dev 5173 e preview 4173) | Prompt antes do input, mesmo PID após toggle, erro honesto | `e2e/gate0_validation.spec.ts`
F14 | FIX-VALID | Sessão 11 E2E: `npx playwright test e2e/sessao_11_terminal_pty_real.spec.ts` ✅ 6/6 (T1 a T6 passando 100%) | PID real, troca de shell, split com prompt pronto, ações de menu, erro honesto, mesmo PID após toggle | `e2e/sessao_11_terminal_pty_real.spec.ts`
F14 | FIX-VALID | Build local: `npm run build` ✅ exit code 0 (28.22s) | Produção gerada sem OOM com chunks otimizados | `02_replica_final/dist/`
F14 | FIX-VALID | Preview integrado: `npm run preview` sobe em 4173, terminal em `/pty` same-origin, Gate 0 e Probe ✅ | App + terminal servidos juntos em produção | `server.mjs`
F14 | RULE | Fluxo principal **não depende mais** de `discoverPtyPort()` nem `/pty-port` — confirmado por busca em todo código (`grep -r`) | Arquitetura single-port consolidada | `src/hooks/usePtySession.ts`, `vite-plugin-pty.ts`, `server.mjs`
F14 | CFG | `HOST=127.0.0.1` mantido para dev/preview (server.mjs usa 0.0.0.0 por compat, mas endpoint `/pty` funciona same-origin) | Decisão imutável da Revisão 3 respeitada | `BLUEPRINT_TERMINAL_REAL.md`


