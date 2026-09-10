# 07 — MÓDULO: CENTER CHAT (COPILOT EXPERIENCE)

## 1. Visão Geral
O Center Chat é o núcleo de inteligência do AGENTE WINDOW. Ele não funciona como um chat simples, mas como um orquestrador de contexto de desenvolvimento. Sua função é mediar a interação entre o desenvolvedor e agentes de IA, permitindo a injeção de contexto estruturado do editor (arquivos, símbolos, seleções) e a renderização de respostas ricas que podem disparar ações diretamente no código.

## 2. Componentes Estruturais
A arquitetura do chat é rigorosamente dividida entre a infraestrutura de hospedagem, a lógica de estado (ViewModel) e a interface de renderização.

- **Orquestração de Layout**:
    - `ChatViewPane`: Container de nível superior que gerencia a relação entre a sessão ativa e os widgets de chat.
    - `ChatViewWelcomeController`: Gerencia a interface de boas-vindas e sugestões iniciais quando não há sessão ativa.
- **Núcleo de Lógica (Core)**:
    - `ChatWidget`: O "cérebro" do módulo. Coordena a submissão de mensagens, a validação de entrada, o estado de carregamento e a comunicação com o serviço de IA.
    - `IChatService`: Interface de serviço que abstrai a comunicação com o modelo de linguagem (LLM), lidando com o envio de requisições e o recebimento de streams.
- **Interface de Interação**:
    - `ChatListWidget`: Renderiza o histórico de conversas. Utiliza a infraestrutura de `WorkbenchObjectTree` para permitir que itens da lista sejam objetos complexos (como blocos de código clicáveis).
    - `ChatInputPart`: Controla a área de composição de mensagens, processando comandos de barra (slash commands), anexos de contexto e a submissão final.

## 3. Regras de Comportamento (Dado/Quando/Então)

### 3.1. Fluxo de Mensageria e Streaming
- **Submissão de Requisição**: **Dado** que o usuário digita uma query no `ChatInputPart` $\rightarrow$ **Quando** a mensagem é enviada $\rightarrow$ **Então** o `ChatWidget` coleta o contexto implícito da IDE, dispara a requisição via `IChatService` e limpa o campo de entrada.
- **Renderização de Resposta**: **Dado** que a IA inicia a resposta $\rightarrow$ **Quando** novos tokens chegam via stream $\rightarrow$ **Então** o `ChatListWidget` anexa o conteúdo em tempo real e executa o `scrollToEnd()` para manter a visibilidade do texto novo.

### 3.2. Gestão de Sessões e Estado
- **Alternância de Sessão**: **Dado** a seleção de uma conversa anterior $\rightarrow$ **Quando** a sessão é carregada via URI (`sessionResource`) $\rightarrow$ **Então** o `ChatWidget` vincula um novo `ChatViewModel` e o `ChatListWidget` reconstrói o histórico de mensagens.
- **Estado de Trava (Locked State)**: **Dado** que o Editor sinaliza uma mutação de código via `EditorLockService` $\rightarrow$ **Quando** a IA está aplicando alterações $\rightarrow$ **Então** a interface de chat entra em modo de leitura, desabilitando a entrada de texto para evitar conflitos de concorrência.

### 3.3. Contextualização de Prompt
- **Injeção de Variáveis**: **Dado** a menção a um arquivo ou símbolo no input $\rightarrow$ **Quando** a mensagem é processada $\rightarrow$ **Então** o sistema resolve a referência para o conteúdo real do arquivo antes de enviar o prompt ao modelo.

## 4. Mapa de Implementação Técnica

| Funcionalidade | Referência no `vscode-main` | Responsabilidade |
| :--- | :--- | :--- |
| **Container Principal** | `src/vs/workbench/contrib/chat/browser/widgetHosts/viewPane/chatViewPane.ts` | Orquestração de layout e sessões. |
| **Lógica de Envio** | `src/vs/workbench/contrib/chat/browser/widget/chatWidget.ts` | `_acceptInput()` e coordenação de `IChatService`. |
| **Renderização de Lista** | `src/vs/workbench/contrib/chat/browser/widget/chatListWidget.ts` | Integração com `WorkbenchObjectTree`. |
| **Composição de Input** | `src/vs/workbench/contrib/chat/browser/widget/input/chatInputPart.ts` | `getAttachedAndImplicitContext()` e slash commands. |
| **Gestão de Boas-Vindas** | `src/vs/workbench/contrib/chat/browser/viewsWelcome/chatViewWelcomeController.ts` | Controle de telas iniciais. |
| **Sincronização de Trava** | `src/vs/workbench/contrib/chat/browser/widget/chatWidget.ts` | `lockToCodingAgent()` e `unlockFromCodingAgent()`. |

## 5. Integrações Cross-Subsystem
O Center Chat é o ponto de convergência de múltiplos subsistemas:
- **Integração com Editor (05)**: Sincroniza a aplicação de código via `EditorLockService` e permite a navegação do chat para linhas específicas do arquivo.
- **Integração com Filesystem (06)**: Resolve referências de arquivos anexados ao chat via `IFileService`.
- **Integração com Tema (08)**: Implementa o padrão `Themable` para que as bolhas de chat e blocos de código reajam instantaneamente a trocas de tema.

## 6. Critérios de Aceite
- [ ] **Latência de Streaming**: A renderização de tokens deve ser fluida, sem saltos visuais ou travamentos na UI.
- [ ] **Fidelidade de Contexto**: Referências a arquivos e símbolos devem ser resolvidas corretamente antes do envio ao modelo.
- [ ] **Sincronização de Trava**: O campo de input deve ser desabilitado rigorosamente sempre que o `EditorLockService` estiver ativo.
- [ ] **Persistência de Sessão**: Conversas devem ser recuperadas integralmente via URI após o reload da aplicação.
- [ ] **Renderização de Widgets**: Blocos de código e árvores de arquivos dentro do chat devem ser interativos e clicáveis.
