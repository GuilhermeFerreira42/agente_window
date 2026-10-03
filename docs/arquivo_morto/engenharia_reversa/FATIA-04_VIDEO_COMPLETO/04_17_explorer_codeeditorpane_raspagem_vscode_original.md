# 04_17 — Raspagem fiel: Explorer + CodeEditorPane do VS Code original (referência para Agente Window)

**Data:** 2026-09-22 · **Fase:** APENAS RASPAGEM (sem implementação, sem proposta de código)
**Ambiente medido:** code-server 4.135.0 (VS Code 1.135.0) rodando em `0.0.0.0:8080 --auth none`, pasta aberta `/home/user/agente_window`, tema **Dark Modern** (padrão), viewport 1400×900, DPR 1, Chromium 131 headless (Playwright).
**Fonte de código consultada:** clone `microsoft/vscode` main em `/home/user/.cache/vscode` (fora do snapshot) — `src/vs/workbench/contrib/files/browser/**`, `src/vs/base/browser/ui/tree/**`, `src/vs/base/browser/ui/list/listWidget.ts`, `src/vs/workbench/browser/parts/editor/media/multieditortabscontrol.css`.
**Evidência bruta:** `docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/raspagem_04_17/` — 28 prints PNG + `measurements.json`, `measurements_search.json`, `measurements_empty_tokens.json` (getComputedStyle + getBoundingClientRect reais; nada inventado).

> **Como ler:** todo valor abaixo marcado **[DOM]** foi medido no navegador; **[SRC]** foi lido da fonte; **[AW]** é o estado atual do Agente Window (`platform/apps/workbench-v2/src`). Onde eu não consegui medir, está escrito "não medido".

---

## 0. Premissa de layout do Agente Window (o que muda e o que NÃO muda)

| Aspecto | VS Code original | Agente Window |
|---|---|---|
| Explorer | Sidebar esquerda (Activity Bar + Side Bar) | Barra lateral **esquerda** (aba Files da barra auxiliar) — igual |
| Search | View separada na mesma Side Bar (ícone lupa) | **Dentro** do Explorer, à esquerda |
| CodeEditorPane | Centro, fixo, sempre presente | **Direita, colapsável** ("Visualizador de Contexto") |
| Sash | 4 px (`--vscode-sash-size`) | 6 px (`ATTACH_SASH_WIDTH_PX`, congelado 04_10) |

Por isso toda a lógica extraída abaixo é **agnóstica de posição**: descrevo altura, cor, estados, eventos e ordem — nunca "x absoluto". Onde o original assume "esquerda", anoto o que deve ser espelhado/relativizado.

---

## 1. Prints do VS Code original (lado a lado com descrição)

Pasta: `docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/raspagem_04_17/`

| Print | O que mostra | Observações medidas |
|---|---|---|
| `00_workbench_inicial.png` | Workbench inteiro, primeiro boot (tema Light padrão do code-server + Welcome + Chat) | Antes de aplicar Dark Modern; mostra Restricted Mode banner |
| `01_explorer_sidebar_hover_header.png` | Sidebar com mouse sobre o header "AGENTE_WINDOW" | 4 ações aparecem **só no hover/foco**: New File, New Folder, Refresh, Collapse All |
| `01b_explorer_pane_header_actions.png` | Recorte 300×22 do pane header com ações | Ícones 16 px, botão 20×20, radius 6 px |
| `02_tree_hover_row.png` | Linha da árvore em hover | bg `#2a2d2e` (`list.hoverBackground`), sem outline |
| `03_tree_selected_focused.png` | Linha selecionada com lista focada | bg `#04395e`, texto `#fff`, outline 1 px `#0078d4` offset −1 |
| `04_tree_selected_inactive.png` | Mesma linha após foco ir para o editor | bg `#37373d`, texto `#ccc`, **sem** outline |
| `05_context_menu_arquivo.png` | Menu de contexto sobre pasta `engenharia_reversa` | 21 itens / 6 separadores, keybindings à direita, radius 8 px |
| `05b_context_menu_pasta.png` | Menu sobre pasta (mesmo conjunto) | idem |
| `05c_context_menu_area_vazia.png` | Menu com clique em área abaixo da árvore — cai no último item focado (arquivo) | Itens de arquivo: Open Preview, Open to the Side, Open With…, Select for Compare, Find File References, Open Timeline… |
| `06_novo_arquivo_inline_input.png` | Input inline de "New File…" dentro da árvore | 22 px alto, bg `#313131`, borda `#3c3c3c`, radius 4, outline `#0078d4` |
| `06b_novo_arquivo_validacao_erro.png` | Validação ao digitar `nome inválido/` | Mensagem warning: bg `#352a05`, borda `#b89500`, 12 px, padding 4.8 px |
| `07_drag_over_pasta.png` | Tentativa de DnD nativo (HTML5 não dispara no headless) | Classe `.drop-target` não capturada → ver §3.7 [SRC] |
| `07b_apos_collapse_all.png` | Após "Collapse Folders in Explorer" | Raiz permanece expandida; filhos colapsam |
| `08_editor_preview_tab_italic.png` | Clique simples em README.md → **tab preview em itálico** | `font-style: italic` medido no `.tab-label a` |
| `08b_editor_title_tabs_breadcrumbs.png` | Recorte 1052×57 do título: tabs (35) + breadcrumbs (22) | |
| `08c_tab_hover.png` | Hover na tab | Botão fechar sempre visível na tab ativa (opacity 1) |
| `09_editor_multiplas_tabs.png` | 2 tabs: README (pinada, normal) + `.bat` (preview, itálico, ativa) | Aba ativa: bg `#1f1f1f`, borda superior 1 px `#0078d4`, texto `#fff`; inativa: bg `#181818`, texto `#9d9d9d` |
| `10_tab_dirty.png` | Após digitar → tab dirty | Ícone fechar vira `codicon-close-dirty`?? **não** — medido: `codicon-close-small` permanece; dirty aparece como bolinha via classe `.dirty` na tab (ver §4.3) |
| `11_editor_split.png` | `Ctrl+\` → 2 grupos 526 px cada | Sash vertical 4 px em x=872, `cursor: ew-resize` |
| `12_editor_drop_overlay.png` | Arrastando tab para lado direito do grupo 1 | Overlay `.editor-group-overlay-indicator` bg `rgba(83,89,93,0.5)` + prompt `.editor-group-overlay-drop-into-prompt` 221×31 bg `#202020` |
| `13_editor_empty_state.png` | Todos editores fechados | Watermark 256×256 (letterpress) + `<dl>` de atalhos: Open Chat, Show All Commands, Find in Files |
| `14_search_view_inicial.png` | Search view vazia | Input 26 px, placeholder "Search", 3 toggles 20×20 (Aa, ab, .*), toggle replace à esquerda 16 px |
| `15_search_resultados.png` | Busca "FATIA" → 504 results in 55 files | Linhas 22 px; highlight `rgba(234,92,0,0.33)` |
| `15b_search_row_hover_actions.png` | Hover em resultado | Ações inline (Replace/Dismiss) — não capturadas pelo seletor; ver §5 |
| `16_search_replace_aberto.png` | Toggle Replace aberto | 2º inputbox + toggle "Preserve Case" |
| `17_search_include_exclude.png` | "…" (details) aberto | "files to include" placeholder `e.g. *.ts, src/**/include`; "files to exclude" + toggle "Use Exclude Settings and Ignore Files" (checked por padrão) |
| `18_explorer_sem_pasta.png` | Explorer sem pasta aberta | Pane title "NO FOLDER OPENED"; welcome-view com texto + botão azul "Open Folder" + "Clone Repository" |
| `19_workbench_sem_pasta.png` | Workbench inteiro sem pasta | |

---

## 2. Tokens de tema (Dark Modern) usados por Explorer/Search/Editor — [DOM]

Fonte: `measurements_empty_tokens.json` (getComputedStyle em `.monaco-workbench`).

| Token | Valor | Onde aparece |
|---|---|---|
| `foreground` | `#cccccc` | texto padrão |
| `descriptionForeground` | `#9d9d9d` | textos secundários, tab inativa |
| `icon.foreground` | `#cccccc` | codicons |
| `focusBorder` | `#0078d4` | outline foco, input focus, sash hover, tab ativa top |
| `sideBar.background` | `#181818` | Explorer/Search |
| `sideBar.border` | `#2b2b2b` | borda entre sidebar/editor |
| `sideBarTitle.foreground` | `#cccccc` | "EXPLORER" (11 px) |
| `sideBarSectionHeader.background` | `#181818` | header "AGENTE_WINDOW", OUTLINE, TIMELINE |
| `sideBarSectionHeader.border` | `#2b2b2b` | 1 px acima de cada seção |
| `list.hoverBackground` | `#2a2d2e` | hover linha |
| `list.activeSelectionBackground` / `Foreground` | `#04395e` / `#ffffff` | selecionada + lista focada |
| `list.inactiveSelectionBackground` | `#37373d` | selecionada, lista sem foco (Foreground vazio → herda `#ccc`) |
| `list.focusOutline` | `#0078d4` | outline 1 px inset na linha focada |
| `list.dropBackground` | `#383b3d` | linha/pasta alvo de drop |
| `list.dropBetweenBackground` | `#cccccc` | linha 1 px "entre" itens (drop-between) |
| `list.errorForeground` / `warningForeground` | `#f88070` / `#cca700` | decorações de problema no nome |
| `list.highlightForeground` | `#2aaaff` | matches de filtro/quick-open |
| `list.deemphasizedForeground` | `#8c8c8c` | arquivos ignorados (git) |
| `tree.indentGuidesStroke` / `inactive` | `#585858` / `rgba(88,88,88,0.4)` | guias verticais |
| `toolbar.hoverBackground` / `activeBackground` | `rgba(90,93,94,0.31)` / `rgba(99,102,103,0.31)` | botões do header e das tabs |
| `input.background` / `foreground` / `border` / `placeholderForeground` | `#313131` / `#cccccc` / `#3c3c3c` / `#989898` | inline rename, search box |
| `inputOption.activeBackground` / `activeBorder` / `hoverBackground` | `rgba(36,137,219,0.51)` / `#2488db` / `rgba(90,93,94,0.5)` | toggles Aa / ab / .* |
| `inputValidation.errorBackground` / `Border` | `#5a1d1d` / `#be1100` | erro rename |
| `inputValidation.warningBackground` / `Border` | `#352a05` / `#b89500` | warning rename (medido em `06b`) |
| `inputValidation.infoBackground` / `Border` | `#063b49` / `#007acc` | info rename |
| `badge.background` / `foreground` | `#616161` / `#f8f8f8` | count badges (search) |
| `scrollbarSlider.background` / `hover` / `active` | `rgba(121,121,121,0.4)` / `rgba(100,100,100,0.7)` / `rgba(191,191,191,0.4)` | scrollbars 10 px |
| `scrollbar.shadow` | `#000000` | sombra 3 px no topo quando há scroll |
| `sash.hoverBorder` | `#0078d4` | sash em hover (após 300 ms) |
| `menu.background` / `foreground` / `border` | `#1f1f1f` / `#cccccc` / `#454545` | menu de contexto |
| `menu.selectionBackground` / `Foreground` | `#0078d4` / `#ffffff` | item de menu em hover/foco |
| `menu.separatorBackground` | `#454545` | separadores |
| `widget.shadow` / `widget.border` | `rgba(0,0,0,0.36)` / `#313131` | |
| `editor.background` / `foreground` | `#1f1f1f` / `#cccccc` | |
| `editorGroup.border` | `rgba(255,255,255,0.09)` | entre grupos split |
| `editorGroup.dropBackground` | `rgba(83,89,93,0.5)` | overlay drop |
| `editorGroup.dropIntoPromptBackground` / `Foreground` | `#202020` / `#cccccc` | prompt "Hold Shift to drop into editor" |
| `editorGroupHeader.tabsBackground` / `tabsBorder` | `#181818` / `#2b2b2b` | faixa das tabs |
| `editorGroupHeader.noTabsBackground` | `#1f1f1f` | modo sem tabs |
| `tab.activeBackground` / `activeForeground` | `#1f1f1f` / `#ffffff` | |
| `tab.inactiveBackground` / `inactiveForeground` | `#181818` / `#9d9d9d` | |
| `tab.unfocusedActiveForeground` / `unfocusedInactiveForeground` | `rgba(255,255,255,0.5)` / `rgba(157,157,157,0.5)` | grupo sem foco |
| `tab.border` | `#2b2b2b` | borda direita entre tabs |
| `tab.activeBorder` (bottom) | `#1f1f1f` | "apaga" a borda inferior sob a tab ativa |
| `tab.activeBorderTop` / `unfocusedActiveBorderTop` | `#0078d4` / `#2b2b2b` | 1 px no topo |
| `tab.hoverBackground` | `#1f1f1f` | |
| `tab.lastPinnedBorder` | `rgba(204,204,204,0.2)` | separador após última tab fixada (sticky) |
| `tab.activeModifiedBorder` / `inactiveModifiedBorder` | `#3399cc` / `rgba(51,153,204,0.5)` | (usado só se `tab.dirtyBorderTop` — tema não define; dirty vira bolinha) |
| `tab.dragAndDropBorder` | `#ffffff` | indicador 2 px ao reordenar tabs |
| `tab.selectedBackground` / `selectedForeground` / `selectedBorderTop` | `#37373d` / `#ffffff` / `#6caddf` | multi-seleção de tabs (Ctrl+clique) |
| `breadcrumb.foreground` / `background` / `focusForeground` / `activeSelectionForeground` | `rgba(204,204,204,0.8)` / `#1f1f1f` / `#e0e0e0` / `#e0e0e0` | |
| `breadcrumbPicker.background` | `#202020` | dropdown do breadcrumb |
| `button.background` / `foreground` / `hoverBackground` / `border` | `#0078d4` / `#ffffff` / `#026ec1` / `rgba(255,255,255,0.1)` | "Open Folder" |
| `textLink.foreground` | `#4daafc` | "Open in editor" no search |
| `editor.findMatchHighlightBackground` | `rgba(234,92,0,0.33)` | highlight nos resultados do Search |
| `search.resultsInfoForeground` | `rgba(204,204,204,0.65)` | "504 results in 55 files" |
| `gitDecoration.modified/untracked/ignored/deleted/added` | `#e2c08d` / `#73c991` / `#8c8c8c` / `#c74e39` / `#81b88b` | cor do nome + letra M/U/D/A à direita |
| `problemsErrorIcon` / `WarningIcon` | `#f14c4c` / `#cca700` | |
| `keybindingLabel.background` / `border` / `bottomBorder` | `rgba(128,128,128,0.17)` / `rgba(51,51,51,0.6)` / `rgba(68,68,68,0.6)` | teclas do watermark |
| `editorStickyScroll.background` / `shadow` | `#1f1f1f` / `#000000` | sticky scroll na árvore (pastas ancestrais grudadas no topo) |
| Fonte UI | `system-ui, Ubuntu, "Droid Sans", sans-serif` 13 px / 400 (line-height 18.2 px) | Linux; Windows = `Segoe WPC, Segoe UI`, mac = `-apple-system` |
| Fonte editor | `"Droid Sans Mono", monospace` 14 px / line-height 19 px | |
| `--vscode-sash-size` / `--vscode-sash-hover-size` | 4 px / 4 px | |

---

## 3. EXPLORER — raspagem completa

### 3.1 Estrutura DOM real [DOM]

```
.part.sidebar (300×843, bg sideBar.background)
└ .composite.viewlet.explorer-viewlet
   ├ .composite.title (35 px, padding 0 8px)
   │   ├ h2 "EXPLORER"  (11 px, weight 400, uppercase via CSS, line-height 35)
   │   └ .title-actions  → "..." (Views and More Actions)
   └ .monaco-pane-view
      ├ .pane.expanded  (Open Editors — oculto por padrão: explorer.openEditors.visible=9 mas view fechada)
      ├ .pane.expanded.preserve-workspace-name-case      ← pasta raiz
      │   ├ .pane-header.expanded (22 px, 11 px bold 700, line-height 22, cursor pointer)
      │   │   ├ .twisty-container.codicon-view-pane-container-expanded (16×16, margin 0 2px, chevron)
      │   │   ├ .title "AGENTE_WINDOW" (11 px bold, x=68 → 20 px após início do pane)
      │   │   └ .actions (20 px alto, margin-right 8 px, aparece em hover/focus-within)
      │   │       └ .action-label.codicon-{new-file,new-folder,refresh,collapse-all} (20×20, icon 16, padding 2, radius 6)
      │   └ .pane-body
      │      └ .explorer-folders-view.file-icon-themable-tree.show-file-icons.align-icons-and-twisties
      │          └ .monaco-list (role=tree) > .monaco-scrollable-element > .monaco-list-rows
      │              └ .monaco-list-row (22 px, role=treeitem, aria-level, aria-expanded, aria-selected, style top/height)
      │                  └ .monaco-tl-row
      │                      ├ .monaco-tl-indent  (absolute, left 16px; contém N .indent-guide de 8 px cada)
      │                      ├ .monaco-tl-twistie.codicon.codicon-tree-item-expanded[.collapsed]  (16 px + padding-right 6 → box 30 medido c/ padding-left 8, font 16 px medido)
      │                      └ .monaco-tl-contents
      │                          └ .monaco-icon-label.{folder-icon|file-icon}.<ext>-ext-file-icon.explorer-item
      │                              └ .monaco-icon-label-container > .monaco-icon-name-container > .label-name > .monaco-highlighted-label
      │                              └ .monaco-icon-description-container (decorações: "M", "U", "9+" etc)
      ├ .pane (OUTLINE, colapsado, header 22 px)
      └ .pane (TIMELINE, colapsado, header 22 px)
```

### 3.2 Header da composite ("EXPLORER") e ações [DOM]

| Item | Medida |
|---|---|
| Altura | **35 px**, padding 0 8 px |
| Título | 11 px, weight 400, `text-transform: uppercase`, cor `sideBarTitle.foreground`, line-height 35 |
| Ações | à direita, "…" (`codicon-ellipsis`) 16 px; abre menu "Views" (Open Editors / Folders / Outline / Timeline toggles) |

### 3.3 Header da pasta raiz (pane header) [DOM]

| Item | Medida |
|---|---|
| Altura | **22 px**, line-height 22 |
| Fonte | 11 px, **weight 700**, uppercase, cor `sideBarSectionHeader.foreground` |
| Twistie | 16×16 codicon `chevron-down/right`, margin 0 2 px, à esquerda do título |
| Título | começa em 20 px do início do pane |
| Ações | container 96×20 (4 botões × 20 px + gaps 4 px), margin-right 8 px |
| Botões | 20×20, ícone 16 px, padding 2, radius 6, cor `icon.foreground`; hover bg `toolbar.hoverBackground`; active `toolbar.activeBackground`; **visíveis só em `:hover` do pane ou `:focus-within`** (medido: aparecem ao hover) |
| Ordem/tooltip | 1 `New File...` (`codicon-new-file`) · 2 `New Folder...` (`codicon-new-folder`) · 3 `Refresh Explorer` (`codicon-refresh`) · 4 `Collapse Folders in Explorer` (`codicon-collapse-all`) |
| Clique no header | colapsa/expande o pane inteiro (a árvore some, header fica) |
| Borda | 1 px `sideBarSectionHeader.border` no topo de cada pane exceto o primeiro |

### 3.4 Árvore de arquivos — geometria [DOM] + [SRC]

| Item | Valor | Fonte |
|---|---|---|
| Altura de linha | **22 px** | `explorerViewer.ts` ITEM_HEIGHT; medido |
| Fonte | 13 px / 400, line-height 22 | medido |
| Indentação por nível | **8 px** (`workbench.tree.indent` default 8; `TreeRenderer.DefaultIndent = 8`) | `abstractTree.ts:345`; medido `indentWidth` 0 → 8 → 16 |
| Fórmula | `indentSize = defaultIndent + (depth-1) * indent` | `abstractTree.ts:389` |
| Twistie | 16 px largura, `font-size: 10px` (CSS) → ícone renderizado 16 px, `padding-right 6px`, `transform: translateX(3px)`, centrado; `.collapsed::before { rotate(-90deg) }` | `tree.css:45-68`; medido box x=51..81 |
| Posição do conteúdo | nível 1: `contents.x = 78` (30 px após o pane) · nível 2: 86 · nível 3: 94 | medido |
| `.monaco-tl-indent` | `position:absolute; left:16px; height:100%; pointer-events:none`; `.hide-arrows` → left 12 px | `tree.css:16-26` |
| Indent guide | `display:inline-block; width: 8px; border-left:1px solid transparent; opacity:0`; ao `renderIndentGuides: onHover` (default) → opacity 1 e cor `tree.indentGuidesStroke` para o ramo em hover/ativo, `inactiveIndentGuidesStroke` para outros; transição `opacity .1s linear` | `tree.css:28-38`; medido opacity 0 fora do hover |
| Ícone de arquivo/pasta | 16×16 via tema de ícones (Seti), classe `<name>-name-file-icon`, `<ext>-ext-file-icon`, `<lang>-lang-file-icon`; `align-icons-and-twisties` alinha ícone de arquivo sob o twistie de pasta | medido (classes) |
| Label | `.label-name` 13 px, `text-overflow: ellipsis`; `.label-description` (13 px, opacity 0.7) para caminho quando `compactFolders` ou multi-root | medido |
| Decorações à direita | `.monaco-icon-description-container` + `.label-description` com letra (M, U, A, D, !) e cor git; badge `9+` para pasta com problemas | [SRC] `explorerDecorationsProvider.ts` |
| Sticky scroll | Pastas ancestrais ficam grudadas no topo enquanto rola (`workbench.tree.enableStickyScroll: true`, máx 7 linhas) bg `editorStickyScroll.background`, sombra `editorStickyScroll.shadow` | [SRC] `abstractTree.ts` StickyScrollController |
| Scrollbar | vertical 10 px, slider `scrollbarSlider.*`, aparece só em hover/scroll (fade 0.8 s), `.shadow.top` 3 px `scrollbar.shadow` quando `scrollTop>0` | [SRC] `scrollableElement.ts`; `.monaco-scrollable-element > .scrollbar.vertical` width 10 |
| Filtro de tipo (`Ctrl+Alt+F` na árvore) | `.monaco-tree-type-filter` absolute top-right, bg `listFilterWidget.background`, outline `listFilterWidget.outline`, matches destacados `list.filterMatchBackground` | [SRC] `tree.css:70+` |
| Compact folders | `explorer.compactFolders: true` → `a/b/c` renderizado numa linha só, cada segmento clicável (`.monaco-icon-name-container.multiple > .label-name`, hover → underline, radius 3 px) | [SRC] `explorerviewlet.css:75-90` |

### 3.5 Árvore — estados visuais [DOM] (linha `.monaco-list-row`)

| Estado | Classes | Background | Foreground | Outline |
|---|---|---|---|---|
| Normal | — | transparente | `#ccc` | — |
| Hover (lista não em drag) | `:hover:not(.selected):not(.focused)` | `#2a2d2e` `list.hoverBackground` | `#ccc` | — |
| Focused + selected, lista com foco | `.focused.selected` em `.monaco-list:focus` | `#04395e` | `#fff` | `1px solid #0078d4`, offset −1 |
| Focused (sem selected), lista com foco | `.focused` | `list.focusBackground` (vazio no tema → transparente) | — | `1px solid #0078d4` offset −1 |
| Selected, lista sem foco | `.selected` | `#37373d` | `#ccc` | nenhum (`list.inactiveFocusOutline` vazio) |
| Selected + focused, lista sem foco | `.focused.selected` | `#37373d` | `#ccc` | nenhum (medido em `04_`) |
| Drop target (pasta alvo) | `.drop-target` | `#383b3d` `!important`, `color: inherit !important` | | — |
| Drop entre itens | `.drop-target-before::before` / `.drop-target-after::after` | linha 1 px `list.dropBetweenBackground` `#ccc` full width | | |
| Lista inteira como drop (raiz) | `.monaco-list.drop-target` / `.monaco-list-rows.drop-target` | `#383b3d` | | |
| Cortado (Ctrl+X) | `.explorer-item.cut` | — | `opacity: 0.5` | |
| Raiz inexistente | `.explorer-item.nonexistent-root` | — | opacity 0.5 | |
| Em edição (rename/new) | `.explorer-item.explorer-item-edited` | input ocupa a linha; `.label-name { flex:0 }` | | |
| Highlight (após create/reveal) | `.explorer-folders-view.highlight` → outros itens `opacity: 0.3` por ~1 s | | | |
| Menu de contexto aberto | `.monaco-workbench.context-menu-visible … .monaco-list-row { outline:none !important }` + linha alvo mantém `.focused` | | | |
| Cursor | `pointer` (medido) | | | |

### 3.6 Árvore — UX / comportamento [DOM] + [SRC] (`explorerView.ts`, `explorerViewer.ts`, `fileActions.ts`)

| Interação | Comportamento original |
|---|---|
| Clique simples em arquivo | Seleciona + abre em **modo preview** (tab itálica, reutiliza a tab preview existente). `workbench.list.openMode: singleClick` |
| Duplo clique em arquivo | Abre **pinado** (tab normal, itálico some) |
| Clique simples em pasta | Toggle expand/collapse (twistie gira, `aria-expanded`) — clique em qualquer parte da linha, não só no twistie |
| Clique no twistie | Toggle sem alterar seleção quando `expandOnlyOnTwistieClick` (default false → linha inteira) |
| Alt+clique no twistie / Alt+clique pasta | Expande/colapsa recursivamente |
| Ctrl+clique | multi-seleção (toggle); Shift+clique = range |
| Ctrl+Enter | Open to the Side |
| Enter (Linux/Win) | Abre arquivo pinado / renomeia no mac |
| F2 | Rename inline (seleciona só o nome sem extensão) |
| Delete / Shift+Delete | Move para lixeira (com confirm `explorer.confirmDelete`) / Delete Permanently (no code-server web: só "Delete Permanently", medido) |
| Ctrl+C / Ctrl+X / Ctrl+V | Copy / Cut (item fica opacity .5) / Paste (gera `nome copy.ext` se conflito — `explorer.incrementalNaming: simple`) |
| Ctrl+Alt+C / Ctrl+Shift+Alt+C | Copy Path / Copy Relative Path |
| Shift+Alt+F | Find in Folder (abre Search com include pré-preenchido) |
| Setas ↑↓ | navegação; ← colapsa ou vai ao pai; → expande ou vai ao 1º filho; Home/End; PageUp/Down |
| Digitação de letras | **type-to-navigate** (`workbench.list.typeNavigationMode: automatic`) — realce em `list.highlightForeground`; `Ctrl+Alt+F` abre filtro persistente |
| Espaço | Abre preview mantendo foco na árvore |
| Auto reveal | `explorer.autoReveal: true` — ao trocar de editor, revela e seleciona o arquivo (scroll suave para o centro se fora da viewport) |
| Refresh | Reconstrói a árvore mantendo expansões |
| Collapse All | Colapsa tudo **exceto a raiz** (medido em `07b`) |
| New File / New Folder | Insere linha fantasma com input na pasta selecionada (ou raiz), indentado no nível do filho; Enter cria; Esc cancela; blur cria se válido; se digitar `a/b/c.txt` cria pastas intermediárias |
| Validação do nome | Mensagem inline abaixo do input; `error` (vazio, `..`, caracteres proibidos, já existe) bloqueia; `warning` (medido: nome terminando em `/` → warning amarelo `#352a05`/`#b89500`) |
| Sort | `explorer.sortOrder: default` → pastas antes, depois arquivos, ordem alfabética case-insensitive natural (números) — `sorter.ts` |
| File nesting | `explorer.fileNesting.enabled: false` default (quando ligado: `package.json` agrupa `package-lock.json` com twistie) |
| Watcher | Alterações externas refletem sem refresh (coalescência 300 ms) |
| Foco visual da lista | `.monaco-list:focus { outline: 0 }` — o foco é mostrado só na linha `.focused` |
| Empty area | Clique em área vazia abaixo da árvore **limpa a seleção** e o menu de contexto exibe ações da raiz (New File/Folder, Paste, Refresh...) — no build medido, com item ainda focado, o menu mostrou o do item (`05c`) |

### 3.7 Drag & Drop [SRC] (`explorerViewer.ts` FileDragAndDrop) — não reproduzível em headless (HTML5 DnD)

| Aspecto | Original |
|---|---|
| Iniciar | `mousedown` + mover > 5 px na linha; ghost = label do item (`dragImage` gerado, texto do nome; N itens → "N items") |
| Feedback alvo | Pasta alvo `.drop-target` bg `#383b3d`; arrastar sobre pasta **colapsada por 500 ms** a expande automaticamente (`autoExpand`) |
| Alvo raiz | Se solto em área vazia → raiz vira `.drop-target` (lista inteira) |
| Mover vs copiar | Default **move**; segurar **Ctrl** (Win/Linux) / **Alt** (mac) → **copia**; cursor muda (`copy`) |
| Confirmação | `explorer.confirmDragAndDrop: true` → diálogo "Are you sure you want to move 'X'?" com "Do not ask me again" |
| Conflito | Diálogo "A file or folder with the name 'X' already exists in the destination folder. Do you want to replace it?" |
| Arrastar para fora | Para o editor: abre arquivo (drop no grupo); para chat: anexa; para o SO: `DownloadURL` (Chrome) |
| Arrastar de fora (upload) | Arquivos do SO sobre o Explorer → **Upload** para a pasta alvo (web) com progresso na status bar |
| Entre itens (reordenar) | **Não existe** no Explorer (só sort) — `dropBetween` é usado em Open Editors |
| Tab do editor → Explorer | Não suportado |
| Cancelar | Esc durante drag |

### 3.8 Menu de contexto (medido em `05_*`) [DOM]

| Item | Medida |
|---|---|
| Container | `.context-view` → `.monaco-menu-container` radius 8, `box-shadow: 0 0 12px rgba(0,0,0,0.14)`; `.monaco-menu` borda 1 px `#454545`, bg `#1f1f1f`, padding vertical 4 px |
| Largura | 348 px medida (min 200?, cresce com maior label+keybinding) |
| Item | `.action-item` **24 px** alto; `.action-label` 13 px, padding `0 26px` (26 px à esquerda reserva espaço para check/ícone), radius 6 px; keybinding à direita alinhado, mesma cor, padding-right 26 |
| Hover/foco | bg `menu.selectionBackground` `#0078d4`, texto `#fff`, radius 6 |
| Desabilitado | `.disabled` → opacity 0.4 (Paste sem clipboard) |
| Separador | `.action-item.disabled > .action-label.separator` 1 px `#454545`, margin 5 px 0 |
| Submenu | seta `codicon-chevron-right` à direita |
| Teclado | ↑↓ navega, Enter ativa, Esc fecha, letra sublinhada = mnemonic |
| Ordem medida (pasta) | New File… · New Folder… · Open in Images Preview · Open in Integrated Terminal ‖ Find in Folder… `Shift+Alt+F` ‖ Add Folder to Chat ‖ Cut `Ctrl+X` · Copy `Ctrl+C` · Paste `Ctrl+V` ‖ Download… · Upload… ‖ Copy Path `Ctrl+Alt+C` · Copy Relative Path `Ctrl+Shift+Alt+C` ‖ Rename… `F2` · Delete Permanently `Del` |
| Ordem medida (arquivo) | Open Preview · Open to the Side `Ctrl+Enter` · Open With… · Open in Integrated Terminal ‖ Select for Compare ‖ Find File References ‖ Open Timeline ‖ Add File to Chat ‖ Cut · Copy ‖ Download… ‖ Copy Path · Copy Relative Path ‖ Rename… · Delete Permanently |
| Grupos (`fileActions.contribution.ts`) | `navigation` (1_) · `2_workspace` · `3_compare` · `4_search` · `5_cutcopypaste` · `5b_importexport` · `6_copypath` · `7_modification` |

### 3.9 Estado vazio (sem pasta) [DOM] (`18_`, `19_`)

| Item | Valor |
|---|---|
| Pane title | "NO FOLDER OPENED" (11 px bold uppercase) |
| Corpo | `.welcome-view > .monaco-scrollable-element > .welcome-view-content` (padding 0 20 px), `<p>` 13 px "You have not yet opened a folder." |
| Botão | `.monaco-button.monaco-text-button` "Open Folder" — bg `#0078d4`, texto `#fff`, borda 1 px `rgba(255,255,255,0.1)`, radius 2 px, altura ~28 px, width 100%, padding 4 px, margin 4 px 0; hover `#026ec1` |
| 2º bloco | "You can clone a repository locally." + botão "Clone Repository" |
| 3º bloco (web) | "To learn more about how to use Git and source control in VS Code read our docs." (link `textLink.foreground`) |
| Ações header | New File/Folder ficam **ocultas**; Refresh/Collapse desabilitados |

### 3.10 Seções auxiliares no mesmo painel [DOM]

| Seção | Comportamento |
|---|---|
| OPEN EDITORS | Oculta por padrão (`explorer.openEditors.visible: 9`, view desabilitada em Dark Modern/code-server); quando visível: lista de editores abertos por grupo, 22 px/linha, ícone X inline no hover, dirty = bolinha, "Save All"/"Close All"/"New Untitled" no header; suporta drop-between para reordenar |
| OUTLINE | Colapsada; header 22 px; ao expandir mostra símbolos do editor ativo |
| TIMELINE | Colapsada; header 22 px; histórico git/local do arquivo ativo |
| Redimensionar seções | Sash horizontal 4 px entre panes (`.monaco-sash.horizontal`) |
| Reordenar seções | Drag do header entre panes (`.pane-header` draggable) |

---

## 4. CODEEDITORPANE — raspagem completa

### 4.1 Estrutura DOM real [DOM]

```
.part.editor > .content
└ .grid-view (split arbitrário: .monaco-grid-view > .monaco-grid-branch-node > .monaco-split-view2 …)
   └ .editor-group-container[.active][.empty]
      ├ .title (57 px = 35 tabs + 22 breadcrumbs; bg editorGroupHeader.tabsBackground)
      │   ├ .tabs-and-actions-container[.tabs-border-bottom]
      │   │   ├ .monaco-scrollable-element > .tabs-container (35 px, scroll horizontal oculto, wheel → scroll)
      │   │   │   ├ .tab.tab-actions-right.sizing-fit.has-icon[.active][.selected][.dirty][.sticky][.tab-border-top][.tab-border-bottom]
      │   │   │   │   ├ .tab-border-top-container (1 px)  ← só ativa/selected/dirty
      │   │   │   │   ├ .tab-label.monaco-icon-label.file-icon.<ext>-ext-file-icon > .monaco-icon-label-container > a (nome) [.italic]
      │   │   │   │   ├ .tab-actions > .monaco-action-bar > .action-label.codicon-close[.codicon-close-dirty]  (20×20)
      │   │   │   │   └ .tab-border-bottom-container (1 px)
      │   │   │   └ .tabs-bar-add-tab (hidden — só com `workbench.editor.showTabs` + setting)
      │   │   └ .editor-actions (116 px medido, padding 0 8px 0 4px) > .action-label 22×22: [open-preview] [preview] split-horizontal · toolbar-more
      │   └ .breadcrumbs-control (22 px) > .monaco-breadcrumb-item (padding 0 8px 0 0, cor breadcrumb.foreground) + codicon-chevron-right entre itens
      ├ .editor-container (bg editor.background) > .editor-instance > .monaco-editor …
      ├ .editor-group-watermark (só quando .empty) > .letterpress (256×256 svg) + dl (atalhos)
      └ .editor-group-overlay-indicator / .editor-group-overlay-drop-into-prompt (durante drag)
```

### 4.2 Tabs — geometria [DOM] + [SRC]

| Item | Valor |
|---|---|
| Altura da faixa | **35 px** (`--editor-group-tab-height`; 22 px em `workbench.editor.tabHeight: compact`) |
| Altura da tab | 35 px, `box-sizing: border-box`, `padding-left: 10px` (5 px em shrink/fixed com ícone) |
| Largura | `sizing-fit`: `width: 120px; min-width: fit-content` → medido 143 px "README.md", 194 px `-atualiza_git_1.0.bat` (cresce com o texto); `shrink`: min 80 max fit; `fixed`: 50–160 px |
| Fonte | 13 px / 400, line-height 35; `.tab-label a` 13 px |
| Ícone | 16 px file-icon à esquerda do texto (gap ~6 px: label começa x+22 medido: 358→380) |
| Botão fechar | 20×20 (`.action-label` 16 px + padding 2, radius 6) à direita, `tab-actions-right`; margem direita ≈ 5 px (466+20=486 de 491) |
| Borda direita | 1 px `tab.border` `#2b2b2b` entre tabs (`.tab-border-right`? — implementado via `border-right`) |
| Tab ativa | bg `#1f1f1f`; texto `#fff`; `.tab-border-top-container` 1 px `#0078d4` (`tab.activeBorderTop`); `.tab-border-bottom-container` 1 px `#1f1f1f` (apaga a linha de 1 px `tabs-border-bottom` `#2b2b2b` sob ela); classes medidas: `tab tab-actions-right sizing-fit has-icon active selected tab-border-bottom tab-border-top` |
| Tab inativa | bg `#181818`; texto `#9d9d9d`; hover → bg `#1f1f1f` (medido igual à ativa) |
| Grupo sem foco | ativa: texto `rgba(255,255,255,.5)`, border-top `#2b2b2b`; inativa `rgba(157,157,157,.5)` |
| Faixa | `.tabs-and-actions-container.tabs-border-bottom::after` 1 px `editorGroupHeader.tabsBorder` `#2b2b2b` na base, z-index 9 |
| Preview | `.tab-label a { font-style: italic }` (medido `italic` → após dblclick `normal`); tab `.preview`? classe não medida — o itálico vem de `.monaco-icon-label.italic` |
| Dirty | classe `.dirty` na tab; ícone fechar troca para `codicon-close-dirty` (bolinha ●) **exceto** enquanto a tab está em hover (volta ao X); no meu print `10_` o hover estava ativo, por isso `codicon-close-small`. `tab.dirtyBorderTop`: não definido no Dark Modern → sem borda |
| Sticky / pinned (Ctrl+K Shift+Enter) | `.sticky.sticky-compact` 38 px só ícone ou `.sticky-shrink` 80 px; ficam à esquerda com `position: sticky`; borda `tab.lastPinnedBorder` após a última; sem botão fechar (pin icon) |
| Selected (multi) | Ctrl+clique em várias tabs → `.selected` bg `#37373d`, border-top `#6caddf` |
| Scroll | wheel horizontal; scrollbar 3 px na base (`.scrollbar.horizontal` height 3, z-index 11) |
| Close button "off/left" | `workbench.editor.tabActionLocation: left|right`, `tabCloseButton: off` → `close-action-off` |
| Wrap | `workbench.editor.wrapTabs` → `.wrapping` altura auto, `--last-tab-margin-right` |
| Tab fade | `.tab-fade-hider` 5 px degradê quando close à esquerda |

### 4.3 Tabs — UX [DOM]+[SRC] (`multiEditorTabsControl.ts`)

| Interação | Comportamento |
|---|---|
| Clique | ativa; **clique do meio** fecha |
| Duplo clique na tab | **pina** (remove preview / itálico); duplo clique em **área vazia** da faixa → novo arquivo untitled |
| Hover | mostra X (sempre visível na ativa; nas inativas visível também em Dark Modern medido opacity 1) e tooltip com caminho completo após ~500 ms (hover customizado `.monaco-hover`) |
| X | fecha; se dirty → diálogo "Do you want to save the changes…" (Save / Don't Save / Cancel) |
| Ctrl+W / Ctrl+F4 | fecha ativa; Ctrl+K W fecha todas do grupo; Ctrl+K Ctrl+W fecha todas; Ctrl+Shift+T reabre |
| Ctrl+Tab | quick pick MRU; Ctrl+PageUp/PageDown troca sequencial; Alt+1..9 |
| Ctrl+K Enter | Keep Open (pin preview) |
| Ctrl+K Shift+Enter | Pin (sticky) |
| Botão direito | menu: Close · Close Others · Close to the Right · Close Saved · Close All ‖ Copy Path · Copy Relative Path ‖ Reveal in Explorer View ‖ Keep Open · Pin · Split Up/Down/Left/Right ‖ (Reopen Editor With…) |
| Drag da tab | reordena dentro da faixa (indicador 2 px `tab.dragAndDropBorder` `#fff` na borda esquerda do alvo); arrastar para outro grupo move; **Ctrl** copia; arrastar para o corpo do editor → overlay de split (§4.6); arrastar para fora da janela → nova janela (desktop) |
| Arrasto de arquivo do Explorer para a faixa | abre o arquivo naquela posição |
| Preview | só **uma** tab preview por grupo; abrir outro arquivo com clique simples **substitui** a preview; editar, dblclick ou Ctrl+K Enter promove; `workbench.editor.enablePreview: true`, `enablePreviewFromQuickOpen: false` |
| Abrir mesmo arquivo 2× | foca a tab existente (não duplica) — exceto Open to the Side |
| Ordem de inserção | `workbench.editor.openPositioning: right` (à direita da ativa) |
| Limite | `workbench.editor.limit.enabled: false` |
| Restaurar | tabs e grupo persistem por workspace (`workbench.editor.restoreViewState`) |
| Sem tabs (`showTabs: single`) | mostra `.title` 35 px com nome + breadcrumbs, `editorGroupHeader.noTabsBackground` |

### 4.4 Breadcrumbs [DOM]

| Item | Valor |
|---|---|
| Altura | **22 px**, bg `breadcrumb.background` `#1f1f1f` |
| Item | `.monaco-breadcrumb-item` padding `0 8px 0 0`, 13 px, cor `rgba(204,204,204,0.8)`, cursor pointer; **primeiro item começa no x do grupo** (sem padding-left — medido x=348) mas com ícone de arquivo 16 px quando `breadcrumbs.icons: true` |
| Separador | `codicon-chevron-right` 16 px entre itens (0×0 medido pois só 1 item na raiz) |
| Último item | `.file` + símbolos do documento (`breadcrumbs.symbolPath: on`) |
| Hover | cor `breadcrumb.focusForeground` `#e0e0e0` |
| Clique | abre picker `breadcrumbPicker.background` `#202020` com árvore de irmãos (árvore + editor de largura ~ 1/3) |
| Foco | `Ctrl+Shift+.` foca; ←→ navega; Enter abre picker; `Ctrl+Shift+;` foca último |
| Scroll | horizontal se estourar, com fade |
| Config | `breadcrumbs.enabled: true`; `filePath: on` mostra caminho relativo à raiz do workspace |

### 4.5 Ações do editor (toolbar direita) [DOM]

| Item | Valor |
|---|---|
| Container | `.editor-actions` 35 px alto, padding `0 8px 0 4px`, alinhado à direita da faixa das tabs |
| Botão | 22×22 (`action-label` codicon 16 + padding 3), radius 5/6, hover `toolbar.hoverBackground` |
| Ordem medida (README.md) | `Open Preview to the Side (Ctrl+K V)` · `Open as Preview` · `Split Editor Right (Ctrl+\) [Alt] Split Editor Down` · `More Actions...` (`codicon-toolbar-more`) |
| Contextual | mudam por tipo de arquivo (Run, Format, Compare, Open Changes…); quando tabs wrap ficam absolutas |
| Dirty/lock indicator | `.editor-group-container.locked` mostra cadeado; grupo `readonly` mostra ícone |

### 4.6 Split, sash e área de drop [DOM]

| Item | Valor |
|---|---|
| Split | `Ctrl+\` → 2 grupos iguais (526/526 medido); `Ctrl+K Ctrl+\` split down; até N grupos em grid livre |
| Sash entre grupos | `.monaco-sash.vertical` **4 px** (`--vscode-sash-size`), `cursor: ew-resize`, hover após 300 ms → bg `sash.hoverBorder` `#0078d4` (linha de 4 px), duplo clique → distribui igualmente |
| Borda entre grupos | 1 px `editorGroup.border` `rgba(255,255,255,0.09)` |
| Tamanho mínimo do grupo | 220 px largura / 70 px altura (`EDITOR_MIN_DIMENSIONS`) |
| Overlay de drop (arrastar tab/arquivo sobre o corpo) | `.editor-group-overlay-indicator` cobre o grupo, bg `editorGroup.dropBackground` `rgba(83,89,93,0.5)`, `overlay-move-transition` (transição 70 ms de posição); se cursor nos **~30 % das bordas** o overlay encolhe para a metade correspondente (split left/right/up/down); centro = drop no grupo |
| Prompt | `.editor-group-overlay-drop-into-prompt` 221×31, bg `#202020`, radius 4, texto "Hold Shift to drop into editor" (`editorGroup.dropIntoPromptForeground`) — só quando o drop pode inserir conteúdo no editor (texto/arquivos) |
| Drop de arquivo do SO | abre o arquivo (web: abre como untitled/upload) |
| Grupo ativo | `.editor-group-container.active` — tabs com cores plenas; inativo usa `unfocused*` |
| Maximizar | `Ctrl+K Ctrl+M` toggle maximize group; `Ctrl+K Ctrl+Shift+\` |
| Fechar grupo vazio | grupo vazio some ao fechar último editor (`workbench.editor.closeEmptyGroups: true`); o único grupo restante mostra watermark |
| Redimensionar tabs | `workbench.editor.tabSizing: fit|shrink|fixed`, `tabSizingFixedMinWidth 50`, `MaxWidth 160` |

### 4.7 Estado vazio do editor [DOM] (`13_`)

| Item | Valor |
|---|---|
| Container | `.editor-group-watermark` centrado, `max-width: 290px` (272 medido), margin auto |
| Letterpress | 256×256 SVG do logo em `editorWatermark.foreground` (vazio → herda `#ccc` com opacity via SVG) — no code-server é o logo dele |
| Atalhos | `<dl>` com `<dt>` label + `<dd>` `.monaco-keybinding` (chips `keybindingLabel.*`, 11 px, radius 3, borda inferior 1 px) — 3 pares medidos: Open Chat `Ctrl+Alt+I` · Show All Commands `Ctrl+Shift+P` · Find in Files `Ctrl+Shift+F` (varia: Go to File, Toggle Terminal…) |
| Fonte | 13 px, dt cor `foreground` opacity .6 |
| Config | `workbench.tips.enabled: true`; some quando largura do grupo < ~400 px ou altura < ~300 px |
| Faixa de tabs | `.tabs-and-actions-container.empty` → altura 0? **Não**: `.title` some inteiro quando o grupo está vazio (medido watermark y=35 = topo do part) |

### 4.8 Comportamento ao colapsar/expandir (o que vale para o painel colapsável do Agente Window) [SRC] `editorPart.ts`, `layout.ts`

| Situação | Original |
|---|---|
| Part editor oculto | Não existe "colapsar editor" no VS Code — o editor é obrigatório; mas **auxiliary bar / sidebar** colapsam: estado salvo em `workbench.state`; ao reabrir restaura largura anterior (`storage`), largura mínima 170 px, tamanho persistido por workspace |
| Zen mode / maximize | `Ctrl+K Z` esconde tudo; `Ctrl+K Ctrl+M` maximiza grupo com animação nenhuma (layout imediato) |
| Persistência | `EditorGroupModel` serializa: editores, ordem, ativo, preview, sticky, MRU, viewState (scroll/cursor) — restaura no reload |
| Layout ao redimensionar | tabs em `fit` estouram → scroll horizontal; abaixo de `EDITOR_MIN_DIMENSIONS` grupo é escondido no grid |
| Auto reveal da tab ativa | ao ativar, `scrollIntoView` horizontal da tab |
| Foco | ao mostrar um grupo, foco vai ao editor (`focus()`), não à tab |

---

## 5. SEARCH (no Agente Window fica dentro do Explorer) — raspagem [DOM]

| Item | Valor |
|---|---|
| Widget | `.search-widget` padding 0 18 px (medido x=50→ inputs a x=68), 58 px alto com replace fechado |
| Toggle replace | `.toggle-replace-button` 16 px largura × altura do widget, `codicon-search-show-replace` (chevron ►), radius 4; à **esquerda** dos inputs |
| Inputbox | `.monaco-inputbox` **26 px**, bg `#313131`, borda 1 px `#3c3c3c`, radius 4; **focus**: `outline: 1px solid #0078d4` + classe `.synthetic-focus`; `textarea.input` 24 px, padding `3px 0 3px 6px`, 13 px, auto-cresce em multi-linha (Shift+Enter) até ~ 6 linhas |
| Placeholder | "Search" (`input.placeholderForeground` `#989898`); Replace: "Replace" |
| Toggles no input | 3 × `.monaco-custom-toggle` 20×20 à direita: `codicon-case-sensitive` (Alt+C) · `codicon-whole-word` (Alt+W) · `codicon-regex` (Alt+R); ativo: bg `inputOption.activeBackground`, borda 1 px `inputOption.activeBorder`, radius 3; hover `inputOption.hoverBackground`; Replace tem `codicon-preserve-case` (Alt+P) |
| Botão limpar | não há X no input; ação **Clear Search Results** (`codicon-clear-all`) no header do view |
| Ações do header (hover) | Refresh · Clear Search Results · Open New Search Editor · View as Tree/List (`codicon-list-tree`) · Collapse All |
| Details toggle | `.query-details .more` (`codicon-ellipsis`) 25×16 à direita abaixo dos inputs; abre "files to include" (placeholder `e.g. *.ts, src/**/include`) e "files to exclude" com toggle `codicon-exclude` "Use Exclude Settings and Ignore Files" (checked) e `codicon-book` "Search only in Open Editors" |
| Mensagem | `.messages` 13 px `search.resultsInfoForeground` `rgba(204,204,204,.65)`: "504 results in 55 files - Open in editor" (link) ; margin-top −5 px |
| Resultados | `.monaco-list` árvore: linha de arquivo 22 px (ícone + nome + `.label-description` caminho + `.monaco-count-badge` `#616161` à direita); linhas de match 22 px indentadas 8 px com trecho antes/`.findInFileMatch` bg `rgba(234,92,0,.33)`/depois; **hover** na linha mostra ações inline: match → Replace (`codicon-replace`) + Dismiss (`codicon-close`); arquivo → Replace All + Dismiss |
| Clique em match | abre arquivo **em preview** e revela a linha com highlight `editor.findMatchHighlightBackground`; Enter no foco = abre pinado; Ctrl+Enter = ao lado |
| Atalhos | `Ctrl+Shift+F` foca; `Ctrl+Shift+H` replace; Enter busca; ↓ do input vai para a lista; Esc na lista volta ao input; `Ctrl+Shift+J` toggle details; F4/Shift+F4 próximo/anterior match |
| Debounce | busca automática enquanto digita (`search.searchOnType: true`, 300 ms) |
| Estado sem resultado | texto "No results found. Review your settings for configured exclusions and check your gitignore files - Open Settings - Learn More" |
| Result count badge | Activity bar mostra badge? não; count no `.messages` |

---

## 6. TABELA COMPARATIVA — VS Code original × Agente Window atual

Base [AW]: `platform/apps/workbench-v2/src/modules/explorer-search/ui/explorer.css`, `ExplorerTree.tsx`, `ExplorerHeader.tsx`, `components/EditorArea.tsx`, `components/ContextMenu.tsx`, `styles/app.css`, `core/constants.ts`.

### 6.1 Explorer

| Item | VS Code (medido) | Agente Window (atual) | Status |
|---|---|---|---|
| Altura header do painel | 35 px, título 11 px weight 400 | `.explorer-header` 35 px, título 11 px **weight 500**, letter-spacing .4 | ≈ (peso e tracking diferem) |
| Header da pasta raiz | pane header 22 px, bold 700, twistie 16, clique colapsa | Não há pane-header de raiz separado; ações vivem no header de 35 px | ✗ |
| Ações do header | 4 (New File, New Folder, Refresh, Collapse All), 20×20, radius 6, **visíveis só em hover/focus** | 5 botões (inclui More Actions), 22×22, radius 3, **sempre visíveis** | ≈ |
| Altura de linha | 22 px | 22 px (`EXPLORER_ITEM_HEIGHT_PX`) | ✓ |
| Indentação | 8 px/nível, `indentSize = 8 + (depth-1)*8`, twistie 16 px, guias 1 px em hover | `INDENT = 8`, `paddingLeft = depth*8 + 16`, chevron 16 px, **sem indent guides** | ≈ (falta guia) |
| Twistie | codicon chevron, rotate −90 collapsed, `translateX(3px)`, `font-size 10px` | `.explorer-row-chevron` 16 px, `visibility:hidden` sem filhos (lucide) | ≈ |
| Hover | `#2a2d2e` | `list.hoverBackground` | ✓ |
| Selected + focus | `#04395e`/`#fff` + outline 1 px `#0078d4` offset −1 | `#04395e`/`#fff` via `:focus-within` — **sem outline de foco na linha** | ≈ |
| Selected sem foco | `#37373d` / `#ccc` | idem | ✓ |
| Focused (sem selected) | outline 1 px `#0078d4` | outline só no container `.explorer-tree:focus-visible` | ✗ |
| Drop target | `#383b3d` + auto-expand 500 ms + Ctrl copia + confirmação | `.is-drop-target` bg `list.dropBackground` (`dndPolicy.ts` existe) — auto-expand/confirm: não verificado | ≈ |
| Cut | opacity .5 | `.is-cut` opacity .55 | ≈ |
| Ícones de arquivo | tema Seti por extensão (16 px), pasta aberta/fechada | lucide genérico `.explorer-row-icon` 16 px | ✗ |
| Decorações git/problemas | cor do nome + letra M/U/A/D + badge | `.explorer-row-suffix` (descriptionForeground) — sem cores git | ✗ |
| Inline input (new/rename) | 22 px, bg `#313131`, borda `#3c3c3c`, radius 4, outline `#0078d4`, mensagem inline colorida error/warning/info | `.explorer-inline-input` 20 px, bg `input.background` (fallback `#3c3c3c`), borda `focusBorder`, radius 0; erro só em vermelho `.explorer-inline-error` 11 px | ≈ |
| Validação warning/info | 3 severidades com cores próprias | 1 severidade | ✗ |
| Sticky scroll | sim (até 7 ancestrais) | não | ✗ |
| Type-to-navigate / filtro | sim | não verificado | ✗ |
| Compact folders | sim | não | ✗ |
| File nesting | opcional | não | — |
| Collapse All | preserva raiz expandida | header tem botão — comportamento não verificado | ? |
| Scrollbar | 10 px, slider aparece só em hover, shadow top 3 px | `::-webkit-scrollbar` 10 px sempre visível, sem shadow | ≈ |
| Seções OUTLINE/TIMELINE/OPEN EDITORS | panes 22 px bold, redimensionáveis por sash, reordenáveis | `.explorer-section-header` 22 px uppercase, não redimensionável | ≈ |
| Estado vazio | "NO FOLDER OPENED" + botões azuis 28 px radius 2 | `.explorer-root-status` texto 13 px (Q9: sem picker) | ≈ (por design Q9) |
| Menu de contexto | 24 px/item, radius 8, keybinding coluna direita, 21 itens em 8 grupos | `ContextMenu.tsx`: item `padding 5px 10px` (~28 px), radius medium, **sem coluna de keybinding**, subset 4.4 | ✗ (é a 4.5) |
| Menu: separador | 1 px `#454545` margin 5 | não verificado | ? |
| Fonte UI | 13 px system-ui | 13 px `Segoe WPC/Segoe UI` fallback | ✓ |
| Tokens | 100 % via `--vscode-*` | idem (com fallbacks dark+ **antigos**: `#21252b`, `#26292f`, `#007fd4` ≠ Dark Modern `#181818`, `#0078d4`) | ≈ |

### 6.2 CodeEditorPane (Visualizador de Contexto)

| Item | VS Code (medido) | Agente Window (atual) | Status |
|---|---|---|---|
| Altura faixa de tabs | 35 px | `.editor-tabs` 35 px | ✓ |
| Tab: largura | fit 120 min-content (143–194 medidos), padding-left 10 | `min 92 / max 230`, padding 0 8 + `padding-left 10 / right 6` | ≈ |
| Tab ativa | bg `#1f1f1f`, texto `#fff`, **1 px topo `#0078d4`**, apaga borda inferior | bg `editor.background`, texto `foreground`, **1 px na BASE** (`::after bottom`) `panelTitle.activeBorder` | ✗ (borda no lado errado — padrão de painel, não de editor) |
| Tab inativa | bg `#181818`, texto `#9d9d9d`, borda direita 1 px `#2b2b2b` | bg transparente, texto `descriptionForeground`, `border-right transparent` | ≈ |
| Tab hover | bg `#1f1f1f` | bg `toolbar.hoverBackground` | ≈ |
| Preview (itálico) | sim, 1 por grupo, clique simples/dblclick | **não existe** conceito de preview | ✗ |
| Pin / sticky | Keep Open + Pin compacto 38 px | não | ✗ |
| Dirty | bolinha `codicon-close-dirty` no lugar do X | não | ✗ |
| Botão fechar | 20×20 radius 6, hover `toolbar.hoverBackground` | 18×18 radius small | ≈ |
| Ícone da tab | Seti 16 px por extensão | lucide 13 px por tipo (browser/search/diff) | ✗ |
| Reordenar tabs | drag, indicador 2 px `#fff` na borda | drag com `inset 2px 0 0 0 focusBorder`, `is-dragging` opacity .5 | ≈ |
| Menu de contexto da tab | 12+ itens (Close Others, Close Right, Copy Path, Reveal, Keep Open, Pin, Split…) | 3 itens (Abrir, Fechar, Dividir) | ✗ |
| Clique do meio fecha | sim | não verificado | ? |
| Breadcrumbs | 22 px, `rgba(204,204,204,.8)`, chevrons, picker | **não existe** | ✗ |
| Ações do editor (direita) | 22×22: preview, split, more… | "+" (`editor-tab-add-menu-button`) para novas abas | ✗ |
| Split | grid N grupos, sash 4 px, borda `editorGroup.border` | `onSplit` existe (demo) — não avaliado | ? |
| Sash | 4 px, hover azul após 300 ms, dblclick reset | `.panel-resize-handle` **1 px** (`cursor col-resize`, hover `focusBorder`); constante congelada `ATTACH_SASH_WIDTH_PX = 6` para o anexo | ≈ (6 px é decisão do projeto) |
| Overlay de drop | `rgba(83,89,93,.5)` com zonas 30 % + prompt Shift | não existe | ✗ |
| Estado vazio | watermark 256 + atalhos | `.editor-empty` texto + botão "Abrir Browser" | ≈ (conteúdo do projeto) |
| Colapsável | (n/a no VS Code — só sidebars) restaurar largura salva, min 170 | `sidePaneState` closed/detail-only/editor+detail; `ATTACH_MIN 280 / MAX 1200`, ratio .25–.75 | — (projeto) |
| Fonte do editor | 14 px / 19 lh mono | — | — |
| Persistência de tabs/viewState | por workspace | por sessão | — |

---

## 7. CHECKLIST COMPLETO (para a fase de transplante — apenas lista, sem código)

### 7.1 Explorer — APARÊNCIA
- [ ] Título do painel 35 px / 11 px / weight 400 / uppercase / padding 0 8
- [ ] Pane-header da raiz 22 px / 11 px **700** / twistie 16 px margin 0 2 / borda 1 px `sideBarSectionHeader.border`
- [ ] Ações 20×20, ícone 16, padding 2, radius 6, hover `toolbar.hoverBackground`, active `toolbar.activeBackground`, **ocultas até hover/focus-within**
- [ ] Linha 22 px / 13 px / line-height 22 / cursor pointer
- [ ] Indent 8 px por nível a partir de `defaultIndent 8`; twistie 16 + `translateX(3px)`; contents após twistie
- [ ] Indent guides 1 px, `tree.indentGuidesStroke` no ramo ativo/hover, `inactive` nos demais, opacity 0→1 em .1 s
- [ ] Estados: hover `#2a2d2e`; active-sel `#04395e`/`#fff` + outline 1 px `#0078d4` offset −1; inactive-sel `#37373d`; focused-only outline; drop `#383b3d` !important; cut .5; highlight .3
- [ ] Ícones por extensão/pasta (16 px) alinhados (`align-icons-and-twisties`)
- [ ] Decorações à direita (M/U/A/D, badge `9+`), cores git/problemas no nome
- [ ] Sticky scroll dos ancestrais (bg/shadow tokens)
- [ ] Scrollbar 10 px auto-hide, shadow top 3 px
- [ ] Inline input 22 px (input 20 px, padding 0), bg `#313131`, borda `#3c3c3c`, radius 4, outline `#0078d4` offset −1; mensagem 12 px padding 4.8 px, margin-top −1, 3 severidades
- [ ] Menu: 24 px/item, label padding 0 26, keybinding coluna direita, radius 8 container/6 item, sombra 12 px, borda `#454545`, hover `#0078d4`/`#fff`, separador 1 px margin 5, disabled .4
- [ ] Empty state: título "NO FOLDER OPENED", `<p>` 13 px, botão azul 100 %/radius 2
- [ ] Panes OUTLINE/TIMELINE 22 px bold com sash 4 px

### 7.2 Explorer — UX
- [ ] Clique = preview; dblclick = pinar; Espaço = preview mantendo foco; Ctrl+Enter = ao lado
- [ ] Clique na linha da pasta toggle; Alt+clique recursivo
- [ ] Ctrl/Shift multi-seleção; setas ←→ colapsa/expande/pai/filho; Home/End/PgUp/PgDn
- [ ] Type-to-navigate + filtro `Ctrl+Alt+F`
- [ ] F2 rename (seleciona nome sem extensão); Del; Ctrl+C/X/V com `copy` naming; Ctrl+Alt+C / Ctrl+Shift+Alt+C; Shift+Alt+F
- [ ] New File/Folder em linha fantasma indentada; Enter/Esc/blur; caminhos `a/b/c`
- [ ] Auto-reveal + scroll-to-center ao trocar de editor
- [ ] Collapse All preserva raiz
- [ ] DnD: ghost com nome, `.drop-target`, auto-expand 500 ms, Ctrl = copiar, confirmação, conflito, upload de fora, drag para editor/chat
- [ ] Menu de contexto por tipo (arquivo/pasta/raiz/multi) com grupos e `when`
- [ ] Watcher externo reflete sem refresh
- [ ] Ordenação default (pastas → arquivos, natural, case-insensitive)

### 7.3 Explorer — COMPORTAMENTO / PERSISTÊNCIA
- [ ] Expansões e scroll persistem por workspace
- [ ] Seleção acompanha item criado/renomeado
- [ ] Foco visual nunca no container, sempre na linha
- [ ] Pane colapsável por clique no header, tamanho por sash

### 7.4 CodeEditorPane — APARÊNCIA
- [ ] Faixa 35 px bg `editorGroupHeader.tabsBackground` + linha 1 px `tabsBorder` na base
- [ ] Tab: 35 px, padding-left 10, `sizing-fit` (min-content, base 120), borda direita 1 px `tab.border`
- [ ] Ativa: bg `#1f1f1f`, `#fff`, 1 px TOPO `tab.activeBorderTop`, base "apagada" por `tab.activeBorder`
- [ ] Inativa `#181818`/`#9d9d9d`; hover `#1f1f1f`; grupo sem foco usa `unfocused*`
- [ ] Preview em itálico; dirty = bolinha; sticky 38/80 px; selected multi `#37373d` + top `#6caddf`
- [ ] Botão fechar 20×20 radius 6
- [ ] Ícone 16 px por extensão
- [ ] Breadcrumbs 22 px, item padding 0 8 0 0, chevrons, cores `breadcrumb.*`
- [ ] Toolbar direita 22×22, padding 0 8 0 4
- [ ] Sash 4 px (projeto: 6 px) hover azul após 300 ms; borda entre grupos 1 px `editorGroup.border`
- [ ] Overlay drop `rgba(83,89,93,.5)` com transição 70 ms + zonas 30 % + prompt 31 px
- [ ] Watermark 256 px + `<dl>` de atalhos com chips `keybindingLabel.*`; some abaixo de ~400×300

### 7.5 CodeEditorPane — UX
- [ ] 1 preview por grupo; clique simples substitui; dblclick/edição/Ctrl+K Enter promove
- [ ] Mesmo arquivo → foca tab existente
- [ ] Inserção à direita da ativa; MRU para Ctrl+Tab
- [ ] Clique do meio fecha; Ctrl+W; Ctrl+K W; Ctrl+Shift+T reabre
- [ ] Menu da tab completo (Close Others/Right/Saved/All, Copy Path, Reveal in Explorer, Keep Open, Pin, Split ×4)
- [ ] Drag reordena (indicador 2 px), move entre grupos, Ctrl copia, drop no corpo divide
- [ ] Split via botão/atalho, sash arrastável, dblclick reset, grupo vazio some
- [ ] Salvar antes de fechar (diálogo Save/Don't Save/Cancel)
- [ ] Ao colapsar/expandir o painel (Agente Window): restaurar largura salva; manter tabs/ativo/viewState; foco vai ao editor ao abrir

### 7.6 Estrutura DOM/CSS a preservar (para transplante LEGO)
- [ ] Hierarquia `.pane > .pane-header + .pane-body > .monaco-list > .monaco-list-rows > .monaco-list-row > .monaco-tl-row{indent,twistie,contents}`
- [ ] ARIA: `role=tree/treeitem`, `aria-level`, `aria-expanded`, `aria-selected`, `aria-setsize/posinset`, `aria-label` nome
- [ ] Classes de estado: `focused selected drop-target drop-target-before/after cut highlight explorer-item-edited`
- [ ] Tabs: `.tab.active.selected.dirty.sticky.preview` + `.tab-border-top-container/.tab-border-bottom-container`
- [ ] CSS vars de layout: `--editor-group-tab-height`, `--vscode-sash-size`, `--vscode-tree-indent` (não definida como var no build — vem por inline style), `--vscode-explorer-align-offset-margin-left`
- [ ] Toda cor via `--vscode-*`; nunca hex

---

## 8. O QUE ESTÁ FALTANDO NO AGENTE WINDOW (vs original)

**Explorer**
1. Pane-header próprio da raiz (22 px bold) com ações que aparecem só em hover/focus (hoje: 5 botões fixos no header de 35 px).
2. Indent guides (1 px, hover/ativo).
3. Outline de foco na **linha** (`list.focusOutline` 1 px inset) — hoje só no container.
4. Ícones por tipo/extensão (Seti) e ícone de pasta aberta/fechada.
5. Decorações git/problemas (cor do nome + letra + badge).
6. Sticky scroll de ancestrais.
7. Type-to-navigate e filtro `Ctrl+Alt+F`.
8. Compact folders.
9. Inline input com 3 severidades e geometria original (22/20 px, radius 4, mensagem 12 px).
10. Menu de contexto completo (21 itens/8 grupos, 24 px/item, coluna de keybinding, radius 8) — **é a SUB-FATIA 4.5 já planejada**.
11. DnD: auto-expand 500 ms, Ctrl = copiar, diálogo de confirmação/conflito, ghost com nome, upload externo — parcialmente coberto por `dndPolicy.ts`; não verificado em UI.
12. Scrollbar auto-hide com shadow.
13. Panes redimensionáveis/reordenáveis (OUTLINE/TIMELINE).
14. Fallbacks de tokens desatualizados (Dark+ antigo `#21252b`, `#007fd4`) → Dark Modern (`#181818`, `#0078d4`).
15. Peso do título 400 (não 500) e sem letter-spacing.

**Search (dentro do Explorer)**
16. Inputbox 26 px com toggles Aa/ab/.* embutidos, toggle replace lateral, details (include/exclude), mensagem "N results in M files".
17. Resultados como árvore arquivo → matches (22 px) com highlight `rgba(234,92,0,.33)`, badge de contagem, ações inline (Replace/Dismiss) em hover.
18. Preview ao clicar no match + Enter para pinar.

**CodeEditorPane**
19. Conceito de **tab preview** (itálico, única por grupo, promoção por dblclick/edição).
20. Borda de tab ativa no **topo** (`tab.activeBorderTop`) em vez da base; bg de inativa `#181818`; borda direita entre tabs.
21. Dirty indicator (bolinha) + diálogo de salvar.
22. Pin/sticky tabs.
23. Breadcrumbs (22 px) com picker.
24. Toolbar de ações do editor (split/more) à direita das tabs.
25. Menu de contexto da tab completo.
26. Overlay de drop com zonas de split e prompt.
27. Split real com sash (4 px original / 6 px projeto), borda `editorGroup.border`, dblclick reset, grupo vazio some.
28. Watermark/atalhos no estado vazio (projeto pode manter conteúdo próprio, mas geometria 256 px/chips é referência).
29. Clique do meio fecha tab; MRU Ctrl+Tab; Ctrl+Shift+T reabrir.
30. Persistência de viewState (scroll/cursor) por tab ao colapsar/expandir o painel.

**Não medido / limitações desta raspagem (honestidade)**
- DnD real da árvore e das tabs (HTML5 nativo não dispara em Chromium headless) → valores de DnD vêm da fonte, não de print.
- Ações inline dos resultados do Search (hover não exibiu no seletor usado).
- Hover tooltip das tabs/árvore (temporizador 500 ms) não capturado.
- Open Editors view estava desabilitada no build (não medida).
- Dirty tab foi medida em hover (X visível); a bolinha vem da fonte (`codicon-close-dirty`).
- Tema medido: Dark Modern (Linux/system-ui). Em Windows a fonte é Segoe UI e a line-height muda.
