# 06C - Mapa de Código do Subsistema de I/O

Este documento mapeia os conceitos lógicos do sistema de I/O para a implementação real no código-fonte do VS Code.

## 1. Interfaces e Definições Core
- **`IFileService`**: `src/vs/platform/files/common/files.ts`
- **`IFileSystemProvider`**: `src/vs/platform/files/common/files.ts`
- **`FileSystemProviderCapabilities`**: `src/vs/platform/files/common/files.ts`
- **`IFileStat` / `IFileContent`**: `src/vs/platform/files/common/files.ts`

## 2. Implementações de Serviço
- **`FileService`**: `src/vs/platform/files/common/fileService.ts`
  - Responsável pela orquestração de provedores e buffering de IPC.

## 3. Implementações de Provedores
- **`DiskFileSystemProvider`**: `src/vs/platform/files/node/diskFileSystemProvider.ts`
  - Implementação principal para sistemas de arquivos locais (Node.js).
- **`AbstractDiskFileSystemProvider`**: `src/vs/platform/files/common/diskFileSystemProvider.ts`
  - Lógica base de watching e gerenciamento de requisições de observação.
- **`InMemoryFileSystemProvider`**: `src/vs/platform/files/common/inMemoryFilesystemProvider.ts`
- **`IndexedDBFileSystemProvider`**: `src/vs/platform/files/browser/indexedDBFileSystemProvider.ts`
- **`HtmlFileSystemProvider`**: `src/vs/platform/files/browser/htmlFileSystemProvider.ts`

## 4. Componentes de Baixo Nível (I/O e Watchers)
- **`io.ts`**: `src/vs/platform/files/common/io.ts`
  - Funções utilitárias para leitura/escrita de streams.
- **`NodeJSWatcherClient`**: `src/vs/platform/files/node/watcher/nodejs/nodejsClient.ts`
- **`UniversalWatcherClient`**: `src/vs/platform/files/node/watcher/watcherClient.ts`
- **`ParcelWatcher`**: `src/vs/platform/files/node/watcher/parcel/parcelWatcher.ts`

## 5. Utilitários de Caminho e URI
- **`URI`**: `src/vs/base/common/uri.js`
- **`path.js`**: `src/vs/base/common/path.js`
- **`resources.js`**: `src/vs/base/common/resources.js`
