# 06 — Resultados dos testes operacionais

**Ambiente:** cópia de arquivos rastreados do HEAD em `/tmp/aw_m1m8_isolated/platform` via `git archive HEAD platform`; dependências instaladas somente nessa cópia. `HOME=/tmp/aw_m1m8_isolated/home`, workspaces sintéticos em `/tmp/aw_m1m8_isolated/workspaces/`. Nenhum dado/credencial real. Após a instalação, `npm ci` reportou 10 advisories (4 moderados, 2 altos, 4 críticos); nenhuma correção/audit fix foi executada.

## Suite automatizada relevante executada

Comando, na cópia:  
`HOME=/tmp/aw_m1m8_isolated/home AGENTE_WINDOW_TEST_HOME=/tmp/aw_m1m8_isolated/test-home npm run test --workspace=agents-window-replica-v2 -- src/server/session-persistence src/__tests__/chatStreamingFatia09.test.tsx src/bairros/2-inteligencia/casas/agir/__tests__`

**Resultado:** 17 arquivos passaram; 139 testes passaram; 4 foram ignorados/skipped. Incluiu `rotas.test.ts` (40), `agir.test.ts` (18), `vizinho.test.ts` (11), `discos.test.ts` (10), `chatStreamingFatia09.test.tsx` (3), persistência/workspaces/worktrees e testes próximos. O output teve mensagens de ambiente JSDOM (`HTMLCanvasElement.getContext` não implementado) e falhas 404 de Explorer esperadas por stubs; não impediram os testes.

Essa execução é regressão isolada para código atual; não foi execução de modelo/provedor real. Os testes com provider são fixtures/stubs.

Também executado na cópia isolada: `HOME=/tmp/aw_m1m8_isolated/home npm run typecheck --workspace=agents-window-replica-v2` — **passou**. `npm run build --workspace=agents-window-replica-v2` passou por `build:fs-boundary` (reportou desativação da fronteira nativa F2 no fixture) e TypeScript, mas o processo foi **Killed / exit 137** durante `vite build`; classificado como bloqueio de recurso do ambiente, não como falha funcional determinada. Não repetido.

## Matriz A–H

| Cenário | Procedimento e resultado observado | Classificação | Limitação |
|---|---|---|---|
| **A — Persistência** | Via Vite isolado, `PUT /api/sessions` para sessões sintéticas A/B retornou 200. Fechado o processo; novo processo com o mesmo `HOME` fez `GET /api/sessions` e recuperou metadados, chats, mensagens/cards e caminhos. | Observado, persistência/restart de servidor | Não automatizou F5/browser real nem `pagehide`/`keepalive`; não é provider real. |
| **B — Ferramentas** | `rodarAgir` com vizinho fake e executores reais de disco em workspace descartável executou leitura, criação, releitura, edição; conteúdo final `edited marker`. Leitura de arquivo inexistente produziu `ok:false` e resumo honesto. Cards sintéticos correspondentes foram salvos e restaurados após restart. | Observado, operações e round-trip de cards | O harness não conectou o loop completo à tradução SSE/UI; a tool exchange real do loop não faz parte do transcript. O teste de UI abaixo confirma que card não é reenviado como tool result. |
| **C — Isolamento** | Sessões A/B com workspaces e `slug`s distintos foram salvas/recuperadas no mesmo DB; canário de B permaneceu em B. Teste de UI selecionou chat de B e não enviou canário do projeto A. | Observado, fixtures separadas | Não prova isolamento diante de ID/slug malformado nem validações de todo o fluxo. |
| **D — Concorrência (baseline)** | 16 PUTs simultâneos para mesmo ID/transcript. Na investigação, repetido duas vezes; em ambas 2/16 falharam HTTP 500 `ENOENT` no rename do mesmo `<destino>.<pid>.tmp`. Na revalidação sem correção da Task 01: 6/16 falharam em uma rodada, confirmando a corrida. | Observado, confirmado no baseline | Concorrência local, mesmo processo/OS; taxa não é estimativa geral. Correção e reteste constam em `CORRECAO_PERSISTENCIA.md`. |
| **E — Interrupção** | Suite passou nos 3 testes de streaming do App, incluindo Parar em fio aberto e preservação de texto parcial; `rotas.test.ts` inclui cancelamento/claims e passou. | Teste automatizado isolado com SSE fake | Não interrompeu um provider real nem reiniciou o processo do modelo; não demonstra atomicidade de efeitos de uma chamada real. |
| **F — Recuperação histórica** | `GET` após restart reconstruiu o transcript e os cartões persistidos. Teste de UI verificou que mensagens elegíveis do chat atual voltam ao request. | Observado + teste UI | Não existe busca textual de transcript localizada; recuperação exige carregar sessão. |
| **G — Continuidade contextual** | Teste de UI confirmou mensagens de texto elegíveis do chat selecionado no request; `running`, `cancelled`, `erro` e texto do card foram excluídos. Busca estática não localizou resumo/checkpoint/compactação; todo texto elegível é reenviado. | Teste de escopo de prompt + achado de código | Não mede contexto longo, tokens ou qualidade de continuidade com modelo real. |
| **H — Compartilhamento** | Canary sintético adicionado a outro projeto/chat não apareceu no corpo de `/api/agir` ao enviar no chat selecionado. | Teste UI isolado de não-vazamento por composição atual | Não testa recurso de compartilhamento, pois não foi localizado nenhum retrieval cross-chat no Agente Window. |

## Teste de UI adicional temporário

Teste criado/executado somente na cópia isolada: `awMemoryAudit.temp.test.tsx`. Na primeira execução passou 1/1; depois de ajustar os mocks para responder 404 também a `/fs/workspace` e `/api/fs/workspace`, foi repetido e passou novamente 1/1 (exit 0). Na repetição ainda houve avisos de JSDOM (`HTMLCanvasElement.getContext` não implementado) e logs de boot do Explorer ao receber os 404 stubados; não impediram o teste. Confirmou na requisição observada: histórico do chat selecionado e novo pedido presentes; canário de outro projeto, conteúdo de `FerramentaNoChat`, erro, cancelamento e mensagem em voo ausentes. A cópia isolada e o próprio teste temporário foram removidos após essa execução; o teste não existe no código original.

## Conclusão operacional

A–H da investigação original têm evidência parcial e não constituem homologação de memória, compactação, busca ou provider real. O achado concorrente foi reproduzido no baseline e corrigido na Task 01; documentação completa do reteste e das limitações em `CORRECAO_PERSISTENCIA.md`. Nenhuma funcionalidade M1–M8 foi implementada.
