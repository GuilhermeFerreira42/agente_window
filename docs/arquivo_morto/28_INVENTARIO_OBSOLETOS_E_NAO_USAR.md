> **Nota 2026-10-02 (migração Context Engineering):** fonte da verdade agora é `/AGENTS.md` → `/PROJECT-STATE.md` → `/DECISIONS.md`. Caminhos de docs movidos foram atualizados neste arquivo; referências a `docs/12`/`docs/11` como "docs vivos a atualizar" valem agora para `CHANGELOG.md`/`PROJECT-STATE.md`.

# 28 — INVENTÁRIO: O QUE EXISTE MAS NÃO SE USA (não gaste tokens aqui)

**Data:** 2026-09-29 · **HEAD:** `0e36af4`. Lista do que está (ou esteve) no repositório e **não** deve ser lido, testado, corrigido ou restaurado. Cada linha diz o que é, por que ficou, e o destino decidido.

## 1. `legacy/` — REMOVIDA de propósito
- **O que era:** cópia antiga ("Casa Velha", porta 5173) do ambiente, incl. terminal de referência (`legacy/AMBIENTE_COMPLETO_PARA_OPENCLAUDE/02_replica_final/`).
- **Decisão do usuário (2026-09-29): apagar do branch principal.** Motivos: nenhum código depende dela (verificado: só um comentário em `platform/services/pty-server/src/vitePlugin.ts` a cita como fonte histórica); IAs sem contexto gastam tokens lendo-a; foi apagada por acidente por specs de fixture rodadas contra a 5174 (`docs/26 §1`); pesa em RAM/inotify.
- **Backup = Git.** Recomendação para o commit de remoção (feito pelo usuário no Windows): `git tag legacy-backup-2026-09 <último commit com legacy/>` antes de `git rm -r legacy/`. Recuperação, se um dia precisar: `git checkout legacy-backup-2026-09 -- legacy/`.
- **Regra para IAs:** não referenciar, não restaurar, não procurar. Docs 00/01/03/03A/05 ainda citam `legacy/` em trechos **históricos** — leia como passado.

## 2. Testes mortos — **INTOCÁVEIS, NÃO MOVER** (decisão do usuário 2026-10-02, Etapa 2 da migração)
| Grupo | Onde | Status | Motivo |
|---|---|---|---|
| 13 E2E mortos | `e2e/sessao_08*`, `sessao_10` (T3–T5), `sessao_11b/c/d/e/f` | pré-existentes; não corrigir, não investigar, **não mover para archive** | fazem parte da área do terminal homologado (`memory-bank/architecture/18_PROTOCOLO_ANTI_REGRESSAO…`); causa em `docs/26 §2.4` |
| 9 unitários falhando | `src/__tests__/TerminalPanel.test.tsx` | pré-existentes no sandbox; **INTOCÁVEL — docs/18** | terminal homologado; só reportar o número no relatório de vitest (701 pass / 9 fail / 16 skip em 2026-10-02) |

Qualquer IA que "consertar", mover ou apagar esses arquivos viola regra dura (`AGENTS.md §4.1`). Destino final só por ordem do usuário (P3/P4 em `PROJECT-STATE.md`).

## 2b. Arquivados em `memory-bank/archive/` (2026-10-02)
Ver `memory-bank/archive/README.md`: `FATIA-05_LAYOUT_BYTE_A_BYTE/`, `docs/00_COMO_LER…`, `docs/12-DOCUMENTACAO-VIVA`, `docs/14`, `docs/15`, histórico do terminal (`ANALISE_…`, `CORRECAO_…`, `comparacao-terminal/`, `historico_migracao_temporaria/`), `platform/apps/workbench-v2/tsc` e `test-results-debug/`. `shot.tmp.mjs` não existia; `legacy/` já não existe.

## 3. Planos superados (histórico, não autoridade)
| Caminho | Substituído por |
|---|---|
| `memory-bank/context/FATIA-05_LAYOUT_BYTE_A_BYTE/05_00…05_06` (plano "Byte a Byte", Side Bar à esquerda, decisões A0.x) | `memory-bank/planning/24_PLANO_FATIA-05_CHASSIS_RIGHT.md` v1.1 (Chassis-Right) + `memory-bank/context/FATIA-05_LAYOUT/` |
| Rascunhos "docs 21–23" citados em conversas | nunca entraram no repo; `memory-bank/planning/24_PLANO_FATIA-05_CHASSIS_RIGHT.md` os absorveu |
| `docs/14_PRIMEIRA_FATIA_RECOMENDADA.md`, `docs/15_HANDOFF_PROMPT_PARA_NOVA_IA.md` | ponto de entrada atual é `docs/00_COMECE_AQUI.md` → `memory-bank/architecture/16-INICIAR-POR-AQUI-IA-EXECUTORA.md` |
| `docs/historico_migracao_temporaria/`, `docs/comparacao-terminal/`, `docs/ANALISE_TERMINAL_CODE_SERVER_CLONE.md`, `docs/CORRECAO_REGRESSAO_TERMINAL_V2.md` | histórico do terminal (FATIA-03), congelado em `memory-bank/architecture/17_COMITE_TERMINAL_FIDELIDADE_2026-09-14.md`/`memory-bank/architecture/18_PROTOCOLO_ANTI_REGRESSAO_E_CONTRATOS_CONGELADOS.md` |

## 4. Arquivos soltos em `platform/apps/workbench-v2/`
| Arquivo | O que é | Destino |
|---|---|---|
| `shot.tmp.mjs` | utilitário de print da FATIA-05 | **não existe mais** (verificado 2026-10-02) |
| `tsc` (arquivo vazio) | resíduo de um `npx tsc` errado | **arquivado** em `memory-bank/archive/platform-residuos/` |
| `probe-terminal.mjs`, `validacao-real-workspace.mjs` | sondas manuais da FATIA-03/04 | não usadas; manter até decisão |
| `manual_evidence/`, `test-results/`, `test-results-debug/` | evidências antigas e saída do Playwright | `test-results*` são descartáveis; `manual_evidence/` é histórico da FATIA-03 |
| `Data Nesta` (se aparecer no `ls`) | não é arquivo — artefato de exibição | ignorar |

## 5. Fora do repositório (só no sandbox / uploads do usuário)
- `/home/user/uploads/APRENDIZADOS_REGRAS_INTERACAO_ARENA_VSCODE_WORKSPACE.txt` → incorporado em `docs/27`.
- `/home/user/uploads/meu_documento.txt` (aprovação do Gate 0, decisões a–g) → incorporado em `memory-bank/planning/24_PLANO_FATIA-05_CHASSIS_RIGHT.md §2` e `CHANGELOG.md` (antigo docs/12, arquivado).
- `/home/user/uploads/05_00_relatorio_validacao_pre_fase.md` (auditoria externa) → copiado em `memory-bank/context/FATIA-05_LAYOUT/05_02_auditoria_externa_suite_e2e_e_raspagem.md`.
- `/home/user/restore-code-server.sh` e o tarball do code-server → ambiente de medição; não fazem parte do produto.
- Prints antes/depois da FATIA-05 vivem em `memory-bank/context/FATIA-05_LAYOUT/auditoria_05/c1|c2|c3/` (movidos da raiz do repo em 2026-09-29 — a pasta solta `auditoria_05/` na raiz **não deve existir**). São versionados (prints antes/depois exigidos pelo protocolo Opção C).
