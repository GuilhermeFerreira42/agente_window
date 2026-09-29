# 26 — MAPA DA SUÍTE E2E, AMBIENTE DE TESTES E BECOS SEM SAÍDA

**Data:** 2026-09-29 · **Escopo:** `platform/apps/workbench-v2/` (Playwright + Vitest) · **Válido para HEAD** `0e36af4` + c2 em working tree.
**Por que este documento existe:** duas IAs independentes gastaram turnos inteiros redescobrindo as mesmas regras de ambiente, e uma delas **apagou 206 arquivos reais** por rodar a suíte errada contra o servidor errado. Tudo o que está aqui foi vivido, não suposto. Fontes: sessão de trabalho do agente Arena (FATIA-04/05) e a auditoria externa `docs/engenharia_reversa/FATIA-05_LAYOUT/05_02_auditoria_externa_suite_e2e_e_raspagem.md`.

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

## 2. Inventário completo — 31 arquivos / 185 testes

### 2.1 Anti-regressão OBRIGATÓRIA em todo commit da FATIA-05 (`docs/24 §9`) — 12 suítes / 115 testes
| Spec | Testes | Mundo | Observação |
|---|---|---|---|
| `sessao_11_terminal_pty_real` | 6 | 5174 ou 5175 (não usa fs) | terminal homologado — **intocável** |
| `sessao_11_terminal_interactive_v2` | 3 | **5174** | idem |
| `sessao_12_explorer` | 30 | 5175 | **muta a árvore** (renomeia/apaga/cria) → reseed depois; T9 (X do Open Editors no hover) é flaky, re-rodar |
| `sessao_12_explorer_fs_backend` | 10 | 5175 | exige `seed.txt` intacto → reseed antes |
| `sessao_13_search` | 14 | 5175 | "across M files" ocasionalmente flaky |
| `sessao_13_search_backend` | 6 | 5175 | |
| `sessao_14_editor_anexo` | 16 | 5175 | T10 depende da seed; T13 flaky; **T14 hoje 15/16 com o c2** (`docs/25 §3`) |
| `sessao_14b_git_changes` | 11 | 5175 | `afterAll` apaga `.git` da fixture → reseed depois |
| `sessao_14b_git_backend` | 7 | 5175 | |
| `sessao_14b_git_smoke` | 1 | **5174** | repo real, autolimpa |
| `sessao_14c_diff_minimal` | 6 | 5175 | faz git-init da raiz da fixture; leftovers de 14b viram +1 no badge → reseed antes |
| `sessao_14d_commit_input` | 5 | 5175 | |

### 2.2 Spec da FATIA-05 em construção
| `sessao_15_activity_bar` | 5 | 5175 | T1 (c1) ✅ · T2–T4 (c2) ✅ · T5 (c3) falha por desenho até o c3 |

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
**Regra:** não corrigir código do terminal (intocável). Destino dos testes = decisão do usuário (`docs/25 §6 P3/P4`). Até lá: **não gastar tokens investigando-os**; contam como "pré-existentes" e ficam fora do critério de verde.

### 2.5 Números esperados hoje
- **Vitest:** `npx vitest run` → **708 passed / 9 failed / 717** (os 9 = `TerminalPanel.test.tsx`). Qualquer número diferente de 9 falhas é regressão.
- **Typecheck:** `npm run typecheck` (tsc -b --force) → **0 erros**. Não use `npx tsc` (sem node_modules instala pacote errado).
- **E2E completo** (auditoria externa em `ba571dd`, sem spec 15): 166/180 = 167 não-mortos verdes + 13 mortos + 1 flaky (12_explorer T9).

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

---

## 4. Becos sem saída (não tente de novo)

### 4.1 Memória
- **Dois Vite (5174+5175) + suíte com Monaco (14, 14c) → "Page crashed" / timeout em `page.reload`.** Parece regressão, é OOM. Rode com um Vite só.
- `--workers=2` → thrashing (46 s → 7 min por teste) e Chromium órfão.
- code-server (~900 MB com 2 extension hosts) não cabe junto com a bateria. Abrir pasta no 8080 via Playwright dispara extension hosts e trava.
- **Proibido** buildar VS Code/code-server da fonte (`docs/16`). Runtime pronto em `.cache` via script de restore; `/tmp` (tmpfs 1 GB) enche → `TMPDIR=/home/user/.cache/tmp`.

### 4.2 Playwright
- `addInitScript` roda também no `page.reload` — limpar `localStorage` só com flag em `sessionStorage` quando o teste precisa reler persistência.
- `mouse.move` com coordenadas fracionárias → ±1 px no delta. Arredondar e tolerar ±1.
- Transição CSS de largura quebra asserts de `boundingBox` — os componentes novos **não** têm transição (o VS Code real também não anima a Side Bar).
- `:has(> …)` não funcionou nos seletores do projeto.
- Activity Bar expõe `role="tab"`; `getByRole('tab', {name})` colide com abas do editor → escopar.
- Monaco DiffEditor: < 900 px vira inline; há 2 `.view-lines`.
- `WS /fs/watch` é flaky; `13_search` "across M files", `12_explorer` T9, `14` T13 são flaky conhecidos — re-rodar 1× antes de declarar regressão.

### 4.3 Vite / código
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
| `platform/apps/workbench-v2/shot.tmp.mjs` | print de uma URL sem travar com Monaco | **não** (temporário; ver `docs/28`) |
| `/home/user/restore-code-server.sh` | restaurar runtime do code-server em `.cache` e subir 8080 | fora do repo (cópia em `uploads/restore-code-server.sh.txt`) |
| `e2e_05_00/e2e_canonical_5175.sh`, `kill_orphans.sh` | driver de bateria e limpeza, do agente externo | **não estão neste clone** — só citados em `05_02`; recriar se necessário a partir de §3 |
| `platform/apps/workbench-v2/probe-terminal.mjs`, `validacao-real-workspace.mjs` | sondas antigas (FATIA-03/04) | sim; não usadas na FATIA-05 |
