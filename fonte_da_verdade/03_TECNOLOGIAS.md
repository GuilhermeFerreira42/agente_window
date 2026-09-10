# 03 — TECNOLOGIAS E IMPLEMENTAÇÃO

## 1. Stack Tecnológica
O AGENTE WINDOW é construído sobre tecnologias modernas de alta performance para garantir a fluidez da interface e a robustez do processamento.

### Frontend
- **Framework**: React 18 (estateless components e hooks para gestão de estado local).
- **Estado Global**: Zustand / Redux (para estados de layout e sessões ativas).
- **Build Tool**: Vite (para HMR rápido e bundling otimizado).
- **Estilização**: CSS Variables + PostCSS (para trocas de tema instantâneas sem re-render).

### Backend (Runtime)
- **Linguagem**: Node.js (TypeScript).
- **Comunicação**: WebSockets (comunicação bidirecional de baixa latência).
- **Emulação de Terminal**: `node-pty` (processos PTY reais para suporte a shells nativos).

## 2. Componentes Técnicos Especializados
Para atingir a fidelidade do VS Code, são implementadas as seguintes tecnologias:

### 2.1. Motor de Texto (The Editor Core)
- **Piece Table**: Estrutura de dados para edição de texto que evita a cópia de grandes buffers, permitindo inserções em $O(1)$.
- **B-Tree Index**: Indexação de offsets de caracteres para números de linha, garantindo saltos rápidos em arquivos gigantes ($O(\log N)$).
- **Virtual Viewport**: Renderização apenas das linhas visíveis no DOM para evitar gargalos de memória.

### 2.2. Terminal e Shell
- **xterm.js**: Biblioteca de renderização de terminal com suporte a GPU e cores TrueColor.
- **Sincronização de Resize**: Algoritmo de cálculo de colunas/linhas baseado no tamanho da fonte e do container DOM.

### 2.3. Persistência e I/O
- **IndexedDB**: Armazenamento local de cache de sessões e configurações.
- **Atomic Writes**: Estratégia de escrita em arquivos temporários $\rightarrow$ rename para evitar corrupção de dados.

## 3. Protocolos de Comunicação
- **WebSocket Bridge**: O frontend comunica-se com o servidor via mensagens JSON estruturadas.
- **LSP (Language Server Protocol)**: Interface padrão para funcionalidades de inteligência de código (autocompletar, definição, referências).
- **Custom Event Bus**: Sistema de eventos internos para comunicação entre a `SidebarPart` e o `EditorPart`.

## 4. Matriz de Complexidade
| Recurso | Estrutura de Dados | Complexidade (Tempo) | Complexidade (Espaço) |
| :--- | :--- | :--- | :--- |
| Inserção de Texto | Piece Table | $O(1)$ | $O(1)$ |
| Busca de Linha | B-Tree | $O(\log N)$ | $O(N)$ |
| Renderização de View | Virtual Viewport | $O(V)$ ($V$=visíveis) | $O(V)$ |
| Resolução de Temas | CSS Variables | $O(1)$ | $O(T)$ ($T$=tokens) |
