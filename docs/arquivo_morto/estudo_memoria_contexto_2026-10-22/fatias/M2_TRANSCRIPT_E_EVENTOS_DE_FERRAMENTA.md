# M2 — Transcript fiel e eventos de ferramenta (proposta; posição hipotética 14)

**Status:** rascunho não aprovado.  
**Objetivo:** garantir que a fonte persistida represente o diálogo que o agente usou, sem confundir cartão UI com chamada/resposta do modelo.

## Escopo

- Definir eventos/mensagens por `sessionId`, `chatId`, `messageId` e sequência monotônica; preservar partes tipadas, `turnId`, ordem e timestamps informativos.
- Representar assistant tool-call, arguments, aprovação/negação, resultado, erro, cancelamento e tool-call ID como eventos vinculados. Preservar a forma necessária para reconstruir os protocolos suportados.
- Distinguir transcript original, projeção para o provider e resumo derivado. Um pedido subsequente precisa reconstruir a conversa com tool calls/results anteriores, não só bolhas `role/content`.
- Continuar restaurando o modelo de sessão existente; avaliar gravação incremental somente com benchmark, já que o writer atual regrava JSONL inteiro.
- Definir como conteúdo sensível lido de arquivos será persistido: segredos redigidos, conteúdo protegido ou referência/handle; se a persistência for diferente do payload já enviado ao modelo, tornar essa diferença explícita e testável.

## Fora de escopo

Checkpoint/compaction (M3); índice de busca; replay de ferramenta; mudar de banco ou migrar todo session storage sem evidência de gargalo.

## Dependências e superfícies candidatas

`src/types.ts` (`ChatMessage`, `FerramentaNoChat`), `src/App.tsx` (`montarHistorico`, listeners SSE), `agir/contract.ts`, `agir/server/{agir,dialogo,rotas}.ts`, `session-persistence/{index,transcripts,database}.ts`, testes de fronteira e contratos das Casas. Manter `chatId` como chave de escopo e a composição na prefeitura.

## Critérios de aceite propostos

1. Uma execução com tool call, aprovação, resultado de leitura, resultado de escrita e erro pode ser restaurada com identidade e ordem corretas.
2. O segundo turno recebe a sequência de tool exchange necessária ao protocolo; não se perdem resultados por `montarHistorico` reduzir a bolha a texto.
3. UI pode mostrar cartão resumido sem substituir a fonte completa do transcript; texto original e resumo são distinguíveis.
4. Mensagem repetida, IDs duplicados, timestamp igual e reordenação não alteram a ordem definida por sequence.
5. Mensagens `running` não são tratadas como completas; após restart o app não afirma que o processo de rede/ferramenta continua vivo.
6. Segredos de API nunca entram no transcript; política explícita cobre conteúdo de arquivos e retenção.
7. O writer atual só será substituído por log incremental se benchmark reproduzível mostrar necessidade e a migração provar preservação.

## Testes propostos

Round-trip de evento por cada um dos quatro protocolos; IDs/sequence; cancelamento e aprovação pendente; reload/restart; tool result grande; conteúdo sensível; concorrência de save; migração de sessões legadas; teste da fronteira que impede Casas de importar internals alheios.

## Decisões pendentes

Persistir bytes ou refs de anexos; política de conteúdo completo de leitura de arquivo; append-only físico versus reserialização JSONL; contrato de versionamento/migração; modo de apagar conteúdo em transcrição e checkpoint; limites de tamanho.