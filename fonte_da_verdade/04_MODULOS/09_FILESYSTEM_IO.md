# 09 — MÓDULO: FILESYSTEM I/O

## 1. Visão Geral
O subsistema de I/O de Arquivos fornece uma camada de abstração universal para todas as operações de leitura, escrita e monitoramento de recursos. Em vez de interagir diretamente com o sistema de arquivos do SO, o Workbench utiliza o conceito de **Provedores de Sistema de Arquivos**, o que permite que a IDE opere de forma transparente sobre discos locais, sistemas de arquivos em memória, bancos de dados IndexedDB ou até mesmo servidores remotos via SSH/Cloud.

## 2. Componentes Estruturais
A arquitetura baseia-se no padrão *Strategy*, onde a operação é delegada ao provedor correto com base no esquema da URI.

- **Orquestração Central**:
    - `IFileService`: O ponto de entrada único para todas as requisições de arquivo. Ele resolve qual provedor deve tratar a requisição com base na `URI`.
    - `FileService`: Implementação que gerencia o registro de provedores e a fila de sequenciamento de operações (`ResourceQueue`).
- **Camada de Provedores**:
    - `IFileSystemProvider`: Interface que define as operações essenciais (`readFile`, `writeFile`, `mkdir`, `readdir`, `delete`, `rename`, `stat`).
    - `DiskFileSystemProvider`: Implementação nativa para discos locais via Node.js.
    - `InMemoryFileSystemProvider`: Provedor virtual para arquivos temporários.
    - `IndexedDBFileSystemProvider`: Provedor para persistência em ambiente de browser.
- **Infraestrutura de Segurança e Performance**:
    - `ResourceMap<Barrier>`: Sistema de travas (locks) que garante que operações críticas em um mesmo arquivo sejam executadas sequencialmente, prevenindo `Race Conditions`.
    - `FileSystemProviderCapabilities`: Conjunto de flags que informam ao serviço quais capacidades o provedor suporta (ex: `FileAtomicWrite`, `PathCaseSensitive`).
- **Monitoramento**:
    - `IFileSystemWatcher`: Interface para observação de mudanças.
    - `UniversalWatcherClient`: Implementação de alta performance para monitoramento recursivo de grandes árvores de diretórios, rodando frequentemente em processo separado.

## 3. Regras de Comportamento (Dado/Quando/Então)

### 3.1. Fluxo de Requisição e Resolução
- **Resolução de Provedor**: **Dado** uma requisição de leitura $\rightarrow$ **Quando** o `IFileService` recebe a `URI` $\rightarrow$ **Então** ele extrai o esquema (ex: `file://`), localiza o provedor registrado para esse esquema e delega a operação.
- **Validação de Capacidade**: **Dado** uma operação de escrita atômica $\rightarrow$ **Quando** o provedor é acionado $\rightarrow$ **Então** o sistema verifica se o provedor possui a capability `FileAtomicWrite` antes de tentar a operação.

### 3.2. Integridade e Concorrência
- **Escritas Atômicas**: **Dado** a solicitação de salvamento $\rightarrow$ **Quando** a atomicidade é requerida $\rightarrow$ **Então** o sistema escreve o conteúdo em um arquivo temporário e, somente após o sucesso total, renomeia o temporário sobre o arquivo original (`rename`).
- **Prevenção de Dirty Writes**: **Dado** uma operação de escrita $\rightarrow$ **Quando** o arquivo foi modificado externamente $\rightarrow$ **Então** o sistema valida o `etag` (baseado em mtime e tamanho) e impede a sobrescrita se houver conflito.
- **Sincronização de Acesso**: **Dado** duas requisições simultâneas para o mesmo recurso $\rightarrow$ **Quando** a primeira inicia $\rightarrow$ **Então** a segunda é colocada em espera via `Barrier` até que a primeira libere o recurso.

### 3.3. Observabilidade (Watching)
- **Detecção de Mudanças**: **Dado** que um arquivo é alterado por um processo externo (ex: terminal ou Git) $\rightarrow$ **Quando** o `UniversalWatcher` captura o evento $\rightarrow$ **Então** o `IFileService` notifica todos os componentes interessados para que atualizem seus buffers internos.

## 4. Mapa de Implementação Técnica

| Funcionalidade | Referência no `vscode-main` | Responsabilidade |
| :--- | :--- | :--- |
| **Orquestrador Core** | `src/vs/platform/files/common/fileService.ts` | Gestão de provedores, `ResourceQueue` (l. 1265) e Prevenção de Dirty Write (l. 455-538). |
| **Interface Base** | `src/vs/platform/files/common/files.ts` | Definição de `IFileService` e `IFileSystemProvider`. |
| **Provedor Local** | `src/vs/platform/files/node/diskFileSystemProvider.ts` | Implementação de I/O via Node.js e `ResourceMap<Barrier>` (l. 169). |
| **Lógica de Watching** | `src/vs/platform/files/node/watcher/watcherClient.ts` | Implementação do `UniversalWatcherClient`. |
| **Utilitários de I/O** | `src/vs/platform/files/common/io.ts` | Funções de stream e manipulação de buffers. |
| **Gestão de URIs** | `src/vs/base/common/uri.js` | Definição e parsing de identificadores universais. |

## 5. Integrações Cross-Subsystem
O subsistema de I/O é a fundação para quase todas as funcionalidades de dados:
- **Integração com Editor (08)**: Provê a base para o `TextBuffer` ler arquivos e realizar salvamentos atômicos.
- **Integração com Terminal (04)**: Valida o diretório de trabalho atual (CWD) e verifica a existência dos binários de shell.
- **Integração com Center Chat (07)**: Fornece o conteúdo dos arquivos anexados ao contexto da IA via `IFileService`.

## 6. Critérios de Aceite
- [ ] **Abstração Total**: Implementação de um novo provedor (ex: S3) deve funcionar instantaneamente ao definir um novo esquema de URI, sem alterar a lógica do Editor.
- [ ] **Resiliência a Crash**: Arquivos originais devem permanecer intactos se o sistema cair durante uma escrita atômica.
- [ ] **Zero Race Conditions**: Operações simultâneas no mesmo arquivo devem ser rigorosamente sequenciadas via `Barrier`.
- [ ] **Performance de Watcher**: Monitoramento de projetos com 10k+ arquivos sem estourar o limite de handles do SO.
- [ ] **Latência de Atualização**: Alterações externas devem ser refletidas no Editor em $< 100\text{ms}$.
