# 03 — Referências OpenCode

**Status:** documentação e leitura estática concluídas para o recorte abaixo; testes da referência não executados.  
**Código fixado:** OpenCode tag `v2.2.4`, commit `45898d0f8569225eb1ddb4ee13f8581b34dff311`.  
**Importante:** estas conclusões pertencem à arquitetura v2 desse commit; não transportar automaticamente comportamento do OpenCode v1, blogs, branches móveis ou docs de URLs antigas.

## Fontes

- Docs v2: https://opencode.ai/v2/docs/compaction/ e https://opencode.ai/v2/docs/config/ — compaction e suas configurações.
- Agents: https://opencode.ai/docs/agents/ — configuração/agentes (a documentação corrente deve ser lida em conjunto com o código da tag).
- Server/API: https://opencode.ai/docs/server/ — API de sessão e servidor.
- URLs antigas consultadas `/docs/compaction/`, `/docs/instructions/`, `/docs/sessions/` retornaram 404 em 30/10/2026; não são fonte válida para o recorte atual.

## Achados de código

1. **Persistência/transcript estruturado:** `packages/core/src/session/sql.ts` define `session_v2`, `session_message`, `session_part`, `session_inbox`, blobs e outras tabelas. Mensagens possuem `session_id`, `seq`, tipo e payload JSON; as partes de conteúdo/arquivos podem ser normalizadas e reidratadas. `packages/core/src/session/store.ts`, `SessionStore.messages`, `context`, `messageRows` implementa leitura ordenada/paginada e reconstrução de contexto. A sessão mantém relação de pai/fork.
2. **Busca de sessões não equivale a busca textual de transcript:** em `SessionStore.list`, o argumento `search` vira `LIKE` sobre `SessionTable.title`. Não localizei, nos caminhos de sessão examinados, índice global de embeddings ou recuperação vetorial de mensagens. Há busca por título/metadata e leitura do histórico por sessão.
3. **Compaction automática/manual:** `packages/core/src/session/compaction.ts`, `SessionCompaction.compact`, `summarize`, `compactNatively`, mantém resumo e janela recente. As configurações iniciais no código são `auto: true`, `keep: 15_000`, `precompute: false`; `keep` é orçamento em tokens para texto recente mantido verbatim. A compaction pode disparar por limite/overflow ou manualmente; pré-cálculo em segundo plano é opcional. Testes correspondentes estão em `packages/core/test/session-compaction.test.ts`, sem execução nesta auditoria.
4. **Formato e perda controlada no resumo:** `SUMMARY_TEMPLATE` exige `Objective`, `Requirements`, `Decisions`, `Work State` (Completed/Active/Blocked), `Next Move`, `Relevant Files` e `Important Context`. Ao reduzir a solicitação que gera o resumo, o código aplica níveis progressivos: transcript completo; corta saídas de ferramenta; remove/corta conteúdo de ferramenta; preserva apenas texto do usuário; omite turnos antigos. A janela mais recente é preservada como contexto separado quando cabe. Portanto compaction é resumo orientado à continuidade, não arquivo canônico substituto do transcript.
5. **Instruções de projeto/agente:** `packages/core/src/session/context.ts`, `SessionContext.select`, compõe instructions de code mode, MCP, references, skills, discovery, built-ins e entries da sessão. `packages/core/src/tool/plugin/read.ts`, ferramenta `read`, após leitura bem-sucedida procura `AGENTS.md` próximo dentro da Location (sem incluir o root já carregado) e chama `SessionInstructions.load`; `packages/core/src/session/instructions.ts` injeta o conteúdo como mensagem synthetic durável com metadata de paths. Deduplicação é derivada de synthetics ainda visíveis, permitindo redescoberta se compaction/revert remover o synthetic. Isso é instrução, não memória extraída de experiências/sessões.
6. **Retomada de execução após restart:** `packages/core/src/session/store.ts` mantém claim de execução e tentativas de retomada; `packages/core/src/session/execution/restart.ts`, `SessionRestart.resumeSuspendedSessions`, retoma turnos órfãos e registra aviso sintético “The server restarted while you were working...”. O comentário define recuperação at-least-once e explicita que não impede repetição de efeitos externos após uma queda. O teto default de retomadas é 10; excedê-lo terminaliza a execução.
7. **Banco e proteção local:** `packages/core/src/database/database.ts` configura SQLite/WAL, migrações e arquivo POSIX `0600` (ACL herdada no Windows). Há abstrações para runtime de arquivo ou banco injetado; o path efetivo depende da inicialização/Global, ainda não verificado em execução.

## Síntese delimitada

OpenCode v2 combina transcript durável consultável por sessão, instruções duráveis reinjetáveis, compaction estruturada para reduzir contexto e mecanismo de retomada do turno. Isso não demonstra memória semântica cross-session: nesta busca estática não foi localizado índice vetorial de conversas. Também não prova recuperação bem-sucedida em runtime, nem idempotência de ferramentas após crash.
