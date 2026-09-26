# 04_19 — SUB-FATIA 4.6 (Search Panel + Replace): auditoria binária + plano atômico (2026-09-25)

> Status: **PROPOSTA — aguardando aprovação do usuário. Nenhum código escrito.**
> Fontes: `04_06` (requisito), `04_17 §5` (raspagem medida), `04_18 §"Fatia 4.6"` e `§5.2` (plano/checklist), `04_11 §7` (mapa `arquivo:linha` upstream), `contract.ts` (`ISearchApi`, `IEditorAttachApi`), régua viva code-server **8080** (prints em `auditoria_46/`).

---

## 1. Auditoria binária — Search atual (5174) × VS Code real (8080)

Método: mesmo script Playwright nos dois lados, DOM medido com `getBoundingClientRect`/`getComputedStyle` (1400×900, DPR 1). Prints: `auditoria_46/ours_search.png` (nosso), `auditoria_46/vscode_search_results.png`, `vscode_search_replace_details.png`, `vscode_search_empty.png` (régua).

| # | Item | VS Code 8080 (medido) | Agente Window hoje (medido) | Veredito |
|---|---|---|---|---|
| 1 | Onde vive / fonte de dados | View da sidebar; busca real no disco (ripgrep) | Aba `search` do **shell** (`EditorArea.tsx` → `SearchView`), dados **mock fixos** de `src/data.ts` filtrados por `domain/search.ts` (resultado "titlebarPart.ts" não existe no repo) | **FAIL** — não há busca real; módulo devolve `notYet('search.query (4.6)')` |
| 2 | Inputbox | `.monaco-inputbox` **26 px**, radius 4, borda 1 px, `textarea` 24 px padding `3px 0 3px 6px`, 13 px, placeholder "Search"; focus outline 1 px `focusBorder` | wrapper **28 px** (input 19,5 px), radius 4, 13 px, placeholder "Pesquisar no workspace", ícone lupa dentro | **FAIL** (Δ +2 px, sem textarea multi-linha, placeholder ≠) |
| 3 | Toggles no input | 3 × `.monaco-custom-toggle` **20×20** (`case-sensitive` Alt+C · `whole-word` Alt+W · `regex` Alt+R), `aria-checked` | **0** toggles | **FAIL** |
| 4 | Toggle replace | `.toggle-replace-button` **16 × altura do widget (26/58 px)**, chevron à **esquerda**; abre 2.º inputbox 26 px placeholder "Replace" com toggle `preserve-case` (Alt+P) e botão Replace All | inexistente | **FAIL** |
| 5 | Details (`…`) | `.query-details .more` **25×16**; "files to include" (placeholder `e.g. *.ts, src/**/include`), "files to exclude" + toggle "Use Exclude Settings and Ignore Files" (**checked**), inputs 25 px | inexistente | **FAIL** |
| 6 | Widget total | **26 px** (replace fechado) / **58 px** (aberto) — `04_17` diz 58 px com replace fechado: **corrigido pela medição**: 26 fechado, 58 aberto | 28 px + summary ao lado | **FAIL** |
| 7 | Mensagem de contagem | `.messages` 13 px, `search.resultsInfoForeground`, **margin-top −5 px**, "14 results in 7 files - Open in editor" | "1 resultado" (PT-BR, à direita do input) | **FAIL** (posição, plural i18n ok) |
| 8 | Árvore de resultados | `.monaco-list` `aria-level` 1 = arquivo **22 px** (ícone + nome + `.label-description` caminho + `.monaco-count-badge`), nível 2 = match **22 px**, indent **8 px** (medido `.monaco-tl-indent` = 8), highlight `.findInFileMatch` `findMatchHighlightBackground` | lista plana, item **56 px** (2 linhas), sem agrupamento, `<mark>` amarelo | **FAIL** |
| 9 | Ações inline no hover | match: `Replace (Ctrl+Shift+1)` + `Dismiss (Del)` **20×20**; arquivo: `Replace All (Ctrl+Shift+1)` + `Dismiss (Del)` | nenhuma | **FAIL** (agora medido — fecha a lacuna "não medido" da 04_17) |
| 10 | Ações do header | Refresh · Clear Search Results · Open New Search Editor · View as Tree/List · Collapse All | nenhuma | **FAIL** (escopo parcial, ver §3) |
| 11 | Debounce / cancelamento | busca enquanto digita (300 ms upstream; **250 ms congelado** em `constants.ts`), última vence | filtro síncrono do mock | **FAIL** |
| 12 | Clique no resultado → reveal | abre arquivo em **preview** e revela linha; Enter = pinado | `onOpenEditorTab('file', path)` sem linha | **FAIL** (reveal depende do editor da 4.7 — ver §3) |
| 13 | Estado sem resultado | "No results found. Review your settings for configured exclusions and check your gitignore files - Open Settings - Learn More" | "Nenhum resultado / Nenhum arquivo contém …" | **FAIL** (texto) |
| 14 | Atalhos | `Ctrl+Shift+F` foca; `Ctrl+Shift+H` replace; ↓ do input → lista; Esc lista → input; `Ctrl+Shift+J` details | `Ctrl+Shift+F` abre a aba (shell) | **PARCIAL** |

**Placar: 0 PASS · 1 PARCIAL · 13 FAIL.** O Search atual é 100 % mock do shell; nada da 4.6 existe ainda no módulo (`core/search/` ausente; `server/fs` sem `/fs/search`; `constants.ts` já congela `SEARCH_DEBOUNCE_MS=250`, `SEARCH_DEFAULT_MAX_RESULTS=2000`, `SEARCH_DEFAULT_MAX_FILES=500`, `SEARCH_DEFAULT_EXCLUDES`).

Observação de método: o script de auditoria estava dentro do repo durante a captura, por isso "estado vazio" no 8080 devolveu 1 resultado — o texto do estado vazio fica com a frase da `04_17 §5` até o print da homologação (será capturado no c4 com termo garantidamente ausente).

---

## 2. Decisão de escopo que precisa do usuário (bloqueia o plano)

`04_06`/`04_18` colocam o Search **dentro do anexo lateral** (`AttachArea`, sash 6 px) — e o anexo **ainda não existe** (é o item 1–3 da 4.6 na `04_18`). O pedido "4.6 = Search Panel + Replace" pode ser lido de dois jeitos:

- **(A) Só o Search, hospedado no slot que já existe** — o módulo passa a fornecer um `searchSlot` (mesmo padrão do `filesSlot` da 4.4) que o shell renderiza no lugar do `SearchView` mock da aba `search` do editor. App.tsx: só passar o slot (aditivo, como na 4.4). O anexo/sash fica para a 4.7 junto do editor. **Menor risco; entrega busca real e replace agora.**
- **(B) 4.6 completa da `04_18`** — `AttachArea` + sash 6 px + persistência de largura + Search como primeira aba do anexo. Mais 3 commits e toque estrutural no layout do shell (onde o anexo monta ao lado da árvore).

O plano abaixo assume **(A)**; se for (B), acrescento c0a/c0b/c0c (container, sash, persistência) antes do c1 e a spec `sessao_13_attach.spec.ts`.

---

## 3. Plano atômico proposto (7 commits, um por vez, Loop Fechado Visual)

Regras herdadas da 4.5: spec E2E escrita **falhando antes** de cada commit; anti-regressão após cada um (typecheck 0 · vitest ≥280 · `sessao_12_explorer` 30/30 · `fs_backend` 9–10/10 · terminal 9/9 no fechamento · novos verdes); print antes/depois vs 8080 (`auditoria_46/c<N>/`); rollback se falhar; código só em `src/modules/explorer-search/` (exceção: `App.tsx` passa o slot; `EditorArea.tsx` só renderiza `searchSlot ?? <SearchView mock>` — mesma exceção do `filesSlot` da 4.4); zero invenção (medidas da `04_17 §5` + 8080).

| # | Commit | Upstream (`04_11 §7`) | O que entra | Prova (falha antes → passa depois) |
|---|---|---|---|---|
| c1 | `feat(search-engine): POST /fs/search walker + cancel + truncation` | `rawSearchService.ts:24`, `queryBuilder.ts:106` | `server/fs/searchEngine.ts` (walker próprio: excludes congelados, include/exclude glob, case/word/regex, `maxResults 2000`/`maxFiles 500` → `truncated`, arquivo > 1 MB pulado com aviso, streaming NDJSON por arquivo, abort por `AbortSignal`); `server/fs/index.ts` + `case '/fs/search'` (aditivo); `core/search/queryBuilder.ts` (parse `*.ts, src/**`, escape regex, whole-word); unit ≥ 15 | E2E `sessao_13_search_backend.spec.ts` (fixture 5175): termo → matches com `line/column/preview`; include/exclude; `node_modules` ignorado; regex inválida → 400; truncation |
| c2 | `feat(search-service): ISearchApi real (debounce 250, última vence, replaceAll atômico)` | `searchService.ts:28/82`, `replaceService.ts:97`, `searchTreeModel/*` | `core/search/{searchService,model,replace}.ts`: `query()` devolve `SearchHandle` cancelável, eventos `search.started/progress/finished/cancelled/replaceApplied` do `contract.ts`; `model.ts` agrupa arquivo→match com contagens; `replace.ts` via `fs.writeFile(atomic)` por arquivo, falha isolada listada; barrel troca `notYet` por implementação | unit com FakeFs: debounce cancela anterior; plural; `replaceAll` grava 3 ocorrências e reporta `{files, replacements}`; falha em 1 arquivo não bloqueia |
| c3 | `feat(search-widget): SearchWidget 26 px + toggles 20×20 + replace 16 px + details` | `searchWidget.ts:115`, `searchFindInput.ts:18`, `patternInputWidget.ts` | `ui/search/SearchPanel.tsx` + `SearchWidget.tsx` + `search.css`: inputbox 26 px (textarea 24 px, padding `3px 0 3px 6px`, radius 4, focus outline 1 px), toggles `codicon` case/word/regex `aria-checked` (Alt+C/W/R), toggle-replace 16 px à esquerda (`Ctrl+Shift+H`), 2.º input "Replace" + `preserve-case` + Replace All, details `…` 25×16 (`Ctrl+Shift+J`) com include/exclude e toggle "Use Exclude Settings and Ignore Files" ligado; `searchSlot` exposto pelo módulo; `App.tsx`/`EditorArea.tsx` só plugam o slot | E2E `sessao_13_search.spec.ts` T1–T4: alturas 26/58 medidas; toggles alternam `aria-checked`; replace abre 2.º input; details abre com placeholders exatos. Print lado a lado `auditoria_46/c3/` |
| c4 | `feat(search-results): árvore 22 px arquivo/match + badge + highlight + mensagens` | `searchView.ts:128/2601` | `ui/search/SearchResults.tsx`: `role=tree` `aria-level` 1/2, 22 px, indent 8 px, ícone Seti + nome + `label-description` + `monaco-count-badge`; `.findInFileMatch` com token `findMatchHighlightBackground`; `.messages` "N results in M files" margin-top −5 px; estado vazio com a frase do VS Code; ↓ do input → lista, Esc → input; Collapse All + Clear Search Results + Refresh no header | E2E T5–T8: busca real na fixture → agrupamento/contagem; vazio → frase exata; 22 px medidos; teclado. Prints `c4/` |
| c5 | `feat(search-replace): ações inline Replace/Dismiss + Replace All com confirmação` | `replace.ts`, `searchActionsRemoveReplace.ts` | hover 20×20 `Replace`/`Dismiss` no match e `Replace All`/`Dismiss` no arquivo; `Del` dismiss; Replace All com diálogo de confirmação igual ao VS Code ("Replace N occurrences across M files with '…'?"); pós-replace refaz a busca | E2E T9–T11: substituir 3 ocorrências → conteúdo no disco muda (lido via `/fs/read`); dismiss remove linha; contagem atualiza |
| c6 | `feat(search-open): clique → explorer.fileOpened + revealRequested (linha/coluna) + último termo persistido` | `searchView.ts` (open/preview), `04_06 §3.9` | clique em match emite `explorer.fileOpened` + `{line,column}` (o shell abre a aba de arquivo como hoje; **o reveal na linha só se completa na 4.7** — registrado como débito, não fingido); último termo/toggles persistidos por sessão (`localStorage explorer-search.search.v1`), nunca resultados | E2E T12: clique abre a aba do arquivo certo; reload restaura termo/toggles |
| c7 | `docs: 4.6 execution log` | — | docs/12 entrada, docs/11 kanban, docs/05 (débitos: reveal real → 4.7; View as Tree/List, Open New Search Editor, Search only in Open Editors → fora de escopo `04_11 §11-C`), 04_19 atualizado com placar final | — |

**Fora de escopo (não entra, citar no c7):** ripgrep (sem binário), Search Editor, "Search only in Open Editors", View as List, notebook filters, badge de contagem na Activity Bar.

**Critério de pronto da 4.6 (após c7):** placar §1 ≥ 12/14 PASS medidos no 5174 (itens 12 e 14 ficam PARCIAL até a 4.7) + checklist visual do usuário no Windows (busca real no próprio repo, toggles, replace de 3 ocorrências, include/exclude, estado vazio, teclado).

---

## 4. Execução e placar final (2026-09-26) — 4.6 IMPLEMENTADA (aguarda checklist humano no Windows)

Commits atômicos, na ordem aprovada, cada um com spec E2E escrita **falhando antes** e anti-regressão completa depois (typecheck 0 · vitest 308→312 · `sessao_12_explorer`+`sessao_13_search_backend`+`sessao_13_search` 40→50 verdes · `fs_backend` 10/10 · terminal 9/9 · `sessao_07` 5/5 · layout):

| # | Commit | Conteúdo | Prova |
|---|---|---|---|
| c1 | `5b29da8` search-engine | `server/fs/searchEngine.ts` + `POST /fs/search` (JSON e NDJSON), `core/search/queryBuilder.ts` | `sessao_13_search_backend` 6/6 + unit |
| c2 | `2afd3f9` search-service | `core/search/{searchService,model,textMatcher}.ts`: debounce 250, última vence, `replaceAll` atômico, eventos do contrato | unit (searchService 11) |
| c3 | `22e7146` search-widget | `ui/search/SearchPanel.tsx` + `search.css`: widget 26/58 px, toggles 20×20, replace 16 px, details; barrel `mountSearch` → slot `searchSlot` (App.tsx/EditorArea.tsx, exceção autorizada) | T1–T4; prints `auditoria_46/c3/` |
| c4 | `375e3cb` search-results | `ui/search/SearchResults.tsx`: árvore 22 px, indent 8, badge 18 px, `.findInFileMatch`, mensagens, estado vazio, teclado ↓/↑/←/→/Esc | T5–T8; prints `auditoria_46/c4/` |
| c5 | `8064e85` search-replace | ações inline 20×20 (hover/foco, Del, Ctrl+Shift+1), preview riscado + `.replaceMatch`, Replace All com `.monaco-dialog-box` (frases do VS Code), `replaceMatches` pontual | T9–T12 + 4 unit; prints `auditoria_46/c5/` |
| c6 | `985160f` search-open | clique/Enter → `reveal`+`open` do Explorer (`explorer.fileOpened`); `localStorage explorer-search.search.v1`; resultado retido no serviço ao trocar de aba | T13–T14; print `auditoria_46/c6/` |
| c7 | (este) docs | 04_19 §4, docs/12, docs/11, docs/05, docs/16 | — |

**Placar final medido no preview (5175 fixture / 5174) × 8080:**

| # | Item | Veredito | Observação |
|---|---|---|---|
| 1 | Busca real no disco | **PASS** | walker próprio no Single Port (sem ripgrep, por decisão) |
| 2 | Inputbox 26 px / textarea 24 px / placeholder "Search" | **PASS** | T1 |
| 3 | 3 toggles 20×20 + Alt+C/W/R | **PASS** | T2 |
| 4 | Toggle replace 16 px → 58 px, Replace + preserve-case + Replace All 22×22 | **PASS** | T3 |
| 5 | Details `…` 25×16, include/exclude, h4 11 px, inputs 25 px | **PASS** | T4 |
| 6 | Widget 26/58 px | **PASS** | T3 |
| 7 | `.messages` "N results in M files" | **PASS** | sem o link "Open in editor" (Search Editor fora de escopo) |
| 8 | Árvore 22 px arquivo/match, indent 8, badge, highlight | **PASS** | T5/T6 |
| 9 | Ações inline hover 20×20 (Replace/Dismiss; Replace All/Dismiss) | **PASS** | T9–T11 |
| 10 | Ações do header (Refresh · Clear · Collapse All) | **FAIL — débito D2.19** | a aba Search do shell não tem pane header; sem inventar barra própria |
| 11 | Debounce 250 / última vence | **PASS** | unit |
| 12 | Clique → abre arquivo e revela linha | **PARCIAL — débito D2.20** | abre o arquivo (mesmo caminho do Explorer); linha/coluna só na 4.7 (contrato congelado: `explorer.fileOpened` leva só `uri`) |
| 13 | Estado vazio com a frase do VS Code | **PASS** | T7 (sem os links "Open Settings"/"Learn More") |
| 14 | Atalhos Ctrl+Shift+F/H/J, ↓, Esc, Ctrl+Alt+Enter, Del, Ctrl+Shift+1 | **PASS** | T2/T3/T4/T8/T11/T12 |

**Placar: 12 PASS · 1 PARCIAL · 1 FAIL (≥ 12/14, critério de pronto atendido).** Falta apenas o **checklist humano no Windows** (busca real no próprio repo, toggles, replace de 3 ocorrências, include/exclude, estado vazio, teclado ↓/Esc) para marcar a 4.6 como CONCLUÍDA.

**Fora de escopo (decisão do usuário, não entra):** ripgrep, Search Editor / "Open in editor", "Search only in Open Editors", View as List, notebook filters, badge da Activity Bar, AttachArea/sash (4.7).

**Aprendizados desta execução:** (a) o servidor devolve só `column`; o comprimento do trecho casado é recalculado no cliente com regex *sticky* (`y`) na coluna — vale para regex e literal; (b) `.replaceMatch`/ações inline só aparecem com `hover` **ou** linha focada com a lista focada (`:focus-within`), senão o badge some do print estático; (c) ao trocar de aba o shell **desmonta** o painel — o resultado precisa ficar retido no `SearchService.lastResult` (no VS Code a view só é escondida); (d) desmontar root React de forma síncrona dentro do cleanup de outro root gera warning que quebra `sessao_07` — `unmountSearch` adia com `setTimeout 0`; (e) bateria de 50 E2E esgota `inotify max_user_watches` (15 628 no sandbox) → `WS /fs/watch` falha só no fim da bateria; reiniciar a fixture antes do `fs_backend`.
