# 05 — RUNTIME E INFRAESTRUTURA DE EXECUÇÃO

## 1. Modelo de Execução
O AGENTE WINDOW opera em um modelo híbrido de processamento, distribuindo a carga entre o ambiente do navegador (Frontend) e um servidor de runtime (Backend) para garantir a segurança do sistema de arquivos e a performance de processamento de IA.

### 1.1. Camada de Frontend (Browser/Client)
A camada de interface roda em um ambiente de browser moderno, focando exclusivamente na renderização e na interação com o usuário.
- **Papel**: Gestão do DOM, renderização do Editor (via Virtual Viewport), orquestração de UI e captura de inputs.
- **Execução**: JavaScript/TypeScript via Vite, utilizando React 18 para a interface.
- **Isolamento**: Não possui acesso direto ao sistema de arquivos do SO; todas as operações de I/O são delegadas ao Runtime via WebSocket.

### 1.2. Camada de Runtime (Backend/Server)
O runtime é um processo Node.js que atua como a ponte entre a interface e o sistema operacional.
- **Papel**: Execução de shells reais (via `node-pty`), operações de I/O atômicas, gestão de processos de linguagem (LSP) e orquestração de chamadas para LLMs.
- **Execução**: Node.js (TypeScript).
- **Privilégios**: Possui acesso total ao sistema de arquivos e capacidade de spawnar processos do sistema.

## 2. Ponte de Comunicação (WebSocket Bridge)
A comunicação entre o Frontend e o Runtime é realizada via WebSockets, garantindo baixa latência e bidirecionalidade.

- **Protocolo**: Mensagens JSON estruturadas.
- **Fluxo de Dados**:
    - **Client $\rightarrow$ Server**: Comandos de ação (ex: `saveFile`, `runCommand`, `sendChatMessage`).
    - **Server $\rightarrow$ Client**: Atualizações de estado, streams de texto do chat, output do terminal e notificações de eventos do sistema de arquivos.
- **Otimização**: O runtime utiliza buffering de IPC (chunks de 256KB) para evitar a fragmentação de mensagens em arquivos grandes.

## 3. Modelo de Processos e Concorrência
Para evitar que tarefas pesadas travem a interface do usuário, o sistema utiliza a seguinte estratégia de concorrência:

- **Main Thread (UI)**: Dedicada exclusivamente à renderização e interações rápidas.
- **Web Workers**: Utilizados no frontend para tarefas de processamento intenso que não exigem DOM, como a análise semântica de código (L2 Decoration).
- **Backend Processors**: O runtime Node.js utiliza processos filhos (`child_process`) para isolar cada instância de terminal e cada servidor de linguagem (LSP), evitando que o crash de um shell derrube a IDE completa.

## 4. Ciclo de Boot e Inicialização
A sequência de inicialização segue a seguinte ordem:
1. **Launch**: O processo de Runtime inicia e abre o socket de comunicação.
2. **Frontend Load**: O browser carrega a aplicação e estabelece a conexão WebSocket.
3. **Handshake**: O frontend solicita o estado persistido (sessões ativas, layout, tema).
4. **Service Activation**: O `IFileService` e o `IWorkbenchLayoutService` são instanciados e sincronizados com o backend.
5. **Ready**: A UI é liberada para interação do usuário.

## 5. Gestão de Recursos e Limites
Para garantir a estabilidade, o runtime aplica os seguintes limites:
- **Memória**: O buffer de scrollback do terminal e o cache de arquivos são limitados para evitar vazamentos de memória em sessões longas.
- **CPU**: O processamento de ASTs e linting é executado com prioridade baixa para não impactar a responsividade do sistema.
- **Concorrência**: O uso de `ResourceLocks` no I/O impede que múltiplas requisições simultâneas corrompam o mesmo arquivo.
