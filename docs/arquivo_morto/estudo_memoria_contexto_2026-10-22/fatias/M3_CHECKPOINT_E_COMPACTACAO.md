# M3 — Checkpoint e compactação segura (proposta; posição hipotética 15)

**Status:** rascunho não aprovado.  
**Objetivo:** limitar o que é enviado ao modelo em chats longos sem apagar a fonte original e sem separar tool round.

## Escopo

- Checkpoint por `chatId`, versionado e derivado, com fronteira fonte (`coveredThroughSequence`/IDs), fingerprint/hash, data/modelo/estratégia e status válido.
- Resumo útil para continuidade: objetivo, restrições, decisões, trabalho concluído, arquivos/comandos/testes relevantes, pendências, bloqueios e próximo passo. Marcar resumo como gerado, nunca como citação literal.
- Contexto do request é `checkpoint + mensagens fonte após fronteira + turno atual + instruções/tools necessários`; manter cauda recente inteira e boundaries de ferramenta/aprovação.
- Recompactações incorporam checkpoint anterior e delta sem duplicar/omitir; fonte/transcript permanece intacto.
- Compactação manual e automática são opções de produto; automático só usa orçamento de M1 e fronteira segura. Falha de resumo ou fingerprint mantém checkpoint válido anterior e não grava resumo vazio como válido.
- 413 pode permitir uma única recuperação segura de contexto apenas se não repetir tool effects; caso contrário, explicar sem apagar histórico.

## Fora de escopo

Memória global/projeto gerida (M5); busca automática em chats anteriores (M6); persistir processo vivo; replay de comandos; vector store.

## Dependências e superfícies candidatas

M1 e M2; portas públicas de `Conversa`/`Agir` e `session-persistence`; storage sidecar ou tabela ainda não decidido. Não copiar diretamente Cline/OpenCode/OpenClaude: adaptar o contrato depois de revisão de licença e fronteiras.

## Critérios de aceite propostos

1. Conversa acima do limiar envia checkpoint validado + faixa recente, sem reenviar o transcript integral e sem remover originais.
2. Duas ou mais compactações seguidas preservam cobertura contínua, sem duplicação/omissão; a cauda contém mensagens fonte originais.
3. Tool-call e result, approvals, erros e cancelamentos permanecem em fronteiras completas; não se corta uma execução pendente.
4. Checkpoint não pode ser aplicado a chat diferente, transcript alterado ou sequência que não corresponda ao fingerprint.
5. Timeout, erro, resumo vazio, storage cheio e corrupção não danificam transcript/checkpoint anterior; erro é visível.
6. Reabrir/reiniciar restaura transcript e checkpoint sem enviar novo pedido ao modelo.
7. Compaction mede latência/tokens antes/depois e registra fonte/versão; não declara que perdeu informação recuperável.

## Testes propostos

Fixtures de 2+ chats com canários; tool round multi-step; resumo falho; sidecar corrompido; prefixo alterado; cauda exata; restart; limite inferior/superior; payload grande; e regressão com mensagem multimodal/anexo. Benchmark de redução e tempo em dataset sintético não substitui homologação com fluxo real.

## Decisões pendentes

Threshold de compaction; manual versus automático no primeiro corte; modelo de sumarização/custo; formato de resumo; retenção; armazenamento sidecar versus SQLite; tratamento de conteúdo que não pode ser resumido; recuperação de detalhe antigo quando resumo não basta.