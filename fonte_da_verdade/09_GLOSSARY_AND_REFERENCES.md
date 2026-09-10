# 09 — GLOSSÁRIO E REFERÊNCIAS TÉCNICAS

Este documento centraliza a terminologia utilizada no projeto AGENTE WINDOW e provê a ponte de referências para a base de código do VS Code (`vscode-main`), assegurando que a equipe utilize a mesma linguagem técnica.

## 1. Glossário de Termos Core

### Arquitetura e Layout
- **Workbench**: O ambiente de trabalho completo, incluindo todas as barras, o editor e o painel.
- **Part**: Uma seção principal da interface (ex: `SidebarPart`, `EditorPart`).
- **Composite Bar**: Uma barra de ícones que controla a visibilidade de containers (ex: Activity Bar).
- **Viewlet**: Um grupo de visualizações relacionadas (ex: a Viewlet "Explorer" contém a árvore de arquivos e a lista de abas abertas).
- **View**: O menor componente de conteúdo dentro de uma Viewlet.
- **Rail**: Termo interno para a Activity Bar quando posicionada verticalmente.

### Motor de Texto (Editor)
- **Piece Table**: Estrutura de dados que gerencia o texto como uma sequência de "pedaços" (pieces) de dois buffers (original e append), permitindo edições eficientes.
- **B-Tree Index**: Árvore balanceada utilizada para mapear offsets de caracteres para números de linha.
- **Viewport Virtualization**: Técnica de renderizar apenas as linhas visíveis no DOM para otimizar a performance.
- **Surrogate Pairs**: Representação de caracteres UTF-16 que requerem dois 16-bit code units; o editor deve validá-los para evitar que o cursor fragmente caracteres.
- **Dirty Line**: Uma linha que sofreu mutação e precisa ser re-renderizada no próximo ciclo de animação.

### Sistema de I/O
- **IFileSystemProvider**: Interface que abstrai o acesso a arquivos, independentemente de estarem no disco, memória ou nuvem.
- **Atomic Write**: Processo de escrita que utiliza um arquivo temporário para evitar a corrupção do arquivo original em caso de falha.
- **Resource Barrier**: Trava de sincronização que impede que múltiplas operações de I/O ocorram simultaneamente no mesmo recurso.
- **Universal Watcher**: Sistema de monitoramento de arquivos que utiliza APIs nativas do SO para detectar mudanças em grandes árvores de diretórios.

### IA e Chat
- **Contextualization**: Processo de resolver referências (como `@file`) em texto simples para o conteúdo real do código antes de enviar ao LLM.
- **Streaming Tokens**: Recebimento da resposta da IA em pedaços (chunks), permitindo a renderização em tempo real.
- **EditorLockService**: Mecanismo de sincronização que impede a edição manual do código enquanto a IA está aplicando alterações.

## 2. Referências Rápidas (`vscode-main`)

Para aprofundamento técnico, os seguintes diretórios do `vscode-main` são as fontes primárias:

| Módulo | Diretório de Referência | Foco de Estudo |
| :--- | :--- | :--- |
| **Layout/Shell** | `src/vs/workbench/browser/parts/` | `sidebarPart.ts`, `activitybarPart.ts`, `layout.ts` |
| **Editor Core** | `src/vs/editor/common/model/` | `pieceTreeTextBuffer/`, `textModel.ts` |
| **Editor View** | `src/vs/editor/browser/widget/` | `codeEditorWidget.ts`, `viewport.ts` |
| **Filesystem** | `src/vs/platform/files/` | `common/fileService.ts`, `node/diskFileSystemProvider.ts` |
| **Terminal** | `src/vs/workbench/contrib/terminal/` | `browser/terminalService.ts`, `browser/terminalInstance.ts` |
| **Chat** | `src/vs/workbench/contrib/chat/` | `browser/widget/chatWidget.ts`, `browser/widgetHosts/` |
| **Themes** | `src/vs/workbench/services/themes/` | `common/workbenchThemeService.ts`, `browser/colorThemeCss.ts` |
| **Commands** | `src/vs/platform/commands/` | `common/commands.ts`, `common/menuService.ts` |

## 3. Mapeamento de URIs de Recurso
A estrutura de URIs segue o padrão:
- `file://` $\rightarrow$ Local Disk
- `mem://` $\rightarrow$ In-Memory FS
- `vscode-remote://` $\rightarrow$ Remote Server (SSH/Containers)
- `chat-session://` $\rightarrow$ Persisted Chat Sessions
