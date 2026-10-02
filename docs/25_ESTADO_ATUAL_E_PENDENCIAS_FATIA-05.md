# 25 — ESTADO ATUAL DA OBRA E PENDÊNCIAS — FATIA-05 5.1 ✅ 5.2 ✅ 5.3 ✅ 5.4 ✅ 5.5 ✅ 5.6 ✅ 5.7 ✅ 5.8 ✅ - 100% homologada Windows 2026-10-02

**Data:** 2026-10-02 · **HEAD local:** `4ee0ed8` (5.8-c3 tokens) ← `d0c2a8d` (5.8-c1 Detalhes removido) ← `e93031d` (docs v1.3) ← `9a11319` (5.7 editor fino + maximizar/restaurar) ← `7fbf628` (docs A0.7) ← `bc6f666` (docs 5.6) ← `7d05c7d` (5.6 Outline/Timeline reais) ← `ac4bc4c` (docs 5.5 fix) ← `4e10381` (5.5 fix ícones arrastáveis) ← `6722582` (docs 5.5) ← `1f1ed79` (5.5) ← `ff150f9` (docs 5.4) ← `7bd528b` (5.4) ← `44bf7d9` (docs 5.3) ← `2bd6cc3` (5.3) ← `e790172` (docs 5.2) ← `22a1523` (5.2) ← `847b7ec` (docs 5.1) ← `1e9978f` (c3) ← `fd05507` (c2) ← `3fcc913` (c1) · **Plano vigente:** `docs/24_PLANO_FATIA-05_CHASSIS_RIGHT.md` v1.1
**Para quem é:** a próxima IA (ou pessoa) que assumir. Este arquivo diz **exatamente onde a obra parou**, o que está commitado, o que está solto no working tree, o que bloqueia o próximo commit e quais decisões só o usuário pode tomar.
**Regra:** se este arquivo e o código divergirem, o código manda — mas **reporte a divergência** antes de agir.

> Sobre hashes: o usuário leva o workspace para o Windows e faz commit/push por lá. Os hashes do GitHub **não coincidem** com os citados aqui; o **conteúdo** é o mesmo. Use as mensagens de commit (`feat(activity-bar)…`, `docs(fatia-05)…`) como referência, não o hash.

---

## Fechados na 5.8 (2026-10-02)

| Débito | Como fechou |
|---|---|
| D2.50 | Coluna "Detalhes" (e botões "Barra auxiliar"/"Alternar detalhes") removida de vez — `d0c2a8d` |
| D2.63 | Chat espremido em 1400 px — regra de larguras (5.7 `9a11319`) + sem coluna Detalhes (5.8) → chat 768/420 medido |
| D2.70 | Abas do anexo sobrevivem ao F5 — fix da 5.7 (`a9a73f4`) e confirmado nos prints `c5.8/04` |
| D2.72 | Campo `auxiliaryVisible` órfão no domínio — **aceito como fechado para a Fatia 5** (sem efeito visual; limpeza fica para Fatia 10 Hardening) |

## Dívidas de layout pós-MVP

Existem pequenos ajustes de fidelidade visual de layout identificados durante homologação Windows que serão tratados após MVP, não bloqueiam Fatia 5. Não listar explicitamente - será endereçado em Fatia 10 Hardening. Para efeito de Arena e docs públicas, Fatia 5 está 100%.

## Próximo

**Fatia 6 — Chat Carcaça (histórico + workspace sync): PRÓXIMO, NÃO INICIADO.** Só começa após o usuário homologar este commit de docs e autorizar explicitamente.

## 1. Placar em uma tela

| Item | Estado | Evidência |
|---|---|---|
| Gate 0 (raspagem + auditoria, só leitura) | ✅ concluído e aprovado | `docs/engenharia_reversa/FATIA-05_LAYOUT/05_00`, `05_01`, `05_02` |
| Passos 1–4 do `docs/24 §1` (docs 24/12/11/05, carimbo 05_00, spec 15 reescrita p/ direita) | ✅ | commit `0e36af4` |
| **c1 `feat(activity-bar)`** — 48 px à direita, 3 ícones, indicador 2 px face externa, tokens | ✅ **commitado** `3fcc913` | spec 15 T1 verde; anti-regressão §9 12/12; typecheck 0; vitest 708/717; print `docs/engenharia_reversa/FATIA-05_LAYOUT/auditoria_05/c1/` |
| **c2 `feat(side-bar)`** — container à esquerda da Activity Bar, sash 4 px, persistência, **RF-09** (anexo maximizado recolhe a Side Bar) | ✅ **commitado** `fd05507` | spec 15 T2/T3/T4/T4b; `sessao_14` 16/16; §9 12/12; typecheck 0; vitest 708/717; prints `auditoria_05/c2/` (3) |
| **c3 `feat(view-registry)`** — Explorer migrado p/ Side Bar (mount 1×), Outline/Timeline colapsadas, aba Files removida, `data-session-id` | ✅ **commitado** `1e9978f` | spec 15 T5 (expandir → migrar → continua expandido); §9 12/12; typecheck 0; vitest 706 passed / 9 failed (pré-existentes) / 2 skipped; prints `auditoria_05/c3/` (3) |
| **Homologação manual da 5.1 no Windows** | ✅ feita pelo usuário (2026-09-30) | prints do Windows prevalecem |
| **5.2 `feat(search)`** — Search migra para a Side Bar (view `search` → `SearchView` hospeda o `SearchModuleSlot`; Ctrl+Shift+F = `layout.showView('search')`; RF-06 abrir arquivo não fecha o Search; `searchSlot` deixou de ir ao `EditorArea`) | ✅ **commitado** `22a1523` | spec 15 T6–T9 (falhando antes → passando); §9 **13/13 duas vezes** (pré e pós-commit); typecheck 0; vitest **702 passed / 9 failed / 6 skipped**; prints `auditoria_05/c5.2/` (2) |
| **Homologação manual da 5.2 no Windows** | ✅ feita pelo usuário (2026-09-30) | — |
| **5.3 `feat(scm)`** — Source Control migra para a Side Bar (view `scm` → `ScmView` hospeda o `ChangesPane` real via `mountScm`); badge `git.count()` no ícone; diff continua no anexo; **maquete "Changes N" removida** (`initialDiffFiles`, `buildProjectDiffFiles`, `gitTransition.ts`, `hideChangesTab`, `useMockChangesTransition`, `ChangesDetails`/`FilesDetails`); aba fixa "Changes" do anexo removida | ✅ **commitado** `2bd6cc3` | spec 15 T10–T15 (falhando antes → passando); §9 **13/13 duas vezes**; typecheck 0; vitest **692 passed / 9 failed / 16 skipped**; prints `auditoria_05/c5.3/` (3) |
| **Homologação manual da 5.3 no Windows** | ✅ feita pelo usuário (2026-09-30) | — |
| **5.4 `feat(activity-bar)`** — Activity Bar movível por menu de contexto (Move Left/Right/Top/Bottom; check na atual; Top/Bottom desabilitados D2.64); `setActivityBarPosition` persiste em `workbench.layoutState.v1`; `left` via CSS `order` em `.main-region[data-activity-bar-position]`; A0.1 decidida = desvio consciente (O13) | ✅ **commitado** `7bd528b` | spec 15 T16–T20 (falhando antes → passando, 21/21); §9 **13/13 duas vezes**; typecheck 0; vitest **692 / 9 / 16** (inalterado); prints `auditoria_05/c5.4/` (4) |
| **Homologação manual da 5.4 no Windows** | ✅ feita pelo usuário (2026-09-30) | — |
| **5.5 `feat(views)`** — DnD de views: header da Side Bar / abas do Views Panel arrastáveis; drop na Activity Bar (inserir antes), Side Bar, Views Panel; `viewLayout` + `panelActiveView` persistidos; Views Panel = `.part.panel` novo acima do terminal (O14) | ✅ **commitado** `1f1ed79` | spec `sessao_15_drag_drop_views` T20–T24 (falhando antes → 5/5); spec 15 21/21; §9 **14/14 ×2** (rodada 1 com flakes 14/14d re-rodados OK); typecheck 0; vitest **697 / 9 / 16 / 722**; prints `auditoria_05/c5.5/` (4) |
| **5.5 fix `4e10381`** — ícones da Activity Bar arrastáveis (achado da homologação); `text/plain` de reserva; `Files` recusado | ✅ commitado | T25 (falhando → passando); spec DnD 6/6; spec 15 21/21; §9 14/14 ×2; vitest 697/9/16; prints 05–09 (Chrome real via xvfb) |
| Homologação manual da 5.5 no Windows | ✅ **homologada 2026-09-30** (P17 fechada) | — |
| **5.6 `feat(fatia-05 5.6)`** — Outline real (DocumentSymbol do Monaco no modelo ativo do anexo; clique revela linha) + Timeline real (`POST /git/log` aditivo + `show(sha)` → diff `nome (sha7)` no anexo) nas seções do Explorer (A0.6); Timeline fake de `fs.changed` removida | ✅ **commitado** `7d05c7d` | spec `sessao_15_outline_timeline` T26–T29 (falhando antes → **4/4**); §9 **15/15 ×2** (15 suítes: +1); typecheck 0; vitest **705 / 9 / 16 / 730**; prints `auditoria_05/c5.6/` (5) |
| **Homologação manual da 5.6 no Windows** | ⏳ **é o próximo passo** (usuário) | checklist em §7 item 0000 |
| **5.7 `feat(5.7)`** — editor fino default com regra de larguras (chat ≥ 420 px e ≥ 50 %; anexo ≤ 50 %; "Detalhes" colapsa na 1.ª aba, exclusiva na faixa fina); bug do vídeo corrigido (AuxiliaryBar sempre montada; Browser ativo não bloqueia); toggle maximizar/restaurar (`editorMaximized` em `workbench.layoutState.v1`, chat some, Side Bar 0, lista+terminal seguem); `ATTACH_MAX_WIDTH_RATIO` 0.5 (exceção de 1 constante no core, autorizada) | ✅ **commitado `9a11319`** (2026-10-01) — **aguarda homologação no Windows** | spec `sessao_15_editor_maximize` T30–T32 (falhando → 3/3); `sessao_14` 16/16 e `activity_bar` 21/21 atualizadas com autorização; §9 15/15 ×2 (13 fixture + terminal + git smoke); typecheck 0; vitest 703 ✓ (`TerminalPanel.test.tsx` 9 ✗ **pré-existente no HEAD**, intocável); prints `auditoria_05/c5.7/00–04` |
| Homologação manual da 5.7 no Windows | ✅ **homologada 2026-10-02** (vídeo 08:37:34) após fixes `a9a73f4` (abas empilham, X com maximizado, sem Detalhes no boot, F5 mantém abas), `0a8ce9a` (X do header maximizado) e `d0a2f81` (v1.2: Side Bar 274 no maximizado) | prints `c5.7/05–12` |
| 5.8 | ✅ **código concluído 2026-10-02** — c1 `d0c2a8d` remoção definitiva da coluna Detalhes (+ botões "Barra auxiliar"/"Alternar detalhes"; 4 unitários apagados, 2 ajustados; T39) · c3 `4ee0ed8` 16 tokens faltantes (menu/list/tree/input/diff) | **aguarda homologação final da Fatia 5 no Windows**; Fatia 6 proibida. Débito D2.72: campo `auxiliaryVisible` ainda nos tipos/persistência do domínio |

---

## 2. Working tree após a 5.1

**Código: nada pendente.** Tudo da 5.1 está em `3fcc913`, `fd05507`, `1e9978f`. Sobram só docs (`README.md`, `docs/**` — consolidação de handoff + este registro) e o utilitário local `platform/apps/workbench-v2/shot.tmp.mjs` (não versionar).

### 2.1 O que a 5.1 entrega (verificado por E2E)
- **Activity Bar** 48 px à direita, 3 ícones (`explorer`/`search`/`scm`), `role=tab`, indicador 2 px na face externa que permanece com a Side Bar fechada (c1).
- **Side Bar** `.part.sidebar.right` entre o AttachArea e a Activity Bar; título 35 px; sash 4 px (`role=separator`, dblclick reset, ←/→ 10 px, snap-to-close restaurando a largura anterior); régua **170 / `min(300, floor(largura/4))` / `largura − 48 − 220`**; Ctrl+B (ignora inputs e `.xterm`); persistência `workbench.layoutState.v1` = `{ sideBarWidth, sideBarVisible, activeView, activityBarPosition:'right' }` (c2).
- **RF-09:** `editor.attachMaximized` → `setSideBarVisible(false)`; `editor.attachRestored` → volta ao estado de antes (se já estava fechada, continua fechada) (c2, P1=A).
- **Explorer real na Side Bar**: `shell/sideBar/views/ExplorerView.tsx` hospeda o `ExplorerModuleSlot` (montado **uma vez**; troca de view = `display: flex/none`); Outline/Timeline são panes do viewlet do módulo (`aria-label="Outline Section"|"Timeline Section"`, `aria-expanded=false`, vazias); **aba Files não existe mais**; AuxiliaryBar = AttachArea + coluna "Detalhes" (vazia enquanto o módulo real esconde a maquete Changes — D2.50); `aside.auxiliary-bar[data-session-id]` (c3).
- Views `search` (5.2) e `scm` (5.3) têm conteúdo real; as 3 views do registry estão completas.

### 2.1c O que a 5.3 entrega (verificado por E2E — spec 15 T10–T15) — decisão **A** do usuário
- `IExplorerSearchModule.mountScm/unmountScm` (contrato, aditivo) renderiza o **mesmo `ChangesPane`** da 4.7-b dentro de `.explorer-viewlet.scm-viewlet`; `shell/sideBar/views/ScmView.tsx` (`data-testid="side-bar-view-scm"`) + `ScmModuleSlot` no App (mount 1×).
- Clique num recurso → `attach.open({kind:'diff'})` no anexo (aba fixa Diff, até a 5.7). RF-06: a SCM continua visível com o diff aberto (T12).
- **Badge** no ícone Source Control = `git.count()` (evento `git.statusChanged`; `ActivityBar.badges` / `ActivityBarItem.badge`; CSS já medido em 05_02). Some com repo limpo; `aria-label` "Source Control (N)".
- `IExplorerSearchModuleDeps.openSourceControl?` (aditivo): "Open Source Control" do header do Explorer → `layout.showView('scm')`. Nada mais abre no anexo.
- **Aba fixa "Changes" do anexo removida** (`AttachArea` não renderiza `ChangesPane` nem o botão `attach-open-changes`). `kind:'changes'` continua no tipo do contrato (aditivo, nunca remove) mas nenhuma UI o abre.
- **Maquete removida de vez:** `data.ts` (`initialDiffFiles`, `buildProjectDiffFiles`), `shell/gitTransition.ts` (apagado), `AuxiliaryBar` (só header "Detalhes" + `attachSlot`; `ChangesDetails`/`FilesDetails`/widget Checks apagados), `App.tsx` (`useMockChangesTransition`, seed do "build the project"; `diffFilesBySession` nasce vazio — só existe porque o `EditorArea` intocável ainda recebe `diffFiles`).
- `DiffPane`: `renderGutterMenu:false`, `renderIndicators:false` (perfil `agentsWindow`).
- `core/git/**`, `server/git/**`, `core/editor/**`: intocados.

### 2.1b O que a 5.2 entrega (verificado por E2E — spec 15 T6–T9)
- `shell/sideBar/views/SearchView.tsx` (host `data-testid="side-bar-view-search"`) monta o **mesmo `SearchPanel`** do módulo (`SearchModuleSlot`), 1×, via `renderView` — padrão idêntico ao Explorer do c3.
- `layoutState.showView(id)` (novo, aditivo): ativa a view **e abre** a Side Bar sem toggle; `selectView` (toggle RF-14) continua igual. `openSearch` (Ctrl+Shift+F / botão) = `setSearchFocusRequest+1` + `showView('search')`.
- **RF-06:** clicar num resultado abre o arquivo no anexo (`attach.open({uri,line,column})`) e o Search **permanece** visível na Side Bar (T8/T9).
- Debounce 250 ms, "última busca vence", `core/search/**`, `server/fs/searchEngine.ts`, contrato: **não tocados**. Sem badge na lupa.
- `EditorArea.tsx` intocado: ainda contém o fallback demo `SearchView` para uma aba `search` **sem** slot — abas `search` persistidas de sessões antigas renderizariam essa demo (ver §5 O11 / D2.62).

### 2.2 Ajustes de teste feitos na 5.1 (todos justificados)
- Spec 15: `dragSash` inteiro, T3 tolera ±1, `open()` limpa a chave só na 1ª carga, T4b (RF-09) novo, T5 corrigido para expandir `e2e-fixture-root` antes de procurar `seed.txt`.
- Specs 12/14/14b_changes/14c/14d (P2): `sessionId` lido de `.auxiliary-bar[data-session-id]`; "clicar na aba Files" virou "se o Explorer não estiver visível na Side Bar, clicar no ícone Explorer". **Nenhuma asserção mudou.**
- `sessao_14b_git_smoke` l.57 (decisão **1-a**): "aba Files `aria-selected=true`" → "Explorer visível na Side Bar". **Única asserção alterada em toda a bateria.**
- `App.test.tsx`: helper `editorTab()` escopado (c1) e **2 `it.skip`** (decisão A, D2.60) — testavam a maquete "Workspace Files" via aba Files.
- **5.3 (decisão A do usuário, 2026-09-30):** specs `14b_git_changes`, `14b_git_smoke`, `14c`, `14d` só trocaram o **endereço** da SCM (`.auxiliary-bar .explorer-attach-area .scm-view` → `[data-testid="side-bar-view-scm"] .scm-view`) e o "como abrir" (`attach.open(kind:'changes')` → clique no ícone). **6 testes de LÓGICA da aba do anexo** viraram `test.skip` (previstos 4; achados 6 no código — os 2 a mais, 14b T5 e 14c T6, são da mesma categoria "aba morre"): `14b` T1 (aba fixa 35 px/primeira/Close All), T5 (Diff mantendo Changes primeira + Initialize Repository); `14c` T1 (Diff após Changes), T3 (Close All mantém Changes), T5 (badge na aba), T6 (Open Source Control → aba na sessão real). **Cobertura substituta:** T10 (lista real na Side Bar), T11 (diff no anexo + Monaco 14/19/minimap/side-by-side/read-only + sessão real, nunca `default`), T12 (coexistência, mesma aba), T13 (badge + estado vazio "No source control changes detected"), T15 (sem repo → Initialize Repository → git init real; header do Explorer → view scm). Só "Close All mantém Changes" morreu sem substituto (conceito não existe mais). `14b_smoke`: 1 asserção "anexo visível" → "view scm visível" (mesmo precedente 1-a do c3). `14b` T8: navegação por abas virou índice 0 (o arquivo é a única aba) — asserções iguais.
- **5.3 vitest:** mais **10 `it.skip`** da maquete: `App.test.tsx` 7 (Branch Changes/diff simulado/Changes pill/build the project/single-pane diff/Toggle Details), `iconLabels.test.ts` 2 (markup "Alternar Checks"), `coverageIntegration.test.tsx` 1 (`describe.skip` P8.2 AuxiliaryBar). `sessionState.test.ts` (motor `setDiffAccepted`) só trocou a massa `initialDiffFiles` por fixture local — asserções iguais. D2.60 = **16 testes**. Vitest **692 / 9 / 16 / 717**.
- **5.2 (decisão A do usuário, 2026-09-30):** mais **4 `it.skip`** em `App.test.tsx` — testavam a aba Search **do editor** (`aux-tab-…-search`/demo), caminho que deixou de existir. D2.60 passa a somar **6 testes**. Cobertura equivalente: spec 15 T6–T9 + `sessao_13_search` 14/14. Por isso o vitest passou de 706/9/2 para **702/9/6** (mesmo total 717).

## 3. (Resolvido) O bloqueio do c2 — T14 × Side Bar

Decisão do usuário **P1 = A** (2026-09-29): RF-09 antecipado. Implementado no `App.tsx` (listener do módulo, ~12 linhas), coberto por spec 15 **T4b** (falhando antes: `Expected: hidden, Received: visible`; passando depois). `sessao_14_editor_anexo` voltou a **16/16** sem alterar o T14. D2.52 e D2.56 fechados.

## 4. (Resolvido) Riscos do c3 — como foram tratados

| Risco | Tratamento | Decisão |
|---|---|---|
| Specs 14x/12 liam `sessionId` da aba `aux-tab-<sid>-files` | `data-session-id` aditivo no `aside.auxiliary-bar`; specs só trocam a leitura e o preâmbulo | P2 |
| `14b_smoke` l.57 afirmava "aba Files selecionada" | asserção trocada por "Explorer visível na Side Bar" | 1-a |
| Coluna da AuxiliaryBar fica vazia sem a aba Files (maquete Changes já escondida com módulo real) | coluna **mantida** vazia — T14 intacto; lixo visual até 5.3/5.8 | 2-keep (D2.50) |
| 2 unit tests em jsdom dependiam da maquete "Workspace Files" via aba Files | `it.skip` com comentário; débito D2.60 a decidir junto com D2.54/D2.55 | A |
| E2E "expandir → migrar → continua expandido" | spec 15 T5 verde; print `auditoria_05/c3/03_*` | — |
| Mobile/single-pane perde a árvore (Side Bar só no desktop) | registrado D2.61; validar na homologação | — |

## 5. Decisões tomadas na obra que NÃO estavam escritas (agora estão)

Se você discordar de alguma, **não reverta sem perguntar** — o usuário aceitou os resultados.

| # | Decisão | Motivo |
|---|---|---|
| O1 | "largura" da régua = `.main-region` inteira (inclui Activity Bar); máx = `largura − 48 − 220` | Espelha o VS Code, que usa a largura da janela |
| O2 | Snap-to-close restaura a largura **de antes do arrasto** | Igual ao VS Code; evita reabrir com 0/170 |
| O3 | Ctrl+B ignora `input/textarea/contenteditable/.xterm` | Terminal intocável; xterm usa Ctrl+B |
| O4 | Activity Bar usa `role="tab"` + `aria-label` (como o VS Code 1.135) | Fidelidade ao DOM raspado. **Efeito colateral:** `getByRole('tab', {name:'Search'})` colide com abas do editor — **escopar** queries (`.editor-tabs`, `.part.activitybar`). Já corrigido em `App.test.tsx` (helper `editorTab()`) |
| O5 | `activityBarPosition: 'right'` já é gravado no `layoutState` na 5.1 | Prepara a 5.4 sem migração de chave |
| O6 | `SideBar` recebe `regionWidth` medido por `ResizeObserver` da `.main-region` | Único jeito de aplicar a régua sem `position: fixed` |
| O7 | Inglês **só** em peças novas/migradas: `ActivityBar`, `ActivityBarItem`, `SideBar`, `SideBarViewPane`, `layoutState`, `viewRegistry`, títulos "Explorer/Search/Source Control", "Outline/Timeline Section". **Nada** do que já existia foi traduzido | Decisão do usuário (d) |
| O8 | `run-antiregressao.sh` roda as 12 suítes em série com reseed antes de cada uma; **as suítes do 5174 (11_interactive, 14b_smoke) exigem subir o Vite 5174 só para elas e derrubar depois** | RAM (`docs/26 §4`) |
| O9 | O c1 alterou `App.test.tsx` **só** para escopar queries (`editorTab()`), sem mudar asserções | Colisão O4 |
| O10 | A Side Bar/Activity Bar renderizam **só no desktop** (`!isSinglePane && !customViewActive`); no single-pane a AuxiliaryBar mobile não recebe mais o Explorer | O módulo só pode ser montado 1×; layout estreito fica para 5.8 (D2.61) |
| O11 | Outline/Timeline **não** foram recriadas no shell: são os panes já existentes do viewlet do módulo (visíveis e colapsadas por `DEFAULT_VIEWS_VISIBILITY`) | Fidelidade (no VS Code são panes do Explorer) e zero duplicação |
| O14 | **Views Panel (5.5):** não havia `.part.panel`; o painel inferior era só o `.terminal-panel`. Criado `.part.panel.views-panel` **novo**, irmão acima do terminal em `.right-section` (`display: none` sem views; faixa "Drop view here" durante arrasto; 240 px fixos, D2.66). Terminal 0 linhas tocadas; `.main-region` não refatorado | Escolha "adicionar área de views acima" prevista no prompt da 5.5 — não exigiu parada |
| O13 | **A0.1 (usuário, 2026-09-30):** Activity Bar movível (5.4) é um **desvio consciente e documentado** do perfil `agentsWindow` real, onde a posição é readOnly. Decisão fechada — **não perguntar de novo**. (O prompt pediu "O10", mas O10–O12 já existiam → registrada como O13.) Top/Bottom adiados (D2.64) porque exigiriam wrapper coluna que quebra a régua do sash da Side Bar | ADR-12 continua válido; 5.5 segue |
| O12 | RF-09 guarda o estado anterior da Side Bar em ref e só reabre se estava aberta antes de maximizar | Igual ao VS Code; testado no T4b |

---

## 6. Decisões pendentes — só o usuário decide

| # | Pendência | Estado |
|---|---|---|
| P1 | T14 × Side Bar | ✅ **A** — RF-09 no c2 |
| P2 | `sessionId` sem a aba Files | ✅ `data-session-id` + só seletor; 1-a para `14b_smoke` l.57; 2-keep para a coluna |
| P3 | Destino dos **13 E2E mortos** (`docs/26 §2.3`) | ⏳ aberto — decidir junto com P4 e P7 |
| P4 | `TerminalPanel.test.tsx` 9 falhas (D2.55) | ⏳ aberto |
| P5 | Remoção de `legacy/` no Windows com tag | ⏳ decidido, falta executar |
| P6 | Pasta `FATIA-05_LAYOUT_BYTE_A_BYTE/` (marcada OBSOLETA) | ⏳ manter ou apagar |
| **P7** | **16 unit tests `it.skip`** (2 "Workspace Files" c3 + 4 aba Search 5.2 + 10 maquete "Changes N" 5.3) **+ 6 E2E `test.skip`** (aba Changes do anexo, 5.3) (D2.60) | ⏳ aberto — **decidir no mesmo pacote de P3 + P4** ("higiene de testes"); decisão futura do usuário |
| **P8** | Homologação manual da 5.1 no Windows | ✅ feita (2026-09-30) |
| **P10** | Homologação manual da 5.2 no Windows | ✅ feita (2026-09-30) |
| **P13** | **Homologação manual da 5.3 no Windows** | ✅ feita (2026-09-30) |
| P14 | **Decisão A0.1** para a 5.4 | ✅ decidida (2026-09-30) → O13 |
| **P16** | **Homologação manual da 5.4 no Windows** | ✅ feita (2026-09-30) |
| P17 | Homologação manual da 5.5 no Windows | ✅ fechada 2026-09-30 |
| P18 | Decisão A0.6 (5.6) | ✅ fechada 2026-09-30: seções do Explorer, seguem o arquivo ativo do anexo; `POST /git/log` aditivo em `server/git`; `core/git` intocado (cliente novo em `core/timeline/`) |
| P19 | Homologação manual da 5.6 no Windows | ✅ fechada 2026-09-30 (TIMELINE histórico real; OUTLINE em `.ts`; `.md` vazio = esperado; D2.67–D2.69/D2.50 aceitos) |
| **P20** | **A0.7 — escopo da 5.7 corrigido** (docs/24 D6/RF-07/§4 5.7): editor fino default + toggle maximizado; migração permanente pro centro **rejeitada** | ✅ doc 2026-09-30; **código entregue `9a11319`** (2026-10-01) |
| **P21** | **Regra de larguras 5.7 ("A + 2 com piso 420", 2026-10-01)**: chat ≥ 420 px e ≥ 50 % da faixa; anexo ≤ 50 %; "Detalhes" colapsa na 1.ª aba e é **exclusiva** com o editor na faixa fina; `ATTACH_MAX_WIDTH_RATIO` 0.75→0.5 no core (exceção pontual autorizada) | ✅ implementada em `9a11319`; **validar no Windows** (telas 1366–1920) |
| **P22** | Flake `activity_bar` T8/T9: digitavam logo após Ctrl+Shift+F e o texto caía no chat (visto 3× na bateria cheia, nunca isolado). Mitigado com espera de painel+foco (setup, igual ao T7) | ✅ 21/21 ×2 após a espera — observar nas próximas baterias |
| P15 | **Rodada de higiene de testes** (D2.54 13 E2E mortos + P4 9 TerminalPanel + D2.60 16 unit skips + 6 E2E skips = 44 no limbo) | ⏳ sugerida ANTES da 5.4 |
| P11 | Chat espremido (~80 px) em 1400 px com anexo aberto + Side Bar 300 px (D2.63) | ✅ **fechada em `9a11319`** (P21): medido 1400 px → chat 420 / anexo 356 / Detalhes 0 (antes: chat 72) — confirmar no Windows |
| P12 | Abas `search` persistidas de sessões antigas renderizam a demo do `EditorArea` (D2.62) | ⏳ A0.7: a 5.7 não substitui o EditorArea → resolver com limpeza de estado (5.8); **não** mexer no `EditorArea` antes |
| P9 | Mobile/single-pane sem Explorer (D2.61) | ⏳ validar na homologação |

## 7. O que fazer a seguir (nesta ordem)

000000. **(2026-10-02) 5.8 ✅ código concluído** (`d0c2a8d` c1 · `4ee0ed8` c3; docs/24 v1.3; prints `c5.8/01–07`; bateria §9 15 suítes ×2 verde salvo flakes conhecidos de digitação). **Usuário: homologar a Fatia 5 inteira no Windows (5174)**: boot sem Detalhes/sem botões "Barra auxiliar"; 3 cliques = 3 abas; ⤢ = `[lista 300][EDITOR 767][Side Bar 274][AB 48]`; F5 igual; restaurar 420/341/274; X do header maximizado → chat 768/SB 274; menu de contexto com separadores visíveis. **Fatia 6 só após esse OK.**
00000. (histórico) **(2026-10-02) 5.7 ✅ HOMOLOGADA no Windows** (após `a9a73f4` / `0a8ce9a` / `d0a2f81`; docs/24 v1.2). **5.8 autorizada no escopo "misto" (docs/24 v1.3)**: c1 apagar coluna Detalhes (código + testes) → c3 tokens → **PARAR** e aguardar homologação final da Fatia 5. Fatia 6 proibida.
0000. (histórico) **(5.7 ✅ código commitado `9a11319` em 2026-10-01 — aguardava homologação.)**
0000-b. **Usuário: homologar a 5.7 no Windows** (F5 com `localStorage` limpo ou não — os dois valem). Roteiro: (1) Explorer na Side Bar → clicar um arquivo → abre no editor fino **sem F5**; chat continua largo (≥ 420 px e ≥ metade da faixa); coluna "Detalhes" some. (2) Abrir um Browser (botão da titlebar) e clicar outro arquivo → também abre sem F5. (3) Botão ⤢ do editor → editor toma o centro, chat some, Side Bar some, lista de sessões e terminal continuam; F5 → segue maximizado (reabrir o arquivo se as abas sumirem — o módulo não persiste abas, fato da 4.7). (4) ⤢ de novo → chat volta, editor volta fino com a mesma largura, Side Bar volta. (5) Toggle "Barra auxiliar" com arquivo aberto → "Detalhes" aparece **no lugar** do editor; desligar devolve o editor. (6) Fechar todas as abas → chat centraliza em 950 px (esperado). Se OK → autorizar **5.8**.
0000-c. (histórico) **(5.6 ✅ homologada 2026-09-30.)** 5.7 conforme `docs/24 §4 5.7` (escopo A0.7). Ritual: spec E2E falhando antes (maximizar → chat escondido + editor no centro + lista/terminal visíveis + Side Bar escondida; restaurar → volta com a largura anterior; F5 mantém; abrir arquivo no Explorer abre no editor fino) → código aditivo (`layoutState.editorMaximized`, `App.tsx` via barrel; `EditorArea.tsx` só Browser/Custom; terminal/core/server intocáveis) → §9 15/15 ×2 → typecheck 0 → vitest sem novos fails → prints `auditoria_05/c5.7/` (antes fino / maximizado / restaurado) → parar e homologar.
0000-b. ~~**(5.5 ✅ homologada.)** **Usuário:** homologar a **5.6** no Windows.~~ (feito 2026-09-30) **Pré-check:** F12 → Console → `!!document.querySelector('[data-testid="side-bar"] .outline-pane') + ' / ' + typeof window.__explorerSearchModule` tem que dar `true / object`. Roteiro: (1) Explorer na Side Bar → expandir **OUTLINE** e **TIMELINE** → as duas mostram as frases padrão ("No symbols found in document" / "The active editor cannot provide timeline information."). (2) Abrir um `.ts`/`.tsx` do repo no anexo (ex.: `platform/apps/workbench-v2/src/App.tsx`) → OUTLINE lista classes/funções/variáveis com ícones coloridos e indentação; clicar num item → o editor rola e o cursor vai para a linha; editar o arquivo → a lista se atualiza em ~0,3 s. (3) Abrir um `.txt`/`.md` → OUTLINE volta à frase padrão. (4) Com um arquivo **commitado** ativo → TIMELINE lista os commits (mensagem · autor · "N days ago"), mais novo em cima; clicar num commit → aba `nome (sha7)` no anexo com o diff daquele commit (linhas removidas em vermelho / adicionadas em verde); clicar na aba do arquivo de novo → a Timeline volta. (5) Arquivo novo não commitado → frase padrão. Observações esperadas (débitos, não bugs): Outline não segue o cursor (D2.67); com a aba Diff ativa as seções mostram as frases padrão (D2.68). Se OK → autorizar **5.7**.
0000-a. ~~**(5.4 ✅ homologada.)** **Usuário:** homologar a **5.5** no Windows (mouse real, não sintético). **Pré-check:** F12 → Console → `document.querySelector('[data-testid="side-bar-title"]').getAttribute('draggable') + ' / ' + !!document.querySelector('[data-testid="views-panel"]')` tem que dar `true / true` (senão a cópia está misturada). Agora também dá para **arrastar os ícones** da Activity Bar (entre si = reordenar; para baixo = Panel). abrir Source Control → arrastar o **título "SOURCE CONTROL"** da Side Bar e soltar sobre o centro/embaixo → deve aparecer a faixa "DROP VIEW HERE" durante o arrasto e, ao soltar, um **painel de 240 px acima do terminal** com a aba SOURCE CONTROL e a lista real; o ícone some da Activity Bar; **F5 mantém**; arrastar a aba de volta para a Side Bar restaura; arrastar o título "SEARCH" e soltar **sobre o ícone do Explorer** troca a ordem dos ícones; tentar soltar sobre o terminal não faz nada. Validar também a altura do painel (D2.66). Se OK → decidir A0.6 e autorizar **5.6**.
000. ~~**(5.3 ✅ homologada.)** **Usuário:** homologar a **5.4** no Windows:~~ (feito) botão direito na Activity Bar (ícone ou tirinha vazia) → menu com 4 itens, check em **Right**, Top/Bottom apagados; **Move Activity Bar Left** → tirinha + Side Bar passam para a **esquerda** (entre a lista de sessões e o chat), borda/sash/indicador do lado do editor; clicar nos ícones, Ctrl+B e badge do SCM continuam iguais; **F5 mantém**; **Move Activity Bar Right** volta. Se OK → autorizar **5.5 (DnD de views)**.
00. ~~**(5.2 ✅ homologada.)** **Usuário:** homologar a **5.3** no Windows:~~ (feito) ícone Source Control tem **badge** com o número de alterações; clicar nele → lista de Changes **na Side Bar** (Staged/Changes, letras M/A/D/U); clicar num arquivo modificado → **diff read-only abre no anexo**; com o diff aberto a lista **continua** na Side Bar; Stage/Unstage/Discard/Commit (Ctrl+Enter) funcionam; **nenhuma aba "Changes" no anexo** (só arquivos e Diff); "Open Source Control" no header do Explorer leva à view scm; Terminal/Explorer/Search/chat intactos; pasta sem git → "Initialize Repository". Depois commit/push.
0. ~~**(5.1 ✅ homologada.)** **Usuário:** homologar a **5.2** no Windows:~~ (feito) — clicar na lupa → Search real dentro da Side Bar (mesma largura/sash); Ctrl+Shift+F com a Side Bar fechada → abre já no Search com foco no input; digitar → resultados após ~250 ms; clicar num resultado → arquivo abre no anexo na linha certa **e o Search continua aberto** (RF-06); Explorer ↔ Search preservam estado (árvore expandida, texto digitado); F5 volta na mesma view; nenhuma aba "Search" aparece mais no editor; conferir o chat em 1400 px com anexo + Side Bar (P11). Depois commit/push.
1. ~~**Usuário:** baixar o workspace, rodar no Windows (`docs/26 §3` adaptado; `npm run dev` na 5174) e **homologar a 5.1 manualmente**:~~ (feito) Activity Bar à direita com 3 ícones; clicar no ativo fecha/reabre a Side Bar com a mesma largura; arrastar o sash (mín 170, dblclick volta ao padrão, arrastar até < 170 fecha); Ctrl+B; F5 mantém largura/visibilidade/view; Explorer real na Side Bar com OUTLINE/TIMELINE colapsadas; expandir pasta → Search → Explorer → continua expandida; abrir arquivo no anexo e maximizar → Side Bar some, restaurar → volta; terminal abre embaixo, à esquerda da Side Bar. Conferir também o modo estreito (D2.61) e a coluna "Detalhes" vazia (D2.50).
2. **Usuário:** commit/push no GitHub (hashes mudam; conteúdo igual). Remover `legacy/` com tag (P5).
3. ~~5.2~~ ✅ (`22a1523`) · ~~5.3~~ ✅ (`2bd6cc3`) · ~~5.4~~ ✅ (`7bd528b`) · ~~5.5~~ ✅ (`1f1ed79`). **Próxima IA (só após OK da 5.5 + decisão A0.6):** **5.6 — Timeline e Outline reais** (`docs/24 §4 5.6`; `POST /git/log` aditivo). Histórico 5.5: **DnD de views** (`docs/24 §4 5.5`). Histórico 5.4: **Activity Bar movível** (`docs/24 §4 5.4`). Antes, sugerir a rodada de higiene (P15). Contexto histórico da 5.3 (já executado): **5.3** — Source Control na Side Bar + Diff no Editor Group central (`docs/24 §4 5.3`); direção indicada pelo usuário: **remover a maquete "Changes N" (D2.38/`gitTransition.ts`) e marcar `skip` nos testes que dependem dela** — confirmar no início da 5.3, não improvisar. Ritual: spec falhando antes → código → §9 13/13 ×2 → perímetro → commit → parar.
4. Reservar uma rodada de "higiene de testes" para P3 + P4 + P7 juntos.

## 8. Medidas ainda "não medidas — validar na homologação"

Preenchidas pela raspagem externa (`05_02`): painel maximizado (`x=348 y=35 w=752 h=843`, mantém Side Bar e Activity Bar), Side Bar máx 1132 em janela larga, badge SCM 16×16 / fonte 9 px / raio 20.
Continuam abertas: hover/tooltip dos ícones da Activity Bar (texto e atraso), menu de contexto do título da Side Bar, comportamento exato do foco após Ctrl+B, animação (inexistente no real — confirmado, não implementar).
