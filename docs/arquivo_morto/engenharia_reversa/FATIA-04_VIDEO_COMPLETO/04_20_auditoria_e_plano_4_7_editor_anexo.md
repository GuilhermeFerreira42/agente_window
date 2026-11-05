# 04_20 — Auditoria inicial e plano atômico da Sub-Fatia 4.7 — Editor Anexo Lateral (SEM CÓDIGO)

**Data:** 2026-09-26 · **Estado:** **CONCLUÍDA (c1–c7)** — decisão do usuário: **Opção A** (anexo dentro da barra auxiliar, à ESQUERDA da árvore, print `editor/34`). Placar final em §4. Homologação humana no Windows pendente (checklist §4.4).
**Régua:** code-server 8080 (medido por script Playwright, 1400×900) + prints do vídeo `docs/referencias_visuais/editor/34…37` + `04_05` + `04_17 §4` + `04_18 "Fatia 4.7"`.
**Foco autorizado pelo usuário:** E1 (editor à direita da árvore, não no centro) · E2 (abas por sessão com dirty ● e ✕ no hover) · E3 (save atômico `writeFile(atomic:true)`) · E7 (maximizar sem cobrir o shell).

---

## 1. Auditoria binária — estado atual (5174) × régua

Prints: `auditoria_47/ours_00_files_tab.png`, `ours_01_file_opened.png` (nosso) · `vscode_01_tabs_breadcrumbs.png` (8080) · vídeo `editor/34` (posição) e `editor/35` (recolhido).

| # | Item | Régua (medido / fonte) | Agente Window hoje (medido 5174) | Veredito |
|---|---|---|---|---|
| E1 | **Onde o arquivo abre** | Vídeo `editor/34`: dentro do **painel direito da sessão** — abas `Alterações │ tsconfig.json ×`, breadcrumbs, editor **ao lado da árvore** (sash entre eles); centro da sessão continua com o chat. `04_05 §1`: "à direita da árvore, dentro do contêiner da sessão" (no print o editor fica à **esquerda** da árvore — divergência texto × vídeo, ver §2) | Abre na **área central** do editor (`desktop-surface-group`, x 301–1051) entre chat e barra auxiliar; a árvore vive na barra auxiliar (`aux-tab-…-files`, 340 px, x 1056–1396) | **FAIL** (bloqueia o plano — decisão §2) |
| E2.a | Faixa de abas | **35 px**, bg `--vscode-editorGroupHeader-tabsBackground` | **35 px** ✓ (`.editor-tabs`) | PASS |
| E2.b | Aba | 35 px, `padding-left 10`, `padding-right 0`, `min-width fit-content` (medida 141,6 px), label **13 px**/line-height 35, ícone Seti **16 px** + padding-right 6, `border-right 1px --vscode-tab-border`, **`tab-border-top-container` 1 px** na ativa (`--vscode-tab-activeBorderTop`), inativa bg `--vscode-tab-inactiveBackground` | 35 px ✓, padding-left 10 ✓, **font 11 px** ✗, `padding-right 6` ✗, ícone lucide **13 px** ✗, `border-right 1px` ✓, **sem borda 1 px no topo** ✗, ativa bg `--vscode-editor-background` | **FAIL** (4 Δ) |
| E2.c | Botão fechar | `.tab-actions` 28×20; `a.codicon-close-small` **20×20** (16 + padding 2), radius **6** | 18×18, radius 4, ícone lucide | FAIL |
| E2.d | Preview (itálico) | clique simples → `label-name` `font-style: italic` (medido na aba inativa `package.json`); uma por grupo; duplo clique/edição promove | inexistente (todas pinadas) | FAIL |
| E2.e | **Dirty ● ↔ ✕** | `.tab.dirty` → ação vira `codicon-close-dirty` (●); hover na aba volta a `codicon-close-small`; fechar dirty → diálogo Save/Don't Save/Cancel (`04_17 §4.3`) — *medida do ● será capturada no commit correspondente* | **digitar não marca nada** (aba idêntica antes/depois da edição — medido) | **FAIL** |
| E2.f | Abas por sessão | `04_05 §2.2`: conjunto de abas **por sessão**; trocar de sessão troca as abas sem destruir | `editorTabs` do shell já são por sessão (`key={activeSession.id}`) — mas vivem no shell, fora do módulo (`attach.getTabs` = `notYet`) | PARCIAL |
| E3 | **Save atômico** | Ctrl+S → `writeFile({atomic:true})`; dirty limpa **só após** a escrita (`04_05 §2.10`); conflito externo → aviso | **Ctrl+S não faz nada** (testado: nenhuma escrita, `git status` limpo); `attach.save` = `notYet('4.7')` | **FAIL** |
| E4 | Breadcrumbs | faixa **22 px**, item 13 px `--vscode-breadcrumb-foreground`, separador `codicon-breadcrumb-separator`, ícone Seti no último item, caminho relativo à raiz | inexistentes (há só a linha "Arquivo real do disco — file:///…" + chip REAL) | FAIL |
| E5 | Toolbar direita da faixa | container 35 px, padding `0 8px 0 4px`, botões **22×22** radius 6 (Split `Ctrl+\`, More…) | 5 botões próprios do shell (⇄ ⧉ 👁 ▭ ⤢) | PARCIAL (só medir depois de E1 decidido) |
| E6 | Fonte do editor | Monaco **14 px / 19 px** | Monaco presente (14/19 a confirmar no c-E1) | a medir |
| E7 | **Maximizar sem cobrir o shell** | `04_05 §2.7`: expande **só** dentro do contêiner da sessão; Activity Bar, sidebar e statusbar visíveis; nunca `position:fixed` | `editorMaximized` do shell esconde o chat e ocupa a `desktop-surface-group` (sem `position:fixed`; sidebar de sessões e barra auxiliar continuam) — comportamento já próximo; **precisa do anexo (E1) para valer "dentro da sessão"** | PARCIAL |
| E8 | Recolher sem desmontar | fechar última aba → `display:none` no container (Regra 10 docs/18), 0 unmounts; reabrir preserva cursor/scroll/undo | fechar última aba **desmonta** o editor central (estado do Monaco perdido) | FAIL |
| E9 | Abrir a partir do Search com linha | `attach.open({uri, line, column})` (contrato já tem os campos) | Search chama `service.open` → só `uri` (D2.20) | FAIL (fecha D2.20) |

**Placar: 1 PASS · 3 PARCIAL · 8 FAIL.** O módulo tem o contrato `IEditorAttachApi` congelado desde 4.1 mas **zero implementação** (`attach.* = notYet`).

---

## 2. Decisão que bloqueia o plano — ONDE fica o anexo (precisa do usuário)

O vídeo (`editor/34`, 03:35) mostra o editor **dentro do painel direito da sessão**, ao lado da árvore, com o painel alargado (~525 px de 1568 → ~33 %) e sash entre editor e árvore. O texto de `04_05 §1` diz "à direita da árvore"; no print o editor está à **esquerda** da árvore. O shell atual tem **três** lugares possíveis:

| Opção | Onde | O que muda no shell (exceção a autorizar) | Risco |
|---|---|---|---|
| **A — igual ao vídeo** | Dentro da **barra auxiliar** (aba Files): `[editor + abas + breadcrumbs] ‖ sash 6 px ‖ [árvore]`; barra alarga automaticamente ao abrir a 1.ª aba e volta ao recolher | `AuxiliaryBar.tsx` passa a aceitar um `attachSlot` ao lado do `filesSlot` e a largura da barra passa a ser governada por `--attach-width` quando o anexo está aberto | Barra auxiliar hoje tem 340 px fixos; precisa de regra de largura (clamp 25–75 %) — é a maior mudança de layout, mas é a fiel |
| **B — nova superfície na sessão** | Entre o chat e a barra auxiliar: `[chat] ‖ [anexo: abas + editor]` e a árvore permanece na barra auxiliar | `App.tsx` monta `AttachArea` como 2.ª superfície do `PanelGroup` (onde hoje entra o editor central) | Visualmente igual ao que existe hoje (editor no centro-direita) — **não** é o vídeo |
| **C — manter o editor central** | Como está; só E2/E3/E7 no editor do shell | `EditorArea.tsx` (intocável pela regra LEGO) | Viola `04_05 §10` ("se o editor ocupa o centro, está ERRADO") |

**Recomendação da auditoria:** **Opção A** (fidelidade ao vídeo). Fronteira LEGO mantida: todo o anexo (`ui/attach/AttachArea.tsx`, `EditorTabs.tsx`, `Breadcrumbs.tsx`, `CodeEditorPane.tsx`, `core/editor/editorService.ts`) fica em `src/modules/explorer-search/`; o shell só ganha o slot `attachSlot` na `AuxiliaryBar` + variável de largura (mesmo padrão aditivo do `filesSlot`/`searchSlot`). Área central do editor do shell continua existindo para diff/browser/search-mock — **não** é removida nesta fatia.

**Perguntas objetivas para o usuário (responder antes do c1):**
1. Opção A, B ou C?
2. Se A: o editor fica à **esquerda** da árvore (como no print `editor/34`) ou à **direita** (texto `04_05`)? A auditoria segue o print.
3. Abas "Alterações" (diff) do vídeo compartilham a faixa com os arquivos? Proposta: **sim** (a aba Changes vira a 1.ª aba fixa do anexo), mas só a partir da 4.7-b; na 4.7 a faixa nasce só com arquivos.

---

## 3. Plano atômico proposto (7 commits, Loop Fechado Visual) — válido para a Opção A

Regras herdadas da 4.6: spec `e2e/sessao_14_editor_anexo.spec.ts` escrita **falhando antes** de cada commit; anti-regressão completa depois (typecheck 0 · vitest ≥312 · `sessao_12_explorer`+`sessao_13_*` 50/50 · `fs_backend` 10/10 · terminal 9/9 · `sessao_07` 5/5 · layout); print antes/depois vs 8080/vídeo em `auditoria_47/c<N>/`; rollback se qualquer teste falhar; código só em `src/modules/explorer-search/` + slot autorizado.

| # | Commit | Upstream / fonte | O que entra | Prova |
|---|---|---|---|---|
| c1 | `feat(attach-area): container + sash 6 px + largura persistida + display:none` | `04_05 §1/§3`, `04_18 4.6 itens 1–3`, docs/18 Regra 10 | `ui/attach/AttachArea.tsx` + `attach.css`: `--attach-width` clamp 280–1200 px / 25–75 %, sash 6 px `role=separator` hover `--vscode-sash-hoverBorder` após 300 ms, dblclick reset, ←→ no foco; `setVisible(false)` = `display:none` (0 unmounts); persistência `explorer-search.attach.v1` por workspace; slot `attachSlot` na `AuxiliaryBar` (exceção) | T1–T3 (largura, sash, recolher sem unmount, reload) — VAL-EXP-12/13 |
| c2 | `feat(editor-service): abas por sessão, preview/pinned, dirty, open/close/closeAll` | `04_05 §2`, `editorService`/`editorGroupModel` | `core/editor/editorService.ts` (puro): estado por `sessionId`, mesmo uri → foca, preview único que é substituído, promoção por dblclick/edição, `dirty` por aba, eventos `editor.tabOpened/closed/dirtyChanged/attachCollapsed`; `attach.open/close/closeAll/getTabs` reais | unit (≥12) + T4 (2 arquivos = 2 abas; mesmo arquivo = 1; última fecha → recolhe) |
| c3 | `feat(editor-tabs): faixa 35 px fiel + dirty ● ↔ ✕ + breadcrumbs 22 px` | medidas §1 (E2.b–E2.e, E4) | `ui/attach/EditorTabs.tsx` (aba 35 px, label 13, ícone Seti 16, close 20×20 r6, `tab-border-top-container` 1 px na ativa, itálico no preview, `codicon-close-dirty` ●, hover → ✕), `Breadcrumbs.tsx` (22 px, separador codicon, relativo à raiz) | T5–T7 + print lado a lado com Δ px |
| c4 | `feat(editor-pane): Monaco 14/19 no anexo + viewState preservado + reveal linha` | `04_18 4.7 item 10`, `attach.open({line,column})` | `ui/attach/CodeEditorPane.tsx`: um modelo por uri, `saveViewState/restoreViewState` ao trocar aba/recolher, reveal + highlight `findMatchHighlightBackground`; Search passa a chamar `attach.open` com linha (**fecha D2.20**); `explorer.fileOpened` do Explorer → `attach.open` (wiring no App **substitui** o `openEditorTab('file')` para arquivos reais — exceção a autorizar) | T8 (cursor/scroll sobrevivem a recolher/reabrir), T9 (Search → linha) |
| c5 | `feat(editor-save): Ctrl+S atômico, dirty limpa após escrita, diálogo Save/Don't Save/Cancel, conflito externo` | `04_05 §2.9/2.10`, `04_17 §4.3` | `attach.save` → `fs.writeFile({atomic:true})`; dirty só limpa após resolve; fechar dirty → diálogo (mesmo `.monaco-dialog-box` da 4.6); `fs.changed` em uri aberta e limpa → recarrega; suja → aviso | T10–T12 (disco muda; falha de escrita mantém dirty; conflito) |
| c6 | `feat(attach-maximize): maximizar dentro da sessão + empty state letterpress` | `04_05 §2.7`, `04_18 4.7 item 9`, VAL-EXP-14 | botão ⤢ do anexo expande **só** dentro do contêiner da sessão (sem `position:fixed`); Activity Bar/sidebar/statusbar visíveis; Esc/⤢ restaura; empty state 290/256 px com chips de atalho quando o anexo é aberto sem arquivo | T13 (medidas das áreas do shell com anexo maximizado), T14 (empty state) |
| c7 | `docs: 4.7 execution log` | — | 04_20 §4 placar final, docs/12, docs/11, docs/05 (D2.19 continua; D2.20 fecha), docs/16 | — |

**Fora de escopo (não entra):** split de grupos (`Ctrl+\` real), reordenar abas por drag entre grupos, Ctrl+Tab MRU, Ctrl+Shift+T, menu de contexto da aba completo (mínimo: Close / Close Others / Close All), picker dos breadcrumbs (só rótulos), aba "Alterações" dentro do anexo (4.7-b), Search Editor.

**Critério de pronto da 4.7:** placar §1 ≥ 10/12 PASS medidos no preview; print lado a lado com 35 px / 1 px topo / 22 px breadcrumbs / itálico / ● ↔ ✕ confirmados; 0 unmounts ao recolher; Ctrl+S atômico com dirty coerente; VAL-EXP-11/12/13/14; checklist humano no Windows (abrir 2 arquivos, editar, salvar, fechar dirty com diálogo, sash, reload, maximizar).

> **Atualização 2026-09-27 (decisão "Motor vs. Layout"):** o critério acima cobre o Editor Anexo (4.7-a). A **Sub-Fatia 4.7 completa** (a + b Git + c Diff) **só fecha com o 4.7-c4 Input de Commit** — DoD em `04_21 §7`.

---

## 4. Execução — placar final (2026-09-26, medido no preview 5174/5175 por Playwright)

### 4.1 Commits (todos com typecheck 0 · vitest verde · E2E anti-regressão verde antes do commit)

| # | Commit | Conteúdo | Prova (spec `e2e/sessao_14_editor_anexo.spec.ts`) | Prints |
|---|---|---|---|---|
| c1 | `db33bef` | `ui/attach/AttachArea.tsx` + `attach.css`: container à esquerda da árvore, sash 6 px `role=separator` (hover 300 ms, dblclick reset, ←/→/Home/End), `--attach-width` clamp 280–1200 px / 25–75 %, padrão 46 %, `display:none` ao recolher (0 unmounts), persistência `explorer-search.attach.v1`; slot `attachSlot` na `AuxiliaryBar.tsx` (exceção autorizada) | T1–T3 | `auditoria_47/c1/` |
| c2 | `9bbaf3e` | `core/editor/editorService.ts` (puro): abas por sessão, preview único substituível, pinned por dblclick/edição, dirty, `close` bloqueia dirty sem `force`, eventos `editor.*`; `attach.open/close/closeAll/getTabs` reais | T4 + 15 unit | — |
| c3 | `c7457f8` | `EditorTabs.tsx` (aba 35 px, padding-left 10, label 13 px, ícone Seti 16 px + 6, ✕ 20×20 r6, `tab-border-top-container` 1 px só na ativa, border-right 1 px, itálico no preview, ● ↔ ✕) + `Breadcrumbs.tsx` (22 px, itens 13 px relativos à raiz, separador codicon) | T5–T7 | `auditoria_47/c3/` |
| c4 | `aac4c8b` | `CodeEditorPane.tsx`: Monaco único 14/19 (nunca destruído ao recolher), modelo por URI, viewState por aba, reveal linha/coluna com `findMatchHighlightBackground`, Image Preview / ERROR EDITOR no anexo; Search → `attach.open({line,column})` (**fecha D2.20**); `explorer.fileOpened → attach.open` (redirecionamento mínimo no App.tsx — exceção autorizada) | T8–T10 | `auditoria_47/c4/` |
| c5 | `4906c81` | Ctrl+S → `fs.writeFile({atomic:true})` (temp + rename), dirty limpa **só após** a promise; falha mantém dirty + banner; fechar dirty → `.monaco-dialog-box` (498 px, radius 12, padding 8, botões 26 px, Enter=Salvar, Esc=Cancelar, foco em Salvar); `fs.changed` em URI aberta: limpa → recarrega em silêncio, suja → Recarregar / Manter Alterações; eco da própria escrita ignorado; **watcher `lazy-per-dir` sobrevive a pasta apagada+recriada (inode)** | T11–T13 | `auditoria_47/c5/` (ours + régua 8080 da 4.6, ver D2.25) |
| c6 | `a394f53` | ⤢ maximiza **dentro da sessão** (largura = teto do clamp; `position: relative`; z-index máx 1; coluna Files recolhe; titlebar/sidebar/chat no lugar), ⤢/Esc restaura a largura anterior, transição 200 ms só na troca, persistido (`{width, maximized}`); botão ✕ recolher; empty state letterpress 290/256 (`aria-live=polite`, chips = atalhos reais do shell) **somente** com anexo visível sem abas; eventos `editor.attachMaximized/attachRestored` | T14–T16 + 2 unit | `auditoria_47/c6/` |
| c7 | (este) | docs 04_20 §4, 12, 11, 05, 16 | — | — |

### 4.2 Placar binário final — §1 re-medido (PASS = medido no preview e coberto por spec verde)

| # | Item | Régua | Medido (5174/5175) | Veredito | Evidência |
|---|---|---|---|---|---|
| E1 | Onde o arquivo abre | dentro do painel direito da sessão, ao lado da árvore, sash entre eles (vídeo `editor/34`) | anexo em `.auxiliary-bar > .explorer-attach-area` à **esquerda** da árvore, sash 6 px `role=separator`; editor central do shell intocado | **PASS** | T1, T10 (`nada no editor central`), `auditoria_47/c4/ours_c4_full.png` |
| E2.a | Faixa de abas | 35 px, `--vscode-editorGroupHeader-tabsBackground` | 35 px | **PASS** | T5 l.197 |
| E2.b | Aba | 35 px, padding-left 10, label 13 px, ícone 16 px + padding-right 6, border-right 1 px, topo 1 px só na ativa | 35 / 10 / 13 / 16 + 6px / 1 px / 1 px só ativa | **PASS** | T5 l.203–219, print `auditoria_47/c3/` |
| E2.c | Botão fechar | 20×20, radius 6 | 20×20, `6px` | **PASS** (glifo `codicon-close` no lugar de `close-small` → D2.26) | T5 l.218–219 |
| E2.d | Preview itálico | clique simples itálico, único, dblclick/edição promove | idem | **PASS** | T6 l.243, T8 |
| E2.e | Dirty ● ↔ ✕ + diálogo | `codicon-close-dirty` ●, hover → ✕, fechar dirty → Save/Don't Save/Cancel | idem; diálogo 498/12/8/26, Enter/Esc | **PASS** | T8, T12, `auditoria_47/c5/ours_c5_save_dialog.png` |
| E2.f | Abas por sessão | conjunto por sessão, trocar sessão não destrói | `EditorService` por `sessionId`; `attach.getTabs` real | **PASS** | T4, unit `editorService.test.ts` (17) |
| E3 | Save atômico | Ctrl+S → `writeFile(atomic:true)`; dirty limpa só após a escrita; conflito externo avisa | temp `.vscode-fstmp-*` + rename, sem temp sobrando, mtime muda; falha 500 mantém dirty; externo limpo recarrega / sujo pergunta | **PASS** | T11, T13, `server/fs/fsHost.ts writeFileAtomic` |
| E4 | Breadcrumbs | 22 px, item 13 px, separador codicon, relativo à raiz | 22 px, 13 px, `\eab6`, relativo à raiz da fixture | **PASS** | T7 l.261 |
| E5 | Toolbar direita da faixa | 35 px, padding `0 8px 0 4px`, botões 22×22 r6 | `.editor-actions` 35 px, padding 0 8 0 4, ⤢ (`screen-full`/`screen-normal` 0xeb4c/0xeb4d) e ✕ 22×22 r5 (`--vscode-toolbar-hoverBackground`) | **PASS** (Split `Ctrl+\` fora de escopo → D2.24; radius 5 vs 6 → D2.26) | T14 (`aria-pressed`, classes), `auditoria_47/c6/ours_c6_header_zoom_*.png` |
| E6 | Fonte do editor | Monaco 14 px / 19 px | `14px` / `19px` | **PASS** | T8 l.307–308 |
| E7 | Maximizar sem cobrir o shell | só dentro do contêiner da sessão; Activity Bar/sidebar/statusbar visíveis; nunca `position:fixed` | 504 → 822 px (= 75 % da banda) em 1400×900; titlebar e sidebar de sessões com rects idênticos; chat visível (246 → 261 px); `position: relative`; nenhum `fixed`; z-index < 1000; restore volta a 504 | **PASS** | T14, T16, `auditoria_47/c6/ours_c6_maximized.png` |
| E8 | Recolher sem desmontar | `display:none`, 0 unmounts, cursor/scroll/undo preservados | mesmo `data-mount-id`, mesmo Monaco (`data-probe`), cursor/scroll/texto/undo iguais | **PASS** | T3, T10 |
| E9 | Abrir a partir do Search com linha | `attach.open({uri,line,column})` | match → anexo na linha exata + highlight `findMatchHighlightBackground` | **PASS** | T9 (fecha D2.20) |

**Placar final: 14/14 PASS** (o §1 listava 14 linhas; o resumo "12 itens" da auditoria contava E2.a–f como bloco). Spec: **16/16** E2E · vitest **341/341** · `sessao_12_explorer` 30/30 · `sessao_13_search` 14/14 · `sessao_13_search_backend` 6/6 · terminal `sessao_11_*` 9/9 · `sessao_07` 5/5 · `sessao_03` 5/5 — todos medidos após o c6 (`a394f53`).

### 4.3 Decisões congeladas (usuário, 2026-09-26)

1. **Opção A** — anexo dentro da barra auxiliar, à **esquerda** da árvore (print `editor/34` vence o texto de `04_05 §1`).
2. **Fechar a última aba RECOLHE o anexo** (`display:none`, árvore recupera o espaço) — comportamento canônico; recolher **não pergunta nada** (os modelos do Monaco continuam vivos; o diálogo só sai ao fechar aba suja).
3. **Empty state letterpress só aparece com o anexo visível e 0 abas** (via ⤢/✕/API `setVisible(true)`) — nunca como estado padrão pós-fechamento.
4. **Maximizar recolhe a coluna Files** enquanto maximizado (fidelidade ao layout flex do VS Code ao maximizar um grupo); restore devolve tudo. Chat/titlebar/sidebar continuam no fluxo.
5. Aba "Alterações" (diff/Git) **não** entra no anexo nesta fatia → 4.7-b (D2.22).

### 4.4 Pendências para fechar a 4.7 (fora do código)

- **Checklist humano no Windows 11** (obrigatório antes de marcar homologada): abrir 2 arquivos (2 abas, 1 preview itálico) · editar (●) · Ctrl+S (● some, disco muda) · fechar aba suja (diálogo Salvar / Não Salvar / Cancelar) · arrastar o sash · F5 preserva largura e maximizado · ⤢ maximiza sem cobrir sidebar/chat, Esc restaura · anexo visível sem abas mostra o letterpress e o chip Ctrl+Shift+F abre a busca.
- **D2.25** (print 8080 do diálogo/maximize) — ver `docs/05`.
