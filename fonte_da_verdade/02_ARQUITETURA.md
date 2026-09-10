# 02 — ARQUITETURA DO SISTEMA

## 1. Modelo de 4 Camadas
O AGENTE WINDOW segue uma arquitetura rigorosamente estratificada para garantir a separação de preocupações e a escalabilidade do sistema.

### Camada 1: Agent Runtime (Infraestrutura de Execução)
A camada mais baixa, responsável pela comunicação com o sistema operacional e o backend de IA.
- **PTY Bridge**: Comunicação via WebSockets entre o frontend e o `node-pty` no servidor.
- **FS Provider**: Implementação de baixo nível de I/O (Disk, InMemory, IndexedDB).
- **IA Engine**: Orquestração de chamadas para LLMs e processamento de prompts.

### Camada 2: Workbench Shell (Estrutura de Hospedagem)
O "esqueleto" da aplicação que define onde os componentes residem.
- **Layout Service**: Orquestra a geometria da janela, visibilidade de partes (Sidebar, Editor, Panel) e redimensionamento.
- **Part Management**: Implementação do padrão `AbstractPaneCompositePart` para gerenciar containers de visualização.
- **Theme Engine**: Injeção de variáveis CSS no root do DOM para estilização global.

### Camada 3: Workbench Logic (Lógica de Negócio)
O cérebro do sistema, onde as regras de comportamento são processadas.
- **Piece Table Logic**: Gestão eficiente de buffers de texto.
- **Command Registry**: Mapeamento e execução de comandos globais.
- **Session Management**: Rastreamento de sessões de chat e instâncias de terminal.
- **View Descriptor Service**: Resolução dinâmica de quais views devem ser renderizadas em cada local.

### Camada 4: Visual Interface (Camada de Apresentação)
A camada final de interação com o usuário.
- **Virtual Viewport**: Renderização otimizada de linhas de código.
- **Composite Bars**: Barras de ícones reativas na Activity Bar e Auxiliary Bar.
- **Chat Widgets**: Componentes de streaming de texto e renderização de blocos de código.

## 2. Fluxo Global de Dados
O fluxo de dados segue o padrão de **Unidirecionalidade Reativa**:
`Input do Usuário` $\rightarrow$ `Command Registry` $\rightarrow$ `Workbench Logic` $\rightarrow$ `State Update` $\rightarrow$ `Visual Interface`.

## 3. Pontes de Integração (Cross-Subsystem Bridges)
Para evitar o acoplamento forte, os subsistemas comunicam-se através de serviços de interface:

| Origem | Destino | Mecanismo de Integração | Propósito |
| :--- | :--- | :--- | :--- |
| **Terminal** | **Filesystem** | `IFileService` | Validação de CWD e executáveis de shell. |
| **Chat** | **Editor** | `EditorLockService` | Sincronização de estado "Locked" durante mutações de IA. |
| **Editor** | **Filesystem** | `IFileSystemProvider` | Operações de leitura/escrita atômicas. |
| **Todos** | **Theme** | `WorkbenchThemeService` | Consumo de tokens de cores e reatividade visual. |
| **UI** | **Commands** | `ICommandService` | Execução de ações via atalhos ou menus. |

## 4. Hierarquia de Componentes
A árvore de composição segue a seguinte ordem de dependência:
`WorkbenchShell` $\rightarrow$ `Part` $\rightarrow$ `CompositeBar` $\rightarrow$ `ViewContainer` $\rightarrow$ `View` $\rightarrow$ `Widget`.
