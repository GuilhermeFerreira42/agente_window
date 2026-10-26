# M1 — Medição e orçamento de contexto (proposta; posição hipotética 13)

**Status:** rascunho não aprovado. Depende de decisão do dono e SPEC oficial.  
**Objetivo:** substituir o percentual fictício atual por estado verificável do request real, integrado ao runtime das Casas Conversa e Agir.

## Escopo

- Remover a dependência de `contextPercent` calculado por comprimento do draft/quantidade de anexos; não manter esse valor sob o rótulo de uso real.
- Identificar provedor/modelo efetivos no servidor (`obterAlvoDeConversa`), limite da janela e limite/reserva de saída com origem (provider metadata, dono configurou, descritor default ou desconhecido).
- Normalizar por protocolo o uso retornado no streaming/resposta: OpenAI Chat usage, Anthropic usage, Gemini `usageMetadata`, Ollama `prompt_eval_count`/`eval_count`, conforme suporte real do endpoint/modelo. O suporte pode variar; ausência é estado válido.
- Estimar o payload exato antes de enviar somente quando existir tokenizer compatível com o modelo/protocolo; mostrar claramente **estimado**. Sem tokenizador/limite, mostrar indisponível/última medição, não número fabricado.
- Emitir contexto por `requestId`/iteração para a UI. O prompt inclui mensagens atuais, tool schemas, tool calls/results e conteúdo realmente enviado. Contagem cumulativa de várias iterações é custo/consumo, não ocupação de uma janela.
- Separar `promptTokens`, `completionTokens`, reserva de saída, limite total e orçamento de input. Aplicação de `maxSaida` em protocolos além de Anthropic só após verificação dos corpos de API.
- Alertar proximidade com thresholds configuráveis/decididos; exibir o que é última medição e o que é previsão da próxima solicitação.

## Fora de escopo

Compactar ou apagar histórico automaticamente (M3); corrigir completamente o seletor de modelo DEBT-14; busca/memória; assumir limite por nome de provedor; criar um tokenizer próprio; usar mock em homologação como prova de precisão.

## Dependências e superfícies candidatas

`src/components/ChatInput.tsx`, `src/styles/app.css`; `conversa/contract.ts`, `conversa/server/{requisicao,conversar,rotas}.ts`; `agir/contract.ts`, `agir/server/{vizinho,agir,rotas}.ts`; `server/chatAlvo.ts`; `provedores/contract.ts`, `providersRepo.ts`, `ProvidersView.tsx`; contracts/ports novos somente após aprovação arquitetural.

## Critérios de aceite propostos

1. Antes do primeiro request e sem estimativa aplicável, interface mostra “não medido/indisponível”; nunca 18% ou percentual baseado em chars/anexos.
2. Para um provider real que devolve uso, o `promptTokens` exibido corresponde ao usage do request corrente e está identificado como reportado; completions não são somadas ao numerador de input.
3. Para provider sem usage, a UI mostra “estimativa local” com nome do modelo/limite e timestamp, ou “indisponível”; nenhuma estimativa recebe rótulo de medida.
4. Trocar provedor/modelo efetivo invalida ou marca como antigo o snapshot anterior. O chip mock do composador não altera silenciosamente o denominador.
5. Um Agir com schema e resultado de ferramenta mostra o consumo relativo ao payload/iteração que os incluiu. O promptTokens de iterações sucessivas não é somado como se fosse uma única janela.
6. Limite de contexto desconhecido não é substituído por um default não identificado; dados do provedor não vazam API key.
7. A UI tem alternativa textual acessível e distingue reserva de saída de ocupação; 413 continua explicável sem apagar transcript.

## Testes propostos

Unitários por protocolo para streams com/sem uso, campos ausentes e requests multi-iteração; teste do DTO de alvo para confirmar modelo efetivo; teste que prova que tool schemas/resultados contribuem ao payload; teste do medidor para `unknown/stale/estimated/measured`; E2E com provider autorizado ou endpoint controlado em homologação para comprovar que valor reportado chega à UI. Testes com fixtures são regressão, não prova manual de uso real.

## Decisões pendentes

Fonte autoritativa de `contexto`; limites por modelo versus provider; tolerância de divergência de tokenizer; limiares de alerta; política para providers custom; se a reserva de saída conta no denominador visual; como informar instruções ocultas do provider. Sem estas decisões, não exibir precisão superior à evidência disponível.