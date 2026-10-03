# 06A - Inventário do Subsistema de I/O de Arquivos

Este documento detalha a composição do sistema de Entrada e Saída (I/O) de arquivos do VS Code, identificando as interfaces, classes e provedores fundamentais.

## 1. Interfaces Core
- **`IFileService`**: O ponto de entrada principal para todas as operações de arquivo no VS Code. Orquestra a seleção do provedor correto com base no esquema da URI.
- **`IFileSystemProvider`**: Interface base que define as operações essenciais (stat, mkdir, readdir, delete, rename, readFile, writeFile, watch).
- **`IFileSystemWatcher`**: Interface para monitoramento de alterações em arquivos e pastas.

## 2. Provedores de Sistema de Arquivos (Implementações)
O sistema utiliza um padrão de *Strategy* baseado em esquemas de URI:
- **`DiskFileSystemProvider`** (Local): Implementação para discos locais usando o módulo `fs` do Node.js.
- **`InMemoryFileSystemProvider`**: Sistema de arquivos virtual armazenado em memória (útil para arquivos temporários ou virtuais).
- **`IndexedDBFileSystemProvider`**: Implementação para o navegador usando IndexedDB.
- **`HtmlFileSystemProvider`**: Implementação para ambientes web.

## 3. Componentes de Suporte e Infraestrutura
- **`FileService`**: Implementação de `IFileService`. Gerencia o registro de provedores e a delegação de chamadas.
- **`AbstractDiskFileSystemProvider`**: Classe base para provedores de disco, concentrando a lógica de *watching* (recursivo e não recursivo).
- **`FileSystemProviderCapabilities`**: Enumeração de capacidades (ex: `FileReadWrite`, `FileAtomicWrite`, `PathCaseSensitive`) que permite ao serviço saber o que cada provedor suporta.
- **`ResourceQueue`**: Fila de recursos usada para garantir que operações em um mesmo arquivo sejam executadas sequencialmente, evitando condições de corrida.
- **`Barrier`**: Mecanismo de trava (lock) utilizado pelo `DiskFileSystemProvider` para sincronizar acessos a recursos específicos.

## 4. Tipos de Dados Fundamentais
- **`URI`**: Identificador universal de recursos (incluindo esquema, host e caminho).
- **`IFileStat`**: Metadados do arquivo (tipo, tamanho, datas de modificação/criação, permissões).
- **`VSBuffer`**: Representação de conteúdo de arquivo otimizada para leitura/escrita eficiente.
- **`FileOperation`**: Enumera as operações básicas: `CREATE`, `DELETE`, `MOVE`, `COPY`, `WRITE`.
