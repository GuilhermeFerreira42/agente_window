# CAMADA E — CRITÉRIO DE ACEITE (Chat/Agent Session)

## 1. Funcionalidades Core
- **Fluxo de Conversa**:
  - **Passo**: Digitar pergunta $\rightarrow$ Enviar.
  - **Resultado**: Mensagem aparece no chat $\rightarrow$ Agente inicia "Thinking" $\rightarrow$ Texto começa a fluir (streaming).
  - **Validação**: Verificar a sequência de eventos: `turnStarted` $\rightarrow$ `thinking` $\rightarrow$ `markdownContent`.

- **Interação com Ferramentas**:
  - **Passo**: Agente decide ler um arquivo $\rightarrow$ Emite `ToolCall`.
  - **Resultado**: UI mostra widget "Reading file..." $\rightarrow$ Tool retorna conteúdo $\rightarrow$ Agente continua a resposta.
  - **Validação**: Verificar a transição de estados: `ToolCallPending` $\rightarrow$ `ToolCallRunning` $\rightarrow$ `ToolCallCompleted`.

- **Aprovação de Ação**:
  - **Passo**: Agente decide deletar arquivo $\rightarrow$ Emite `ToolCall` com `PendingConfirmation`.
  - **Resultado**: Resposta do agente para, UI mostra "Aprovar/Rejeitar".
  - **Validação**: Verificar que a ferramenta NÃO é executada até que o usuário clique em "Aprovar".

## 2. Gestão de Sessões
- **Alternância de Contexto**:
  - **Passo**: Abrir Sessão A $\rightarrow$ Abrir Sessão B.
  - **Resultado**: O chat limpa a tela e carrega instantaneamente o histórico da Sessão B.
  - **Validação**: Verificar que `AgentHostSessionHandler` trocou a subscrição de estado.

- **Persistência de Histórico**:
  - **Passo**: Conversar com agente $\rightarrow$ Recarregar página.
  - **Resultado**: A conversa anterior é restaurada exatamente onde parou.
  - **Validação**: Verificar a chamada ao `AgentHostSnapshotController` e a renderização dos turnos históricos.

## 3. Qualidade e Performance
- **Latência de Streaming**:
  - **Passo**: Iniciar resposta longa.
  - **Resultado**: O primeiro caractere aparece em $< 200$ms após o início do turno.
  - **Validação**: Medir o tempo entre `turnStarted` e o primeiro `markdownContent`.

- **Estabilidade de Conexão**:
  - **Passo**: Simular queda de WebSocket $\rightarrow$ Reconectar.
  - **Resultado**: O sistema recupera a sessão e continua o streaming sem duplicar mensagens.
  - **Validação**: Verificar a lógica de ` la l` no `AgentHostSessionHandler`.
