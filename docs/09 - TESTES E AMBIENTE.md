# 09 - TESTES E AMBIENTE (da IA)

> **Leia a §1 antes de rodar qualquer spec.** Specs de fixture (`12*`, `13*`, `14*` menos `14b_git_smoke`) **só na 5175**; na 5174 elas apagam arquivos reais do repo. Um Vite por vez (RAM). Reseed antes de cada spec de fixture.


**Reorganizado:** 2026-10-03 (antigo `26`) · **Atualizado:** 2026-10-12 (acrescentada a §11 — análise de vídeos do usuário) · **Data original:** 2026-09-29 · **Escopo:** `platform/apps/workbench-v2/` (Playwright + Vitest) · **Válido para HEAD** `a65a246` (Fatia 06 consolidada). Placar focado atual: typecheck 0; WorkspaceSwitcher 3/3; SessionLanding 11/11; workspaces 7/7; providers 2/2; App 46 pass / 13 skip. Placar global histórico: 722 pass / 9 falhas P4 preexistentes / 16 skip.
**Por que este documento existe:** duas IAs independentes gastaram turnos inteiros redescobrindo as mesmas regras de ambiente, e uma delas **apagou 206 arquivos reais** por rodar a suíte errada contra o servidor errado. Tudo o que está aqui foi vivido, não suposto. Fontes: sessão de trabalho do agente Arena (FATIA-04/05) e a auditoria externa `docs/arquivo_morto/engenharia_reversa/FATIA-05_LAYOUT/05_02_auditoria_externa_suite_e2e_e_raspagem.md`.

---

## 1. Os dois mundos (LEIA ANTES DE RODAR QUALQUER SPEC)

| Mundo | Servidor | O que ele expõe | Quem roda nele |
|---|---|---|---|
| **5174 — repo real** | `npx vite --port 5174 --strictPort` (em `platform/apps/workbench-v2`; é o `baseURL` padrão do `playwright.config.ts`) | O próprio `/home/user/agente_window` via plugins fs/git | Specs de **shell/terminal** e `sessao_14b_git_smoke` |
| **5175 — fixture descartável** | `FS_TEST_ROOT=file:///tmp/explorer-fs-fixture npx vite --port 5175 --strictPort` | A pasta `/tmp/explorer-fs-fixture/e2e-fixture-root/` (semeada pelo teste) | Specs de **módulo** (12, 13, 14, 14b_*, 14c, 14d, 15) com `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175` |

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
### 3.2 Servidores — sempre via `start_process` (nunca em bash de fundo), bind 0.0.0.0
- Fixture: `FS_TEST_ROOT=file:///tmp/explorer-fs-fixture npx vite --host 0.0.0.0 --port 5175 --strictPort`
- Repo: `npx vite --host 0.0.0.0 --port 5174 --strictPort`
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

### 3.7 Régua pós-MVP — 08→09→10→11 em série (receita 20/10, FATIA 11 C3)
- **Browsers:** `PLAYWRIGHT_BROWSERS_PATH=/opt/playwright/browsers` (já vem com chromium) — `npx playwright install` FALHA (lock sem permissão) e não é preciso.
- **Stubs (fora do repo, `start_process`):** `node /home/user/uploads/stub_provider.cjs` (4599 — 08/09) + `node /home/user/uploads/stub_agir.cjs` (4610 **v3** — 10/11; v3 tem o cenário `TETO_INFINITO`).
- **Vite:** `AGENTE_WINDOW_PROVIDERS_PATH=/tmp/prov-fixture/providers.json AGENTE_WINDOW_SETTINGS_PATH=/tmp/f11-e2e-settings.json npm run dev -- --host 0.0.0.0 --port 5174` (a 08 **amarra** o caminho `/tmp/prov-fixture/providers.json` — outro caminho = 6 fails no beforeEach; `mkdir -p /tmp/prov-fixture` antes).
- **Ordem canônica OBRIGATÓRIA** (uma spec por comando — múltiplos posicionais o Playwright ignora): `provedores_fatia08` → `conversa_fatia09` → `agir_fatia10` → `teto_fatia11`. Esperado: **6/6 + 5/5 + 5/5 + 2/2 = 18/18**.
- **Por que a ordem importa (DEBT-21):** as specs dividem o armazém persistente (`~/.agente_window/*.jsonl` + `.db`, sem fixture): sobras `AGIR-E2E-*`/`TETO-E2E-*` com pasta apagada quebram a 09 (clica a 1.ª linha → 409), e a T4 da 09 semeia bolhas "Chave inválida (erro 401)" que quebram a T4 da 08 (assert página-inteira). Higiene: DELETE nas sobras via `/api/sessions/<id>?force=true` antes da 09; neutralizar o texto nas `.jsonl` se a 08-T4 reclamar (Vite parado).

---

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
**Limitação registrada (honesta):** a prova automatizada usa **serviço simulado**; a validação com **provedor real** é o roteiro do dono (`08` PARTE C). A migração do v1 real só será exercitada no primeiro uso do dono (o sandbox não tem o arquivo dele).

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
