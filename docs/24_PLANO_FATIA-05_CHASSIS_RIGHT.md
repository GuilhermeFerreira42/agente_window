# docs_24 — FATIA-05 — Especificação Final (Chassis-Right)

**Codinome:** Chassis-Right
**Versão:** 1.1 (decisões do Gate 0 aplicadas em 2026-09-29)
**Data original:** 2026-09-28
**Status:** PLANO APROVADO. Código só começa após o Passo 4 da ordem do Gate 0.
**Autoridade:** este documento substitui `docs_21`, `docs_22`, `docs_23` e todos os rascunhos anteriores da FATIA-05.
**Régua primária:** o **vídeo** gravado pelo usuário após o fechamento da 4.7. O code-server 8080 serve como apoio quando o vídeo for ambíguo.
**Evidências do Gate 0:** `docs/engenharia_reversa/FATIA-05_LAYOUT/05_00_relatorio_validacao_pre_fase.md` + `05_01_raspagem_layout_vscode.md` + `raspagem_05_01/`.
**Fonte de medidas herdadas da 4.7:** `docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/04_17_explorer_codeeditorpane_raspagem_vscode_original.md`.

---

## 0. Instruções para a Arena — leia antes de tudo

> **Atualização 2026-09-29 (pós-c1):** o estado real da obra (c1 commitado, c2 em working tree bloqueado por decisão do usuário, riscos do c3) está em **`docs/25`**; a receita de testes/ambiente e os dois mundos 5174/5175 em **`docs/26`**; as regras de trabalho em **`docs/27`**. Leia-os antes deste plano se estiver retomando. A raspagem externa `05_02` completou medidas do §5.2.

Você **não** deve começar implementando nada. A ordem obrigatória é:

1. Ler este documento inteiro + a cadeia de leitura (`docs/00`–`docs/18`, `docs/12` topo, `docs/11` FATIA-05, `04_17`, `04_18`, `04_19`, `04_20`, `04_21`, `05_00`, `05_01`).
2. Executar a **ordem de execução dos Passos 1–5** (§1 abaixo) — um passo por vez, parando ao final de cada.
3. Só depois do Passo 4, iniciar o **c1 da 5.1**.
4. **Parar após o c3 da 5.1** e aguardar homologação antes de qualquer outra sub-fase.

Qualquer atalho nessa ordem invalida a entrega.

---

## 1. Ordem exata de execução (Passos 1–5 com paradas obrigatórias)

Execute **um passo por vez**. Ao final de cada um, **pare e aguarde comando do usuário**.

**➤ PASSO 1 — Corrigir o plano.**
Este documento **já é a v1.1 corrigida**. Se você está lendo isto, o Passo 1 já foi aplicado no arquivo que você recebeu. Confira que as 4 correções estão presentes: (a) sash 4 px, (b) régua de largura 170/`min(300, largura/4)`/largura−220/snap-to-close, (c) `display: flex/none` em vez de `contents`, (d) nota de versão no topo. Se bate, vá pro Passo 2.

**➤ PASSO 2 — Atualizar documentação canônica.**
Atualizar **três** arquivos:
- `docs/12-DOCUMENTACAO-VIVA.md` — entrada nova (2026-09-29, Gate 0 concluído).
- `docs/11_QUADRO_KANBAN_SDLC_ASSISTIDO_POR_IA.md` — linha FATIA-05: "Gate 0 ✅, aguardando c1".
- `docs/05_BACKLOG_MESTRE.md` — pendências herdadas (V1-R1, "lixo visual", split, RF-09 maximize, Open Editors D2.9) → 5.8 ou fatia seguinte.

**→ PARE. Aguarde comando.**

**➤ PASSO 3 — Carimbar o relatório.**
No topo do `05_00_relatorio_validacao_pre_fase.md`:
> ✅ APROVADO em 2026-09-29. Decisões aplicadas no `docs_24 v1.1`. Próximo passo: PASSO 4.

**→ PARE. Aguarde comando.**

**➤ PASSO 4 — Reescrever a spec 15.**
Reescrever `sessao_15_activity_bar.spec.ts` para o **lado direito**, indentação correta (2 espaços dentro de `describe`), medidas corretas (Activity Bar 48 px, sash 4 px, 3 ícones).

**→ PARE. Aguarde comando.**

**➤ PASSO 5 — Iniciar a 5.1 (c1, c2, c3).**
Os 3 commits da §7. Ao final do c3, **PARE**. Não comece a 5.2.

---

## 2. Decisões travadas (v1.1)

| # | Decisão | Valor travado |
|---|---|---|
| D1 | Lado do chassi | **Direito** (Activity Bar + Side Bar na ponta direita) |
| D2 | Terminal | **Intocável** (blindado por `docs/18`; `core/**`/`server/**` do módulo `explorer-search` também intocados) |
| D3 | Idioma da UI | **Inglês** nas peças novas/migradas. Resto do shell **não é traduzido** — fica como está |
| D4 | Porta | **Single Port 5174** (sem `.env`; caminhos relativos `/fs/*` e `/git/*`) |
| D5 | Ícones na Activity Bar em 5.1 | **3** (Explorer, Search, Source Control). Browser só em 4.8 |
| D6 (v1.2 — 2026-10-02) | AttachArea (editor real) | **Permanece fino à direita (AuxiliaryBar) como default — o chat é o foco principal.** Na 5.7 ganha o estado `editorMaximized` (A0.7, 2026-09-30): o botão maximizar do editor faz ele **tomar o centro e esconder o chat**; restaurar volta para `[chat][editor fino]`; persistido em `workbench.layoutState.v1`. **Maximizado = `[lista 300][EDITOR flex][Side Bar 274][Activity Bar 48]` — a Side Bar NÃO recolhe no maximize, só o chat some (decisão do usuário, homologação 2026-10-02; em 1400 px o editor mede ~767).** **Nunca** migra permanentemente para o centro (corrigido em A0.7 — a redação anterior "migra pro centro em 5.7" estava errada; ver §4 5.7 e fontes) |
| D7 | Timeline/Outline | **Seções internas do Explorer**. Vazias em 5.1, reais em 5.6. **Não** são abas do painel inferior |
| D8 | Numeração das fatias | **FATIA-06 = Chat + Runtime de Agente** (canônica) |
| D9 | Gerenciador de pacotes | **npm** (não pnpm) |
| D10 | Maquete "Changes N" + `src/shell/gitTransition.ts` | **Removidos na 5.3** |
| D11 | Inversão futura da lista de conversas | **Chassi assimétrico**, mas `layoutState.position` já é gravado e `viewRegistry` aceita `container: 'left' \| 'right'` desde a 5.1 |
| D12 | Breadcrumbs / menu "..." / fechar aba / ícones por extensão | **Nada recriado** — já existe no código (§5.3) |
| D13 | Menubar File/Edit/View | **Não existe no VS Code moderno** — não recriar |
| D14 | Tradução pt-BR de "Explorer/Search/Source Control" | **Não traduzir** |
| D15 | `npm run e2e` | **Não existe** — usar `npx playwright test` |
| D16 | `.env` | **Não criar** |
| D17 | Recolhimento de superfícies com box próprio | **`display: flex/none`** (equivalente à Regra 10 do `docs/18`, mas com box mensurável) |
| D18 | `core/**` e `server/**` do módulo `explorer-search` | **Intocados na FATIA-05** |
| D19 | `App.tsx` | Só wiring aditivo via barrel |
| D20 | Cores | Zero hardcode; apenas tokens `--vscode-*` |
| D21 | Tipos | Zero `any` em porta de serviço |
| **D22** | **Sash da Side Bar** | **4 px** (régua do VS Code — medido em `05_01`). O `ATTACH_SASH_WIDTH_PX = 6` continua valendo **só** para o anexo do editor |
| **D23** | **Largura da Side Bar** | Mínimo **170 px**, padrão **`min(300, largura/4)`**, máximo **`largura − 220`**, **snap-to-close** abaixo do mínimo (arrastar até fechar) |
| **D24** | **Side Bar fechada** | Não é `display:none` no VS Code; o part fica com largura 0. Ao reabrir, devolve a **mesma largura** de antes (não reseta pro padrão) |
| **D25** | **Indicador de ícone ativo** | Borda de **2 px** na face **externa** da tirinha (`left: 46px` no modo direito). Permanece no último ativo mesmo com a Side Bar fechada |

---

## 3. Correções aplicadas na v1.1 (para rastreio)

Comparado ao rascunho v1.0, esta versão corrige:

1. **Sash da Side Bar:** 6 px → **4 px** (régua medida em `05_01`).
2. **Largura da Side Bar:** 280–1200 px fixo → **min 170 / padrão `min(300, largura/4)` / máx `largura − 220` / snap-to-close** (régua).
3. **Recolhimento:** `display: contents/none` → **`display: flex/none`**. Nota: a Regra 10 do `docs/18` continua valendo para wrappers transparentes (o `PlatformTerminalBridge`), mas **não** para containers com box próprio (a Side Bar) — nestes, `flex/none` preserva o React montado e mantém `getBoundingClientRect()` mensurável.
4. **Nota de versão no topo** marcando v1.1.
5. **D22–D25 adicionadas** refletindo o Gate 0.

---

## 4. Escopo por sub-fase

### 5.1 — Chassi + Explorer migrado

**Entrega:** Activity Bar real (3 ícones, lado direito), Side Bar grossa com sash 4 px, primeiro Explorer migrado, seções Timeline/Outline vazias dentro do Explorer.

**O que faz:**
- Cria `src/shell/activityBar/` com `ActivityBar.tsx` (48 px) + `ActivityBarItem.tsx` + CSS com tokens `--vscode-activityBar*`.
- Cria `src/shell/sideBar/` com `SideBar.tsx` + `SideBarViewPane.tsx` + `sash.ts` (**4 px**, cursor `col-resize`, hover com `--vscode-sash-hoverBorder`, dblclick reset para 300, snap-to-close abaixo de 170, teclado ←→).
- Cria `src/shell/viewRegistry.ts` + `src/shell/layoutState.ts` (persistência em `workbench.layoutState.v1`: `sideBarWidth`, `sideBarVisible`, `activeView`, `activityBarPosition` — o último gravado desde a 5.1, mesmo que usado só na 5.4).
- Adiciona tokens `activityBar*` em `styles/theme.css` (aditivo — hoje faltam).
- Monta o Explorer real (o mesmo da 4.4) dentro da Side Bar grossa. A árvore não muda; muda o host.
- Cria dentro do Explorer as seções `Outline` e `Timeline` **colapsadas e vazias**.
- Wiring aditivo em `App.tsx` via barrel do módulo. `.main-region` recebe a Side Bar + Activity Bar **depois** de `.right-section`.
- A lista de conversas (barra esquerda) e a área central continuam onde estão.
- O AttachArea continua na AuxiliaryBar (à esquerda da nova Side Bar). Layout: `[centro][AttachArea][Side Bar][Activity Bar]`.

**Não faz:** mover Search (5.2), mover SCM (5.3), Activity Bar móvel (5.4), DnD de views (5.5), Timeline/Outline reais (5.6), migrar o editor pro centro (5.7), polish (5.8).

**Commits atômicos (3):**
- `feat(activity-bar): 3 ícones à direita`
- `feat(side-bar): container com sash e persistência`
- `feat(view-registry): registry + layoutState + Explorer migrado`

**DoD:** os 3 commits verdes + typecheck 0 + vitest ≥ 382 + anti-regressão completa (§8) + **E2E novo no c3**: "expandir Explorer → migrar pro painel largo → continua expandido" (prova a idempotência do `mount`). Prints antes/depois em `docs/engenharia_reversa/FATIA-05_LAYOUT/auditoria_05/c1`, `c2`, `c3`.

---

### 5.2 — Search migra para o painel largo

**Entrega:** o Search (motor da 4.6) passa a abrir no painel largo, ao clicar no ícone da tirinha. O editor central continua disponível — abrir um arquivo **não fecha** o Search.

**O que faz:**
- Mover a UI do Search para dentro do `SideBarViewPane` via registry.
- Debounce 250 ms e "última busca vence" mantidos (motor da 4.6).
- Clique em resultado continua abrindo arquivo (via `attach.open`).

**Não faz:** trocar o motor de busca; tocar em `core/search/**`.

**DoD:** `sessao_13_search` 14/14 + backend 6/6 + E2E novo provando que Search e editor convivem.

---

### 5.3 — SCM migra para o painel largo + remove maquete

**Entrega:** Source Control real (motor 4.7-b) passa a abrir no painel largo. A maquete "Changes N" (`data.ts` → `initialDiffFiles` e `buildProjectDiffFiles`) e o `src/shell/gitTransition.ts` são **removidos**. O clique num arquivo continua abrindo o diff read-only.

**O que faz:**
- Mover a UI do SCM (`ChangesPane`, `ChangesList`, `CommitInput`) do AttachArea para o painel largo.
- Remover `initialDiffFiles` e `buildProjectDiffFiles` de `data.ts` (o resto de `data.ts` permanece).
- Remover `src/shell/gitTransition.ts`.
- Remover a prop `hideChangesTab` do `AuxiliaryBar.tsx`.
- Remover o hook `useMockChangesTransition` do `App.tsx`.

**Não faz:** trocar o motor do SCM; tocar em `core/git/**` ou `server/git/**`.

**DoD:** `sessao_14b_git_changes` 11/11 + `sessao_14b_git_backend` 7/7 + `sessao_14b_git_smoke` 1/1 + `sessao_14c_diff_minimal` 6/6 + `sessao_14d_commit_input` 5/5 + E2E novo provando que SCM e editor convivem.

---

### 5.4 — Activity Bar movível

**Entrega:** a tirinha pode ser movida (left/right/top/bottom) por menu de contexto. Posição persistida.

**O que faz:**
- Menu de contexto na Activity Bar com as 4 opções.
- `layoutState.position` gravado e lido.
- `ActivityBar.tsx` e `SideBar.tsx` recebem `side: 'left' | 'right'` como prop desde a 5.1 (mesmo que fixo à direita em 5.1–5.3).

**DoD:** menu funciona; posição sobrevive a F5.

---

### 5.5 — Drag & drop de views

**Entrega:** dá para arrastar Explorer/Search/SCM entre o painel largo e o painel inferior (terminal). Ordem persistida.

**Não faz:** permitir arrastar o **terminal**.

**DoD:** E2E de DnD.

---

### 5.6 — Timeline e Outline reais

**Entrega:** as seções `Outline` e `Timeline` do Explorer ganham dados reais.
- Outline: símbolos do arquivo ativo. Clique navega até o símbolo.
- Timeline: histórico de commits do arquivo ativo. Clique abre diff daquela versão.

**DoD:** E2E de Outline + Timeline.

---

### 5.7 — Toggle maximizar/restaurar o editor da AuxiliaryBar (RF-09 ampliado) — escopo corrigido em A0.7 (2026-09-30)

> **Correção de produto (A0.7):** a redação original ("AttachArea migra pro centro permanentemente") **estava errada** para a Agents Window. No original, o chat é a superfície principal e o editor de código é um painel **docado ao lado do chat**, que só toma a tela inteira pelo toggle **Maximize Editor Area / Restore Editor Area** (doc oficial "Configure the Agents window → Use the single-pane editor panel": *"Files and diffs open in the docked editor next to the chat … Use Hide Editor, Toggle Details, and Maximize Editor Area or Restore Editor Area to adjust the layout"*; "Use the Agents window → Interface overview": *"Files and diffs open in an editor beside the chat or in a modal window"*). O VS Code geral tem o mesmo padrão em **View: Toggle Maximize Editor Group** (`Ctrl+K Ctrl+M`), que esconde os outros grupos e volta ao clicar de novo. Fontes: https://code.visualstudio.com/docs/agents/run/agents-window-configuration · https://code.visualstudio.com/docs/agents/run/agents-window · https://code.visualstudio.com/docs/configure/custom-layout#_maximize-and-expand-an-editor-group

> **Regra de larguras autorizada em 2026-10-01 ("A + 2 com piso 420")** — achado da auditoria antes do código: em 1400 px, abrir arquivo deixava o chat com **72 px** (print `auditoria_05/c5.7/00_antes…`): a coluna "Detalhes" (330 px) era forçada a aparecer junto do anexo e ninguém garantia largura mínima ao chat. Regra:
> 1. **Chat ≥ 420 px e ≥ 50 % da faixa chat+editor** (`.top-right-section`); **editor fino ≤ 50 %** quando não maximizado (`ATTACH_MAX_WIDTH_RATIO` 0.75 → **0.5** — exceção pontual de 1 constante no `core`, autorizada). Default do anexo continua 46 % (≈ 356 px em 1400 px).
> 2. **"Detalhes" colapsa sozinha (0 px) na 1.ª aba do anexo**; continua acessível pelo toggle "Barra auxiliar". Na faixa fina os dois são **exclusivos** (Detalhes ligada mostra a coluna no lugar do editor; desligar devolve o editor) — evita o colapso de 47 px que apareceria se os dois dividissem os 50 %.
> 3. Quando o piso de 420 vence os 50 % (faixa < 852 px), a barra fica em `min(50 %, 100 % − 426 px)` e o anexo cede (CSS do shell; o módulo só conhece o 50 %).
> 4. Maximizado = `[lista][EDITOR][Side Bar][Activity Bar]`, Side Bar **= 274 visível** (RF-09 revogado para a 5.7 — decisão 2026-10-02, v1.2; substitui a confirmação de 2026-10-01 que mantinha Side Bar = 0).

**Comportamento-alvo:**
- **Default:** `[lista de sessões 300] [CHAT flex, min 420 e ≥ 50 %] [editor fino ≈ 360 (min 280, max 50 %) na AuxiliaryBar] [Side Bar 274] [Activity Bar 48]` + terminal embaixo. Coluna "Detalhes" = 0 px com arquivo aberto (toggle devolve).
- **Maximizar** (botão `codicon-screen-full` que o AttachArea já tem desde o c6 da 4.7, hoje só alarga dentro da AuxiliaryBar): o editor **toma o centro** (largura do chat + da AuxiliaryBar) e o **chat fica escondido**; a lista de sessões e o terminal continuam visíveis; Side Bar **fica visível (274)** — v1.2 revogou o RF-09 para a 5.7. Layout: `[lista] [EDITOR] [Side Bar] [Activity Bar]` + terminal.
- **Restaurar** (`codicon-screen-normal`, mesmo botão): volta exatamente para `[chat][editor fino]` com a largura anterior.
- Estado `editorMaximized` persistido em `workbench.layoutState.v1` (F5 mantém); por sessão não — é global do layout, como `sideBarVisible`.
- O chat **nunca** deixa de ser o foco principal no default.

**Não faz:** mover AttachArea/Browser/Customizations permanentemente; mexer no `EditorArea.tsx` do shell além do necessário (ele continua só com Browser/Customizations); tocar terminal, `core/**`, `server/**`.

**Como (indicativo):** `layoutState` ganha `editorMaximized` (+ `toggleEditorMaximized`); `App.tsx` (wiring aditivo via barrel) ouve o evento `attach.maximizedChanged` do módulo — ou passa um callback — e aplica a classe/estado que esconde o chat e estica a AuxiliaryBar sobre o centro; Side Bar intocada pelo maximizar/restaurar (v1.2). O módulo continua dono do botão; o shell decide a geometria.

**DoD:** E2E (spec falhando antes) provando: clicar maximizar → chat escondido, editor ocupa o centro, lista de sessões visível, terminal visível, Side Bar escondida; clicar restaurar → chat volta e o editor volta fino com a largura anterior; F5 mantém o estado; Browser e Customizations continuam funcionando no EditorArea; abrir arquivo no Explorer **continua** abrindo no editor fino (não maximiza sozinho).

**Entregue (`9a11319`, 2026-10-01)** — spec `sessao_15_editor_maximize` T30–T32 (falhou antes: `chat 72 px`, chat visível no maximizado, **0 abas com Browser ativo**; passa depois 3/3). Causas reais do "bug do vídeo": (a) `setAuxiliaryVisible(true)` ao abrir arquivo forçava a "Detalhes"; (b) `resolveDetailPanelVisible` escondia a AuxiliaryBar inteira com o Browser ativo → anexo desmontado → `attach.open` ficava em `pendingAttachOpen` até o F5. Correção: AuxiliaryBar **sempre montada** com o módulo (Regra 10), `detailsVisible` governa só a coluna; `attachExpandedSessions` por eventos `editor.attachExpanded/Collapsed`; `layoutState.editorMaximized` espelha `editor.attachMaximized/Restored`; CSS em `.top-right-section` (`.editor-maximized` esconde `.main-surface` e estica o anexo). Specs antigas atualizadas com autorização: `sessao_14` T1/T2/T3/T14/T15/T16 (teto 50 %, Detalhes colapsa/exclusiva), `activity_bar` T4b (chat some no maximizado); T8/T9 ganharam espera de foco (flake de digitar antes do painel). O módulo **não** persiste abas abertas (fato da 4.7): após F5 o arquivo precisa ser reaberto e volta maximizado. Efeito colateral aceito: com todas as abas fechadas e Detalhes colapsada o chat centraliza em 950 px (estado `closed` do side pane).

---

### 5.8 — Polish (Alt+Z e menu de abas)

**Entrega:**
- `Alt+Z` alterna word wrap no editor.
- Menu de contexto da aba do editor com 5 itens: Close / Close Others / Close All / Copy Path / Copy Relative Path. (Subconjunto consciente do real — o restante entra em fase futura.)

**DoD:** E2E de Alt+Z e do menu.

---

## 5. Medidas congeladas vs. a medir

### 5.1 Já medido (04_17 + 05_01) — reaproveitar

- Linha da árvore: **22 px**
- Indentação por nível: **8 px**
- Twistie: **16 px**
- Altura da aba do editor: **35 px**
- Borda topo da aba ativa: **1 px** (`--vscode-tab-activeBorderTop`)
- Altura dos breadcrumbs: **22 px**
- Item de menu de contexto: **24 px**
- Container do menu: radius **8 px**
- Input do search: **26 px**
- Toggles do search: **20×20**
- Botão fechar da aba: **20×20**
- Altura do título da composite (Side Bar): **35 px**, fonte 11 px uppercase peso 400, padding-left 8
- Ação "…" do título: **22×22**, ícone 16
- Pane-header do Explorer: **22 px**, fonte 11 px peso 700 uppercase
- Activity Bar: **48 px**, ícone 24 px, indicador 2 px na face externa
- Statusbar: **22 px**
- Titlebar: **35 px**
- **Sash da Side Bar: 4 px** (medido em `05_01`)
- **Largura da Side Bar: padrão 300, min 170, máx = largura − 220, snap-to-close** (medido em `05_01`)

### 5.2 A medir na homologação (não bloqueia c1)

- Comportamento da Activity Bar **com painel inferior maximizado** — **medido em `05_02 §7` (2026-09-29):** painel maximizado `x=348 y=35 w=752 h=843`, Side Bar e Activity Bar permanecem;
- Tooltip custom (hover) dos ícones — VS Code usa hover nativo customizado, não `title`;
- Badge numérico no ícone da Activity Bar — **medido em `05_02 §7`:** 16×16, fonte 9 px, raio 20, tokens `activityBarBadge-*`;
- Transições e animações de hover exatas.

Regra: se não foi medido, escrever literalmente **"não medido — validar na homologação"**. Nunca estimar.

---

## 6. Requisitos funcionais

### 6.1 Núcleo do chassi

| ID | Requisito | Critério binário | MoSCoW |
|---|---|---|---|
| RF-01 | Activity Bar 48 px à direita, 3 ícones | `querySelectorAll('[data-testid=activity-bar-item]').length === 3` e `x > innerWidth - 60` | Must |
| RF-02 | Side Bar com min 170 / padrão `min(300, largura/4)` / máx `largura−220` / snap-to-close; sash 4 px; persiste após reload | drag muda width de acordo; largura anterior volta ao reabrir; `localStorage` sobrevive | Must |
| RF-03 | Explorer migra para o painel largo na 5.1 | Explorer renderiza dentro da Side Bar | Must |
| RF-04 | Search migra para o painel largo na 5.2 com debounce 250 ms | Search no painel largo; requisição anterior cancelada | Must |
| RF-05 | SCM migra para o painel largo na 5.3; maquete removida | `gitTransition.ts`, `initialDiffFiles`, `buildProjectDiffFiles` deletados; `/git/*` real funciona | Must |
| RF-06 | Abrir arquivo **não fecha** Search nem Changes | E2E: abrir Search → abrir arquivo → Search visível | Must |
| RF-07 | AttachArea fino à direita (default) | Direita sempre; na 5.7 só ganha o toggle maximizado (A0.7) | Must |
| RF-08 | Outline/Timeline como seções do Explorer | Colapsáveis em 5.1 (vazias), reais em 5.6 | Should |
| RF-09 | ~~Maximizar esconde a Side Bar~~ **Revogado para a 5.7 (v1.2, 2026-10-02): maximizar mantém a Side Bar 274**, lista de conversas e terminal | E2E: maximize → Side Bar visível 274 ±2, chat hidden, lista visível, terminal visível (15_editor_maximize T30, 15_activity_bar T4b) | Must |
| RF-10 | Activity Bar movível (left/right/top/bottom) na 5.4 | menu de contexto muda posição; persiste após reload | Should |
| RF-11 | Sem badge numérico no ícone do Search; sem animação de 200 ms na Side Bar | badge inexistente; Side Bar abre < 50 ms | Must |
| RF-12 | Terminal intocável | `npm run typecheck` 0; `sessao_11_terminal_pty_real` 6/6 | Must |
| **RF-13** | **Indicador de ícone ativo 2 px na face externa, permanece com Side Bar fechada** | `getBoundingClientRect()` do indicador com `left ≈ 46` no modo direito; sobrevive a toggle da Side Bar | Must |
| **RF-14** | **Ícone ativo clicado de novo fecha a Side Bar; clicar em outro troca a view** | toggle fecha; troca ativa nova view | Must |

### 6.2 Polish 5.8

| ID | Requisito | Critério binário | MoSCoW |
|---|---|---|---|
| RF-P-02 | Alt+Z alterna word wrap no Monaco | `monacoEditor.getOption(wordWrap)` alterna | Should |
| RF-P-04 | Menu de contexto da aba com 5 itens | clique direito numa aba abre menu com Close / Close Others / Close All / Copy Path / Copy Relative Path | Should |

### 6.3 Cancelados (documentados)

| ID | Por que cancelado |
|---|---|
| RF-POLISH-01 (Breadcrumbs) | **Já existe** desde 4.7 c3 |
| RF-POLISH-03 (Fechar aba) | **Já existe** desde 4.7 c2 |
| RF-POLISH-05 (Tradução pt-BR) | Quebra byte-a-byte |
| RF-POLISH-06 (menu "..." + menubar) | Menu "..." **já existe** desde 4.5 c5; menubar **não existe** no VS Code atual |
| RF-POLISH-07 (Ícones por extensão) | **Já existe** desde 4.4 |
| Maquete "Changes N" | Removida na 5.3 (obrigação de limpeza, não RF novo) |

---

## 7. ADRs da FATIA-05

| ADR | Decisão | Alternativa rejeitada |
|---|---|---|
| 01 | Activity Bar + Side Bar **à direita** | Esquerda — quebra fluxo atual |
| 02 | AttachArea **fino à direita como default**; centro só no toggle maximizado (5.7, A0.7) | Migração permanente pro centro — rejeitada em A0.7 (contraria o original: chat é o foco) |
| 03 | `viewRegistry` + `layoutState` em `src/shell/` | `src/modules/` — não é domínio do módulo; `src/core/` — pasta nova sem precedente |
| 04 | Remover maquete + `gitTransition.ts` em 5.3 | Manter — código morto bloqueia o SCM real |
| 05 | Timeline/Outline como **seções do Explorer** | Abas do painel — diverge do VS Code |
| 06 | Zero cor hardcoded | Hex direto — gera dívida |
| 07 | **Inglês** apenas nas peças novas/migradas | pt-BR — quebra byte-a-byte |
| 08 | Single Port 5174 relativo; sem `.env` | `.env` apontando 8080 |
| 09 | 3 ícones na 5.1; Browser só em 4.8 | 4 ícones — ícone morto |
| 10 | FATIA-06 = Chat + Runtime | Git Decorations — bagunça numeração |
| 11 | npm e sem JSON Schema | pnpm + schema — over-engineering |
| 12 | Chassi **assimétrico agora**, com `layoutState.position` já gravado | Simétrico desde 5.1 — trabalho sem benefício até inversão ser pedida |
| **13** | **`display: flex/none`** para esconder containers com box próprio. `display: contents` continua **apenas** em wrappers transparentes (Regra 10 do `docs/18` — `PlatformTerminalBridge`). | `contents` em container de box — quebra `getBoundingClientRect()` |
| **14** | **Sash 4 px** (régua). O `ATTACH_SASH_WIDTH_PX = 6` continua valendo **só** para o anexo do editor. | 6 px uniforme — foge da régua na Side Bar |
| **15** | **Largura da Side Bar pela régua**: min 170, padrão `min(300, largura/4)`, máx `largura−220`, snap-to-close | 280–1200 px fixo — chute do rascunho |

---

## 8. Árvore de arquivos prevista

```
src/
├─ shell/
│  ├─ activityBar/
│  │  ├─ ActivityBar.tsx
│  │  ├─ ActivityBarItem.tsx
│  │  ├─ activityBar.css           (só tokens --vscode-activityBar*)
│  │  └─ index.ts
│  ├─ sideBar/
│  │  ├─ SideBar.tsx
│  │  ├─ SideBarViewPane.tsx
│  │  ├─ views/
│  │  │  ├─ ExplorerView.tsx       (seções Outline/Timeline; dados reais 5.6)
│  │  │  ├─ SearchView.tsx
│  │  │  └─ ScmView.tsx
│  │  ├─ sideBar.css
│  │  └─ sash.ts                   (4 px, snap-to-close)
│  ├─ editor/                      (vazio em 5.1 — Breadcrumbs vive no módulo)
│  ├─ layoutState.ts               (chave `workbench.layoutState.v1`)
│  ├─ viewRegistry.ts              (3 views em 5.1; aceita container: 'left'|'right')
│  ├─ EditorArea.tsx               (legado — só Browser/Custom; 5.7 NÃO o substitui)
│  └─ Workbench.tsx                (orquestra lista + centro + sideBar + activityBar + terminal)
└─ modules/explorer-search/
   ├─ index.ts                     (só aditivo)
   ├─ contract.ts                  (só aditivo)
   ├─ core/                        (INTOCÁVEL na FATIA-05)
   ├─ server/                      (INTOCÁVEL na FATIA-05)
   └─ ui/
      ├─ attach/AttachArea.tsx     (direita sempre; 5.7 = toggle maximizar toma o centro / restaurar)
      ├─ attach/Breadcrumbs.tsx    (JÁ EXISTE desde 4.7)
      ├─ attach/EditorTabs.tsx     (JÁ EXISTE desde 4.7; menu cresce em 5.8)
      ├─ attach/CodeEditorPane.tsx (Monaco; Alt+Z entra em 5.8)
      ├─ attach/changes/           (migra pro painel largo em 5.3)
      ├─ attach/diff/              (aba fixa Diff no anexo; acompanha o toggle maximizado em 5.7)
      └─ search/                   (migra pro painel largo em 5.2)
```

**`styles/theme.css`:** adicionar tokens `--vscode-activityBar-{background,foreground,inactiveForeground,border,activeBorder}` e `--vscode-activityBarBadge-{background,foreground}` (aditivo; hoje faltam).

---

## 9. Anti-regressão obrigatória em **todos** os commits

```
sessao_11_terminal_pty_real                6/6
sessao_11_terminal_interactive_v2          3/3
sessao_12_explorer                        30/30
sessao_12_explorer_fs_backend             10/10
sessao_13_search                          14/14
sessao_13_search_backend                   6/6
sessao_14_editor_anexo                    16/16
sessao_14b_git_changes                    11/11
sessao_14b_git_backend                     7/7
sessao_14b_git_smoke                       1/1
sessao_14c_diff_minimal                    6/6
sessao_14d_commit_input                    5/5
```

Comando: `npx playwright test <nome>` (não existe `npm run e2e`).
**Nota:** alguns destes testes usam seletores dentro de `.auxiliary-bar` para achar a árvore. Quando a árvore migrar pro painel largo (c3), ajustar **só o seletor** — nunca a lógica. Fazer `grep` antes do c3.

---

## 10. Critérios de aceite

### 10.1 Por sub-fase

Cada sub-fase só fecha quando:
- typecheck 0;
- vitest ≥ 382;
- E2E da sub-fase novo verde;
- anti-regressão completa verde (§9);
- print lado a lado (antes/depois) em `docs/engenharia_reversa/FATIA-05_LAYOUT/auditoria_05/cN/`;
- `docs/12` atualizado com evidência.

### 10.2 Aceite final da FATIA-05

- Search e Changes visíveis ao mesmo tempo que um arquivo no editor (E2E);
- Activity Bar e Side Bar com as medidas da régua (4 px sash, largura `min(300, largura/4)`, snap-to-close, 48 px Activity Bar);
- zero regressão em todos os E2E listados em §9;
- zero alteração em `core/**` e `server/**` (verificável por `git diff --name-only`);
- `App.tsx` apenas com wiring aditivo via barrel;
- terminal blindado: `sessao_11_terminal_pty_real` 6/6 e `sessao_11_terminal_interactive_v2` 3/3.

---

## 11. Regras invioláveis

1. **Nunca** tocar em `src/components/terminal/**`, `src/hooks/useTerminalTheme.ts`, `src/styles/terminal-vscode.css`, `vite-plugin-pty.ts`, `singlePort.ts`, `platform/services/pty-server/**`, e2e `sessao_11_terminal_pty_real.spec.ts`, `sessao_11_terminal_interactive_v2.spec.ts`.
2. **Nunca** remover WebSocket PTY, listeners `resize`/`ResizeObserver`/`MutationObserver` de tema, nem o endpoint `/api/ports`.
3. `vite.config.ts` e `server.mjs` recebem apenas montagem aditiva do plugin/handler FS.
4. `App.tsx` importa **um único caminho** do módulo: o barrel `index.js`.
5. O módulo **não importa** nada de `src/components/`, `src/domain/`, `src/hooks/`, `src/providers/`.
6. Todo I/O passa por `deps.fs`; todo comando por `deps.menus`; todo menu visual por `deps.contextMenu`. `any` proibido.
7. **Zero cor hardcoded** nos módulos novos: apenas tokens `--vscode-*`.
8. Recolher superfície com box próprio = **`display: flex/none`**. Recolher superfície wrapper (TerminalBridge) = **`display: contents/none`** (Regra 10 do `docs/18`). Não confundir os dois casos.
9. Nada de `position: fixed` cobrindo shell/sidebars/statusbar.
10. **Imutabilidade de UX:** o transplante não muda nada do documentado no vídeo. Divergência = bug a corrigir.
11. Ordem obrigatória: **5.1 → 5.2 → 5.3 → 5.4 → 5.5 → 5.6 → 5.7 → 5.8**. Cada sub-fase só começa com a anterior validada.
12. Nenhuma sub-fase é concluída sem as evidências do §10.
13. **Parar após o c3 da 5.1** e aguardar homologação antes de qualquer outra sub-fase.

---

## 12. Riscos

| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| Mover Explorer quebra abertura de arquivo | Média | Alta | AttachArea não se move (A0.7); só o toggle maximizado na 5.7 |
| Migrar o slot do Explorer remonta o módulo e some o estado da árvore | Média | Alta | `module.mount` idempotente por design; E2E obrigatório no c3 "expandir → migrar → continua expandido" |
| Testes 12/13/14 usam seletores dentro de `.auxiliary-bar` | Alta | Alta | `grep` antes do c3; ajustar **só seletor**, nunca lógica |
| Tocar `Workbench.tsx` quebra terminal | Baixa | Alta | Terminal intocável; E2E 6/6 obrigatório em cada commit |
| localStorage corrompido | Baixa | Média | fallback para defaults |
| Sash abaixo de 60 fps | Baixa | Média | `transform` durante drag; persistir só no drag end |
| Maquete escondendo bug do Git | Média | Alta | Remover só na 5.3 depois de `/git/*` verde |
| Browser entrar como ícone morto | Baixa | Média | Fora da 5.1 (3 ícones) |
| `display:contents` em container quebra medição E2E | Alta | Alta | **Resolvido na v1.1** — usar `flex/none` (ADR-13) |
| `isSinglePane`/mobile renderiza AuxiliaryBar em outro lugar | Média | Média | 5.1 é desktop-only; mobile mantém caminho atual (`sessao_06` verde é o guarda) |
| RAM 1,9 GB: 8080 + vite + Playwright juntos | Média | Média | rodar suítes em série; nunca abrir pasta no 8080 |

### Riscos conscientemente aceitos

- **Chassi assimétrico:** inversão futura precisa de refatoração de `Workbench.tsx`. Aceito para não pagar custo agora (ADR-12).
- **Inglês na UI nas peças novas:** usuário pt-BR verá "Search" em vez de "Pesquisa". Aceito por fidelidade byte-a-byte (D3).
- **Sash 4 px (não 6):** mais fino para touch, mas fiel à régua. Aceito (D22).

---

## 13. Referências

- **Relatório Gate 0:** `docs/engenharia_reversa/FATIA-05_LAYOUT/05_00_relatorio_validacao_pre_fase.md`
- **Raspagem 05_01:** `docs/engenharia_reversa/FATIA-05_LAYOUT/05_01_raspagem_layout_vscode.md` + `raspagem_05_01/`
- **Raspagem 4.7 (medidas herdadas):** `docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/04_17_explorer_codeeditorpane_raspagem_vscode_original.md`
- **Plano 4.5→4.7:** `docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/04_18_plano_implantacao_fatia_04.md`
- **Contratos do módulo:** `platform/apps/workbench-v2/src/modules/explorer-search/contract.ts`
- **Anti-regressão:** `docs/18_PROTOCOLO_ANTI_REGRESSAO_E_CONTRATOS_CONGELADOS.md`
- **Documentação viva:** `docs/12-DOCUMENTACAO-VIVA.md` (topo)
- **Kanban:** `docs/11_QUADRO_KANBAN_SDLC_ASSISTIDO_POR_IA.md` (FATIA-05)
- **Prints do vídeo:** `docs/referencias_visuais/fatia04_video/` e `docs/referencias_visuais/editor/34…37`
- **Evidência da 4.7 completa:** `auditoria_47/`, `auditoria_47b/`, `auditoria_47c/`

---

## 14. Checklist final antes de começar

- [x] Gate 0 executado (raspagem + auditoria do código + confronto doc × código)
- [x] Relatório de Validação Pré-Fase produzido (`05_00`)
- [x] Relatório aprovado pelo usuário (este documento é a prova)
- [ ] Documentação atualizada (`docs/12`, `docs/11`, `docs/05`) — **Passo 2**
- [ ] Relatório carimbado — **Passo 3**
- [ ] Spec 15 reescrita — **Passo 4**
- [ ] 5.1 autorizada explicitamente pelo usuário — **Passo 5**
- [ ] Anti-regressão rodada limpa no HEAD atual antes do c1
- [ ] Terminal confirmado intocável
- [ ] `core/**` e `server/**` do módulo confirmados intocados

**Próximo passo:** Arena salva isto como `docs/24_PLANO_FATIA-05_CHASSIS_RIGHT.md` e executa o **Passo 2** (atualizar `docs/12`, `docs/11`, `docs/05`), depois **para** e aguarda comando.

---

**Fim do documento v1.1.**
