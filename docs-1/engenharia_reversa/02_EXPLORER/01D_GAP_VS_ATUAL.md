# CAMADA D — GAP VS ESTADO ATUAL (Explorer)

| Comportamento | VS Code (Referência) | AGENTE WINDOW (Atual) | Status | Ação Necessária |
|---|---|---|---|---|
| **Navegação Hierárquica** | Árvore assíncrona com virtualização de DOM para milhares de arquivos. | Lista simples ou ausente. | `Ausente` | Implementar árvore baseada em `AbstractTree` (ou similar) com lazy loading. |
| **Sincronização Live** | Atualização automática via File System Watcher. | Atualização manual ou inexistente. | `Ausente` | Implementar `WorkspaceWatcher` para disparar refresh na UI. |
| **Drag and Drop** | Movimentação de arquivos entre pastas via interface. | Sem suporte a arraste. | `Ausente` | Implementar handlers de DnD integrados ao `IFileService`. |
| **Filtragem Dinâmica** | Busca instantânea que expande a árvore para mostrar resultados. | Busca linear simples ou inexistente. | `Ausente` | Implementar `FilesFilter` e a lógica de `markItemAndParentsAsFiltered`. |
| **Compact Folders** | Agrupamento inteligente de pastas vazias. | Hierarquia rígida 1:1. | `Ausente` | Implementar lógica de compactação no `FilesRenderer`. |
| **Contextual Actions** | Menus dinâmicos baseados no tipo de arquivo e status do Git. | Menu genérico. | `Parcial` | Implementar `ExplorerResourceContext` para filtrar ações por tipo de recurso. |
| **Lazy Resolution** | Resolve filhos apenas ao expandir a pasta. | Carregamento total ou inexistente. | `Ausente` | Implementar o padrão `fetchChildren` assíncrono. |
