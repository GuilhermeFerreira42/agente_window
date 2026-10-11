# 06 - PROXIMAS FASES E DIVIDAS

> Só entra aqui o que **ainda não começou** (fases futuras) e o que **ficou devendo** (dívidas). Começou → sai daqui e entra no `03`. Terminou → vira linha no `07`. Backlog histórico completo: `docs/arquivo_morto/05_BACKLOG_MESTRE.md`.

## 1. Fatia 06 — Workspace Simples & Chat Real

### Passo zero 06.4a — levantamento do contrato existente (2026-10-07, antes do código)
- **Criação atual:** não existe um único endpoint que crie a sessão completa. A UI chama primeiro `POST /api/worktrees` em `src/server/session-persistence/index.ts`; depois persiste a sessão com `PUT /api/sessions`. Portanto, a correção deve atuar nesses dois contratos, sem editar o plugin errado.
- **Exclusão atual:** `DELETE /api/sessions/:id`, no mesmo plugin. Se há registro, chama a limpeza de worktree e só depois remove JSONL e SQLite.
- **Validação atual:** `POST /api/workspaces/validate`, implementado em `src/server/session-persistence/index.ts` e `workspaces.ts`. Antes da 06.4a exige caminho não vazio, `realpath`, diretório e igualdade exata com `git rev-parse --show-toplevel`; logo bloqueia pasta sem Git.
- **Schema SQLite atual:** `workspace_path TEXT NOT NULL` e `worktree_path TEXT NOT NULL`. Não existe coluna `branch`; branch vive dentro de `session_json`. No tipo `Session`, `worktreePath` e `branch` são opcionais, mas não anuláveis. A 06.4a precisa migrar `worktree_path` para aceitar `NULL` e manter branch ausente/null no JSON.
- **Consumo da raiz ativa:** o terminal público em `App.tsx` usa `activeSession.worktreePath ?? activeSession.workspace`; a criação grava `workspacePath`, mas Explorer/Search/SCM/Diff/Editor não leem hoje `workspacePath`/`worktreePath` por sessão — o módulo Explorer usa a raiz global descoberta em `/fs/root`. Nesta subfatia, áreas internas permanecem intocáveis; o wiring público passa a preferir `worktreePath ?? workspacePath` onde há contrato por sessão.

### Subfatias
- **06.1 — Persistência híbrida:** concluída e homologada.
- **06.2/06.3 — worktree obrigatório:** código preservado como rota opcional futura; referência arquivada em `docs/arquivo_morto/fatia-06-worktree/`.
- **06.4a — Workspace simples sem worktree obrigatório:** concluída e homologada com ressalvas no Windows em 2026-10-10; fluxo padrão aceita qualquer diretório, terminal direto, recentes e persistência nullable.
- **06.4b — Empty State 768 px centralizado + transição para histórico.**
- **06.4c — Tela de Provedores:** OpenAI, Gemini e Ollama local.

## 2. Ondas e fatias reorganizadas (decisão 2026-10-07)

| Fatia | Objetivo | Conteúdo preservado/reorganizado |
|---|---|---|
| **06** | Workspace Simples & Chat Real | 06.4a workspace simples; 06.4b Empty State; **06.4c tela de provedores OpenAI/Gemini/Ollama e base da seleção de modelo**. |
| **07** | Tools CRUD & Filesystem | Registry e execução real de `read_file`, `write_file`, `edit_file`, `glob`, `grep`; `upload/`; schemas; progresso/cancelamento; grupos de tools; `ensureParentDirs`; Explorer em tempo real. Era parte da 08 antiga. |
| **08** | Permissões & Proteção | Modos `default`, `acceptEdits`, `plan`, `fullAccess`; workspace trust; credential store/segredos; avaliação de risco; card Permitir/Não/Sempre; Doom Loop na 3ª chamada idêntica; sandbox e policy/supply chain para hooks, MCP, plugins, skills e tools. Era parte da 08 antiga. |
| **09** | Runtime IA & Erros & Reset | Runtime IA; lifecycle e enablement propagado de tools; MCP real por `.vscode/mcp.json`; NDJSON (`api_retry`, `rate_limit`); tools conectadas; autenticação, status e logs MCP; execução de hooks; Browser Runtime IA/CDP (D2.39); estados reais; erros; Nova Conversa + Retomar sem Clear Chat. |
| **10** | Personalizações, Skills & Memória | AI Customizations funcional: Agentes em `.github/agents/*.agent.md`; Skills agentskills.io em pastas com `SKILL.md`; Instruções por `AGENTS.md` raiz/aninhados e compatibilidade decidida com `CLAUDE.md`/`copilot-instructions.md`; Prompt Files em `.github/prompts/*.prompt.md` — **caminhos verificados no `microsoft/vscode main` commit `cc3fec8`; presença/comportamento no VS Code 1.135 não confirmados**; memória; parsers; watcher; CRUD; editor/preview/override; configuração de Hooks; Plugins; catálogo/Marketplace; migrações; escopos/fontes/precedência. Fixtures não contam como backend. |
| **11** | Worktree Opcional | Botão “Nova Árvore de Trabalho > main” somente com Git e opção explícita; branch/worktree, symlinks anti-bloat, troca de PTY e exclusão 409. Roots, watchers e customizações devem acompanhar a raiz efetiva da sessão. Código 06.2/06.3 preservado. |
| **12** | Polish Visual & Ruflo | Fidelidade final do editor de Personalizações: shell `[nav interna 200][conteúdo]`, overview/cards/list/detail, árvore de tools, tokens `--vscode-*`, acessibilidade, desempenho, virtualização e restore de seleção/scroll; layout global, sash, Ruflo, Alt+Z, menu de aba, Command Menu + Theme, hardening, D2.72 e release gate. Não substitui backend das Fatias 09/10. |
| **13 (proposta; D55 pendente)** | Agent Host & Multi-host | Processo isolado fora do renderer; AHP/WebSocket por Unix socket/named pipe; catálogo de hosts vivos; múltiplos providers/harnesses (Copilot/Claude/Codex); sessões em background, peer chats, background shells e remote host; sincronização de cwd, customizações, tools, permissões e modelo; conectores/credenciais com estados disconnected/checking/reconnecting/error/connected; BYOK completo com catálogo de modelos, seleção, capabilities, chave segura no credential store do SO, teste de conexão, fallback, health check e capability negotiation; isolamento de falhas; backpressure, cancelamento, reconnect, heartbeat, version negotiation, identidade/autorização por host e observabilidade correlacionada por session/request/tool sem conteúdo sensível. |

Regras: nenhuma fatia perde conteúdo; worktree sai da 06/10 e vai à 11; Tools e Permissões ficam em 07/08; Runtime continua 09; Personalizações funcionais ficam na 10; Polish fica na 12; Agent Host multi-processo/multi-janela e BYOK integrado têm a Fatia 13 como destino **proposto**, sujeito à deliberação D55. Editor/Browser/Search/Changes já entregue visualmente nas Fatias 04/05 permanece registrado ali; o Browser Runtime IA/CDP vai à 09 e seu acabamento visual à 12. Command Menu + Theme e Hardening são absorvidos pela 12; Release vira o gate final da 12. A reorganização é exclusivamente documental nesta entrega.

### 2.1 Referência bruta de Personalizações (2026-10-09)
- Recebido e arquivado em `docs/arquivo_morto/pesquisa_bruta/personalizacoes/` o mockup `vscode_agents_mockup_interativo (1).html`. É uma ideia estrutural do usuário, não medida oficial nem prova do VS Code original.
- Mapeamento aprovado: Empty State → 06.4b; Ferramentas → Fatias 07/08; Servidores MCP → Fatia 09; Agentes, Skills, Instruções, Prompt Files, configuração de Hooks e Plugins → Fatia 10; execução de Hooks → Fatias 09/08; fidelidade da superfície → Fatia 12; sincronização multi-host → Fatia 13.
- Agentes, Hooks e Plugins agora têm dono. Ordenar/agrupar sessões e Manual permissions permanecem apenas como referência bruta neste registro; Nova Árvore de Trabalho continua oficialmente na Fatia 11.
- Provedores não são Agentes: a 06.4c permanece com a tela/base de OpenAI, Gemini e Ollama local; runtime e segurança ficam em 09/08, e BYOK integrado ao Agent Host fica na Fatia 13.
- Cores hex do mockup não são régua; a implementação usa tokens `--vscode-*` e medidas verificadas no VS Code/code-server 1.135.
- Skills, Instruções e caminhos relacionados foram **verificados no código `microsoft/vscode main` commit `cc3fec8`**. A referência do projeto continua sendo o VS Code 1.135 (D26), e nessa versão o comportamento **NÃO foi confirmado**. Portanto, os caminhos do roadmap vêm do `main`, não de medição do 1.135.
- O código atual já possui UI/domínio/dados mockáveis para AI Customizations, Skills, Instruções, Hooks, MCP e Plugins; descoberta física e runtime real não foram verificados nesta auditoria.

### 2.2 Especificação de Layout de Personalizações (2026-10-10)
- Referência construtível aprovada: `docs/arquivo_morto/pesquisa_bruta/especificacao-layout-personalizacoes-2026-10-10.md`.
- **Régua real da captura:** modal/editor de **1053,6 × 586,4 px**, com área útil de **1051,6 × 544,4 px**. São medidas da captura para homologação, não largura/altura fixa.
- A superfície abre no centro sem alterar o chassi `[lista de sessões 300][centro flex][Side Bar externa 274][Activity Bar 48]`. Dentro do editor, o layout é `[nav interna 200][conteúdo flex]`: a navegação interna mede **200 px**, não 274 px; os 274 px pertencem à Side Bar externa intocável.
- O conteúdo principal fica centralizado e limitado a **840 px**, com inset horizontal de 40 px quando houver espaço. Overview usa flex-wrap e gap 8 px; cards partem de 120 px, mínimo 100 px, padding 10 × 12 px e radius 6 px, sem sombra não comprovada.
- Listas usam grupos por origem, linhas com nome/descrição/ações, empty state com padding 48 × 24 px e disabled com opacity 0,5. Detail substitui a lista no mesmo conteúdo, com back 26 px (28 px no MCP), ícone 32 px e ações Preview/View Raw/Edit Source/Save override.
- A árvore de ferramentas usa grupos, chevrons, contador habilitadas/total e toggle: group row `8 12 8 0`, tool row `6 12 6 44`, checkbox 18 px e chevron 16 px. Tool desabilitada não é anunciada ao modelo.
- Estados obrigatórios: **empty, disabled, hover, selected, focus, filtered, loading/checking, repairing, uninstalling, warning, error e connected**; nenhum estado pode depender somente de cor.
- Inventário aprovado: **105 tokens `--vscode-*`**, com **zero cor hardcoded**. Geometria medida: stroke 1 px; radius 2/4/6/8 px; spacing 0/2/4/6/8/10/12/16/20/24/28/32/36/40 px; tipografia e tokens completos ficam na referência construtível.
- Acessibilidade obrigatória: roles coerentes `navigation`, `tree`, `treeitem`, `group`, `button` e `checkbox`; `aria-current`, `aria-expanded`, `aria-controls`, `aria-checked`/`aria-pressed`; teclado por setas, Home/End, Enter, Space e Esc; roving tabindex; foco previsível/restaurado; restore de seleção/scroll e live region para estados assíncronos.
- **Donos:** Fatia 10 entrega estrutura e funções reais; Fatia 09 fornece runtime e estados reais; Fatia 12 fecha fidelidade visual, narrow layout, tokens, virtualização, teclado/ARIA, desempenho, restore scroll e homologação. A Fatia 12 não pode mascarar fixtures como backend concluído.


### 2.3 Decisões a deliberar — Personalizações, Agent Host e Layout (2026-10-10)

> **D39–D55 são propostas, não decisões fechadas.** Ficam no backlog até aprovação explícita; não autorizam código por si só.

| # | Tema a deliberar | Proposta | Estado |
|---|---|---|---|
| D39 | Roots, escopos e precedência | Definir Workspace/User/Built-in/Extension/Plugin por tipo e harness, colisão/override e item aplicado à sessão. | **PENDENTE DE DELIBERAÇÃO** |
| D40 | Compatibilidade de formatos | Deliberar `.github/agents/*.agent.md`, `.github/skills/<nome>/SKILL.md`, `AGENTS.md` aninhados, `CLAUDE.md`, copilot instructions, prompts, hooks, MCP e três manifests de plugin. Evidência atual vem do `main`, não do 1.135. | **PENDENTE DE DELIBERAÇÃO** |
| D41 | Registry único | UI, runtime e Agent Host consumiriam um registry único; fixtures somente em testes. | **PENDENTE DE DELIBERAÇÃO** |
| D42 | Credential store | Chaves/tokens/segredos no armazenamento seguro do SO, nunca SQLite/JSONL/DOM/log/repositório. | **PENDENTE DE DELIBERAÇÃO** |
| D43 | Trust e sandbox | Hooks, scripts de Skills, MCP, Plugins e tools externas exigiriam trust, permissão, timeout, cancelamento e sandbox aplicável. | **PENDENTE DE DELIBERAÇÃO** |
| D44 | Boundary do Agent Host | Processo isolado, protocolo versionado, transporte autenticado, supervisão, multi-host, heartbeat, reconnect e backpressure. | **PENDENTE DE DELIBERAÇÃO** |
| D45 | BYOK | Deliberar providers/modelos, capabilities, chave segura, health check, fallback, utility model, custo/rate limit e execução local/remota. | **PENDENTE DE DELIBERAÇÃO** |
| D46 | Migração/colisão/override | Migrações idempotentes, preview, destino, backup/confirmação e nenhuma sobrescrita silenciosa. | **PENDENTE DE DELIBERAÇÃO** |
| D47 | Watcher/realpath/symlinks | Acompanhar `worktreePath ?? workspacePath`, validar `realpath`, impedir traversal/vazamento e definir symlinks/cache. | **PENDENTE DE DELIBERAÇÃO** |
| D48 | Nav interna | Proposta de 200 px medidos na captura; Side Bar externa de 274 px permanece intocável. | **PENDENTE DE DELIBERAÇÃO** |
| D49 | Conteúdo principal | Proposta de máximo 840 px centralizados na área útil de 1051,6 × 544,4 px. | **PENDENTE DE DELIBERAÇÃO** |
| D50 | Tokens | Proposta de usar os 105 tokens `--vscode-*` inventariados, sem cor hardcoded. | **PENDENTE DE DELIBERAÇÃO** |
| D51 | Contagens | Proposta de `count`/`totalCount` iguais às linhas projetadas pelo modelo filtrado, sem contar headers. | **PENDENTE DE DELIBERAÇÃO** |
| D52 | Estados visuais | Empty, disabled, hover, selected, focus, filtered, loading/checking, repairing, uninstalling e error; borda externa de 2 px ainda depende de homologação visual. | **PENDENTE DE DELIBERAÇÃO** |
| D53 | Acessibilidade | Roles/ARIA, teclado, foco previsível e restore de seleção/scroll. | **PENDENTE DE DELIBERAÇÃO** |
| D54 | Filtros por harness | Deliberar `visibleSections`, `excludedMcpCollections`, `hiddenSources` e regra de `hostPublished`. | **PENDENTE DE DELIBERAÇÃO** |
| D55 | Fatia 13 | Deliberar formalmente Agent Host & Multi-host como process boundary, protocolo, auth local, multi-janela e BYOK integrado. Até lá, a Fatia 13 permanece no roadmap como **proposta**. | **PENDENTE DE DELIBERAÇÃO** |

## 3. Dívidas técnicas abertas
### 3.1 Prioritárias (decisão do usuário pendente)
- **P3/P4 — higiene de testes:** 13 E2E mortos (`sessao_08` T2–T4, `sessao_10` T3–T5, `sessao_11b/c/d/e/f`) e 9 unitários em `TerminalPanel.test.tsx`. **Intocáveis até ordem** (terminal). Opções: apagar / reescrever / manter como "pré-existentes".
- **P7 — flakes de digitação:** `sessao_13_search` T6/T10, `sessao_14` T9, `sessao_12_explorer` T9. Passam em repetição; não alterar spec sem ordem.
- **P5 — `legacy/`:** removida pelo usuário (tag `legacy-backup-2026-09`). Nada a fazer; não restaurar.
- **P9 — mobile/single-pane** sem Explorer (D2.61): não revisitado.
- **D2.72 — campo `auxiliaryVisible` órfão** no domínio (aceito como fechado para a Fatia 5; limpeza sem efeito visual na Fatia 12 — Polish Visual & Ruflo).
- **Dívidas de layout pós-MVP:** pequenos ajustes de fidelidade visual vistos na homologação Windows → Fatia 12 — Polish Visual & Ruflo (não listar; não bloqueiam).
- **Dívida visual 06.4a — seletor de pasta:** diálogo atual é pequeno e aceita somente pasta; referência original permite arquivo ou pasta → Fatia 12.
- **Dívida visual 06.4a — landing:** alinhar texto/apresentação ao original → Fatia 12.

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
| D2.39 | **Browser Runtime IA/CDP** — capacidade de a IA ler o HTML da página e interagir via Playwright/CDP (isolamento por sessão) | **ADIADO (decisão 2026-09-27)** — a 4.8 fica **só com a UI visual** do Simple Browser | Fatia 09 |
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
| D2.72 | **Campo `auxiliaryVisible` órfão** — após a 5.8-c1 o shell usa constante `false`, mas o campo continua em `layoutPersistence`/`sessionLayout`/`newSessionViewState`/`layoutController`/`sidePane` e seus testes | **PENDENTE (2026-10-02)** — remover do domínio em fase futura (refatoração sem efeito visual) | Fatia 12 |
| D2.59 | Medidas ainda abertas do chassi (tooltip/hover dos ícones, menu do título da Side Bar, foco após Ctrl+B) | **PENDENTE — validar na homologação** | FATIA-05 5.8 |
