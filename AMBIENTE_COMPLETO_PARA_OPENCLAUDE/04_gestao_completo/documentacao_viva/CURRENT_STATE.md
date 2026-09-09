# CURRENT_STATE — Réplica Agents Window (VS Code)
> Última atualização: checkpoint E3 verde na régua interna, mas a validação local Windows reabriu a reconciliação do terminal antes da E4 | 2026-09-09
> Evidência bruta dos gates executados permanece em `GATES_EXECUCAO.md` (mesma pasta). Esta sincronização resume o checkpoint mais recente, mas não substitui a evidência real de execução.

## ⚡ Handoff Imediato (Retomada Rápida)
- **Escopo da próxima sessão:** reconciliar em bloco controlado os gaps vistos na validação local Windows do terminal antes de tentar fechar a **E4**, preservando E1/E2 e só tocando a E3 no que for estritamente necessário.
- **Status real do Terminal:**
  1. **Fase E1:** ✅ CONCLUÍDA — RC1–RC4 corrigidos e sonda real verde.
  2. **Fase E2:** ✅ CONCLUÍDA — arquitetura same-origin em `/pty` validada em dev (`:5173`) e preview (`:4173`), sem `discoverPtyPort()` nem `/pty-port`.
  3. **Fase E3:** ✅ **VALIDADA NA RÉGUA INTERNA, MAS REABERTA PARA RECONCILIAÇÃO LOCAL** — execução de código encerrada no checkpoint interno, porém a validação local Windows do usuário reportou divergências práticas que precisam ser alinhadas antes do fechamento definitivo. **Etapa 0 aplicada e validada:** tokens dedicados do terminal em `theme.css`, criação de `terminal-vscode.css` + `xterm-vscode.css`, painel desktop flat, ícones 16px e xterm atual lendo a paleta `--vscode-terminal-*`. **Etapa 1 aplicada e validada:** criação de `src/hooks/useTerminalTheme.ts`, `src/hooks/useXtermTerminal.ts` e `src/components/terminal/TerminalView.tsx`, com `TerminalPanel` deixando de instanciar `Terminal()` diretamente nas panes originais. **Etapa 2 aplicada e validada:** criação de `src/domain/terminalInstances.ts` e `src/components/terminal/TerminalInstanceTabs.tsx`, além da migração inicial do `TerminalPanel` para abas reais de terminal com `ptySessionId` por instância (`:0`, `:1`, ...), preservando reconexão e alternância sem matar PTY. **Etapa 3 aplicada e validada:** criação de `src/components/terminal/PanelTabs.tsx`, `src/components/terminal/ShellPicker.tsx` e `src/components/terminal/TerminalActionBar.tsx`; `TerminalPanel` passou a usar esses componentes, o `clear` ficou restrito à instância/pane focada e o buffer local do `usePtySession` agora pode ser descartado por instância para impedir ressurgimento de conteúdo limpo após toggle do painel. **Etapa 4 aplicada e validada:** criação de `src/components/terminal/TerminalGroup.tsx` e `src/components/terminal/SplitSash.tsx`, com split visual agora mediado por sash real, ratio redimensionável, panes encapsuladas e `fitAndSync()` reexecutado quando o tamanho do split muda. **Etapa 5 aplicada e validada:** `useXtermTerminal` reaplica o `theme` na instância viva sem recriar PTY, `TerminalView` expõe atributos por instância (`data-pty-status`, `data-pty-pid`, `data-pty-shell-path`) e o `TerminalPanel` ganhou banner honesto para `error`/`closed`, além de refinamentos visuais de estado em `terminal-vscode.css`. **Etapa 6 concluída:** o menu de contexto do terminal foi mantido, o CSS legado/duplicado do terminal foi removido de `app.css` e consolidado em `terminal-vscode.css`/`xterm-vscode.css`, e os contratos estáticos foram realinhados para a arquitetura atual (`layoutDensity`, `iconLabels`, `performance`). **Validação mais recente desta frente:** `npm run typecheck`, `npm run test`, `node probe-terminal.mjs` e `npx playwright test e2e/sessao_11_terminal_pty_real.spec.ts e2e/sessao_11c_clear_active.spec.ts e2e/sessao_11d_split_sash.spec.ts` — checkpoint verde em sequência (`52/52` arquivos Vitest, `389/389` testes, `8/8` Playwright). **Próxima ação operacional:** reconciliar primeiro os gaps locais Windows do terminal e só depois partir para a E4 com build de fechamento + arquivamento documental final da Onda TR.
  4. **Fase E4:** pendente/bloqueada — o fechamento com `typecheck + test + playwright + build` + arquivamento documental só deve ocorrer depois da reconciliação local Windows do terminal.
- **Leitura obrigatória antes de editar código da E3:**
  - `documentacao_viva/BLUEPRINT_TERMINAL_REAL.md` (macro da Revisão 3 + adendo E3)
  - `documentacao_viva/BACKLOG_FUTURO.md` (TR-03 concluída; TR-04 pendente)
  - `terminal_vscode_completo/plano_implementacao/README.md`
  - `terminal_vscode_completo/plano_implementacao/REVISAO_CRITICA.md`
  - `terminal_vscode_completo/plano_implementacao/00_arquitetura_alvo_e_componentes.md`
  - `terminal_vscode_completo/plano_implementacao/04_etapas_migracao.md`
  - `terminal_vscode_completo/plano_implementacao/05_plano_testes.md`
- **Fonte única de verdade documental:** `04_gestao_completo/documentacao_viva/` + `KANBAN.md`. O pacote `terminal_vscode_completo/` é o artefato detalhado de referência/aplicação da E3 e foi oficialmente absorvido por estes documentos.


### 🚨 Achados novos da validação local do usuário (Windows / `localhost:5173`)
- **Bootstrap local ainda sensível:** rodar `npm run dev` só em `02_replica_final/` não basta; sem `npm install` também em `pty-server/`, o Vite falha ao carregar `vite.config.ts` por ausência de `node-pty`.
- **Menu do terminal não fecha ao clicar fora**, sugerindo gap de click-outside/blur no fluxo local.
- **Gestão de instâncias ainda diverge do modelo correto no ambiente local:** abrir/dividir o terminal não escala para **N terminais** e a **lista organizada** de instâncias não se forma como no VS Code original.
- **Layout do painel inferior pode degradar no Windows**: o terminal aparece **minúsculo/desproporcional**, em vez de ocupar a base da tela com largura útil de workbench.
- **Falha crítica de comunicação PTY/WebSocket** ainda foi observada localmente, com mensagem vermelha (`[PTY Error]` / erro de comunicação WebSocket) e terminal inutilizável.
- **Conteúdo indevido de demo/debug/build** ainda apareceu na superfície do terminal/UI (warnings de bundle, referências de arquivo/linha e diff visual que não deveriam contaminar a experiência final).
- **Resize vertical pela borda superior do painel** foi reportado como não funcional na cópia local.
- **Mensagem `Processo encerrado. O scrollbar visível foi preservado.`** apareceu em contexto indevido e precisa voltar a ser emitida apenas quando o processo realmente termina.
- **Checklist de paridade ainda a confirmar/reconciliar no Windows:**
  1. `+` adiciona **N terminais** e forma lista/abas coerentes;
  2. `Dividir terminal` suporta múltiplas instâncias reais, não apenas 2;
  3. `X` preserva a sessão e `lixeira` deleta/recria corretamente;
  4. menu `...` fecha ao clicar fora e mantém o conjunto esperado de ações;
  5. seletor de shell e metadados reais (PID, linha de comando, integração) permanecem íntegros;
  6. clique direito expõe `Copiar`, `Colar` e `Copiar com formatação`;
  7. o painel inferior maximiza/restaura e redimensiona sem quebrar o layout.

---

## 🏛️ Arquitetura Ativa / Alvo Aprovado
- **Framework:** React 18 + TypeScript + Vite.
- **Topologia de Layout:** single-pane orquestrado por observáveis (`autorun`, `newSessionViewState`, `sessionLayout.ts`).
- **Persistência:** LocalStorage com fallback estruturado e serialização por ID de sessão.
- **Validação:** Vitest (unitários) + Playwright (E2E com screenshots).
- **Terminal — arquitetura ativa:** ✅ app e terminal servidos na **mesma origem**, WebSocket em **`/pty`**, conexão vivendo no provider (não no mount/unmount do painel), com dev em `vite --host 0.0.0.0:5173` e preview integrado em `server.mjs` default `0.0.0.0:4173`.
- **Terminal — alvo aprovado da E3:** chrome React do terminal alinhado ao VS Code real, **desktop flat**, abas de terminais à direita, shell picker/action bar refinados, split com sash redimensionável, tema dark/light reativo e `clear` da instância ativa sem ressuscitar conteúdo ao reabrir.

---

## 📦 Módulos e Contratos Vigentes
| Módulo / Contrato | Arquivo | Contrato Público / Regra | Situação |
|-------------------|---------|--------------------------|----------|
| `sessionsList` | `src/domain/sessionsList.ts` | `buildSessionsList(sessions, options): SectionGroup[]` | Vigente |
| `sessionLayoutSync` | `src/domain/sessionLayoutSync.ts` | `syncSessionLayoutOnSwitch(fromId, toId): void` | Vigente |
| `customView` | `src/domain/customView.ts` | `openCustomView` / `closeCustomView` / `effectivePartVisibility` | Vigente |
| Terminal Real — macro da onda | `documentacao_viva/BLUEPRINT_TERMINAL_REAL.md` | Ordem obrigatória `E1 -> E2 -> E3 -> E4`; esconder/fechar painel não mata PTY; `/pty` same-origin; E3 atua na apresentação sem quebrar a base funcional | Vigente |
| Terminal Real — blueprint detalhado da E3 | `terminal_vscode_completo/plano_implementacao/` | Componentes-alvo, RFs, etapas, testes, ADRs e DoD da paridade visual | **Vigente para a implementação da E3** |

---

## 🔄 Fluxo Principal
1. Usuário seleciona ou cria uma sessão na `SessionSidebar`.
2. `sessionLayoutSync` captura o layout da sessão atual e restaura a topologia exata da nova sessão.
3. `buildSessionsList` agrupa itens em: Fixadas > Quick Chats > Hoje > Ontem > Última semana > Mais antigos > Arquivadas (com workspace capping = 3).
4. Abrir uma custom view cobre Sessions Part/Editor/Aux/Panel; abrir uma sessão ou voltar no mobile dispensa a view e restaura a *desired visibility*.
5. **Terminal (estado atual):** a base funcional same-origin `/pty` segue validada na régua interna (prompt/output real, split com sash, múltiplas instâncias, `clear` focado, tema reativo e estado honesto), **mas o comportamento local Windows precisa ser reconciliado** quanto a menu click-outside, N terminais/lista, layout do painel inferior, erro PTY/WebSocket, remoção de conteúdo demo/debug, resize vertical e semântica correta de encerramento/persistência.
6. **Terminal (próxima execução):** começar pela reconciliação local Windows do terminal e só depois avançar para a E4 com build de fechamento, revalidação final da cadeia completa e arquivamento documental, sem tocar no protocolo `/pty`.

---

## 🛡️ Invariantes Globais (Nunca Violar)
1. **Nenhum filtro mock:** apenas o campo "Filtrar sessões", `sortMode` e `readState` oficiais são permitidos.
2. **Precedência de agrupamento:** `archived > pinned > custom > quickChats > date`.
3. **Grid não-proporcional:** Sidebar, Editor e Auxiliary Bar preservam o tamanho do usuário; a Sessions Part absorve o delta de resize.
4. **Drag & Drop seguro:** `canReorderSessions` deve retornar `false` para sessões arquivadas.
5. **Zero erros TypeScript:** `npm run typecheck` precisa retornar exit 0 em qualquer encerramento real de tarefa.
6. **Terminal — regra imutável da Revisão 3:** esconder/fechar painel, trocar de terminal ou trocar de sessão **não mata** o PTY; só kill explícito do usuário, `exit` do shell, timeout ou reload completo.
7. **Terminal — regra imutável da Revisão 3:** após E2, **não pode restar** `discoverPtyPort()` nem endpoint `/pty-port` no fluxo principal. ✅ Validado.
8. **Terminal — régua mínima obrigatória:** prompt visível antes de input, `echo` aparecendo no output e o mesmo PID após toggle do painel. ✅ Validado por Gate 0 + Sessão 11.
9. **Terminal — escopo da E3:** paridade visual e UX do terminal, sem reabrir a topologia de conexão da E2.
10. **Terminal — semântica do clear na E3:** limpar afeta só a instância/pane focada e o conteúdo limpo não pode ressuscitar ao reabrir o painel.
11. **Terminal — split da E3:** o sash redimensiona apenas as panes envolvidas e o resize não pode matar PTY nem quebrar o prompt.
12. **Terminal — decisão visual da E3:** no desktop o `.terminal-panel` será flat/ponta a ponta; mobile/single-pane/dock preservam seu comportamento próprio.

---

## ⚙️ Restrições Técnicas Ativas
- **Workspace base do código:** `agente_window/AMBIENTE_COMPLETO_PARA_OPENCLAUDE/02_replica_final/`
- **Governança canônica:** `agente_window/AMBIENTE_COMPLETO_PARA_OPENCLAUDE/04_gestao_completo/`
- **Artefato detalhado da E3:** `terminal_vscode_completo/`
- **Arquitetura ativa do terminal:** mesma origem + WebSocket `/pty` + provider persistente por `ptySessionId`
- **Ponto de entrada operacional:** reconciliar primeiro os gaps locais Windows listados neste handoff; só depois entrar na E4 usando `documentacao_viva/BLUEPRINT_TERMINAL_REAL.md` + `terminal_vscode_completo/plano_implementacao/05_plano_testes.md`

---

## 🧪 Testes Obrigatórios
| Suite | Alvo | Situação documental | Comando |
|-------|------|---------------------|---------|
| Typecheck | projeto inteiro | Última execução real registrada em `GATES_EXECUCAO.md` | `npm run typecheck` |
| Unitários | `src/**/*.test.ts(x)` | Última execução real registrada em `GATES_EXECUCAO.md` | `npm run test` |
| E2E completo | `e2e/*.spec.ts` | Última execução real registrada em `GATES_EXECUCAO.md` | `npx playwright test` |
| Build | produção | Última execução real registrada em `GATES_EXECUCAO.md` | `npm run build` |
| **Sonda do terminal** | `probe-terminal.mjs` | Obrigatória antes/depois de etapas da E3 que tocarem renderização, foco, clear ou ciclo de vida do terminal | comando definido pela sessão de execução |
| **Gate 0 / Sessão 11** | `e2e/gate0_validation.spec.ts`, `e2e/sessao_11_*` | Regressão obrigatória da base E1/E2 durante a E3 | `npx playwright test --grep "Gate 0|sessao_11|terminal"` |
| **Sessão 11B visual** | `e2e/sessao_11b_visual.spec.ts` | Régua ativa da E3 para múltiplas instâncias e abas reais | `npx playwright test e2e/sessao_11b_visual.spec.ts` |
| **Sessão 11C clear ativo** | `e2e/sessao_11c_clear_active.spec.ts` | Régua ativa da E3 para `clear` focado sem ressurgimento de output | `npx playwright test e2e/sessao_11c_clear_active.spec.ts` |
| **Sessão 11D split sash** | `e2e/sessao_11d_split_sash.spec.ts` | Régua ativa da E3 para split visual redimensionável com sash | `npx playwright test e2e/sessao_11d_split_sash.spec.ts` |
| **Sessão 11E tema/estados** | `e2e/sessao_11e_theme_states.spec.ts` | Régua ativa da E3 para tema reativo sem recriar PTY e estado `closed` com scrollback preservado | `npx playwright test e2e/sessao_11e_theme_states.spec.ts` |
| **Sessão 11F contexto** | `e2e/sessao_11f_context_menu.spec.ts` | Régua ativa da E3 para menu de contexto do terminal e kill honesto via botão direito | `npx playwright test e2e/sessao_11f_context_menu.spec.ts` |

> Continue tratando `GATES_EXECUCAO.md` como a única fonte canônica para exit codes e números históricos de execução.
