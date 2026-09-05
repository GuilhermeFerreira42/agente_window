# INSTRUÇÕES DE INICIALIZAÇÃO E GOVERNANÇA (OpenClaude / Claude Code / Antigravity)

## 📌 IDENTIDADE E ESTADO DO PROJETO
- **Projeto:** Réplica Funcional da Agents Window do VS Code (React 18 + TypeScript + Vite)
- **Código-Fonte Ativo:** `AMBIENTE_COMPLETO_PARA_OPENCLAUDE/02_replica_final/src/`
- **Validação:** Vitest (unitários) + Playwright (E2E com screenshots)
- **Central de Governança:** `AMBIENTE_COMPLETO_PARA_OPENCLAUDE/04_gestao_completo/`

---

## 🚀 FLUXO DE INICIALIZAÇÃO RÁPIDA (< 2000 tokens)
Ao abrir um chat novo ou retomar o trabalho após esgotamento de contexto/compactação, leia **APENAS**:
1. `AMBIENTE_COMPLETO_PARA_OPENCLAUDE/04_gestao_completo/documentacao_viva/CURRENT_STATE.md` (Handoff imediato, arquitetura e contratos públicos vigentes)
2. `AMBIENTE_COMPLETO_PARA_OPENCLAUDE/04_gestao_completo/documentacao_viva/BACKLOG_FUTURO.md` (Tarefa ativa e bloco `CONTRATOS_DA_ONDA`)
3. Apenas os arquivos específicos em `02_replica_final/src/` que serão modificados para a tarefa ativa.
4. Se precisar de número de teste/status: `04_gestao_completo/documentacao_viva/GATES_EXECUCAO.md` (saída bruta da última execução real). Nunca inventar nem herdar número de relatório antigo.

---

## 📋 REGRA OBRIGATÓRIA: ATUALIZAÇÃO CONTÍNUA DO KANBAN & DOCS VIVA
A cada tarefa/fase trabalhada, a IA **DEVE** seguir este ciclo rigoroso:
1. **Ao iniciar:** Mover a linha da tarefa para `## EM ANDAMENTO` em `AMBIENTE_COMPLETO_PARA_OPENCLAUDE/04_gestao_completo/KANBAN.md`.
2. **Ao validar:** Executar `npm run typecheck` (0 erros) + `npm run test` + `npx playwright test --grep "..."`.
3. **Ao concluir:** Mover a linha para `## TESTE/VERIFICAÇÃO` ou `## CONCLUÍDO` no `KANBAN.md` e executar o `ARCHIVING_PROTOCOL.md` para atualizar a documentação viva (`CURRENT_STATE.md`, `DECISION_LOG.md`, `BACKLOG_FUTURO.md`, `PHASE_SUMMARY.md`, `GATES_EXECUCAO.md`). **Sem exceção** — ver "FONTE ÚNICA DE VERDADE DOCUMENTAL" nos invariantes.

---

## 📐 PADRÃO ESTRITO DO KANBAN (NUNCA ALTERAR A ESTRUTURA)
O arquivo `AMBIENTE_COMPLETO_PARA_OPENCLAUDE/04_gestao_completo/KANBAN.md` deve respeitar estritamente o seguinte modelo de 9 colunas e 5 seções:

```markdown
# MODELO DE PLANILHA DO QUADRO KANBAN

| DATA DE INÍCIO DO SPRINT | DIAS | PROGRESSO | ATUALIZADO POR |
| --- | --- | --- | --- |
| {DATA} | {DIAS} | {PROGRESSO} | {AUTOR} |

## LISTA DE PENDÊNCIAS

| CATEGORIA | FUNÇÃO | ATRIBUÍDO A | AÇÃO | JUSTIFICATIVA | PRIORIDADE | PONTOS | HORAS | NOTAS E COMENTÁRIOS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

## A FAZER

| CATEGORIA | FUNÇÃO | ATRIBUÍDO A | AÇÃO | JUSTIFICATIVA | PRIORIDADE | PONTOS | HORAS | NOTAS E COMENTÁRIOS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

## EM ANDAMENTO

| CATEGORIA | FUNÇÃO | ATRIBUÍDO A | AÇÃO | JUSTIFICATIVA | PRIORIDADE | PONTOS | HORAS | NOTAS E COMENTÁRIOS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

## TESTE/VERIFICAÇÃO

| CATEGORIA | FUNÇÃO | ATRIBUÍDO A | AÇÃO | JUSTIFICATIVA | PRIORIDADE | PONTOS | HORAS | NOTAS E COMENTÁRIOS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

## CONCLUÍDO

| CATEGORIA | FUNÇÃO | ATRIBUÍDO A | AÇÃO | JUSTIFICATIVA | PRIORIDADE | PONTOS | HORAS | NOTAS E COMENTÁRIOS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
```

---

## 🛡️ INVARIANTES E RESTRIÇÕES GLOBAIS
- **NUNCA** ler pastas antigas (`ondas_antigas/`), relatórios arquivados (`04_gestao_completo/documentacao_viva/arquivo_historico/`) ou arquivos `.resolved` sem solicitação explícita.
- **NUNCA** criar filtros visuais mockados (apenas o input "Filtrar sessões", `sortMode` e `readState` oficiais são permitidos).
- **CONTRATOS_DA_ONDA:** Se o bloco de contratos do `BACKLOG_FUTURO.md` estiver preenchido, tratá-lo como decisão final e inquestionável.
- **Zero Erros de Tipagem:** Código só é aceito após validação com `npm run typecheck` (código de saída 0).

### 🚫 FONTE ÚNICA DE VERDADE DOCUMENTAL (regra inegociável)
1. **PROIBIDO criar relatório, análise, auditoria, resumo ou arquivo de status solto** em qualquer lugar fora de `AMBIENTE_COMPLETO_PARA_OPENCLAUDE/04_gestao_completo/documentacao_viva/`. Isso inclui a raiz do workspace, `docs/`, `docs/gestao/` e `02_replica_final/`. Não criar `STATUS_*.md`, `RELATORIO_*.md`, `PROGRESSO_*.md`, `CONTEXTO_*.md` nem um segundo `KANBAN.md` — **o único KANBAN válido é `04_gestao_completo/KANBAN.md`**.
2. **Todo achado de diagnóstico é mesclado na MESMA sessão em que foi gerado.** Análise de bug, auditoria de paridade, medição de teste: o resultado entra em `CURRENT_STATE.md` / `DECISION_LOG.md` / `PHASE_SUMMARY.md` / `BACKLOG_FUTURO.md` / `KANBAN.md` antes de a tarefa ser considerada concluída. É proibido "deixar o relatório para mesclar depois" — foi assim que nasceu a divergência de "348/348 testes" e "Custom View Grid EM ANDAMENTO".
3. **Números só entram em documento vivo se tiverem sido executados naquela sessão.** A saída bruta (com exit code) vai para `documentacao_viva/GATES_EXECUCAO.md`. É proibido copiar número de relatório anterior. Se um documento antigo contradisser a execução atual, **vale a execução atual**.
4. **Bloqueio é registrado, nunca omitido.** Gate que falha por ambiente (ex.: `npm run build` com OOM, exit 134) entra em `GATES_EXECUCAO.md` com a saída real, e vira linha no `KANBAN.md`/`BACKLOG_FUTURO.md`. Proibido mascarar, arredondar ou reportar "verde" o que não rodou.
5. **O `ARCHIVING_PROTOCOL.md` é obrigatório ao fim de QUALQUER tarefa, sem exceção** — inclusive tarefas pequenas, correções pontuais e sessões interrompidas por falta de contexto. Os 7 passos são a definição de "pronto".
6. Se um relatório solto for encontrado no workspace: mesclar o conteúdo nos documentos vivos e **mover** (nunca apagar) para `documentacao_viva/arquivo_historico/`, registrando a ação no `DECISION_LOG.md`.
