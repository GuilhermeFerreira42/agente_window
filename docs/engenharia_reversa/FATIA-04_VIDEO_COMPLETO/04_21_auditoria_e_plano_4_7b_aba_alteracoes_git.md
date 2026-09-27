# 04_21 — Auditoria binária e plano · Sub-Fatia 4.7-b — Aba "Alterações" (Git) no Editor Anexo

**Data:** 2026-09-26 · **Estado:** fase 1 (auditoria) — **aguarda aprovação do plano (§5) antes de qualquer código**.
**Débito de origem:** `docs/05` D2.22 (aba Alterações excluída da 4.7 por decisão do usuário; `04_20 §2` pergunta 3 e `§4.3` item 5).
**Régua:** runtime do code-server 8080 (VS Code **1.135.0**): `out/vs/workbench/workbench.web.main.internal.css` (CSS compilado da Source Control View, classes `.scm-view …`) + `extensions/git/package.json` / `package.nls.json` / `dist/main.js` (comandos, ícones, textos e diálogos da extensão Git oficial). Medidas lidas do artefato servido pelo 8080 — **não** de suposição. Print lado a lado com pasta aberta no 8080 continua bloqueado por RAM (D2.25): a extensão Git só existe no extension host, que derruba o sandbox.

---

## 0. Três premissas do pedido, checadas contra o repo (verificado)

| Premissa recebida | Realidade medida | Consequência |
|---|---|---|
| "endpoint `/fs/gitStatus` ou similar já existe" | **Não existe.** Rotas reais do Single Port: `/fs/{copy,createFile,delete,download,list,mkdir,read,rename,root,search,stat,upload,watch,write}`. Nenhuma referência a git em `server/**` além do filtro de ruído do watcher. Nenhuma dependência git (`simple-git`, `isomorphic-git`) no `package.json` | c1 precisa criar o **adapter de servidor** (`server/git/gitHost.ts` + rotas `/git/*`) chamando o binário `git` via `child_process` (git 2.47 presente no sandbox; no Windows o usuário já tem git). Zero dependência nova |
| "o serviço Git já existe no code-server 8080" | Existe **na extensão `git` do VS Code** (processo do 8080). É régua de comportamento/UX, **não** é reutilizável em runtime pelo workbench-v2 (processo, porta e contrato diferentes) | Transplante = copiar comportamento e DOM, não código |
| "'Changes' é só mais uma aba com conteúdo diferente" | `EditorService`/`AttachTab` hoje têm `kind: 'code' \| 'search'` e são indexados por `uri`. Uma aba fixa precisa de `kind: 'changes'` + URI sintética (`workspace:/.changes` por sessão) e regras próprias (não é preview, não fica dirty, não fecha ao "Close All"?) | c2 amplia o tipo **no módulo** (`core/editor`), contrato `IEditorAttachApi.open.kind` ganha `'changes'` — mudança **aditiva** no `contract.ts` (registrar como exceção de contrato congelado: só união de literal, sem quebrar chamadas existentes) |

No VS Code real **não existe** uma "aba Changes" na faixa de abas do editor: o que existe é (a) a **Source Control View** na sidebar (lista + input de commit + botão Commit) e (b) o **Multi-Diff Editor** ("Working Tree Changes"), que é uma aba comum do editor mostrando diffs empilhados. O escopo pedido pelo usuário (lista + Stage/Unstage/Discard + Commit **dentro de uma aba do anexo**) é a **Source Control View transplantada para dentro da aba**. O DOM/medidas abaixo são os da SCM View.

---

## 1. Régua medida — Source Control View (CSS compilado do 8080)

### 1.1 Lista de recursos

| Elemento | Medida / token (fonte: `workbench.web.main.internal.css`) |
|---|---|
| Linha da lista | `.scm-view .monaco-list-row { line-height: 22px }` · `.monaco-icon-label-container { height: 22px }` → **22 px** (igual à árvore do Explorer/Search) |
| Conteúdo | `.scm-view .monaco-tl-contents > div { padding-right: 12px; overflow: hidden }` |
| Grupo (`Changes`, `Staged Changes`, `Untracked Changes`, `Merge Changes`) | `.resource-group { display:flex; height:100%; align-items:center }` · `> .name { flex:1; ellipsis }` · badge `.count { display:flex; margin-left:6px }` (mesmo `.monaco-count-badge` do Explorer) |
| Recurso | `.resource { display:flex; height:100% }` · `.resource.faded { opacity:.7 }` (ignorados) · `> .name { flex:1; overflow:hidden }` → `.monaco-icon-label` (ícone Seti 16 px + nome + descrição = pasta relativa, igual ao Search) |
| Letra de status | `.monaco-icon-label:after { opacity:.75; font-size:90%; font-weight:600; margin: auto 16px 0 5px; text-align:center }` + `.scm-view … .monaco-icon-label:after { margin-right: 3px }` → letra **M / A / D / U / R / C** à direita; cor no **nome e na letra** via `--vscode-gitDecoration-*ResourceForeground` (`color: inherit !important`) |
| Deletado | `.monaco-icon-label.strikethrough … .label-name { text-decoration: line-through }` |
| Ícone de decoração (tema) | `.resource > .decoration-icon { width:16px; height:100%; margin-left:5px }` (só quando o tema fornece ícone — Seti não fornece → não renderizar) |
| Ações inline | `.resource > .name > .monaco-icon-label > .actions { display:none; max-width:fit-content }` → `display:block` em `:hover`/`.focused`; `.action-label { padding: 2px }` sobre botão codicon **22×22, fonte 16 px** (`.monaco-action-bar .action-item .action-label.codicon`); `margin-top: 2px` |
| Ordem das ações inline (extensão git, grupo `inline`) | **workingTree:** `git.openFile` (`go-to-file`, só com `config.git.showInlineOpenFileAction`) · `git.clean` **Discard Changes** (`codicon-discard`) · `git.stage` **Stage Changes** (`codicon-add`) · **index (staged):** `git.openFile` · `git.unstage` **Unstage Changes** (`codicon-remove`) · **untracked:** `git.clean` (Discard = deletar) · `git.stage` |
| Ações do header do grupo | `git.stageAll` (`add`) / `git.unstageAll` (`remove`) / `git.cleanAll` (`discard`) — mesmos 22×22, aparecem no hover da linha do grupo |

### 1.2 Cores (tokens — sem hex; valores vêm do tema ativo do shell)

| Estado | Token |
|---|---|
| M (modificado, working tree) | `--vscode-gitDecoration-modifiedResourceForeground` |
| M (staged) | `--vscode-gitDecoration-stageModifiedResourceForeground` |
| A (adicionado/staged novo) | `--vscode-gitDecoration-addedResourceForeground` |
| D (deletado) / D staged | `--vscode-gitDecoration-deletedResourceForeground` / `-stageDeletedResourceForeground` |
| U (untracked) | `--vscode-gitDecoration-untrackedResourceForeground` |
| R (renomeado) | `--vscode-gitDecoration-renamedResourceForeground` |
| C / ! (conflito) | `--vscode-gitDecoration-conflictingResourceForeground` |
| ignorado | `--vscode-gitDecoration-ignoredResourceForeground` (+ `.faded`) |

> O pedido dizia "M=amarelo, A=verde, D=vermelho, U=cinza". No VS CODE real **U (untracked) é verde** (`untrackedResourceForeground`) e **cinza é ignorado**; o projeto usa tokens, então a cor final é a do tema — igual ao 8080. `04_17` l.124 já registra esses tokens no Explorer.

### 1.3 Caixa de mensagem + botão Commit

| Elemento | Medida / token |
|---|---|
| Linha do input | `.scm-view .scm-input { height:100%; display:flex; align-items:center; padding-left: 11px }` (linha da lista com altura dinâmica; 1 linha ≈ 26 px de editor + 2×1 borda) |
| Editor | `.scm-editor { width:100%; border: 1px solid var(--vscode-input-border, transparent); background: var(--vscode-input-background); border-radius: 4px }` (`.scm-editor-container` radius `--vscode-cornerRadius-small`) · Monaco de 1 linha, cresce até 10 linhas · placeholder **"Message (Ctrl+Enter to commit)"** (`"Message ({0} to commit)"` + keybinding real) · toolbar interna `padding: 1px 3px 1px 1px` |
| Botão Commit | linha própria: `.button-container { display:flex; height:100%; padding-left: 11px; align-items:center }` → `.monaco-text-button { width:100%; padding: 4px 8px; border-radius: 4px; border:1px solid var(--vscode-button-border, transparent); line-height:16px; font-size:12px }` com ícone `$(check)` **"Commit"** (`margin: 0 4px 0 0`) · `--vscode-button-background/foreground`, hover `--vscode-button-hoverBackground` |
| Regra de habilitação | Commit sem staged e com mudanças no working tree → diálogo **"There are no staged changes to commit. Would you like to stage all your changes and commit them directly?"** [Yes] [Always] [Cancel]; mensagem vazia → **"Please provide a commit message"** (input recebe foco) |

### 1.4 Diálogos de Discard (textos oficiais da extensão git)

| Caso | Texto | Botões |
|---|---|---|
| Arquivo rastreado | **"Are you sure you want to discard changes in '{nome}'?"** (detalhe: "This is IRREVERSIBLE! …") | **Discard Changes** · Cancel |
| Untracked (1) | **"Are you sure you want to DELETE the following untracked file: '{nome}'?"** + "This is IRREVERSIBLE! This file will be FOREVER LOST if you proceed." | **Delete File** · Cancel |
| Untracked (n) | "Are you sure you want to DELETE the {n} untracked files?" | Delete Files · Cancel |

Host do diálogo: o mesmo `.monaco-dialog-box` já homologado em c5 (498 px, radius 12, botões 26 px) — reaproveitar `AttachDialog.tsx`.

### 1.5 Textos dos grupos (nls oficial)

`Changes` · `Staged Changes` · `Untracked Changes` · `Merge Changes`. A extensão mostra **Untracked Changes separado só com `git.untrackedChanges = separate`**; padrão = untracked dentro de `Changes` com letra **U**. Padrão do projeto = igual ao padrão do VS Code (um grupo `Changes` + `Staged Changes` quando houver index). **Isso contradiz o débito "Staged/Unstaged groups separados → 4.7-c"**: no VS Code o grupo `Staged Changes` aparece automaticamente após o primeiro Stage — sem ele, Unstage (✕) não tem onde viver. Proposta: **entra no MVP** (é só um segundo grupo na mesma lista), ver §5.

---

## 2. Estado atual do produto (5174) — placar binário inicial

| # | Item | Régua (§1) | Atual | Veredito |
|---|---|---|---|---|
| G1 | Backend Git (status/stage/unstage/discard/commit) | extensão git oficial | inexistente (nenhuma rota `/git/*`) | **FAIL** |
| G2 | Aba fixa "Changes" na faixa do anexo | 35 px, mesma aba do c3, sem ✕ dirty, ícone `codicon-source-control` | inexistente; `kind` só `code\|search` | **FAIL** |
| G3 | Lista 22 px com grupos + letra de status + cor token | §1.1/§1.2 | inexistente | **FAIL** |
| G4 | Ações inline hover 22×22 (Discard/Stage · Unstage) | §1.1 | inexistente | **FAIL** |
| G5 | Diálogos Discard com textos oficiais | §1.4 | host de diálogo existe (c5) | **FAIL** (sem uso) |
| G6 | Input "Message (Ctrl+Enter to commit)" + botão Commit | §1.3 | inexistente | **FAIL** |
| G7 | Atualização ao vivo (editar/salvar no anexo → letra M aparece; commit → lista esvazia) | extensão observa `.git` + FS | watcher `fs.changed` existe (ignora `.git`) | **FAIL** |
| G8 | Isolamento: Explorer/Search/Terminal/Browser intocados; editor central intocado | — | — | (a provar por anti-regressão) |

**0/7 PASS** — esperado (feature nova). Meta: ≥ 6/7 PASS medidos no 5174 + anti-regressão total.

---

## 3. Decisões que preciso do usuário (responder antes do c1)

1. **Root do repositório Git** = raiz do workspace aberto (`/fs/root`)? Se a pasta não for repo git → aba mostra o estado vazio oficial ("No source control providers registered." não se aplica; usar o texto do VS Code para pasta sem git: *"The folder currently open doesn't have a Git repository."* + botão **Initialize Repository**?) — proposta MVP: **só a frase, sem Initialize** (D2.27).
2. **Grupo `Staged Changes`**: entra no MVP (proposta: **sim**, ver §1.5) ou some (Stage vira "stage + nada visível", quebrando Unstage)?
3. **Commit sem staged**: reproduzir o diálogo "stage all and commit directly?" (proposta: **sim**, sem o botão "Always") ou só desabilitar o botão?
4. **Clique no arquivo da lista**: no VS Code abre o **diff** (`git.openChange`). Diff está em 4.7-c → no MVP o clique abre o **arquivo** no anexo (aba normal, preview) — aceita? (Deletado → não abre.)
5. **Letra/cor de untracked = U verde** (fiel ao VS Code) em vez de "U cinza" do pedido — confirmar fidelidade.

---

## 4. Contratos e limites

- **Código só em** `src/modules/explorer-search/` (`server/git/**`, `core/git/**`, `ui/attach/changes/**`, `core/editor` ampliado) + `attach.css`. **Nenhuma** mudança em `App.tsx`, `AuxiliaryBar.tsx`, `EditorArea.tsx`, Explorer, Search, Terminal, Browser.
- **Plugin Vite** (`server/vite-plugin-fs.ts`): registra as rotas `/git/*` no mesmo plugin (mesmo Single Port; sem processo extra — princípio LEGO). Rotas: `POST /git/status` → `{ repoRoot, branch, entries:[{uri, path, index:'M|A|D|R|C|.', worktree:'M|D|?|.'}] }` (parse de `git status --porcelain=v2 -z --branch`) · `POST /git/stage {uris}` · `POST /git/unstage {uris}` · `POST /git/discard {uris}` (`git checkout -- ` / `git clean -f --` para untracked) · `POST /git/commit {message}` → `{ oid }`. Tudo com `cwd = repoRoot`, `execFile('git', …)` (sem shell), timeout 15 s, erros → `{ error }` 4xx/5xx.
- **`contract.ts`**: mudança **aditiva** — `kind: 'code' | 'search' | 'changes'` em `AttachTab`/`open`; novo evento `git.statusChanged { sessionId, count }`. Registrar em docs/12 como exceção de contrato (mesma regra do `keybinding?` da 4.5).
- **Segurança**: uris sempre resolvidas dentro do root (mesma `safeResolve` do FS); `git.clean` só com `--` e caminhos explícitos; nunca `-x`.
- Sem push/pull/fetch/branch (débitos).

---

## 5. Plano atômico proposto (5 commits + regras)

| # | Commit | Conteúdo | Spec falhando antes (`e2e/sessao_14b_git_changes.spec.ts` + unit) | Print |
|---|---|---|---|---|
| c1 | `feat(git-service): adapter /git/* + gitService puro + unit tests` | `server/git/gitHost.ts` (execFile git, parser porcelain v2 com testes de fixture de texto), rotas no plugin; `core/git/gitService.ts` (puro: `refresh()` com debounce 300 ms, cache por sessão, `stage/unstage/discard/commit`, eventos; escuta `fs.changed` do FS para re-status); `core/git/browserGitPort.ts` | unit `gitHost.parse.test.ts` (porcelain → entries), `gitService.test.ts` (15+), E2E backend `sessao_14b_git_backend.spec.ts` (repo temporário em `/tmp/git-fixture` com `git init`; status/stage/unstage/discard/commit reais) | — |
| c2 | `feat(changes-tab): aba fixa "Changes" + lista 22 px com grupos e letras` | `EditorService` aceita `kind:'changes'` (1 por sessão, não-preview, nunca dirty, primeira posição fixa, ✕ fecha como qualquer aba, `attach.open({kind:'changes'})` reabre); `ui/attach/changes/{ChangesPane,ChangesList}.tsx` com DOM `.scm-view > .monaco-list` (grupos `Changes`/`Staged Changes`, `.resource` + `.monaco-icon-label:after` letra, tokens §1.2, strikethrough D, badge count); estado vazio de repo ausente; clique abre arquivo no anexo (decisão §3.4); hook dev `attach.changes.{open,getEntries}` | T1 aba fixa 35 px/ícone/ordem · T2 linhas 22 px · T3 letra+cor token por estado (fixture com M/A/D/U) · T4 grupo Staged aparece após `git add` externo · T5 clique abre arquivo | `auditoria_47b/c2/` (5174 vs CSS-régua; 8080 print → D2.25) |
| c3 | `feat(changes-actions): Stage/Unstage/Discard inline + diálogos oficiais + ações de grupo` | `.actions` 22×22 no hover/foco (ordem §1.1), teclado (Enter abre, Del = discard, Ctrl+Enter n/a), `git.stageAll/unstageAll/cleanAll` no hover do grupo; diálogos §1.4 via `AttachDialog`; após ação → `refresh()`; arquivo aberto no anexo cujo conteúdo mudou por Discard → recarrega pela rota c5 (`fs.changed`) | T6 hover mostra 2 ações 22×22 · T7 Stage move para Staged · T8 Unstage volta · T9 Discard rastreado pede confirmação com texto oficial e restaura o arquivo · T10 Discard untracked = "DELETE … untracked file" e apaga · T11 Stage All | `auditoria_47b/c3/` |
| c4 | `feat(commit-input): mensagem + botão Commit + regras` | linha `.scm-input` (Monaco 1 linha ou textarea com as mesmas medidas — decidir por RAM: **textarea** com tokens do input, radius 4, placeholder oficial, cresce até 10 linhas), `.button-container > .monaco-text-button` "✓ Commit"; Ctrl+Enter comita; vazio → "Please provide a commit message"; sem staged → diálogo §1.3 (Yes/Cancel); sucesso → lista atualiza, input limpa, evento `git.committed` | T12 placeholder/medidas · T13 commit real (HEAD muda, lista vazia) · T14 vazio → aviso · T15 sem staged → diálogo stage-all | `auditoria_47b/c4/` |
| c5 | `docs(4.7-b)` | `04_21 §6` placar final + `docs/12` topo/entrada + `docs/11` + `docs/05` (D2.22 CONCLUÍDO; novos débitos) + `docs/16` | — | — |

**Regras (inalteradas):** spec falhando antes de cada commit; após cada commit: typecheck 0 · vitest ≥ 341 · `sessao_14` 16/16 · `sessao_12` 30/30 · `sessao_13` 14/14 + 6/6 · terminal 9/9 · `sessao_07` 5/5 · `sessao_03` 5/5; rollback imediato se falhar; commit só verde; código só no módulo; sem hex; relatório binário por commit em PT-BR.

**Fixture E2E:** repo temporário `/tmp/git-fixture` criado no `beforeAll` do spec (`git init`, `user.name/email` locais, 1 commit base, depois arquivos M/A/D/U) servido por um vite na 5175 com `FS_TEST_ROOT=file:///tmp/git-fixture` (mesmo mecanismo da 4.6/4.7).

**Débitos a registrar em `docs/05` (não implementar agora):** D2.27 Initialize Repository / pasta sem git · D2.28 diff inline por arquivo (`git.openChange`, Multi-Diff) → 4.7-c · D2.29 Untracked Changes separado (`git.untrackedChanges`) · D2.30 Push/Pull/Fetch/Sync · D2.31 branch picker · D2.32 Merge Changes/conflitos · D2.33 badge de contagem na aba/Activity Bar · D2.34 print 8080 da SCM View (RAM, mesmo caso D2.25).

---

## 6. Execução (a preencher após aprovação)

_(vazio — nenhum código escrito)_
