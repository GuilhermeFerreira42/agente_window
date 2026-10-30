# 01 — Estado atual do Agente Window

**Baseline:** `/home/user/agente_window`, `main`, HEAD `971a59f5d2a5118e8526d2829ba26039a344b796`.  
**Baseline desta investigação:** HEAD `971a59f5d2a5118e8526d2829ba26039a344b796`; antes da Task 01, sem alterações rastreadas e somente `investigacao_memoria_fatias_m/` não rastreada. **Estado após Task 01:** alterações locais limitadas a `session-persistence/index.ts`, `transcripts.ts`, testes dessas duas áreas e relatório investigativo; sem edição de banco real, docs canônicos ou roadmap.

## Persistência localizada no código atual

- `platform/apps/workbench-v2/src/server/session-persistence/database.ts`, `getDatabase`, `upsertSessionRecord`, `getSessionRecord`: banco local `~/.agente_window/agente_window.db`; SQLite/WAL; tabela `sessions` mantém metadados/JSON da sessão sem arrays de mensagens; grants ficam em tabelas próprias.
- `src/server/session-persistence/transcripts.ts`, `readTranscript`, `writeTranscript`, `deleteTranscript`: transcript JSONL por `slug`/sessão sob `~/.agente_window/projects/<slug>/<sessionId>.jsonl`; grava em arquivo temporário e renomeia.
- `src/server/session-persistence/index.ts`, `transcriptEntries`, `restoreMessages`, `listSessions`, `saveSession`: `GET/PUT/DELETE /api/sessions`. `saveSession` retira mensagens com `running === true`, guarda os demais objetos `ChatMessage` completos no JSONL e remove os arrays de mensagens do JSON de catálogo. Restauração recompõe mensagens por `chatId`; estado `working` vira `completed` e cartões pendentes são sanados após F5.
- `src/services/sessions/sessionsClient.ts`: cliente browser usa `GET`, `PUT` e `DELETE`; `persistSessionNoUnload` faz `PUT` com `keepalive` no `pagehide`.
- `App.tsx`, efeito de hidratação e persistência: reabre sessões no boot; grava com debounce de 150 ms e tenta descarregar no `pagehide`.

## Transcript visual vs. contexto enviado ao agente

- `src/types.ts`: `ChatMessage` pode conter `ferramentas` (cards de operação/resultados) e flags de erro/cancelamento/stream; `FerramentaNoChat` guarda alvo, status, resumo, ordem e metadados limitados.
- `App.tsx`, `montarHistorico`: ignora mensagens `running`, `cancelled`, `erro` ou sem texto e reduz as restantes a `{role, content}`. `handleSend` envia apenas mensagens do `NestedChat` selecionado mais a mensagem nova. Não inclui `ferramentas`, IDs/argumentos/resultados estruturados nem mensagens de outros chats/sessões.
- `App.tsx`, `criarOuvintesAgir`: eventos SSE viram cards da UI. `agir/server/agir.ts`, `rodarAgir`, preserva a troca tool-call/resultado dentro do loop atual, mas a interface de request para o próximo turno é apenas texto `role/content`.
- Resultado: o transcript pode preservar os cards e resumos visuais; isso não significa que o segundo turno recupere o protocolo completo de tool calls/results.

## Contexto, busca e memória

- `components/ChatInput.tsx`: o indicador atual é calculado em `contextPercent` como `min(92, 18 + round(text.length / 9) + attachments.length * 4)`. É fórmula sobre draft/anexos, não usage de provider, tokens de prompt, limite efetivo, schemas/resultados de ferramentas ou conteúdo histórico. Deve ser classificado como indicador sintético, não medição de contexto.
- Busca no Explorer é busca no workspace (módulo `explorer-search`), não uma busca nos transcripts.
- Nas superfícies examinadas, não localizei checkpoint/compaction de conversa, sumário contextual, índice global de transcript, embeddings ou memória persistente de projeto consultada pelo agente. Isso não equivale a prova de que nenhum mecanismo possa existir fora deste app.
- `agir/server/rotas.ts`: continuations de erro/teto ficam em `Map` de processo (até 20 retomadas); o processo que contém essa estrutura não é reconstruído pelo transcript depois de restart. Reabrir histórico e retomar o mesmo processo são capacidades diferentes.

## Observação operacional crítica — concorrência do JSONL

**Evidência baseline (antes da Task 01):** em ambiente descartável, 16 `PUT /api/sessions` concorrentes para o mesmo `sessionId`/transcript foram executados duas vezes. Em cada rodada anterior, 2/16 retornaram HTTP 500 `ENOENT` no `rename` do mesmo arquivo temporário `<transcript>.<pid>.tmp`. Na revalidação da Task 01, o mesmo HEAD sem correção produziu 6/16 HTTP 500 numa rodada de 16, confirmando a condição não determinística. Causa: todos os escritores do processo compartilhavam `${destination}.${process.pid}.tmp`.

**Estado após Task 01:** `transcripts.ts` usa temp exclusivo por escrita e substituição via rename; `index.ts` serializa PUT/GET/DELETE por sessão e publica transcript antes dos metadados SQLite. Duas rodadas corrigidas de 16 PUTs passaram com 16/16 HTTP 200; o estado final era um snapshot íntegro (IDs/conteúdo/ordem/count coerentes). Testes, compatibilidade e limites constam em `CORRECAO_PERSISTENCIA.md`. Não extrapolar esses resultados a múltiplos processos/Windows/power-loss.

## Limites de validade

- Leitura estática identifica mecanismos e limitações; não demonstra a disponibilidade de provider real nem uso real de tokens.
- A execução A–H abaixo usa server/Vite, providers/LLM fake e workspace descartável; não contém credenciais nem conteúdo do usuário.
- Documentos anteriores datados de 22–24/10 foram usados como roteiro e revalidados onde indicado; relatórios antigos e benchmarks sem logs brutos não foram tratados como novos resultados.
