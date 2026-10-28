# 09 - TESTES E AMBIENTE (da IA)

> **Leia a §1 antes de rodar qualquer spec.** Specs de fixture (`12*`, `13*`, `14*` menos `14b_git_smoke`) **só na 5175**; na 5174 elas apagam arquivos reais do repo. Um Vite por vez (RAM). Reseed antes de cada spec de fixture.


**Reorganizado:** 2026-10-03 (antigo `26`) · **Atualizado:** 2026-10-28 (D98 em investigação; D121/F1–F5-B preservados) · **Data original:** 2026-09-29 · **Escopo:** `platform/apps/workbench-v2/` (Playwright + Vitest). Estado vigente: F2/F4 permitem caminhos externos solicitados sob permissões normais do SO; workspace é base para paths relativos, não barreira. Node.js direto, sem helper nativo; `criar` exclusivo, `escrever` exige leitura prévia e confere fingerprint, exclusão bloqueada. Modo Perguntar/Planejar não muta; Agir/Editar registrados não pedem aprovações repetitivas; payload de execução não amplia grants. Suíte direcionada F1–F5-B: 22 arquivos, 223 passaram/17 skip; App 47 passou/13 skip; discos/território/rotas/frontier + F3 streaming/parada 52/52; typecheck passou. F1, F3 e F5-A não foram enfraquecidas; apenas `verified` válido habilita Agir, `declared` opcional por D120. Limite TOCTOU para processo malicioso da mesma conta explicitamente aceito/documentado. Vitest amplo já executado: 121 arquivos (117 pass/4 fail), 962 testes pass/12 fail/20 skip; build passou `tsc -b` e Vite abortou por OOM. Código/testes em `3ff0c60`; Reteste Windows independente documentado abaixo; homologação humana permanece pendente. D98 em investigação, sem mudança de produção/SPEC aprovada; Fatia 13 não iniciada. Sem provedor/credencial real ou push.

**Snapshots abaixo de 3.12–3.16:** resultados e roteiros anteriores a D121 permanecem para histórico. Onde exigem confinamento físico ao workspace, bloquear todas as operações ou provam CAS universal, não são os critérios correntes F2/F4. Use a seção 3.17 D121 ao fim.
**Por que este documento existe:** duas IAs independentes gastaram turnos inteiros redescobrindo as mesmas regras de ambiente, e uma delas **apagou 206 arquivos reais** por rodar a suíte errada contra o servidor errado. Tudo o que está aqui foi vivido, não suposto. Fontes: sessão de trabalho do agente Arena (FATIA-04/05) e a auditoria externa `docs/arquivo_morto/engenharia_reversa/FATIA-05_LAYOUT/05_02_auditoria_externa_suite_e2e_e_raspagem.md`.

---

## 1. Os dois mundos (LEIA ANTES DE RODAR QUALQUER SPEC)

| Mundo | Servidor | O que ele expõe | Quem roda nele |
|---|---|---|---|
| **5174 — repo real** | `npm run dev` (em `platform/apps/workbench-v2`; liga em `127.0.0.1`, porta 5174; `baseURL` padrão do `playwright.config.ts`) | O próprio `/home/user/agente_window` via plugins fs/git | Specs de **shell/terminal** e `sessao_14b_git_smoke` |
| **5175 — fixture descartável** | `FS_TEST_ROOT=/tmp/explorer-fs-fixture npx vite --port 5175 --strictPort` (sem `--host`; bind loopback do config) | A pasta `/tmp/explorer-fs-fixture/e2e-fixture-root/` (semeada pelo teste) | Specs de **módulo** (12, 13, 14, 14b_*, 14c, 14d, 15) com `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175` |

### ⚠️ Regra de ouro
**Specs de fixture (12*, 13*, 14*, 14b_backend, 14b_changes, 14c, 14d) fazem rename/delete/discard/git-init na árvore que o servidor expõe. Rodá-las contra a 5174 destrói arquivos do repositório real.** Foi assim que `legacy/` (206 arquivos) foi apagado em 2026-09-29 (restaurado via `git checkout`). Nunca omita o `PLAYWRIGHT_BASE_URL` para elas.

Só `sessao_14b_git_smoke` opera de propósito no repo real (cria e apaga `e2e-smoke-<pid>.txt`), e `sessao_11_terminal_interactive_v2` precisa do repo real por causa do PTY.

---

## 2. Inventário completo — 33 arquivos / 195 testes (atualizado 2026-10-17: + `fatia08_modo_abertura` com 4 e + `conversa_fatia09` com 5)

### 2.1 Anti-regressão OBRIGATÓRIA em todo commit da FATIA-05 (`docs/arquivo_morto/24_PLANO_FATIA-05_CHASSIS_RIGHT.md §9`) — 12 suítes / 115 testes
| Spec | Testes | Mundo | Observação |
|---|---|---|---|
| `sessao_11_terminal_pty_real` | 6 | 5174 ou 5175 (não usa fs) | terminal homologado — **intocável** |
| `sessao_11_terminal_interactive_v2` | 3 | **5174** | idem |
| `sessao_12_explorer` | 30 | 5175 | **muta a árvore** (renomeia/apaga/cria) → reseed depois; T9 (X do Open Editors no hover) é flaky, re-rodar |
| `sessao_12_explorer_fs_backend` | 10 | 5175 | exige `seed.txt` intacto → reseed antes |
| `sessao_13_search` | 14 | 5175 | "across M files" ocasionalmente flaky |
| `sessao_13_search_backend` | 6 | 5175 | |
| `sessao_14_editor_anexo` | 16 | 5175 | T10 depende da seed; T13 flaky (`ECONNRESET` visto 1×); 16/16 desde o c2 (RF-09) · **5.7 (`9a11319`, autorizado 2026-10-01): T1/T2/T3/T14/T15/T16 reescritas para as regras novas** — teto 50 % (era 75 %), piso do chat 420, "Detalhes" colapsa na 1.ª aba e é exclusiva com o editor na faixa fina (`collapseDetails()` no preâmbulo); larguras-alvo 330/280 (cabem em 1400 px) |
| `sessao_15_editor_maximize` | 3 | 5175 | **5.7 T30–T32** (`9a11319`): clique real em `seed.txt` (pasta `e2e-fixture-root` começa fechada → helper expande) → editor fino sem F5, Detalhes 0 px, chat ≥ 420 e ≥ 50 % da faixa `.top-right-section`; ⤢ → chat/Side Bar escondidos, anexo ≥ faixa − 12, `editorMaximized` em `workbench.layoutState.v1`, F5 + reabrir mantém; restaurar devolve largura ±2; Browser ativo não bloqueia (mede o **centro** `.main-surface`, pois o Browser divide o PanelGroup com o chat). Só lê a fixture. **Entra na bateria obrigatória (16 suítes)** |
| `sessao_14b_git_changes` | 11 (**9 + 2 skip** desde 5.3) | 5175 | `afterAll` apaga `.git` da fixture → reseed depois · 5.3: SCM lida na Side Bar; T1/T5 `test.skip` (lógica da aba do anexo, D2.60) |
| `sessao_14b_git_backend` | 7 | 5175 | |
| `sessao_14b_git_smoke` | 1 | **5174** | repo real, autolimpa |
| `sessao_14c_diff_minimal` | 6 (**2 + 4 skip** desde 5.3) | 5175 | faz git-init da raiz da fixture; reseed antes · 5.3: T1/T3/T5/T6 `test.skip` (lógica da aba Changes do anexo, D2.60); T2/T4 verdes |
| `sessao_14d_commit_input` | 5 | 5175 | |

### 2.2 Spec da FATIA-05 em construção
| `sessao_15_outline_timeline` | 4 | 5175 | **5.6 T26–T29** (`7d05c7d`): Outline de `outline.ts` (4 símbolos, `aria-level`, codicon, clique → `active-line-number` 6), `.txt` → frase padrão, Timeline de `gitot/hist.txt` (2 commits, clique → diff `hist.txt (sha7)` v1→v2), sem histórico/sem repo → frase padrão. `beforeAll` cria `.git` na raiz da fixture (só `gitot/` commitado) + `outline.ts`; `afterAll` apaga → reseed depois. Diff inline: linhas removidas ficam em `.view-lines.line-delete` dentro do `.editor.modified` — filtrar com `:not(.line-delete)`. **Entra na bateria obrigatória (15 suítes)** |
| `sessao_15_drag_drop_views` | 6 | 5175 | **5.5 T20–T25** (T25 = ícones da Activity Bar arrastáveis, `4e10381`) (DnD Side Bar ↔ Views Panel via `dispatchEvent` + `DataTransfer` sintético — §4.2; T24 abre o terminal só para provar que ele não aceita drop) — **5/5** desde `1f1ed79`; **entra na bateria obrigatória (14 suítes)** |
| `sessao_15_activity_bar` | 21 | 5175 | **T16–T20 (5.4: menu de contexto Move Activity Bar, Left/Right reposicionam, F5 mantém, views/badge com `left`, Top/Bottom desabilitados D2.64; cria fixture git própria `gitab`)** — **21/21** desde `7bd528b` · **5.7: T4b agora exige chat ESCONDIDO no maximizado** (D6); **T8/T9 ganharam espera de painel+foco antes de digitar** — na bateria cheia o texto caía no chat 3× (nunca isolado); 21/21 ×2 depois · T8 flaky 1× antes (busca) · **T10–T15 (5.3: SCM na Side Bar, diff no anexo, coexistência RF-06, badge git.count(), maquete ausente do DOM, Initialize Repository + Open Source Control)** — **16/16** desde `2bd6cc3` · T1 (c1) · T2/T3/T4/T4b-RF-09 (c2) · T5 (c3) · **T6–T9 (5.2: lupa ativa view, Ctrl+Shift+F abre Side Bar no Search, RF-06 resultado abre no anexo sem fechar o Search, foco/estado preservado)** — **10/10** desde `22a1523`; **faz parte da bateria obrigatória (14 suítes)** |

### 2.3 Specs do shell que passam mas NÃO estão na bateria obrigatória — 8 arquivos / 43 testes
`sessao_01_sessions_core` 5 · `sessao_02_sessions_list` 5 · `sessao_03_layout` 5 · `sessao_04_layout_controller` 5 · `sessao_05_single_pane` 6 · `sessao_06_mobile` 5 · `sessao_07_browser_editor` 5 · `sessao_09_bugs_criticos` 5 · `validacao3_sessao03_layout_controller_real` 4 (T4 já foi visto falhando em sessão anterior) · `gate0_validation` 1 · `debug_terminal_toggle` 1. Mundo 5174. Auditoria externa: **verdes** em `ba571dd`. Vale rodar ao fechar cada sub-fase (5.x), não a cada commit.

### 2.4 Os 13 testes MORTOS (5 arquivos + partes de 2) — pré-existentes, commit `75c6686` (2026-09-17)
| Spec | Falha | Por quê está morto |
|---|---|---|
| `sessao_08_filesystem` | 3 de 5 (T2, T3, T4) | espera a árvore demo "Workspace Files" e botões "Escolher pasta real do disco / Trocar pasta" — substituídos pelo módulo Explorer real na FATIA-04 |
| `sessao_10_custom_view_grid` | 3 de 6 (T3, T4, T5) | timeouts de click em F5/persistência da custom view |
| `sessao_11b_visual` | 1/1 | espera 2 abas em tablist "Terminais abertos" (rótulo pré-consolidação) |
| `sessao_11c_clear_active` | 1/1 | espera marcador `MAIN_CLEAR_*` no xterm ativo |
| `sessao_11d_split_sash` | 1/1 | espera `role=separator` "Redimensionar split do terminal" |
| `sessao_11e_theme_states` | 2/2 | espera `[data-pty-session-id$=":0"]` |
| `sessao_11f_context_menu` | 2/2 | ações do menu de contexto do terminal |

Todos testam rótulos/atributos do terminal **anteriores** à homologação `COMITE_HOMOLOGACAO_TERMINAL_V2` (`75c6686`). Mesma família das **9 falhas do Vitest** em `src/components/terminal/__tests__/TerminalPanel.test.tsx` (espera `role="region"` "Terminal"; `VSCodeTerminal.tsx` renderiza `aria-label="Painel Inferior"`).
**Destino decidido (2026-10-14, D74 — faxina em 2 ondas):** **onda 1** — os 13 E2E mortos são marcados como `skip` na **FATIA 07** (registro preservado; **não apagar**); **onda 2** — as **9 falhas do Vitest** (`TerminalPanel.test.tsx`, P4) são consertadas na **FATIA 16 — Terminal 2.0** (pós-D95), junto do transplante. Até as fatias correspondentes abrirem: **não gastar tokens investigando-os**; contam como "pré-existentes" e ficam fora do critério de verde.

**Onda 1 ✅ EXECUTADA (2026-10-15, FATIA 07, commit `9985b9e`):** os 13 viraram `test.skip` com 2 linhas de comentário acima de cada um (apontando este §2.4 e a FATIA 16, pós-D95). Skips da suíte: **6 → 19**. O contrato anti-trapaça (`src/__tests__/e2eAssertionContract.test.ts`) passou a aceitar `test.skip` como declaração de teste — e **endureceu**: spec com 100 % dos testes em quarentena precisa citar `docs/09` (senão reprova) — quarentena nunca silenciosa (**D79**). Confirmação Playwright: `sessao_08`+`sessao_10` = 3✓/6 skip/2✗ e `sessao_11*`+`sessao_05` = 13✓/7 skip/2✗ (as ✗ são as pré-existentes da §2.6).

### 2.5 Números esperados hoje
- **Baseline global histórico no HEAD `f2ff5a3`:** `npx vitest run` → **722 passed / 9 failed / 16 skipped**. As 9 falhas eram preexistentes em `TerminalPanel.test.tsx`; os 16 skips são os débitos D2.60. Mudança nesses 9/16 exige investigação; o número de pass pode crescer com testes novos. Os gates focados atuais do HEAD `a65a246` estão no cabeçalho e na §7.
- **Baseline 2026-10-15 (HEAD `9985b9e`, pós-FATIA 07 parcial):** `npx vitest run` → **730 passed / 12 failed / 16 skipped (758)** · typecheck **0**. As 12 falhas são todas pré-existentes (provadas com `git stash` no início da FATIA 07): **9** em `TerminalPanel.test.tsx` (P4 — onda 2 da D74 na FATIA 16 (pós-D95)) + **1** `iconLabels.test.ts` + **1** `themeTokens.test.ts` + **1** `visualStates.test.ts`. Os 16 skips são os débitos D2.60. O `pass` subiu 722 → 730 (4 testes novos da FATIA 07 + 1 do contrato + 3 de outra origem); nenhum teste novo falhando.
- **Falhas E2E pré-existentes FORA da lista §2.4 (triagem 2026-10-15) → §2.6:** 7 testes que falham **igual** no HEAD e em `e02e486` (A/B) mas **não** estão no §2.4 — portanto **não** foram marcados (marcá-los seria estender a onda 1, decisão do dono pendente).
- **Bateria §9 (14 suítes):** 5175 → 15 (16) · 13_search (14) · 13_search_backend (6) · 14 (16) · 14c (2 + 4 skip) · 14d (5) · 14b_git_changes (9 + 2 skip) · 14b_git_backend (7) · 12_explorer_fs_backend (10) · 11_terminal_pty_real (6) · 12_explorer (30); 5174 → 11_terminal_interactive_v2 (3) · 14b_git_smoke (1). **Verde duas vezes** na 5.2 e na 5.3 (pré e pós-commit).
- **Typecheck:** `npm run typecheck` (tsc -b --force) → **0 erros**. Não use `npx tsc` (sem node_modules instala pacote errado).
- **E2E completo** (auditoria externa em `ba571dd`, sem spec 15): 166/180 = 167 não-mortos verdes + 13 mortos + 1 flaky (12_explorer T9).

### 2.5.1 Baseline FATIA 08 (HEAD `fde5f0f`, 2026-10-15)
- `npx vitest run` → **765 passed / 12 failed / 16 skipped (793)** · typecheck **0**. As 12 falhas são **exatamente as mesmas** da linha anterior (9 `TerminalPanel` + `iconLabels` + `themeTokens` + `visualStates`). O `pass` subiu 730 → 765: **+37** dos testes da casa nova (registro 6, repositório 13, sonda 13, fronteira LEGO 5) **−2** do `src/server/providers.test.ts`, removido junto com o código legado.
- **E2E da fatia:** `provedores_fatia08.spec.ts` **6/6** (ver §13) · `conversa_fatia09.spec.ts` **5/5** (FATIA 09 — streaming+Markdown+rodapé · Parar · F5+isolamento · erros honestos+varredura de chave · troca de provedor; roda contra o mesmo stub 4599 com o fio padrão de **600 ms/pedaço** e o cenário **LENTO** de 700 ms ativado pela palavra `LENTO` no pedido; caso (d) timeout 60 s é unit da C2, nota no spec).

### 2.5.2 Baseline 2026-10-17 (HEAD `f7b9035`) — pós A1 + D88 e homologação da FATIA 08
- `npx vitest run` → **767 passed / 12 failed / 16 skipped (795)** · typecheck **0**.
- As **12 falhas são exatamente as mesmas** de sempre: **9** `TerminalPanel.test.tsx` + `iconLabels` + `themeTokens` + `visualStates`. **Prova de que são pré-existentes:** A/B com `git stash` em 17/10 — **12 antes e 12 depois**, nos mesmos 4 arquivos.
- O `pass` subiu **765 → 767**: **+2** testes novos de persistência (D88) — `centerEditorMaximized` nasce em anexo e é lembrado no reload; layout antigo (sem a coluna) migra para anexo.
- **Trava nova (a que faltava no DEBT-04):** `e2e/fatia08_modo_abertura.spec.ts` — **4/4** (`T1` geometria da landing com aba aberta · `T2` editor maximizado → Provedores maximizado · `T3` reload preserva o último modo · `T4` padrão de fábrica = anexo).
- **Regras aprendidas nesta rodada (não repetir o erro):**
  1. O **contrato anti-trapaça** (`e2eAssertionContract.test.ts`) exige `test(` com **2 espaços** no início da linha; spec fora da convenção reprova a suíte.
  2. A **fixture de provedores** precisa estar em **v2** (`{"versao":2,"ativo":null,"provedores":{}}`); em v1 a tela mostra "Formato não reconhecido".
  3. A primeira execução de uma spec nova costuma falhar **por Vite frio** (compilação na primeira visita) — re-rodar antes de investigar.
  4. Specs que usam o stub de provedor exigem o **stub na 4599 no ar**; sem ele, T2/T4/T5 da bateria 08 falham por conexão recusada (não é regressão).

### 2.6 Falhas pré-existentes FORA do §2.4 — triagem 2026-10-15 (decisão do dono pendente)
Encontradas ao rodar a suíte com o seed de sessões correto (ver §3.6). **Não** estão na lista canônica do §2.4, então **não** foram marcadas como `skip` (seria estender a onda 1, D74). Cada uma foi conferida no **A/B `e02e486`** (falha idêntica nos dois estados → pré-existente, não regressão da FATIA 07):

| Spec | Teste | Sintoma (15/10) |
|---|---|---|
| `sessao_01_sessions_core` | T2 — "Nova sessão cria exatamente uma" | o clique em "Nova sessão" **abre a landing** e a linha nasce só no envio; o teste espera a linha na hora (expectativa anterior à landing atual) |
| `sessao_01_sessions_core` | T3 — "ativa persiste após F5" | com 5 sessões no banco, o ativo volta para outra sessão após o F5 (passa com 3 – sensível à composição do seed/timing de persistência) |
| `sessao_08_filesystem` | T1 — "detecção da File System Access API" | espera uma aba **"Files"** que não existe desde o Explorer da FATIA-04 (mesma família do T2–T4 do §2.4) |
| `sessao_09_bugs_criticos` | T5 — "arrastáveis + fixar/arquivar (R-085)" | timeout de 30 s no caminho do menu de contexto |
| `sessao_10_custom_view_grid` | T1 — "AI Customizations cobre Aux" | a `.auxiliary-bar` fica **hidden** após "Abrir alterações"; o teste espera visível |
| `sessao_05_single_pane` | T2 — "aba Browser esconde o detail panel" | a `.auxiliary-bar` **continua montada** (count 1, esperado 0) |
| `sessao_05_single_pane` | T6 — "resize só na Sessions Part" | o chat não absorve o delta de 240 px (absorveu menos de 200) |

**Leitura:** T1 do `sessao_08` parece da mesma família morta do §2.4 (aba "Files" pré-FATIA-04); T1 do `sessao_10` e T2 do `sessao_05` discutem a **visibilidade da Aux** — podem ser a **mesma causa raiz** (uma real, a investigar). T2/T3 do `sessao_01` e T5 do `sessao_09` parecem **expectativa desatualizada/timing**. Nada disso é da FATIA 07; decidir quando abrir a fatia que tocar cada área (**FATIA 16/17 (pós-D95)**) — ou marcar como `skip` com registro, se o dono autorizar a extensão da onda 1.

#### Investigação dos 2 suspeitos da Aux (2026-10-15, ordem do dono — "opção C"): **veredito = expectativa morta, não bug**
Método: leitura do código + sonda `validacao_fatia07/sonda_05_aux_bar.cjs` (Playwright, observação pura) + decisões homologadas. **Fatos medidos ao vivo** (0 pageerrors):
| Passo | `.auxiliary-bar` | Abas do editor |
|---|---|---|
| boot | no DOM, `display:flex`, **largura 0 px** | nenhuma |
| "Abrir alterações no editor" | igual (largura 0) | abre **aba** `diff` "Branch Changes" (selecionada) |
| "Abrir navegador no editor" | **continua montada** | abre **aba** `browser` "Browser" (selecionada) |

**Por que os testes estão velhos:** a coluna "Detalhes" da `AuxiliaryBar` foi **removida de vez** (5.8-c1, 2026-10-02 — D2.50), a homologação 5.7 fixou "**fechar aba nunca desmonta a AuxiliaryBar**; **sem 'Detalhes' com 0 arquivos"** e o campo `auxiliaryVisible` é hoje **constante `false`** no shell (D2.72 — limpeza reservada à FATIA 18 (era 14 pré-D95), "só limpeza"). Hoje a `.auxiliary-bar` é **a casca do Editor Anexo**: sempre montada quando o módulo existe (Regra 10: `display`), recolhida com largura 0. E "Abrir alterações" abre **aba** no editor por decisão (E10/R-083: "a Changes pill revela explicitamente o editor"). Os dois specs são de **17/09** (`75c6686`) — **anteriores** à remoção.
→ **`sessao_10 T1`** espera a coluna antiga **visível** ao abrir alterações; **`sessao_05 T2`** espera a coluna antiga **desmontada** ao abrir o navegador. Ambos contradizem decisões já homologadas.

**Aplicado (15/10, D80 — decisão do dono, opção "só os 2"):** `sessao_10 T1` e `sessao_05 T2` estão em **quarentena `test.skip`** com nota (registro preservado; "expectativa morta, sem conserto previsto"). Os **5 restantes continuam vermelhos** e registrados nesta §2.6 — dois deles podem ser problema real (`sessao_09 T5` arrastar/fixar e `sessao_01 T3` sessão ativa após F5) e por isso **não** foram silenciados. Skips da suíte E2E: **19 → 21**.

---

## 3. Receita do ambiente (por turno — o sandbox é recriado a cada mensagem do usuário)

O que **some** entre mensagens: `node_modules`, browsers do Playwright, runtime do code-server (`/home/user/.cache`), `/tmp` (fixture), todos os processos. O que **fica**: arquivos em `/home/user` fora das pastas de cache.

### 3.1 Instalar
```bash
cd /home/user/agente_window/platform && npm install            # ~1–2 min
cd apps/workbench-v2 && npx playwright install chromium         # + sudo npx playwright install-deps chromium se faltar lib
sudo sysctl -w fs.inotify.max_user_watches=1048576 fs.inotify.max_user_instances=1024
```
### 3.2 Servidores — sempre via `start_process` (nunca em bash de fundo), bind compatível com o escopo
- Fixture: `FS_TEST_ROOT=/tmp/explorer-fs-fixture npx vite --port 5175 --strictPort` (sem `--host`; `vite.config.ts` mantém `127.0.0.1`).
- Repo: `npm run dev` (em `platform/apps/workbench-v2`, `127.0.0.1:5174`). Não sobrescrever Host/bind com flags externas.
- **Estado de segurança atualizado (F1, 2026-10-26):** Vite/preview usam loopback e boundary local valida Host/Origin; grants/contexto de sessão/workspace são server-side. Na fixture isolada, GET same-origin 200; PUT cross-origin 403; POST sem Origin 403; Host inválido 403; upgrade WebSocket PTY com Origin hostil rejeitado. Nenhum processo LAN/code-server foi iniciado. O registro D105 abaixo descreve a inspeção estática anterior à alteração, não o estado atual.
- `/home/user/restore-code-server.sh` continua usando `--bind-addr 0.0.0.0:8080 --auth none` quando executado; code-server é ambiente de medição separado, não proteção das APIs do produto, e não deve ser iniciado/alterado sem escopo explícito. O PTY server usa `PTY_HOST || 127.0.0.1` como padrão no código; serviço standalone não foi alterado nem testado nesta F1. Acesso local e autorização por operação são requisitos separados (D103/D105).
- **Aquecer** com uma carga manual antes da bateria (cold-start Vite+Monaco > 30 s de timeout do 1º teste).
### 3.3 Reseed da fixture (antes de CADA spec de fixture)
Não apague a raiz `/tmp/explorer-fs-fixture` — o watcher do Vite 5175 morre e a 1ª requisição falha. Apague **só o conteúdo** e re-semeie. Função pronta: `reseed()` em `platform/apps/workbench-v2/run-antiregressao.sh` (`bash -c 'source <(sed -n "/^reseed()/,/^}/p" run-antiregressao.sh); reseed'`).
### 3.4 Ordem da bateria §9 que cabe na RAM (~1,9 GB, sem swap)
1. code-server 8080 **desligado**.
2. Subir 5174 → rodar `sessao_11_terminal_interactive_v2`, `sessao_14b_git_smoke` (`--workers=1`) → **derrubar 5174**.
3. Subir 5175 → para cada spec: reseed → `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175 npx playwright test e2e/<spec> --workers=1 --reporter=line`.
4. `npm run typecheck`; `npx vitest run`.
5. Religar o 8080 no fim (`/home/user/restore-code-server.sh` com `TMPDIR=/home/user/.cache/tmp`, ~2–3 min).
`run-antiregressao.sh` faz o passo 3 em série; os itens do passo 2 ele espera já no ar — **não deixe os dois Vite juntos durante 14/14c** (§4.1).
### 3.5 Comandos que valem
- Um spec: `npx playwright test e2e/sessao_14c_diff_minimal --workers=1 --reporter=line` (o `-g` vazio roda a suíte inteira; o glob `sessao_12_explorer` também casa `_fs_backend`).
- Sempre `timeout ≤ 700` no wrapper e saída para arquivo de log quando a suíte for longa (o pipe morre com o wrapper e perde o resumo).
- Órfãos após interrupção: `pgrep -f "playwright test|workerProcessEntry|chrome-headless-shell"` e matar por PID (**nunca** `pkill -f` com padrão que case o próprio shell).
- Print de tela sem travar: `node shot.tmp.mjs <url> <png>` (utilitário local, não versionado) ou Playwright com `clip` e esperando `.agent-sessions-workbench` — `networkidle` nunca fica idle com o Vite.

### 3.6 Seed de sessões para os specs de 5174 (descoberto em 2026-10-15) — senão, falha em massa
`resetApp` (`helpers.ts:58`) espera `.session-row`: **sem ≥1 sessão no banco, toda spec falha** (foi a causa das "18 falhas" da triagem da FATIA 07). Receita que ficou verde:
1. **5 sessões** (o `sessao_01 T1` exige **≥5** linhas), **todas na mesma pasta** e essa pasta **dentro da raiz do 5174** (`repoRoot = /home/user/agente_window` — `vite.config.ts`; na prática usei `platform/apps/workbench-v2`).
2. **Por que a mesma pasta:** a raiz ativa do `explorer-search` é a pasta da **sessão ativa**; pasta de outra sessão fora dela → `GET /fs/list` responde **403** e specs que conferem o console (`sessao_01 T5`, `sessao_11_terminal_pty_real T1`) falham por tabela. Com o seed em `/tmp` isso acontecia — **não** é bug do produto.
3. **Persistência atrasada:** depois do Enter na landing, esperar **~2,5–3 s** antes de fechar o navegador, senão o `PUT /api/sessions` **não sai** e o banco fica vazio. Com sessões já existentes, abrir a landing exige clicar em **"Nova sessão"** (`landingVisible = newSessionLanding || !hasSessions`).
4. **Banco:** `~/.agente_window/agente_window.db` (tabela `sessions`); conferir com `GET /api/sessions`; limpar com `DELETE /api/sessions/<id>?force=true`. **Cuidado:** `sessao_09 T3` apaga uma sessão no meio da rodada — re-semear entre lotes.

### 3.7 Régua pós-MVP — 08→09→10→11→12 em série (receita 20/10, +12 em 21/10 C2)
- **Browsers:** `PLAYWRIGHT_BROWSERS_PATH=/opt/playwright/browsers` (já vem com chromium) — `npx playwright install` FALHA (lock sem permissão) e não é preciso.
- **Stubs (fora do repo, `start_process`):** `node /home/user/uploads/stub_provider.cjs` (4599 — 08/09) + `node /home/user/uploads/stub_agir.cjs` (4610 **v3+12** — 10/11/12; v3 tem `TETO_INFINITO`, a 12 somou os cenários `EXCLUIR_*`).
- **Vite:** `AGENTE_WINDOW_PROVIDERS_PATH=/tmp/prov-fixture/providers.json AGENTE_WINDOW_SETTINGS_PATH=/tmp/f11-e2e-settings.json npm run dev` (local-only em `127.0.0.1:5174`; a 08 **amarra** o caminho `/tmp/prov-fixture/providers.json` — outro caminho = 6 fails no beforeEach; `mkdir -p /tmp/prov-fixture` antes).
- **Ordem canônica OBRIGATÓRIA** (uma spec por comando — múltiplos posicionais o Playwright ignora): `provedores_fatia08` → `conversa_fatia09` → `agir_fatia10` → `teto_fatia11` → `excluir_fatia12`. Esperado: **6/6 + 5/5 + 5/5 + 2/2 + 5/5 = 23/23**.
- **Por que a ordem importa (DEBT-21):** as specs dividem o armazém persistente (`.db` + memória do Vite + `*.jsonl`, sem fixture): sobras `AGIR-E2E-*`/`TETO-E2E-*`/`EXCLUIR-E2E-*` com pasta apagada quebram a 09 (clica a 1.ª linha → 409 workspace), e a T4 da 09 semeia bolhas "Chave inválida (erro 401)" que quebram a T4 da 08 (assert página-inteira). Higiene: DELETE nas sobras via `/api/sessions/<id>?force=true` antes da 09; neutralizar o texto nas `.jsonl` se a 08-T4 reclamar (Vite parado). **NUNCA zerar o banco** (`resetApp` exige ≥1 `.session-row` — banco zerado = falha em massa) e **NUNCA semear via `PUT /api/sessions`** (corpo mínimo quebra o boot da UI) — seed só pela UI (§3.6).

### 3.8 D98/PERF — investigação técnica e evidência inicial (2026-10-28; gate aberto)

**Autorização e limites.** Em 2026-10-28 o dono autorizou explicitamente a investigação sem o antigo pré-gate de validação documental. Isso libera somente investigação técnica: SCM + Explorer juntos, traces/instrumentação do app real, fixtures descartáveis e protótipo temporário. Não libera alteração de produção, aprovação de SPEC, Fatia 13, iniciativas M, push ou reabertura das Fatias 07–12/F1–F5-B. O Gate D98 continua aberto e esta rodada não é homologação. Mudança permanente exige SPEC quantitativa derivada das medições e aprovação explícita. A hipótese histórica de que “Git é rápido e a UI é gargalo” não é tratada como fato sem separar as etapas.

**Baseline e ambiente.** Branch `docs/capacidades-d102-alinhamento`, HEAD de código da rodada `59dfc32c99417136c9817984c81456803f296e58`; Linux x86_64/kernel 6.1.158, Node 20.20.2, Git 2.47.3, Vite 5.4.21, Playwright 1.63.0, Chromium Playwright revision 1243. RAM visível 1.982 MiB, sem swap; em uma tentativa Explorer 5k havia ~190 MiB disponíveis. Aplicação de teste somente em loopback **5175**, com `FS_TEST_ROOT=file:///tmp/d98-fixtures/...`; 5174 não foi usado. Fixtures criadas em `/tmp/d98-fixtures` (repos Git sintéticos, arquivos untracked; raízes e conteúdos descritos no pacote de evidências). HOME isolado em `/tmp/d98-home`. Nenhum projeto/dado real do usuário foi tocado. Code-server permaneceu parado. Após medições, servidor, Chromium e harnesses temporários foram encerrados/removidos.

**Protocolo e repetições.** SCM e Explorer foram exercitados no app via Playwright/CDP com trace real; cada sessão de UI é uma execução medida, portanto não há distribuição/repetições independentes para esses números. O isolamento de `GitHost`, `buildGroups`, parser, CLI e HTTP usou 7 amostras warm e p50; houve outliers compatíveis com JIT/GC. O harness `ChangesList` executou uma vez por combinação de volume/modo; o lado “real” importa o componente `ChangesList` atual, recebe o JSON real de `/git/status` e usa `buildGroups`; o protótipo cria uma janela visível temporária com o mesmo payload/API/fixture, mas não tem paridade completa de markup, interações/acessibilidade ou shell. Não é prova de ganho final do produto. Os traces/JSON sem alteração estão em `docs/arquivo_morto/auditorias_2026-10-28/d98/raw/`; fixtures podem ser recriadas pelo `generate-fixtures.mjs` no mesmo diretório.

**SCM/Git — etapas isoladas.** Medianas p50 em 7 amostras warm, por volume:

| Etapa medida | 5k | 10k | Observação |
|---|---:|---:|---|
| `GitHost.status` | 20,116 ms | 33,308 ms | Serviço local e fixture do cenário; não equivale ao tempo de UI. |
| `buildGroups` | 3,059 ms | 5,319 ms | Derivação dos grupos SCM em memória. |
| `parsePorcelainV2` | 0,290 ms | 0,611 ms | Parser isolado; outliers não entram na mediana. |
| Git CLI `status` | 6,169 ms | 9,999 ms | Etapa/processo diferente da API. |
| `POST /git/status` HTTP | 36,376 ms | 53,514 ms | Payload JSON de 650.045 B / 1.310.045 B; não comparar diretamente com CLI. |

**SCM — app e componente.** Na sessão do app real com 1k recursos: 1.000 entries, 1.002 linhas, 20.558 nós DOM. Seleção do workspace: 482 ms; view SCM pronta: 648 ms. Refresh: HTTP 412 ms, até paint 460 ms; scroll até dois `requestAnimationFrame`: 61 ms. Foram vistas três respostas `/git/status` de 130.045 B/1.000 entradas, com durações aproximadas 85, 30 e 4 ms. O trace tem 48.403 eventos (9.018.561 B descomprimidos; 708.115 B gzip). Foram observados 7 long tasks de 69–309 ms; o trace completo cobre boot, troca de workspace, seleção SCM e refresh, portanto esses tempos **não** são atribuídos todos ao SCM. Houve 52 commits React até a leitura após montagem e 54 ao fim; a instrumentação registra timestamps/contagem, não duração individual de commit. O indicador `crashed: true` sem timestamp não permite determinar se ocorreu durante a sessão ou no encerramento. Uma tentativa do app completo em 5k chegou ao badge `Source Control (5000)`, mas a view resultou em `Target crashed`; não houve trace/dump que prove OOM ou causa.

No harness isolado do `ChangesList` atual, 1k montou 1.002 linhas/20.052 nós de documento; React Profiler `actualDuration` 182 ms e long tasks de 192 e 106 ms. Em 5k montou 5.002 linhas/100.052 nós; `actualDuration` 998 ms, long tasks de 1.037 e 793 ms, JS heap CDP ~50,3 MB. O protótipo temporário, com 1k/5k/10k no mesmo payload por volume, manteve 26 linhas visíveis e ~370 nós no DOM, `actualDuration` inicial de 12,7 / 12,6 / 12,8 ms; ao rolar em 1k/5k, renderizou 26 linhas, ~382 nós e atualizações de 8,5 / 6,5 ms. Em 10k o JSON tinha 10.000 entries/1.310.045 B; no modo virtualizado não houve erro de console nem long task observada. Este A/B é evidência forte de que a lista atual cria custo de montagem proporcional à quantidade de linhas **no componente isolado**; as cifras do protótipo não garantem equivalência visual/funcional ou desempenho ponta a ponta. Os tempos de API foram uma amostra por página (p.ex. 14/15,3 ms em 1k e 39,2/79,8 ms em 5k); não são comparação estatística.

**Explorer — app real 1k.** Expandir `children-1000` levou 10.423,51 ms. Durante a expansão: 2 chamadas `/fs/list` iniciadas/concluídas e 1.004 `/fs/stat` iniciadas, com 891 respostas observadas; na sessão, 1.008 stats iniciadas, 895 respostas e 113 erros `ERR_INSUFFICIENT_RESOURCES`. A UI mostrou 1.003 linhas e 11.562 nós DOM, mas a presença das linhas **não** comprova que todos os metadados foram obtidos. Foram observadas 7 long tasks durante a expansão, máximo 368 ms; scroll até dois frames 66,87 ms; JS heap reportado ~33,95 MB. Trace: 88.374 eventos (16.140.833 B descomprimidos; 1.218.837 B gzip).

A tentativa Explorer 5k expirou após 60 s esperando `.agent-sessions-workbench` durante o boot; o `body` estava vazio, ocorreu uma falha `ERR_INSUFFICIENT_RESOURCES` e não houve `/fs/list` nem `/fs/stat`. O processo começou com memória disponível baixa (~190 MiB). Não chegou à expansão, não é uma medição 5k do Explorer e não prova que o produto falhe nessa escala; causa entre limite do sandbox, Chromium ou boot do app permanece indeterminada.

**Código observado e interpretação causal provisória.** `src/modules/explorer-search/core/treeState.ts`, em `TreeState.ensureResolved`, lista filhos e chama `fs.stat` para cada entrada em um `Promise.all` sem limite; `browserFsPort.ts` encaminha cada `stat` por HTTP. Isso explica estruturalmente a amplificação N-por-filho e é coerente com os 1.004 pedidos e 113 erros reais observados. Confiança **alta** de que esse padrão gera fan-out e contribuiu para erros/latência; **média** de que seja a causa predominante dos 10,4 s, pois transporte, serviço filesystem e render ocorrem na mesma janela e não foram isolados por intervenção controlada. `ChangesList.tsx` mapeia todos os recursos em DOM; `ExplorerView.tsx` achata/mapa todas as linhas visíveis. O A/B isolado sustenta com confiança **alta no componente SCM** que o render eager escala com N; confiança **média** de que ele explique sozinho o crash do app completo em 5k. Não há evidência suficiente para atribuir a causa do crash SCM 5k nem para afirmar que Git, React, DOM ou filesystem isoladamente expliquem todo o travamento. Nenhuma métrica confiável de CPU do processo/sandbox foi capturada; JS heap não equivale à memória residente total.

**Critérios para uma SPEC quantitativa futura.** Antes de propor limiares, repetir em ambiente com folga de memória, ao menos 3 execuções independentes por volume e ordem A/B controlada para SCM e Explorer (1k/5k/10k quando suportado), preservando failures; separar API/Git, `list`, `stat`, filas/concorrência, transformação, commit/render e paint. Capturar CPU e RSS do processo por método confiável, heap, long tasks, linhas/nós DOM, p50/p95, erros, tempo até utilizável e responsividade durante scroll/refresh. Validar funcionalidade, seleção, teclado, ações, ordenação, cancelamento e estado de erro do protótipo antes de qualquer escolha de arquitetura. Só então derivar em SPEC metas explícitas de tempo/erros/recursos com justificativa e testes de regressão; aguardar aprovação do dono antes de produção. Esta rodada não define metas, não aprova arquitetura e não fecha D98.

**Não fazer:** não usar 5174/projetos reais; não alterar produção; não iniciar Fatia 13 ou iniciativas M; não misturar pendências F1–F5-B com D98; não declarar a tentativa Explorer 5k como resultado; não transformar protótipo, benchmark sintético ou hipótese em causa provada/homologação. Parar para revisão independente após entregar a síntese.

### 3.8.1 D98 — validação independente Windows (2026-10-28; sem otimização de produção)

**A. Baseline/ambiente.** Branch `docs/capacidades-d102-alinhamento`, HEAD `fd913db3d442511ae40a1d94ea2a2dfaaab88f4e` confirmado; código de produção idêntico ao baseline anterior `59dfc32`. Havia uma edição local preexistente no último parágrafo do reteste Windows F1–F5-B; foi preservada separadamente. Windows 11 Pro 23H2/build 22631.6199, i5-10400 (6 cores/12 threads), RAM visível 16.602.528 KiB (~15,83 GiB); livre no snapshot durante o piloto 1.520.528 KiB (~1,45 GiB), sem medição contínua do mínimo. SSD SATA Kingston SA400S37240G, C: NTFS, ~9,94 GB livres no início. Node 24.16.0, npm 11.13.0, Git 2.44.0.windows.1, Edge headless 156.0.4314.50, viewport 1400×900. Máquina compartilhada com outros processos; não foi obtido ambiente Windows ocioso nem desativado antivírus/indexação. Não há evidência que atribua um resultado específico ao antivírus. Nenhuma configuração global alterada.

**B. Critérios consultados.** D98/D99 e autorização de 28/10 em `05`; micro-fatia PERF em `06`; protocolo `09 §3.8` e D101 §3.10; homologação humana em `08`. Investigar SCM+Explorer juntos, conferir hipótese com trace e protótipo em fixture, separar backend/render/recursos, derivar SPEC quantitativa e aguardar aprovação. Não existe SLA numérico aprovado. Terminal, App, Explorer core/server e demais fontes de produção permaneceram intactos. Fatia 13, iniciativas M e F1–F5-B não foram abertos nem corrigidos.

**Pacote/reprodução:** `arquivo_morto/auditorias_2026-10-28/d98/windows/README.md`, scripts, `results-summary.json`, `environment.json`, `manifest.json` e `raw/` (JSON/logs comprimidos sem reserialização; traces CDP gzip originais). Dados temporários e fixtures fora do repo: `C:\Users\Usuario\.codex\visualizations\2026\10\27\01a17f37-97c4-74a2-87bb-d6fbbbe5b243\d98-windows-20261028`. Nenhum arquivo pessoal, provedor ou credencial real acessado. Um Vite por vez, somente 127.0.0.1:5175, HOME/USERPROFILE/arquivos de configuração isolados. `start_process` não está disponível nesta sessão; subprocessos Node controlados, com timeouts de operação, encerrados ao final.

**Método.** Fixtures SCM com 1k/5k/10k arquivos untracked e um sentinel tracked; Explorer com duas pastas de 1k/5k arquivos. Um piloto manteve os 6k untracked, como o gerador Linux; para o A/B principal os arquivos do Explorer foram commitados somente no repo fictício, separando o custo da lista SCM oculta. Essa diferença impede comparar diretamente o tempo Windows com os 10,4 s Linux. O Windows não recebeu o protótipo Linux (não versionado); foi criado outro, reutilizando o markup e callbacks atuais das linhas SCM, sem biblioteca nova.

Instrumentação e experiências são transformações de módulos em memória por plugin Vite externo, não edições nas fontes. Explorer: mesmo wrapper de medida nos dois braços; original sem limite versus fila de 16 operações `stat` completas (inclui leitura/parse do JSON). SCM: Profiler externo e janela temporária de 32 recursos, usando as mesmas linhas/ações. Foram feitas quatro execuções por braço/volume no app: r1 com trace, r2–r4 sem trace; alternância A/B no Explorer. Tabelas usam **três amostras independentes sem trace**; p95 é o quantil empírico superior dessas três, na prática o máximo observado, não estimativa robusta de SLA. Backend: uma amostra de aquecimento e sete warm por volume. Componente isolado: três amostras por braço/volume, ordem A/B alternada. Cache de disco/Vite não foi esvaziado; não chamar de cold boot. SCM real e experimental foram rodados em blocos separados, possível efeito de ordem/cache.

Medições: requisições até corpo concluído, filas/concorrência, erros, long tasks via PerformanceObserver, atraso de timer de 50 ms como proxy de responsividade, DOM, JS heap e métricas CDP de CPU/TaskDuration. CPU CDP não equivale a percentual global do Windows; JS heap não é RSS nem memória total. RSS/peak resident e mínimo contínuo de RAM **não foram medidos**. A medida de scroll é deslocamento até dois RAF, não uma sessão longa de scroll com frame time distribuído. As falhas e amostras com trace ficaram preservadas.

**C. Explorer, aplicativo real — conclusão de linhas e metadados.** A conclusão exige N operações terminadas e sem erros, não apenas linhas no DOM. Cada expansão gerou uma listagem e exatamente N stats; todos terminaram com sucesso nos dois braços Windows.

| Volume | Braço | Total p50 / p95 | Pico HTTP stat | Falhas de stat/transporte | DOM do documento |
|---|---|---:|---:|---:|---:|
| 1k | original | 1.098 / 1.129 ms | 1.000 | 0 | ~11,6k |
| 1k | limite 16 | 1.107 / 1.419 ms | 16 | 0 | ~11,6k |
| 5k | original | 5.018 / 5.029 ms | 5.000 | 0 | 55.668 |
| 5k | limite 16 | 5.128 / 5.153 ms | 16 | 0 | 55.668 |

Em 5k, a janela entre primeiro stat e último stat terminado teve mediana **3.289 ms original / 3.565 ms limitada**; do último stat ao snapshot após paint, ~**1.637 / 1.424 ms**. São janelas observadas com transporte/parse/render sobrepostos, não uma decomposição aditiva de CPU ou percentual causal puro. Limitar não acelerou o total: ~+0,8% em 1k e +2,2% em 5k, variação sem demonstração estatística de regressão. A contenção do pico, de 5.000 para 16, é comprovada. Não houve erros em Windows para comprovar melhora da taxa de erros.

A soma mediana das long tasks 5k caiu aproximadamente de 2,45 s para 1,40 s, mas o máximo ainda foi **949 ms original / 871 ms limitada**. Timer de 50 ms atrasou até **1.600 / 1.445 ms**. A interface responde depois, porém não permanece continuamente fluida durante a expansão. Scroll após a conclusão: mediana ~29/30 ms; heap ~82,0/80,6 MiB. TaskDuration CDP durante a operação: mediana ~3,74/4,27 s, sem alegar CPU global. Portanto há custo substancial no cliente além da simultaneidade de requests.

A amostra 5k original **com trace** levou 14.800 ms, versus 5.202 ms limitada; o trace registra ~309k/~312k eventos. Esse contraste não foi usado como ganho de 3×: as três amostras sem trace não o repetem. Há interação provável com a captura/pressão de eventos ou outro estado transitório; a causa exata do outlier não foi provada. Nenhuma medição falhou no boot/expansão 5k desta rodada Windows.

**Interação Explorer/SCM:** no piloto Explorer 1k com 6k untracked, houve 6.000 linhas SCM presentes antes de selecionar SCM e ~131.626 nós DOM; expansão ~1.298 ms. No A/B com Git limpo, SCM tinha zero recursos e DOM Explorer 1k ~11,6k. O `ChangesList` pode estar montado oculto, contribuindo para memória/boot mesmo com Explorer ativo. A confirmação não permite atribuir exatamente quantos ms do piloto pertencem à lista oculta; não subtrair execuções distintas como prova causal.

**D/E/F. SCM, aplicativo real e componente isolado.** No app, o serviço já carregara os recursos e a lista oculta antes da ativação de SCM. A coluna “ativar” mede clique da Activity Bar até linhas/estado e dois RAF: **não é boot total nem tempo desde escolha da pasta**. O Profiler confirma o primeiro render com N recursos mesmo antes de abrir SCM. A experiência virtualizada foi aplicada somente pelo plugin de diagnóstico; não entrou no produto.

| Volume | App original: ativar p50 | App janela: ativar p50 | DOM original → janela | Heap JS original → janela |
|---|---:|---:|---:|---:|
| 1k | 247 ms | 81 ms | 20.673 → 1.411 | ~38,0 → 24,7 MiB |
| 5k | 1.014 ms | 84 ms | 100.720 → 1.411 | ~69,2 → 25,9 MiB |
| 10k | 1.774 ms | 82 ms | 200.767 → 1.411 | ~129,9 → 27,3 MiB |

Todos os 12 cenários por braço do app completaram (r1 com trace + r2–r4 sem trace), sem crash/erro de API registrado. Maior long task observada até a leitura pós-abertura: 177/818/1.680 ms no original (1k/5k/10k), contra 152/148/148 ms no experimental; esses máximos incluem boot/contexto e não são exclusivamente SCM. Primeiro render Profiler com N recursos: ~164/685/1.349 ms original, ~7/11/7 ms janela. Os dados do refresh mostram duas atualizações de lista (loading e resultado); os tempos e commits individuais estão nos JSON. `refreshObservedMs` inclui uma espera fixa de 800 ms do harness: **não é benchmark exato de refresh até utilizável**. Scroll após carga: medianas original 22/50/85 ms, janela ~35 ms. Em 1k o scroll sintético virtual foi mais lento; não esconder esse resultado.

No componente isolado, montagem síncrona e atualização controlada até dois RAF:

| Volume | Montagem p50 atual → janela | DOM atual → janela | Atualização p50 atual → janela |
|---|---:|---:|---:|
| 1k | 173 → 21 ms | 20.048 → 692 | 163 → 39 ms |
| 5k | 729 → 20 ms | 100.048 → 692 | 767 → 42 ms |
| 10k | 1.464 → 19 ms | 200.048 → 692 | 1.736 → 35 ms |

A evidência de ganho não ficou restrita ao componente: também apareceu ao ativar SCM no app real. Ainda assim, o markup do protótipo envolve viewport/spacers e reduz grupos; ganho não prova equivalência funcional. Os ~370 nós do protótipo Linux e os 692 desta janela Windows são experimentos diferentes, não regressão do mesmo protótipo.

**Git/API isolados, p50 de sete amostras warm (mesma fixture Windows por volume):**

| Volume | Git CLI | GitHost.status | HTTP /git/status | buildGroups | Parser | Bytes JSON |
|---|---:|---:|---:|---:|---:|---:|
| 1k | 43,2 ms | 82,5 ms | 86,2 ms | 0,23 ms | 0,08 ms | 230.045 |
| 5k | 49,1 ms | 99,6 ms | 142,1 ms | 0,85 ms | 0,29 ms | 1.150.045 |
| 10k | 58,2 ms | 132,1 ms | 203,8 ms | 2,05 ms | 0,86 ms | 2.310.045 |

GitHost executa também rev-parse/validação e transformação; HTTP adiciona serialização/transporte. São camadas distintas, não valores intercambiáveis. As APIs Windows foram mais lentas que as medianas Linux publicadas; versões, máquina, payload e caminhos diferem. A longa raiz temporária Windows aumenta URIs/JSON; não atribuir todo o delta ao SO/Git. Parser/buildGroups não são o gargalo dominante observado nesses volumes; ~204 ms de API em 10k ainda importa e não deve ser chamado “zero”.

**Funcionalidade e estabilidade:** no componente atual, **10/10** verificações dirigidas passaram. Na janela experimental, **7/10** passaram: clique/Enter mantém callback de abrir; Tab alcança ação; stage/unstage reais via HTTP 204 funcionam; refresh mantém os 1.000 recursos; bytes são preservados; árvore continua exposta semanticamente. **Três reprovações do protótipo:** badge mostra apenas o subconjunto visível; foco se perde quando a linha sai da janela; não alcançou corretamente o último arquivo após stage/unstage/refresh. Preservar callbacks/role não demonstra acessibilidade completa: leitor de tela, posições totais, seleção/foco fora da janela, navegação cruzando fronteira e grupos/actions globais ainda exigem aceite. Não aprovar o protótipo para produção.

No aplicativo original, **9/9** verificações de estabilidade passaram: criação observada automaticamente pelo Explorer, criação/modificação vistas no Git, remoção observada pelo Explorer, SCM atualizado enquanto Explorer estava ativo, stage/unstage reais, retorno a Git limpo e bytes originais restaurados. Somente fixtures foram modificadas; conferência final dos 22.000 arquivos gerados e três sentinels encontrou os bytes esperados, sem staged residual e com Explorer Git limpo (`fixture-integrity.json.gz`). Não houve perda de dados observada. Não houve suíte global nova: nenhuma fonte/dependência de produção mudou; o reteste F1–F5-B anterior não foi reaberto.

**Falhas de medição preservadas:** piloto isolado não executou React por faltar preâmbulo do Vite no HTML servido pelo harness; reparado com `transformIndexHtml`. Piloto SCM mediu ativação, mas refresh falhou por seletor de ação oculta; repetido com hover/seletor visível. Primeira verificação funcional esperava HTTP 200 para stage; o contrato é 204, e a ação havia funcionado; restaurado o index da fixture e repetido com assert de sucesso 2xx. São falhas do harness, não defeitos/crashes do produto. Logs/JSON desses primeiros ensaios permanecem no pacote. Erros de sintaxe em geradores auxiliares foram corrigidos antes das execuções válidas.

**G. Diagnóstico e comparação Linux/Windows (dez perguntas):**

1. **Comprovado:** o `Promise.all` por filho gera N stats concorrentes; os picos 1k/5k foram observados. Não é hipótese abstrata.
2. **Parcela causal:** metadata/HTTP/parse ocupam ~3,3 s na expansão 5k, e há ~1,6 s posteriores até snapshot/paint; não são parcelas puras/somáveis de CPU. Não se pode imputar todos os 10,4 s Linux ao fan-out.
3. **Limite de concorrência:** reduz comprovadamente o pico e parte do bloqueio acumulado; não melhorou tempo total nem demonstrou redução de erros neste Windows, onde não ocorreram erros.
4. **SCM eager:** gargalo relevante comprovado no componente e no app real, inclusive montado oculto. Crescimento ~20 nós por recurso e tarefas >1 s em 10k.
5. **Virtualização:** benefício mensurável confirmado também no fluxo real de ativação, sem alegar ganho no boot total.
6. **Paridade:** tecnicamente viável preservar handlers e ações, mas o protótipo atual reprovou foco, fim do scroll e totais. Equivalência completa não demonstrada.
7. **Erros/crashes:** Windows não reproduziu crashes/ERR_INSUFFICIENT_RESOURCES. Traces Linux e a tentativa 5k anterior continuam válidos como evidência limitada; baixa memória, pressão de requests/DOM e profiling são explicações prováveis, não OOM provado nem causa única fechada.
8. **Outras causas:** lista SCM oculta, duas renders no refresh, DOM/layout do Explorer, custo Windows de processos Git/API, tamanho de URIs/payload, cache/pressão externa e overhead do trace. Não medir somente Git CLI.
9. **Suficiência para SPEC:** sim para uma SPEC mínima de render SCM e contenção de concorrência, com ressalvas e metas candidatas; não para prometer que somente limitar stats eliminará a lentidão do Explorer. Janela/produção do Explorer exige confirmação funcional/causal adicional antes de fechar essa parte da solução.
10. **Gate:** permanece aberto até SPEC quantitativa revisada/aprovada, implementação especificamente autorizada, regressão funcional/acessível e evidências de estabilidade, incluindo aceite humano. A investigação não homologa D98.

**H. Proposta mínima, não implementada:** janela visível no SCM existente, preservando identidade URI+grupo e callbacks; contagens/ações derivadas dos grupos completos, foco/seleção independentes do DOM, viewport/scroll corretos após refresh. Fila limitada/cancelável para stats do Explorer dentro das portas existentes, sem alterar o contrato congelado ou introduzir helper/serviço/worker; “16” é candidato ensaiado, não constante aprovada. Não criar framework genérico de listas nem adicionar biblioteca por inferência. Investigar em experimento próprio o custo de render/layout das linhas Explorer antes de prometer virtualizá-lo ou definir sua solução definitiva.

**I. Critérios candidatos para futura SPEC — NÃO aprovados:** zero perda de dados, zero erro silencioso de stat, completude N/N explícita; fila com limite mensurável, descarte/cancelamento em troca de workspace/colapso; manter ordenação/readonly/mtime, seleção, foco, Enter/Tab/Delete, ações de grupo completas, rollback/erros existentes e último recurso acessível após refresh. Candidatos SCM até 10k no ambiente definido: ativação p95 ≤200 ms, montagem isolada ≤50 ms, atualização controlada ≤75 ms, documento ≤2.500 nós e heap JS pós-carga ≤40 MiB — margens sobre os resultados do protótipo, não metas retroativamente aceitas nem portáveis sem baseline local. Comparar também scroll pequeno (não piorar 1k sem justificativa), long tasks por fase, refresh real até paint e foco/ARIA com tecnologia assistiva. Explorer: orçamento provisório de não regressão ≤10% do p95 local em execução sem trace (o outlier 1k limitado não satisfaz esse candidato); pico limitado e fila encerrada ao cancelar; orçamento de responsividade não pode aceitar os bloqueios atuais de ~1,4–1,6 s. O alvo final de render Explorer deve vir de experimento adicional, não de número inventado. Repetir com mais amostras/cache controlado e fixtures representativas antes de adotar percentis como SLA.

**J/K. Fechamento:** somente canônicos 03/06/07/09 e artefatos diagnósticos em arquivo morto foram alterados. Produção, lockfile e dependências intactos, nove canônicos preservados; sem push. A edição preexistente no 09 não faz parte do commit da investigação. Pronto para **elaborar/revisar uma SPEC mínima com as lacunas acima explícitas**; não pronto para aprovar o protótipo, implementar automaticamente ou declarar o Gate concluído. Servidores/Edge de teste encerrados. Parar e aguardar avaliação do dono.

### 3.9 Responsabilidade e segurança dos testes com provedores reais (D91, opção C; reafirmado D99)
- Arena executa testes técnicos automatizados: unitários, integração, E2E, regressão e benchmarks.
- Um provedor real só pode ser validado com ambiente legítimo, acesso seguro e autorização. Nunca solicitar, registrar ou expor chaves/credenciais em conversa, código, documentos ou logs.
- Se o ambiente/acesso/autorização não estiver disponível, registrar o teste real como **bloqueado/não executado**; não substituir por um stub e chamá-lo de teste real.
- Testes automatizados e validação de integração não substituem a **homologação funcional do dono** (`08`).

**D102 — método triplo, aprovado apenas como governança documental (26/10/2026):** para cada CAP, verificar (a) **código** com arquivos/commits e fronteiras observadas, (b) **especificações/documentação pública** versionadas, separando promessa de implementação, e (c) **testes/métricas reproduzíveis** sob condições equivalentes. Não registrar superioridade/equivalência sem (c) pertinente; quando comparação real não for viável, marcar não testado, inconclusivo ou não comparável. Evitar importar código de referências com licença/proveniência inadequadas. Esta metodologia, por si só, não autorizava executar D98, alterar produção ou criar SPEC definitiva; a investigação D98 recebeu autorização explícita posterior em 2026-10-28, registrada em §3.8. Mudança permanente continua sujeita à SPEC quantitativa e aprovação.

### 3.10 Metodologia comparativa reproduzível — D101 (2026-10-24)

Esta metodologia permite avaliar uma capacidade do Agente Window contra referências relevantes, inclusive os cinco cenários de `02 §1.4`, sem presumir paridade, inventar metas ou ampliar o roadmap. Uma alegação comparativa é válida apenas para o cenário, versão/configuração e condições realmente testados.

**Antes de executar (na SPEC e no plano de teste):**
1. Delimitar cenário/critério CAP de D100, tarefa e comportamento observável; escolher referência, produto/versão/commit e funcionalidades disponíveis. Distinguir objetivo do produto de capacidades já entregues.
2. Fixar protocolo, script/checklist, fixtures e dados iniciais, ambiente (SO, hardware, runtime), versões e configurações de ambos os sistemas. Registrar todos os desvios e variáveis que não puderem ser equiparadas.
3. Fixar antes de ver os resultados critérios de correção, segurança, estabilidade, completude, experiência e desempenho relevantes, incluindo como avaliar equivalência e tratamento de variação. **Não definir ou ajustar limiares depois para favorecer um resultado.** Metas quantitativas serão justificadas em SPEC após medições; este documento não estabelece números-alvo.
4. Repetições, condições de cache/aquecimento, tamanho da fixture, timeout e método de coleta são definidos pela SPEC para o cenário; registrar cada rodada, falha, descarte e motivo. Um timeout ou execução incompleta não prova uma duração exata nem uma causa.

**Controle do modelo/provedor versus overhead do produto:** quando a tarefa depender de IA, manter modelo/provedor, versão, parâmetros, prompt/contexto e condições de serviço tão equivalentes quanto possível. Registrar separadamente tempos/uso reportados pelo serviço, custos das fronteiras internas e tempo observado ponta a ponta. Comparar o Agente Window com a referência usando o mesmo modelo/provedor quando disponível; se não for possível, a comparação de qualidade ou velocidade do modelo é **não comparável** e deve ser relatada em trilha separada, sem atribuir essa diferença ao overhead do Agente Window. Para operações locais/UI, usar fixture e configuração equivalentes e instrumentar separadamente filesystem/Git, transporte, processamento e renderização quando a pergunta exigir localizar overhead. Não tratar números de backend isolados como experiência completa do usuário.

**Evidência a preservar no relatório:** passos exatos para repetir; commits/tags dos produtos; script/testes e hash da fixture; ambiente e configurações sem segredos; dados brutos e logs sanitizados; critérios definidos antes; resultados de cada rodada; exceções, limitações e relação com o cenário. Nunca registrar chaves, credenciais, prompts/conteúdo sensível sem necessidade e autorização. Distinguir medições deste checkout de resultados históricos relatados e não reproduzidos. Testes-fonte de terceiros demonstram que há um caso de teste, não que nosso sistema passou nele.

**Estados possíveis por critério/cenário:**
- **Superior** — satisfaz os critérios pré-definidos e apresenta resultado melhor nas dimensões comparáveis, sustentado pelas evidências e método registrados.
- **Equivalente** — satisfaz os critérios e a tolerância de equivalência definida previamente; não significa identidade absoluta.
- **Inferior** — comparável sob as condições acordadas e falha os critérios ou obtém resultado pior, demonstrado pelas evidências.
- **Inconclusivo** — evidência insuficiente, variável não controlada relevante, resultados instáveis, timeout sem medida válida ou critério não resolvido.
- **Não testado** — não foi executada avaliação pertinente; plano, hipótese ou presença de testes não muda este estado.
- **Não comparável** — referência, tarefa, ambiente ou variável essencial não pôde ser alinhada; os dados podem ser informativos, mas não sustentam uma classificação ordinal.

O estado é atribuído a cada critério e cenário, não ao produto inteiro por extrapolação. Só se pode agregar cenários usando regra de agregação aprovada previamente em SPEC. Ausência de resultado “inferior” não comprova equivalência. Resultados negativos não são omitidos e não se convertem em correção sem mudança implementada e reavaliada.

**Escopo e estado:** D98 mantém gate e protocolo próprios em §3.8; esta metodologia geral não autoriza alteração permanente nem declara paridade/superioridade. A investigação técnica autorizada em 2026-10-28 e suas limitações estão registradas em §3.8; nenhuma homologação humana, avaliação comparativa de paridade ou alegação de superioridade foi feita.

---

### 3.11 Protocolo de evidência CAP → SPEC → teste → aceite (auditoria 2026-10-25)

O `06` contém a **única matriz de vínculo CAP-01–CAP-20** e seus destinos confirmados ou candidatos; `02` define as capacidades e cenários, `08` define a avaliação humana. Este item descreve **como produzir evidências futuras**, não executa testes nem cria SPEC.

Para cada CAP e cenário que entrar em uma SPEC aprovada, registrar um caso de prova com: **ID CAP/cenário**; fatia/iniciativa **aprovada**; SPEC/versão/contratos; código/commit/ambiente; fixture e integridade; provedor/modelo real ou stub **explicitamente diferenciado**; pré-condições; ações, chamadas de ferramentas e resultados; métricas/limiares fixados **antes** das rodadas; repetição, erros e cancelamento; regressões afetadas; artefatos; parecer técnico e aceite humano pendente ou efetuado.

**Cobertura mínima a planejar:** cenário 1 = escala e correção do mapa arquitetural; cenário 2 = plano, filesystem, comandos, Git e testes; cenário 3 = reinício/rehidratação sem duplicar side effects; cenário 4 = instalação/remoção e permissão de integração; cenário 5 = ciclo multi-sessão com decisões/documentação/execução. A associação de CAPs a cenários permanece **proposta** no `06`, não é critério técnico aprovado.

**Gates:** sem SPEC/decisão, classificar como **não planejado para execução**; sem teste, **não testado**; evidência parcial não equivale a conformidade da CAP inteira. Metodologia comparativa D101 continua em §3.10; não confundir com homologação humana. Testes históricos não são repetidos por este adendo.

**D98 — nota histórica de 25/10:** o relatório preliminar antigo contém inspeção estática e medições sintéticas; naquele momento não havia trace CDP end-to-end nem medição do componente real. É insumo histórico, não baseline homologada. A autorização e evidência técnica posteriores de 28/10 estão atualizadas em §3.8; mudança de produção segue dependente de SPEC quantitativa e aprovação explícita.

### 3.12 Plano preliminar de verificação D103–D112 (registro histórico; não é SPEC)

Este roteiro documenta o estado e as propostas de D103–D112, anteriores a D119/D121. F1 e testes de fronteira continuam pertinentes; as linhas F2/F4 abaixo que exigem conter toda operação no workspace ou resistência a processo da mesma conta são **históricas e substituídas por D121**. Este roteiro não autoriza iniciar D98, alterar serviços ou executar capacidades fora do escopo aprovado; aprovação não é homologação.

| Tema | Verificação futura mínima | Limite/estado desta rodada |
|---|---|---|
| **Acesso local / F1** | Verificar Vite, preview, proxy, WebSocket/PTY e code-server em computador local e origem externa; demonstrar que a rede não alcança app/API indevidamente. Separar isso da autorização de cada tool. | Boundary local + contexto/grants server-side implementados; typecheck, 43 testes focados, App 46 pass/13 skip e cinco checks HTTP/WebSocket da fixture passaram; override de bind externo recusado. Sem Windows, rede externa real, preview `server.mjs`, code-server/PTY standalone ou homologação. O script code-server segue separado e intocado. |
| **Autoridade / F1** | Solicitações com workspace, sessão e permissões adulterados devem ser rejeitadas pelo servidor e vinculadas ao projeto autorizado. | Evidência automatizada parcial da F1 em 3.14; critérios completos e homologação não verificados. |
| **Caminhos / F2** | Matriz POSIX/Windows para `..`, absoluto, symlink/junction/reparse, troca concorrente; read/list/search/create/write/delete/preview sem acesso externo. | Linux x64: `fsSeguro.test.ts` (symlink, hardlink, traversal, worker concorrente durante read/create/write), `discos.test.ts` (search ignora links), lixeira/excluir fail-closed; 22/22 em 4 suítes. Windows/macOS e junction/reparse não testados; exclusão não implementada; F2 incompleta. |
| **Colisão / atomicidade / F4** | `criar` em destino existente, mutação entre leitura e escrita, rename/write falhando, interrupção e concorrência; comparar bytes antes/depois. | Sem teste executado; usar fixture, nunca arquivos reais do usuário. |
| **Parada / aprovação / F3** | Parar antes/durante/depois de cartão pendente; resposta atrasada, duplicada e concorrente; provar ausência de side effect após invalidação. | Estático, não reproduzido; sem teste executado. |
| **Modos/modelo / F5** | Em cada modo, tentar tool read/write; manipular payload cliente; comparar seleção UI, alvo validado e provedor ativo. | D108 futuro; sem mudança de comportamento. |
| **Contexto/anexo / F6** | Comparar indicador com `usage` do provedor; testar provedor sem usage, arquivo pequeno/grande e anexo apenas por nome. | Estático; sem chamada real. |
| **Retomada / F7** | Reiniciar em estados diversos; verificar efeitos, autorização, concorrência e idempotência antes de continuação. | M7 planejada; sem restart test. |
| **Busca/segredos / F8** | Árvore ampla, sem correspondência, arquivo grande, limites/cancelamento, redação de logs e rota de revelação em ambiente autorizado sem registrar valor de chave. | JSON de provedor observado sem criptografia e com `0600`; proteção integral da rota não auditada; sem credencial real. |

**Medição e relatório:** separar implementação observada, teste-fonte, teste executado, relato histórico e homologação humana. Para D101/D112, registrar versões, configurações, limites, provedor/modelo, rodadas, dados sanitizados e não comparabilidade. Código/documentação isolados não demonstram paridade; não declarar superioridade sem teste comparável.

### 3.13 Plano de testes F1–F8 (SPECs F1–F4, F5-A e F5-B aprovadas por D119; critérios em `06`)

Os critérios vigentes F1–F4, F5-A e F5-B estão em `06`, com D121 prevalecendo para F2/F4 e D120 para `declared`. D119 autoriza apenas as seis frentes aprovadas, com commits rastreáveis; aprovação não substitui homologação. Usar HOME e fixtures descartáveis, sem provedor/credenciais reais. Testes E2E mutáveis usam fixture isolada, nunca 5174/repo-backed.

A bateria deve separar: (1) F1 — autoridade local, Host/Origin, sessão/workspace/grants server-side; (2) F2 — leitura dentro e fora, `..`/absoluto e acesso a outro projeto sob permissões normais do SO; (3) F3 — cancelamento/ACK/aprovação/continuação concorrente; (4) F4 — criar exclusivo, colisão, escrita após leitura, conflito, falha e hardlinks; (5) F5-A/B — Perguntar/Planejar sem mutação, Agir/Editar autorizados sem confirmações repetitivas, payload não eleva grants, modelo só habilitado por evidência `verified` válida, `declared` opcional; (6) F6–F8 fora do escopo. Não declarar Windows testado sem execução real. F1 tem evidência parcial em 3.14; F3–F5-B preservam registros anteriores e necessitam regressão atualizada; a seção 3.17 registra a execução D121. F2/F4 não alegam sandbox física nem CAS universal. D98 não estava autorizada por D119 à época deste plano; autorização independente posterior consta em §3.8. Fatia 13 permanece não iniciada.

### 3.14 F1 — verificações desta missão (2026-10-26; sem homologação)

- **Typecheck:** `npm run typecheck` passou após conectar `validarContexto` à rota e ao loop Agir.
- **Testes focados:** `npm test -- src/server/localBoundary.test.ts src/server/session-persistence/database.test.ts src/server/session-persistence/agirContext.test.ts src/bairros/2-inteligencia/casas/agir/__tests__/agir.test.ts src/bairros/2-inteligencia/casas/agir/__tests__/rotas.test.ts` — 5 arquivos, **43/43**; `src/__tests__/App.test.tsx` adicionalmente: **46 passaram, 13 skipped**.
- **Integração Vite em `127.0.0.1:5175`, com HOME, workspace e JSON de provedores descartáveis em `/tmp`:** GET same-origin `/api/providers` → 200; PUT cross-origin → 403; POST sem Origin → 403; Host não autorizado → 403; tentativa de upgrade WebSocket PTY com Origin hostil → rejeitada. Fixture de provedores permaneceu byte-a-byte intacta; servidor parado sem erro no shutdown. Teste adicional: iniciar Vite com `--host 0.0.0.0` falha fechado na resolução de config (exit 1, sem listener). Nenhum shell/PTY autorizado foi iniciado.
- **Build:** `npm run build` não passou: o processo Node atingiu o limite de heap durante transformação do Vite (`FATAL ERROR: Reached heap limit Allocation failed`). TypeScript havia concluído antes; build não aprovado.
- **Não executados/inconclusivos:** Windows e primitivas específicas do SO; E2E em browser do fluxo de criação de sessão; rede externa real; preview `server.mjs` em runtime (artefatos de build ausentes após OOM); code-server e PTY standalone; handshake WebSocket autorizado; provedores/credenciais reais; revisão humana/homologação. Não inferir aprovação destes critérios a partir dos checks locais.

### 3.15 F2 — helper nativo Linux (snapshot histórico pré-D121; sem homologação)

> D121 dispensou a abordagem nativa e o critério de contenção física ao workspace. O helper permanece sem uso e sem build; os resultados abaixo só documentam a investigação anterior, não são instruções de estado atual.

- **Construção:** `cd platform/apps/workbench-v2 && npm run build:fs-boundary` — passou em Linux x64, Node 20.20.2, kernel 6.1.158. Exige toolchain C++/Python no build. Helper está no mesmo processo; não inicia servidor/porta/processo.
- **Typecheck:** `npm run typecheck` passou após integrar `fsSeguro.ts`, executor e fechamento explícito do descritor raiz por fluxo.
- **Testes focados:** `npx vitest run src/bairros/2-inteligencia/casas/agir/__tests__/fsSeguro.test.ts src/bairros/2-inteligencia/casas/agir/__tests__/discos.test.ts src/bairros/2-inteligencia/casas/agir/__tests__/lixeira.test.ts src/bairros/2-inteligencia/casas/agir/__tests__/excluir.test.ts src/bairros/2-inteligencia/casas/agir/__tests__/rotas.test.ts` — **5 arquivos, 38/38** (22 dedicados a FS/lixeira/excluir). Testa leitura/listagem/criação exclusiva/escrita; traversal, caminho absoluto, symlink/hardlink; busca não segue symlink; worker concorrente alterna diretório e symlink enquanto o processo tenta read/create/write; sentinelas externas ficaram intactas. Lixeira/exclusão e prévia não acessam o disco e falham fechado.
- **Fora da evidência:** build Vite completo não rerodado (OOM prévio); suíte unitária completa e E2E não rodadas após F2; Windows/macOS, junction/reparse points, troca concorrente em hardware Windows e homologação humana não executados. Não declarar F2 concluída.
- **Suíte global:** `npx vitest run` → 934 passou / 13 falharam / 22 skip. Falhas: `App.test.tsx` (assert de regeneração), `TerminalPanel.test.tsx` (9; corresponde ao conjunto já registrado em baseline histórico), `iconLabels.test.ts`, `themeTokens.test.ts`, `visualStates.test.ts` (3). Não foi rerodado um baseline integral antes desta missão; não atribuir causalidade à F2. Os cinco arquivos focados F2 passaram.
- **Uso:** compilação do addon é requisito das operações Linux; `npm run build` e `npm run preview` chamam o build nativo. Sem o `.node`, kernel compatível ou syscall permitida, F2 retorna indisponível e nunca usa caminhos Node como fallback.

### 3.16 Continuidade D119 — snapshot pré-D121 (2026-10-27; histórico)

> Os registros F1/F3/F5-B continuam evidência histórica útil. As conclusões F2/F4 de bloqueio total e o requisito de contenção/CAS adversarial foram substituídos por D121.

#### F1
- Commit `b2c49b4` endurece rotas locais sensíveis: sem Origin, leituras `/api`, `/fs`, `/git`, `/pty` exigem `Sec-Fetch-Site: same-origin`; mutações exigem Origin exato e JSON (`application/json`), e Fetch Metadata incompatível quando presente é rejeitado.
- `npx vitest run src/server/localBoundary.test.ts --reporter=dot`: **6/6**; `npm run typecheck -- --pretty false` e `git diff --check`: passaram. Sem novo E2E de browser, preview ou revisão visual/operacional; F1 permanece parcial, sem homologação.

#### F2
- Com addon Linux compilado: `fsSeguro.test.ts` + `discos.test.ts`, **18/18**. Isso não cobre o novo achado adversarial: um harness Node isolado executou `SandboxRoot.createExclusive` enquanto um Worker renomeava `workspace/slot` para `outside/slot` e de volta; foi observada publicação transitória de `probe-0` em `outside/slot` (`ok:1000`, `fail:2`). Depois de parar o Worker, a pasta foi movida de volta antes da contagem e o fixture foi limpo; o contador externo final zero não elimina a observação durante a corrida.
- Segundo harness isolado, `readFile('slot/secret')` retornou `OUTSIDE-SECRET` quando o diretório externo `outside/slot` foi movido momentaneamente para `workspace/slot` e retirado durante a leitura. Isso comprova que a resolução `openat2` e o descritor fixado não garantem subárvore física imutável após resolução.
- Mitigação fail-closed commit `787b987`: `fsSeguro.ts` deixou de carregar/expor o addon e `abrirRaizDiscoSegura` sempre retorna null; `build-boundary.cjs` agora não compila/empacota o helper. Todas as ferramentas Agir de disco (ler/listar/buscar/criar/escrever) recusam, sem fallback path-based. `discos.test.ts` valida a recusa de todas as cinco operações; `fsSeguro.test.ts` valida que a API não é exposta. Regressão `fsSeguro`+`discos`+`rotas`+`agir`: 45 passaram, 17 skipped; typecheck passou. Quatro testes do helper nativo e 13 testes de operações de disco foram skipped porque o wrapper está intencionalmente desativado e não contam como evidência positiva. A primitiva C++ não está corrigida. Windows permanece não testado; exclusão continua fail-closed.

#### F3 / contexto de sessão
- `rotas.test.ts` inicialmente falhou porque esperava `ok:false` sem considerar o addon nativo disponível. Commit `3d8695d` tornou o teste condicional ao addon e rotas+Agir passaram 43/43. Após o gate F2 `787b987`, o helper deixou de ser exposto e a asserção atual exige `tool_result ok:false` com motivo F2, arquivo inexistente e aprovação duplicada 409; `rotas.test.ts` + `agir.test.ts` continuam 43/43. A alteração de teste não muda a lógica de claim/cancelamento.
- `agirContext.test.ts` + `database.test.ts`: **6/6** ao executar com `AGENTE_WINDOW_TEST_HOME` e `HOME` em diretório temporário isolado, removido após os testes.

#### Regressão/UI
- Regressão de 12 arquivos e seleção F1/F3/F5-A/B: **175 passou, 17 skipped, 1 falhou**. Única falha: `App.test.tsx` → “conecta regenerar e feedback ao estado persistido da mensagem”, status esperado “Resposta regenerada”, recebido “Regenerando resposta”. Reexecução isolada desse teste: **1/1 passou**. Sem comparação integral nova com baseline nesta continuidade; causa inconclusiva, não atribuir como regressão nem como ambiente comprovado.
- Warnings `fetch('/fs/workspace')` relativo inválido e respostas 404 são dos mocks/jsdom e não impediram os demais casos, mas permanecem ruído de teste. Suite E2E de navegador e suíte global completa não foram rodadas.

#### F5-B: contrato DeepSeek e dependências
- A documentação oficial DeepSeek descreve tool calls em OpenAI Chat Completions e diz que no thinking mode o `reasoning_content` precisa ser enviado em todas as chamadas subsequentes que carregam `tools`; sua ausência pode produzir HTTP 400. O endpoint oferece `thinking.type=disabled`, mas o adaptador Agir não preserva `reasoning_content` nem desabilita thinking. O modelo pode declarar suporte a tools e ainda assim o par/configuração não ser compatível com Agir. Estado permanece `unknown`/bloqueado; nenhuma chamada upstream, chave ou segredo foi usado. Referências: https://api-docs.deepseek.com/guides/tool_calls/ · https://api-docs.deepseek.com/guides/thinking_mode/ · https://api-docs.deepseek.com/api/create-chat-completion/.
- `npm audit`: **9 vulnerabilidades** no grafo total (3 critical, 2 high, 4 moderate); `npm audit --omit=dev`: **0**. `npm ls`: Vite 5.4.21, Vitest 2.1.9, `@vitest/coverage-v8` 2.1.9, tinypool 1.1.1. Correções propostas pelo audit envolvem majors; nenhum upgrade/`npm audit fix` foi executado.

### 3.17 F1–F5-B pós-D121 — testes em Linux (2026-10-27; sem homologação)

**Escopo operacional:** paths relativos partem do workspace; caminhos absolutos/externos pedidos são resolvidos sem sandbox própria e dependem das permissões usuais do SO. Operações de disco usam Node.js; helper nativo permanece desativado. `criar` não substitui destino, `escrever` exige leitura prévia e compara hash/fingerprint; hard links múltiplos são recusados na escrita; exclusão segue bloqueada. `agent/edit` server-side permite criar/escrever sem cartões repetitivos; `ask/plan` não mutam. Modo vindo no payload do run é ignorado, grants continuam sob autoridade do servidor.

**Evidência de regressão** (HOME/DB temporários, sem variáveis comuns de credenciais reais):

- F1–F5-B direcionada em HOME isolado: **22 arquivos; 223 testes passaram, 17 ignorados** (inclui 4 skips históricos do helper nativo, ainda desativado). `App.test.tsx`: 60 totais, **47 passaram/13 ignorados** após mock de `/api/agir/mode`.
- Teste F3 streaming/parada: os três cenários `chatStreamingFatia09.test.tsx` inicialmente falharam porque o mock não respondia à nova rota de registro de modo. Mock foi corrigido sem alterar comportamento F3 e a suíte passou **3/3**; `App.test.tsx` igualmente passou. Os 404/warnings de Explorer e `api/sessions` foram respondidos por fixtures, sem side effects reais.
- Após ajustes adicionais em disco: TypeScript passou; `discos.test.ts`, `territorio.test.ts`, `rotas.test.ts`, `frontier.test.ts`: **4 arquivos, 49/49**.
- Testes `discos`: cobrem paths externos/relativos, fixtures temporárias, criação exclusiva e colisão, edição após leitura, conflito externo observado e recusa sem alterar os bytes concorrentes, links simbólicos e recusa de hard links múltiplos. `territorio`: resolve relativo/absoluto e destino/link estático. `rotas`: autoridade de modo server-side, payload não pode escolher permissões, Ask/Plan sem side effects e Agent/Edit sem confirmação repetida. Não houve provedor real.
- F1: `localBoundary.test.ts` cobre `/api/agir/mode` como mutação same-origin; cross-origin e sem Origin são recusados. F3: fixtures/cancelamento e regras de approval passam na regressão; `chatStreamingFatia09` 3/3 e novo teste App de Parar durante registro de modo pendente 1/1 confirmam abort do preflight e ausência de `/api/agir`; sem E2E de browser.

**Regressão ampla e build:** `npx vitest run` em Linux com HOME/DB isolados, sem credenciais API comuns: **121 arquivos, 117 passaram/4 falharam; 962 testes passaram/12 falharam/20 skip**. As 12 falhas ficaram em `TerminalPanel.test.tsx` (9), `iconLabels.test.ts` (1), `themeTokens.test.ts` (1) e `visualStates.test.ts` (1); erros observados são fixture/contrato de terminal e contratos visuais/tokens, sem atribuição às mudanças F1–F5-B. O build inicialmente não encontrou `pty.node` porque `npm ci --ignore-scripts`; `npm rebuild node-pty` corrigiu isso. `npm run build` então passou o helper no-op e `tsc -b`, mas Vite foi encerrado por OOM, heap ~943 MB.

**Ainda pendente:** `git diff --check`; revisão final de diff; prova operacional manual Linux adicional, separada dos testes Vitest; homologação Windows real (ACL, reparse/junction, hard links, create-exclusive, rename em arquivo aberto e permissões) e aceite humano. Não declarar Windows testado sem execução real. Risco de processo malicioso da mesma conta trocar paths durante a operação é aceito e documentado, não mitigado. Limites de rename/ACL/metadados/durabilidade podem variar por FS. Nenhum commit/push desta rodada até o registro final; D98/Fatia 13 permanecem fora do escopo.

## 4. Becos sem saída (não tente de novo)

### 4.1 Memória
- **Dois Vite (5174+5175) + suíte com Monaco (14, 14c) → "Page crashed" / timeout em `page.reload`.** Parece regressão, é OOM. Rode com um Vite só.
- `--workers=2` → thrashing (46 s → 7 min por teste) e Chromium órfão.
- code-server (~900 MB com 2 extension hosts) não cabe junto com a bateria. Abrir pasta no 8080 via Playwright dispara extension hosts e trava.
- **Proibido** buildar VS Code/code-server da fonte (`docs/arquivo_morto/16-INICIAR-POR-AQUI-IA-EXECUTORA.md`). Runtime pronto em `.cache` via script de restore; `/tmp` (tmpfs 1 GB) enche → `TMPDIR=/home/user/.cache/tmp`.

### 4.2 Playwright
- `addInitScript` roda também no `page.reload` — limpar `localStorage` só com flag em `sessionStorage` quando o teste precisa reler persistência.
- `mouse.move` com coordenadas fracionárias → ±1 px no delta. Arredondar e tolerar ±1.
- Transição CSS de largura quebra asserts de `boundingBox` — os componentes novos **não** têm transição (o VS Code real também não anima a Side Bar).
- `:has(> …)` não funcionou nos seletores do projeto.
- Activity Bar expõe `role="tab"`; `getByRole('tab', {name})` colide com abas do editor → escopar.
- Monaco DiffEditor: < 900 px vira inline; há 2 `.view-lines`.
- Para provar DnD com **mouse real** (diagnóstico, não para a bateria): `chromium.launch({ headless: false })` sob `xvfb-run`, `Input.setInterceptDrags {enabled:false}` numa `CDPSession` e `Input.dispatchMouseEvent` pressed/moved/released — o próprio Chromium inicia o drag; foto da tela com `import -window root`. Usado na 5.5 (prints c5.5/05–09).
- HTML5 DnD nativo **não dispara** com `page.mouse` em Chromium headless → disparar `dragstart`/`dragenter`/`dragover`/`drop`/`dragend` via `dispatchEvent(new DragEvent(..., { dataTransfer: new DataTransfer() }))` dentro de `page.evaluate` (helper `dnd()` em `sessao_15_drag_drop_views`). `dragover` só enxerga `dataTransfer.types`, nunca o payload.
- `WS /fs/watch` é flaky; `13_search` "across M files", `12_explorer` T9, `14` T13 são flaky conhecidos — re-rodar 1× antes de declarar regressão.

### 4.3 Vite / código
- esbuild do Vite pode morrer (`The service is no longer running: write EPIPE`) após cópias de arquivo/HMR em rajada com pouca RAM — a página mostra overlay vermelho e todo teste dá timeout no `waitForSelector`. **Reiniciar o Vite** (stop/start), não é bug do código.
- Plugins fs/git carregam no boot do Vite: mudança em `server/**` exige reiniciar o Vite.
- `git stash`/`pop` grande com Vite no ar pode matar o esbuild.
- `/fs/stat` é POST `{uri}`; nunca filtrar `fs.changed added`.
- `module.mount/unmount` em callback-ref: adiar `reactRoot.unmount()` com `setTimeout`.
- `npx tsc` sem `node_modules` instala outro pacote — usar `npm run typecheck`.

### 4.4 Processo
- Interrupção do usuário no meio de `playwright test` deixa processos comendo RAM — limpar antes de retomar.
- Testes longos precisam **caber num turno**; ao trocar de mensagem tudo recomeça (§3).

---

## 5. Ferramentas existentes (onde estão, para que servem)
| Arquivo | Uso | Versionado? |
|---|---|---|
| `platform/apps/workbench-v2/run-antiregressao.sh` | bateria §9 em série com reseed | sim (c1) |
| `platform/apps/workbench-v2/shot.tmp.mjs` | print de uma URL sem travar com Monaco | **não** (temporário; ver `docs/04 - ARQUITETURA E REGRAS DURAS.md §4`) |
| `/home/user/restore-code-server.sh` | restaurar runtime do code-server em `.cache` e subir 8080 | fora do repo (cópia em `uploads/restore-code-server.sh.txt`) |
| `e2e_05_00/e2e_canonical_5175.sh`, `kill_orphans.sh` | driver de bateria e limpeza, do agente externo | **não estão neste clone** — só citados em `05_02`; recriar se necessário a partir de §3 |
| `platform/apps/workbench-v2/probe-terminal.mjs`, `validacao-real-workspace.mjs` | sondas antigas (FATIA-03/04) | sim; não usadas na FATIA-05 |

---

## 6. Validação técnica atual da FATIA 06.4a

A homologação humana está no `08`. Esta seção registra somente o que a IA deve conferir antes de entregar o gate Windows.

### 6.1 Ambiente
- Vite na porta **5174 real**.
- `npm run typecheck` com 0 erros.
- Specs de fixture nunca apontam para 5174.

### 6.2 Checklist técnico da 06.4a
1. Pasta sem Git é aceita com `useWorktree=false`, `worktree_path=NULL`, branch ausente e PWD direto.
2. Pasta Git também usa o diretório original no fluxo padrão; não cria branch/worktree.
3. Trocar sessão chama `POST /fs/workspace { path }` e atualiza Explorer/Search/SCM para a raiz ativa.
4. F5 restaura sessões e workspace ativo sem duplicação.
5. Recentes ficam em `~/.agente_window/recent-workspaces.json`, máximo 10 e sem duplicatas.
6. Excluir sessão sem worktree remove apenas persistência; nunca remove a pasta real.
7. `useWorktree=true` em pasta sem Git falha com `worktree_requires_git`, sem fallback silencioso.

### 6.3 Último resultado medido
- Typecheck: 0.
- Alvo da 06.4a: 71 pass / 13 skip.
- Suíte completa: **722 pass / 9 falhas preexistentes / 16 skip**.
- Playwright terminal: 3/3.
- Homologação no Windows real: **concluída com ressalvas em 2026-10-10**; itens 1/3/4/5 comprovados em vídeo e 2/6/7 aceitos pelo usuário com base na validação local. 06.4b liberada.

## 7. Gate local consolidado da FATIA 06 (2026-10-11)
- Typecheck: 0 erros.
- `SessionLanding.test.tsx`: 11/11.
- `App.test.tsx`: 46 pass / 13 skip.
- `providers.test.ts`: 2/2; garante escrita sem `apiKey`, env status e validação de URL.
- `workspaces.test.ts`: 7/7; inclui Git/não-Git, `realpath`, recentes, listagem de diretórios e plataforma do picker.
- Servidor Debian 5174: GET/PUT `/api/providers`, arquivo real e contratos de workspace passaram.
- Uma primeira tentativa de Playwright foi bloqueada por `libnspr4.so`; após instalar as dependências no ambiente efêmero, a execução real passou conforme §§8–9 abaixo.
- `git diff --check`: sem erro de conteúdo. Documentos canônicos: 9.

## 8. Revalidação final 06.4c/Fatia 06 (2026-10-11)
- Typecheck: 0.
- SessionLanding: 11/11, incluindo autocomplete `/` e seleção que preenche `/home/`.
- Workspace server: 7/7, incluindo listagem exclusiva de diretórios reais.
- Providers: 2/2.
- App: 46 pass / 13 skip.
- Playwright Chromium real no Debian, 1400×900: `/` listou raiz; seleção navegou até `/home/user/`; criação da sessão passou; comando `pwd` no xterm retornou `/home/user`; Conta > Provedores abriu 3 cards; zero `pageerror`. Evidência local não versionada: `/home/user/fatia06-linux-playwright.png`.


## 9. Gate Workspace Switcher
- Typecheck 0; WorkspaceSwitcher 3/3; SessionLanding 11/11; workspace/providers 9/9.
- Playwright Debian 1400×900: raiz listou home/mnt/tmp; `/mnt/` mostrou pasta vazia; `/tmp` sincronizou `/fs/root=file:///tmp`, `document.title=/tmp` e `pwd=/tmp`; zero page errors.

## 10. Bateria e Gates de Teste — FATIA 07: Destravar (ex-"6.1", renumerada por D64)
Para a entrega da **FATIA 07 — Destravar** (SPEC na Parte 2 do `06`), os seguintes testes automatizados devem ser adicionados/validados antes da homologação humana:
1. **Teste de Sincronização Atômica (`App.test.tsx`):**
   - Disparo de seleção de pasta deve chamar imediatamente o recarregamento do Explorer e a notificação de `cd` ao PTY, sem necessidade de despacho de mensagem no chat.
2. **Teste de Abertura de Provedores na Landing (`SessionLanding.test.tsx` / `App.test.tsx`):**
   - Disparo da ação de abrir Provedores a partir do estado inicial (zero sessões / landing vazia) deve montar a tela no editor moderno com sucesso.
3. **Teste de Purga do Visualizador Legado:**
   - Teste estático/unitário confirmando que nenhum componente de `components/legacy/` é instanciado na árvore React.
4. *(movido)* **Teste de Limpeza de Buffer do Terminal (`clear`):** saiu desta fatia — agora integra a **FATIA 16 — Terminal 2.0** (pós-D95) (DEBT-01, por D64).
5. **Higiene — onda 1 (D74):** marcar como `skip` os 13 E2E mortos (§2.4), preservando o registro (**não apagar**).
6. **Pré-requisito em cascata:** a **FATIA 08 não inicia** sem typecheck 0 e aprovação deste gate.

## 11. Análise de vídeos do usuário (método validado em 2026-10-12)
O usuário grava a tela e envia o arquivo; a análise tem de cruzar **áudio** e **imagem** antes de concluir qualquer coisa. Pipeline validado em um MP4 de 4min02s (1904×1076, H.264, AAC).

1. **Nunca ler como texto:** o arquivo pode chegar como `.mp4.txt`. Renomear, confirmar com `file` (deve dizer ISO Media/MP4) e medir com `ffprobe` (duração, streams, resolução). Ler bytes de MP4 como texto não ajuda.
2. **Instalação (por turno — não persiste entre mensagens):** `sudo apt-get install -y ffmpeg` + `python3 -m pip install faster-whisper` (~25 s no apt+pip; `sudo -n` funciona e o Hugging Face é acessível do sandbox).
3. **Áudio:** `ffmpeg -i video.mp4 -vn -ar 16000 -ac 1 -c:a pcm_s16le audio.wav`.
4. **Transcrição:** faster-whisper **small**, `device='cpu'`, `compute_type='int8'`, `cpu_threads=2`, `language='pt'`, `beam_size=5`, `vad_filter=True`, `word_timestamps=True`. ~84 s para 4 min de áudio. Conferir idioma detectado, probabilidade e se os segmentos cobrem a duração.
   - **PyAV quebra** em `transcribe('audio.wav')` com `TypeError: open() got an unexpected keyword argument 'metadata_errors'`. Não abandonar: carregar o WAV como array NumPy (`wave` + `astype(np.float32)/32768.0`) e passar o array.
5. **Frames:** periódicos (`fps=1/15,scale=1280:-2`), de cena (`select='gt(scene,0.18)'`) e **dirigidos por timestamp** (`-ss T -frames:v 1`) nos pontos que a fala marca. Folhas de contato com `drawtext` (`%{pts\:hms}`) + `tile` dão panorama rápido; **atenção**: em clipes extraídos com `-ss`, o rótulo `pts` reinicia em zero — somar o offset do corte.
6. **Timestamps exatos sem perder tempo:** extrair `fps=1` do vídeo inteiro (242 JPEGs) e casar cada frame periódico por comparação de pixels (MSE) — MSE=0 identifica o segundo exato. Não estimar por aproximação em trecho que vá para doc.
7. **Cruzar fala × tela** antes de concluir; vídeo do usuário **prevalece** sobre o 8080 do sandbox. **Cuidado com o risco de ler o app errado:** os vídeos alternam **VS Code original × clone** — confirmar qual app está na tela (o clone aparece em `localhost:5174` na barra de endereço do navegador; o original tem barra de status roxa e menus PT-BR).
8. **Onde trabalhar:** artefatos (áudio, transcrição, frames) em `/home/user/video_analysis/` — **nunca** dentro do repositório; nunca commitar mídia ou transcrição. Relatório pode ser salvo lá como arquivo auxiliar da sessão. *(Limpeza de 14/10: as pastas de 12–13/10 foram apagadas para liberar espaço; o conteúdo está preservado em `/home/user/uploads/registro_alinhamento/2026-10-12_13_analises_de_video_arquivadas.md` e o script com o fallback NumPy ficou em `ferramentas_analise/transcrever_whisper_numpy.py` — pasta removida na limpeza de 21/10.)*
9. **Escopo:** análise **não autoriza implementação**. O vídeo revela requisitos; implementar só com ordem explícita. Achados viram linha em `docs/06` (dívida) e/ou `docs/07` (histórico).

## 12. Habilidade de podcast (skills_podcast 4.0.1 — Greenforged Edition)
Pacote de produção de podcast (orquestrador → escritor → atomizador/validador → produtor de áudio) extraído em `uploads/skills_podcast 4.0.1 (Greenforged Edition)/` — **fora do repositório; não versionar** (regra do `§11 item 8`). Entrada: `inicializador.txt` → `README.md` + `orquestrador/BOOT_ORQUESTRADOR.md` + `orquestrador/SKILL_ORQUESTRADOR.md`.

- **Uso neste projeto:** transformar o estado da obra em conversa em linguagem simples para o usuário (contextualizar antes de decidir). Corpus = repo + conversas + análise do vídeo.
- **Adaptação validada em 2026-10-12** (Episódio 01): gênero novo **`GENERO_ESTADO_DA_OBRA`** (8 segmentos, adaptado do Detalhado); roteiro, JSON e estado em `/home/user/podcast/` (fora do repo). Áudio opcional (o usuário dispensou nesta rodada; JSON pronto para gerar depois).
- **Regras da casa mantidas:** balanceamento ≤ 20% entre speakers (trava dura), disfluências ≥ 1 a cada 3 falas, Speaker B elabora (não só pergunta), termo técnico sempre traduzido, fecho com gancho.
- **Validação adaptada:** o MARCH cego multiagente exige agentes separados; quando não for possível, validar **em agente único** cruzando cada afirmação com os arquivos do repositório (resultado em `_resultado_validacao.json`; exigir 0 não-encontradas para aprovar).
- **Cuidado:** a fatia só aceita roteiro com acentuação PT-BR correta (primeira passada saiu sem acento e foi corrigida — não repetir).

## 13. Bateria e prova — FATIA 08: Conectar (Provedores) (2026-10-15)
> Baseline no HEAD `fde5f0f`: typecheck **0** · unit **765✓ / 12✗ (pré-existentes) / 16 skip** (§2.5.1) · E2E da fatia **6/6**.

**Unit da casa** (`src/bairros/2-inteligencia/casas/provedores/__tests__/`, **37/37**):
| Arquivo | Testes | Cobre |
|---|---|---|
| `registro.test.ts` | 6 | 8 descritores, ids únicos, protocolos com adaptador, endereços padrão, o genérico |
| `providersRepo.test.ts` | 13 | máscara, precedência **arquivo > ambiente** (D84), migração v1→v2 com `.bak`, `validarEntrada`, gravação 0600, revelar chave, id desconhecido |
| `probe.test.ts` | 13 | `fetch` mockado: ok · 401 · endereço · tempo (timeout 10 s) · http · resposta · catálogo e ping de conversa |
| `frontier.test.ts` | 5 | fronteira LEGO: fora da casa só o barrel (exceção estreita do plugin), deps permitidas, `contract.ts` sem `any`, `as unknown as` confinado, dono único das regras |

**E2E** (`e2e/provedores_fatia08.spec.ts` — **6/6**, ~32 s) contra **stub local** (`uploads/stub_provider.cjs`, porta 4599; falha 401 com chave errada e 405 no caminho `/sem-catalogo`) e servidor iniciado com `AGENTE_WINDOW_PROVIDERS_PATH=/tmp/prov-fixture/providers.json` — o arquivo real do dono **nunca** é tocado (o `beforeEach` confere `storage:'fixture'` e o caminho).
| Teste | Prova |
|---|---|
| T1 | Conta ▸ Provedores: 8 itens + endereços padrão por provedor (NVIDIA = `integrate.api.nvidia.com/v1`) |
| T2 | Genérico: conexão de verdade (200 + 5 modelos), buscar modelos, escolher, salvar, **F5** e tudo no lugar |
| T3 | Máscara no campo + **olhinho** (D83): revela a chave inteira sob clique e volta a ocultar |
| T4 | **Falhas honestas:** 401 ("Chave inválida") e endereço inalcançável ("Não deu para alcançar") |
| T5 | Serviço que não lista modelos (405): aviso honesto + **modelo digitado à mão valendo** |
| T6 | **Provedor ativo:** chip verde, persiste após F5 |

**Contrato anti-trapaça:** a spec nova nasceu com asserções e na convenção exigida — `e2eAssertionContract.test.ts` **verde** (na 1.ª tentativa ele reprovou por indentação; corrigido e virou lição para specs futuras).
**Evidências:** `/home/user/validacao_fatia08/` (prints `f08_T*.png` + `e2e_saida.txt`) — pasta **externa** ao repositório.
**Limitação registrada (honesta):** a prova automatizada usa **serviço simulado**; a validação com **provedor real** é o roteiro do dono (`08` PARTE C). A migração do v1 real só será exercitada no primeiro uso do dono (o sandbox não tem o arquivo dele). **Nota D99:** este registro descreve a prova da FATIA 08 e a homologação funcional feitas à época; a responsabilidade vigente por testes técnicos com provedores reais está em `§3.9`.

### 13.2 Validação do dono com serviço REAL (15/10, via vídeo analisado em 16/10)
Duas IAs independentes (transcrição Whisper + frames + IA com visão de vídeo) convergiram sobre a gravação do dono:
| Prova | Valor exato |
|---|---|
| Ollama local (`http://localhost:11434`) | **"Conexão aprovada. O serviço respondeu em 209 ms e mostrou 5 modelos."** |
| Genérico → LiteLLM (`http://0.0.0.0:4000`, `meu-pool`) | **"…respondeu em 158 ms e mostrou 4 modelos."** |
| Chave | mascarada o vídeo inteiro; nunca revelada |
| Erros | **nenhum** (nenhuma faixa vermelha, nenhuma tela cinza) |
Divergências resolvidas por recorte ampliado: os números dos ajustes são `99999999999999`/`10000000000000000` (a IA de vídeo leu "999/1000") e o rodapé do chat **tem** "Claude Sonnet 4" (a IA de vídeo disse que não). Registro completo: `uploads/midia_fatia08/ANALISE_VIDEO_15-10.md` (fora do repo; mídia apagada a pedido do dono em 16/10).

### 13.1 A/B da suíte E2E completa (2026-10-15) — **zero regressão da FATIA 08** (com ressalva honesta)
Ao rodar a suíte E2E **completa** neste sandbox, o resultado é ruidoso: **88 failed / 21 skipped / 87 passed (33,4 min)** — muito pior que a auditoria histórica (166/180 em `ba571dd`), e **não** é da FATIA 08.

**Método (D"/A-B contra estado anterior"):** as **21 specs que falharam** foram rodadas também no estado **anterior** (`e182960`, worktree `/tmp/ab_pre`, mesmo seed, mesmo servidor, 5174) → **88 failed / 10 skipped / 49 passed (31,3 min)**.

**Comparação por ID de teste:** 88 falhas nos dois estados; divergem apenas **2 para cada lado** — e **trocando de teste dentro do mesmo arquivo**, o que caracteriza **instabilidade**, não regressão:
| Spec | Estado NOVO (`fde5f0f`) | Estado ANTIGO (`e182960`) |
|---|---|---|
| `sessao_14d_commit_input` | falha `:90` (T3) na rodada completa; `:58` (T1) na rodada isolada | falha `:58` (T1) |
| `sessao_15_activity_bar` | falha `:265` (T5) | falha `:71` (T1) |

**Prova direta com spec isolado:** `sessao_15_editor_maximize` (10 testes) = **9✗/1✓ nos DOIS estados** (rodado isolado, servidor limpo e seed de 5 sessões em cada) — falha idêntica, pré-existente.

**Leitura honesta:** a suíte E2E completa **não é régua neste sandbox** (40 falhas por *timeout* de 30 s em áreas congeladas que a fatia não toca: explorer, search, git, editor, activity bar). A régua usada continua sendo: (a) as baterias focadas já registradas (§2.4/§2.5/§2.6) e (b) o A/B por spec. **Nenhuma falha exclusiva da FATIA 08**; a bateria da fatia é **6/6** (§13).

### 13.3 Buraco de teste identificado (16/10) — nenhuma trava dizia ONDE a superfície abre
A sonda `sonda_01_debt09.cjs` (FATIA 07) e a bateria da FATIA 08 verificavam que a tela **abre** (aba, `.providers-view` visível, zero erro de console) — **nenhuma** verificava **onde/como** ela abre (superfície, estado do painel, maximizado × divisão). Foi por esse buraco que o **DEBT-04** (reaberto pelo dono em 16/10) passou. **Trava proposta** (entra junto do fix da opção A, `06 §8.3`): teste E2E de contrato — "Conta ▸ Provedores abre com o editor **maximizado** (`.desktop-surface-group.editor-maximized`, sem `.chat-pane`)"; e, no unit, contrato do estado de layout por tipo de aba.

### 13.4 FATIA 10 — bateria da fatia e estado da suíte (19/10)
- Unit: **872✓ / 12✗ (pré-existentes e intocáveis: `TerminalPanel`×9, `iconLabels`, `themeTokens`, `visualStates`) / 16 skip**. O flaky "regenerar" do `App.test` segue intermitente sob carga (provado pré-existente via stash no C1; hoje: 3/3 no estado limpo, 4/4 isolado com as mudanças da fatia, e o arquivo inteiro 46✓ logo depois de falhar — corrida a corrida).
- E2E régua (por fatia, conforme §13.1): **fatias 08 + 09 + 10 = 15/15**, contra os stubs 4599/4610 e território REAL em `/tmp`. A `agir_fatia10` (5/5) prova: cartão aparece e **nada é escrito antes do Permitir**, o disco recebe o conteúdo exato, negar não escreve, "Permitir na Sessão" vale no fluxo e sobrevive ao F5, e ferramenta nenhuma sai da pasta.
- Suíte E2E **completa**: segue não-régua neste sandbox — travou >25 min nas specs antigas de terminal/PTY (ver §13.1: 88✘ ambientais já auditados). A bateria da fatia é a régua.

## Pós-11: travas de regressão por correção (C1–C7, 21/10 — FATIA 11 homologada, D96)
Cada coisa tratada no pós-11 e ONDE mora a proteção que impede regressão. "Prova viva" = conferência com o app rodando (prints fora do repo, pasta `prova-pos11/`).
| Correção | O que a trava garante | Trava (arquivo real) |
|---|---|---|
| C1 (`7bc2231`) ocioso 300s | fio lento-mas-vivo NÃO sofre timeout | `casas/agir/__tests__/vizinho.test.ts` — "fio saudável e LENTO: o ocioso NÃO dispara" |
| C1 absoluto 1800s | fio pingando para sempre morre no total | `vizinho.test.ts` — "rede absoluta: pingando PARA SEMPRE morre no total" |
| C1 retomada transitória | erro 500 guarda retomada; Continuar retoma de onde parou | `agir.test.ts` ("erro TRANSITÓRIO… retomável") + `rotas.test.ts` ("erro transitório (500) guarda retomada") |
| C1 erro definitivo | erro de chave NÃO oferece retomada | `agir.test.ts` — "erro DEFINITIVO (chave): sem retomada" |
| C2 (`7c42fa3`) progresso/cartões | SEM teste dedicado — guardado pela suíte App (49 testes) + régua E2E + provas vivas B/C | `src/__tests__/App.test.tsx` + régua 18/18 |
| C3 (`224c58c`) textos honestos | ferramentas dizem que NADA foi gravado; recusas honestas | `casas/agir/__tests__/discos.test.ts` 10/10 |
| C4 (`5ec8c48`) Explorer pós-escrita | agente escreve → Explorer mostra sem resselecionar | E2E `agir_fatia10` 5/5 + `teto_fatia11` 2/2 (7/7) + prova viva A (evento `refreshed` sem unit dedicado) |
| F11 teto/Continuar | teto pausa com cartão; Continuar dá +2 no mesmo fluxo; Parar morre limpo | `e2e/teto_fatia11.spec.ts` T1 + `agir/rotas.test.ts` (evento `teto`, 409 sem pausa) |
| F11 Config | salva teto+rolagem e sobrevive ao F5 | `teto_fatia11` T2 + `casas/config/__tests__/ConfigView.test.tsx` |
| F11 auto-scroll | só-no-fim; desligado nunca desce | `src/__tests__/ChatPanel.test.tsx` ("só-no-fim…", "desligado na config…") |
| C6 (`4c8df87`) iterações/Continuar | Continuar funciona; rename validado por tsc + suíte verde (sem trava textual) | `teto_fatia11` T1 + unit base idêntico |
| C7 (`4321393`) diff re-clicado | A→A→B: diff visível + zero erros fatais | `e2e/diff_sem_travar.spec.ts` 3/3 |
| Régua geral | 08+09+10+11 sem regressão + specs honestas | 18/18 na ordem canônica + `e2eAssertionContract.test.ts` (anti-trapaça) |

## FATIA 12: travas de regressão (21/10 — homologada D97)
Onde mora a proteção de cada comportamento da fatia (servidor em `casas/agir/server/` + `e2e/excluir_fatia12.spec.ts`).
| Comportamento | O que a trava garante | Trava (arquivo real) |
|---|---|---|
| `excluir` no catálogo | ferramenta existe, anunciada nos 4 canais, `ehMexida` | `anuncio.test.ts` (6 ferramentas) + `ferramentas.ts` |
| Lixeira por SO | Windows = Lixeira real (PowerShell, switches oficiais); Linux = XDG com bilhete; resto = erro honesto | `lixeira.test.ts` 12 testes + E2E T1 (lixeira real Linux) |
| C4 switch + detalhe | sem switch inventado; recusa traz o stderr/stdout do Windows; teto 3 min | `lixeira.ts` (`detalheErroWindows`) + casa 92/92 |
| RF12-3 sessão nunca cobre | `sessao` p/ excluir = 400; cartão sempre pergunta | `rotas.test.ts` + E2E T3 |
| Território = pasta ativa | fora (`../`, irmã, outro disco) = recusa honesta, nada some | `territorio.test.ts` 15/15 + E2E T4 |
| C5 canônico no Windows | dentro com caixa diferente/prefixo UNC/barra inicial NÃO dá "fora" | `territorio.test.ts` (5 testes win32) |
| Cartão reforçado | sem-desfazer + prévia/contagem do servidor, sem botão de sessão | `CartaoFerramenta` + E2E T1/T5 |
| Negar | "nada sumiu"; arquivo continua na pasta e fora da lixeira | negação no loop + E2E T2 |
| Régua geral | 08+09+10+11+12 sem regressão | 23/23 na ordem canônica + `e2eAssertionContract.test.ts` |

## Reteste independente Windows — 2026-10-28 (F1–F5-B; sem homologação)

**Baseline:** branch `docs/capacidades-d102-alinhamento`, HEAD `24d10542a980d2c84a6dee67b85be92db001a7aa`, árvore inicialmente limpa. Confirmados `253d8e1` (F3/F5-A) e `24d1054` (ACL). Os nove canônicos não receberam a auditoria Windows anterior neste checkout; seus resultados foram recuperados das evidências externas, sem inventar um registro anterior inexistente no 09. Este registro substitui como evidência atual o relatório auxiliar de 27/10, preservado em `arquivo_morto/auditoria-windows-correcoes-2026-10-27.md`. Voltaram a existir somente nove arquivos ativos na raiz de docs.

**Ambiente:** Windows x64 23H2, build 22631.6199, volume C: NTFS; Node 24.16.0, npm 11.13.0, Edge headless real via Playwright. Dependências instaladas com `npm ci --ignore-scripts`, seguido de rebuild de better-sqlite3 e node-pty. HOME e USERPROFILE isolados, provedores OpenAI-compatible fictícios em loopback, provas canary simuladas `verified`. Nenhuma credencial ou chamada real. Servidores temporários controlados por subprocesso com timeout e encerramento: `start_process` não está disponível nesta sessão Windows. D98/Fatia 13 não fizeram parte daquele reteste Windows.

**Evidência externa, fora do Git:** `C:\Users\Usuario\.codex\visualizations\2026\10\27\01a17f37-97c4-74a2-87bb-d6fbbbe5b243\retest-20261028`. Subpastas: raiz = baseline Arena; `clean` = diagnóstico de ambiente, sem alteração de produto; `fixed` = correção ACL e testes; `final` = integração com barreira de provedor corrigida. Auditoria anterior preservada na pasta irmã `audit-windows`. Scripts, JSON, logs e screenshots permanecem fora do repositório.

### Achado novo, reprodução e correção estreita da ACL

**Reprovado no baseline Arena:** salvar provedor fictício via HTTP devolveu 400; nenhuma prova `verified` podia ser estabelecida. A primeira aplicação da DACL funcionava; a segunda aplicação de `Set-Acl` no arquivo já privado falhava com `SeSecurityPrivilege`. A verificação pós-rename então removia o arquivo principal. Reproduzido fora do aplicativo, com três aplicações sucessivas: primeira passa, seguintes falham (`clean/acl-reapply.log`). Não era uma falha de F3 nem de catálogo: os testes dependentes ficaram impedidos pela gravação de credenciais.

Havia também contaminação de `PSModulePath` do PowerShell 7 herdada pelo Windows PowerShell 5.1 lançado via Node: `Microsoft.PowerShell.Security` falhava ao carregar com membros de TypeData duplicados. A normalização do ambiente resolveu somente esse impedimento, e expôs a falha real de reaplicação da ACL. Logs originais preservados; nenhum teste foi ignorado para ocultá-los.

**Correção autorizada dentro do contrato D81:** aplicar o mesmo objeto de segurança por `[System.IO.File]::SetAccessControl`, preservando proprietário, DACL privada e verificação final; remover somente `PSModulePath` do ambiente do subprocesso para ele resolver os próprios módulos. Não há helper nativo nem nova arquitetura. Teste Windows reforçado com leitura repetida do mesmo arquivo já protegido; seu inspetor independente também resolve módulos nativos. Variante direta passou três aplicações sucessivas antes da alteração de produção.

**Aprovado após correção:** `fixed/acl-ntfs.json`: três cenários, com snapshots reais das DACLs. Arquivo preexistente herdado corrigido; principal, temporários e backups com herança desativada e exatamente uma ACE Allow/FullControl não herdada para o SID atual. O observador interceptou `writeFile` para inspecionar temporários/backups antes dos bytes fictícios. Falha EIO injetada no rename preservou os bytes originais e removeu temporários. Teste Windows do repositório executado, não ignorado.

**Limites:** inspeção de DACL não simula login de outro usuário/administrador; não promete isolamento contra administrador. Falha arbitrária na verificação após rename continua fail-closed e pode deixar somente o backup anterior, sem restauração automática do principal; esse ramo não recebeu nova injeção específica. Reaplicar/verificar ACLs de todos os backups em cada leitura custa subprocessos e cresce com o histórico: timeouts observados e registrados abaixo, sem cache ou relaxamento das permissões.

### F3 — resultado integrado da corrida original

**Aprovado:** `fixed/cancel-before-commit-2.json`, 14/14. Mesmo preload externo da auditoria anterior suspende `fs.link` imediatamente antes da publicação. Arquivo ausente na barreira; pedido de cancelamento permanece sem ACK durante 600 ms; liberação publica os bytes completos; somente então resposta `cancelled_with_effects`. SSE bruto em `fixed/cancel-before-commit-events-2.txt`. A antiga confirmação prematura não foi reproduzida após a correção F3.

**Aprovado no Edge:** cancelamento durante publicação mantém o arquivo e exibe a mensagem de que alterações já concluídas foram mantidas; screenshot `fixed/f3-ui-effects.png`. Cancelar resposta atrasada antes de iniciar a mutação impediu criação. Os 29 testes de rotas Agir passaram, incluindo aprovação pendente invalidada, aprovação tardia, consumo único e continuations concorrentes. Os testes de arquivo incluem duas criações concorrentes com um vencedor e escritores que detectam versão obsoleta. Não se alega rollback nem proteção contra corrida maliciosa da mesma conta, conforme D121.

### F5-A — modos e política

**Aprovado no Edge:** Perguntar sobrevive à recarga; Agente, Editar, Perguntar e Planejar sobrevivem a recargas individuais; Planejar sobrevive ao fechamento/reabertura do navegador com perfil persistente. Duas conversas com modos distintos mantêm suas escolhas ao alternar e recarregar. JSON malformado, array e modo desconhecido em localStorage são descartados; o modo desconhecido não é enviado como concessão. Registros e screenshots na integração. Não foi reiniciado o executável desktop Codex: o ciclo de vida testado foi o aplicativo web em Edge.

**Política server-side aprovada:** Perguntar/Planejar recusam mutações, inclusive payload forjado com modo Agente, grants e workspace externo; sessão inexistente é recusada. Valores conhecidos são preferências locais, não grants. Restauração não altera as validações do backend; modo conhecido é registrado explicitamente antes de executar.

### Regressão, comparabilidade e limites

- Baseline Arena sem correções locais: focada 84 pass/14 fail/13 skip; global 897 pass/75 fail/26 skip. Falhas ACL explicam a maior parte da diferença nova; logs/JSON preservados na raiz da evidência.
- Após correção, runner original sob carga: focada 96 pass/2 fail/13 skip; global 915 pass/57 fail/26 skip. Falhas novas são timeouts de 20 s, não relaxados no código nem nos testes versionados.
- Runner diagnóstico externo: mesmo conteúdo dos testes, `vizinho.test.ts` em Node (fetch nativo não aceita AbortSignal de jsdom), teto 60 s e quatro workers. Focada **98 pass/0 fail/13 skip**: App 49/13, rotas Agir 29/0, providersRepo 17/0 (inclui ACL Windows), rotas Provedores 3/0.
- A primeira global ajustada ficou 933 pass/39 fail/26 skip porque o harness omitiu `AGENTE_WINDOW_TEST_HOME`, fazendo seis testes de contexto/banco se autoignorarem. O flag foi corrigido e a execução completa repetida; placar final registrado abaixo. Nenhum resultado omitido ou tratado como aprovação.
- Testes adicionais reais de arquivos: **21/21**, incluindo paths externos Unicode, links/junctions, conflitos, criação exclusiva, erro de rename, compartilhamento Windows e exclusão bloqueada. F2/F4 mantêm D121.
- Typecheck passou após a correção; lint dirigido dos dois arquivos alterados passou. Lint global: **103 erros/19 avisos**, dívida distribuída anterior; sem alegar lint global verde. Build Vite e typecheck passaram no Windows, inclusive após a correção; avisos de chunks grandes permanecem. O wrapper executou `tsc -b --force` e `vite build` separadamente; não reativou helper nativo.
- Comparação anterior: 923/51/20 original e 934/40/20 ajustada; 21/21 arquivos e 23/1 integração. A alteração de runner/timeout e o flag de isolamento são explícitos; não comparar 933/39/26 como se fosse a mesma cobertura. A falha antiga do assert POSIX 0600 desapareceu da suíte Windows, substituída por inspeção real de DACL.

**39 falhas residuais da global ajustada:** 12 históricas em TerminalPanel (9), iconLabels (1), themeTokens (1), visualStates (1); 27 de portabilidade/expectativas Windows: gitHost (10, `mkdir` como executável Unix), worktrees (1, CRLF), fsHost (2, URI), searchEngine (2, URI), fronteiras de quatro casas (11, separadores), territorio (1, descrição POSIX versus path nativo). Nenhum desses arquivos foi alterado. A classificação deriva das mensagens individuais e da comparação com a auditoria anterior, não de uma suposta suíte global verde.

**Prioridades:** P1 no baseline = gravação ACL bloqueada, corrigida localmente; P2 = custo crescente de subprocessos ACL e timeouts, dívida Windows/runner, lint e falhas globais; P2 = recuperação operacional após falha arbitrária pós-publicação ainda depende de backup. F3 original e persistência Perguntar corrigidas nos cenários reproduzidos. Provedores reais e homologação humana não executados. Não há homologação automática nem autorização implícita para D98/Fatia 13.

### Fechamento dos placares e parecer

Global ajustada final, com `AGENTE_WINDOW_TEST_HOME` habilitado: **939 pass/39 fail/20 skip, 998 testes em 121 arquivos (108 arquivos pass/13 fail)**. Comparação por nome de teste com o JSON da auditoria anterior: **zero falhas novas**; removida somente a falha `providersRepo: salva em 0600 e relê`. Ganho de cinco aprovados em relação a 934/40/20 é consistente com quatro testes adicionados e a antiga falha corrigida. Os seis testes de contexto/grants SQLite executaram e passaram. O runner original e os timeouts continuam reprovados e não foram sobrescritos por esse resultado diagnóstico.

| Frente | Situação no escopo testado |
|---|---|
| F1 | Sessão/contexto/grants no servidor, Host/Origin e payload forjado passaram; seis testes de persistência/contexto executados. |
| F2 | Leitura externa e interna, links estáticos e paths Windows passaram nos testes adicionais, respeitando D121. |
| F3 | Corrida original passou em HTTP e UI; cancelamento pré-mutação, pós-conclusão e aprovação pendente/tardia passaram; concorrência coberta por rotas e disco. |
| F4 | Criação exclusiva, leitura prévia, conflito observável e falhas de publicação passaram; não se alega CAS universal. |
| F5-A | Quatro modos, recarga, perfil reaberto, conversas distintas, armazenamento inválido e política server-side passaram. |
| F5-B | Catálogo inicial, seleção explícita de par, Auto, prova verified e bloqueio sem fallback passaram; atualização tardia de catálogo na UI é discriminada no resultado E2E final abaixo. |

**Parecer:** a evidência resolve os defeitos reproduzidos de F3/Perguntar e valida DACL real após a correção adicional. Não permite declarar homologação global: persistem 39 falhas, lint global reprovado, timeouts, limites de recuperação e homologação humana pendente. É possível o dono avaliar depois uma autorização específica de investigação D98 com essas ressalvas; o reteste não fecha o Gate nem o inicia. Nenhuma implementação da Fatia 13.

**E2E final e repetição dirigida (sem somar cenários sobrepostos):**

- `fixed/integration-v3.json`: 26 pass/2 fail. Um fail era o harness de F5-B que supunha início de fetch após uma espera fixa de 1 s; foi substituído por barreira real no provedor fictício. O outro foi atualização de catálogo na UI além do teto de 10 s. F3 UI com efeito foi executado e passou nesta execução.
- `final/integration-v3.json`: **27 pass/3 fail** em fixture de longa duração. A barreira corrigida de F5-B, cancelamento após publicação e aprovação pendente/tardia passaram. Três falhas ao fim: UI não voltou a Enviar em 15 s; o teste F3 UI seguinte ficou impedido pelo estado anterior; catálogo novo não apareceu em 10 s. Não se considera a falha em cascata uma nova reprodução da corrida F3. Todos os logs originais foram mantidos.
- `e2e-repeat/integration-v3.json`: **6/6**, fixture nova, repetindo setup simulado, navegador, parada e atualização do catálogo com os mesmos limites originais, sem remover assertions. Portanto parada/catalogo não falham de forma determinística em fixture curta. Uma leitura HTTP do catálogo na fixture longa mediu 5.295 ms (`final/catalog-timing.json`), compatível com o custo da reaplicação de ACLs, mas insuficiente para atribuir toda intermitência exclusivamente a essa causa. F5-B fica aprovado nos contratos funcionais exercitados, com ressalva P2 de latência/intermitência E2E. A estabilidade da execução longa ainda impede homologação ampla.

**Mudanças desta missão:** somente o repositório de Provedores e seu teste Windows, mais consolidação nos canônicos 03/06/07/09 e arquivamento do relatório auxiliar. Nenhuma alteração em F3, App, terminal, Explorer core/server ou EditorArea. Um único grupo funcional de correção ACL e evidências; sem push. Ao entregar, encerrar servidores/Edge de teste e aguardar avaliação do dono. Relatório e código não iniciam D98/Fatia 13.
