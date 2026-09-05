# PROTOCOLO DE ARQUIVAMENTO E GESTÃO CONTÍNUA — Réplica Agents Window

## Quando Executar
1. **Ao concluir qualquer tarefa ou sessão de código** (antes de marcar como concluído).
2. **Ao interromper uma sessão por esgotamento de contexto** (para permitir retomada imediata em chat novo).

---

## Pré-condições Obrigatórias
Antes de atualizar a documentação viva e arquivar a fase, executar a cadeia de validação:
- [ ] `npm run typecheck` retorna 0 erros no TypeScript
- [ ] `npm run test` passa em todas as suites unitárias
- [ ] `npx playwright test --grep "..."` passa nos testes E2E do escopo da sessão
- [ ] Screenshots de evidência são gerados em `test-results/` (quando aplicável)

Se algum teste falhar: **NÃO arquivar**. Corrigir o problema primeiro ou registrar o bloqueio no `CURRENT_STATE.md`.

---

## Passos Obrigatórios de Execução

### Passo 1 — Executar e Auditar Testes
Executar no terminal e **colar a saída bruta (com exit code) em `GATES_EXECUCAO.md`**:
```bash
npm run typecheck
npm run test
npx playwright test
npm run build
```
Regra: nenhum número vai para os demais documentos vivos sem estar em
`GATES_EXECUCAO.md`. Gate bloqueado (ex.: OOM no build) é registrado como
bloqueio explícito, nunca omitido.

### Passo 2 — Atualizar CURRENT_STATE.md
- Atualizar a seção `⚡ Handoff Imediato` (status, último arquivo, próxima ação).
- Se novos módulos ou funções foram criados, atualizar a tabela `Módulos e Contratos Vigentes`.
- Manter o documento conciso (alvo: ≤ 1800 tokens).

### Passo 3 — Append ao DECISION_LOG.md
- Adicionar decisões arquiteturais ou técnicas tomadas na sessão:
  `FN | TIPO | DECISÃO | MOTIVO | ARQUIVOS` (tipos: `ADD`, `MOD`, `DEL`, `RULE`, `TECH`, `FIX`).

### Passo 4 — Atualizar BACKLOG_FUTURO.md
- Mover o status do entregável concluído de `PENDENTE` para `CONCLUÍDO`.
- Atualizar a coluna "Descrição" com o que foi **realmente entregue**.

### Passo 5 — Atualizar PHASE_SUMMARY.md
- Registrar o resumo executivo da fase recém-concluída com lista de arquivos e métricas.

### Passo 6 — Atualizar o KANBAN.md (Regra de Formato Estrito)
- Mover a linha da tarefa para a seção adequada (`## EM ANDAMENTO`, `## TESTE/VERIFICAÇÃO` ou `## CONCLUÍDO`).
- **PROIBIDO** alterar a estrutura de 9 colunas ou excluir as 5 seções do quadro.
- Modelo obrigatório:

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

### Passo 7 — Sugerir Mensagem de Commit Git
Formato padrão:
```
[SESSAO_XX] DESCRICAO CONCISA — resumo do que foi entregue e testado
```

---

## Regras de Leitura Obrigatória para Nova IA / Novo Chat
Ao abrir um chat novo ou após `/compact`:
1. Ler **SEMPRE**: `04_gestao_completo/documentacao_viva/CURRENT_STATE.md` (menos de 1800 tokens).
2. Ler **A TAREFA ATIVA**: `04_gestao_completo/documentacao_viva/BACKLOG_FUTURO.md`.
3. Ler **APENAS** os arquivos de código que serão modificados.
4. **NUNCA** ler pastas antigas, logs gigantes ou arquivos históricos desnecessariamente.
