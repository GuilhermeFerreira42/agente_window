# 06D - Grafo de Arquitetura do Subsistema de I/O

Abaixo está a representação visual da arquitetura do sistema de I/O de arquivos do VS Code.

```mermaid
graph TD
    subgraph AppLayer [Camada de Aplicação]
        Editor[Editor / Extensions]
        Workspace[Workspace Manager]
    end

    subgraph ServiceLayer [Camada de Serviço]
        IFS[IFileService Interface]
        FS[FileService Implementation]
    end

    subgraph ProviderLayer [Camada de Provedores]
        IFSP[IFileSystemProvider Interface]
        DFSP[DiskFileSystemProvider]
        IMFS[InMemoryFileSystemProvider]
        IDBFS[IndexedDBFileSystemProvider]
    end

    subgraph OS_Layer [Camada de Sistema Operacional]
        NodeFS[Node.js fs / promises]
        BrowserFS[Browser Web APIs / IndexedDB]
        Watcher[OS File Watcher / Parcel]
    end

    %% Fluxos de dependência e chamadas
    Editor --> IFS
    Workspace --> IFS
    IFS --> FS
    FS --> IFSP

    IFSP <|-- DFSP
    IFSP <|-- IMFS
    IFSP <|-- IDBFS

    DFSP --> NodeFS
    DFSP --> Watcher
    IDBFS --> BrowserFS

    %% Fluxo de Notificação
    Watcher -.-> DFSP
    DFSP -.-> FS
    FS -.-> Editor
```

## Descrição do Grafo

1. **Camada de Aplicação**: Componentes como o Editor ou extensões solicitam operações de arquivo através da interface `IFileService`.
2. **Camada de Serviço**: O `FileService` atua como um *Dispatcher*. Ele não executa a I/O diretamente, mas decide qual provedor (`IFileSystemProvider`) deve lidar com a requisição com base no esquema da URI.
3. **Camada de Provedores**: Implementações concretas que traduzem as chamadas genéricas do VS Code para chamadas específicas de cada sistema (ex: `DiskFileSystemProvider` traduz para `fs.readFile`).
4. **Camada de OS**: A interface final com o sistema operacional ou browser. O sistema de *Watchers* opera em loop, enviando eventos de volta para a camada de serviço para notificar a UI.
