# 09 - TESTES E AMBIENTE (da IA)

> **Leia a §1 antes de rodar qualquer spec.** Specs de fixture (`12*`, `13*`, `14*` menos `14b_git_smoke`) **só na 5175**; na 5174 elas apagam arquivos reais do repo. Um Vite por vez (RAM). Reseed antes de cada spec de fixture.


**Reorganizado:** 2026-10-03 (antigo `26`) · **Atualizado:** 2026-10-27 (D99 + D113–D119; evidências parciais F1–F5-B) · **Data original:** 2026-09-29 · **Escopo:** `platform/apps/workbench-v2/` (Playwright + Vitest). F1 commit `b2c49b4`: unit 6/6, typecheck e diff-check passaram, sem E2E/preview. F2 parcial Linux; Windows/junctions/reparse points não testados, exclusão bloqueada; achado de rename concorrente do pai expõe lacuna ainda sem correção. F3 `3bef5af`; teste adaptado ao addon nativo em `3d8695d`, rotas+agir 43/43. F4 parcial, escrita Agir bloqueada sem CAS. F5-A commitada (`d701a38`); F5-B segue `unknown` e Agir bloqueia antes do SSE. Regressão de 12 arquivos: 175 passou, 17 skipped e 1 falhou em teste App de regeneração, que passou isoladamente; sem causa determinada. `agirContext` + `database` 6/6 com HOME isolado; typecheck passou. `npm audit`: 9 dev vulnerabilities (3 critical, 2 high, 4 moderate), produção 0; sem upgrade. Nenhum provedor/credencial real, sem E2E browser, push ou homologação. O placar global histórico **934/13/22** pertence à etapa registrada, não foi rerodado integralmente nesta missão.
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

### 3.8 D98/PERF — protocolo da confirmação técnica (gate aberto; relatório preliminar não o conclui)
- **Estado verificado:** existe o relatório preliminar arquivado `docs/arquivo_morto/auditorias_2026-10-25/D98_RELATORIO_PRELIMINAR.md`: inspeção estática mais medições sintéticas isoladas; não houve trace CDP do produto real, SPEC quantitativa aprovada ou encerramento do gate. Isso é evidência histórica, não execução desta rodada nem autorização nova.
- **Gate atual:** não iniciar trace, benchmark nem protótipo nesta tarefa. Qualquer continuação futura depende da avaliação do dono e do protocolo/gates aplicáveis. Fatia 13 segue não iniciada.
- **Base:** D98 (`05`) + roadmap (`06`, entre 12 e 13, sem renumeração) + carta em `/home/user/notas_temporarias/carta_contexto_chat_arena_bug_desempenho.md` (fora do repo). Alvos a investigar: `platform/apps/workbench-v2/src/modules/explorer-search/`; superfície/UI e, apenas no escopo autorizado, `core/`/`server/`.
- **Ambiente isolado após validação:** Vite de teste na **5175** (nunca 5174); fixtures descartáveis em `/tmp` (repo Git fictício com N arquivos untracked); entre turnos reinstalar (`npm ci` + `PLAYWRIGHT_BROWSERS_PATH=...` + chromium). Nenhum dado real do usuário deve ser alterado.
- **Passo 1 — trace:** depois do gate, medir SCM com 5k/10k alterações e correlacionar tempo de `/git/status`, tarefas longas, commits React e elementos DOM/renderizados. Alegação de que Git é rápido e UI é gargalo é hipótese da carta, não fato confirmado.
- **Passo 2 — protótipo:** lista virtualizada TEMPORÁRIA, fora do código de produção, sobre a mesma fixture e com Git/API constantes; medir ganho isolado da UI. Não promover protótipo a produção.
- **Passo 3 — Explorer:** medir 1k/5k filhos com logging progressivo de `list`/`stat`; o 5k anterior foi inconclusivo.
- **Métricas para fundamentar a SPEC:** tempo até interface utilizável; execução de tarefas longas; número de elementos renderizados; grandes volumes; tempos e gargalos separados de Git e filesystem. Propor limites quantitativos só após obter baseline comparativo e então aguardar aprovação do dono.
- **Proibido:** rodar contra 5174 com arquivos reais; alterar produção antes de SPEC mínima aprovada; declarar hipótese como causa provada.

### 3.9 Responsabilidade e segurança dos testes com provedores reais (D91, opção C; reafirmado D99)
- Arena executa testes técnicos automatizados: unitários, integração, E2E, regressão e benchmarks.
- Um provedor real só pode ser validado com ambiente legítimo, acesso seguro e autorização. Nunca solicitar, registrar ou expor chaves/credenciais em conversa, código, documentos ou logs.
- Se o ambiente/acesso/autorização não estiver disponível, registrar o teste real como **bloqueado/não executado**; não substituir por um stub e chamá-lo de teste real.
- Testes automatizados e validação de integração não substituem a **homologação funcional do dono** (`08`).

**D102 — método triplo, aprovado apenas como governança documental (26/10/2026):** para cada CAP, verificar (a) **código** com arquivos/commits e fronteiras observadas, (b) **especificações/documentação pública** versionadas, separando promessa de implementação, e (c) **testes/métricas reproduzíveis** sob condições equivalentes. Não registrar superioridade/equivalência sem (c) pertinente; quando comparação real não for viável, marcar não testado, inconclusivo ou não comparável. Evitar importar código de referências com licença/proveniência inadequadas. Esta metodologia não autoriza executar D98, alterar produção ou criar SPEC definitiva antes do gate de auditoria Arena.

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

**Escopo e estado:** D98 mantém seu próprio gate e protocolo em §3.8; esta metodologia geral não inicia trace, benchmark, protótipo ou fatia, nem autoriza alteração permanente. Nesta atualização documental não foram executados testes comparativos, benchmark, trace, provedores reais ou homologação; D98 continua aguardando a avaliação solicitada. Nenhum resultado de paridade ou superioridade é declarado.

---

### 3.11 Protocolo de evidência CAP → SPEC → teste → aceite (auditoria 2026-10-25)

O `06` contém a **única matriz de vínculo CAP-01–CAP-20** e seus destinos confirmados ou candidatos; `02` define as capacidades e cenários, `08` define a avaliação humana. Este item descreve **como produzir evidências futuras**, não executa testes nem cria SPEC.

Para cada CAP e cenário que entrar em uma SPEC aprovada, registrar um caso de prova com: **ID CAP/cenário**; fatia/iniciativa **aprovada**; SPEC/versão/contratos; código/commit/ambiente; fixture e integridade; provedor/modelo real ou stub **explicitamente diferenciado**; pré-condições; ações, chamadas de ferramentas e resultados; métricas/limiares fixados **antes** das rodadas; repetição, erros e cancelamento; regressões afetadas; artefatos; parecer técnico e aceite humano pendente ou efetuado.

**Cobertura mínima a planejar:** cenário 1 = escala e correção do mapa arquitetural; cenário 2 = plano, filesystem, comandos, Git e testes; cenário 3 = reinício/rehidratação sem duplicar side effects; cenário 4 = instalação/remoção e permissão de integração; cenário 5 = ciclo multi-sessão com decisões/documentação/execução. A associação de CAPs a cenários permanece **proposta** no `06`, não é critério técnico aprovado.

**Gates:** sem SPEC/decisão, classificar como **não planejado para execução**; sem teste, **não testado**; evidência parcial não equivale a conformidade da CAP inteira. Metodologia comparativa D101 continua em §3.10; não confundir com homologação humana. Testes históricos não são repetidos por este adendo.

**D98 (preliminar externo de 25/10):** medição sintética isolada e inspeção estática documentadas em cópia de `arquivo_morto/auditorias_2026-10-25/D98_RELATORIO_PRELIMINAR.md`; não houve execução comprovada de trace CDP end-to-end no aplicativo real nem demonstração de ganho em React do produto. O relatório é insumo **hipotético/preliminar**, não baseline homologada para SPEC quantitativa. Respeitar §3.8 e a aprovação pertinente antes de novos traces/alterações.

### 3.12 Plano preliminar de verificação D103–D112 (registro histórico; não é SPEC)

Este roteiro documenta o estado e as propostas de D103–D112. D119 depois autorizou somente F1–F4/F5-A/F5-B; evidência de F1 consta na tabela e em 3.14. Este roteiro não autoriza iniciar D98, alterar serviços ou executar capacidades fora do escopo aprovado; aprovação não é homologação.

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

Os casos detalhados, componentes, erros e critérios mensuráveis estão nas SPECs F1–F4, F5-A (enforcement de modos) e F5-B (catálogo/seleção exata de modelos), além da avaliação F6–F8, em `06` (“Auditoria técnica F1–F8”). D119 autoriza implementação/testes somente das seis frentes aprovadas, em ordem e com commits separados; aprovação não substitui homologação. Usar ambiente seguro, fixtures descartáveis e limites prévios. Testes E2E mutáveis: fixture isolada na porta prevista (5175), nunca repo-backed 5174.

A bateria completa ainda deve separar: (1) autoridade e limite local, incluindo rota de revelação de chave sem registrar valor, Windows/rede externa e perfil standalone; (2) contenção física de symlink/junction/reparse point por SO; (3) cancelamento/ACK de Parar/aprovação/continuação concorrente; (4) criação exclusiva e escrita condicional sob colisão/falha; (5) enforcement server-side de Perguntar/Planejar/Agir, seleção explícita e Auto por execução, disable/remoção durante request e entre chamadas no mesmo run, sem fallback; (6) comportamento real do indicador/anexos; (7) restart/claim apenas quando M7 tiver SPEC; (8) limites de varredura/leitura e proteção de segredos após medição. “Não testado” em sistema/permissão não disponível não conta como aprovado. F1 tem implementação e evidência técnica parcial documentadas em 3.14; critérios completos não foram todos verificados e nenhuma homologação ocorreu. F2 tem helper nativo Linux em teste parcial, conforme §3.15; Windows/macOS e exclusão continuam bloqueados sem fallback path-based, e a SPEC integral não foi homologada. F3–F5-B estão em implementação/validação sequencial D119, sem homologação; evidências e lacunas atuais estão em `03` e `06`. Em F5-B, capability desconhecida bloqueia Agir antes de SSE. F6–F8 não estão autorizadas. D113–D119 são decisões de produto, não substitutos de teste.

### 3.14 F1 — verificações desta missão (2026-10-26; sem homologação)

- **Typecheck:** `npm run typecheck` passou após conectar `validarContexto` à rota e ao loop Agir.
- **Testes focados:** `npm test -- src/server/localBoundary.test.ts src/server/session-persistence/database.test.ts src/server/session-persistence/agirContext.test.ts src/bairros/2-inteligencia/casas/agir/__tests__/agir.test.ts src/bairros/2-inteligencia/casas/agir/__tests__/rotas.test.ts` — 5 arquivos, **43/43**; `src/__tests__/App.test.tsx` adicionalmente: **46 passaram, 13 skipped**.
- **Integração Vite em `127.0.0.1:5175`, com HOME, workspace e JSON de provedores descartáveis em `/tmp`:** GET same-origin `/api/providers` → 200; PUT cross-origin → 403; POST sem Origin → 403; Host não autorizado → 403; tentativa de upgrade WebSocket PTY com Origin hostil → rejeitada. Fixture de provedores permaneceu byte-a-byte intacta; servidor parado sem erro no shutdown. Teste adicional: iniciar Vite com `--host 0.0.0.0` falha fechado na resolução de config (exit 1, sem listener). Nenhum shell/PTY autorizado foi iniciado.
- **Build:** `npm run build` não passou: o processo Node atingiu o limite de heap durante transformação do Vite (`FATAL ERROR: Reached heap limit Allocation failed`). TypeScript havia concluído antes; build não aprovado.
- **Não executados/inconclusivos:** Windows e primitivas específicas do SO; E2E em browser do fluxo de criação de sessão; rede externa real; preview `server.mjs` em runtime (artefatos de build ausentes após OOM); code-server e PTY standalone; handshake WebSocket autorizado; provedores/credenciais reais; revisão humana/homologação. Não inferir aprovação destes critérios a partir dos checks locais.

### 3.15 F2 — helper nativo Linux (2026-10-26; parcial, sem homologação)

- **Construção:** `cd platform/apps/workbench-v2 && npm run build:fs-boundary` — passou em Linux x64, Node 20.20.2, kernel 6.1.158. Exige toolchain C++/Python no build. Helper está no mesmo processo; não inicia servidor/porta/processo.
- **Typecheck:** `npm run typecheck` passou após integrar `fsSeguro.ts`, executor e fechamento explícito do descritor raiz por fluxo.
- **Testes focados:** `npx vitest run src/bairros/2-inteligencia/casas/agir/__tests__/fsSeguro.test.ts src/bairros/2-inteligencia/casas/agir/__tests__/discos.test.ts src/bairros/2-inteligencia/casas/agir/__tests__/lixeira.test.ts src/bairros/2-inteligencia/casas/agir/__tests__/excluir.test.ts src/bairros/2-inteligencia/casas/agir/__tests__/rotas.test.ts` — **5 arquivos, 38/38** (22 dedicados a FS/lixeira/excluir). Testa leitura/listagem/criação exclusiva/escrita; traversal, caminho absoluto, symlink/hardlink; busca não segue symlink; worker concorrente alterna diretório e symlink enquanto o processo tenta read/create/write; sentinelas externas ficaram intactas. Lixeira/exclusão e prévia não acessam o disco e falham fechado.
- **Fora da evidência:** build Vite completo não rerodado (OOM prévio); suíte unitária completa e E2E não rodadas após F2; Windows/macOS, junction/reparse points, troca concorrente em hardware Windows e homologação humana não executados. Não declarar F2 concluída.
- **Suíte global:** `npx vitest run` → 934 passou / 13 falharam / 22 skip. Falhas: `App.test.tsx` (assert de regeneração), `TerminalPanel.test.tsx` (9; corresponde ao conjunto já registrado em baseline histórico), `iconLabels.test.ts`, `themeTokens.test.ts`, `visualStates.test.ts` (3). Não foi rerodado um baseline integral antes desta missão; não atribuir causalidade à F2. Os cinco arquivos focados F2 passaram.
- **Uso:** compilação do addon é requisito das operações Linux; `npm run build` e `npm run preview` chamam o build nativo. Sem o `.node`, kernel compatível ou syscall permitida, F2 retorna indisponível e nunca usa caminhos Node como fallback.

### 3.16 Continuidade D119 — correções e achados (2026-10-27)

#### F1
- Commit `b2c49b4` endurece rotas locais sensíveis: sem Origin, leituras `/api`, `/fs`, `/git`, `/pty` exigem `Sec-Fetch-Site: same-origin`; mutações exigem Origin exato e JSON (`application/json`), e Fetch Metadata incompatível quando presente é rejeitado.
- `npx vitest run src/server/localBoundary.test.ts --reporter=dot`: **6/6**; `npm run typecheck -- --pretty false` e `git diff --check`: passaram. Sem novo E2E de browser, preview ou revisão visual/operacional; F1 permanece parcial, sem homologação.

#### F2
- Com addon Linux compilado: `fsSeguro.test.ts` + `discos.test.ts`, **18/18**. Isso não cobre o novo achado adversarial: um harness Node isolado executou `SandboxRoot.createExclusive` enquanto um Worker renomeava `workspace/slot` para `outside/slot` e de volta; foi observada publicação transitória de `probe-0` em `outside/slot` (`ok:1000`, `fail:2`). Depois de parar o Worker, a pasta foi movida de volta antes da contagem e o fixture foi limpo; o contador externo final zero não elimina a observação durante a corrida.
- Não houve alteração de produção para resolver essa janela. É limitação concreta para movimento concorrente do diretório-pai; não declarar contenção geral completa. A bateria anterior cobre troca de symlink/diretório em condições diferentes, não prova ausência desta janela. Windows permanece não testado; exclusão continua fail-closed.

#### F3 / contexto de sessão
- `rotas.test.ts` inicialmente falhou apenas porque esperava `ok:false` sem considerar o addon nativo disponível; com addon ativo, criação válida conclui. O teste agora afirma um único `tool_result`, status correspondente ao addon e ausência de segundo efeito; com addon, valida bytes `oi`; sem addon, valida bloqueio. `rotas.test.ts` + `agir.test.ts`: **43/43**, commit de teste `3d8695d` (separado do commit F1). Isso resolve a expectativa desatualizada do teste, não altera a lógica de claim/cancelamento.
- `agirContext.test.ts` + `database.test.ts`: **6/6** ao executar com `AGENTE_WINDOW_TEST_HOME` e `HOME` em diretório temporário isolado, removido após os testes.

#### Regressão/UI
- Regressão de 12 arquivos e seleção F1/F3/F5-A/B: **175 passou, 17 skipped, 1 falhou**. Única falha: `App.test.tsx` → “conecta regenerar e feedback ao estado persistido da mensagem”, status esperado “Resposta regenerada”, recebido “Regenerando resposta”. Reexecução isolada desse teste: **1/1 passou**. Sem comparação integral nova com baseline nesta continuidade; causa inconclusiva, não atribuir como regressão nem como ambiente comprovado.
- Warnings `fetch('/fs/workspace')` relativo inválido e respostas 404 são dos mocks/jsdom e não impediram os demais casos, mas permanecem ruído de teste. Suite E2E de navegador e suíte global completa não foram rodadas.

#### F5-B: contrato DeepSeek e dependências
- A documentação oficial DeepSeek descreve tool calls em OpenAI Chat Completions e diz que no thinking mode o `reasoning_content` precisa ser enviado em todas as chamadas subsequentes que carregam `tools`; sua ausência pode produzir HTTP 400. O endpoint oferece `thinking.type=disabled`, mas o adaptador Agir não preserva `reasoning_content` nem desabilita thinking. O modelo pode declarar suporte a tools e ainda assim o par/configuração não ser compatível com Agir. Estado permanece `unknown`/bloqueado; nenhuma chamada upstream, chave ou segredo foi usado. Referências: https://api-docs.deepseek.com/guides/tool_calls/ · https://api-docs.deepseek.com/guides/thinking_mode/ · https://api-docs.deepseek.com/api/create-chat-completion/.
- `npm audit`: **9 vulnerabilidades** no grafo total (3 critical, 2 high, 4 moderate); `npm audit --omit=dev`: **0**. `npm ls`: Vite 5.4.21, Vitest 2.1.9, `@vitest/coverage-v8` 2.1.9, tinypool 1.1.1. Correções propostas pelo audit envolvem majors; nenhum upgrade/`npm audit fix` foi executado.

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
