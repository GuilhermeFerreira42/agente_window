# 01C — MAPA DE CÓDIGO: TERMINAL

Este documento mapeia os comportamentos definidos em 01B para a implementação real no `vscode-main`.

## 1. Mapeamento de Funcionalidades

| Funcionalidade | Arquivo | Localização Aproximada | Responsabilidade |
| :--- | :--- | :--- | :--- |
| **Instância de Terminal** | `src/vs/workbench/contrib/terminal/browser/terminalInstance.ts` | Todo o arquivo | Gerencia o ciclo de vida da instância, vinculação com xterm.js e redimensionamento. |
| **Gestão de Grupos/Splits** | `src/vs/workbench/contrib/terminal/browser/terminalGroup.ts` | `TerminalGroup` class | Controla a divisão de painéis, orientação e layout via `SplitPaneContainer`. |
| **Serviço Central de Terminais** | `src/vs/workbench/contrib/terminal/browser/terminalService.ts` | `TerminalService` class | Orquestra a criação de terminais, rastreamento de instâncias ativas e reconexão. |
| **Resolução de Perfis** | `src/vs/workbench/contrib/terminal/browser/terminalProfileService.ts` | `TerminalProfileService` class | Detecta shells disponíveis no SO e resolve o perfil padrão. |
| **Shell Picker (UI)** | `src/vs/workbench/contrib/terminal/browser/terminalService.ts` | `TerminalService` / UI components | Interface de seleção de shell que permite ao usuário escolher entre os perfis resolvidos. |
| **Gestão de Buffer** | `vscode-main\src\vs\workbench\contrib\terminal\browser\xterm\xtermTerminal.ts:247,598` | Implementa a configuração de `scrollback` do xterm.js via `TerminalConfigurationService` para limitar o histórico de linhas. |
| **Ciclo de Saída** | `vscode-main\src\vs\workbench\contrib\terminal\browser\terminalInstance.ts:1717-1803` | Implementa `_onProcessExit` para reportar exit codes e exibir a mensagem "Press any key to close". |
| **Encerramento Manual** | `vscode-main\src\vs\workbench\contrib\terminal\browser\terminalInstance.ts:1301-1371` | Implementa `dispose()` e `detachProcessAndDispose()` para encerrar o processo PTY e limpar recursos. |
| **Gestão de Processo** | `src/vs/workbench/contrib/terminal/browser/terminalProcessManager.ts` | `_onExit()` | Orquestra o encerramento do processo PTY no backend. |

## 2. Dependências de Infraestrutura (Cross-Subsystem)
| Serviço | Subsistema | Papel no Terminal |
| :--- | :--- | :--- |
| `IFileService` | `06_FILESYSTEM_IO` | Validação de caminhos, resolução de CWD e verificação de executáveis de shell. |
| `IFileSystemProvider` | `06_FILESYSTEM_IO` | Acesso de baixo nível ao sistema de arquivos para operações de shell. |

## 3. Rastreio de Fluxos Críticos

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
