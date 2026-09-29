# 25 — ESTADO ATUAL DA OBRA E PENDÊNCIAS (FATIA-05 · sub-fase 5.1)

**Data:** 2026-09-29 · **HEAD local:** `0e36af4` (docs) sobre `3fcc913` (código c1) · **Plano vigente:** `docs/24_PLANO_FATIA-05_CHASSIS_RIGHT.md` v1.1
**Para quem é:** a próxima IA (ou pessoa) que assumir. Este arquivo diz **exatamente onde a obra parou**, o que está commitado, o que está solto no working tree, o que bloqueia o próximo commit e quais decisões só o usuário pode tomar.
**Regra:** se este arquivo e o código divergirem, o código manda — mas **reporte a divergência** antes de agir.

> Sobre hashes: o usuário leva o workspace para o Windows e faz commit/push por lá. Os hashes do GitHub **não coincidem** com os citados aqui; o **conteúdo** é o mesmo. Use as mensagens de commit (`feat(activity-bar)…`, `docs(fatia-05)…`) como referência, não o hash.

---

## 1. Placar em uma tela

| Item | Estado | Evidência |
|---|---|---|
| Gate 0 (raspagem + auditoria, só leitura) | ✅ concluído e aprovado | `docs/engenharia_reversa/FATIA-05_LAYOUT/05_00`, `05_01`, `05_02` |
| Passos 1–4 do `docs/24 §1` (docs 24/12/11/05, carimbo 05_00, spec 15 reescrita p/ direita) | ✅ | commit `0e36af4` |
| **c1 `feat(activity-bar)`** — 48 px à direita, 3 ícones, indicador 2 px face externa, tokens | ✅ **commitado** `3fcc913` | spec 15 T1 verde; anti-regressão §9 12/12; typecheck 0; vitest 708/717; print `docs/engenharia_reversa/FATIA-05_LAYOUT/auditoria_05/c1/` |
| **c2 `feat(side-bar)`** — container à esquerda da Activity Bar, sash 4 px, persistência | ⚠️ **implementado, NÃO commitado** | working tree (ver §2); spec 15 T1–T4 verdes; 11 de 12 suítes verdes; **bloqueado pelo T14 da sessão 14** (§3) |
| c3 `feat(view-registry)` — Explorer migrado p/ Side Bar, Outline/Timeline vazias | ⏳ não iniciado | riscos já mapeados em §4 |
| 5.2 → 5.8 | ⏳ | **proibido começar** antes da parada pós-c3 e OK do usuário |

---

## 2. O que está solto no working tree (não commitado)

```
 M platform/apps/workbench-v2/e2e/sessao_15_activity_bar.spec.ts   ← ajustes de teste do c2 (§2.2)
 M platform/apps/workbench-v2/src/App.tsx                          ← wiring aditivo: useLayoutState + <SideBar>
?? platform/apps/workbench-v2/src/shell/layoutState.ts             ← novo (c2)
?? platform/apps/workbench-v2/src/shell/sideBar/                   ← novo (c2): SideBar.tsx, SideBarViewPane.tsx, sash.ts, sideBar.css, index.ts
?? docs/engenharia_reversa/FATIA-05_LAYOUT/auditoria_05/c2/                                                ← print 01_depois_side_bar_direita.png
?? platform/apps/workbench-v2/shot.tmp.mjs                         ← utilitário de print, NÃO commitar (ver docs/28)
```

Tudo isso **é o c2**. Não é rascunho abandonado: está funcional, typecheck 0, e só não foi commitado porque a regra "anti-regressão §9 100 % verde em cada commit" não foi cumprida (§3). Não apague; não "limpe".

### 2.1 O que o c2 entrega (comportamento real, verificado por E2E)
- `src/shell/layoutState.ts` — chave `localStorage` **`workbench.layoutState.v1`** = `{ sideBarWidth, sideBarVisible, activeView, activityBarPosition: 'right' }`. `useLayoutState()` expõe `selectView` (RF-14: clicar no ícone ativo recolhe/reabre), `toggle`, `setVisible`, `setWidth`, `reset`. Load tolerante a JSON corrompido (volta ao padrão).
- Régua de largura (decisão do usuário "a", `docs/24 §2`): **mín 170** · **padrão `min(300, floor(largura/4))`** · **máx `largura − 48 − 220`** · **snap-to-close** (soltar com largura bruta < 170 fecha a Side Bar e **restaura a largura de antes do arrasto** para a próxima reabertura).
  - **Interpretação adotada (não estava escrita, foi decidida na obra):** "largura" = a `.main-region` inteira, **incluindo** a Activity Bar (como no VS Code, onde a régua usa a largura da janela). O máximo desconta os 48 px da Activity Bar e os 220 px mínimos do centro. Em 1280 px isso dá máx 1012; a raspagem do outro agente mediu 1132 em janela maior — coerente.
- Sash: 4 px, `left: -2px` sobre a borda esquerda da Side Bar, `role="separator"`, pointer capture, **dblclick = reset para o padrão**, teclado ←/→ passo 10 px.
- **Ctrl+B** alterna a Side Bar (listener em `window` keydown), **ignorando** quando o foco está em `input/textarea/[contenteditable]` ou dentro de `.xterm` (o terminal é intocável e usa Ctrl+B).
- DOM: `.part.sidebar.right` > `.composite-title` (35 px, `h2`) + `.content` > `.side-bar-view-pane[data-view-pane]` com `display: flex` (ativa) / `display: none` (inativa) — regra v1.1 "flex/none para container com box".
- Ordem no `App.tsx` (bloco gated): `<SideBar>` antes de `<ActivityBar>` → layout `[centro][AttachArea][Side Bar][Activity Bar]`.
- `renderView` é prop da `SideBar` reservada para o c3 (ainda não usada).

### 2.2 Ajustes feitos na `sessao_15_activity_bar.spec.ts` durante o c2 (por quê)
- `dragSash` usa coordenadas inteiras (`Math.round`) — Playwright com fração gera ±1 px no delta.
- T3 tolera ±1 px e usa a largura `narrow` **medida**, não 180 fixo.
- `open()` limpa `workbench.layoutState.v1` **só na primeira carga** (flag em `sessionStorage`) porque `addInitScript` roda de novo no `page.reload` e o T4 precisa reler a persistência.
- Máximo esperado = `mainW − 48 − 220` (comentado na spec).
- **T5** (`[data-testid="explorer-view"]`) **falha por desenho** — é o teste do c3.

---

## 3. O BLOQUEIO do c2 — decisão do usuário pendente

**Fato (determinístico, reproduzido com um único Vite no ar):** `sessao_14_editor_anexo` **15/16**. O **T14** ("maximizar o anexo") exige `.chat-pane` ≥ 240 px de largura com o anexo maximizado (75 % da banda). Com a Side Bar padrão (274 px em viewport 1400) ocupando espaço, o chat fica com **180 px**.

Não é seletor. É consequência geométrica legítima do chassi novo. A regra do `docs/24` proíbe mexer na lógica do teste.

**Opções apresentadas ao usuário (aguardando resposta):**
- **A (recomendada pela IA):** implementar já o **RF-09** do `docs/24 §6.1` ("maximizar esconde a Side Bar, mantém lista de conversas e terminal"): o `App.tsx` escuta o evento `attach.maximizedChanged` do módulo (via barrel, aditivo) e chama `setVisible(false)` / restaura ao desmaximizar. Comportamento do VS Code; resolve o T14 sem tocar no teste (~15 linhas). **Custo:** antecipa o D2.52 (`docs/05`), que o usuário tinha posto "fora da 5.1".
- **B:** baixar o limite do T14 — mexe na lógica do teste (**não recomendado**).
- **C:** commitar com o T14 vermelho documentado como débito — fere a regra "§9 verde em todo commit".

**Enquanto não houver resposta: não commitar o c2, não escolher sozinho.**

Todas as outras 11 suítes do §9 estão verdes com o c2 (rodadas isoladas, um Vite por vez): 11_pty 6/6 · 11_interactive 3/3 · 12_explorer 30/30 · 12_fs_backend 10/10 · 13_search 14/14 · 13_backend 6/6 · 14b_changes 11/11 · 14b_backend 7/7 · 14b_smoke 1/1 · 14c 6/6 · 14d 5/5. As falhas "Page crashed" vistas na 1ª rodada do script completo eram **OOM** (dois Vite + Monaco), não regressão — ver `docs/26 §4`.

---

## 4. Riscos já mapeados para o c3 (reportar ao usuário ANTES de codar)

O c3 migra o `<ExplorerModuleSlot>` da coluna "Files" da `AuxiliaryBar` para o pane `explorer` da Side Bar (montado **uma única vez**), e a `aux-tab-*-files` deixa de existir. Consequências conhecidas:

1. **Specs 14, 14b, 14c, 14d e 12 obtêm o `sessionId` lendo o `data-testid` `aux-tab-<sid>-files` e clicam na aba Files** (ex.: `sessao_14_editor_anexo` T1 e T14, l.≈548–597; `sessao_14b_git_smoke` l.≈56–57). É **lógica** de teste, não só seletor — a regra "se quebrar por seletor `.auxiliary-bar`, ajuste só o seletor" **não cobre** isso. Precisa de decisão: introduzir um `data-testid` estável de sessão em outro lugar (aditivo) ou reescrever esses trechos.
2. **T14 da sessão 14 também exige a coluna da árvore visível ao lado do anexo** — após a migração, a árvore vive na Side Bar, não na aux. Mesma família do bloqueio §3.
3. A `AuxiliaryBar` passa a ter só `.explorer-attach-area` + aba Changes; `hideChangesTab` hoje força `tab='files'` — precisa de novo fallback.
4. E2E obrigatório do c3 (`docs/24 §4 5.1`): "expandir pasta no Explorer → migrar para o painel largo → continua expandida" — o estado do módulo tem que sobreviver porque o slot é montado 1× e só muda de `display`.
5. `.pane-header[aria-label="Outline Section"|"Timeline Section"]` com `aria-expanded="false"` (seções vazias, em inglês, só na 5.1).
6. Prints antes/depois em `docs/engenharia_reversa/FATIA-05_LAYOUT/auditoria_05/c3/`.

---

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

---

## 6. Decisões pendentes — só o usuário decide

| # | Pendência | Bloqueia |
|---|---|---|
| P1 | T14 × Side Bar (RF-09 agora / débito) — §3 | **commit do c2** |
| P2 | Como as specs 14x/12 obtêm `sessionId` sem a aba Files — §4.1 | c3 |
| P3 | Destino dos **13 E2E mortos** (`sessao_08`, `sessao_10` T3–T5, `11b`–`11f`): apagar / reescrever / congelar — `docs/26 §2.3` | nada na 5.1; higiene |
| P4 | `TerminalPanel.test.tsx` (9 falhas: espera região "Terminal", a implementação renderiza `aria-label="Painel Inferior"`): corrigir o teste ou congelar | nada; explica o "708/717" |
| P5 | `legacy/`: **decidido apagar** (usuário, 2026-09-29). Falta o commit de remoção no Windows + tag de backup (`docs/28 §1`) | nada |
| P6 | Pasta `docs/engenharia_reversa/FATIA-05_LAYOUT_BYTE_A_BYTE/` (plano antigo): manter como histórico marcado ou apagar | nada |

---

## 7. Sequência exata para retomar (quando o usuário responder P1)

1. Reinstalar ambiente (`docs/26 §3`), subir **só** Vite 5175, reseed.
2. Se P1 = A: implementar RF-09 no `App.tsx` (aditivo, via barrel) + assert no E2E da spec 15 ("maximizar anexo recolhe Side Bar; restaurar volta") → rodar `sessao_14_editor_anexo` (esperado 16/16) e spec 15 (T1–T4).
3. Rodar as 12 suítes do §9 (ordem do `docs/26 §3.4`), `npm run typecheck`, `npx vitest run` (esperado 708/717).
4. Conferir perímetro: `git diff --name-only` não pode conter `modules/explorer-search/{core,server}/**`, `EditorArea.tsx`, `vite-plugin-pty.ts`, `singlePort.ts`, `pty-server/**`, specs `sessao_11*`.
5. `git add` de: `src/shell/layoutState.ts`, `src/shell/sideBar/`, `src/App.tsx`, `e2e/sessao_15_activity_bar.spec.ts`, `docs/engenharia_reversa/FATIA-05_LAYOUT/auditoria_05/c2/` (**não** `shot.tmp.mjs`).
6. Commit `feat(side-bar): container à direita com sash 4 px e persistência` com `git -c user.name="Arena Agent" -c user.email="agent@arena.local" commit …`.
7. **Parar. Relatório binário no chat** (verificado / mudou / passou / falhou / falta). Aguardar OK.
8. Só então c3, começando por reportar §4 e obter P2.

---

## 8. Medidas ainda "não medidas — validar na homologação"

Preenchidas pela raspagem externa (`05_02`): painel maximizado (`x=348 y=35 w=752 h=843`, mantém Side Bar e Activity Bar), Side Bar máx 1132 em janela larga, badge SCM 16×16 / fonte 9 px / raio 20.
Continuam abertas: hover/tooltip dos ícones da Activity Bar (texto e atraso), menu de contexto do título da Side Bar, comportamento exato do foco após Ctrl+B, animação (inexistente no real — confirmado, não implementar).
