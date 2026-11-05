# Análise de Gaps do Subsistema de Comandos e Menus (Camada 4)

Este documento identifica lacunas no entendimento atual do sistema e áreas de complexidade.

## 1. Lacunas de Implementação (Gaps)

### Integração com Extensões
- **O que sabemos**: O sistema permite registro de comandos e itens de menu.
- **O que falta**: Não foi analisado como o `ExtensionHost` comunica a contribuição de comandos de extensões externas para o `CommandsRegistry` e `MenuRegistry`. O fluxo de "Contribution" (via `package.json` da extensão) não está detalhado.

### Renderização de UI
- **O que sabemos**: O `MenuService` retorna listas de ações (`MenuItemAction`).
- **O que falta**: A camada de visualização (como as ações são transformadas em elementos HTML/DOM) não foi mapeada. A conexão entre o `MenuImpl` e os componentes de UI (ex: `Toolbar`, `ContextMenu`) é superficial.

### Especializações de Menus
- **O que sabemos**: A `CommandPalette` tem um comportamento especial de "itens implícitos".
- **O que falta**: Investigar se existem outros menus com lógica de população customizada além da Paleta de Comandos.

## 2. Áreas de Complexidade

### Expressões de Contexto
A lógica de visibilidade depende inteiramente do `IContextKeyService`. A complexidade de como as expressões `when` são parseadas e avaliadas em tempo real (especialmente em menus aninhados) é alta e reside fora do escopo imediato deste subsistema.

### Ciclo de Eventos (Debounce)
O `MenuImpl` utiliza um `DebounceEmitter`. A análise do impacto de performance em menus com centenas de itens e mudanças frequentes de contexto seria necessária para um entendimento completo de performance.
