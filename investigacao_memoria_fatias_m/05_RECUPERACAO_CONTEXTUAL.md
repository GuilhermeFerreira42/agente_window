# 05 — Recuperação contextual

**Status:** leitura de mecanismos concluída; avaliação empírica de relevância semântica ainda não feita.

## O que cada recuperação significa

- **Reabrir transcript:** recuperar a timeline persistida da sessão. Testado por `GET /api/sessions` após reiniciar o processo Vite isolado.
- **Reenviar conversa atual:** o App seleciona `chatId` atual e transmite mensagens textuais elegíveis. Teste UI isolado confirmou que cards, mensagens de erro/canceladas/em execução e canário de outro projeto não entram no request.
- **Encontrar uma mensagem antiga manualmente:** exige ferramenta/UI de busca de transcript; não foi localizada no Agente Window. Busca do Explorer é sobre arquivos do workspace, não conversa.
- **Recuperar histórico pelo agente:** exige um mecanismo de query/retrieval com escopo e proveniência; não foi localizado no Agente Window.
- **Carregar memória/instruções:** VS Code Memory Tool e OpenCode instructions têm armazenamento, escopo e política próprios; não são recuperação automática universal de transcripts.
- **Retomar execução:** requer estado operacional e nova autorização; nenhuma busca semântica substitui isso.

## Métodos observados nas referências

1. **Texto/metadados:** OpenCode lista sessões por título; VS Code/Chronicle mantém cwd, repositório, branch, agente, turnos, arquivos e refs.
2. **Busca lexical:** Chronicle local usa FTS5 `MATCH` com ranking BM25 sobre turnos, seções de checkpoint e artefatos; a ferramenta para o modelo pode executar SQL somente leitura. É caminho de código público, não prova de qualidade/latência nesta máquina.
3. **Consulta cloud:** Chronicle usa SQL DuckDB através de cliente público quando sincronização habilitada; a implementação remota não veio no snapshot, então método/ranking/retention não foi confirmado.
4. **Embeddings/RAG:** não localizei índice vetorial/geração de embeddings no recorte de sessão OpenCode v2.2.4 nem no Agente Window. Não assumir que serviços privados ou outros produtos não tenham.
5. **Resumo:** OpenCode gera checkpoint estruturado para continuidade e conserva mensagens recentes; resumo não é um índice nem fonte literal.

## Resultado do Agente Window

- Sem índice de transcript, o agente não pode pesquisar mensagens antigas fora do chat selecionado.
- Dentro do chat atual, a mensagem de texto do assistente pode resumir o que ocorreu, mas cards/tool results são metadados de UI; não são reenviados como tool-call/result ao modelo no próximo turno.
- `montarHistorico` atualmente envia todo o texto elegível do chat; não há corte por tokens, sumário ou recuperação seletiva observados. Isso pode crescer sem orçamento explícito e torna enganoso o indicador visual atual.
- Na cópia descartável, `GET /api/sessions` reconstruiu mensagens/cards após fechar e reabrir o servidor. Isso confirma recuperação de persistência, não busca por termos nem continuidade da execução.

## Avaliação recomendada (não aprovada)

Antes de escolher RAG/embeddings, construir corpus sintético/anotado de perguntas e mensagens-fonte. Comparar busca exata e SQLite FTS5/BM25 contra consultas reais representativas: precisão@k, recall@k, MRR, latência, custo, tamanho do índice e vazamento entre projetos. Resultados devem conter `sessionId/chatId/messageId`, timestamp e trecho literal; o modelo deve poder abrir a vizinhança original. Só avaliar busca semântica depois de identificar consultas que lexical/metadados não recuperam. Embeddings remotos exigem decisão explícita sobre consentimento, dados transmitidos, retenção e fallback.
