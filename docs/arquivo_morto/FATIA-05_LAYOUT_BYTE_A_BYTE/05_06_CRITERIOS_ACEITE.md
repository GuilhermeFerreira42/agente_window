# 05_06 — Critérios de Aceite (checklists binários)

Cada item é PASS/FAIL. Um FAIL = sub-fatia não homologada. Os checklists "humano (Windows)" são executados pelo usuário após baixar o workspace.

## 5.1 — Activity Bar + Side Bar + Editor Group (slots)
**Automático (E2E `sessao_15_activity_bar`, 5 testes):**
- [ ] T1 `[data-testid=activity-bar]` visível, largura 48 px, 3 itens na ordem Explorer · Search · Source Control, codicons `files/search/source-control` 24 px
- [ ] T2 clique em Search → `[data-testid=side-bar]` visível, título "SEARCH" (11 px uppercase, 35 px), item com `aria-pressed=true` e indicador 2 px
- [ ] T3 clique no item ativo → Side Bar fecha; novo clique → reabre com a mesma view; `Ctrl+B` alterna
- [ ] T4 largura da Side Bar: default = min(300, w/4), sash arrasta (min 170), persiste após reload
- [ ] T5 anti-regressão no mesmo teste: Explorer da barra auxiliar, Editor Anexo (`attach.open`), Terminal seguem funcionando
**Humano (Windows):** Activity Bar idêntica ao 8080 lado a lado (largura, ícone, indicador, badge) · nada mudou no Chat/Sessões/Terminal.

## 5.2 — Search na Side Bar (8 testes)
- [ ] ícone Search abre a view · [ ] input 26 px + toggles 20×20 iguais à 4.6 · [ ] busca retorna resultados (fixture) · [ ] replace funciona · [ ] include/exclude · [ ] **abrir arquivo NÃO fecha o Search** · [ ] query/resultados sobrevivem à troca Explorer→Search · [ ] contagem de resultados exibida (formato decidido em A0.5)
**Anti-regressão:** `sessao_13_search` 14/14 · backend 6/6. **Humano:** Search lado a lado com o 8080.

## 5.3 — Source Control na Side Bar + Diff no centro (10 testes)
- [ ] ícone com badge = nº de recursos · [ ] view com input de commit no topo · [ ] Changes/Staged listadas · [ ] stage · [ ] unstage · [ ] discard com diálogo oficial · [ ] commit via Ctrl+Enter · [ ] clique em recurso abre diff **no Editor Group central** (`[data-testid=editor-group] .tab[data-kind=diff]`) · [ ] **Side Bar permanece com Changes visível enquanto o diff está aberto** · [ ] `gitTransition.ts` removido e maquete "Changes N" inexistente
**Anti-regressão:** 14b 11 · 14b_backend 7 · 14c 6 · 14d 5. **Humano:** Source Control lado a lado com o 8080; diff no centro.

## 5.4 — Configurabilidade (6 testes) — só se aprovada (A0.1)
- [ ] menu de contexto na Activity Bar · [ ] mover para direita/topo/inferior/oculto · [ ] Panel para direita/esquerda · [ ] persistência após F5 · [ ] views funcionam em qualquer posição · [ ] reset para o padrão agentsWindow

## 5.5 — Drag & Drop (5 testes)
- [ ] arrastar view Side Bar → Panel · [ ] Panel → Side Bar · [ ] reordenar · [ ] ordem persiste após reload · [ ] views funcionam após o drag

## 5.6 — Timeline e Outline (4 testes)
- [ ] Timeline lista commits do arquivo ativo · [ ] Outline lista símbolos · [ ] clique em commit abre diff · [ ] clique em símbolo navega para a linha

## 5.7 — Polish (3 testes)
- [ ] hover state nos ícones (tokens) · [ ] feedback visual de DnD · [ ] badges/tooltips por tokens (sem hex fixo)

## DoD da FATIA-05 (todos obrigatórios)
- [ ] 5.1–5.7 homologadas no Windows · [ ] typecheck 0 · [ ] vitest ≥ 382 · [ ] E2E 15.x verdes · [ ] anti-regressão completa verde · [ ] `auditoria_15/` com prints por sub-fatia · [ ] docs 11/12/05/16 + `FATIA-05_LAYOUT_BYTE_A_BYTE/` atualizados · [ ] `git diff --stat` mostra zero alteração em `modules/explorer-search/{core,server}/**` (exceto extensões aditivas autorizadas por escrito: `/git/log`, `/git/show ref:<sha>`)
