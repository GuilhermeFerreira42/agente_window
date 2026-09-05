# ARQUIVO HISTÓRICO — não ler por padrão

> **Esta pasta está FORA do caminho de leitura padrão.** O `CLAUDE.md` proíbe ler
> pastas históricas sem pedido explícito do usuário. O conteúdo relevante destes
> arquivos **já foi mesclado** em `CURRENT_STATE.md`, `DECISION_LOG.md`,
> `BACKLOG_FUTURO.md`, `PHASE_SUMMARY.md`, `GATES_EXECUCAO.md` e `KANBAN.md`.
>
> Nada aqui é fonte de verdade. Se algum arquivo desta pasta contradisser um
> documento vivo, **vale o documento vivo** (e, para números, vale
> `GATES_EXECUCAO.md`).

Arquivados em 2026-09-05 pela Fase 08 (Consolidação da Documentação Viva).

## Relatórios de sessão (gerados pelo agente)

| Arquivo | Origem | Conteúdo | Onde foi mesclado |
|---|---|---|---|
| `2026-09-05__RELATORIO_VALIDACAO_ARENA.md` | raiz do workspace | Auditoria dos 10 módulos da Validação 3 contra o código (o que era mock de verdade e o que os pacotes cobravam a mais) | `PHASE_SUMMARY` (fases 06–07), `DECISION_LOG` F6/F7 |
| `2026-09-05__RELATORIO_FASE_06_REGUA_DE_TESTES.md` | raiz do workspace | Reescrita dos E2E (34 → 197 asserts) e os 6 bugs reais achados: workers do Monaco, DiffEditor, `onToggleFolder`, typecheck no-op, nome acessível da linha, alvo de toque de 44px | `DECISION_LOG` F6, `PHASE_SUMMARY` Fase 06 |
| `2026-09-05__RELATORIO_FASE_07_CUSTOM_VIEW_GRID.md` | raiz do workspace | Custom View Grid full-surface + grid não-proporcional (Sessions Part absorve o resize) | `DECISION_LOG` F7, `PHASE_SUMMARY` Fase 07, `BACKLOG` W2-01 |

## Documentos de status/gestão que viraram fonte dupla de verdade

| Arquivo | Origem | Por que saiu |
|---|---|---|
| `04_gestao_completo__CONTEXTO_GERAL.md` | `04_gestao_completo/` | Declarava-se "PONTO DE ENTRADA PRINCIPAL — leia APENAS este arquivo", contradizendo a ordem de leitura do `CLAUDE.md`; dizia "E2E 40/40" e "~98%" |
| `04_gestao_completo__STATUS_ATUAL.md` | `04_gestao_completo/` | 41 bytes: só o título, sem status nenhum |
| `docs_gestao__KANBAN.md` | `docs/gestao/` | **2º KANBAN**: ainda dizia "348/348 testes" e Custom View Grid em `EM ANDAMENTO` |
| `replica_docs_gestao__KANBAN.md` | `02_replica_final/docs/gestao/` | **3º KANBAN**: 9 módulos no BACKLOG, só o 04 como "FEITO" |
| `docs_gestao__04_PROGRESSO.md` · `docs_gestao__05_PROGRESSO.md` | `docs/gestao/` | Progresso por módulo, congelado nas sessões 04/05 |
| `replica_docs_gestao__04_PROGRESSO.md` | `02_replica_final/docs/gestao/` | Cópia divergente do anterior |

## Material de análise/levantamento (consulta sob demanda)

| Arquivo | Origem | Conteúdo |
|---|---|---|
| `docs__RELATORIO_RASPAGEM_COMPORTAMENTOS.md` (53 KB) | `docs/` | Raspagem comportamental referência × réplica — **útil como fonte de especificação**; consultar explicitamente quando precisar do comportamento original |
| `docs__INVENTARIO_ESPECIFICACOES.md` | `docs/` | Inventário das specs do original (`sessions/`, `vscode-main/`) |
| `docs__HANDOFF_PARA_OPENCLAUDE.md` | `docs/` | Handoff de contexto para outra IA, com a lista de bugs do vídeo |
| `replica__RELATORIO_RASPAGEM_COMPORTAMENTOS.md` · `replica__INVENTARIO_ESPECIFICACOES.md` | `02_replica_final/` | Cópias byte-a-byte idênticas às de `docs/` (verificado com `diff`) |
