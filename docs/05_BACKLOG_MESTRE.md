# 05 — BACKLOG MESTRE

## Objetivo
Ordenar a construção do AGENTE WINDOW em ondas executáveis, preservando a modularidade e impedindo que a próxima IA tente implementar tudo de uma vez.

## Regra de uso
- cada onda só começa quando a anterior estiver validada;
- cada onda deve terminar com evidência objetiva de teste;
- durante desenvolvimento, priorizar typecheck, testes focados, probes e E2E;
- build completo entra apenas em marcos de integração ou release.

## Ondas de execução

| Onda | Objetivo | Dependências | Entregas mínimas | Validação de saída |
|---|---|---|---|---|
| 0 | fechar documentação canônica | engenharia reversa pronta | docs 00-16 aprovados | revisão documental completa |
| 1 | convergir a estrutura física para raiz única e contratos compartilhados | onda 0 | raiz única de instalação, pastas de contratos, bootstrap compartilhado | typecheck dos contratos e boot do app |
| 2 | estabilizar Workbench Shell | onda 1 | layout base, partes, resize, persistência de layout, command registry básico | E2E de toggles, resize, maximize/restore |
| 3 | entregar Terminal piloto real | onda 2 | PTY real, tabs, split, focus, clear, persistência por sessão | probe real + E2E do terminal |
| 4 | entregar Explorer + Filesystem | ondas 1 e 2 | árvore, open file, lazy load, watcher, operações básicas | testes de integração de I/O + E2E de navegação |
| 5 | entregar Chat + Runtime de agente | ondas 1, 2 e 3 | sessões, streaming, tool gate, snapshots, artefatos | E2E do fluxo de conversa + aprovação de tool |
| 6 | integrar Editor / Browser / Search / Changes | ondas 2 e 4 | abas, grupos, split central, views auxiliares e integração com explorer/chat | E2E de abertura de abas e navegação cruzada |
| 7 | consolidar Command Menu + Theme | ondas 2, 4, 5 e 6 | palette, context keys, tokens de tema e coerência visual | testes de comandos e regressão visual funcional |
| 8 | hardening transversal | ondas 3 a 7 | correções de fidelidade, performance, reconexão, persistência e bordas | matriz de validação global sem blockers |
| 9 | release e operação | onda 8 | build de release, deploy, smoke test, observabilidade, rollback | homologação e smoke test pós-deploy |

## Backlog priorizado por épico

### Épico A — Fundação documental e estrutural
1. Consolidar `docs/` como fonte principal.
2. Encerrar dependência operacional de `docs-1/`.
3. Definir contratos compartilhados e formato de snapshot.
4. Planejar migração para instalação única na raiz.

### Épico B — Shell do Workbench
1. Layout root.
2. Resize e persistência.
3. Registros de partes/views.
4. Command registry e context keys mínimos.

### Épico C — Terminal
1. Bridge PTY.
2. Lifecycle de instâncias.
3. Split e focus.
4. Clear / maximize / restore / close.
5. Persistência coerente por sessão.

### Épico D — Explorer + Filesystem
1. RPC/bridge de I/O.
2. árvore lazy.
3. watcher.
4. open/reveal.
5. operações de arquivo seguras.

### Épico E — Chat e Agente
1. runtime adapter.
2. session orchestration.
3. streaming.
4. tool approval gate.
5. snapshots/restore.

### Épico F — Editor e Views centrais
1. abas e grupos.
2. browser/search/changes.
3. integração com explorer e chat.
4. sincronização de contexto.

### Épico G — Tema e comandos
1. palette.
2. menus contextuais.
3. tokens CSS e temas.
4. coerência visual intermodular.

### Épico D2 — Refinamento UX Explorer (FATIA-04, itens identificados no Vídeo 4 + auditoria 2026-09-24)
Fonte de estado: `docs/12` entrada "2026-09-24 — Sincronização Pós-Auditoria 4.4"; evidências em `auditoria_44/fase1/`; origem upstream em `docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/04_11` (arquivo:linha) e medidas em `04_17`.

| # | Item | Estado | Fase | Evidência / origem | Bloqueador arquitetural |
|---|---|---|---|---|---|
| D2.1 | Ruído de rede no upload (`ensureParentDirs` sobe até `/`: 3× `POST /fs/mkdir` 403) | **PENDENTE** | 4.4 (fechamento) | auditoria item 11, `core/transfer/upload.ts` l.~153 | — |
| D2.2 | Homologação manual da 4.4 no preview real pelo usuário | **CONCLUÍDO** (2026-09-24, Windows 11; fix `a41f02a`) | 4.4 | `docs/12` 2026-09-25 | — |
| D2.3 | Menu de contexto nos headers das seções (Open Editors/Outline/Timeline + raiz) com checkmarks | **CONCLUÍDO** (`604bb6d`) | 4.5 | `core/menus/viewTitleMenus.ts`; E2E T13; prints `auditoria_45/c5/` | contrato evoluído em `b1c19c3` (`checked?` opcional) |
| D2.4 | Escape fecha o menu de contexto + teclado completo (↑↓ Home/End Enter, Shift+F10, foco devolvido) | **CONCLUÍDO** (`53ac6cc`) | 4.5 | E2E T12 | autorização concedida (host dedicado) |
| D2.5 | Geometria do menu (item 24 px, separadores por grupo, coluna keybinding) | **CONCLUÍDO** (`917e746` + `b1c19c3`) | 4.5 | T11 print lado a lado `auditoria_45/c1/` | `src/components/ExplorerContextMenuHost.tsx` (exceção autorizada) |
| D2.6 | Badges numéricos na Activity Bar | **ADIADO** | 4.6 | Vídeo 4 | shell (não tocado na 4.5) |
| D2.7 | Add/Remove Folder to Workspace no menu da raiz | **ADIADO (fase futura)** | 4.9+ | `fileActions.contribution.ts:617/627` | single-root (`04_11 §11-C`) |
| D2.8 | Cores de status Git nos nomes da árvore (`--vscode-gitDecoration-*`) | **BLOQUEADO → 4.7+** | 4.7+ | Vídeo 4; upstream `extensions/git/src/decorationProvider.ts` → `IDecorationsService` (não mapeado em `04_11`) | **não existe `GitService`/`IDecorationsService` no repo** — precisa de dep `decorations` no contrato + endpoint `git status --porcelain` no server do módulo (código novo, não transplante) |
| D2.9 | Open Editors real / Outline / Timeline com dados | **ADIADO** | 4.7 | `openEditorsView.ts`, `outline.contribution.ts`, `timeline.contribution.ts` (04_11) | precisa do fio editor→módulo (dep `editors.{list,activeUri,dirty,onDidChange,activate,close}` em `IExplorerSearchModuleDeps`) |
| D2.10 | Word Wrap (Alt+Z), Split Editor, Markdown Preview | **DEFERIDO** | 4.7b / 4.7c | Vídeo 4 00:36 / 43 s; checklist 4.7-E4/E5/E6 | editor anexo (4.7) ainda não existe |
| D2.11 | Drag & drop para reordenar seções | **ADIADO** | 4.9 | Vídeo 4 01:11; checklist 4.4-S4 (`SidebarPart` view drag) | SplitView do módulo é coluna flex (sem `ViewPaneContainer` DnD) |
| D2.12 | Resize de seções por sash com persistência | **ADIADO** | 4.9 | checklist 4.4-S5 | idem |
| D2.13 | Hover actions inline nos itens da árvore + feedback visual de drag (opacity/`dropBackground`) | **ADIADO** | 4.9 | checklist 4.4-T5/T6; `explorerViewer.ts:825/1571` | — |
| D2.14 | Fonte `seti.woff` (glyphs reais por linguagem; hoje glyph codicon + cor Seti) | **ADIADO** | 4.9 | `0d86656`; `vs-seti-icon-theme.json` | trazer asset exige autorização |
| D2.15 | Breadcrumb bar acima do editor (TR-BC1), BranchChanger real (TR-BR1), Source Control panel (TR-SC1) | **REGISTRADO** | 4.7 / fora da FATIA-04 | checklist §7 | TR-BR1/TR-SC1 dependem de serviço Git (ver D2.8) |
| D2.16 | Botão "…" (Views and More Actions) no título do Explorer (35 px) para reexibir views ocultas | **ADIADO (fase futura)** | 4.7 | régua 8080 `auditoria_45/c5/explorer_views_more_actions.png` | título de 35 px é do shell; hoje as views voltam pelo menu de qualquer pane-header (Folders nunca some) |
| D2.17 | Ordem dos panes igual ao VS Code (Open Editors antes de Folders) | **ADIADO (fase futura)** | 4.7 | `EXPLORER_VIEWS` em `viewTitleMenus.ts` já está na ordem certa; só o JSX de `ExplorerView.tsx` difere | — |
| D2.18 | Outline "More Actions…" (Follow Cursor / Filter on Type / Sort By) e ações inline do Timeline (Pin / Refresh / Filter) | **ADIADO (fase futura)** | 4.7 | régua 8080 `auditoria_45/c5/header_{Outline,Timeline}.png`; decisão do usuário 2026-09-25 | exigem Outline/Timeline com dados (D2.9) |
| D2.19 | Ações do header do Search (Refresh · Clear Search Results · Collapse All) | **ADIADO → 4.9** (a 4.7 não tocou a aba Search do shell) | 4.9 | 04_19 §4 item 10 | a aba Search do shell não tem pane header (`EditorArea.tsx`); não inventar barra própria |
| D2.20 | Reveal na linha/coluna ao abrir um match do Search (preview + Enter pinado) | **CONCLUÍDO** (4.7 c4 `aac4c8b`; E2E `sessao_14` T9; `attach.open({line,column})` + highlight `findMatchHighlightBackground`) | 4.7 | 04_19 §4 item 12; `data-line/data-column` já ficam na row | `explorer.fileOpened` do contrato congelado leva só `uri` (evoluir contrato v2 junto do editor 4.7) |
| D2.21 | Links "Open Settings"/"Learn More" do estado vazio e "Open in editor" da mensagem de contagem | **FORA DE ESCOPO** | — | 04_19 §3 | Settings UI e Search Editor não existem no produto |
| D2.22 | Aba **"Changes"** (Git) dentro do anexo, como no vídeo `editor/34` | **CONCLUÍDO — HOMOLOGADO NO WINDOWS 2026-09-27** (4.7-b c1 `3e12adc` backend `/git/*` · c2 `9575457` aba fixa + Source Control View · c3 `3c69242` Stage/Unstage/Discard + diálogos oficiais · c3.1 `a931f72` hotfix caminhos Windows · c3.2 `6c91289` entrada no header Explorer + transição da maquete; prints `auditoria_47b/validacao_real_v2/`) | 4.7-b | `04_21` plano; `docs/12` entradas 2026-09-27 | escopo homologado = c1–c3.2; **input de commit (c4) e placar `04_21 §6` (c5) pendentes de decisão do usuário** |
| D2.23 | Picker dropdown dos breadcrumbs (clicar num item abre a lista de irmãos) | **ADIADO → 4.7-c** | 4.7-c | `04_20 §3` "fora de escopo (só rótulos)"; `ui/attach/Breadcrumbs.tsx` só renderiza rótulos + separador | — |
| D2.24 | Botão **Split Editor** (`Ctrl+\`) na toolbar do anexo | **FORA DO ESCOPO 4.7 inicial** | — | `04_20 §3` "split de grupos"; toolbar hoje = ⤢ + ✕ (`04_20 §4.2` E5) | 1 grupo por sessão por contrato (`04_05 §2`) |
| D2.25 | **Print lado a lado 8080 do diálogo de save (c5) e do maximize (c6) ausente** — abrir a pasta no code-server sobe ~5 extension hosts e o sandbox (1,9 GB) travou 3× | **VALIDADO POR PROVA SECUNDÁRIA** (medidas CSS computadas + E2E T12/T14; régua 8080 do mesmo `.monaco-dialog-box` medida na 4.6: 498 px, radius 12, padding 8, botões 26 px) | 4.7 | `auditoria_47/c5/ours_c5_save_dialog.png` + `vscode_8080_dialog_regua_from_4.6.png`; `auditoria_47/c6/ours_c6_{normal,maximized,empty_state}.png`; `04_20 §4.2` E2.e/E7 | refazer o par no Windows local do usuário (RAM suficiente) durante a homologação |
| D2.26 | Glifos/raios da faixa: ✕ da aba usa `codicon-close` (`\ea76`) no lugar de `close-small`; botões da toolbar com radius 5 (VS Code: 6) | **ADIADO → 4.9** | 4.9 | `04_20 §4.2` E2.c/E5 | fonte codicon do monaco não traz `close-small`; ajuste de 1 px de raio |
| T-12 | **Flaky conhecido** em lote: `sessao_12_explorer` T9 ("X do Open Editors aparece no hover") e "ERROR EDITOR" falham ~1 em 3 rodadas **só no lote completo** (30 testes seguidos); passam isolados e no lote seguinte; `sessao_03_layout` "persiste após F5" idem (1 em 2) | **FLAKY CONHECIDO** (não bloqueia) | — | rodadas 2026-09-26 no c5/c6 (relatórios no chat); causa provável: RAM do sandbox (esbuild do vite morreu por EPIPE 1×) | estabilizar com `retries: 1` no Windows ou isolar por `describe.serial` — decisão futura |
| D2.27 | Pasta sem repositório → `git init` pelo botão **Initialize Repository** | **CONCLUÍDO** (4.7-b c2, texto oficial + E2E `14b_changes` T5) | 4.7-b | `04_21 §1.3` | — |
| D2.28 | **Diff inline** ao clicar num arquivo da aba Changes (hoje abre o arquivo normal no anexo — decisão do usuário 2026-09-27) | **PENDENTE → 4.7-c** | 4.7-c | `04_21 §2` | exige DiffEditor Monaco + `/git/show` (conteúdo do HEAD/index) |
| D2.29 | Grupo **Untracked Changes** separado (config `git.untrackedChanges: separate`) — MVP mostra U dentro de Changes (default `mixed` do VS Code) | **PENDENTE** | 4.7-c | `04_21 §1.2` | — |
| D2.30 | **Push / Pull / Sync** (barra de status e menu `…` da SCM) | **PENDENTE** | futuro | `04_21 §2` | remoto/credenciais fora do MVP |
| D2.31 | Branch picker (clicar no nome da branch) | **PENDENTE** | futuro | `04_21 §2` | — |
| D2.32 | Grupo **Merge Changes** / conflitos (`u` do porcelain v2 já parseado) | **PENDENTE** | futuro | `04_21 §1.2` | — |
| D2.33 | Badge de contagem no ícone da aba Changes (fixa) | **PENDENTE** | 4.9 | `04_21 §1.1` | — |
| D2.34 | Print 8080 da SCM View real lado a lado (RAM do sandbox) | **PROVA SECUNDÁRIA** (régua CSS do `workbench.web.main.internal.css` + strings do `dist/main.js` da extensão git) | 4.7-b | `auditoria_47b/c2`, `c3` | refazer no Windows do usuário |
| D2.35 | Botão **Always** no diálogo "no staged changes" (config `git.enableSmartCommit`) | **PENDENTE** (entra com c4) | 4.7-b c4 | `04_21 §1.4` | sem Settings UI |
| D2.36 | `server.mjs` (preview build) não monta `/git/*` | **PENDENTE** | 4.9 | `platform/README.md` | replicar o padrão `build:fs-server` |
| D2.37 | Tokens `--vscode-gitDecoration-{untracked,stageModified,stageDeleted,renamed,conflicting,ignored}ResourceForeground` ausentes no `theme.css` do shell (módulo usa fallback semântico encadeado) | **PENDENTE (shell)** | 4.9 | `ChangesList.tsx fallbackFor()` | tema é do shell |
| D2.38 | **Remoção definitiva da maquete** "Changes N"/Checks/PR do painel Detalhes (`src/data.ts` `initialDiffFiles`) — hoje escondida pela **Transição Temporária 4.7-b** (`src/shell/gitTransition.ts`, fallback se o módulo faltar) | **AGENDADO (pós-homologação 4.7-b completa)** | 4.9 | `docs/12` 2026-09-27 c3.2 | decidir destino de Checks/PR simulados que vivem no mesmo painel |

Itens **CORRIGIDOS** nesta frente (não voltam ao backlog): B3 Browser abre no boot (`876b83d`), menu Copy Path/Delete Permanently (`60287b9`), seções com corpo 0 px + Refresh vazio (`f5a4c1d`), `.git` visível (`70f2231`), download multi → 1 ZIP (`e2a1058`), ícones por extensão (`0d86656`).

### Épico H — Release
1. build de integração.
2. testes finais.
3. deploy.
4. operação e feedback loop.

## Critério de pronto por fatia
Uma fatia só avança quando tiver:
- objetivo explícito;
- arquivos-alvo definidos;
- contrato associado;
- critério de aceite objetivo;
- validação executada;
- relato final no chat com concluído, pendências e validações executadas.

## Estado atual da execução
- **2026-09-27:** **4.7-b (aba Changes / Git real) HOMOLOGADA NO WINDOWS no escopo c1–c3.2** (HEAD `6c91289`; smoke real 1/1 · `14b_changes` 11/11 · vitest 372). **D2.22 e D2.27 CONCLUÍDOS**; novos D2.28–D2.38 (D2.38 agendado). Pendentes da 4.7-b: c4 input de commit (+D2.35) e c5 placar `04_21 §6`. **Próxima frente: decisão do usuário** entre 4.7-c Diff inline (D2.28), 4.8 Browser contextual ou refinamentos UX — nenhuma iniciada.
- **2026-09-26 (noite):** **4.7 IMPLEMENTADA** (c1–c7; HEAD pós-`a394f53`; placar `04_20 §4.2` = **14/14 PASS**; E2E `sessao_14` 16/16; vitest 341). D2.20 **CONCLUÍDO**; D2.19 → 4.9; novos D2.22–D2.26 e T-12. **Aguarda homologação humana no Windows** (checklist `04_20 §4.4`) e decisão da próxima frente: **4.8 Browser contextual (B1/B2)** ou **4.7-b Git (D2.22)**.
- **2026-09-26 (tarde):** **4.6 CONCLUÍDA** — homologada pelo usuário no Windows (Vídeo 5). 4.7 em auditoria (`04_20`): D2.20 previsto para fechar no c4 da 4.7; D2.19 permanece.
- **2026-09-26:** **4.6 IMPLEMENTADA** (c1–c7, HEAD pós-`985160f`; placar 04_19 §4 = 12 PASS · 1 PARCIAL · 1 FAIL). Novos débitos D2.19–D2.21. D2.6 (badges Activity Bar) permanece ADIADO (fora do escopo aprovado da 4.6 → 4.9+).
- **2026-09-25 (tarde):** **4.5 CONCLUÍDA** — homologada pelo usuário no Windows 11 (checklist 4/4). D2.2–D2.5 CONCLUÍDOS; D2.7/D2.16–D2.18 movidos para fases futuras (4.7/4.9+). **4.6 (Search Panel + Replace) em preparação** — auditoria + plano antes de código.
- **2026-09-25 (manhã):** 4.1–4.4 concluídas (4.4 homologada, `a41f02a`); 4.5 em execução 5/6 (HEAD `604bb6d`).
- **2026-09-24:** Ondas 1–3 concluídas (FATIA-01/02/03). Onda 4 em execução: 4.1–4.3 concluídas; 4.4 PARCIAL (10/11 PASS — `docs/12` 2026-09-24; HEAD `0d86656`); hotfix 4.8-B3 aplicado.
- Histórico (2026-09-13):
- Ondas 1 e 2 já foram concluídas no repositório atual.
- A base estrutural aprovada já foi materializada em `platform/` e `legacy/`.
- A próxima frente funcional autorizada é a Onda 3 / FATIA-03 — Terminal piloto real com PTY.

## O que a próxima IA não deve fazer
- pular da onda 0 para a 3 sem concluir fundação;
- misturar refatoração estrutural e feature nova na mesma fatia sem necessidade;
- tentar implementar múltiplos épicos grandes no mesmo turno;
- usar `docs-1/` como autoridade principal depois desta consolidação.
