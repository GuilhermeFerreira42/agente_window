# 04 — Arquiteturas de memória

**Status:** síntese estática atualizada; recomendações aguardam aprovação explícita.

| Camada | Agente Window — HEAD auditado | VS Code / Copilot público — commit auditado | OpenCode v2.2.4 — commit auditado |
|---|---|---|---|
| Transcript durável | SQLite de catálogo + JSONL por sessão/chat. JSONL contém `ChatMessage`, incluindo cards UI; não a troca de ferramenta estruturada do loop. | Histórico de chat local/debug JSONL; Chronicle projeta um subconjunto em SQLite separado. | SQLite com sessões, sequência de mensagens e partes; mensagens tipadas e payloads de tool persistidos. |
| Contexto ordinário do próximo turno | `montarHistorico` envia apenas texto `role/content` do chat selecionado; filtra estados transitórios/erro/cancelamento. | Harness compõe prompt da conversa; memória local e histórico são superfícies separadas. | `SessionHistory` reconstrói contexto por sessão, observando compaction e instruções persistidas. |
| Continuidade longa | Sem resumo/checkpoint/compactação encontrado; indicador de contexto é fórmula sobre draft. | Agente inclui histórico resumido quando necessário (`SummarizedConversationHistory`) e há memórias com escopos próprios. | Compaction automática/manual, resumo estruturado e cauda recente; transcript original permanece no store. |
| Memória explícita | Não localizada nas superfícies da app. | Memory Tool local com escopos user/session/repo; arquivo editável; outro recurso separado é Copilot Memory cloud, documentado pelo GitHub. | Instruções por localização/agente e `AGENTS.md`; isso não é extração automática de memória histórica entre conversas. |
| Recuperação de conversas passadas | Não há busca de transcript nem retrieval pelo agente localizado. | Chronicle local indexa turnos/checkpoints/artefatos e expõe consulta SQL ao agente; FTS5/BM25 no store local. Cloud Chronicle é separado e tem backend não publicado no snapshot. | Busca de lista de sessões usa título; não foi localizado índice cross-session de mensagens/embeddings no recorte auditado. |
| Recuperação de execução | Estado de continuação do Agir é volátil (`Map`); reabrir transcript não reconstitui processo. | Não confundir histórico/Chronicle com retomada de um processo de ferramenta. | Claim durável e serviço de restart fazem retomada at-least-once; comentários alertam que efeitos externos podem repetir. |
| Isolamento | Sessão global por ID; transcript por slug/sessão; agente recebe somente chat selecionado pelo frontend. Concorrência do writer falhou 2/16 em teste controlado. | Escopos de arquivo separados; Chronicle local/consentimento cloud; políticas efetivas do serviço cloud dependem da documentação. | Sessão/Location/Workspace em contexto, sequências/ancestralidade de fork; instructions registradas por sessão. |

## Distinções conceituais necessárias

1. **Histórico/transcript:** evidência durável do que foi conversado e feito.
2. **Projeção para o provider:** subconjunto e formato efetivamente remetidos ao modelo em determinado turno; pode divergir do transcript.
3. **Resumo/checkpoint:** derivado para reduzir contexto; nunca deve ser apresentado como texto literal da fonte.
4. **Instruções persistentes:** regras de projeto/configuração injetadas no prompt, não memórias extraídas de conversas.
5. **Memória estruturada:** fatos/preferências selecionados, com escopo, origem, validade e mecanismo de correção/exclusão.
6. **Índice de busca:** representação auxiliar para localizar fontes; índice não é fonte canônica.
7. **Recuperação operacional:** estado e decisão sobre uma execução interrompida; não é retomável só porque existe transcript.

## Leitura para o desenho M1–M8

OpenCode mostra que transcript estruturado, instruções e compaction podem compartilhar infraestrutura sem serem uma única camada. Copilot demonstra duas opções distintas: arquivos locais de memória e índice Chronicle de histórico; a busca local pública é lexical/SQL e há consentimento separado para sincronização cloud. No Agente Window, o gap atual mais concreto é fidelidade do transcript de ferramenta e continuidade/orçamento, não ausência comprovada de embeddings.
