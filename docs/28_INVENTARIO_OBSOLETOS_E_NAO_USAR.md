# 28 — INVENTÁRIO: O QUE EXISTE MAS NÃO SE USA (não gaste tokens aqui)

**Data:** 2026-09-29 · **HEAD:** `0e36af4`. Lista do que está (ou esteve) no repositório e **não** deve ser lido, testado, corrigido ou restaurado. Cada linha diz o que é, por que ficou, e o destino decidido.

## 1. `legacy/` — REMOVIDA de propósito
- **O que era:** cópia antiga ("Casa Velha", porta 5173) do ambiente, incl. terminal de referência (`legacy/AMBIENTE_COMPLETO_PARA_OPENCLAUDE/02_replica_final/`).
- **Decisão do usuário (2026-09-29): apagar do branch principal.** Motivos: nenhum código depende dela (verificado: só um comentário em `platform/services/pty-server/src/vitePlugin.ts` a cita como fonte histórica); IAs sem contexto gastam tokens lendo-a; foi apagada por acidente por specs de fixture rodadas contra a 5174 (`docs/26 §1`); pesa em RAM/inotify.
- **Backup = Git.** Recomendação para o commit de remoção (feito pelo usuário no Windows): `git tag legacy-backup-2026-09 <último commit com legacy/>` antes de `git rm -r legacy/`. Recuperação, se um dia precisar: `git checkout legacy-backup-2026-09 -- legacy/`.
- **Regra para IAs:** não referenciar, não restaurar, não procurar. Docs 00/01/03/03A/05 ainda citam `legacy/` em trechos **históricos** — leia como passado.

## 2. Testes mortos (não corrigir, não investigar)
- 13 E2E em `sessao_08`, `sessao_10` (T3–T5), `sessao_11b/c/d/e/f` e 9 unitários em `TerminalPanel.test.tsx` — detalhe e causa em `docs/26 §2.4`. Destino aguarda o usuário (`docs/25 §6 P3/P4`).

## 3. Planos superados (histórico, não autoridade)
| Caminho | Substituído por |
|---|---|
| `docs/engenharia_reversa/FATIA-05_LAYOUT_BYTE_A_BYTE/05_00…05_06` (plano "Byte a Byte", Side Bar à esquerda, decisões A0.x) | `docs/24` v1.1 (Chassis-Right) + `docs/engenharia_reversa/FATIA-05_LAYOUT/` |
| Rascunhos "docs 21–23" citados em conversas | nunca entraram no repo; `docs/24` os absorveu |
| `docs/14_PRIMEIRA_FATIA_RECOMENDADA.md`, `docs/15_HANDOFF_PROMPT_PARA_NOVA_IA.md` | ponto de entrada atual é `docs/00_COMECE_AQUI.md` → `docs/16` |
| `docs/historico_migracao_temporaria/`, `docs/comparacao-terminal/`, `docs/ANALISE_TERMINAL_CODE_SERVER_CLONE.md`, `docs/CORRECAO_REGRESSAO_TERMINAL_V2.md` | histórico do terminal (FATIA-03), congelado em `docs/17`/`docs/18` |

## 4. Arquivos soltos em `platform/apps/workbench-v2/`
| Arquivo | O que é | Destino |
|---|---|---|
| `shot.tmp.mjs` | utilitário de print (`node shot.tmp.mjs <url> <png>`) criado na FATIA-05 | **não versionar**; recriar se precisar |
| `tsc` (arquivo vazio) | resíduo de um `npx tsc` errado | pode apagar |
| `probe-terminal.mjs`, `validacao-real-workspace.mjs` | sondas manuais da FATIA-03/04 | não usadas; manter até decisão |
| `manual_evidence/`, `test-results/`, `test-results-debug/` | evidências antigas e saída do Playwright | `test-results*` são descartáveis; `manual_evidence/` é histórico da FATIA-03 |
| `Data Nesta` (se aparecer no `ls`) | não é arquivo — artefato de exibição | ignorar |

## 5. Fora do repositório (só no sandbox / uploads do usuário)
- `/home/user/uploads/APRENDIZADOS_REGRAS_INTERACAO_ARENA_VSCODE_WORKSPACE.txt` → incorporado em `docs/27`.
- `/home/user/uploads/meu_documento.txt` (aprovação do Gate 0, decisões a–g) → incorporado em `docs/24 §2` e `docs/12`.
- `/home/user/uploads/05_00_relatorio_validacao_pre_fase.md` (auditoria externa) → copiado em `docs/engenharia_reversa/FATIA-05_LAYOUT/05_02_auditoria_externa_suite_e2e_e_raspagem.md`.
- `/home/user/restore-code-server.sh` e o tarball do code-server → ambiente de medição; não fazem parte do produto.
- Prints antes/depois da FATIA-05 vivem em `docs/engenharia_reversa/FATIA-05_LAYOUT/auditoria_05/c1|c2|c3/` (movidos da raiz do repo em 2026-09-29 — a pasta solta `auditoria_05/` na raiz **não deve existir**). São versionados (prints antes/depois exigidos pelo protocolo Opção C).
