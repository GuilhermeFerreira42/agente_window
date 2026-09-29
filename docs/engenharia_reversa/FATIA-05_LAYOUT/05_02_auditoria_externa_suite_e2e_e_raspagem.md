> **Nota de contexto (adicionada 2026-09-29 pelo agente Arena ao incorporar este relatório):** documento produzido por **outra IA**, a partir de um clone do GitHub em `ba571dd` (= conteúdo do nosso `2eab62b`, antes do c1), **sem o contexto desta sessão**. Ele repete o Gate 0 de forma independente e chega às mesmas conclusões da raspagem `05_01`, **e acrescenta** o que não tínhamos: o mapa completo da suíte E2E (30 arquivos/180 testes, 13 mortos do commit `75c6686`), a causa das 9 falhas do Vitest, o incidente de destruição do `legacy/` pelas specs de fixture contra a 5174, e a medição do painel maximizado. O que ele chama de "Gate 0 aguardando aprovação" já foi superado (aprovado; c1 commitado). Os scripts `e2e_05_00/*` e a pasta `raspagem_05_00/` que ele cita **não vieram** para este clone. Conteúdo consolidado em `docs/26` e `docs/25`; original abaixo, sem edição.

---

# 05_00 — Relatório de Validação Pré-Fase (Gate 0 da FATIA-05)

**Fonte de autorização:** docs_24 §2 (FATIA-05), Gate 0 conforme §2.4 — **sem alteração de código, build, .env ou tradução**.
**Data:** 2026-09-29 · **HEAD do clone:** `ba571dd` ("finalizado 4.7. Documentação atualizada.")
**Estado do working tree ao final:** apenas `?? docs/engenharia_reversa/FATIA-05_LAYOUT/` (evidências desta fase — untracked, sem commits). HEAD intacto.

---

## 1. Sumário executivo

| Verificação | Resultado |
|---|---|
| Leitura da documentação (D1–D21) | ✅ concluída |
| Auditoria código × documentação | ✅ 7 achados (reportados no chat do Gate 0; nenhum bloqueia 5.1) |
| Typecheck (`tsc -b --force`) | ✅ **0 erros** |
| Vitest | ⚠️ **708/717** — 9 falhas caracterizadas, pré-existentes (§4) |
| E2E Playwright (suíte completa, 30 arquivos/180 testes) | ⚠️ **166/180** — 13 falhas pré-existentes (commit `75c6686`) + 1 flaky (§5) |
| Raspagem da régua 8080 | ✅ 6 rodadas, 89 medições, 24 prints (`05_01_raspagem_layout_vscode.md`) |
| Alterações de código/build/.env/tradução | ✅ **nenhuma** (Gate 0 íntegro) |

**Conclusão:** Gate 0 **CUMPRIDO** com ressalvas caracterizadas (nenhuma causada por esta fase). Protocolo de bateria E2E descoberto e documentado (§5.1) — item obrigatório de leitura antes da sub-fase 5.1. **Parar aqui e aguardar avaliação do usuário**, conforme docs_24 §2.

## 2. Integridade do repositório

- Nenhum commit, stage ou edição de código foi realizada. `git log -1` = `ba571dd`; `git status --porcelain` = apenas o diretório de evidências untracked.
- **Incidente do turno (documentado na íntegra em §6):** a 1ª tentativa da bateria E2E rodou os specs de *fixture* contra a porta 5174 (raiz REAL do repo) e as ações de UI dos testes **deletaram o diretório `legacy/` inteiro (206 arquivos)**. Restaurado integralmente via `git checkout -- legacy/` (todos os arquivos eram trackeados no HEAD — perda zero). Verificação pós-restauração: working tree limpo exceto evidências.

## 3. Typecheck

`npm run typecheck` (tsc -b --force): **0 erros** no HEAD `ba571dd`.

## 4. Vitest — 708/717 (9 falhas pré-existentes, caracterizadas)

- Arquivo: `src/components/terminal/__tests__/TerminalPanel.test.tsx` — espera elemento com `role="region"` acessível pelo nome **"Terminal"**.
- Implementação: `src/components/terminal/VSCodeTerminal.tsx` (l.~868) renderiza o painel com `aria-label="Painel Inferior"`.
- Ambos os arquivos têm última alteração no commit **`75c6686` (2026-09-17, "COMITE_HOMOLOGACAO_TERMINAL_V2_E_CONSOLIDACAO_PRE_FATIA_04")** ⇒ divergência teste×implementação **já presente no HEAD**, anterior à FATIA-05.
- Impacto: nenhum no E2E (specs E2E de terminal que dependem de rótulos estão entre as 13 falhas pré-existentes de §5.2 — mesma família/commit).
- Decisão Gate 0: **caracterizar, não corrigir** (regra docs_24 §2.4). Correção só se autorizada pelo usuário em fase própria.

## 5. E2E Playwright — caracterização completa da suíte (30 arquivos / 180 testes)

### 5.1 Protocolo operacional descoberto (CRÍTICO para a bateria §8 da FATIA-05)

A suíte tem **dois mundos** com servidores diferentes — rodar o mundo errado contra o servidor errado produz 48+ falsas falhas e **destruição de arquivos reais** (§6):

1. **Mundo 5174 (raiz real `/home/user/agente_window`)** — 21 arquivos / 75 testes: `sessao_01–sessao_11*` (exceto os 5 arquivos §5.2), `sessao_14b_git_smoke`, `validacao3_*`, `gate0_validation`, `debug_terminal_toggle`. Invocação: `npx playwright test <specs> --workers=1` com Vite na 5174.
2. **Mundo 5175 (fixture `FS_TEST_ROOT=file:///tmp/explorer-fs-fixture`)** — 9 arquivos / 105 testes: `sessao_12_explorer`, `sessao_12_explorer_fs_backend`, `sessao_13_search(_backend)`, `sessao_14_editor_anexo`, `sessao_14b_git_backend`, `sessao_14b_git_changes`, `sessao_14c_diff_minimal`, `sessao_14d_commit_input`. Invocação:
   - subir: `FS_TEST_ROOT=file:///tmp/explorer-fs-fixture vite --port 5175 --strictPort` (a partir de `platform/apps/workbench-v2`);
   - rodar: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175 npx playwright test <spec> --workers=1`.
3. **Seed prístina antes de CADA spec de fixture.** O `seedFixture()` do `sessao_12_explorer` é `beforeAll` (1×/arquivo) e os próprios testes de 12_explorer **mutam a árvore** (renomeia `renomeavel.txt`, deleta, cria). Por isso `12_fs_backend` (exige `seed.txt` intacto), `14_editor_anexo` (T10 depende da seed) e `14c` (git-init da raiz inteira da fixture — leftovers viram +1 no badge) **falham se executados após um 12_explorer completo sem re-semeadura**. Driver validado: `e2e_05_00/e2e_canonical_5175.sh` (re-semeia rodando apenas o teste "boot: módulo" do 12_explorer antes de cada spec).
4. **`--workers=1` obrigatório** no sandbox: com 2 workers (2×Chromium+Monaco+Vite, sem swap) o sistema entra em thrashing — durações crescentes (46 s → 7,7 m por teste de timeout 30 s) e processos Chromium órfãos.
5. **Aquecer o dev server antes da bateria** (1 carga manual): o cold-start da compilação Vite/Monaco excede o timeout de 30 s do 1º teste.
6. **inotify:** `sudo sysctl -w fs.inotify.max_user_watches=1048576` e `max_user_instances=1024` (lição docs/12 confirmada).
7. `sessao_14b_git_smoke` opera contra o repo REAL por cliques (autolimpa `e2e-smoke-<pid>.txt` em `afterEach`) — seguro, verificado.

### 5.2 Resultados

**Mundo 5174 — 62/75** (bateria em 2 grupos; re-execução individual dos falhos confirmou falha idêntica isolada):

| Spec | Resultado | Natureza |
|---|---|---|
| sessao_01–07, 09 (36 testes) | ✅ 36/36 | |
| sessao_11_terminal_pty_real (6), 11_interactive_v2 (3) | ✅ 9/9 | anti-regressão blindada verde |
| sessao_08_filesystem | ✗ 2/5 | T2 espera árvore demo **"Workspace Files"** (substituída pelo módulo real — transição documentada em docs/12); T3/T4 esperam botão "Escolher pasta real do disco/Trocar pasta" inexistente |
| sessao_10_custom_view_grid | ✗ 3/6 | T3/T4/T5 — `locator.click` timeout 30 s (F5/persistência da custom view) |
| sessao_11b_visual | ✗ 0/1 | espera 2 abas em tablist "Terminais abertos" |
| sessao_11c_clear_active | ✗ 0/1 | espera marcador `MAIN_CLEAR_*` no xterm ativo |
| sessao_11d_split_sash | ✗ 0/1 | espera `role=separator` name "Redimensionar split do terminal" |
| sessao_11e_theme_states | ✗ 0/2 | espera atributos `[data-pty-session-id$=":0"]` |
| sessao_11f_context_menu | ✗ 0/2 | ações do menu de contexto do terminal |
| sessao_14b_git_smoke, validacao3 (4), gate0, debug | ✅ 7/7 | |

**Os 13 falhos têm o mesmo perfil:** todos os 5 arquivos têm última alteração no commit **`75c6686`** (2026-09-17, pré-FATIA-04) e alvo rótulos/comportamentos do terminal pré-consolidação — a mesma divergência família-das-9-falhas do vitest (§4). **Pré-existentes no HEAD `ba571dd`; não causados pela FATIA-05.**

**Mundo 5175 (protocolo canônico, seed fresca por spec) — 104/105:**

| Spec | Resultado |
|---|---|
| sessao_12_explorer (30) | ✅ 29/30 — **T9 flaky** ("X" do Open Editors aparece no hover): verde em 3 outras execuções do mesmo dia (chunk B' 60/60, pass1 30/30); sensível a timing de hover |
| sessao_12_explorer_fs_backend (10) | ✅ 10/10 (com seed prístina; sem ela, 6 falham por árvore mutada/ausente) |
| sessao_13_search (14) / 13_search_backend (6) | ✅ 20/20 |
| sessao_14_editor_anexo (16) | ✅ 16/16 (com seed prístina; T10 falha sem ela) |
| sessao_14b_git_backend (7) / 14b_git_changes (11) | ✅ 18/18 |
| sessao_14c_diff_minimal (6) | ✅ 6/6 (com seed prístina; T5 badge+1 com leftover de 14b) |
| sessao_14d_commit_input (5) | ✅ 5/5 |

**Total geral: 166/180 (92,2%). Excluindo os 13 pré-existentes do `75c6686`: 166/167 (99,4%).**

### 5.3 Bateria §8 recomendada para a FATIA-05 (definição operacional)

1. `npx playwright test sessao_01 sessao_02 sessao_03 sessao_04 sessao_05 sessao_06 sessao_07 sessao_08 sessao_09 sessao_10 sessao_11 validacao3 gate0 debug sessao_14b_git_smoke --workers=1` (porta 5174, servidor aquecido) — esperado: 62/75, com exatamente os 13 pré-existentes falhando.
2. Mundo 5175 com seed fresca por spec (driver `e2e_05_00/e2e_canonical_5175.sh`) — esperado: 104/105 (re-run do flaky T9 se falhar).
3. Critério de verde da anti-regressão: **os 167 testes não pré-existentes passando** (13 do `75c6686` ficam fora até decisão do usuário).

## 6. Incidente do turno — execução contaminada contra a 5174

- **O quê:** na 1ª tentativa da bateria, os 9 specs de fixture rodaram contra a 5174 (raiz real) — 48 falsas falhas (403/404 do adapter FS) **e mutações reais de disco pela UI dos testes**, incluindo a **deleção completa de `legacy/` (206 arquivos)**.
- **Restauração:** `git checkout -- legacy/` — todos os 206 eram trackeados no HEAD; perda zero. Working tree verificado limpo (apenas `?? docs/engenharia_reversa/FATIA-05_LAYOUT/`).
- **Lição permanente:** os specs de fixture fazem operações destrutivas (delete/rename/discard) na árvore que o servidor expõe. **Nunca rodar `sessao_12/13/14*` (exceto `14b_git_smoke`) contra a 5174.** O protocolo §5.1 elimina esse risco.

## 7. Raspagem da régua (resumo)

6 rodadas (tema claro + Dark Modern via settings temporário com restauração exata; Restricted Mode contornado com `security.workspace.trust.enabled: false` temporário): shell, activity bar (7 itens, badge SCM "2" 16×16 `#0078d4`/branco 9px raio 20), side bar (300 default / **min 170** / **max 1132** / colapso além do mínimo), painel (alinhado à side bar; maximizado `x=348 y=35 w=752 h=843` mantendo side bar/activity bar), tokens Dark Modern (batem 1:1 com 04_17). Detalhe completo: **`05_01_raspagem_layout_vscode.md`** (89 medições, 24 prints, JSONs em `raspagem_05_00/`).

## 8. Lições operacionais do ambiente (por turno)

- Reinstalar por turno: `npm install` (platform), `npx playwright install chromium` + `sudo npx playwright install-deps chromium`, runtime code-server em `.cache` (nunca `/tmp`).
- RAM (~2 GB): code-server (~900 MB com 2 extension hosts) **não cabe junto** com Vite+Chromium da bateria — parar o code-server durante o E2E e reerguer depois (feito neste turno; comando exato em `e2e_05_00/`).
- Scripts `.cjs` de raspagem exigem `NODE_PATH` com `platform/node_modules`.
- Bateria com timeout do wrapper: sempre redirecionar saída para log em arquivo (o pipe morre com o wrapper e perde o resumo); processos órfãos de Chromium exigem limpeza por PID/padrão seguro (`e2e_05_00/kill_orphans.sh`).

## 9. Próximos passos (conforme docs_24)

1. **AGUARDAR AVALIAÇÃO DO USUÁRIO deste relatório** (Gate 0 concluído).
2. Se aprovado: sub-fase **5.1** (3 commits), parando ao final para nova avaliação. Nenhum código antes da aprovação.

**Evidências anexadas:** `raspagem_05_00/` (scripts, JSONs, prints), `e2e_05_00/` (logs de todas as execuções E2E do turno, driver canônico, kill_orphans, comando do code-server).
