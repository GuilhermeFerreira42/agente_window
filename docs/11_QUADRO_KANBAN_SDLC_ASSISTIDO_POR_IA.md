# QUADRO KANBAN — SDLC ASSISTIDO POR IA
Atualizado para acompanhamento completo por fatias — AGENTE WINDOW

> Nota de leitura: este quadro combina estado vigente com trilha histórica de execução. Linhas das FATIAS iniciais podem mencionar caminhos anteriores à materialização final em `platform/` e `legacy/`; nesses casos, prevalece o estado vigente descrito em `docs/12_DOCUMENTACAO_VIVA.md` e `docs/16_INICIAR_POR_AQUI_IA_EXECUTORA.md`.

## Leitura rápida do estado vigente — ATUALIZADO 2026-09-15 (5 BUGS DO VÍDEO RESOLVIDOS)
- A documentação canônica já foi consolidada em `docs/00` a `docs/18` + `ANALISE_TERMINAL_CODE_SERVER_CLONE.md`.
- A arquitetura híbrida aprovada já está materializada em `platform/` e `legacy/`.
- FATIA-01 e FATIA-02 concluídas.
- FATIA-03: Os 5 bugs críticos de fidelidade identificados no vídeo foram 100% corrigidos:
  1. Maximize restrito à área central (`position: absolute`), respeitando as duas sidebars.
  2. Buffer `pendingOutputRef` + `fitAllInstancesRef` eliminando tela em branco e TDZ.
  3. Arraste suave do sash via `getBoundingClientRect()`.
  4. Tema dinâmico reativo via hook `useTerminalTheme` com `MutationObserver`.
  5. Preservação de sessão PTY e histórico via `display: contents / none` no bridge.
- **Status atual FATIA-03: Concluída e blindada contra regressões (conforme `docs/18`), aguardando teste e feedback do usuário.**
- Servidor Vite ativo em `http://localhost:5173/` (HTTP 200 OK).
- **FATIA-04 (frente vigente): documentação 100% concluída** em `docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/` — 19 arquivos (`04_00` a `04_18`; `04_17` raspagem real + `04_18` plano 4.5→4.7 adicionados em 2026-09-22): mapeamento do vídeo de 8m35s, RF-01 a RF-34, requisitos não funcionais, contratos propostos, mapa `arquivo:linha` no `microsoft/vscode`/`code-server`, 13 fluxos mermaid, critérios de aceite (checklist A do vídeo + B anti-regressão) e **plano de implementação em 9 sub-fatias (4.1 a 4.9)**. **Status (2026-09-28): 4.1–4.6 CONCLUÍDAS; SUB-FATIA 4.7 ✅ CONCLUÍDA (a Editor Anexo + b Git real + c Diff + c4 Input de Commit `2d1b126`), homologada no Windows — Explorer/Search/Git/Diff da FATIA-04 100 % funcionais; próxima frente = decisão do usuário (4.8 Browser ou 4.7-c4 Input Commit) — ver topo de `docs/12`.**
- Quando houver conflito entre trilha histórica e estado atual, prevalece `docs/12`, `docs/16` e `docs/18`.

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
| 2026-09-11 | 2026-09-15 | FATIA-01, 02 e 03 concluídas. 5 bugs críticos do vídeo resolvidos e blindados em docs/18. Servidor 5173 ativo. Aguardando teste e feedback do usuário para avanço à FATIA-04 (Explorer). | Antigravity | main + working tree local |
| 2026-09-11 | 2026-09-25 | FATIA-01–03 concluídas. FATIA-04: 4.1–4.5 concluídas (4.5 homologada Windows 2026-09-25); **4.6 em preparação** (auditoria + plano). Servidores: VS Code 8080 (régua), workbench 5174. | Agente (loop fechado) | main (GitHub `GuilhermeFerreira42/agente_window`) + commits locais `60287b9`…`604bb6d` |
| 2026-09-11 | 2026-09-26 | FATIA-04: 4.6 homologada (Windows) e **4.7 Editor Anexo implementada** (Opção A, 7 commits `db33bef`…`a394f53` + docs; placar `04_20 §4.2` 14/14; E2E `sessao_14` 16/16; vitest 341). Aguarda homologação humana no Windows e decisão **4.8 vs 4.7-b**. | Agente (loop fechado) | main + commits locais até `a394f53` |
| 2026-09-11 | 2026-09-27 | FATIA-04: **4.7-b Aba Changes (Git real) HOMOLOGADA NO WINDOWS** (c1–c3.2, HEAD `6c91289`): backend `/git/*` real, Source Control View no anexo, Stage/Unstage/Discard com diálogos oficiais, entrada pelo header do Explorer, maquete "Changes N" do shell escondida (Transição Temporária, `src/shell/gitTransition.ts`). Pendentes: c4 input de commit, c5 placar. **Aguardando diretriz do usuário** (4.7-c Diff · 4.8 Browser · UX). | Agente (loop fechado) | main + commits locais até `6c91289` |
| 2026-09-11 | 2026-09-28 | FATIA-04: **4.7-c Diff mínimo HOMOLOGADA NO WINDOWS (Vídeo 6)** — c1 `9b8d26f` DiffPane read-only · c2 `0b7b7b1` clique Changes → diff + `/git/show` + badge/tooltip + fix sessionId · c3 docs. **4.7 (Editor Anexo + Git + Diff) = CONCLUÍDA.** vitest 382 · `sessao_14c` 6/6. | Agente (loop fechado) | main + commits locais até `0b7b7b1` |
| 2026-09-11 | 2026-09-28 | FATIA-04: **4.7-c4 Input de Commit HOMOLOGADO NO WINDOWS** (`2d1b126`): `.scm-input` + botão ✓ Commit, Ctrl+Enter, validação vazia, diálogo stage-all [Yes][Cancel], diálogo de erro; spec `sessao_14d` 5/5; regressão total verde. **SUB-FATIA 4.7 ✅ CONCLUÍDA (Motor Git fechado).** Aguarda decisão: FATIA-05 Layout ou 4.8 UI do Browser. | Agente (loop fechado) | main + commits locais até `2d1b126` |
| 2026-10-02 | 2026-10-02 | FATIA-05 **5.8 ✅ código concluído** (c1 `d0c2a8d` coluna Detalhes removida de vez · c3 `4ee0ed8` 16 tokens faltantes) → **Fatia 5 100 % implementada (5.1–5.7 homologadas; 5.8 aguarda homologação final no Windows)**. Fatia 6 proibida até o OK. |
| 2026-10-02 | 2026-10-02 | FATIA-05 **5.7 ✅ HOMOLOGADA NO WINDOWS** (fixes `a9a73f4` · `0a8ce9a` · `d0a2f81`; docs/24 v1.2 Side Bar 274 no maximizado). **5.8 "misto" em andamento (docs/24 v1.3)**: c1 remoção definitiva da coluna Detalhes + c3 polish tokens; Alt+Z/menu de abas → 5.9; Simple Browser → 4.8. Parar após o c3 para homologação final da Fatia 5. |
| 2026-10-01 | 2026-10-01 | FATIA-05 **5.7 concluída (código)**: `9a11319` editor fino default + regra de larguras "A + 2 com piso 420" (chat ≥ 420 px e ≥ 50 %; anexo ≤ 50 % — `ATTACH_MAX_WIDTH_RATIO` 0.5, exceção de 1 constante autorizada; "Detalhes" colapsa na 1.ª aba, exclusiva na faixa fina) · bug do vídeo corrigido (AuxiliaryBar sempre montada; Browser não a esconde) · toggle ⤢ (chat some, Side Bar 0, `editorMaximized` persistido) · spec `sessao_15_editor_maximize` T30–T32 3/3 · `sessao_14`/`activity_bar` atualizadas com autorização · §9 15/15 ×2 · typecheck 0 · vitest 703/9 pré-ex./16 · prints `auditoria_05/c5.7/` · D2.63 fechado, novos D2.70/D2.71 · **aguarda homologação no Windows**; 5.8 proibida até OK |
| 2026-09-30 | 2026-09-30 | FATIA-05 **5.6 concluída (código)**: `7d05c7d` Outline real (DocumentSymbol do Monaco no modelo ativo do anexo, clique revela linha) + Timeline real (`POST /git/log` aditivo + `show(sha)` → diff `nome (sha7)` no anexo) nas seções do Explorer (A0.6) · spec `sessao_15_outline_timeline` T26–T29 4/4 · §9 15/15 ×2 · typecheck 0 · vitest 705/9/16 · prints `auditoria_05/c5.6/` · D2.41 fechado, novos D2.67–D2.69 · **aguarda homologação no Windows**; 5.7 proibida até OK |
| 2026-09-30 | 2026-09-30 | FATIA-05 **5.5 concluída (código) ✅ homologada 2026-09-30 (+fix `4e10381` ícones arrastáveis)**: `1f1ed79` DnD de views Side Bar ↔ Views Panel (novo `.part.panel` acima do terminal, O14); ordem/container em `viewLayout` persistido; HTML5 nativo · spec `sessao_15_drag_drop_views` T20–T24 5/5 · §9 14/14 ×2 · typecheck 0 · vitest 697/9/16 · prints `auditoria_05/c5.5/` · novos D2.65/D2.66 · **aguarda homologação no Windows**; 5.6 proibida até OK |
| 2026-09-30 | 2026-09-30 | FATIA-05 **5.4 concluída (código) ✅ homologada 2026-09-30**: `7bd528b` Activity Bar movível por menu de contexto (Move Left/Right; Top/Bottom desabilitados → D2.64); `activityBarPosition` persistido; CSS `order` em `.main-region` · spec 15 T16–T20 (21/21) · §9 13/13 ×2 · typecheck 0 · vitest 692/9/16 · prints `auditoria_05/c5.4/` · desvio consciente A0.1 (`docs/25 O13`) · **aguarda homologação no Windows**; 5.5 proibida até OK |
| 2026-09-30 | 2026-09-30 | FATIA-05 **5.3 concluída (código) ✅ homologada 2026-09-30**: `2bd6cc3` Source Control migra para a Side Bar (`mountScm`, `ScmView`, badge `git.count()`, `openSourceControl`); maquete "Changes N" + `gitTransition.ts` removidos (D2.38 ✅); aba Changes do anexo removida (decisão A) · spec 15 T10–T15 · §9 13/13 ×2 · typecheck 0 · vitest 692/9/16 · prints `auditoria_05/c5.3/` · **aguarda homologação no Windows**; 5.4 proibida até OK + A0.1 |
| 2026-09-30 | 2026-09-30 | FATIA-05 **5.2 concluída (código)**: `22a1523` Search migra para a Side Bar (`SearchView` hospeda o `SearchModuleSlot`; `showView`; Ctrl+Shift+F; RF-06) · spec 15 T6–T9 · §9 13/13 ×2 · typecheck 0 · vitest 702/9/6 (decisão A: 4 `it.skip`, D2.60=6) · prints `auditoria_05/c5.2/` · **aguarda homologação no Windows**; 5.3 proibida até o OK |
| 2026-09-29 | 2026-09-29 | FATIA-05 **5.1 concluída (código)**: c2 `fd05507` side-bar + RF-09 (P1=A) · c3 `1e9978f` Explorer migrado, Outline/Timeline colapsadas, aba Files removida (2-keep), specs 12/14x só sessionId (P2) + 14b_smoke l.57 (1-a), 2 unit tests `it.skip` (D2.60). §9 12/12 · typecheck 0 · vitest 706/9/2. **Próximo: homologação Windows → 5.2.** | Agente (5.1) | `1e9978f` |
| 2026-09-29 | 2026-09-29 | FATIA-05 5.1: **c1 activity-bar ✅ commitado** (`3fcc913`; §9 12/12, typecheck 0, vitest 708/717). **c2 side-bar implementado, não commitado** — bloqueado por decisão P1 (T14 sessão 14 × Side Bar, `docs/25 §3`). Auditoria externa incorporada (`05_02`); docs de handoff 00_COMECE_AQUI/25/26/27/28 criados; `legacy/` a remover. | Agente (5.1) | `0e36af4` + working tree |
| 2026-09-29 | 2026-09-29 | FATIA-05 **Chassis-Right**: Gate 0 ✅ (raspagem 8080 com Side Bar à direita, auditoria de `src/`, confronto doc×código); plano `docs/24` corrigido para v1.1 (sash 4 px, largura pela régua, `flex/none`); aprovado pelo usuário. **Zero código.** Próximo: Passo 3 (carimbo) → 4 (spec 15) → 5 (c1–c3 da 5.1). | Agente (Gate 0) | `2eab62b` (sem commit) |

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
| P3.2 | Fatiamento em slices | Fatias pequenas | Concluído | Agora detalhado abaixo por FATIA-01 a FATIA-10 (renumeração 2026-09-28: 05 = Layout, 06 = Chat/Runtime) |
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

### FATIA-03 — Terminal piloto REAL com PTY — EXECUTADA 03.1 a 03.10 + EM REVISÃO COMITÊ
**Onda:** 3 | **Épico:** C — Terminal | **Prioridade:** P0 | **Status:** Em revisão comitê — 85% fiel, gaps mapeados | **Depende de:** FATIA-02 | **Docs:** `engenharia_reversa/01_TERMINAL/01F-01I` + `ANALISE_TERMINAL_CODE_SERVER_CLONE.md` + `12` COMITÊ 2026-09-14

| # | Tarefa | Arquivos-alvo | Contrato | Validação | Status |
|---|---|---|---|---|---|
| 3.1 | Bridge PTY real (integrar `platform/services/pty-server` com `platform/packages/agent-runtime/pty/`) | `platform/packages/agent-runtime/pty/`, `platform/services/pty-server/`, `PtyHost` | `TerminalRuntimePort` | probe WS /pty + 5 testes pty-server | Concluído 2026-09-13 |
| 3.2 | `TerminalService` lifecycle create/write/resize/clear/kill + split lateral | `platform/apps/workbench/src/logic/terminal/terminalService.ts` | `04` #4 | 9 testes VAL-T | Concluído 2026-09-13 |
| 3.3 | UI `TerminalPanel`, `TerminalGroup`, `TerminalView` com xterm + tokens CSS | `platform/apps/workbench/src/ui/terminal/` | - | tsc + 19 testes | Concluído 2026-09-13 |
| 3.4 | Split e focus — duplo ref12 e quádruplo ref14 | `TerminalGroup`, `SplitSash` | - | VAL-TERM-02,04 — E2E 2 testes | Concluído 2026-09-13 |
| 3.5 | Maximize/restore, clear, context menu, more menu Modos de Exibição | `TerminalActionBar` + `TerminalPanel` | `WorkbenchLayoutService` | VAL-TERM-03,05 | Concluído 2026-09-13 |
| 3.6 | Persistência snapshot leve por sessão | `terminalPersistence.ts` + BrowserPersistenceAdapter | `PersistencePort` | 4 testes VAL-TP | Concluído 2026-09-13 |
| 3.7 | Testes focados + E2E terminal real (fluxo 01H) | `platform/apps/workbench/tests/unit/terminalE2E.test.ts` | `07` matriz | 25 testes unit+E2E | Concluído 2026-09-13 |
| 3.8 | Integração VISÍVEL na app real 5173 via PlatformTerminalBridge | `legacy/.../components/terminal/PlatformTerminalBridge.tsx` + `TerminalPanel.tsx` flag USE_PLATFORM | - | curl 5173 200, WS /pty real | Concluído 2026-09-13 |
| 3.9 | Polish visual igual original — lucide icons, ShellPicker, drawer 200px, grid quadruplo, PanelTabs | `platform/.../TerminalPanel.tsx` + `TerminalInstanceTabs.tsx` + `TerminalGroup.tsx` | - | tsc + 25 testes + refs 09/12/14 | Concluído 2026-09-13 |
| 3.10 | Revisão completa eliminar resquícios legados + fix tela cinza — VSCodeTerminal auto-contido 34KB sem platform deps | `legacy/.../terminal/VSCodeTerminal.tsx` + `PlatformTerminalBridge.tsx` limpo + `TerminalPanel.tsx` só delegação + `platform/.../TerminalPanel.tsx` sem tabs horizontais | - | curl 5173 200, 8080 200, sem tela cinza, sem browser tabs | Concluído 2026-09-14 |
| 3.11 | COMITÊ — Avaliação fidelidade 85% vs 100%, gaps, opções A/B/C, decisão próximos passos | `docs/12` + `docs/11` + novo doc comitê | `08` critérios homologação | Checklist fidelidade 13 itens com severidade | Em andamento — aguardando comitê |

**Saída atual:** terminal real visível em 5173, prompt bash/powershell via WS /pty -> PtyManager -> node-pty, split duplo/quádruplo, drawer vertical, context menu 5 itens, more menu Modos de Exibição, sem tela cinza, sem abas browser-like. **Gap vs 100%:** codicons vs lucide, sash 4px vs flex ratio, context menu 5 vs 12 itens, status spinner, ShellPicker sem path, dual implementação legacy+platform (débito técnico). Documentado em `docs/12` 2026-09-14 COMITÊ.

**Próximos passos pendentes decisão comitê:**
- Opção A: Polish incremental VSCodeTerminal (1-2 dias, 85%→85% fidelidade, baixo risco)
- Opção B: Migrar app real para 100% platform (3-5 dias, 85%→95%, elimina dual, requer tocar App.tsx)
- Opção C: Reuso lib/vscode terminal contrib (1-2 semanas, 95%→100%, custo alto)
- Perguntas comitê: nível aceite, autorização tocar App.tsx, codicons vs lucide, paralelizar FATIA-04, validador visual

---

### FATIA-04 — Explorer Completo + Editor em Anexo Lateral + Browser com IA (FASE 4)
**Onda:** 4 | **Épico:** D — Explorer (+ C/F/E conforme sub-fatia) | **Prioridade:** P0 | **Status:** Em execução (4.1–4.6 ✅; **4.7 ✅ CONCLUÍDA — a/b/c/c4 homologados no Windows, Motor Git fechado com `2d1b126`**; 4.8 redefinida = só UI do Simple Browser; FATIA-05 = Consolidação e Layout Byte a Byte) | **Depende de:** FATIA-01 e FATIA-02 | **Doc:** `docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/` (19 arquivos, `04_00` a `04_18`)

> **Nota (2026-09-16):** a FATIA-04 foi **ampliada** após o mapeamento do vídeo de 8m35s. Além do Explorer + Filesystem originalmente previstos, ela agora inclui **editor em anexo lateral** (não no centro), **search dentro da sessão** e **browser interno com acesso da IA ao HTML**. A tabela de 6 linhas anterior foi substituída pelas **9 sub-fatias** abaixo. Plano detalhado em `04_15`; critérios de aceite em `04_13`.

> **REV-LEGO (2026-09-20) + ATUALIZADO 2026-09-22:** a tabela abaixo reflete a ordem replanejada em `04_15` (módulo isolado `platform/apps/workbench-v2/src/modules/explorer-search/`) e o status real registrado em `docs/12`. A tabela de 2026-09-16 (ordem antiga) fica como histórico em `04_15 §10`.

| # | Sub-fatia | Arquivos-alvo (módulo `explorer-search/`) | Contrato | Validação | Status |
|---|---|---|---|---|---|
| 4.1 | Congelar contratos do módulo | `contract.ts`, `core/constants.ts` | `04_10` REV-LEGO | teste de fronteira (FT) | **Concluída** (2026-09-20) |
| 4.2 | Core puro (ExplorerNode, sorter, treeState, dndPolicy, transfer) | `core/**` | — | 77/77 unit, FT-07 | **Concluída** (2026-09-20) |
| 4.3 | Adapter FS real no Single Port (endpoints + watcher WS `/fs/watch`) | `server/fs/**`, `server/vite-plugin-fs.ts`, `core/fs/browserFsPort.ts` | `FileSystemPort` | 110/110 módulo, E2E `sessao_12` 10/10 | **Concluída** (2026-09-20) |
| 4.4 | **Explorer Core** na aba Files — DOM real do VS Code (`pane-header` raiz 22 px, árvore nível 1, 4 panes), inline create/rename, upload DnD/picker, download (arquivo / pasta / **multi → 1 ZIP**), menu declarativo (`6_copypath`, `Delete Permanently`), `.git` oculto, ícones Seti por extensão, seções colapsáveis | `ui/ExplorerView.tsx`, `ui/explorer.css`, `core/menus/explorerMenus.ts`, `core/transfer/{upload,download}.ts`, `core/treeState.ts`, `core/constants.ts` | `IExplorerSearchApi` | Auditoria binária preview 5174 (`auditoria_44/fase1/resultado.json`): **10/11 PASS**; vitest módulo 149/149; E2E `sessao_12_explorer` **27/27** (T6–T10); terminal 9/9 | **Parcial** (2026-09-24) — PENDENTE: T-11 (ruído `upload.ts`), homologação manual; ADIADO: G5 menu do pane-header → 4.5. Commits `60287b9` `f5a4c1d` `70f2231` `e2a1058` `0d86656` |
| 4.5 | **Menu completo** — host fiel (item 24 px, separadores, coluna keybinding, radius 8/6), teclado ↑↓ Home/End Enter Esc + Shift+F10 com foco devolvido, contrato `keybinding?`/`checked?`, New File/Folder só em pasta/raiz (upstream), **menu `ViewTitleContext` nos pane-headers** (Hide + toggles ✓, Open Editors oculta por padrão, persistido) | `src/components/ExplorerContextMenuHost.tsx` (+css; App.tsx só import), `core/menus/{explorerMenus,viewTitleMenus,when}.ts`, `contract.ts`, `ui/ExplorerView.tsx` | `deps.contextMenu.open` com `keybinding?`/`checked?` | typecheck 0; vitest **280/280**; E2E `sessao_12_explorer` **30/30** (T11–T13, GAP-1) + backend 9/10; prints régua 8080 em `auditoria_45/` | ✅ **Concluída** (2026-09-25 — homologada pelo usuário no Windows 11, checklist 4/4; commits `917e746` `53ac6cc` `b1c19c3` `d294e5c` `604bb6d` `746f973` + fechamento). ADIADO: badges Activity Bar (D2.6), Add/Remove Folder (D2.7), botão "…" Views no título (D2.16), ordem dos panes (D2.17) |
| 4.6 | **Search Panel + Replace** (inputbox 26 px, toggles 20×20, replace 16 px, include/exclude, árvore 22 px, ações inline, Replace All com confirmação, abrir match, persistência) — AttachArea/sash movidos para 4.7 por decisão do usuário | `ui/search/{SearchPanel,SearchResults}.tsx`, `core/search/**`, `server/fs/searchEngine.ts`; slot `searchSlot` (App/EditorArea) | `ISearchApi` (contrato intocado) | `04_19 §4` placar 12/14 + `sessao_13_search` 14/14 + `sessao_13_search_backend` 6/6 | **Implementada** (c1–c7, `5b29da8`…`985160f`) | ✅ **CONCLUÍDA 2026-09-26 (homologada no Windows, Vídeo 5)**
| 4.7 | **Editor Anexo Lateral** (Opção A: dentro da barra auxiliar, à esquerda da árvore, sash 6 px) — abas 35 px por sessão (preview itálico, ● ↔ ✕), breadcrumbs 22 px, Monaco 14/19 com viewState e reveal linha (D2.20), save atômico + diálogo Salvar/Não Salvar/Cancelar + conflito externo, maximizar dentro da sessão + empty state letterpress; editor central do shell intocado | `ui/attach/{AttachArea,EditorTabs,Breadcrumbs,CodeEditorPane,AttachDialog,AttachEmptyState}.tsx`, `attach.css`, `core/editor/editorService.ts`, `core/attach/attachLayout.ts`; slot `attachSlot` (`AuxiliaryBar.tsx`) + redirecionamento `explorer.fileOpened` (App.tsx) | `IEditorAttachApi` (contrato intocado) | `04_20 §4.2` placar **14/14 PASS**; E2E `sessao_14_editor_anexo` **16/16**; vitest 341/341; anti-regressão 12/13/terminal/07/03 verde | ✅ **CONCLUÍDA** (c1 `db33bef` · c2 `9bbaf3e` · c3 `c7457f8` · c4 `aac4c8b` · c5 `4906c81` · c6 `a394f53` · c7 docs) — homologada no Windows junto com 4.7-b/4.7-c (Vídeo 6, 2026-09-28). ADIADO: Alterações/Git (D2.22 → 4.7-b), picker breadcrumbs (D2.23 → 4.7-c), Split (D2.24), D2.19/D2.26 → 4.9 |
| 4.7-b | **Aba Changes (Git real)** — `POST /git/{status,init,stage,unstage,discard,commit}` (execFile sem shell, guarda de raiz, porcelain v2), aba fixa "Changes" no anexo (1 por sessão, nunca dirty), Source Control View 22 px (Staged Changes / Changes, letras `::after` com tokens gitDecoration, D riscado, badge, Refresh), sem repo → frase oficial + Initialize Repository, ações inline Stage/Unstage/Discard + Stage All/Unstage All/Discard All + diálogos oficiais (textos do `dist/main.js` da extensão git), watcher → refresh automático; **entrada "Open Source Control" no header do Explorer**; maquete do shell escondida (Transição Temporária) | `server/git/{gitHost,index}.ts`, `core/git/{gitService,browserGitPort}.ts`, `ui/attach/changes/{ChangesPane,ChangesList,ConfirmDialog,changes.css,changesStrings}.tsx`, `ui/ExplorerView.tsx` (ação), exceção shell: `src/shell/gitTransition.ts` + prop `hideChangesTab` (`AuxiliaryBar.tsx`) + hook em `App.tsx` | `contract.ts` aditivo (`kind:'changes'`, `git.statusChanged`) | smoke REAL `sessao_14b_git_smoke` 1/1 (5174, workspace real, UI × `git status`) · `14b_changes` 11/11 · `14b_backend` 7/7 · vitest 372 · anti-regressão 14/12/13/terminal/03/04 verde | ✅ **CONCLUÍDA — HOMOLOGADA NO WINDOWS 2026-09-27** (c1 `3e12adc` · c2 `9575457` · c3 `3c69242` · c3.1 `a931f72` · c3.2 `6c91289`; prints `auditoria_47b/validacao_real_v2/`). **Pendentes por decisão do usuário:** c4 input "Message (Ctrl+Enter to commit)" + ✓ Commit (D2.35), c5 placar `04_21 §6`. Débitos D2.28–D2.38 em `docs/05` |
| 4.7-c | **Diff mínimo (read-only)** — clique em M/A/D/U na lista Changes abre aba fixa "Diff" (1 por sessão, após Changes, imune a Close All) com Monaco DiffEditor `readOnly` + `renderSideBySide` (inline automático < 900 px, padrão VS Code), minimap off, 14/19; lados fiéis ao `git.openChange` (Changes = index ⇄ worktree "(Working Tree)", Staged = HEAD ⇄ index "(Index)", A/U original vazio, D modificado vazio); "No changes detected" + `codicon-check`; badge + tooltip "X files changed" na aba Changes; empty state "No source control changes detected"; fix sessionId real (sem aba fantasma em `'default'`) | `ui/attach/diff/{DiffPane,diff.css,diffStrings}`, `core/editor/editorService.ts` (kind `'diff'`), `core/git/gitService.ts` (`getDiff`, `count`), `server/git/` (`POST /git/show`), `ui/attach/changes/*`, `EditorTabs.tsx`, `index.ts` (abertura pendente até `mountAttach`) | `contract.ts` aditivo (`kind:'diff'`, `AttachDiffPayload`, `editor.diffChanged`) | `sessao_14c_diff_minimal` **6/6** (cada trio falhou antes do código) · `14b` 11/11 · vitest **382** · anti-regressão 14/12/13/terminal verde · prints `auditoria_47c/c1`, `c2` | ✅ **HOMOLOGADA NO WINDOWS 2026-09-28 (Vídeo 6)** (c1 `9b8d26f` · c2 `0b7b7b1` · c3 docs). **D2.28 e D2.33 CONCLUÍDOS.** **A 4.7 como um todo só fecha com o c4 — Input de Commit ("Message (Ctrl+Enter to commit)" + ✓ Commit, D2.35): último passo do "Motor Git"** (decisão estratégica 2026-09-27, `docs/12`) |
| 4.7-c4 | **Input de Commit** — `.scm-input` (pl 11, radius 4, 26 px auto-grow) com placeholder `Message (Ctrl+Enter to commit on "branch")`, botão ✓ Commit largura total abaixo do input (4 8 / radius 4 / lh 16 / 12 px), Ctrl+Enter, validação "Please provide a commit message", diálogo oficial stage-all [Yes][Cancel], diálogo de erro com mensagem real do git; sucesso sem diálogo (fiel ao VS Code) | `ui/attach/changes/{CommitInput.tsx,ChangesPane.tsx,changes.css,changesStrings.ts}` | `POST /git/commit` + `/git/stage` já existentes | `sessao_14d_commit_input` 5/5 (falhou antes) · regressão total verde · prints `auditoria_47c/c4` | ✅ **CONCLUÍDA e homologada no Windows 2026-09-28 (`2d1b126`)** — fecha a 4.7; D2.35 (Always) permanece débito |
| 4.8 | **UI do Browser (Simple Browser) — SOMENTE interface visual, byte a byte** (barra de endereço, botões voltar/avançar/recarregar/abrir externo, área de conteúdo, medidas do `simpleBrowser` do VS Code); coexistência com a sessão no anexo. **FORA (adiado → D2.39):** runtime de IA com acesso ao HTML / Playwright / CDP, isolamento de contexto por sessão | módulo isolado (a definir na auditoria `04_2x`), slot no shell mínimo | `BrowserPort` (UI só) | auditoria + prints lado a lado vs 8080 (Simple Browser real) | 🔜 **Redefinida 2026-09-27 (escopo = só UI)**; B3 hotfix já aplicado (`876b83d`: Browser não abre no boot) |
| 4.9 | **Polimento UX** — drag & drop para reordenar seções (Open Editors/Outline/Timeline), resize de seções por sash com persistência, hover actions inline nos itens da árvore, feedback visual de drag; + integração final (eventos transversais, validação de isolamento) | `ui/ExplorerView.tsx`, `ui/explorer.css` | `fs.changed`, `attach.closed` | checklist A + B do `04_13` | **Planejado** |

**Referência de medidas (fonte única):** `docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/04_17_explorer_codeeditorpane_raspagem_vscode_original.md` (raspagem real do VS Code: 22 px linha, 26 px search, 35 px tabs, 22 px breadcrumbs, 24 px item de menu, tokens `--vscode-*`). **Plano de implantação 4.5→4.6→4.7:** `docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/04_18_plano_implantacao_fatia_04.md`.

**Critério de pronto FATIA-04:** sub-fatias 4.1–4.7 + 4.9 validadas + anti-regressão do terminal (`sessao_11_*`) verde + checklist visual do `04_18 §5` preenchido com prints lado a lado + `docs/12` atualizado com evidência real.
**Ordem obrigatória:** 4.1 → 4.2 → 4.3 → 4.4 ✅ → 4.5 ✅ → 4.6 ✅ → 4.7 ✅ → 4.7-b ✅ → 4.7-c ✅ → **4.7-c4 ✅ Input de Commit (`2d1b126`, homologado Windows 2026-09-28) = SUB-FATIA 4.7 CONCLUÍDA → próxima = decisão do usuário (FATIA-05 Layout · 4.8 UI do Browser)** → 4.9 (4.8 planejado; cada uma só começa com a anterior validada). **Débitos e fontes por item:** `docs/12` entrada 2026-09-24 §B; épico "Refinamento UX Explorer" em `docs/05`.

---

### FATIA-05 — Chassis-Right (plano `docs/24` v1.1; Gate 0 ✅ 2026-09-29)
**Status 2026-10-01:** **5.1–5.6 ✅ homologadas · 5.7 ✅ CÓDIGO CONCLUÍDO `9a11319` (aguarda homologação; 5.8 só após OK).** Anterior — **Status 2026-09-30 (noite, 4):** 5.6 ✅ CÓDIGO CONCLUÍDO `7d05c7d`. Anterior — **5.5 ✅ CÓDIGO CONCLUÍDO `1f1ed79`.** Anterior — **5.4 ✅ CÓDIGO CONCLUÍDO `7bd528b` (aguarda homologação; 5.5 só após OK).** Anterior — **5.3 ✅ CÓDIGO CONCLUÍDO `2bd6cc3` (aguarda homologação; 5.4 só após OK + decisão A0.1).** Anterior — Anterior — **5.1 ✅ CÓDIGO CONCLUÍDO — c1 `3fcc913` · c2 `fd05507` (inclui RF-09) · c3 `1e9978f`; §9 12/12 em cada commit, typecheck 0, vitest 706/9 pré-existentes/2 skipped. Aguarda homologação manual no Windows; 5.2 não iniciada.** (Anterior:) c1 commitado, c2 bloqueado por P1. Estado detalhado e sequência de retomada: **`docs/25`**. (Status anterior:) Gate 0 ✅ concluído e aprovado. Próximo passo: "atualizar plano ✅ + reescrever spec 15 + começar c1" (Passos 3→5 do `docs/24 §1`, um por vez). Evidências: `docs/engenharia_reversa/FATIA-05_LAYOUT/05_00`, `05_01`, `raspagem_05_01/`. Decisões travadas: direita · inglês só no novo · sash 4 px · largura pela régua (170 / `min(300, largura/4)` / largura−220 / snap-to-close) · `display: flex/none` · 3 commits na 5.1 · parar após o c3. O bloco abaixo (plano "Byte a Byte") é **histórico** — vale o `docs/24`.

**Onda:** 5 | **Épico:** D2/F — Layout global | **Prioridade:** P0 (frente vigente) | **Status:** Planejada — docs prontos; **código da 5.1 aguarda autorização explícita** | **Depende de:** FATIA-04 ✅ (Motor 100 %: Explorer, Search, Source Control com Commit, Diff, Editor Anexo) | **Doc:** `docs/engenharia_reversa/FATIA-05_LAYOUT_BYTE_A_BYTE/` (`05_00`…`05_06`); débitos D2.40–D2.48 em `docs/05`

**Objetivo:** remontar os motores da FATIA-04 no **chassi exato do VS Code (perfil agentsWindow)**: Activity Bar 48 px → Side Bar (Explorer / Search / Source Control, uma por vez, estado preservado) → Editor Group central (arquivos e diffs) → Panel inferior (Terminal homologado). **Só wiring de UI; zero lógica nova em `core/**`/`server/**`.** Dor resolvida: Search e Source Control deixam de sumir quando um arquivo abre.

| # | Sub-fatia | Arquivos-alvo | Validação | Status |
|---|---|---|---|---|
| 5.1 | **Auditoria de Layout + Slots** — `<ActivityBar>` (3 ícones + badges), `<SideBar>` (título 35, sash min 170), `<EditorGroup>` central vazio, `viewRegistry` + `layoutState` (persistência). 3 commits: c1 activity-bar · c2 side-bar · c3 view-registry | `src/components/{ActivityBar,SideBar,EditorGroup}.tsx`, `src/core/{viewRegistry,layoutState}.ts`, `App.tsx` (ponto único) | `sessao_15_activity_bar` 5/5 (falhando antes) · vitest ≥ 382 · anti-regressão completa · prints `auditoria_15/` | 🔜 **Próxima (aguarda autorização)** |
| 5.2 ✅ `22a1523` (homologada) | **Search → Side Bar** (mesmo `SearchPanel`; não fecha ao abrir arquivo; contagem — ver A0.5, **não feita**) | `ui/search/*` montagem, `index.ts`/`contract.ts` aditivos | `sessao_15_search_migration` 8/8 · `13_search` 14/14 + 6/6 | Planejada |
| 5.3 ✅ `2bd6cc3` (homologada) | **Source Control → Side Bar** (badge = count ✅; `gitTransition.ts` + maquete D2.38 removidos ✅; Diff continua no anexo — fica lá; A0.7: na 5.7 só acompanha o toggle maximizado) | `ui/attach/{changes,diff}/*` montagem, `index.ts` aditivo, `EditorGroup.tsx`, `App.tsx` ponto único | `sessao_15_source_control_migration` 10/10 · 14b 11 · 14b_backend 7 · 14c 6 · 14d 5 | Planejada |
| 5.4 ✅ `7bd528b` (homologada) | **Activity Bar movível** por menu de contexto (Left/Right; Top/Bottom adiados D2.64) + `activityBarPosition` em localStorage — A0.1 decidida: desvio consciente do agentsWindow readOnly (`docs/25 O13`) | `shell/layoutState.ts`, `shell/activityBar/{ActivityBar.tsx,activityBarMenu.ts,activityBar.css}`, `App.tsx` (wiring) | `sessao_15_activity_bar` T16–T20 (21/21) | Código concluído (homologar) |
| 5.5 ✅ `1f1ed79` | **Drag & Drop de views** Side Bar ↔ Views Panel (novo `.part.panel` acima do terminal) + reordenação na Activity Bar + persistência `viewLayout` | `viewRegistry.ts`, `layoutState.ts`, `shell/dnd/`, `shell/panel/ViewsPanel.tsx`, `SideBar.tsx`, `ActivityBar(Item).tsx`, `App.tsx` (wiring) | `sessao_15_drag_drop_views` T20–T24 5/5 | Código concluído (homologar) |
| 5.7 ✅ `9a11319` | **Editor fino default + maximizar/restaurar** (D6 corrigida A0.7; regra de larguras 2026-10-01) — chat ≥ 420/50 %, anexo ≤ 50 %, Detalhes colapsa; ⤢ toma o centro; `editorMaximized` persistido | `shell/layoutState.ts`, `App.tsx` (wiring), `components/AuxiliaryBar.tsx`, `styles/app.css`, `core/constants.ts` (1 constante, exceção) | `sessao_15_editor_maximize` T30–T32 3/3 · `sessao_14` 16/16 · `activity_bar` 21/21 | Código concluído (homologar) |
| 5.6 ✅ `7d05c7d` | **Timeline e Outline reais** (D2.41) — A0.6: seções do Explorer, seguem o arquivo ativo do anexo; `POST /git/log` aditivo + `show(sha)` | `ui/ExplorerView.tsx`, `ui/activeFileApi.ts`, `ui/attach/monacoOutline.ts`, `core/outline/`, `core/timeline/`, `server/git/{gitHost,index}.ts` (aditivo), `index.ts` (wiring) | `sessao_15_outline_timeline` T26–T29 4/4 | Código concluído (homologar) |
| 5.7 | **Polish visual** (hover, feedback DnD, tokens) — ⚠️ A0.5 animação 200 ms não existe no real | `ActivityBar.tsx`, `SideBar.tsx`, CSS | `sessao_15_polish` 3/3 | Planejada |

**Ordem obrigatória:** 4.7 ✅ → 5.1 ✅ → 5.2 ✅ → 5.3 ✅ → 5.4 ✅ → 5.5 ✅ → 5.6 ✅ (homologada 2026-09-30) → **5.7 🔜 (escopo corrigido A0.7: toggle maximizar/restaurar o editor da AuxiliaryBar; aguarda ordem)** → 5.8 (cada uma só começa com a anterior homologada no Windows). **Fora de escopo:** 4.8 Browser (D2.39), smart commit/Always (D2.35), stage por linha, push/pull (D2.30), multi-root.

**Critério de pronto FATIA-05 (DoD):** 5.1–5.7 homologadas · typecheck 0 · vitest ≥ 382 · E2E 15.x verdes · anti-regressão 14d/14c/14b/14b_backend/14/12/fs_backend/13/terminal · prints `auditoria_15/` · docs 11/12/05/16 + pasta FATIA-05 · zero alteração em `modules/explorer-search/{core,server}/**`.

**Decisões abertas antes do código (05_05 §0):** A0.1 posições fixas no agentsWindow · A0.2 `index.ts`/`contract.ts` aditivos · A0.3 quando o Explorer migra · A0.4 `EditorGroup` novo ao lado do `EditorArea` intocável · A0.5 badge Search/animação · A0.6 Timeline/Outline no Panel ou no Explorer.

### FATIA-06 — Chat + Runtime de Agente
**Onda:** 6 | **Épico:** E — Chat | **Prioridade:** P0 | **Status:** Planejado | **Depende de:** FATIA-01,02,03

| # | Tarefa | Arquivos-alvo | Contrato | Validação | Status |
|---|---|---|---|---|---|
| 6.1 | `AgentRuntimeAdapter` + `ModelProviderAdapter` | `platform/packages/agent-runtime/agent/` + `platform/packages/model-provider/` | `04` #1,2 | typecheck | Planejado |
| 6.2 | `ChatSessionService` create/list/activate/send | `platform/apps/workbench/src/logic/chat/` | `04` #9 | VAL-CHAT-03 | Planejado |
| 6.3 | Streaming `chat.chunk`, `chat.thinking` | `platform/apps/workbench/src/logic/chat/` | `AgentRuntimeEvent` | VAL-CHAT-01 | Planejado |
| 6.4 | Tool approval gate `tool.pending` / `tool.result` | `platform/apps/workbench/src/logic/chat/`, `platform/apps/workbench/src/ui/chat/` | `ToolExecutionAdapter` | VAL-CHAT-02 + VAL-INT-02 | Planejado |
| 6.5 | Snapshots/restore de sessão | `platform/packages/shared/persistence/` | `PersistencePort` | teste focado | Planejado |
| 6.6 | UI ChatPanel, timeline, input, anexos | `platform/apps/workbench/src/ui/chat/` | - | E2E conversa | Planejado |

---

### FATIA-07 — Editor / Browser / Search / Changes
**Onda:** 7 | **Épico:** F — Editor | **Prioridade:** P1 | **Status:** Planejado | **Depende de:** FATIA-02 e 04

| # | Tarefa | Arquivos-alvo | Contrato | Validação | Status |
|---|---|---|---|---|---|
| 7.1 | `EditorService` open/close/split/reveal/save | `platform/apps/workbench/src/logic/editor/` | `04` #7 | typecheck | Planejado |
| 7.2 | Abas e grupos centrais com foco | `platform/apps/workbench/src/ui/editor/` | `WorkbenchLayoutService` | VAL-WB-03 | Planejado |
| 7.3 | Browser, Search, Changes views | `platform/apps/workbench/src/ui/editor/` + `platform/apps/workbench/src/logic/search.ts` | - | E2E navegação cruzada | Planejado |
| 7.4 | Integração explorer<->editor e chat<->editor | `platform/apps/workbench/src/logic/` | - | VAL-INT-01 | Planejado |

---

### FATIA-08 — Command Menu + Theme
**Onda:** 8 | **Épico:** G — Tema e comandos | **Prioridade:** P0 | **Status:** Planejado | **Depende de:** FATIA-02,04,05,06

| # | Tarefa | Arquivos-alvo | Contrato | Validação | Status |
|---|---|---|---|---|---|
| 8.1 | Command Palette + menus contextuais | `platform/apps/workbench/src/ui/shared/`, `platform/apps/workbench/src/logic/commands/` | `CommandRegistry` | VAL-CMD-01 | Planejado |
| 8.2 | Context keys e keybindings | `platform/apps/workbench/src/logic/commands/` | `CommandRegistry.setContext` | teste focado | Planejado |
| 8.3 | `ThemeService` + tokens CSS sem hardcode | `platform/apps/workbench/src/workbench/theme/`, `platform/apps/workbench/src/ui/shared/` | `ThemeService` | VAL-THEME-01 + RNF-VAL-05 | Planejado |
| 8.4 | Coerência visual intermodular | todos `platform/apps/workbench/src/ui/` | - | inspeção visual | Planejado |

---

### FATIA-09 — Hardening transversal
**Onda:** 9 | **Épico:** H — Hardening | **Prioridade:** P0 | **Status:** Planejado | **Depende de:** FATIA-03 a 07

| # | Tarefa | Validação | Status |
|---|---|---|---|
| 9.1 | Correções de fidelidade vs VS Code | matriz `07` sem blockers | Planejado |
| 9.2 | Performance input 16ms + bridge 50ms | RNF-VAL-01,02 | Planejado |
| 9.3 | Reconexão PTY, persistência layout, bordas | RNF-VAL-03,04 | Planejado |
| 9.4 | Testes finais 370 unit + 62 e2e (baseline atual) | `npm test` + `e2e` | Planejado |

---

### FATIA-10 — Release e operação
**Onda:** 10 | **Épico:** H — Release | **Prioridade:** P1 | **Status:** Planejado | **Depende de:** FATIA-09

| # | Tarefa | Doc | Validação | Status |
|---|---|---|---|---|
| 10.1 | Build de release `npm run build` | `09_PLANO_DE_DEPLOY` | build passa | Planejado |
| 10.2 | Deploy staging + smoke test 8 passos | `09` | smoke test pós-deploy | Planejado |
| 10.3 | Observabilidade logs + healthcheck + rollback | `09` | logs sem erro crítico | Planejado |
| 10.4 | Runbook operacional + homologação final | `08`, `10` | aceite V1 | Planejado |

---

## FAIXA 3 — PROCESSO OPERACIONAL (como cada fatia será executada)

### Coluna 4 — HANDOFF PARA IA (P4.1)

| Sub | Nome | Entrada | Saída | Status | Notas |
|---|---|---|---|---|---|
| P4.1 | Preparação do contexto | Próxima frente + `15_HANDOFF` + `16_INICIAR_POR_AQUI` | Contexto pronto | Concluído | Entrada operacional consolidada em `15` e `16`; próxima frente vigente = FATIA-03. |

### Coluna 5 — EM ANDAMENTO — IA (P4.2)

| Sub | Nome | O que é | Status | Notas |
|---|---|---|---|---|
| P4.2 | Execução mais recente concluída | FATIA-03 executada 03.1 a 03.10 com VSCodeTerminal 34KB auto-contido, integração visível 5173, polish visual, fix tela cinza | Concluído 2026-09-14 | 25 testes unit+E2E + 5 pty-server passando, 8080+5173 rodando |
| P4.2b | FATIA-03.11 COMITÊ — Avaliação fidelidade | Usuário reportou "ainda nao esta bom, nao esta com a representacao 100% fiel" — preparar docs viva + kanban para comitê discutir próximos passos | Em andamento 2026-09-14 | Gaps mapeados: codicons, sash, context menu, status, dual impl. Opções A/B/C documentadas em docs/12 |

### Coluna 6 — REVISÃO HUMANA / COMITÊ (P4.3 – P4.4)

| Sub | Nome | Status | Notas |
|---|---|---|---|
| P4.3 | Revisão humana / Comitê | Em andamento 2026-09-14 | Comitê deve decidir nível aceite 85% vs 100%, autorizar tocar App.tsx para Opção B, definir codicons vs lucide, paralelizar FATIA-04 |
| P4.4 | Ajustes e correções pós-comitê | A fazer | Depende decisão comitê: Opção A (polish), B (migrar platform), C (lib/vscode) |
| P4.5 | Registro da fatia | Contínuo | docs/12 atualizada com COMITÊ 2026-09-14 + docs/11 com FATIA-03.11 |

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

## FAIXA 4 — BLOQUEIOS E RISCOS — ATUALIZADO PARA COMITÊ 2026-09-14

| ID | Nome | Status | Mitigação |
|---|---|---|---|
| BLK-01 | Escolha da primeira fatia | Concluído | FATIA-01 já cumpriu a abertura estrutural do plano |
| RISK-01 | Drift entre frontend e serviço PTY | Ativo — mitigado parcial | Mitigado por bridge PTY real 03.1 + PtyManager, mas dual impl legacy VSCodeTerminal vs platform TerminalService ainda gera drift — Opção B resolve |
| RISK-02 | Acoplamento UI/Runtime | Ativo — mitigado parcial | Contratos 04 + 03A + TerminalServiceImpl isolado, mas App.tsx ainda usa legacy TerminalPanel — Opção B migra para platform |
| RISK-03 | Build OOM no ambiente Arena | Ativo | Mitigação: typecheck focado, não build completo toda vez (ADR-008). Vite build travou em transforming... devido monaco — usar dev HMR |
| RISK-04 | Fidelidade terminal 100% vs 85% | Novo — em revisão comitê 2026-09-14 | Gaps: codicons vs lucide, sash 4px, context menu 5 vs 12, status spinner, ShellPicker, dual impl. Opções A/B/C documentadas em docs/12 COMITÊ. Decisão pendente comitê sobre nível aceite |
| RISK-05 | Tela cinza por imports platform em legacy | Mitigado 2026-09-14 | VSCodeTerminal auto-contido sem platform deps elimina import estático que quebrava Vite dev. Validado 5173 200 OK |
| RISK-06 | Abas horizontais browser-like resquício legado | Mitigado 2026-09-14 | TerminalInstanceTabs removido de platform TerminalPanel, VSCodeTerminal só drawer vertical igual VS Code refs 12/14 |

---

## RESUMO EXECUTIVO PARA ACOMPANHAMENTO — ATUALIZADO COMITÊ 2026-09-14

| FATIA | NOME | STATUS | PRÓXIMO PASSO |
|---|---|---|---|
| 01 | Fundação raiz única + contratos | Concluído | Etapa histórica consolidada |
| 02 | Workbench Shell base | Concluído | Base estável |
| 03 | Terminal PTY real | Em revisão comitê — 85% fiel, 03.1 a 03.10 concluídas | Aguardando decisão comitê: Opção A/B/C + nível aceite 85% vs 100% |
| 04 | Explorer Completo + Editor em anexo + Browser com IA (9 sub-fatias) | Em execução — 4.1–4.6 ✅ e **SUB-FATIA 4.7 ✅ CONCLUÍDA (a/b/c/c4, homologada Windows 2026-09-28, `2d1b126`)** — Explorer/Search/Git/Diff/Commit 100 % funcionais; Motor Git fechado | **FATIA-04 CONCLUÍDA (Motor).** Próxima frente = **FATIA-05** (decidida em 2026-09-28); 4.8 UI do Browser fica após a FATIA-05; placar final em `04_21 §6`. Medidas em `04_17`, plano em `04_18`, aceite em `04_13`, estado real em `docs/12` 2026-09-24 |
| 05 | **Chassis-Right** (`docs/24` v1.1: 5.1 chassi+Explorer · 5.2 Search · 5.3 SCM (remove maquete) · 5.4 Activity Bar movível · 5.5 DnD · 5.6 Timeline/Outline · 5.7 toggle maximizar editor (A0.7 — editor fino à direita é o default) · 5.8 Alt+Z + menu de aba) — Gate 0 em `FATIA-05_LAYOUT/` | **Frente vigente — 5.1 ✅ código concluído (`1e9978f`), aguardando homologação no Windows; 5.2 🔜** | Estado exato: `docs/25`; testes/ambiente: `docs/26` |
| 06 | Chat + Runtime de Agente | Planejado | Aguardar decisão FATIA-03 + fechamento FATIA-04/05 |
| 07 | Editor/Browser/Search | Planejado | Aguardar FATIAS 03, 04 e 05 |
| 08 | Command + Theme | Planejado | Aguardar FATIAS 03 a 07 |
| 09 | Hardening | Planejado | Aguardar FATIAS 03 a 08 |
| 10 | Release | Planejado | Aguardar FATIA-09 |

**Onda 0:** concluída com docs `00` a `16` + engenharia reversa + `ANALISE_TERMINAL_CODE_SERVER_CLONE.md`
**Onda 1 / FATIA-01:** concluída 14 tarefas
**Onda 2 / FATIA-02:** concluída 10 testes
**Onda 3 / FATIA-03:** executada 03.1 a 03.10 (25 testes + 5 pty-server), integração visível 5173, polish, fix tela cinza com VSCodeTerminal 34KB auto-contido. Fidelidade atual 85% vs VS Code original, gaps mapeados (codicons, sash, context menu, status, dual impl). **Em revisão comitê 2026-09-14.**

**Próxima ação imediata para comitê:**
1. Revisar `docs/12` seção COMITÊ 2026-09-14 com checklist 13 itens + causas raiz + opções A/B/C
2. Decidir: nível aceite (85% com gaps documentados ou 100% obrigatório?), autorização tocar App.tsx para Opção B, codicons vs lucide, paralelizar FATIA-04
3. Registrar decisão em `docs/12` e atualizar kanban para Opção escolhida
4. Manter servidores 8080+5173 rodando — validados 200 OK
