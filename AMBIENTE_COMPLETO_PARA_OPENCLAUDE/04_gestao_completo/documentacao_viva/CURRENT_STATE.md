# CURRENT_STATE — Réplica Agents Window (VS Code)
> Última atualização: alinhamento documental com `BLUEPRINT_TERMINAL_REAL.md` Revisão 3 | 2026-09-08
> Evidência bruta dos gates: `GATES_EXECUCAO.md` (mesma pasta). Nenhum número abaixo pode contradizê-la.

## ⚡ Handoff Imediato (Retomada Rápida)
- **Escopo desta sessão documental:** encerrar formalmente a Fase E1 (Fundação do Terminal) e preparar a transição para E2.
- **Status real do Terminal:** **Fase E1 Concluída**. A fundação foi revalidada em 2026-09-08 com sonda verde, PID estável, build e E2E aprovados (`GATES_EXECUCAO.md` §8).
- **Plano aprovado agora vigente:** `BLUEPRINT_TERMINAL_REAL.md` **Revisão 3**.
  1. **Fase E1:** Concluída (Fundação estável).
  2. **Fase E2:** migrar de `pty-server` standalone + discovery de porta para **servidor único / porta única** com WebSocket em `/pty` na mesma origem.
  3. **Fase E3:** aplicar **paridade visual** com tokens/CSS/ícones do VS Code sobre `xterm.js`.
  4. **Fase E4:** fechar a onda com `typecheck` + `test` + `playwright` + `build` + atualização documental na mesma sessão.
- **Próxima leitura obrigatória antes de tocar no terminal:**
  - `documentacao_viva/BLUEPRINT_TERMINAL_REAL.md`
  - `documentacao_viva/BACKLOG_FUTURO.md` (seção da Onda TR)
  - `documentacao_viva/DECISION_LOG.md` (Fase 14)
  - `documentacao_viva/GATES_EXECUCAO.md` (§8)
- **Fonte única de verdade documental:** `04_gestao_completo/documentacao_viva/` e `KANBAN.md`.

---

## 🏛️ Arquitetura Ativa / Alvo Aprovado
- **Framework:** React 18 + TypeScript + Vite.
- **Topologia de Layout:** single-pane orquestrado por observáveis (`autorun`, `newSessionViewState`, `sessionLayout.ts`).
- **Persistência:** LocalStorage com fallback estruturado e serialização por ID de sessão.
- **Validação:** Vitest (unitários) + Playwright (E2E com screenshots).
- **Terminal — estado histórico do código:** frontend Vite + `pty-server` separado com discovery de porta dedicado (Revisão 2).
- **Terminal — arquitetura alvo aprovada (Revisão 3):** app e terminal servidos na **mesma origem**, WebSocket em **`/pty`**, `HOST=127.0.0.1`, conexão vivendo no provider (não no mount/unmount do painel), paridade visual reimplementada em React sobre `xterm.js`.

---

## 📦 Módulos e Contratos Vigentes
> Nesta sincronização documental, **nenhum contrato de código foi alterado ainda**. O que mudou foi o **contrato de execução futura** do Terminal Real, definido pela Revisão 3 do blueprint.

| Módulo / Contrato | Arquivo | Contrato Público / Regra | Situação |
|-------------------|---------|--------------------------|----------|
| `sessionsList` | `src/domain/sessionsList.ts` | `buildSessionsList(sessions, options): SectionGroup[]` | Vigente |
| `sessionLayoutSync` | `src/domain/sessionLayoutSync.ts` | `syncSessionLayoutOnSwitch(fromId, toId): void` | Vigente |
| `customView` | `src/domain/customView.ts` | `openCustomView` / `closeCustomView` / `effectivePartVisibility` | Vigente |
| Terminal Real — contrato de execução | `documentacao_viva/BLUEPRINT_TERMINAL_REAL.md` | Ordem obrigatória `E1 -> E2 -> E3 -> E4`; esconder/fechar painel **não** mata PTY; reconexão deve preservar **mesmo PID**; prompt/erro devem aparecer **antes** de qualquer input | **Vigente para a próxima implementação** |

---

## 🔄 Fluxo Principal
1. Usuário seleciona ou cria uma sessão na `SessionSidebar`.
2. `sessionLayoutSync` captura o layout da sessão atual e restaura a topologia exata da nova sessão.
3. `buildSessionsList` agrupa itens em: Fixadas > Quick Chats > Hoje > Ontem > Última semana > Mais antigos > Arquivadas (com workspace capping = 3).
4. Abrir uma custom view cobre Sessions Part/Editor/Aux/Panel; abrir uma sessão ou voltar no mobile dispensa a view e restaura a *desired visibility*.
5. **Terminal (alvo da próxima execução):** Fase E1 Concluída. Próximo passo: **E2 Servidor Único**. Abrir painel deve mostrar prompt/output real sem tela em branco; fechar/reabrir o painel deve reconectar ao **mesmo** PTY; discovery de porta dedicada deixa de existir após E2.

---

## 🛡️ Invariantes Globais (Nunca Violar)
1. **Nenhum filtro mock:** apenas o campo "Filtrar sessões", `sortMode` e `readState` oficiais são permitidos.
2. **Precedência de agrupamento:** `archived > pinned > custom > quickChats > date`.
3. **Grid não-proporcional:** Sidebar, Editor e Auxiliary Bar preservam o tamanho do usuário; a Sessions Part absorve o delta de resize.
4. **Drag & Drop seguro:** `canReorderSessions` deve retornar `false` para sessões arquivadas.
5. **Zero erros TypeScript:** `npm run typecheck` precisa retornar exit 0 em qualquer encerramento real de tarefa.
6. **Terminal — regra imutável da Revisão 3:** esconder/fechar painel, trocar de terminal ou trocar de sessão **não mata** o PTY; só kill explícito do usuário, `exit` do shell, timeout ou reload completo.
7. **Terminal — regra imutável da Revisão 3:** após E2, **não pode restar** `discoverPtyPort()` nem endpoint `/pty-port` no fluxo principal.
8. **Terminal — régua obrigatória da Revisão 3:** a prova mínima é prompt visível antes de input, `echo` aparecendo no output e o mesmo PID após toggle do painel.

---

## ⚙️ Restrições Técnicas Ativas
- **Workspace base do código:** `agente_window/AMBIENTE_COMPLETO_PARA_OPENCLAUDE/02_replica_final/`
- **Governança:** `agente_window/AMBIENTE_COMPLETO_PARA_OPENCLAUDE/04_gestao_completo/`
- **Última evidência real do problema:** `documentacao_viva/GATES_EXECUCAO.md` §7
- **Arquitetura alvo do terminal:** mesma origem + WebSocket `/pty` + `HOST=127.0.0.1`

---

## 🧪 Testes Obrigatórios
| Suite | Alvo | Status documental | Comando |
|-------|------|-------------------|---------|
| Typecheck | projeto inteiro | Última execução real registrada em `GATES_EXECUCAO.md` | `npm run typecheck` |
| Unitários | `src/**/*.test.ts(x)` | Última execução real registrada em `GATES_EXECUCAO.md` | `npm run test` |
| E2E completo | `e2e/*.spec.ts` | Última execução real registrada em `GATES_EXECUCAO.md` | `npx playwright test` |
| Build | produção | Última execução real registrada em `GATES_EXECUCAO.md` | `npm run build` |
| **Sonda E1 do terminal** | `probe-terminal.mjs` | **Obrigatória antes de avançar para E2** | comando definido pela sessão de execução |
| **Sessão 11 reforçada** | `e2e/sessao_11_*` | Deve validar prompt pré-input, mesmo PID após toggle e erro visível sem tela branca | `npx playwright test --grep "sessao_11|Gate 0|terminal"` |

> Esta sincronização **não** acrescentou nenhum número novo. Continue tratando `GATES_EXECUCAO.md` como a única fonte para métricas e exit codes.
