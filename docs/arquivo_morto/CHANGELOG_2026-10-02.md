# CHANGELOG.md — Agente Window

> Entradas mais novas no topo. Histórico detalhado anterior a 2026-10-02 (adendos dia a dia): `memory-bank/archive/12-DOCUMENTACAO-VIVA.md` (após a Etapa 2 da migração) e `git log`.

## 2026-10-02 - Pausa para verificação de arquitetura + Teste de capacidade Arena

**Status: PROJETO PAUSADO**

**Teste de capacidade Arena concluído** (resultados relatados pelo usuário a partir de sessões próprias; não reproduzidos neste repositório):

- OpenVSCode Server 1.109.5: compila fácil (sem auth, sem yarn, sem proxy), roda na 8080, 200 OK, serve filesystem real. Serve como régua para comparação byte-a-byte.
- VS Code oficial Microsoft 1.140.0 serve-web: compila mas serve sem Agente Window dedicada. A Agente dedicada só existe em: VS Code Desktop 1.120+ com `--agents` ou insiders.vscode.dev/agents + tunnel (exige login GitHub). Testado com Agente fake: extensão aparece mas não tem barra lateral dedicada no web, só no Desktop.
- Limitação Arena: workspace 128 MB / 10 000 arquivos — runtime deve ficar em `~/.local`.
- Fix necessário: proxy para corrigir `X-Frame-Options: SAMEORIGIN`, que deixa tela cinza no Preview da Arena. Usar node proxy 8081 → 8080 reescrevendo o header para `ALLOWALL`.
- Conclusão: Agente Window dedicada hoje SÓ no Desktop/tunnel. Web (serve-web) não tem ainda.

**Próximo passo:** iniciar novo chat limpo com docs em Context Engineering + zip do projeto para raspagem da Fatia 6 (agrupamento de chats por pasta, empty state 768 px, sync com Explorer, badge "N conversas").

## 2026-10-02 - Migração da documentação para Context Engineering (Etapas 2 e 3) — CONCLUÍDA

- **Etapa 2 `aa1167e` — archive não-destrutivo:** criado `memory-bank/archive/` (README explica cada item). Movidos: `FATIA-05_LAYOUT_BYTE_A_BYTE/`, `docs/00_COMO_LER`, `12-DOCUMENTACAO-VIVA`, `14`, `15`, histórico do terminal (`ANALISE_…`, `CORRECAO_…`, `comparacao-terminal/`, `historico_migracao_temporaria/`), resíduos `platform/apps/workbench-v2/tsc` (vazio) e `test-results-debug/` (versionado por engano). **Não movidos (decisão do usuário):** 13 E2E mortos + 9 unitários `TerminalPanel.test.tsx` — listados em `docs/28 §2` como INTOCÁVEIS (docs/18). `shot.tmp.mjs` não existia; `legacy/` já não existe.
- **Etapa 3 `25b3a3b` — docs/ enxuto:** `docs/` passou de **373 → 6 arquivos** (`00` ponteiro para `AGENTS.md`, `07`, `08`, `26`, `27`, `28`). Arquivados `01, 02, 03A, 06, 09, 10, 11 (Kanban), 25, CHECKLIST, README`; `engenharia_reversa/01–10 + FATIA-04_VIDEO_COMPLETO` e `referencias_visuais/` → `memory-bank/context/`; `16`, `17`, `historico_homologacao/` → `memory-bank/architecture/`. Links antigos (`docs/24`, `docs/18`, `docs/12`, `docs/11`, `engenharia_reversa/FATIA-05_LAYOUT`) reescritos em `26`, `27`, `28`; nota de migração em `07`, `08`.
- **Validação:** typecheck 0 · `sessao_15_activity_bar` 21/21 ×2 na 5175 (1ª rodada abortou na partida fria do Vite — não é regressão) · `platform/` com 0 linhas de código tocadas · 374 arquivos preservados em `memory-bank/ + context/` (nada apagado).

## 2026-10-02 - Migração da documentação para Context Engineering (Etapa 1)

- Criados na raiz: `AGENTS.md` (canônico), `CLAUDE.md` (`@AGENTS.md`), `.cursorrules`, `PROJECT-STATE.md`, `DECISIONS.md` (D1–D25 + A0.1/A0.6/A0.7 + O13/O14), este `CHANGELOG.md`.
- Criadas `memory-bank/{context,planning,architecture}/` e `context/raw/`; movidos (git mv, histórico preservado): `FATIA-05_LAYOUT/` completa e `04_17` + `raspagem_04_17` → `memory-bank/context/`; `05_BACKLOG_MESTRE`, `24_PLANO_FATIA-05` → `memory-bank/planning/`; `03`, `04`, `13`, `18` → `memory-bank/architecture/`.
- Divergências encontradas (código/repo manda): `docs/` tinha **373 arquivos** (não 172); `legacy/` **já não existe** no repo (removida pelo usuário); `docs/24` tem D1–**D25** (confirmado).

## 2026-10-02 - FATIA-05 100 % homologada no Windows
- `e93031d` docs v1.3 (5.8 "misto") · `d0c2a8d` 5.8-c1 coluna "Detalhes" removida de vez · `4ee0ed8` 5.8-c3 16 tokens sem fallback adicionados · `2dc832a`/`c2dc674` docs de fechamento.
- Maximizado `[lista 300][EDITOR 767][Side Bar 274][AB 48]` (D6 v1.2); T39; bateria §9 ×2 verde.

## 2026-10-01 - 5.7 editor fino default + maximizar/restaurar (`9a11319`, fixes `a9a73f4`/`0a8ce9a`/`d0a2f81`); homologada por vídeo 08:37:34 em 2026-10-02.
## 2026-09-30 - 5.4 `7bd528b` · 5.5 `1f1ed79`+`4e10381` · 5.6 `7d05c7d` (A0.1, A0.6, A0.7).
## 2026-09-29/30 - Gate 0 aprovado · 5.1 `3fcc913`/`fd05507`/`1e9978f` · 5.2 `22a1523` · 5.3 `2bd6cc3`.
