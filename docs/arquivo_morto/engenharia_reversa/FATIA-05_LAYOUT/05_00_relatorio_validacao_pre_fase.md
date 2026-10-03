# 05_00 — Relatório de Validação Pré-Fase (Gate 0) — FATIA-05 "Chassis-Right"

> ✅ **APROVADO em 2026-09-29.** Decisões aplicadas no `docs_24 v1.1` (`docs/24_PLANO_FATIA-05_CHASSIS_RIGHT.md`). Próximo passo: PASSO 4 (reescrever spec 15).

Status: **APROVADO (ver carimbo acima)**. Na época da escrita: Nenhuma linha de código alterada, nenhum commit, nenhum build de produção, nenhum `.env`, nenhuma tradução.

## 1. Cabeçalho

| Item | Valor |
|---|---|
| HEAD | `2eab62b` (working tree limpa exceto os untracked listados em §3.6) |
| Node / npm | v20.20.2 / 10.8.2 |
| Referência | VS Code 1.135.0 web (code-server, porta 8080, `--auth none`), tema claro padrão do user-data |
| Shell | `platform/apps/workbench-v2` (Vite/React), `npm run typecheck` = **0 erros** |
| vitest (completo) | **717 testes: 707 ✅ / 10 ❌** — 9 em `TerminalPanel.test.tsx` (pré-existentes, documentados) + 1 em `e2eAssertionContract` causado pela spec 15 untracked (ver §3.6). Sem a spec 15, o HEAD fica em 708/717 = igual ao baseline conhecido |
| E2E anti-regressão §8 (12 suítes) | **não executadas neste Gate** (exigidas por commit, não por leitura). Harness Playwright reinstalado e funcional (usado na raspagem). Fixture 5175 precisa reseed antes da 1ª rodada |
| Vídeo de referência | **indisponível no sandbox** — só transcrição. Itens só-vídeo = "não medido — validar na homologação" |

## 2. Raspagem do 8080

Documento completo: `05_01_raspagem_layout_vscode.md` + JSONs e prints em `raspagem_05_01/`. Resumo do que muda a spec:

1. **Direita medida de verdade** (print 09–11): ordem `editor · Side Bar · Activity Bar`; classes `.right`; borda e indicador trocam de lado (indicador 2 px fica na borda **externa** da tirinha, `left: 46px`); sash 4 px centrado na fronteira editor/Side Bar; terminal fica **sob o editor**, Side Bar/Activity Bar altura total.
2. Side Bar fechada **não é `display:none`** no VS Code: o part fica com w=0 (grid). Reabrir devolve a **mesma largura**. Clique no ativo fecha; o indicador de 2 px **permanece** no último ativo mesmo fechado.
3. Sash real = **4 px** (`--vscode-sash-size`), sem transição de largura (só cor 0.1 s).
4. Largura: padrão 300 (=`min(300, largura/4)`), **sem teto fixo** — máximo = tudo menos `editor.minWidth 220`; arrastar abaixo do mínimo **fecha** (snap-to-close). Duplo clique no sash volta a 300.
5. Cabeçalho da Side Bar 35 px / 11 px uppercase peso 400 / padding-left 8; ação "…" 22×22 ícone 16; seções 22 px peso 700 uppercase com `aria-expanded`.
6. Não medido (validar na homologação): painel maximizado, editor group maximizado, hover/tooltip de ícone (tooltip nativo do VS Code é custom hover — não reproduzível sem lib).

## 3. Estado do código (auditoria de `src/`)

### 3.1 Estrutura relevante
- `App.tsx` (2032 l.): `.workbench-body` → `<SessionSidebar class="sessions-sidebar">` (l.1867) → `.main-region` (l.1897) → `.right-section` → `.top-right-section` → `.main-surface` (chat/editor/terminal) ; `<AuxiliaryBar>` desktop l.2001 / mobile l.1951. Módulo montado por callback-ref: `module.mount(el)` l.145, `mountSearch` l.156, `mountAttach` l.167.
- `components/AuxiliaryBar.tsx` (433 l.): tablist `.aux-tabs` com abas `changes | files` (`hideChangesTab` → só `files`), hospeda o slot do Explorer **e** o `attachSlot` (Editor Anexo à esquerda da árvore).
- `components/SessionSidebar.tsx` (604 l., `<aside class="sessions-sidebar">`), `EditorArea.tsx` (672 l., **intocável até 5.7**), `Titlebar.tsx`, `TerminalPanel.tsx` + `components/terminal/**` (**intocáveis**).
- `domain/` (32 arquivos): `layoutController.ts`, `layoutPersistence.ts`, `agentWorkbenchLayout.ts`, `sidePane.ts`, `dockedAuxiliaryController.ts`, `sectionOrder.ts`, `dragAndDrop.ts`, `keyboardNavigation.ts`… — nenhum modela "Activity Bar/Side Bar" hoje.
- `shell/`: só `gitTransition.ts`. **Não existem** `viewRegistry.ts` nem `layoutState.ts` (gap esperado; nascem em 5.1-c3).
- `hooks/` e `providers/`: só terminal (`usePtySession`, `useXtermTerminal`, `useTerminalTheme`, `TerminalSessionProvider`) — intocáveis.
- `styles/`: `theme.css` tem `sideBar*`, `sideBarSectionHeader-*`, `sash-hoverBorder`, `focusBorder`, `badge-*`; **faltam `activityBar*` e `activityBarBadge*`** (fallback encadeado). `app.css` 4761 l. (`.main-region` flex row l.957; `.right-section` l.966; `.aux-tabs` l.1106).

### 3.2 Módulo `modules/explorer-search`
- `contract.ts`: `IExplorerSearchModule { explorer, search, attach, mount, unmount, mountSearch, unmountSearch, mountAttach, unmountAttach, onEvent, dispose }`. **Não há** noção de `container: 'left'|'right'` nem de "view" — isso é do shell (`viewRegistry`), o contrato **não precisa mudar** para 5.1 (aditivo zero).
- `index.ts` barrel exporta fábrica + `BrowserFsPort`, `ExplorerFsWatchClient`. App importa só do barrel (l.4) ✅ regra LEGO respeitada.
- `ui/explorer.css` já embute `@font-face` codicon (`./assets/codicon.ttf`) → a Activity Bar pode reusar a fonte **sem novo asset**; codepoints files U+EAF0, search U+EA6D, source-control U+EA68 (04_17).
- Alt+Z / word-wrap: **inexiste** no módulo. Menu de contexto nas abas do Anexo: **inexiste**. Breadcrumbs, fechar aba, ícones Seti: existem (bate com docs_24 §5.3). Maximize do Anexo existe (`attach.maximizedChanged`).

### 3.3 Persistência (chaves localStorage reais)
`workbench.sessions.layout.v1`, `workbench.sessions.layouts.v1`, `workbench.customView.v1`, `agents-new-session-layout`, `agents.layout.singlePaneDetailPanel`, `agents-theme`, `agente_window_terminal_height`, `agente_window_terminal_sidebar_width` (terminal — não tocar), `explorer-search.attach.v1`, `explorer-search.search.v1`, `explorer-search.viewsVisibility.v1`. **Livre para 5.1:** `workbench.layoutState.v1` (proposta; nenhuma colisão).

### 3.4 Endpoints (plugins Vite carregados no boot — mudar server exige reiniciar)
`/pty` (ptyPlugin — intocável), `/fs/{root,list,stat,read,write,createFile,mkdir,rename,copy,delete,upload,download,search,watch}`, `/git/*` (POST), `/api/ports`. Nada novo é necessário para 5.1.

### 3.5 Reutiliza / modifica / gap (5.1)
| Peça | Ação | Onde |
|---|---|---|
| `AuxiliaryBar` aba `files` + slot do módulo | **modifica**: aba `files` sai; slot do Explorer migra para a Side Bar; `attachSlot` continua na AuxiliaryBar (à direita da árvore até 5.7) | `AuxiliaryBar.tsx`, `App.tsx` (wiring) |
| `SessionSidebar` | intacto | — |
| `.main-region` | **modifica** (aditivo): recebe `SideBar` + `ActivityBar` **depois** de `.right-section` (direita) | `App.tsx` l.1897, `app.css` |
| `ActivityBar.tsx` | **gap** → novo (c1) | `components/` |
| `SideBar.tsx` | **gap** → novo (c2), com sash próprio (não reusar `SplitSash` do terminal — é intocável) | `components/` |
| `viewRegistry.ts`, `layoutState.ts` | **gap** → novos (c3) | `shell/` |
| tokens `activityBar*` | **gap** → adicionar em `theme.css` (aditivo) | `styles/` |
| Outline/Timeline | **gap** → seções vazias colapsadas dentro do container Explorer (5.1), reais só em 5.6 | `SideBar.tsx` |

### 3.6 Untracked no working tree
- `platform/apps/workbench-v2/e2e/sessao_15_activity_bar.spec.ts` — escrita para o plano **antigo (esquerda)**; nunca executada; hoje derruba `e2eAssertionContract` porque usa `test(` no nível raiz (o contrato exige 2 espaços de indentação dentro de `describe`). **Deve ser reescrita** para a direita na 5.1-c1. Não apagada (sem ordem).
- `docs/engenharia_reversa/FATIA-05_LAYOUT/` — esta pasta (Gate 0).

## 4. Confronto docs_24 × código × 8080

| # | docs_24 diz | Realidade | Ação proposta |
|---|---|---|---|
| C1 | Pasta `docs/engenharia_reversa/FATIA-05_LAYOUT/` | já existe `FATIA-05_LAYOUT_BYTE_A_BYTE/` (05_00…05_06 do plano antigo) | Manter as duas; nova é a vigente; antiga vira histórico com nota no topo (após aval) |
| C2 | Cita docs_21/22/23 | **não existem** em `docs/` | Registrar; docs_24 é autossuficiente |
| C3 | RF-02: Side Bar 280–1200 px | VS Code: **min 170**, padrão `min(300, largura/4)`, **sem máximo fixo** (= largura − editor 220). Snap-to-close abaixo do mínimo | **Decisão do usuário** (§6-a) |
| C4 | Sash 6 px | VS Code **4 px** | **Decisão do usuário** (§6-b) — 6 px é mais fácil no touch, mas foge da régua |
| C5 | Recolher = `display: visible ? 'contents' : 'none'` | VS Code esconde por grid (w=0, `display:block`). `display:contents` **anula o box do container**: `getBoundingClientRect()` do container devolve 0×0 → quebra asserções E2E de `rect` e a largura/sash precisam viver no filho | Sugerir `display: visible ? 'flex' : 'none'` (mesmo efeito de "não desmontar", box mensurável). **Decisão do usuário** (§6-c) |
| C6 | Clique no ativo fecha a Side Bar | idem no 8080; **detalhe**: indicador 2 px permanece no último ativo | Reproduzir igual |
| C7 | 3 commits em 5.1 | plano antigo tinha 4 (c4 = Outline/Timeline vazias) | Absorver Outline/Timeline no c3 (Explorer migrado) — cabe |
| C8 | `layoutState.position` desde 5.1 | não existe nada; chave livre `workbench.layoutState.v1` | ok |
| C9 | `viewRegistry.container: 'left'\|'right'` | não existe | ok; contrato do módulo **não muda** |
| C10 | UI em inglês (D3) | AuxiliaryBar tem `aria-label="Detalhes da sessão"`, dock tabs em PT | **Só o que for novo/migrado** nasce em inglês; não traduzir o resto (D3 = "não traduzir") — confirmar (§6-d) |
| C11 | Terminal intocável (D2) | Terminal está em `.main-surface` (centro); com Side Bar à direita ele fica **sob o editor** como no 8080 ✅ sem tocar | ok |
| C12 | AttachArea à direita da árvore até 5.7 | hoje o `attachSlot` está **à esquerda** da árvore dentro da AuxiliaryBar. Ao migrar a árvore para a Side Bar (direita), a AuxiliaryBar fica só com o Anexo; visualmente o Anexo passa a estar à **esquerda** da nova Side Bar | Confirmar leitura (§6-e) |
| C13 | Codicons | fonte já embarcada no módulo | reusar `@font-face` (sem novo asset) |
| C14 | `sessao_15_activity_bar.spec.ts` | desatualizada (esquerda) e fora do contrato | reescrever no c1 |
| C15 | Single Port 5174 sem .env | `vite.config.ts` já tem pty+fs plugins na mesma porta ✅ | nada a fazer |

## 5. Riscos

| Risco | Prob. | Mitigação |
|---|---|---|
| `display:contents` quebra medições E2E e sash (C5) | alta | usar `flex/none` no container (decisão) |
| Migrar o slot do Explorer muda o **pai DOM** → o callback-ref remonta o módulo (`mount/unmount`) → estado da árvore some | média | `module.mount` é idempotente por design ("estado do serviço sobrevive"); adiar `unmount` com setTimeout (lição registrada) e cobrir com E2E de expand→migrar→continua expandido |
| Testes 12/13/14 usam seletores dentro de `.auxiliary-bar` para achar a árvore | **alta** | grep antes do c3; ajustar **só seletores** nos specs (não lógica); `helpers.ts SEL` centraliza parte |
| `isSinglePane`/mobile (l.368, 1951) renderiza a AuxiliaryBar em outro lugar → Side Bar precisa de regra mobile | média | 5.1 desktop-only; mobile mantém caminho atual (sessão 06 verde é o guarda) |
| RAM 1,9 GB: 8080 + vite + Playwright juntos | média | rodar suítes em série; nunca abrir pasta no 8080 |
| Fixture `/tmp` some entre turnos | certa | reseed antes de cada rodada §8 |
| Largura 280–1200 vs régua (C3) | — | decisão |

## 6. Decisões que preciso do usuário

a) **Largura da Side Bar**: seguir a régua do VS Code (min 170, padrão `min(300, largura/4)`, máximo = largura − 220, snap-to-close) **ou** os 280–1200 fixos do docs_24?
b) **Sash**: 4 px (régua) ou 6 px (docs_24)?
c) **Recolher**: `display:contents/none` (docs_24, quebra `rect`) ou `flex/none` (mesma semântica "não desmonta", mensurável)?
d) **Inglês**: só peças novas/migradas (Activity Bar tooltips "Explorer/Search/Source Control", título "EXPLORER", seções "OUTLINE/TIMELINE") — o restante do shell fica como está?
e) **Leitura C12**: confirma que na 5.1 a AuxiliaryBar continua existindo só com o Editor Anexo, entre o centro e a nova Side Bar?
f) `sessao_15_activity_bar.spec.ts`: reescrever para direita no c1 (recomendado) ou apagar?
g) Pendências herdadas da auditoria de vídeos (V1-R1, listas de "lixo visual"/botões/abas, split editor, RF-09 maximize, Open Editors D2.9): ficam **fora** da 5.1 e entram no backlog docs/05 como itens da 5.8/FATIA seguinte?

## 7. Recomendação de escopo 5.1 (3 commits, todos com §8 verde)

- **c1 `feat(activity-bar)`**: `components/ActivityBar.tsx` + tokens `activityBar*` + montagem à direita em `.main-region` (depois de `.right-section`); 3 tabs (`ul[role=tablist] > li[role=tab][aria-selected][aria-expanded]`), 48×48, codicon 24, indicador 2 px na borda externa, badge oculto; clique alterna `layoutState.activeView`. Side Bar ainda não existe → clique só marca ativo. Spec 15 reescrita (T1).
- **c2 `feat(side-bar)`**: `components/SideBar.tsx` (título 35 px/11 px uppercase, ação "…" placeholder, sash próprio à **esquerda** do container, largura persistida em `workbench.layoutState.v1`, fechar/abrir mantendo largura, Ctrl+B), conteúdo ainda placeholder por view. Spec T2–T4.
- **c3 `feat(view-registry)`**: `shell/viewRegistry.ts` (`container: 'left'|'right'`), `shell/layoutState.ts` (`position`, `activeView`, `sideBarWidth`, `sideBarVisible`), Explorer migrado (slot do módulo dentro da view `explorer`, seções OUTLINE/TIMELINE vazias colapsadas), Search e SCM apontando para os slots já existentes, aba `files` removida da AuxiliaryBar; ajuste **só de seletores** nos specs 12/13/14 se necessário. Spec T5.
- Depois do c3: **PARAR** (docs/12, 11, 05 só após aval, conforme docs_24).

## 8. Anexos
- `05_01_raspagem_layout_vscode.md`
- `raspagem_05_01/medidas_8080.json`, `medidas_8080_direita.json`, `medidas_8080_direita_v2.json`
- `raspagem_05_01/01…11*.png` (01 inicial, 02 fechada, 03 Search, 04 SCM, 05 painel, 06/07 não-medidos, 08 menu de contexto, 09 direita, 10 direita+painel, 11 direita fechada)

---

## Estado final da FATIA-05 — ✅ 100 % homologada no Windows (2026-10-02)

5.1–5.8 homologadas (5.7 vídeo 08:37:34; 5.8 `e93031d` + `d0c2a8d` + `4ee0ed8`). Layout final em 1400 px: boot chat 768 / Side Bar 274, sem coluna Detalhes; maximizado `[lista 300][EDITOR 767][Side Bar 274][Activity Bar 48]`; F5 mantém abas. Prints de prova:

- [01_boot_chat_768_sb_274_sem_detalhes_sem_botao.png](auditoria_05/c5.8/01_boot_chat_768_sb_274_sem_detalhes_sem_botao.png)
- [02_3_abas_chat_420_anexo_341.png](auditoria_05/c5.8/02_3_abas_chat_420_anexo_341.png)
- [03_max_lista300_editor767_sb274_ab48.png](auditoria_05/c5.8/03_max_lista300_editor767_sb274_ab48.png)
- [04_f5_igual_max_767.png](auditoria_05/c5.8/04_f5_igual_max_767.png)
- [05_restaurado_420_341_274.png](auditoria_05/c5.8/05_restaurado_420_341_274.png)
- [06_x_header_maximizado_chat_768_sb_274.png](auditoria_05/c5.8/06_x_header_maximizado_chat_768_sb_274.png)

Próximo: Fatia 6 (Chat Carcaça) — aguardando autorização.
