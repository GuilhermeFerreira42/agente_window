# 04_16 — PROPOSTA DE ATUALIZAÇÃO DO KANBAN (`docs/11`)

> **Natureza:** proposta de alteração documental. Nada foi alterado em `docs/11` nesta fase (a atualização oficial é feita na implementação, com evidência real — regra do `docs/12`).
> **Objetivo:** substituir o bloco atual da **FATIA-04** (6 linhas genéricas) pela tabela de **9 sub-fatias** do `04_15`, mantendo o formato e as convenções do quadro existente.

---

## 1. Por que substituir

O bloco atual da FATIA-04 no `docs/11` tem apenas 6 tarefas amplas (`4.1` a `4.6`) que **não cobrem** o que o vídeo exige: não há linha para menu de contexto, download, upload por DnD, editor em anexo lateral, search na sessão nem browser com acesso da IA ao HTML — os cinco maiores gaps mapeados em `04_14`.

O quadro passaria a ter rastreabilidade direta: **cada sub-fatia → arquivos-alvo → contrato → validação testável**.

---

## 2. Tabela proposta (pronta para colar em `docs/11`)

```markdown
### FATIA-04 — Explorer Completo + Editor em Anexo Lateral + Browser com IA (FASE 4)
**Onda:** 4 | **Épico:** D — Explorer (+ C/F/E conforme sub-fatia) | **Prioridade:** P0 | **Status:** Planejado | **Depende de:** FATIA-01 e FATIA-02 | **Doc:** `docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/` (04_00 a 04_16)

| # | Sub-fatia | Arquivos-alvo | Contrato | Validação | Status |
|---|---|---|---|---|---|
| 4.1 | FileSystem ampliado (I/O real + transferência browser↔workspace) | `platform/packages/agent-runtime/filesystem/` + `platform/packages/contracts/filesystem.ts` | `FileSystemPort` | unit com fs fake + VAL-FS-01/02/03 | Planejado |
| 4.2 | `ExplorerService` ampliado (create/rename/delete/cut/copy/paste/download/upload/collapseAll/sort/select) | `platform/apps/workbench/src/logic/explorer/` + `platform/packages/contracts/explorer.ts` | `ExplorerService` | unit + VAL-EXP-01/05 | Planejado |
| 4.3 | UI Explorer: header 5 botões + árvore lazy 22 px + 3 seções (Editores Abertos/Timeline/Outline) | `platform/apps/workbench/src/ui/explorer/` | — | E2E VAL-EXP-02/04/06 + grep hardcode = 0 | Planejado |
| 4.4 | Menu de contexto completo (inclui Download e Upload) | `platform/apps/workbench/src/ui/explorer/` + `platform/apps/workbench/src/logic/commands/` | `CommandRegistry.setContext` | VAL-EXP-08 + matriz de habilitação | Planejado |
| 4.5 | DnD interno + Upload do SO (arquivos e pastas) + Download para máquina local | `logic/explorer/` + `packages/agent-runtime/filesystem/` | `FileSystemPort.upload/download` | VAL-EXP-07/09/10 | Planejado |
| 4.6 | Editor em anexo lateral por sessão (sash 6 px, recolher sem desmontar) | `logic/editor/` + `ui/editor/EditorAttach.tsx` | `EditorService` (`surface:'attach'`) | VAL-EXP-11/12/13/14 + teste de não-desmontagem | Planejado |
| 4.7 | Search na sessão (aba do anexo, debounce, substituir) | `logic/search/` + `ui/editor/` | `SearchService` (novo) | VAL-EXP-15 | Planejado |
| 4.8 | Browser runtime (Chromium + Playwright/CDP por sessão) + 11 tools de IA + gravação | `platform/services/browser-runtime/` + `logic/browser/` + `packages/contracts/browser.ts` + `packages/tools-sdk/` | `BrowserPort` / `BrowserSessionService` | VAL-BRW-01 a 05 | Planejado |
| 4.9 | Integração final (eventos transversais + homologação) | todos | `fs.changed`, `editor.attachCollapsed`, `browser.*` | checklist A + B do `04_13` | Planejado |

**Critério de pronto FATIA-04:** as 9 sub-fatias validadas + `npx playwright test sessao_11_terminal_pty_real` 6/6 (anti-regressão `docs/18`) + `docs/12` atualizado com evidência real.
```

---

## 3. Cabeçalho do quadro (linha de estado vigente) — proposta

Substituir, ao final da FATIA-04:

```markdown
| DATA DE INÍCIO DO SPRINT | DATA ATUALIZAÇÃO | ESTADO VIGENTE | ATUALIZADO POR | BRANCH |
|---|---|---|---|---|
| 2026-09-11 | <data da execução> | FATIA-01, 02 e 03 concluídas e blindadas (docs/18). FATIA-04 autorizada com documentação completa em `docs/engenharia_reversa/FATIA-04_VIDEO_COMPLETO/` (17 arquivos, 9 sub-fatias). Servidores 8080 (VS Code) e 5173 (frontend) ativos. | IA executora | main + working tree local |
```

---

## 4. Outras atualizações sugeridas em `docs/11` (quando a implementação começar)

| Seção atual | Ação proposta | Quando |
|---|---|---|
| “RESUMO EXECUTIVO PARA ACOMPANHAMENTO” | trocar a linha `04 \| Explorer + Filesystem \| Planejado \| ...` pela versão em 9 sub-fatias | ao iniciar 4.1 |
| “FAIXA 4 — BLOQUEIOS E RISCOS” | adicionar `RISK-07` (anexo do editor convivendo com área central do legado — mitigado por Q1: anexo só em `platform/`) e `RISK-08` (runtime de browser isolado por sessão: CPU/RAM) | ao iniciar 4.6 / 4.8 |
| Coluna “P4.2 — Execução mais recente concluída” | atualizar a cada sub-fatia com o que **realmente** passou (nunca antecipar) | contínuo |
| Seção de leitura rápida (topo) | incluir referência a `FATIA-04_VIDEO_COMPLETO/` | no fechamento da fase |

---

## 5. Regras de atualização (herdadas do `docs/12` e do `docs/05`)

1. **Nenhum item vai para “Concluído” sem evidência** (typecheck + testes + E2E + checklist).
2. Status possíveis: `Planejado` → `Em andamento` → `Concluído`, ou `Bloqueado` com motivo explícito.
3. Cada sub-fatia concluída gera **uma entrada cronológica** em `docs/12` com: arquivos alterados, validações executadas, pendências.
4. Nunca reescrever histórico anterior: a trilha antiga de FATIA-01/02/03 permanece intacta.
5. Se houver divergência entre este plano e o código real no momento da execução, **prevalece a reinspeção do repositório** (`01_FONTE_DA_VERDADE` §4).

---

## 6. Eixos cobertos (VISUAL / COMPORTAMENTO / EVENTO / VALIDAÇÃO)

| Eixo | Como se aplica |
|---|---|
| **VISUAL** | o kanban não descreve visual; cada linha aponta para a sub-fatia cujo efeito visual está em `04_03/04_05/04_06/04_07` e cujo critério visual de aceite está no `04_13` §A. |
| **COMPORTAMENTO** | as 9 sub-fatias são descritas por comportamento entregável (criar/renomear/baixar/anexar/buscar/navegar). |
| **EVENTO** | a coluna “Contrato” nomeia a porta/serviço e a linha 4.9 fecha os eventos transversais. |
| **VALIDAÇÃO** | coluna “Validação” com os IDs `VAL-*` e a regra §5 (nada vai a “Concluído” sem evidência). |
