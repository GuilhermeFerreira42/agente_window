# Critérios de Aceite do Subsistema de Comandos e Menus (Camada 5)

Este documento define os critérios necessários para validar a implementação e a compreensão do subsistema de Comandos e Menus.

## 1. Validação de Comandos
- [ ] **Registro**: Deve ser possível registrar um novo comando via `CommandsRegistry` e recuperá-lo pelo ID.
- [ ] **Execução**: O `ICommandService.executeCommand` deve disparar corretamente o handler associado ao comando.
- [ ] **Alias**: O `registerCommandAlias` deve permitir que múltiplos IDs disparem a mesma lógica de comando.

## 2. Validação de Menus
- [ ] **População**: Um menu criado via `MenuService.createMenu` deve conter todos os itens registrados no `MenuRegistry` para aquele `MenuId`.
- [ ] **Filtragem de Contexto**: Itens com a cláusula `when` devem aparecer ou desaparecer dinamicamente quando o estado do `IContextKeyService` for alterado.
- [ ] **Hierarquia**: Submenus devem ser resolvidos recursivamente e exibir seus próprios itens de acordo com o contexto.
- [ ] **Ordenação**: A ordem dos itens deve respeitar a prioridade do grupo ('navigation' primeiro) e a propriedade `order`.

## 3. Validação de Persistência e UI
- [ ] **Ocultação**: A ação de ocultar um item de menu deve ser persistida via `IStorageService` e refletida no `PersistedMenuHideState`.
- [ ] **Reatividade**: Qualquer mudança estrutural no `MenuRegistry` ou mudança de contexto deve disparar um evento `onDidChange` no `IMenu`.

## 4. Veredito de Cobertura
A extração é considerada completa quando a relação entre a definição do comando $\to$ registro no menu $\to$ filtragem de contexto $\to$ execução do handler estiver totalmente mapeada e validada contra a base de código.
