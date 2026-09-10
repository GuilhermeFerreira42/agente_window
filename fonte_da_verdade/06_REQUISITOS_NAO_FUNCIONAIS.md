# 06 — REQUISITOS NÃO FUNCIONAIS (RNF)

Este documento define as restrições técnicas, metas de performance e padrões de qualidade que regem a implementação do AGENTE WINDOW. Enquanto os requisitos funcionais descrevem *o que* o sistema faz, os RNFs descrevem *como* o sistema deve se comportar para garantir a fidelidade ao VS Code.

## 1. Performance e Latência

### 1.1. Fluidez de Interface (UI Responsiveness)
- **Taxa de Quadros**: A interface deve manter consistentemente **60 FPS** durante operações de scroll, redimensionamento de painéis e digitação.
- **Latência de Input**: O tempo entre a captura de um `KeyboardEvent` e a atualização visual do caractere no editor não deve exceder **16ms**.
- **Renderização de Linhas**: O sistema deve utilizar Virtualização de Viewport para garantir que o tempo de renderização de uma linha seja independente do tamanho total do arquivo.

### 1.2. Eficiência de Memória
- **Buffers de Texto**: O uso de **Piece Tables** deve garantir que a memória consumida por um arquivo cresça linearmente com a quantidade de *adições* de texto, e não com a frequência de edições.
- **Leak Prevention**: Todos os listeners de eventos do `IThemeService` e `IWorkbenchLayoutService` devem ser rigorosamente removidos via `dispose()` ao destruir componentes para evitar vazamentos de memória.

### 1.3. Latência de Comunicação (IPC)
- **WebSocket Bridge**: A latência de round-trip entre o Frontend e o Runtime para comandos simples não deve exceder **50ms**.
- **Streaming de IA**: A renderização de tokens de chat deve começar assim que o primeiro chunk for recebido do servidor, sem aguardar a conclusão da frase.

## 2. Estabilidade e Confiabilidade

### 2.1. Integridade de Dados (I/O)
- **Atomicidade de Escrita**: Nenhuma operação de salvamento deve sobrescrever o arquivo original diretamente. A estratégia de `Temp File` $\rightarrow$ `Rename` é obrigatória para evitar a corrupção de arquivos em caso de crash do processo.
- **Resiliência a Falhas**: O sistema deve ser capaz de recuperar sessões de chat e o estado do layout após um reload forçado da aplicação via persistência em `IndexedDB` ou `localStorage`.

### 2.2. Gestão de Concorrência
- **Race Condition Prevention**: O uso de `ResourceLocks` (Barriers) é obrigatório para qualquer operação de escrita em arquivos, garantindo que múltiplas requisições simultâneas sejam sequenciadas.
- **Isolamento de Processos**: Cada instância de terminal e cada servidor de linguagem (LSP) deve rodar em um processo filho independente para evitar que falhas em um módulo derrubem todo o Workbench.

## 3. Segurança e Robustez

### 3.1. Sanatização de Input
- **Comandos de Shell**: Todo input enviado ao `node-pty` deve ser tratado como stream de dados bruto, evitando a execução de comandos injetados via strings de comando formatadas.
- **Validação de URIs**: Todas as requisições ao `IFileService` devem validar o esquema da URI para evitar acessos não autorizados a recursos do sistema fora do workspace definido.

### 3.2. Robustez de Rede
- **Auto-reconexão**: O frontend deve implementar uma estratégia de *exponential backoff* para reconectar o WebSocket caso o Runtime seja reiniciado.

## 4. Manutenibilidade e Escalabilidade

### 4.1. Desacoplamento Arquitetural
- **Interdependência**: Subsistemas não podem ter dependências circulares. A comunicação entre módulos deve ocorrer exclusivamente via serviços de interface (ex: `ICommandService`, `IThemeService`).
- **Extensibilidade**: O sistema de Provedores de I/O deve permitir a adição de novos esquemas de URI (ex: `s3://`) sem a necessidade de alterar o núcleo do Editor.

### 4.2. Padronização de Código
- **Tipagem Estrita**: O uso de `any` é proibido em todas as interfaces de serviço e modelos de dados.
- **Documentação de Código**: Todos os métodos públicos de serviços core devem possuir JSDoc detalhando parâmetros, retornos e possíveis exceções.

## 5. Matriz de Prioridade de RNF

| RNF | Impacto | Prioridade | Critério de Validação |
| :--- | :--- | :--- | :--- |
| **60 FPS Scroll** | UX | Crítica | Profiler de Chrome (Performance Tab) |
| **Atomic Writes** | Dados | Crítica | Simulação de crash durante `fs.write` |
| **Resource Locks** | Estabilidade | Alta | Testes de estresse com escritas concorrentes |
| **Low IPC Latency** | UX | Média | Medição de round-trip via timestamps |
| **URI Abstraction** | Arquitetura | Média | Implementação de provedor dummy (InMemory) |
