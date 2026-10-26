# M6 — Recuperação histórica pelo agente (proposta posterior; posição hipotética 18)

**Status:** rascunho não aprovado e **fora do corte mínimo inicial**.  
**Objetivo:** permitir que o runtime localize fonte histórica somente quando necessário, sem confundir busca manual, memória e prompt atual.

## Escopo candidato

- Introduzir tool/porta separada para o runtime solicitar busca; não reutilizar automaticamente o botão de busca manual.
- Resposta inclui escopo, hits com `chatId`, `messageId`, sequence, papel, data, trecho literal e score/método; segunda operação lê conteúdo original e vizinhança limitada.
- Primeiro passo poderia restringir tool ao chat atual. **Busca entre outros chats** deve ser fase posterior, explicitamente habilitada e aprovada, inicialmente restrita ao mesmo projeto, com permissão/UX clara; cross-project ou preferência global fica fora até decisão própria.
- Limitar resultados/tokens, deduplicar e adicionar às fontes/contexto com etiqueta de conteúdo histórico não confiável. O agente relata “não encontrei” se não houver hit; sem invenção de citação.
- Registrar por que cada trecho foi recuperado, para auditoria e medidor M1. Busca lexical/Fts é baseline candidata; semântica não é obrigação e não pode substituir a origem literal.

## Fora do corte inicial

Auto-search invisível entre todos os chats/projetos; busca vetorial; gravação automática de memória; execução de instruções encontradas; cross-chat sem consentimento.

## Dependências e superfícies candidatas

M2/M4 (originais e refs), M5 (memória, quando relevante), M1 (limite de tokens), ACL de projeto/chat e tool contracts da Casa Agir. A Casa de memória não importa internals de Conversa/Agir; composição root injeta a porta.

## Critérios de aceite propostos

1. O agente só pode recuperar fontes dentro do escopo aprovado e autorizado; canários de chat/projeto fora do escopo jamais entram no prompt.
2. Cada trecho injetado mantém referência à mensagem original; texto do resumo ou score não aparece como citação literal.
3. Uso de tokens dos trechos recuperados é contabilizado no `ContextSnapshot`; número/bytes/resultados são limitados.
4. Texto histórico é tratado como dado e não como instrução atual; nenhuma ferramenta executa com base somente no trecho encontrado.
5. Busca indisponível/vazia retorna falha/ausência honesta; o agente não inventa memória.
6. O usuário consegue entender quais chats foram consultados e desligar/limitar o recurso; cross-chat nunca é silencioso por default.

## Testes propostos

Tool-call em pergunta que cita canário antigo; exclusão/ACL; tentativa de prompt injection em transcript; hit de outro chat/projeto; ausência de índice; token cap; resultado truncado com leitura original; recarregamento de sessão e permissão; auditoria da fonte no prompt/request.

## Decisões pendentes

Se M6 será implementada; same-chat versus cross-chat; consulta explícita do agente versus pré-busca automática; filtros e alcance; UI/consentimento; política de privacidade; lexical versus semântica; fonte de verdade do escopo de projeto.