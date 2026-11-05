# memory-bank/archive — arquivo morto (não-destrutivo)

**Nada aqui é fonte de verdade.** Tudo foi movido com `git mv` em 2026-10-02 (Etapa 2 da migração para Context Engineering) para manter histórico sem poluir `docs/` nem o contexto das IAs. Não apagar, não restaurar sem ordem do usuário, não citar como regra. Regras vigentes: `AGENTS.md`; estado: `PROJECT-STATE.md`; decisões: `DECISIONS.md`.

| Pasta/arquivo | O que era | Por que saiu de circulação |
|---|---|---|
| `FATIA-05_LAYOUT_BYTE_A_BYTE/` | plano antigo da FATIA-05 (Side Bar à esquerda, A0.x em rascunho) | substituído por `memory-bank/planning/24_PLANO_FATIA-05_CHASSIS_RIGHT.md` (v1.4) |
| `docs/00_COMO_LER_ESTA_DOCUMENTACAO.md` | guia de leitura da docs antiga (numerada 00–28) | ordem de leitura agora é `AGENTS.md → PROJECT-STATE → DECISIONS → memory-bank/` |
| `docs/12-DOCUMENTACAO-VIVA.md` | diário de adendos dia a dia (set/out 2026) | histórico valioso, mas não é fonte; o resumo vive em `CHANGELOG.md` |
| `docs/14_PRIMEIRA_FATIA_RECOMENDADA.md`, `docs/15_HANDOFF_PROMPT_PARA_NOVA_IA.md` | handoffs das primeiras fatias | superados por `AGENTS.md` |
| `docs/ANALISE_TERMINAL_CODE_SERVER_CLONE.md`, `docs/CORRECAO_REGRESSAO_TERMINAL_V2.md`, `docs/comparacao-terminal/`, `docs/historico_migracao_temporaria/` | histórico do terminal (FATIA-03) | congelado em `docs/17` e `memory-bank/architecture/18_PROTOCOLO_ANTI_REGRESSAO…` |
| `platform-residuos/tsc` | arquivo vazio, resíduo de um `npx tsc` errado | lixo |
| `platform-residuos/test-results-debug/` | saída antiga do Playwright que estava versionada por engano | descartável; `test-results/` continua gitignored no app |

**Não movidos de propósito (só listados em `docs/28_INVENTARIO_OBSOLETOS_E_NAO_USAR.md`):** os 13 E2E mortos e os 9 unitários de `TerminalPanel.test.tsx` — ficam onde estão porque o terminal é homologado e **intocável** (docs/18). `legacy/` já não existe no repo (removida pelo usuário, tag `legacy-backup-2026-09`). `shot.tmp.mjs` não existia.
