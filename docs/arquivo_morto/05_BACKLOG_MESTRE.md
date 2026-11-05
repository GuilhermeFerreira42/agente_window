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
| 5 ✅ **100 % (homologada Windows 2026-10-02)** | consolidar Layout Byte a Byte (FATIA-05: Activity Bar + Side Bar reais, Search/Changes simultâneos, DnD de views, Timeline/Outline, polish) | onda 4 (motores prontos) | views reposicionadas só por wiring; zero mudança em core/server | E2E de simultaneidade + prints vs 8080 + specs 12/13/14/14b/14c verdes |
| 6 🔜 **PRÓXIMA — Chat Carcaça (aguardando autorização)** | entregar Chat + Runtime de agente (FATIA-06) | ondas 1, 2 e 3 | sessões, streaming, tool gate, snapshots, artefatos | E2E do fluxo de conversa + aprovação de tool |
| 7 | integrar Editor / Browser / Search / Changes | ondas 2, 4 e 5 | abas, grupos, split central, views auxiliares e integração com explorer/chat | E2E de abertura de abas e navegação cruzada |
| 8 | consolidar Command Menu + Theme | ondas 2, 4, 5, 6 e 7 | palette, context keys, tokens de tema e coerência visual | testes de comandos e regressão visual funcional |
| 9 | hardening transversal | ondas 3 a 8 | correções de fidelidade, performance, reconexão, persistência e bordas | matriz de validação global sem blockers |
| 10 | release e operação | onda 9 | build de release, deploy, smoke test, observabilidade, rollback | homologação e smoke test pós-deploy |

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
| D2.19 | Ações do header do Search (Refresh · Clear Search Results · Collapse All) | **ADIADO → 4.9** — **reavaliado na 5.2 (2026-09-30): NÃO fecha de graça.** O Search agora vive na Side Bar (título 35 px com slot de ações), mas as ações não foram implementadas (fora do escopo da 5.2). Pré-requisito resolvido; falta só o trabalho | 4.9 / 5.8 | 04_19 §4 item 10 | não inventar barra própria; usar o slot de ações do título da Side Bar |
| D2.20 | Reveal na linha/coluna ao abrir um match do Search (preview + Enter pinado) | **CONCLUÍDO** (4.7 c4 `aac4c8b`; E2E `sessao_14` T9; `attach.open({line,column})` + highlight `findMatchHighlightBackground`) | 4.7 | 04_19 §4 item 12; `data-line/data-column` já ficam na row | `explorer.fileOpened` do contrato congelado leva só `uri` (evoluir contrato v2 junto do editor 4.7) |
| D2.21 | Links "Open Settings"/"Learn More" do estado vazio e "Open in editor" da mensagem de contagem | **FORA DE ESCOPO** | — | 04_19 §3 | Settings UI e Search Editor não existem no produto |
| D2.22 | Aba **"Changes"** (Git) dentro do anexo, como no vídeo `editor/34` | **CONCLUÍDO — HOMOLOGADO NO WINDOWS 2026-09-27; fechado por completo em 2026-09-28 com o c4 Input de Commit `2d1b126`** (4.7-b c1 `3e12adc` backend `/git/*` · c2 `9575457` aba fixa + Source Control View · c3 `3c69242` Stage/Unstage/Discard + diálogos oficiais · c3.1 `a931f72` hotfix caminhos Windows · c3.2 `6c91289` entrada no header Explorer + transição da maquete; prints `auditoria_47b/validacao_real_v2/`) | 4.7-b | `04_21` plano; `docs/12` entradas 2026-09-27 | escopo homologado = c1–c3.2; **input de commit (c4) e placar `04_21 §6` (c5) pendentes de decisão do usuário** |
| D2.23 | Picker dropdown dos breadcrumbs (clicar num item abre a lista de irmãos) | **ADIADO → 4.7-c** | 4.7-c | `04_20 §3` "fora de escopo (só rótulos)"; `ui/attach/Breadcrumbs.tsx` só renderiza rótulos + separador | — |
| D2.24 | Botão **Split Editor** (`Ctrl+\`) na toolbar do anexo | **FORA DO ESCOPO 4.7 inicial** | — | `04_20 §3` "split de grupos"; toolbar hoje = ⤢ + ✕ (`04_20 §4.2` E5) | 1 grupo por sessão por contrato (`04_05 §2`) |
| D2.25 | **Print lado a lado 8080 do diálogo de save (c5) e do maximize (c6) ausente** — abrir a pasta no code-server sobe ~5 extension hosts e o sandbox (1,9 GB) travou 3× | **VALIDADO POR PROVA SECUNDÁRIA** (medidas CSS computadas + E2E T12/T14; régua 8080 do mesmo `.monaco-dialog-box` medida na 4.6: 498 px, radius 12, padding 8, botões 26 px) | 4.7 | `auditoria_47/c5/ours_c5_save_dialog.png` + `vscode_8080_dialog_regua_from_4.6.png`; `auditoria_47/c6/ours_c6_{normal,maximized,empty_state}.png`; `04_20 §4.2` E2.e/E7 | refazer o par no Windows local do usuário (RAM suficiente) durante a homologação |
| D2.26 | Glifos/raios da faixa: ✕ da aba usa `codicon-close` (`\ea76`) no lugar de `close-small`; botões da toolbar com radius 5 (VS Code: 6) | **ADIADO → 4.9** | 4.9 | `04_20 §4.2` E2.c/E5 | fonte codicon do monaco não traz `close-small`; ajuste de 1 px de raio |
| T-12 | **Flaky conhecido** em lote: `sessao_12_explorer` T9 ("X do Open Editors aparece no hover") e "ERROR EDITOR" falham ~1 em 3 rodadas **só no lote completo** (30 testes seguidos); passam isolados e no lote seguinte; `sessao_03_layout` "persiste após F5" idem (1 em 2) | **FLAKY CONHECIDO** (não bloqueia) | — | rodadas 2026-09-26 no c5/c6 (relatórios no chat); causa provável: RAM do sandbox (esbuild do vite morreu por EPIPE 1×) | estabilizar com `retries: 1` no Windows ou isolar por `describe.serial` — decisão futura |
| D2.27 | Pasta sem repositório → `git init` pelo botão **Initialize Repository** | **CONCLUÍDO** (4.7-b c2, texto oficial + E2E `14b_changes` T5) | 4.7-b | `04_21 §1.3` | — |
| D2.28 | **Diff mínimo** por arquivo na aba Changes (side-by-side read-only no anexo, Monaco DiffEditor; "No changes detected" se idêntico) + badge/tooltip "X files changed" + empty state "No source control changes detected" | ✅ **CONCLUÍDO — 4.7-c homologada no Windows 2026-09-28 (Vídeo 6)** (c1 `9b8d26f` · c2 `0b7b7b1`) | 4.7-c | `04_21 §7`, `docs/12` 2026-09-28 | vista inline automática < 900 px (padrão VS Code); sem print 8080 (RAM) — prova secundária: régua do runtime em `auditoria_47c/c1/README.md` |
| D2.29 | Grupo **Untracked Changes** separado (config `git.untrackedChanges: separate`) — MVP mostra U dentro de Changes (default `mixed` do VS Code) | **PENDENTE** | 4.7-c | `04_21 §1.2` | — |
| D2.30 | **Push / Pull / Sync** (barra de status e menu `…` da SCM) | **PENDENTE** | futuro | `04_21 §2` | remoto/credenciais fora do MVP |
| D2.31 | Branch picker (clicar no nome da branch) | **PENDENTE** | futuro | `04_21 §2` | — |
| D2.32 | Grupo **Merge Changes** / conflitos (`u` do porcelain v2 já parseado) | **PENDENTE** | futuro | `04_21 §1.2` | — |
| D2.33 | Badge de contagem no ícone da aba Changes (fixa) | ✅ **CONCLUÍDO na 4.7-c** (badge `--vscode-badge-*` + `title`/`aria-label` "N file(s) changed") | 4.7-c | `04_21 §7` | — |
| D2.34 | Print 8080 da SCM View real lado a lado (RAM do sandbox) | **PROVA SECUNDÁRIA** (régua CSS do `workbench.web.main.internal.css` + strings do `dist/main.js` da extensão git) | 4.7-b | `auditoria_47b/c2`, `c3` | refazer no Windows do usuário |
| D2.35 | Botão **Always** no diálogo "no staged changes" (config `git.enableSmartCommit`) | **PENDENTE** — o c4 (`2d1b126`) entregou o input de commit + diálogo [Yes][Cancel]; o botão Always ficou fora por não haver Settings | FATIA-05 ou 4.9 | `04_21 §1.4` | sem Settings UI |
| D2.36 | `server.mjs` (preview build) não monta `/git/*` | **PENDENTE** | 4.9 | `platform/README.md` | replicar o padrão `build:fs-server` |
| D2.37 | (5.3: SCM na Side Bar **não** consome tokens novos — mesmo `changes.css`, agora com fundo `--vscode-sideBar-background`; débito inalterado) Tokens `--vscode-gitDecoration-{untracked,stageModified,stageDeleted,renamed,conflicting,ignored}ResourceForeground` ausentes no `theme.css` do shell (módulo usa fallback semântico encadeado) | **PENDENTE (shell)** | 4.9 | `ChangesList.tsx fallbackFor()` | tema é do shell |
| D2.38 | **Remoção definitiva da maquete** "Changes N"/Checks/PR do painel Detalhes (`initialDiffFiles`, `gitTransition.ts`, `hideChangesTab`, `ChangesDetails`/`FilesDetails`, `useMockChangesTransition`, seed do "build the project") | **✅ CONCLUÍDO na 5.3 `2bd6cc3`** — spec 15 T14 prova ausência no DOM; 10 unit tests da maquete → `it.skip` (D2.60) | FATIA-05 5.3 | `docs/25 §2.1c` | Checks/PR simulados foram junto (eram parte do mesmo `ChangesDetails`) |
| D2.39 | **Browser Runtime IA/CDP** — capacidade de a IA ler o HTML da página e interagir via Playwright/CDP (isolamento por sessão) | **ADIADO (decisão 2026-09-27)** — a 4.8 fica **só com a UI visual** do Simple Browser | pós-FATIA-05 | `docs/11` linha 4.8; `docs/12` "Decisão Estratégica" | nenhum código de runtime na 4.8 |
| D2.40 | **Layout Global / Activity Bar real** — mover as views de **Search** e **Source Control ("Changer")** para a **Side Bar independente** e criar os ícones (com badges) na **Activity Bar**; visualização simultânea com o editor (abrir arquivo não fecha Search/Changes) | **PENDENTE — alvo da FATIA-05** | FATIA-05 (5.1–5.3) | `docs/11` FATIA-05 | só wiring: `core/**` e `server/**` intocados |
| D2.41 | **Timeline e Outline views** reais (hoje só headers colapsados no painel Files) | **✅ CONCLUÍDO na 5.6 `7d05c7d`** — Outline via DocumentSymbol do Monaco; Timeline via `POST /git/log` + diff por commit; spec `sessao_15_outline_timeline` 4/4; restam D2.67–D2.69 | FATIA-05 (5.6) | `docs/11` FATIA-05 | medidas do 8080 |
| D2.42 | **FATIA-05 · 5.1** Activity Bar + Side Bar + Editor Group (slots) + viewRegistry/layoutState | **PENDENTE — próxima autorizada em princípio (código só após revisão dos docs)** | FATIA-05 5.1 | `FATIA-05_LAYOUT_BYTE_A_BYTE/05_05 §5.1` | `sessao_15_activity_bar` 5/5 |
| D2.43 | **FATIA-05 · 5.2** Search na Side Bar (não fecha ao abrir arquivo) | **✅ CONCLUÍDO** `22a1523` — spec 15 T6–T9; §9 13/13 ×2; sem badge na lupa (decisão do prompt) | FATIA-05 5.2 | `docs/25 §2.1b` | badge A0.5 continua fora |
| D2.44 | **FATIA-05 · 5.3** Source Control na Side Bar; remove `gitTransition.ts`/maquete (absorve D2.38) | **✅ CONCLUÍDO** `2bd6cc3` (decisão A: aba Changes do anexo removida; SCM só na Side Bar; badge `git.count()`; Diff **continua no anexo** até a 5.7 — "Diff no Editor Group central" é da 5.7 por definição do `docs/24 §4`) | FATIA-05 5.3 | `docs/25 §2.1c` | 6 E2E de lógica da aba em `test.skip` (D2.60) |
| D2.45 | **FATIA-05 · 5.4** Configurabilidade de posições (Activity Bar/Panel) | **PENDENTE — ⚠️ DECISÃO ABERTA A0.1** (perfil agentsWindow real = posições readOnly) | FATIA-05 5.4 | `05_01 §0`, `05_05 §5.4` | |
| D2.46 | **FATIA-05 · 5.5** Drag & Drop de views Side Bar ↔ Panel | **PENDENTE** | FATIA-05 5.5 | `05_05 §5.5` | |
| D2.47 | **FATIA-05 · 5.6** Timeline + Outline (absorve D2.41; requer `POST /git/log` aditivo) | **PENDENTE — ⚠️ A0.6 localização** | FATIA-05 5.6 | `05_05 §5.6` | |
| D2.48 | **FATIA-05 · 5.7** Polish visual (hover, DnD feedback, tokens) | **PENDENTE — ⚠️ A0.5 animação** | FATIA-05 5.7 | `05_05 §5.7` | |
| D2.49 | **V1-R1 (vídeo)** — reproduzir a sequência do vídeo de referência no chassi novo e conferir divergências ponto a ponto | **PENDENTE — herdado da auditoria de vídeos (Gate 0, 2026-09-29)** | FATIA-05 5.8 ou fatia seguinte | `docs/24 §1`, `FATIA-05_LAYOUT/05_00 §6-g` | validação na homologação (vídeo não está no sandbox) |
| D2.50 | **"Lixo visual"** — remover botões/abas/elementos do shell que não existem no VS Code real (lista a ser fechada pelo usuário); inclui a coluna "Detalhes" da AuxiliaryBar vazia | **✅ coluna "Detalhes" + botões "Barra auxiliar"/"Alternar detalhes" REMOVIDOS DE VEZ na 5.8-c1 `d0c2a8d` (2026-10-02)**; demais itens da lista seguem pendentes para fase futura | FATIA-05 5.8 ou fatia seguinte | `05_00 §6-g` | nunca tocar terminal |
| D2.51 | **Split editor** (dividir grupo de editores) | **PENDENTE — fora da 5.1** | fatia seguinte | `05_00 §6-g` | A0.7: não depende mais da 5.7 (editor fica fino à direita) |
| D2.52 | **RF-09 maximize real** — maximizar esconde a Side Bar, mantém lista de conversas e terminal (E2E) | **✅ FECHADO no c2 `fd05507`** → **REVOGADO para a 5.7 em 2026-10-02 (docs/24 v1.2, `d0a2f81`): maximizar MANTÉM a Side Bar 274; só o chat some** — spec 15 T4b/T30 ajustadas | FATIA-05 5.8 | `docs/24 §6.1 RF-09`, `05_01 §3` ("não medido — validar na homologação") | medir painel maximizado no 8080 durante a homologação |
| D2.53 | **Open Editors** real no Explorer (absorve D2.9) | **PENDENTE — fora da 5.1** | FATIA-05 5.8 ou fatia seguinte | `05_00 §6-g` | seção do Explorer, como no VS Code |
| D2.54 | **13 E2E mortos** (`sessao_08` T2–T4, `sessao_10` T3–T5, `sessao_11b/c/d/e/f`) — testam rótulos do terminal pré-`75c6686` e a árvore demo antiga | **PENDENTE — decisão do usuário (P3): apagar / reescrever / congelar** | higiene, fora da 5.1 | `docs/26 §2.4`, `05_02 §5.2` | terminal intocável: só o teste pode mudar |
| D2.55 | **`TerminalPanel.test.tsx` 9 falhas** — teste espera região "Terminal", implementação renderiza `aria-label="Painel Inferior"` | **PENDENTE — decisão do usuário (P4)** | higiene | `docs/26 §2.5`, `05_02 §4` | explica o "708/717"; corrigir só o teste, se autorizado |
| D2.56 | **T14 `sessao_14_editor_anexo` × Side Bar** — anexo maximizado deixa chat com 180 px (< 240) | **✅ FECHADO** pelo RF-09 (c2) — 16/16 sem tocar no teste | FATIA-05 5.1 | `docs/25 §3` | não alterar a lógica do teste sem ordem |
| D2.57 | **Specs 12/14/14b/14c/14d obtêm `sessionId` pela aba `aux-tab-<sid>-files`**, que some no c3 | **✅ FECHADO no c3 `1e9978f`** — `data-session-id` no `aside.auxiliary-bar`; só leitura/preâmbulo mudou; única asserção alterada: `14b_smoke` l.57 (decisão 1-a) | FATIA-05 5.1 c3 | `docs/25 §4` | é lógica de teste, não só seletor |
| D2.58 | **Remover `legacy/`** do branch principal com tag de backup (`legacy-backup-2026-09`) | **DECIDIDO pelo usuário 2026-09-29 — executar no Windows** | imediato | `docs/28 §1` | nenhum código depende dela |
| D2.60 | **16 unit tests `it.skip` + 6 E2E `test.skip`**: unit → **2** maquete "Workspace Files" (c3) + **4** aba Search do editor (5.2) + **10** maquete "Changes N" (5.3: `App.test.tsx` 7 — Branch Changes/diff simulado/Changes pill/build the project/single-pane/Toggle Details; `iconLabels.test.ts` 2; `coverageIntegration.test.tsx` 1); E2E → `14b_git_changes` T1/T5, `14c_diff_minimal` T1/T3/T5/T6 (lógica da aba fixa "Changes" do anexo, removida na 5.3; substitutos: spec 15 T10–T15). Cobertura equivalente: spec 15 T5–T9 + `sessao_12_explorer` + `sessao_13_search` | **PENDENTE — D2.54 (13 E2E mortos) + D2.55/P4 (9 TerminalPanel) + D2.60 = pacote único de "higiene de testes"; decisão futura do usuário; não decidir isoladamente** | higiene, fora da 5.x | `docs/25 §6 P7` | vitest hoje 702/9/6 |
| D2.61 | **Single-pane / mobile sem Explorer** — a Side Bar só renderiza no desktop (`!isSinglePane`); com a aba Files removida, o modo estreito não tem árvore de arquivos | **PENDENTE — validar na homologação; decidir se a Side Bar entra no single-pane (5.8) ou se é aceito** | FATIA-05 5.8 | `docs/25 §5 O10` | o módulo só pode ser montado 1× |
| D2.62 | **Abas `search` persistidas de sessões antigas** renderizam a demo `SearchView` do `EditorArea.tsx` (o `searchSlot` deixou de ser passado na 5.2; `EditorArea` é intocável até 5.7) | **PENDENTE — some na 5.7 (EditorArea reescrito) ou com limpeza do estado persistido; validar na homologação da 5.2** | FATIA-05 5.7 | `docs/25 §2.1b` | não tocar `EditorArea.tsx` |
| D2.65 | **DnD de views só com ponteiro** — HTML5 `draggable` não dispara em touch; não há atalho de teclado para mover/reordenar views (5.5) | **PENDENTE — decidir na 5.8 (polish/a11y) se entra menu "Move View to…" por teclado** | FATIA-05 5.8 | `docs/12` entrada 5.5 | sem lib externa de DnD |
| D2.67 | **Outline não segue o cursor** nem rola até o item selecionado (VS Code: `outline.followCursor`/realce da linha atual; `symbolAtLine` já existe em `core/outline/outlineModel.ts`, falta ligar `onDidChangeCursorPosition` + `scrollIntoView`) | **PENDENTE** | FATIA-05 5.8 | `docs/12` adendo 5.6 | — |
| D2.68 | **Aba Diff ativa → Outline/Timeline mostram a frase padrão** (VS Code mantém a Timeline do recurso do diff e o Outline do lado modified) | **PENDENTE** | FATIA-05 5.8 (A0.7: o Diff fica no anexo) | `docs/12` adendo 5.6 | `activeCodeUri()` só considera `kind:'code'` |
| D2.69 | **Timeline sem "Load more"/filtro e só Git** (limite 50 commits; sem "Local History"; tempo relativo só em inglês) | **PENDENTE** | FATIA-05 5.8 | `docs/12` adendo 5.6 | — |
| D2.66 | **Views Panel sem sash de altura nem fechar/maximizar** — 240 px fixos (`--views-panel-height`), "não medido — validar na homologação" | **PENDENTE — validar na homologação da 5.5; sash na 5.8 se o usuário pedir** | FATIA-05 5.8 | `docs/25 §5 O14` | não tocar terminal |
| D2.64 | **Top/Bottom da Activity Bar adiados** — no menu "Move Activity Bar …" (5.4) as opções Top/Bottom aparecem desabilitadas (opacity 0.4); barra horizontal acima/abaixo da Side Bar exige wrapper coluna que quebra a régua do sash (`SideBar.tsx` mede pelo `parentElement`) | **PENDENTE — decidir se entra na 5.8 (layout) ou se fica adiado de vez; validar com o usuário na homologação da 5.4** | FATIA-05 5.8 | `docs/12` entrada 5.4 · `docs/25 §5 O13` | não refatorar `.main-region` sem ordem |
| D2.63 | **Chat espremido (~80 px) em 1400 px** com anexo aberto + Side Bar 300 px (AttachArea ainda na AuxiliaryBar) | **✅ FECHADO em `9a11319` (5.7)** — regra "A + 2 com piso 420": chat ≥ 420 px e ≥ 50 % da faixa, anexo ≤ 50 %, "Detalhes" colapsa na 1.ª aba; medido 1400 px → chat 420 / anexo 356 / Detalhes 0 (antes 72 / 360 / 330) | FATIA-05 5.7 | `docs/25 §6 P11/P21`, prints `auditoria_05/c5.7/` | confirmar no Windows |
| D2.70 | **Abas do anexo não sobrevivem ao F5** (o módulo persiste largura/maximizado, não as abas) — no original cada sessão restaura os editores abertos | PENDENTE | FATIA-06 / fatia do módulo | `docs/24 §4 5.7` (nota "Entregue") | achado na spec T31 da 5.7 |
| D2.71 | **"Detalhes" e editor fino exclusivos na faixa fina** (regra 5.7 autorizada) — reavaliar quando a coluna "Detalhes" ganhar conteúdo real (hoje vazia, D2.50) | PENDENTE (decisão registrada) | FATIA-05 5.8+ | `docs/24 §4 5.7` | — |
| D2.72 | **Campo `auxiliaryVisible` órfão** — após a 5.8-c1 o shell usa constante `false`, mas o campo continua em `layoutPersistence`/`sessionLayout`/`newSessionViewState`/`layoutController`/`sidePane` e seus testes | **PENDENTE (2026-10-02)** — remover do domínio em fase futura (refatoração sem efeito visual) | pós-FATIA-05 | `docs/12` adendo 2026-10-02 (b) | só limpeza |
| D2.59 | Medidas ainda abertas do chassi (tooltip/hover dos ícones, menu do título da Side Bar, foco após Ctrl+B) | **PENDENTE — validar na homologação** | FATIA-05 5.8 | `docs/25 §8` | painel maximizado e badge já medidos (`05_02`) |

Itens **CORRIGIDOS** nesta frente (não voltam ao backlog): B3 Browser abre no boot (`876b83d`), menu Copy Path/Delete Permanently (`60287b9`), seções com corpo 0 px + Refresh vazio (`f5a4c1d`), `.git` visível (`70f2231`), download multi → 1 ZIP (`e2a1058`), ícones por extensão (`0d86656`).

### FORA DE ESCOPO DA 4.7 / DENTRO DA FATIA-05 (registrado por ordem do usuário, 2026-09-27; reclassificação DEFINITIVA 2026-09-27 "Motor vs. Layout")
- Reposicionamento de views (Search e Changer na Side Bar real + Activity Bar) e drag & drop de views entre containers (D2.40, FATIA-05 5.1–5.4).
- Timeline View (history graph) e Outline View (D2.41, FATIA-05 5.5).
- **Polish visual, animações e menus de contexto avançados** — movidos **definitivamente** da 4.9 para a FATIA-05 (5.6).
- Runtime de IA no Browser (HTML/Playwright/CDP) — D2.39, adiado; a 4.8 é só UI do Simple Browser.

**Estes itens são exclusivos da FATIA-05 (consolidação/layout/refinamento). Não implementar na 4.7 sob nenhuma hipótese.**

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
- **2026-10-02 (FATIA-05 FECHADA):** **Onda 5 = 100 % ✅** — 5.1–5.8 homologadas no Windows (`e93031d` docs v1.3 · `d0c2a8d` c1 · `4ee0ed8` c3). D2.50/D2.63/D2.70/D2.72 fechados na 5.8 (`docs/25`). Ajustes finos de fidelidade visual → Onda 9/10 Hardening. **Próxima Onda 6 = Chat Carcaça (aguardando autorização).**
- **2026-10-01 (FATIA-05 5.7):** **5.7 concluída** `9a11319` (editor fino default + regra de larguras + toggle maximizar/restaurar; bug do vídeo corrigido). D2.63 ✅ fechado; novos D2.70 (abas não persistem ao F5) e D2.71 (Detalhes exclusiva). Exceção autorizada: 1 constante no core (`ATTACH_MAX_WIDTH_RATIO` 0.5). Aguarda homologação; 5.8 proibida até OK.
- **2026-09-30 (A0.7, só doc):** 5.6 **homologada no Windows**. Escopo da 5.7 corrigido: editor fino à direita é o default (chat = foco), maximizar toma o centro e esconde o chat, restaurar volta; migração permanente pro centro rejeitada (fontes oficiais em `docs/24 §4 5.7`). D2.51/D2.63/D2.68 reapontados.
- **2026-09-30 (FATIA-05 5.6):** 5.5 homologada; A0.6 fechada. **5.6 concluída** `7d05c7d` (Outline/Timeline reais nas seções do Explorer). D2.41 fechado; novos **D2.67–D2.69**. Vitest 705/9/16/730. Próximo: homologar 5.6 → 5.7.
- **2026-09-30 (FATIA-05 5.5):** 5.4 homologada. **5.5 concluída** `1f1ed79` (DnD de views; Views Panel novo acima do terminal, O14). Novos **D2.65** (só ponteiro) e **D2.66** (sem sash/fechar). D2.50 verificado — continua aberto. Vitest 697/9/16/722. Próximo: homologar 5.5 → 5.6 (A0.6).
- **2026-09-30 (FATIA-05 5.4):** 5.3 homologada no Windows. **5.4 concluída** `7bd528b` (Activity Bar movível por menu de contexto; Left/Right funcionam e persistem; A0.1 = desvio consciente, `docs/25 O13`). Novo **D2.64** (Top/Bottom adiados, desabilitados no menu). Vitest 692/9/16 inalterado. Próximo: homologar 5.4 → 5.5 DnD de views.
- **2026-09-30 (FATIA-05 5.3):** 5.2 homologada no Windows. **5.3 concluída** `2bd6cc3` (Source Control na Side Bar + badge; maquete "Changes N" removida — **D2.38 ✅, D2.44 ✅**). Decisão A do usuário: aba Changes do anexo removida; 6 E2E + 10 unit em skip → **D2.60 = 16 unit + 6 E2E**. Vitest 692/9/16. D2.22 permanece CONCLUÍDO (a aba do anexo cumpriu seu papel na 4.7-b e foi substituída pela view). D2.37 inalterado. Próximo: homologar 5.3 → decisão A0.1 → 5.4; sugerida rodada de higiene (D2.54 + P4 + D2.60 = 44 testes no limbo) antes.
- **2026-09-30 (FATIA-05 5.2):** 5.1 homologada no Windows. **5.2 concluída** `22a1523` (Search na Side Bar; D2.43 ✅). Decisão A: 4 `it.skip` novos → D2.60 = 6 testes; vitest 702/9/6. D2.19 reavaliado (não fecha de graça). Novos D2.62 (abas `search` antigas → demo) e D2.63 (chat espremido em 1400 px). Próximo: homologar 5.2 → 5.3 (direção: remover maquete "Changes N" D2.38 + skip nos testes dependentes).
- **2026-09-27 (decisão estratégica "Motor vs. Layout", registrada 2026-09-28):** FATIA-04 = **motores** (Explorer, Search, Git/Changes, Diff, Editor Anexo) — fecha com o **4.7-c4 Input de Commit**; 4.8 redefinida = **só UI do Simple Browser** (D2.39 adia o runtime IA/CDP); **FATIA-05 = Consolidação e Layout Byte a Byte** (D2.40 Activity Bar/Side Bar reais com Search/Changes simultâneos, DnD de views, D2.41 Timeline/Outline, polish). Ver `docs/11` e `docs/12`.
- **2026-09-29 (noite):** 5.1 código concluído (`fd05507`, `1e9978f`). Fechados D2.52 (RF-09 antecipado), D2.56, D2.57. Novos D2.60 (2 `it.skip`) e D2.61 (mobile sem Explorer). Sugestão: D2.54 + D2.55 + D2.60 decididos juntos.
- **2026-09-29 (tarde):** c1 ✅ commitado; c2 bloqueado por D2.56/P1; novos D2.54–D2.59 (testes mortos, TerminalPanel.test, T14, sessionId no c3, remoção de `legacy/`, medidas abertas). Estado: `docs/25`.
- **2026-09-29 (FATIA-05 Chassis-Right):** Gate 0 ✅ concluído e aprovado; plano vigente `docs/24` v1.1 (direita, inglês só no novo, sash 4 px, largura pela régua, `flex/none`). D2.42–D2.48 seguem como marcadores das sub-fatias, mas o **escopo de cada uma é o do `docs/24 §4`** (5.1 chassi+Explorer · 5.2 Search · 5.3 SCM · 5.4 Activity Bar movível · 5.5 DnD · 5.6 Timeline/Outline · 5.7 AttachArea no centro · 5.8 polish). Pendências herdadas dos vídeos: D2.49–D2.53. Zero código até o Passo 5.
- **2026-09-28 (FATIA-05):** **FATIA-05 registrada como PRÓXIMA FRENTE AUTORIZADA** (planejamento completo em `FATIA-05_LAYOUT_BYTE_A_BYTE/`; débitos D2.42–D2.48, um por sub-fatia). Descoberta na régua: perfil `agentsWindow` do VS Code 1.135 fixa Activity Bar/Side Bar/Panel (readOnly) e oculta a Status Bar → decisões abertas A0.1–A0.6 antes do código da 5.1.
- **2026-09-28 (c4):** **4.7-c4 Input de Commit HOMOLOGADO NO WINDOWS (`2d1b126`) → SUB-FATIA 4.7 (a/b/c/c4) CONCLUÍDA.** D2.22 fechado por completo; D2.28 permanece CONCLUÍDO; D2.35 (Always) permanece débito. Próxima frente: decisão do usuário entre **FATIA-05 (Layout Byte a Byte)** e **4.8 (UI do Simple Browser)**.
- **2026-09-28:** **4.7-c (diff mínimo) HOMOLOGADA NO WINDOWS (Vídeo 6).** D2.28 e D2.33 CONCLUÍDOS. **Limitação registrada:** prints de referência do code-server 8080 para a 4.7-c não foram obtidos no sandbox (abrir pasta no 8080 via Playwright sobe extension hosts e a RAM de ~1,9 GB não comporta junto com Vite + Chromium; o runtime `.cache` também não persiste entre turnos) — prova secundária aceita: régua extraída do runtime VS Code 1.135 + prints próprios (`auditoria_47c/`) + homologação humana. **Próximas frentes (ordem a definir pelo usuário):** (a) **4.8 Browser contextual** (B1/B2) ou (b) **4.7-c4 Input de commit** ("Message (Ctrl+Enter to commit)" + ✓ Commit, D2.35). Nenhuma iniciada.
- **2026-09-27 (tarde):** **4.7-c (diff mínimo) AUTORIZADA E INICIADA** — D2.28 em execução (`04_21 §7`). FATIA-05 delimitada explicitamente (bloco acima).
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
