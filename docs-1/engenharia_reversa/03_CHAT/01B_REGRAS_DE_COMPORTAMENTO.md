# CAMADA B — REGRAS DE COMPORTAMENTO (Chat/Agent Session)

## 1. Ciclo de Vida da Conversa
- **Início de Turno**
  - **Dado** que o usuário envia uma mensagem ou solicita a continuação
  - **Quando** o request chega ao `AgentHost`
  - **Então** o sistema cria um novo `Turn`, marca como `startedAt` e inicia o streaming de resposta.

- **Streaming de Resposta**
  - **Dado** que o agente está gerando conteúdo
  - **Quando** pedaços de markdown ou raciocínio chegam via WebSocket
  - **Então** a UI anexa esses pedaços ao último bloco de mensagem em tempo real.

- **Interrupção de Turno**
  - **Dado** que um agente está processando ou gerando texto
  - **Quando** o usuário clica em "Stop"
  - **Então** o cliente envia um `turnCancelled` action e o `AgentHost` encerra a execução do modelo.

## 2. Orquestração de Ferramentas (Tooling)
- **Gatilho de Ferramenta**
  - **Dado** que o modelo decide usar uma ferramenta
  - **Quando** o `ToolCall` é emitido no stream
  - **Então** a UI renderiza um widget de ferramenta e verifica a política de confirmação.

- **Portão de Confirmação (Confirmation Gate)**
  - **Dado** que uma ferramenta requer aprovação (ex: `delete_file`)
  - **Quando** o `ToolCall` chega com status `PendingConfirmation`
  - **Então** o agente pausa a execução e a UI exibe botões de "Aprovar" ou "Rejeitar".

- **Execução e Feedback**
  - **Dado** que a ferramenta foi aprovada
  - **Quando** o resultado da ferramenta retorna do `PtyHost` ou `FileHost`
  - **Então** o resultado é anexado ao turno e enviado de volta ao modelo para gerar a resposta final.

## 3. Gestão de Sessões e Contexto
- **Isolamento de Sessão**
  - **Dado** que o usuário alterna entre a Sessão A e a Sessão B
  - **Quando** a mudança ocorre
  - **Então** o `AgentHostSessionHandler` desinscreve-se da sessão A e subscreve-se na sessão B, restaurando o buffer de chat e o estado dos artefatos.

- **Recuperação de Snapshot**
  - **Dado** que uma sessão é aberta após um reinício
  - **Quando** o `provideChatSessionContent` é chamado
  - **Então** o sistema recupera o histórico de turnos do banco de dados e reconstrói a visualização da conversa.
