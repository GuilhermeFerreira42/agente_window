# Inventário do Subsistema de Comandos e Menus (Camada 1)

Este documento detalha os componentes identificados no sistema de Comandos e Menus do VS Code.

## 1. Sistema de Comandos (Command System)

O sistema de comandos é responsável por registrar, recuperar e executar ações identificadas por IDs únicos.

### Componentes Core
- **`CommandsRegistry`** (`vscode-main/src/vs/platform/commands/common/commands.ts`)
    - **Propósito**: Registro global de comandos.
    - **Armazenamento**: `Map<string, LinkedList<ICommand>>`.
    - **Métodos Principais**:
        - `registerCommand(idOrCommand, handler)`: Registra um novo comando.
        - `registerCommandAlias(oldId, newId)`: Cria um apelido para um comando existente.
        - `getCommand(id)`: Recupera a definição de um comando.
        - `getCommands()`: Retorna todos os comandos registrados.
- **`ICommandService`** (`vscode-main/src/vs/platform/commands/common/commands.ts`)
    - **Propósito**: Interface para execução de comandos no sistema.
    - **Método Principal**: `executeCommand(commandId, ...args)`.
- **`ICommand`** (`vscode-main/src/vs/platform/commands/common/commands.ts`)
    - **Propósito**: Estrutura que define um comando (ID, Handler e Metadados).

## 2. Sistema de Menus (Menu System)

O sistema de menus organiza comandos em estruturas hierárquicas, filtradas por contexto.

### Componentes Core
- **`MenuRegistry`** (`vscode-main/src/vs/platform/actions/common/actions.ts`)
    - **Propósito**: Registro global de itens de menu e submenus.
- **`MenuService`** (`vscode-main/src/vs/platform/actions/common/menuService.ts`)
    - **Propósito**: Serviço que cria instâncias de menus e gerencia a visibilidade dos itens.
    - **Métodos Principais**:
        - `createMenu(id, contextKeyService, options)`: Cria um objeto `IMenu`.
        - `getMenuActions(...)`: Retorna a lista de ações ativas para um menu específico.
- **`MenuImpl` / `MenuInfo`** (`vscode-main/src/vs/platform/actions/common/menuService.ts`)
    - **Propósito**: Implementação da lógica de filtragem e ordenação de itens de menu com base em chaves de contexto (`IContextKeyService`).
- **`PersistedMenuHideState`** (`vscode-main/src/vs/platform/actions/common/menuService.ts`)
    - **Propósito**: Persistência do estado de "ocultar" itens de menu no perfil do usuário (`IStorageService`).

## 3. Fluxo de Integração
- Os **Comandos** são a unidade básica de execução.
- Os **Menus** servem como a interface de descoberta, vinculando `MenuId`s a `CommandId`s.
- O **ContextKeyService** atua como o motor de visibilidade, determinando quais itens de menu aparecem com base no estado atual do editor.
