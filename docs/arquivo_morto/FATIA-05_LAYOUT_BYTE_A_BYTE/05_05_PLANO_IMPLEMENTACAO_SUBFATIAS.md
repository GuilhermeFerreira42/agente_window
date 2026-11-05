# 05_05 — Plano de Implementação — Sub-fatias 5.1 a 5.7

Transcrição fiel do comando do usuário (2026-09-28) **+ pontos de atenção** levantados na auditoria (`05_01`, `05_03`). Onde o plano do usuário e a régua real divergem, o item está marcado **⚠️ DECISÃO ABERTA** — nada foi decidido pelo agente.

## 0. Pontos de atenção transversais (ler antes de autorizar a 5.1)
| # | Ponto | Origem | Proposta de tratamento |
|---|---|---|---|
| A0.1 | **Perfil `agentsWindow` real fixa Activity Bar (esquerda), Side Bar (left) e Panel (bottom) como readOnly** e **oculta a Status Bar** | `05_01 §0` (JS 1.135) | 5.4 vira "⚠️ DECISÃO ABERTA": (a) seguir o real = posições fixas, 5.4 cancelada/reduzida; (b) manter a configurabilidade pedida como extensão consciente, documentada como desvio |
| A0.2 | O comando diz "Código APENAS em `src/components/` + extensões mínimas em `App.tsx`" e "zero alteração em `src/modules/explorer-search/`"; mas a 5.2/5.3 precisam **montar** componentes do módulo em outro host — isso exige `index.ts`/`contract.ts` **aditivos** (o próprio comando lista `contract.ts` aditivo) | `05_03 §3` | regra proposta: **lógica** (`core/**`, `server/**`) intocável; `index.ts`/`contract.ts` só aditivos; `ui/**` só montagem — confirmar |
| A0.3 | Explorer **não** está listado em nenhuma sub-fatia de migração (5.2 Search, 5.3 SCM), mas o alvo desenha Explorer na Side Bar | comando §2.1 | ⚠️ decidir: (a) Explorer migra na 5.1 (c3) ou (b) nova 5.2-bis, ou (c) Explorer fica na barra auxiliar por enquanto |
| A0.4 | `EditorArea.tsx` é intocável (decisão vigente); o comando pede `<EditorGroup>` central onde arquivos/diffs abrem | `05_03 §1` | criar `EditorGroup.tsx` **novo** ao lado do `EditorArea` (não dentro) — confirmar |
| A0.5 | Badge de resultados no ícone Search (5.2) e animação 200 ms da Side Bar (5.7) **não existem** no VS Code real | `05_02 §2`, `05_01 §7` | manter como desvios explícitos ou remover — ⚠️ |
| A0.6 | Timeline/Outline (5.6) no VS Code real são **seções da Side Bar do Explorer**, não abas do Panel | `05_02 §5` | ⚠️ decidir localização |
| A0.7 | Runtime disponível é 1.135, não 1.139 | `05_01` | prints do Windows prevalecem se divergirem |
| A0.8 | Estimativas em dias do comando não são compromisso do agente (sessões do sandbox se perdem entre turnos) | — | medir por commits, não por dias |

## 5.1 — Auditoria de Layout e Criação de Slots
**Objetivo:** mapear componentes existentes (feito em `05_03 §1`) e criar os containers vazios.
**Tarefas:** (1) auditoria `App.tsx`/`AuxiliaryBar.tsx` ✅ documentada; (2) `<ActivityBar>` com 3 ícones (Explorer, Search, Source Control) + badges; (3) `<SideBar>` com título 35 px e slot da view; (4) `<EditorGroup>` central (container; ainda sem abrir arquivos); (5) `viewRegistry.ts` básico + `layoutState.ts` (persistência da view ativa/largura).
**Arquivos-alvo:** `src/components/ActivityBar.tsx`, `src/components/SideBar.tsx`, `src/components/EditorGroup.tsx`, `src/core/viewRegistry.ts`, `src/core/layoutState.ts`, `src/styles/layout-parts.css`, `App.tsx` (ponto único de montagem).
**Commits atômicos (3):**
- c1 `feat(activity-bar): componente básico com 3 ícones (Explorer, Search, Source Control)` — 48 px, codicons 24, indicador ativo 2 px, badge (posição 24/8, 9 px), tooltips com atalho, `aria-pressed`.
- c2 `feat(side-bar): container de views com slots configuráveis` — título 35/11 px uppercase, ações à direita, sash (min 170, default min(300, w/4)), toggle ao clicar no ícone ativo, `Ctrl+B`.
- c3 `feat(view-registry): sistema de registro e troca de views` — registry + layoutState + persistência + placeholders "Explorer/Search/Source Control chegam na 5.2/5.3" (ou Explorer real se A0.3 = (a)).
**Critérios de aceite:** Activity Bar visível à esquerda com 3 ícones · clique troca a view · clique no ativo fecha/reabre · largura persiste · **zero regressão: Editor Anexo, Explorer (barra auxiliar), Search, Changes, Diff, Terminal continuam iguais**.
**Validação:** typecheck 0 · vitest ≥ 382 · E2E `sessao_15_activity_bar.spec.ts` (5/5, falhando antes) · anti-regressão completa · prints `auditoria_15/c1..c3/` vs 8080 (chassi sem pasta aberta).

## 5.2 — Migração do Search para a Side Bar
**Tarefas:** ícone Search ativo; `registerViews` monta o **mesmo** `SearchPanel` na Side Bar; Search **não fecha** ao abrir arquivo; contagem de resultados (⚠️ A0.5: no real é texto na view, não badge); `contract.ts` aditivo.
**Arquivos:** `ui/search/*` (só montagem), `index.ts` aditivo, `ActivityBar.tsx`, `viewRegistry.ts`, `contract.ts`.
**Critérios:** busca igual à 4.6 (toggles, replace, include/exclude) · abrir arquivo não fecha o Search · query sobrevive à troca de ícone.
**Validação:** `sessao_15_search_migration.spec.ts` 8/8 · `sessao_13_search` 14/14 + backend 6/6 · prints vs 8080 (Search real).

## 5.3 — Migração do Source Control para a Side Bar + Diff no Editor Group
**Tarefas:** ícone Source Control com badge = `git.count()`; `ChangesPane` + `CommitInput` na Side Bar; `DiffPane` abre no **Editor Group central**; remover `shell/gitTransition.ts` + maquete `initialDiffFiles` (D2.38); `contract.ts` aditivo; ajustar `DiffPane` a `renderMarginRevertIcon/renderGutterMenu/renderIndicators=false` (perfil agentsWindow, `05_01 §0`).
**Arquivos:** `ui/attach/changes/*`, `ui/attach/diff/*` (montagem), `index.ts` aditivo (`mountEditorGroup`), `EditorGroup.tsx`, `App.tsx` (redirecionar `explorer.fileOpened`/`editor.diffChanged` para o Editor Group — ponto único), `gitTransition.ts` (remoção), `data.ts` (maquete).
**Critérios:** stage/unstage/discard/commit iguais à 4.7-b/c4 · clique abre diff **no centro** · badge correto · input de commit no topo · Changes visível com o diff aberto (prova E2E de coexistência).
**Validação:** `sessao_15_source_control_migration.spec.ts` 10/10 · `14b` 11/11 · `14b_backend` 7/7 · `14c` 6/6 · `14d` 5/5 · prints vs 8080.

## 5.4 — Configurabilidade de Posições — ⚠️ DECISÃO ABERTA (A0.1)
**Como pedido:** mover Activity Bar (esquerda/direita/topo/inferior/oculto) e Panel (inferior/direita/esquerda), persistir em localStorage, menu de contexto na Activity Bar. `src/core/layoutPreferences.ts`, `ActivityBar.tsx`, `Panel.tsx`.
**Régua real:** no perfil `agentsWindow` essas opções são **readOnly** (fixas: default/left/bottom). Executar a 5.4 como pedida = **desvio consciente** do byte a byte. Validação prevista: `sessao_15_layout_configurable.spec.ts` 6/6.

## 5.5 — Drag & Drop de Views
Arrastar views entre Side Bar e Panel (e reordenar); drop zones; persistência de ordem. `viewRegistry.ts`, `SideBar.tsx`, `Panel.tsx`. E2E `sessao_15_drag_drop_views.spec.ts` 5/5 (DnD via `dispatchEvent` + `DataTransfer` sintético — lição da FATIA-04). Terminal homologado **não** é arrastável na v1 (intocável).

## 5.6 — Timeline e Outline — ⚠️ DECISÃO ABERTA (A0.6)
`TimelineView` (`git log --follow -- <file>` → precisa de `POST /git/log` **novo** no servidor — extensão aditiva de `server/git/`, a autorizar) e `OutlineView` (regex/LSP básico). Localização: Panel (pedido) vs seções do Explorer (real). Clique em commit → diff (`/git/show` com `ref: <sha>` — extensão aditiva). E2E `sessao_15_timeline_outline.spec.ts` 4/4.

## 5.7 — Polish Visual — ⚠️ A0.5 na animação
Hover states dos ícones (`--vscode-activityBar-foreground` no hover — real), feedback visual de DnD, badges/tooltips por tokens. Animação de 200 ms da Side Bar **não existe no real** → decidir. E2E `sessao_15_polish.spec.ts` 3/3.

## Fora de escopo (do comando)
Browser Contextual (4.8 / D2.39) · Smart commit/Always (D2.35) · stage por linha · Push/Pull/Fetch (D2.30) · multi-root.

## Definition of Done da FATIA-05
1. 5.1–5.7 homologadas no Windows · 2. typecheck 0 em todos os commits · 3. vitest ≥ 382 · 4. E2E 15.x verdes (5/5 · 8/8 · 10/10 · 6/6 · 5/5 · 4/4 · 3/3) · 5. anti-regressão: 14d 5 · 14c 6 · 14b 11 · 14b_backend 7 · 14 16 · 12 30 · fs_backend 10 · 13 14+6 · terminal 6 · 6. prints comparativos em `auditoria_15/` · 7. docs 11/12/05/16 + esta pasta atualizados · 8. zero alteração de lógica de negócio dos módulos.

## Próximo passo imediato (conforme o comando)
**5.1 autorizada em princípio pelo usuário; o código só começa após ele revisar esta documentação e responder às decisões abertas A0.1–A0.6 (ou mandar seguir como está).**
