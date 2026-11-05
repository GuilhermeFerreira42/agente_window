# 01C — MAPA DE CÓDIGO: TERMINAL

Este documento mapeia os comportamentos definidos em 01B para a implementação real no `vscode-main`.

## 1. Mapeamento de Funcionalidades

| Funcionalidade | Arquivo | Localização Aproximada | Responsabilidade |
| :--- | :--- | :--- | :--- |
| **Instância de Terminal** | `src/vs/workbench/contrib/terminal/browser/terminalInstance.ts` | Todo o arquivo | Gerencia o ciclo de vida da instância, vinculação com xterm.js e redimensionamento. |
| **Gestão de Grupos/Splits** | `src/vs/workbench/contrib/terminal/browser/terminalGroup.ts` | `TerminalGroup` class | Controla a divisão de painéis, orientação e layout via `SplitPaneContainer`. |
| **Serviço Central de Terminais** | `src/vs/workbench/contrib/terminal/browser/terminalService.ts` | `TerminalService` class | Orquestra a criação de terminais, rastreamento de instâncias ativas e reconexão. |
| **Resolução de Perfis** | `src/vs/workbench/contrib/terminal/browser/terminalProfileService.ts` | `TerminalProfileService` class | Detecta shells disponíveis no SO e resolve o perfil padrão. |
| **Definição de Perfis** | `src/vs/platform/terminal/common/terminalProfiles.ts` | `TerminalProfile` interface | Define a estrutura de dados para caminhos de shell e argumentos. |

## 2. Rastreio de Fluxos Críticos

### 2.1 Fluxo de Criação (`Novo Terminal` $\rightarrow$ `Processo PTY`)
1. `TerminalService.createTerminal()` $\rightarrow$ Solicita a criação de uma nova instância.
2. `TerminalProfileService.getDefaultProfile()` $\rightarrow$ Resolve qual shell usar.
3. `TerminalInstance` $\rightarrow$ Inicializa a comunicação com o backend do terminal.
4. `TerminalGroup` $\rightarrow$ Adiciona a instância ao layout visual.

### 2.2 Fluxo de Redimensionamento
1. `TerminalInstance` detecta mudança de tamanho no DOM.
2. `TerminalInstance` calcula `cols` e `rows` baseando-se no tamanho da fonte e do container.
3. Chamada ao backend para executar `ptyProcess.resize(cols, rows)`.

### 2.3 Fluxo de Split
1. `TerminalGroup` recebe comando de split.
2. Criação de nova `TerminalInstance` clonando o CWD da instância ativa.
3. Reconfiguração do `SplitPaneContainer` para dividir a área visual.
