# 06 - PROXIMAS FASES E DIVIDAS

> Só entra aqui o que **ainda não começou** (fases futuras) e o que **ficou devendo** (dívidas). Começou → sai daqui e entra no `03`. Terminou → vira linha no `07`. Backlog histórico completo: `docs/arquivo_morto/05_BACKLOG_MESTRE.md`.

## 1. Próxima fase — Fatia 6 "Worktree & Isolamento" — PAUSADA, aguardando autorização
- Escopo atualizado (Decisões Finais 2026-10-05): Worktree (caixinha/sala isolada por sessão) + troca da raiz do terminal pty-server ao trocar a pasta da sessão.
- Ponto de partida quando autorizada: documentação em `docs_atualizada/` e alinhamento com chassi da Fatia 05.
- Também fora da Fatia 5 por decisão: **Alt+Z (word wrap) e menu de contexto da aba → 5.9/futura**; **Simple Browser → 4.8 separada** (D2.39: só UI, sem runtime IA/CDP).

## 2. Ondas e Fatias Atualizadas (visão macro - Decisões Finais 2026-10-05)
| Fatia | Objetivo | Entregas principais | Dependências |
|---|---|---|---|
| **Fatia 06** | Worktree & Isolamento | Worktree (criar sala isolada por sessão) + troca de raiz do terminal pty-server | Fatia 05 (homologada) |
| **Fatia 07** | Onde mora a Skill | Bom Vizinho (`%USERPROFILE%\.claude\skills\`, `%APPDATA%\Code\User\`, `~/.config/opencode/`) + descoberta automática | Fatia 06 |
| **Fatia 08** | Tools CRUD & Permissões | Tools básicas (`read_file`, `write_file`, etc.) + pasta `upload/` + permissões (Grant/GrantPersistant/Deny) + Reset/Delete de sessão + telemetria básica | Fatia 07 |
| **Fatia 09** | Runtime IA & Provedores | MCP Server + persistência SQLite OpenCode (`sessions`, `messages`, `files`) + tela provedores estilo Cline (`providers.json`) + tratamento de erros + workspace vazio | Fatia 08 |
| **Fatia 10** | Worktree Avançado & Memória | Worktree avançado + HAG/memória hierárquica (`CLAUDE.md` + `MEMORY.md`) | Fatia 09 |
| **Fase 11** | Polish Visual & Ruflo | Só layout: refinamento visual, animação sash, medidas finais + suporte completo a Ruflo | Fatia 10 |


## 3. Dívidas técnicas abertas
### 3.1 Prioritárias (decisão do usuário pendente)
- **P3/P4 — higiene de testes:** 13 E2E mortos (`sessao_08` T2–T4, `sessao_10` T3–T5, `sessao_11b/c/d/e/f`) e 9 unitários em `TerminalPanel.test.tsx`. **Intocáveis até ordem** (terminal). Opções: apagar / reescrever / manter como "pré-existentes".
- **P7 — flakes de digitação:** `sessao_13_search` T6/T10, `sessao_14` T9, `sessao_12_explorer` T9. Passam em repetição; não alterar spec sem ordem.
- **P5 — `legacy/`:** removida pelo usuário (tag `legacy-backup-2026-09`). Nada a fazer; não restaurar.
- **P9 — mobile/single-pane** sem Explorer (D2.61): não revisitado.
- **D2.72 — campo `auxiliaryVisible` órfão** no domínio (aceito como fechado para a Fatia 5; limpeza sem efeito visual em Hardening).
- **Dívidas de layout pós-MVP:** pequenos ajustes de fidelidade visual vistos na homologação Windows → Fatia 10 Hardening (não listar; não bloqueiam).

### 3.2 Débitos D2.x ainda abertos (copiados do backlog, para não perder)
| # | Item | Status | Fase |
|---|---|---|---|
| D2.1 | Ruído de rede no upload (`ensureParentDirs` sobe até `/`: 3× `POST /fs/mkdir` 403) | **PENDENTE** | 4.4 (fechamento) |
| D2.6 | Badges numéricos na Activity Bar | **ADIADO** | 4.6 |
| D2.7 | Add/Remove Folder to Workspace no menu da raiz | **ADIADO (fase futura)** | 4.9+ |
| D2.8 | Cores de status Git nos nomes da árvore (`--vscode-gitDecoration-*`) | **BLOQUEADO → 4.7+** | 4.7+ |
| D2.9 | Open Editors real / Outline / Timeline com dados | **ADIADO** | 4.7 |
| D2.10 | Word Wrap (Alt+Z), Split Editor, Markdown Preview | **DEFERIDO** | 4.7b / 4.7c |
| D2.11 | Drag & drop para reordenar seções | **ADIADO** | 4.9 |
| D2.12 | Resize de seções por sash com persistência | **ADIADO** | 4.9 |
| D2.13 | Hover actions inline nos itens da árvore + feedback visual de drag (opacity/`dropBackground`) | **ADIADO** | 4.9 |
| D2.14 | Fonte `seti.woff` (glyphs reais por linguagem; hoje glyph codicon + cor Seti) | **ADIADO** | 4.9 |
| D2.15 | Breadcrumb bar acima do editor (TR-BC1), BranchChanger real (TR-BR1), Source Control panel (TR-SC1) | **REGISTRADO** | 4.7 / fora da FATIA-04 |
| D2.16 | Botão "…" (Views and More Actions) no título do Explorer (35 px) para reexibir views ocultas | **ADIADO (fase futura)** | 4.7 |
| D2.17 | Ordem dos panes igual ao VS Code (Open Editors antes de Folders) | **ADIADO (fase futura)** | 4.7 |
| D2.18 | Outline "More Actions…" (Follow Cursor / Filter on Type / Sort By) e ações inline do Timeline (Pin / Refresh / Filter) | **ADIADO (fase futura)** | 4.7 |
| D2.19 | Ações do header do Search (Refresh · Clear Search Results · Collapse All) | **ADIADO → 4.9** — **reavaliado na 5.2 (2026-09-30): NÃO fecha de graça.** O Search agora vive na Side Bar (título 35 px com slot de ações), mas as ações não foram implementadas (fora do escopo da 5.2). Pré-requisito resolvido; falta só o trabalho | 4.9 / 5.8 |
| D2.21 | Links "Open Settings"/"Learn More" do estado vazio e "Open in editor" da mensagem de contagem | **FORA DE ESCOPO** | — |
| D2.23 | Picker dropdown dos breadcrumbs (clicar num item abre a lista de irmãos) | **ADIADO → 4.7-c** | 4.7-c |
| D2.24 | Botão **Split Editor** (`Ctrl+\`) na toolbar do anexo | **FORA DO ESCOPO 4.7 inicial** | — |
| D2.25 | **Print lado a lado 8080 do diálogo de save (c5) e do maximize (c6) ausente** — abrir a pasta no code-server sobe ~5 extension hosts e o sandbox (1,9 GB) travou 3× | **VALIDADO POR PROVA SECUNDÁRIA** (medidas CSS computadas + E2E T12/T14; régua 8080 do mesmo `.monaco-dialog-box` medida na 4.6: 498 px, radius 12, padding 8, botões 26 px) | 4.7 |
| D2.26 | Glifos/raios da faixa: ✕ da aba usa `codicon-close` (`\ea76`) no lugar de `close-small`; botões da toolbar com radius 5 (VS Code: 6) | **ADIADO → 4.9** | 4.9 |
| D2.29 | Grupo **Untracked Changes** separado (config `git.untrackedChanges: separate`) — MVP mostra U dentro de Changes (default `mixed` do VS Code) | **PENDENTE** | 4.7-c |
| D2.30 | **Push / Pull / Sync** (barra de status e menu `…` da SCM) | **PENDENTE** | futuro |
| D2.31 | Branch picker (clicar no nome da branch) | **PENDENTE** | futuro |
| D2.32 | Grupo **Merge Changes** / conflitos (`u` do porcelain v2 já parseado) | **PENDENTE** | futuro |
| D2.34 | Print 8080 da SCM View real lado a lado (RAM do sandbox) | **PROVA SECUNDÁRIA** (régua CSS do `workbench.web.main.internal.css` + strings do `dist/main.js` da extensão git) | 4.7-b |
| D2.35 | Botão **Always** no diálogo "no staged changes" (config `git.enableSmartCommit`) | **PENDENTE** — o c4 (`2d1b126`) entregou o input de commit + diálogo [Yes][Cancel]; o botão Always ficou fora por não haver Settings | FATIA-05 ou 4.9 |
| D2.36 | `server.mjs` (preview build) não monta `/git/*` | **PENDENTE** | 4.9 |
| D2.37 | (5.3: SCM na Side Bar **não** consome tokens novos — mesmo `changes.css`, agora com fundo `--vscode-sideBar-background`; débito inalterado) Tokens `--vscode-gitDecoration-{untracked,stageModified,stageDeleted,renamed,conflicting,ignored}ResourceForeground` ausentes no `theme.css` do shell (módulo usa fallback semântico encadeado) | **PENDENTE (shell)** | 4.9 |
| D2.39 | **Browser Runtime IA/CDP** — capacidade de a IA ler o HTML da página e interagir via Playwright/CDP (isolamento por sessão) | **ADIADO (decisão 2026-09-27)** — a 4.8 fica **só com a UI visual** do Simple Browser | pós-FATIA-05 |
| D2.40 | **Layout Global / Activity Bar real** — mover as views de **Search** e **Source Control ("Changer")** para a **Side Bar independente** e criar os ícones (com badges) na **Activity Bar**; visualização simultânea com o editor (abrir arquivo não fecha Search/Changes) | **PENDENTE — alvo da FATIA-05** | FATIA-05 (5.1–5.3) |
| D2.42 | **FATIA-05 · 5.1** Activity Bar + Side Bar + Editor Group (slots) + viewRegistry/layoutState | **PENDENTE — próxima autorizada em princípio (código só após revisão dos docs)** | FATIA-05 5.1 |
| D2.45 | **FATIA-05 · 5.4** Configurabilidade de posições (Activity Bar/Panel) | **PENDENTE — ⚠️ DECISÃO ABERTA A0.1** (perfil agentsWindow real = posições readOnly) | FATIA-05 5.4 |
| D2.46 | **FATIA-05 · 5.5** Drag & Drop de views Side Bar ↔ Panel | **PENDENTE** | FATIA-05 5.5 |
| D2.47 | **FATIA-05 · 5.6** Timeline + Outline (absorve D2.41; requer `POST /git/log` aditivo) | **PENDENTE — ⚠️ A0.6 localização** | FATIA-05 5.6 |
| D2.48 | **FATIA-05 · 5.7** Polish visual (hover, DnD feedback, tokens) | **PENDENTE — ⚠️ A0.5 animação** | FATIA-05 5.7 |
| D2.49 | **V1-R1 (vídeo)** — reproduzir a sequência do vídeo de referência no chassi novo e conferir divergências ponto a ponto | **PENDENTE — herdado da auditoria de vídeos (Gate 0, 2026-09-29)** | FATIA-05 5.8 ou fatia seguinte |
| D2.51 | **Split editor** (dividir grupo de editores) | **PENDENTE — fora da 5.1** | fatia seguinte |
| D2.53 | **Open Editors** real no Explorer (absorve D2.9) | **PENDENTE — fora da 5.1** | FATIA-05 5.8 ou fatia seguinte |
| D2.54 | **13 E2E mortos** (`sessao_08` T2–T4, `sessao_10` T3–T5, `sessao_11b/c/d/e/f`) — testam rótulos do terminal pré-`75c6686` e a árvore demo antiga | **PENDENTE — decisão do usuário (P3): apagar / reescrever / congelar** | higiene, fora da 5.1 |
| D2.55 | **`TerminalPanel.test.tsx` 9 falhas** — teste espera região "Terminal", implementação renderiza `aria-label="Painel Inferior"` | **PENDENTE — decisão do usuário (P4)** | higiene |
| D2.58 | **Remover `legacy/`** do branch principal com tag de backup (`legacy-backup-2026-09`) | **DECIDIDO pelo usuário 2026-09-29 — executar no Windows** | imediato |
| D2.60 | **16 unit tests `it.skip` + 6 E2E `test.skip`**: unit → **2** maquete "Workspace Files" (c3) + **4** aba Search do editor (5.2) + **10** maquete "Changes N" (5.3: `App.test.tsx` 7 — Branch Changes/diff simulado/Changes pill/build the project/single-pane/Toggle Details; `iconLabels.test.ts` 2; `coverageIntegration.test.tsx` 1); E2E → `14b_git_changes` T1/T5, `14c_diff_minimal` T1/T3/T5/T6 (lógica da aba fixa "Changes" do anexo, removida na 5.3; substitutos: spec 15 T10–T15). Cobertura equivalente: spec 15 T5–T9 + `sessao_12_explorer` + `sessao_13_search` | **PENDENTE — D2.54 (13 E2E mortos) + D2.55/P4 (9 TerminalPanel) + D2.60 = pacote único de "higiene de testes"; decisão futura do usuário; não decidir isoladamente** | higiene, fora da 5.x |
| D2.61 | **Single-pane / mobile sem Explorer** — a Side Bar só renderiza no desktop (`!isSinglePane`); com a aba Files removida, o modo estreito não tem árvore de arquivos | **PENDENTE — validar na homologação; decidir se a Side Bar entra no single-pane (5.8) ou se é aceito** | FATIA-05 5.8 |
| D2.62 | **Abas `search` persistidas de sessões antigas** renderizam a demo `SearchView` do `EditorArea.tsx` (o `searchSlot` deixou de ser passado na 5.2; `EditorArea` é intocável até 5.7) | **PENDENTE — some na 5.7 (EditorArea reescrito) ou com limpeza do estado persistido; validar na homologação da 5.2** | FATIA-05 5.7 |
| D2.65 | **DnD de views só com ponteiro** — HTML5 `draggable` não dispara em touch; não há atalho de teclado para mover/reordenar views (5.5) | **PENDENTE — decidir na 5.8 (polish/a11y) se entra menu "Move View to…" por teclado** | FATIA-05 5.8 |
| D2.67 | **Outline não segue o cursor** nem rola até o item selecionado (VS Code: `outline.followCursor`/realce da linha atual; `symbolAtLine` já existe em `core/outline/outlineModel.ts`, falta ligar `onDidChangeCursorPosition` + `scrollIntoView`) | **PENDENTE** | FATIA-05 5.8 |
| D2.68 | **Aba Diff ativa → Outline/Timeline mostram a frase padrão** (VS Code mantém a Timeline do recurso do diff e o Outline do lado modified) | **PENDENTE** | FATIA-05 5.8 (A0.7: o Diff fica no anexo) |
| D2.69 | **Timeline sem "Load more"/filtro e só Git** (limite 50 commits; sem "Local History"; tempo relativo só em inglês) | **PENDENTE** | FATIA-05 5.8 |
| D2.66 | **Views Panel sem sash de altura nem fechar/maximizar** — 240 px fixos (`--views-panel-height`), "não medido — validar na homologação" | **PENDENTE — validar na homologação da 5.5; sash na 5.8 se o usuário pedir** | FATIA-05 5.8 |
| D2.64 | **Top/Bottom da Activity Bar adiados** — no menu "Move Activity Bar …" (5.4) as opções Top/Bottom aparecem desabilitadas (opacity 0.4); barra horizontal acima/abaixo da Side Bar exige wrapper coluna que quebra a régua do sash (`SideBar.tsx` mede pelo `parentElement`) | **PENDENTE — decidir se entra na 5.8 (layout) ou se fica adiado de vez; validar com o usuário na homologação da 5.4** | FATIA-05 5.8 |
| D2.70 | **Abas do anexo não sobrevivem ao F5** (o módulo persiste largura/maximizado, não as abas) — no original cada sessão restaura os editores abertos | PENDENTE | FATIA-06 / fatia do módulo |
| D2.71 | **"Detalhes" e editor fino exclusivos na faixa fina** (regra 5.7 autorizada) — reavaliar quando a coluna "Detalhes" ganhar conteúdo real (hoje vazia, D2.50) | PENDENTE (decisão registrada) | FATIA-05 5.8+ |
| D2.72 | **Campo `auxiliaryVisible` órfão** — após a 5.8-c1 o shell usa constante `false`, mas o campo continua em `layoutPersistence`/`sessionLayout`/`newSessionViewState`/`layoutController`/`sidePane` e seus testes | **PENDENTE (2026-10-02)** — remover do domínio em fase futura (refatoração sem efeito visual) | pós-FATIA-05 |
| D2.59 | Medidas ainda abertas do chassi (tooltip/hover dos ícones, menu do título da Side Bar, foco após Ctrl+B) | **PENDENTE — validar na homologação** | FATIA-05 5.8 |
