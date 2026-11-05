# M4 — Busca manual do transcript no mesmo chat (proposta; posição hipotética 16)

**Status:** rascunho não aprovado.  
**Objetivo:** permitir à pessoa encontrar e conferir mensagens antigas do chat ativo após compactação, sem depender do resumo e sem expor outro chat.

## Escopo

- Busca lexical por texto/metadados do transcript fonte no `chatId` atual, resultado com `messageId`, sequence, papel, timestamp e trecho literal/offset.
- Navegação para mensagem original e leitura da vizinhança ordenada; resultado de indexação é derivado e reconstruível.
- Busca funciona mesmo quando o modelo está usando checkpoint e faixa recente. Pesquisa de código/workspace continua separada.
- SQLite FTS5 é candidato, não decisão: o app já usa `better-sqlite3`, mas FTS5 precisa ser validado na build. `LIKE`/varredura pode ser alternativa para volume pequeno; medir antes de escolher.
- Política de anexos, conteúdo não textual, reasoning e tool payload precisa explicitar o que indexa e o que retorna.

## Fora de escopo

Busca cross-chat; tool do agente; semântica/embeddings; auto-injeção de resultados; busca em código do workspace.

## Dependências e superfícies candidatas

M2 (IDs/sequence e fonte fiel); integração à Casa de sessões/chat sob fronteira LEGO; UI em ChatPanel/ChatMessage; índice no servidor/persistência via porta. M3 ajuda a demonstrar valor, mas M4 pode indexar transcript sem checkpoint.

## Critérios de aceite propostos

1. Busca por canário antigo no chat A retorna a mensagem original de A com ID/posição e trecho literal após compactação.
2. Chat B/projeto diferente não aparece, inclusive com mesma frase; escopo `chatId` participa da consulta e autorização.
3. Abrir hit apresenta fonte original, não uma frase do resumo; o usuário pode ler mensagens adjacentes.
4. Índice ausente/corrompido pode ser reconstruído e nunca impede salvar/reabrir chat.
5. Exclusão de mensagem/chat invalida índice de acordo com política; limite de tamanho/resultado impede bloquear a UI.
6. Anexos e tool payload são identificados por tipo e limites; não há promessa de busca em conteúdo não indexado.

## Testes propostos

Canários exclusivos A/B; acentos/prefixos/pontuação; texto longo truncado; messages excluídas; rebuild; índice indisponível; busca de trecho em tool result; autorização cross-scope; tempo/volume com histórico grande; navegação acessível por teclado.

## Decisões pendentes

Escopo de filtros (período, papel, ferramentas); indexar conteúdo de ferramenta/anexo; persistência de snippets; FTS5 versus alternativa; quota de armazenamento; retenção/exclusão. Não comprometer embeddings.