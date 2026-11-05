# 07 — Matriz comparativa

**Baselines:** Agente Window `971a59f5d2a5118e8526d2829ba26039a344b796`; VS Code `c8a3f819b4a13366d5846a02288ab53b4d89ac50`; OpenCode v2.2.4 `45898d0f8569225eb1ddb4ee13f8581b34dff311`. Código de referência inspecionado estaticamente; execução A–H somente para Agente Window em cópia isolada.

| Capacidade | Agente Window | VS Code / Copilot | OpenCode v2.2.4 |
|---|---|---|---|
| Transcript | Catálogo SQLite + transcript JSONL por sessão/chat; round-trip de fixtures observado. | Histórico local JSONL; Chronicle é projeção/índice adicional. | SQLite com mensagens tipadas/partes, sequence e leitura paginada por sessão. |
| Fidelidade a tools | Loop Agir mantém tool calls/results em memória enquanto executa; JSONL persiste cards/resumos. Próximo request recebe só texto `role/content`. | Histórico de chat é separado do Chronicle; store Chronicle resume turnos/respostas e registra caminhos/refs selecionados. | Trocas estruturadas persistidas no histórico; runner lê contexto reconstruído. |
| Context budget | Não medido; percent `18 + chars/9 + anexos*4`, teto 92. Nenhuma compactação encontrada. | Resumo de histórico do agente existe; Memory Context tem budget/limites próprios. | Auto/manual compaction com resumo estruturado, janela recente em tokens e precompute opcional. |
| Instruções | Não localizada camada de instruções persistentes para prompt do agente. | Custom instructions e arquivos de memória local; seus ciclos são distintos. | Context inclui built-ins, descoberta, skills, references e entries; leitura de `AGENTS.md` pode injetar synthetic durável por sessão. |
| Memória local explícita | Não localizada. | Memory Tool em arquivo, escopos user/session/repo, mutações confirmadas, limpeza de session files após 14 dias. | Não localizado mecanismo equivalente de fatos extraídos cross-session no recorte; instruções não são “memória episódica”. |
| Busca cross-chat | Não localizada; UI test confirma chat/project canary ausente do request atual. | Chronicle local FTS5/BM25 e tool SQL read-only; cloud é serviço externo, sync opt-in/configurável. | Busca de lista por título; não localizado índice FTS/vetorial de transcript cross-session. |
| Recuperação após restart | Transcript recupera; estado do loop/continuation em `Map` não recupera. | Histórico e Chronicle persistentes; não confundir com retomada da execução do agente. | Claim durável, retomada at-least-once e limite de tentativas; efeitos externos podem repetir. |
| Privacidade/escopo | Sessão/chat selecionados; DB global guarda catálogo, transcript por slug/id; sem busca cruzada por agente. | User/session/repo local separados; cloud memory e Chronicle sync são serviços/escopos distintos, com políticas documentadas. | Sessão/Location/Workspace e instruções persistentes por sessão; permissões filtram tools. |
| Evidência operacional nesta auditoria | `GET/PUT`, restart, operações de arquivo, filtragem de prompt e corrida simultânea exercitados com fixtures. | Nenhum teste de referência executado. | Nenhum teste de referência executado. |

## Síntese

- Copilot é referência útil para separar notas explícitas, histórico local resumido/indexado e sincronização cloud; não copiar o serviço remoto como se fosse código aberto.
- OpenCode v2 é referência útil para separar transcript estruturado, compaction e retomada; a retomada é explicitamente at-least-once, não garantia de ausência de efeitos duplicados.
- O Agente Window já reabre uma timeline, mas ainda não reenvia tool exchanges estruturadas, não controla contexto com medição real e não recupera conhecimento de outros chats.
- O teste de concorrência encontrou falha do writer atual. Antes de acrescentar busca/RAG, preservar integridade, ordem e recuperação do transcript é prioridade técnica.
