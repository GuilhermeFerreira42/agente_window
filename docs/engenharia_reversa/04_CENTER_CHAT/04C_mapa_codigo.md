# 04C - Mapa de Código do Subsistema Center Chat

Este documento mapeia a arquitetura de chamadas e a relação entre as classes principais do subsistema de chat central, detalhando os fluxos de execução para as operações críticas.

## 1. Hierarquia de Componentes (Call Graph de Estrutura)

O subsistema segue um padrão de composição onde o container externo gerencia o ciclo de vida e a injeção de modelos nos widgets internos.

`ChatViewPane` (Container)
  └── `ChatWidget` (Core Logic)
        ├── `ChatListWidget` (Output/History)
        └── `ChatInputPart` (Input/Composer)

## 2. Fluxos de Execução Principais

### A. Fluxo de Submissão de Mensagem (Sending)
Este é o caminho crítico desde a interação do usuário até a chamada do serviço de IA.

1. **Trigger**: `ChatWidget.acceptInput(query, options)`
2. **Processamento Interno**: `ChatWidget._acceptInput(...)`
   - Valida se há requisições pendentes (`confirmPendingRequestsBeforeSend`).
   - Processa arquivos de prompt (`_applyPromptFileIfSet`).
   - Coleta contexto implícito via `ChatInputPart.getAttachedAndImplicitContext()`.
3. **Chamada de Serviço**: `IChatService.sendRequest(sessionResource, input, options)`
4. **Sincronização de UI**:
   - `ChatWidget` chama `ChatInputPart.acceptInput()` para limpar/processar o editor.
   - `acceptAndAwaitSentRequest(result, ...)` aguarda a aceitação da requisição no backend.
   - `ChatListWidget.scrollToEnd()` é disparado para acompanhar a resposta.

### B. Fluxo de Carregamento de Sessão (Session Management)
Como o VS Code alterna entre diferentes conversas (sessões).

1. **Trigger**: `ChatViewPane.applyModel(model)` ou `loadSession(resource)`.
2. **Orquestração**: `ChatViewPane.showModel(model)` $\rightarrow$ `ChatWidget.setModel(model)`.
3. **Vinculação de Estado**:
   - `ChatWidget` cria uma instância de `ChatViewModel` para o modelo.
   - `ChatWidget` chama `ChatInputPart.setInputModel(model.inputModel, ...)` para sincronizar o rascunho da mensagem.
   - `ChatWidget` chama `ChatListWidget.setViewModel(viewModel)` para carregar o histórico.
4. **Atualização de UI**: `ChatListWidget` renderiza as mensagens existentes via `WorkbenchObjectTree`.

### C. Fluxo de Renderização de Respostas (Receiving/Streaming)
O mecanismo de atualização da UI enquanto a IA gera texto.

1. **Estado**: O `ChatViewModel` reflete mudanças no `IChatModel` (como a adição de tokens de resposta).
2. **Notificação**: `ChatWidget` escuta `viewModel.onDidChange`.
3. **Atualização de Lista**:
   - Se o evento for `addRequest` ou atualização de conteúdo $\rightarrow$ `ChatListWidget.refresh()`.
   - Se a resposta estiver em progresso $\rightarrow$ `ChatListWidget.scrollToEnd()`.

## 3. Métodos Chave e Responsabilidades

| Classe | Método | Responsabilidade |
| :--- | :--- | :--- |
| `ChatViewPane` | `loadSession()` | Resolve o URI da sessão via `IChatService` e aplica ao widget. |
| `ChatWidget` | `setModel()` | Vincula o modelo de chat ao widget e reseta o estado da UI. |
| `ChatWidget` | `_acceptInput()` | Coordena a validação, coleta de contexto e envio da requisição. |
| `ChatListWidget` | `setViewModel()` | Atualiza a árvore de objetos para renderizar o histórico de mensagens. |
| `ChatInputPart` | `setInputModel()` | Sincroniza o editor de texto com o estado persistente da sessão. |
| `ChatInputPart` | `getAttachedContext()`| Retorna a lista de variáveis e referências anexadas à mensagem. |

## 4. Mapa de Dependências de Estado

- **`IChatModel`** $\rightarrow$ Fonte da verdade (persistente).
- **`ChatViewModel`** $\rightarrow$ Adaptador de estado para a UI (reativo).
- **`ChatInputModel`** $\rightarrow$ Gerencia o rascunho (draft) e a sincronização do editor.
- **`sessionResource` (URI)** $\rightarrow$ Identificador único usado para buscar modelos no `IChatService`.
