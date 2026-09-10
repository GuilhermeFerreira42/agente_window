# 10 — MÓDULO: COMMAND MENU & PALETTE

## 1. Visão Geral
O sistema de Comandos e Menus é a infraestrutura de orquestração de ações do AGENTE WINDOW. Ele atua como uma camada de desacoplamento total entre o gatilho (um clique em menu, um atalho de teclado ou uma entrada na Paleta de Comandos) e a implementação da lógica (o handler do comando). Isso permite que a mesma ação seja disparada de múltiplas fontes e que sua visibilidade seja controlada dinamicamente com base no estado da aplicação.

## 2. Componentes Estruturais
O módulo é dividido em dois sistemas complementares: o Registro de Comandos (Execução) e o Registro de Menus (Descoberta).

### 2.1. Sistema de Comandos (Execução)
- **`CommandsRegistry`**: Um singleton que mantém o mapeamento global de IDs únicos para handlers de comando (`Map<string, LinkedList<ICommand>>`).
- **`ICommandService`**: A fachada pública utilizada por qualquer componente para disparar uma ação via `executeCommand(commandId, ...args)`.
- **`ICommand`**: A definição formal de um comando, contendo seu identificador, o handler a ser executado e metadados associados.

### 2.2. Sistema de Menus (Descoberta)
- **`MenuRegistry`**: Repositório global que vincula `MenuId`s (identificadores de menus, como "EditorContext") a listas de itens de menu (`IMenuItem`).
- **`MenuService`**: Fábrica responsável por criar instâncias de menus filtradas. Ela transforma a lista bruta do registro em um menu processado e reativo.
- **`MenuImpl` / `MenuInfo`**: O motor de processamento que aplica a filtragem de contexto, a ordenação e a recursão de submenus.
- **`PersistedMenuHideState`**: Gerencia a persistência de itens que o usuário decidiu ocultar manualmente, utilizando o `IStorageService`.

### 2.3. Motor de Visibilidade
- **`IContextKeyService`**: O núcleo booleano do sistema. Ele avalia as cláusulas `when` associadas a cada item de menu, determinando se a ação deve estar visível com base nas chaves de contexto atuais (ex: `editorTextFocus`).

## 3. Regras de Comportamento (Dado/Quando/Então)

### 3.1. Ciclo de Vida do Comando
- **Registro via Action2**: **Dado** a definição de uma ação via `Action2` $\rightarrow$ **Quando** o sistema inicia $\rightarrow$ **Então** o `registerAction2` orquestra simultaneamente o registro no `CommandsRegistry` (lógica), `MenuRegistry` (interface) e `KeybindingsRegistry` (atalhos).
- **Execução de Ação**: **Dado** um gatilho de usuário $\rightarrow$ **Quando** `executeCommand(id)` é chamado $\rightarrow$ **Então** o `CommandService` localiza o handler no registro e o executa com os argumentos fornecidos.

### 3.2. Dinâmica de População de Menus
- **Filtragem Reativa**: **Dado** um menu aberto $\rightarrow$ **Quando** uma chave de contexto muda (ex: o usuário clica fora do editor) $\rightarrow$ **Então** o `MenuImpl` dispara a reavaliação de todas as cláusulas `when`, ocultando ou exibindo itens instantaneamente.
- **Ordenação de Itens**: **Dado** a lista de itens válidos $\rightarrow$ **Quando** o menu é renderizado $\rightarrow$ **Então** os itens são organizados primeiro por Grupo (ex: 'navigation' no topo), depois pela propriedade `order` e, finalmente, por ordem lexical do título.

## 4. Mapa de Implementação Técnica

| Funcionalidade | Referência no `vscode-main` | Responsabilidade |
| :--- | :--- | :--- |
| **Registro de Comandos** | `src/vs/platform/commands/common/commands.ts` | `CommandsRegistry` e `ICommandService`. |
| **Registro de Menus** | `src/vs/platform/actions/common/actions.ts` | `MenuRegistry` e definições de `MenuId`. |
| **Lógica de Menus** | `src/vs/platform/actions/common/menuService.ts` | `MenuService`, `MenuImpl` e `MenuInfo`. |
| **Persistência de UI** | `src/vs/platform/actions/common/menuService.ts` | `PersistedMenuHideState` via `IStorageService`. |
| **Avaliação de Contexto** | `src/vs/platform/contextkey/common/contextkeyService.ts` | Implementação do `IContextKeyService` (cláusulas `when`). |
| **Atalhos de Teclado** | `src/vs/platform/actions/common/keybindings.ts` | Vinculação de comandos a combinações de teclas. |

## 5. Integrações Cross-Subsystem
O sistema de comandos é o tecido conjuntivo de toda a IDE:
- **Integração com UI Global**: Menus de contexto, toolbars e a Paleta de Comandos são todos consumidores do `MenuService`.
- **Integração com Contexto**: O `IContextKeyService` recebe atualizações de todos os módulos (Editor, Terminal, Sidebar) para decidir a visibilidade dos comandos.
- **Integração com Persistência**: O `IStorageService` garante que as preferências de ocultação de menu sobrevivam ao reload.

## 6. Critérios de Aceite
- [ ] **Execução Determinística**: O `executeCommand` deve disparar o handler correto sem ambiguidade.
- [ ] **Reatividade de Contexto**: Itens de menu com cláusulas `when` devem aparecer/desaparecer em tempo real conforme o estado da IDE muda.
- [ ] **Hierarquia de Menus**: Submenus devem ser resolvidos recursivamente, mantendo a filtragem de contexto em cada nível.
- [ ] **Persistência de Ocultação**: A ação de "ocultar item" deve ser salva e recuperada corretamente do storage.
- [ ] **Ordem Rigorosa**: A ordenação de grupos e a propriedade `order` devem ser respeitadas estritamente na renderização final.
