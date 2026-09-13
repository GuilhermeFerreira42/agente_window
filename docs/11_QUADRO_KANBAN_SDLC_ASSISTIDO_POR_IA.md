# QUADRO KANBAN — SDLC ASSISTIDO POR IA
Atualizado para acompanhamento completo por fatias — AGENTE WINDOW

> Nota de leitura: este quadro combina estado vigente com trilha histórica de execução. Linhas das FATIAS iniciais podem mencionar caminhos anteriores à materialização final em `platform/` e `legacy/`; nesses casos, prevalece o estado vigente descrito em `docs/12_DOCUMENTACAO_VIVA.md` e `docs/16_INICIAR_POR_AQUI_IA_EXECUTORA.md`.

## Leitura rápida do estado vigente
- A documentação canônica já foi consolidada em `docs/00` a `docs/16`.
- A arquitetura híbrida aprovada já está materializada em `platform/` e `legacy/`.
- FATIA-01 e FATIA-02 já foram concluídas.
- A próxima frente funcional autorizada continua sendo a FATIA-03.
- Quando houver conflito entre trilha histórica e estado atual, prevalece `docs/12` + `docs/16`.

| STATUS USADO | SIGNIFICADO |
|---|---|
| Concluído | etapa/artefato já fechada(o) no estado atual do projeto |
| Parcial | existe base pronta, mas ainda falta detalhamento operacional ou aceite final |
| A fazer | próximo passo já identificado, mas ainda não iniciado |
| Em andamento | IA/humano trabalhando ativamente |
| Bloqueado | depende de fatia anterior |
| Planejado | fase futura já documentada, mas sem execução prática ainda |

## Cabeçalho do quadro

| DATA DE INÍCIO DO SPRINT | DATA ATUALIZAÇÃO | ESTADO VIGENTE | ATUALIZADO POR | BRANCH |
|---|---|---|---|---|
| 2026-09-11 | 2026-09-13 | Onda 0 concluída. FATIA-01 e FATIA-02 concluídas. Arquitetura híbrida com `platform/` aprovada e materializada estruturalmente. Próxima execução funcional: FATIA-03. | Arena Agent | main (d96027e) + working tree local |

---

## FAIXA 1 — PREPARAÇÃO — CONCLUÍDA

### Coluna 1 — DESCOBERTA (P1) — Concluído

| Sub | Nome | Saída | Status | Notas |
|---|---|---|---|---|
| P1.1 | Entendimento do problema | Problema formulado | Concluído | Visão em `docs/02` |
| P1.2 | Engenharia reversa / As-Is | Inventário 10 subsistemas | Concluído | `docs/engenharia_reversa/` com A-I por módulo |
| P1.3 | Levantamento de requisitos | Requisitos | Concluído | `docs/02,04,07` |
| P1.4 | Análise de lacunas | Gaps | Concluído | Camadas D da engenharia reversa |
| P1.5 | Validação inicial | Requisitos validados | Concluído | `docs/` como fonte principal |

### Coluna 2 — ESCOPO & ARQUITETURA (P2) — Concluído

| Sub | Nome | Saída | Status | Notas |
|---|---|---|---|---|
| P2.1 | Definição de escopo V1 | Escopo V1 + não-escopo | Concluído | `docs/02` |
| P2.2 | Priorização | Backlog priorizado | Concluído | P0/P1 em `02` e `05` |
| P2.3 | Desenho arquitetural | Arquitetura macro | Concluído | `03` + `03A` com fluxos e árvore alvo |
| P2.4 | Definição de contratos | Contract-First Spec | Concluído | `04` global + `*F` por subsistema (Explorer e Workbench incluídos) |
| P2.5 | Decisões técnicas | ADRs | Concluído | `13_ADRS` com 10 ADRs |
| P2.6 | Aprovação arquitetural | Arquitetura aprovada | Concluído | Pronta para handoff |

### Coluna 3 — BACKLOG & FATIAMENTO (P3) — Concluído/Parcial

| Sub | Nome | Saída | Status | Notas |
|---|---|---|---|---|
| P3.1 | Montagem do backlog mestre | Backlog mestre | Concluído | Ondas 0-9 em `05` |
| P3.2 | Fatiamento em slices | Fatias pequenas | Concluído | Agora detalhado abaixo por FATIA-01 a FATIA-09 |
| P3.3 | Definição de critérios de pronto | DoD | Concluído | DoD macro em `05` + por fatia abaixo |
| P3.4 | Definição de critérios de aceite | Acceptance | Concluído | `07` + `08` + por fatia abaixo |
| P3.5 | Plano de implantação para IA | Handoff Plan | Concluído | `06` + `15_HANDOFF` + `16_INICIAR_POR_AQUI` |
| P3.6 | Matriz de validação | Validation Matrix | Concluído | `07` |

---

## FAIXA 2 — EXECUÇÃO POR FATIAS — ORGANIZAÇÃO COMPLETA

Esta faixa é a fonte principal para você acompanhar evolução. Cada fatia = uma sessão de trabalho com entrada, tarefas, saída e validação.

> Nos blocos históricos de FATIA-01 e FATIA-02 abaixo, os caminhos foram normalizados para a topologia vigente do repositório sempre que isso melhora a leitura sem perder o sentido histórico.

### FATIA-01 — Fundação estrutural da raiz única + contratos compartilhados mínimos
**Onda:** 1 | **Épico:** A — Fundação | **Prioridade:** P0 | **Status:** Concluído em 2026-09-13 | **Doc:** `14_PRIMEIRA_FATIA_RECOMENDADA.md`

| # | Tarefa | Arquivos-alvo | Contrato | Validação | Status |
|---|---|---|---|---|---|
| 1.1 | Auditoria estrutura atual | raiz, `legacy/AMBIENTE_COMPLETO_PARA_OPENCLAUDE/02_replica_final/package.json`, `platform/services/pty-server/package.json` | `03A` | `ls` + checklist | Concluído |
| 1.2 | Criar `package.json` raiz única | `/package.json` | ADR-005 | `npm install` funciona | Concluído |
| 1.3 | Criar `tsconfig.base.json` + `tsconfig.json` raiz com paths `@contracts/*`, `@shared/*` | `/tsconfig.*` | `03A` | `tsc --noEmit` | Concluído |
| 1.4 | Criar `platform/packages/contracts/common.ts` | `WorkspaceUri`, `SessionId`, etc | `04` seção convenções | typecheck | Concluído |
| 1.5 | Criar `platform/packages/contracts/terminal.ts` | `TerminalRuntimePort`, `TerminalEvent` | `04` #4 | typecheck | Concluído |
| 1.6 | Criar `platform/packages/contracts/filesystem.ts` | `FileSystemPort`, `FileNode` | `04` #5 | typecheck | Concluído |
| 1.7 | Criar `platform/packages/contracts/chat.ts`, `commands.ts`, `theme.ts`, `persistence.ts` e correlatos | `AgentRuntimeAdapter`, `ModelProvider`, `ToolExecution` | `04` #1-3 | typecheck | Concluído |
| 1.8 | Criar `platform/packages/contracts/workbench.ts`, `explorer.ts` e `editor.ts` | `WorkbenchLayoutService`, `ExplorerService`, `EditorService` | `04` #6-8 | typecheck | Concluído |
| 1.9 | Criar `platform/packages/contracts/index.ts` barrel | barrel | - | import funciona | Concluído |
| 1.10 | Criar `platform/packages/shared/` mínimo | `types/`, `events/`, `persistence/` | `04` #10 | typecheck | Concluído |
| 1.11 | Criar pastas alvo vazias em `platform/packages/agent-runtime/` e `platform/apps/workbench/src/{logic,workbench,ui}` com `.gitkeep` | estrutura | `03A` árvore alvo | `ls` | Concluído |
| 1.12 | Amarrar aliases no frontend e no serviço PTY | `legacy/AMBIENTE_COMPLETO_PARA_OPENCLAUDE/02_replica_final/tsconfig.app.json`, `platform/services/pty-server/tsconfig.json` | `03A` | typecheck sem regressão | Concluído |
| 1.13 | Boot test sem regressão | app | - | `tsc -b --force` ok | Concluído |
| 1.14 | Atualizar documentação viva e kanban | `12_`, `11_` | `12` | arquivo atualizado | Concluído |

**Critério de pronto FATIA-01:** ✅ typecheck da nova estrutura + typecheck dos dois projetos existentes sem regressão + boot do app + `12_` atualizado. Sem migração total de código. **TODAS 14/14 CONCLUÍDAS.**

---

### FATIA-02 — Workbench Shell base estabilizado
**Onda:** 2 | **Épico:** B — Shell | **Prioridade:** P0 | **Status:** Concluído em 2026-09-13 | **Depende de:** FATIA-01

| # | Tarefa | Arquivos-alvo | Contrato | Validação | Status |
|---|---|---|---|---|---|
| 2.1 | Layout root com Titlebar, Sidebars, Panel, EditorArea | `platform/apps/workbench/src/workbench/layout/`, `platform/apps/workbench/src/ui/shared/` | `WorkbenchLayoutService` | typecheck + unit | Concluído |
| 2.2 | Resize e persistência geométrica | `platform/apps/workbench/src/workbench/layout/layoutManager.ts`, `platform/apps/workbench/src/logic/workbench/workbenchLayoutService.ts` | `WorkbenchLayoutSnapshot` | VAL-WB-02 — resize + clamp | Concluído |
| 2.3 | Registros de partes/views `PartRegistry`, `ViewContainerCoordinator` | `platform/apps/workbench/src/workbench/parts/` | `04` #8 | `types.ts` com defaults | Concluído |
| 2.4 | Command registry básico | `platform/apps/workbench/src/logic/commands/` | `CommandRegistry` | VAL-CMD-01 — 3/3 testes | Concluído |
| 2.5 | Persistência localStorage + hydrate | `platform/packages/shared/persistence/` | `PersistencePort` | serialize/hydrate + compat formato antigo | Concluído |
| 2.6 | Testes focados de toggles, resize e maximize/restore | `platform/apps/workbench/tests/unit/` e referências E2E planejadas em `platform/tests/e2e/` | `07` | VAL-WB-01,02,03 — 7/7 unit | Concluído |

**Saída:** ✅ workbench service modularizado, toggles, resize com clamp, maximize/restore com restore de dimensões, persistência versionada, command registry básico. 10 testes focados passando. Typecheck 3/3 sem regressão. Pronto para integração futura com App.tsx.

---

### FATIA-03 — Terminal piloto REAL com PTY
**Onda:** 3 | **Épico:** C — Terminal | **Prioridade:** P0 | **Status:** Planejado | **Depende de:** FATIA-02 | **Docs:** `engenharia_reversa/01_TERMINAL/01F-01I`

| # | Tarefa | Arquivos-alvo | Contrato | Validação | Status |
|---|---|---|---|---|---|
| 3.1 | Bridge PTY real (integrar `platform/services/pty-server` com `platform/packages/agent-runtime/pty/`) | `platform/packages/agent-runtime/pty/`, `platform/services/pty-server/`, `PtyHost` | `TerminalRuntimePort` | probe-terminal.mjs | Planejado |
| 3.2 | `TerminalService` lifecycle create/write/resize/clear/kill | `platform/apps/workbench/src/logic/terminal/` | `04` #4 | VAL-TERM-01 | Planejado |
| 3.3 | UI `TerminalPanel`, `TerminalGroup`, `TerminalView` com xterm | `platform/apps/workbench/src/ui/terminal/` | - | E2E abrir terminal | Planejado |
| 3.4 | Split e focus | `TerminalGroup`, `SplitSash` | - | VAL-TERM-02,04 | Planejado |
| 3.5 | Maximize/restore, clear | `TerminalActionBar` | `WorkbenchLayoutService` | VAL-TERM-03,05 | Planejado |
| 3.6 | Persistência por sessão + reanexação | `platform/apps/workbench/src/logic/terminal/`, `legacy/.../usePtySession` | `ChatSessionService` | VAL-TERM-06 | Planejado |
| 3.7 | Testes focados + E2E terminal real | `platform/apps/workbench/tests/` + `platform/tests/` | `07` matriz terminal | 7 casos obrigatórios do `07` | Planejado |

**Saída:** terminal real, múltiplas instâncias, split, input roteado corretamente, sem sujeira visual.

---

### FATIA-04 — Explorer + Filesystem I/O
**Onda:** 4 | **Épico:** D — Explorer | **Prioridade:** P0 | **Status:** Planejado | **Depende de:** FATIA-01 e 02

| # | Tarefa | Arquivos-alvo | Contrato | Validação | Status |
|---|---|---|---|---|---|
| 4.1 | RPC/bridge FileSystem `FileHost` | `platform/packages/agent-runtime/filesystem/` | `FileSystemPort` | teste integração | Planejado |
| 4.2 | `ExplorerService` setRoot/expand/collapse/open/reveal/refresh | `platform/apps/workbench/src/logic/explorer/` | `04` #6 | VAL-EXP-01 | Planejado |
| 4.3 | Árvore lazy com reveal e seleção | `platform/apps/workbench/src/ui/explorer/` | - | VAL-EXP-02 | Planejado |
| 4.4 | Watcher `fs.changed` + refresh automático | `platform/packages/agent-runtime/filesystem/` | evento `fs.changed` | VAL-EXP-03 | Planejado |
| 4.5 | Operações seguras move/remove com atomic write | `platform/packages/agent-runtime/filesystem/` | `atomic:true` | VAL-FS-01,02 | Planejado |
| 4.6 | Integração explorer -> editor | `EditorService` | `04` #7 | VAL-INT-01 | Planejado |

---

### FATIA-05 — Chat + Runtime de Agente
**Onda:** 5 | **Épico:** E — Chat | **Prioridade:** P0 | **Status:** Planejado | **Depende de:** FATIA-01,02,03

| # | Tarefa | Arquivos-alvo | Contrato | Validação | Status |
|---|---|---|---|---|---|
| 5.1 | `AgentRuntimeAdapter` + `ModelProviderAdapter` | `platform/packages/agent-runtime/agent/` + `platform/packages/model-provider/` | `04` #1,2 | typecheck | Planejado |
| 5.2 | `ChatSessionService` create/list/activate/send | `platform/apps/workbench/src/logic/chat/` | `04` #9 | VAL-CHAT-03 | Planejado |
| 5.3 | Streaming `chat.chunk`, `chat.thinking` | `platform/apps/workbench/src/logic/chat/` | `AgentRuntimeEvent` | VAL-CHAT-01 | Planejado |
| 5.4 | Tool approval gate `tool.pending` / `tool.result` | `platform/apps/workbench/src/logic/chat/`, `platform/apps/workbench/src/ui/chat/` | `ToolExecutionAdapter` | VAL-CHAT-02 + VAL-INT-02 | Planejado |
| 5.5 | Snapshots/restore de sessão | `platform/packages/shared/persistence/` | `PersistencePort` | teste focado | Planejado |
| 5.6 | UI ChatPanel, timeline, input, anexos | `platform/apps/workbench/src/ui/chat/` | - | E2E conversa | Planejado |

---

### FATIA-06 — Editor / Browser / Search / Changes
**Onda:** 6 | **Épico:** F — Editor | **Prioridade:** P1 | **Status:** Planejado | **Depende de:** FATIA-02 e 04

| # | Tarefa | Arquivos-alvo | Contrato | Validação | Status |
|---|---|---|---|---|---|
| 6.1 | `EditorService` open/close/split/reveal/save | `platform/apps/workbench/src/logic/editor/` | `04` #7 | typecheck | Planejado |
| 6.2 | Abas e grupos centrais com foco | `platform/apps/workbench/src/ui/editor/` | `WorkbenchLayoutService` | VAL-WB-03 | Planejado |
| 6.3 | Browser, Search, Changes views | `platform/apps/workbench/src/ui/editor/` + `platform/apps/workbench/src/logic/search.ts` | - | E2E navegação cruzada | Planejado |
| 6.4 | Integração explorer<->editor e chat<->editor | `platform/apps/workbench/src/logic/` | - | VAL-INT-01 | Planejado |

---

### FATIA-07 — Command Menu + Theme
**Onda:** 7 | **Épico:** G — Tema e comandos | **Prioridade:** P0 | **Status:** Planejado | **Depende de:** FATIA-02,04,05,06

| # | Tarefa | Arquivos-alvo | Contrato | Validação | Status |
|---|---|---|---|---|---|
| 7.1 | Command Palette + menus contextuais | `platform/apps/workbench/src/ui/shared/`, `platform/apps/workbench/src/logic/commands/` | `CommandRegistry` | VAL-CMD-01 | Planejado |
| 7.2 | Context keys e keybindings | `platform/apps/workbench/src/logic/commands/` | `CommandRegistry.setContext` | teste focado | Planejado |
| 7.3 | `ThemeService` + tokens CSS sem hardcode | `platform/apps/workbench/src/workbench/theme/`, `platform/apps/workbench/src/ui/shared/` | `ThemeService` | VAL-THEME-01 + RNF-VAL-05 | Planejado |
| 7.4 | Coerência visual intermodular | todos `platform/apps/workbench/src/ui/` | - | inspeção visual | Planejado |

---

### FATIA-08 — Hardening transversal
**Onda:** 8 | **Épico:** H — Hardening | **Prioridade:** P0 | **Status:** Planejado | **Depende de:** FATIA-03 a 07

| # | Tarefa | Validação | Status |
|---|---|---|---|
| 8.1 | Correções de fidelidade vs VS Code | matriz `07` sem blockers | Planejado |
| 8.2 | Performance input 16ms + bridge 50ms | RNF-VAL-01,02 | Planejado |
| 8.3 | Reconexão PTY, persistência layout, bordas | RNF-VAL-03,04 | Planejado |
| 8.4 | Testes finais 370 unit + 62 e2e (baseline atual) | `npm test` + `e2e` | Planejado |

---

### FATIA-09 — Release e operação
**Onda:** 9 | **Épico:** H — Release | **Prioridade:** P1 | **Status:** Planejado | **Depende de:** FATIA-08

| # | Tarefa | Doc | Validação | Status |
|---|---|---|---|---|
| 9.1 | Build de release `npm run build` | `09_PLANO_DE_DEPLOY` | build passa | Planejado |
| 9.2 | Deploy staging + smoke test 8 passos | `09` | smoke test pós-deploy | Planejado |
| 9.3 | Observabilidade logs + healthcheck + rollback | `09` | logs sem erro crítico | Planejado |
| 9.4 | Runbook operacional + homologação final | `08`, `10` | aceite V1 | Planejado |

---

## FAIXA 3 — PROCESSO OPERACIONAL (como cada fatia será executada)

### Coluna 4 — HANDOFF PARA IA (P4.1)

| Sub | Nome | Entrada | Saída | Status | Notas |
|---|---|---|---|---|---|
| P4.1 | Preparação do contexto | Próxima frente + `15_HANDOFF` + `16_INICIAR_POR_AQUI` | Contexto pronto | Concluído | Entrada operacional consolidada em `15` e `16`; próxima frente vigente = FATIA-03. |

### Coluna 5 — EM ANDAMENTO — IA (P4.2)

| Sub | Nome | O que é | Status | Notas |
|---|---|---|---|---|
| P4.2 | Execução mais recente concluída | IA produziu as entregas das FATIAS 01 e 02 | Concluído | Fundação estrutural e shell base já consolidados antes da abertura da FATIA-03. |
| P4.2b | Próxima: FATIA-03 Terminal piloto REAL | Preparar bridge PTY, lifecycle e UI terminal sob arquitetura materializada em `platform/` | A fazer | Estrutura base já consolidada; próxima sessão pode focar a fatia funcional com escopo controlado |

### Coluna 6 — REVISÃO HUMANA (P4.3 – P4.4)

| Sub | Nome | Status | Notas |
|---|---|---|---|
| P4.3 | Revisão humana | A fazer | Humano revisa o estado consolidado antes da abertura da próxima fatia |
| P4.4 | Ajustes e correções | A fazer | Corrige desvios encontrados na revisão vigente |
| P4.5 | Registro da fatia | Contínuo | Atualiza `12_DOCUMENTACAO_VIVA.md` a cada execução relevante |

### Coluna 7 — TESTE / VERIFICAÇÃO (P5.1 – P5.4)

| Sub | Nome | Método | Status |
|---|---|---|---|
| P5.1 | Testes unitários | `vitest` focado no escopo | Planejado por fatia |
| P5.2 | Testes de integração | bridge runtime/filesystem | Planejado por fatia |
| P5.3 | Probes | `probe-terminal.mjs` etc | Planejado |
| P5.4 | Testes E2E | `playwright` conforme `07` | Planejado |

### Coluna 8 — GATE DE APROVAÇÃO

| Sub | Nome | Status |
|---|---|---|
| P4.6 | Gate de saída da fatia | Planejado — aplica DoD de `05` |
| P5.5 | Homologação com stakeholder | Planejado — `08_CRITERIOS` |
| P5.6 | Gate de qualidade | Planejado — sem blockers |

### Coluna 9 — CONCLUÍDO / DEPLOY (P6)

| Sub | Nome | Status |
|---|---|---|
| P6.1 | Preparação de release | Planejado |
| P6.2 | Deploy | Planejado |
| P6.3 | Monitoramento | Planejado |
| P6.4-6.7 | Suporte, manutenção, feedback | Planejado |

---

## FAIXA 4 — BLOQUEIOS E RISCOS

| ID | Nome | Status | Mitigação |
|---|---|---|---|
| BLK-01 | Escolha da primeira fatia | Concluído | FATIA-01 já cumpriu a abertura estrutural do plano |
| RISK-01 | Drift entre frontend e serviço PTY | Ativo | Mitigado pela FATIA-01 e pela arquitetura atual em `platform/` |
| RISK-02 | Acoplamento UI/Runtime | Ativo | Mitigado por contratos `04` e `03A` |
| RISK-03 | Build OOM no ambiente Arena | Ativo | Mitigação: typecheck focado, não build completo toda vez (ADR-008) |

---

## RESUMO EXECUTIVO PARA ACOMPANHAMENTO

| FATIA | NOME | STATUS | PRÓXIMO PASSO |
|---|---|---|---|
| 01 | Fundação raiz única + contratos | Concluído | Registrar como etapa histórica já consolidada |
| 02 | Workbench Shell base | Concluído | Manter como base estável para integração futura |
| 03 | Terminal PTY real | A fazer | Próxima — aguardando confirmação |
| 04 | Explorer + Filesystem | Planejado | Aguardar FATIA-03 |
| 05 | Chat + Runtime | Planejado | Aguardar FATIA-03 |
| 06 | Editor/Browser/Search | Planejado | Aguardar FATIAS 03 e 04 |
| 07 | Command + Theme | Planejado | Aguardar FATIAS 03 a 06 |
| 08 | Hardening | Planejado | Aguardar FATIAS 03 a 07 |
| 09 | Release | Planejado | Aguardar FATIA-08 |

**Onda 0:** concluída com docs `00` a `16` + engenharia reversa complementar.
**Onda 1 / FATIA-01:** concluída.
**Onda 2 / FATIA-02:** concluída.

Próxima ação imediata: **iniciar o planejamento/execução controlada da FATIA-03 — Terminal piloto REAL com PTY — já sobre a arquitetura híbrida materializada em `platform/`**.
