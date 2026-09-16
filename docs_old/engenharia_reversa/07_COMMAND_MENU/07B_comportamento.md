# Comportamento do Subsistema de Comandos e Menus (Camada 2)

Este documento descreve a dinâmica de funcionamento do sistema, desde o registro até a execução.

## 1. Ciclo de Vida dos Comandos

### Registro
Existem duas formas principais de registrar comandos:
- **Registro Direto**: Via `CommandsRegistry.registerCommand(id, handler)`. O comando é armazenado em uma `LinkedList` associada ao ID.
- **Registro via `Action2`**: A classe `Action2` simplifica a declaração, permitindo definir em um único lugar o comando, seus itens de menu e seus atalhos de teclado (`keybindings`). O método `registerAction2` orquestra as chamadas para `CommandsRegistry`, `MenuRegistry` e `KeybindingsRegistry`.

### Execução
O fluxo de execução segue este caminho:
1. **Gatilho**: Um usuário clica em um item de menu, usa um atalho ou abre a Paleta de Comandos.
2. **Chamada**: O sistema invoca `ICommandService.executeCommand(commandId, ...args)`.
3. **Resolução**: O `CommandService` consulta o `CommandsRegistry` para encontrar o handler associado ao `commandId`.
4. **Execução**: O handler é executado com os argumentos fornecidos.

## 2. Ciclo de Vida dos Menus

### População e Filtragem
Os menus não são estáticos; eles são calculados dinamicamente:
1. **Criação**: `MenuService.createMenu(menuId)` retorna uma instância de `MenuImpl`.
2. **Coleta**: `MenuImpl` solicita ao `MenuRegistry` todos os itens (`IMenuItem`) associados ao `menuId`.
3. **Filtragem de Contexto**: Cada item possui uma cláusula `when` (expressão de chave de contexto). O `IContextKeyService` valida se as condições atuais do editor satisfazem essa expressão.
4. **Estado de Visibilidade**: O `PersistedMenuHideState` verifica se o usuário ocultou manualmente aquele item.
5. **Ordenação**: Os itens são organizados por:
    - Grupo (ex: 'navigation' primeiro).
    - Ordem (`order` property).
    - Ordem Lexical do Título.
6. **Resultado**: O menu retorna grupos de `MenuItemAction` (executam comandos) ou `SubmenuItemAction` (abrem novos menus).

### Reatividade
Menus são reativos. `MenuImpl` escuta eventos de:
- `MenuRegistry.onDidChangeMenu`: Quando novos itens são adicionados/removidos.
- `IContextKeyService.onDidChangeContext`: Quando chaves de contexto mudam, disparando a reavaliação da visibilidade dos itens.
- `PersistedMenuHideState.onDidChange`: Quando o estado de "ocultar" é alterado.
