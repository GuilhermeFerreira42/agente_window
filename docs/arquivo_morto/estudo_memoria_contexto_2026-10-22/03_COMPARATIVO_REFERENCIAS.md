# Comparativo de referências — transcript, compactação, busca e retomada

**Snapshots auditados:** Open WebUI `91ea4e3421d1d8069f13d4a463fcb5986d94ea60`; OpenClaude `a63ad4a9e0173137de203cafbc18b3bbcd3a4f9e`; Cline `590785eff565f167b16d5f750d682c4d9d2b7128`; OpenCode `5bae6d48aeba7db7fddb7d9a4456f6b74a298549`; VS Code/Copilot fonte local de 08/09/2026 + docs atuais; Agente Window fonte local sem HEAD verificável. Análise estática; sem builds/tests comparativos.

## Matriz de capacidades (não confundir UI com contexto do modelo)

| Produto | Transcript original após compactação | Projeção enviada ao modelo | Busca manual | Recuperação automática pelo agente | Retomada de execução/ferramenta |
|---|---|---|---|---|---|
| **Open WebUI** | Sim; chats/mensagens persistem e o resumo é associado ao chat. | Compactação opcional; resumo de mensagens antigas + faixa recente; roda server-side e não apaga a timeline. Se falhar/sem fronteira segura, há fallback que pode continuar com histórico integral. | Busca de chats/histórico existe; `search_chats` exclui explicitamente o chat corrente. Não é busca literal de mensagem antiga dentro do chat atual. | Não foi confirmada recuperação automática de originais antigos do mesmo chat pelo caminho auditado. | Não confundir reabrir chat com processo de ferramenta vivo; tarefas ativas podem ser canceladas na exclusão. |
| **OpenClaude** | Sim; transcript operacional JSONL por sessão/projeto (`sessionStorage.ts`); `sessionRestore.ts` reconstrói estado. | Compactação e session-memory Markdown separadas; memória de sessão é experimental/feature-gated no snapshot. | Busca lexical manual na transcrição corrente; busca agentic cross-session estava desativada (`false`) no snapshot. | Não foi confirmada busca automática de originais antigos pós-compactação. | Resume/continue restaura conversa; isso não prova que processos interrompidos de ferramentas revivam. |
| **VS Code / Copilot** | Sim; sessions/chats restauráveis; transcript e contexto sintetizado são camadas diferentes. | Compactação da conversa; prompts recentes, ferramentas e instruções entram no cálculo. `toolCallingLoop.ts` calcula detalhes de tokens sobre mensagens efetivas + tools e reporta `fetchResult.usage` no stream. | `Ctrl/Cmd+F` no transcript corrente; Chronicle/histórico é outra capacidade. | Não foi confirmado mecanismo geral padrão que recupere automaticamente mensagem antiga do mesmo chat por consulta. | Harness local encerra trabalho ao fechar; Agent Host pode manter execução dependendo do harness. Checkpoints de arquivo não desfazem efeitos externos. |
| **Cline** | Sim; transcript canônico separado de sidecar de compaction versionado. | Sidecar registra `conversation_id`, contagem de mensagens-fonte cobertas, hash do prefixo, fronteira e mensagens compactadas; cauda posterior é reaplicada ao retomar sem reescrever transcript. | FTS5 derivado e busca manual Hub/UI, com filtro de workspace e snippets identificados por sessão/ordinal. Limites: documento 128 KiB; multimodal/reasoning/metadata excluídos. | Não foi encontrada tool core do agente que chame a busca. API/UI não significa tool disponível ao modelo. | Retomar task e checkpoints de arquivo são separados; não equivalem a reexecutar com segurança operações anteriores. |
| **OpenCode** | Sim; mensagens originais continuam no banco; compaction é evento separado. | Contexto começa no checkpoint mais recente e reconstrói cauda via `keepID`; reasoning excluído, ferramenta truncada e anexos resumidos na projeção recente. | `Ctrl/Cmd+F` literal na timeline do chat atual, com message/part IDs. | Não foi encontrada tool de agente que faça busca histórica/injeção de originais. | Compactação e timeline não representam processo de ferramenta vivo. |
| **Agente Window** | Sim para bolhas concluídas; metadata SQLite + JSONL por sessão, regravado atomicamente. | Histórico textual elegível do chat atual é reenviado; sem checkpoint/compactação; tool schemas/resultados só existem no loop da execução. | Busca do workspace existe; busca manual do transcript não foi localizada. | Não encontrada. | Estado de retomada Agir em `Map`; reinício perde-o; F5 marca `working` como `completed`. |

## Evidência que importa para o indicador de contexto

O snapshot de VS Code/Copilot mostra o padrão mais diretamente aplicável ao medidor:

- `src/vs/workbench/contrib/chat/browser/widgetHosts/viewPane/chatContextUsageWidget.ts` resolve o denominador pelo modelo/configuração efetivos e clampa contexto/reserva de saída.
- `extensions/copilot/src/extension/intents/node/toolCallingLoop.ts` chama `computePromptTokenDetails` com as **mensagens efetivas** e as ferramentas disponíveis; quando o provedor retorna `fetchResult.usage`, envia `promptTokens`, `completionTokens`, `outputBuffer` e detalhes ao stream.
- A lógica separa o uso do pedido pai da contagem de subagente e oferece valores/estados de custo/detalhamento. O widget distingue a porcentagem de uso da reserva de saída e sinaliza proximidade (75%/90%) no snapshot examinado.
- Isto é evidência de um mecanismo integrado ao runtime — não autorização para copiar o código nem prova de que o valor pode ser exato antes da resposta. O Agente Window deve distinguir uso anterior reportado de estimativa do próximo payload.

## Convergências e limites úteis

1. **Transcript preservado** e **contexto enviado** são objetos diferentes em Cline, OpenCode e VS Code/Copilot. Compactar não exige apagar mensagens antigas.
2. **Resumo/checkpoint é derivado:** precisa de fronteira, identidade e validação contra a fonte; não deve ser mostrado como citação literal.
3. **Busca manual não é recuperação do agente:** em Cline existe serviço API/Hub; em OpenCode há busca na timeline; em ambos, o caminho auditado não registra essa busca como ferramenta do modelo.
4. **Abrir chat não retoma processo:** VS Code varia conforme harness; o Agente Window usa estado volátil para Continue e não promete tarefa em background.
5. **Limites reais de ferramentas:** faixas de chamada/resultado devem permanecer pareadas; corte por número de mensagens pode partir uma rodada de ferramentas. Open WebUI teve issue pública sobre boundary não consciente de turnos; é risco de projeto a testar, não justificativa para copiar algoritmo sem revisão.
6. **OpenClaude não deve ser usado como base de cópia:** o arquivo `LICENSE` no snapshot informa que contém código derivado do Claude Code proprietário e que MIT cobre modificações/aditamentos apenas onde legalmente permitido.
7. **Sem banco vetorial obrigatório:** exemplos mostram busca lexical/FTS útil e checkpoints separados; sem demonstração de necessidade, embeddings aumentariam custo e superfície.

## Fontes consultadas

### Open WebUI
- Docs: [janela/compactação](https://docs.openwebui.com/troubleshooting/context-window/), [history/search](https://docs.openwebui.com/features/chat-conversations/chat-features/history-search/), [license](https://docs.openwebui.com/license/).
- Código no commit auditado: [`context_compaction.py`](https://github.com/open-webui/open-webui/blob/91ea4e3421d1d8069f13d4a463fcb5986d94ea60/backend/open_webui/utils/context_compaction.py), [`builtin.py`](https://github.com/open-webui/open-webui/blob/91ea4e3421d1d8069f13d4a463fcb5986d94ea60/backend/open_webui/tools/builtin.py), [`chat_messages.py`](https://github.com/open-webui/open-webui/blob/91ea4e3421d1d8069f13d4a463fcb5986d94ea60/backend/open_webui/models/chat_messages.py). Recorte local: `/home/user/open-webui-source.zip`.
- Licença atual não é AGPL: o repositório tem licença por proveniência/data; código novo pós-`60d84a3...` usa “Open WebUI License” com cláusula de marca. O arquivo de compactação auditado foi alterado em 2026 (`17e649...`), logo **não se presume BSD/MIT** para copiá-lo; verificar o histórico exato do arquivo em qualquer decisão de reuse.

### OpenClaude
- Snapshot/arquivos: [`commit`](https://github.com/Twigpine/openclaude/tree/a63ad4a9e0173137de203cafbc18b3bbcd3a4f9e); `sessionStorage.ts`, `sessionRestore.ts`, `agenticSessionSearch.ts`, `transcriptSearch.ts`, `SessionMemory/sessionMemory.ts`, `compact/sessionMemoryCompact.ts`.
- Fonte completa local `/home/user/openclaude-clone.zip`; `LICENSE` lido no ZIP contém NOTICE de código derivado proprietário. Mais em `notas_temporarias/raspagem_continuidade_projetos_e_espaco_2026-10-22.md`.

### VS Code / Copilot
- Docs: [sessions](https://code.visualstudio.com/docs/agents/run/sessions/manage-sessions), [context](https://code.visualstudio.com/docs/agents/concepts/context), [memory](https://code.visualstudio.com/docs/agents/run/memory), [Agent Window](https://code.visualstudio.com/docs/agents/run/agents-window), [checkpoints](https://code.visualstudio.com/docs/agents/run/checkpoints).
- Código: `vscode-main.zip` (snapshot local com timestamps de 08/09/2026), `vscode-chat-context-sources.zip`; arquivos do widget e `toolCallingLoop.ts` lidos diretamente do ZIP, sem extração.

### Cline e OpenCode
- Cline commit `590785eff565f167b16d5f750d682c4d9d2b7128`: [compaction model](https://github.com/cline/cline/blob/590785eff565f167b16d5f750d682c4d9d2b7128/sdk/packages/core/src/session/models/session-compaction.ts), [sidecar store](https://github.com/cline/cline/blob/590785eff565f167b16d5f750d682c4d9d2b7128/sdk/packages/core/src/session/stores/session-manifest-store.ts), [FTS search](https://github.com/cline/cline/blob/590785eff565f167b16d5f750d682c4d9d2b7128/sdk/packages/core/src/session/search/session-history-search.ts), [Hub handler](https://github.com/cline/cline/blob/590785eff565f167b16d5f750d682c4d9d2b7128/sdk/packages/core/src/hub/server/handlers/session-handlers.ts).
- OpenCode commit `5bae6d48aeba7db7fddb7d9a4456f6b74a298549`: [compaction](https://github.com/anomalyco/opencode/blob/5bae6d48aeba7db7fddb7d9a4456f6b74a298549/packages/core/src/session/compaction.ts), [history](https://github.com/anomalyco/opencode/blob/5bae6d48aeba7db7fddb7d9a4456f6b74a298549/packages/core/src/session/history.ts), [recent text](https://github.com/anomalyco/opencode/blob/5bae6d48aeba7db7fddb7d9a4456f6b74a298549/packages/core/src/session/recent-text.ts), [manual UI search](https://github.com/anomalyco/opencode/blob/5bae6d48aeba7db7fddb7d9a4456f6b74a298549/packages/app/src/session/timeline/search-controller.ts).

## Material local pré-existente preservado

As análises de continuidade e Cline/OpenCode que serviram de base continuam em `notas_temporarias/raspagem_continuidade_projetos_e_espaco_2026-10-22.md` e `notas_temporarias/auditoria_codigo_cline_opencode_e_contratos_busca_intra_chat_2026-10-22.md`; ZIPs-fonte permanecem intactos.