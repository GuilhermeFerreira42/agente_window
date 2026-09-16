# 06B - Comportamento do Subsistema de I/O de Arquivos

Este documento descreve como o subsistema de I/O de arquivos opera em tempo de execução e como as requisições fluem através do sistema.

## 1. Fluxo de Requisição Típico
Quando um componente do VS Code (como o Editor) deseja ler um arquivo:
1. **Chamada**: O componente chama `IFileService.readFile(uri)`.
2. **Resolução de Provedor**: O `FileService` extrai o esquema da `URI` (ex: `file://`, `vscode-remote://`).
3. **Ativação**: O serviço verifica se existe um provedor registrado para esse esquema. Se for um provedor de extensão, ele dispara a ativação da extensão.
4. **Validação de Capacidade**: O `FileService` verifica se o provedor suporta a operação solicitada (ex: `hasReadWriteCapability`).
5. **Execução**: O provedor executa a operação de baixo nível (ex: `promises.readFile` no `DiskFileSystemProvider`).
6. **Retorno**: O conteúdo é retornado como um `IFileContent` contendo um `VSBuffer`.

## 2. Estratégias de Escrita e Atomicidade
O sistema prioriza a integridade dos dados através de:
- **Escritas Atômicas**: Quando habilitado, o sistema escreve o conteúdo em um arquivo temporário com um postfix específico e, somente após o sucesso, renomeia o temporário sobre o arquivo original (`rename`).
- **Prevenção de Dirty Writes**: O sistema utiliza `etags` (baseadas em mtime e tamanho) para verificar se o arquivo foi modificado externamente antes de aplicar uma escrita.

## 3. Gerenciamento de Concorrência
Para evitar corrupção de dados em ambientes altamente assíncronos:
- **Resource Locks**: O `DiskFileSystemProvider` mantém um mapa de travas (`ResourceMap<Barrier>`). Operações de escrita bloqueiam o recurso, forçando outras operações no mesmo arquivo a aguardarem.
- **Sequenciamento**: O `ResourceQueue` no `FileService` garante que operações críticas para o mesmo recurso não ocorram em paralelo.

## 4. Sistema de Monitoramento (Watching)
O VS Code suporta dois modos de observação:
- **Não Recursivo**: Monitora arquivos específicos.
- **Universal/Recursivo**: Utiliza um cliente de observação especializado (ex: `UniversalWatcherClient`) que pode rodar em um processo separado para evitar sobrecarga na thread principal, lidando com grandes árvores de diretórios.
