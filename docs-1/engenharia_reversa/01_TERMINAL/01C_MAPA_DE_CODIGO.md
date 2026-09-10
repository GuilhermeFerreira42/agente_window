# CAMADA C — MAPA DE CÓDIGO DE REFERÊNCIA (Terminal)

## 1. Camada de Interface e Serviços (Workbench)
| Comportamento | Arquivo | Função/Classe | Descrição |
|---|---|---|---|
| Orquestração Geral | `src/vs/workbench/contrib/terminal/browser/terminal.ts` | `ITerminalService` | Ponto de entrada para criação e gestão de instâncias. |
| Gestão de Instâncias | `src/vs/workbench/contrib/terminal/browser/terminal.ts` | `ITerminalInstanceService` | Criação física de instâncias e backends. |
| Layout e Grupos | `src/vs/workbench/contrib/terminal/browser/terminal.ts` | `ITerminalGroupService` | Gestão de splits, foco de painel e visibilidade. |
| Perfis de Shell | `src/vs/workbench/contrib/terminal/browser/terminalProfileService.ts` | `TerminalProfileService` | Detecção e resolução de perfis (Bash, PS, etc). |
| Ações e Comandos | `src/vs/workbench/contrib/terminal/browser/terminalActions.ts` | `TerminalActions` | Registro de comandos (New, Split, Kill). |
| Menus de UI | `src/vs/workbench/contrib/terminal/browser/terminalMenus.ts` | `TerminalMenus` | Definição de itens do menu de contexto e header. |
| Renderização da View | `src/vs/workbench/contrib/terminal/browser/terminalView.ts` | `TerminalViewPane` | Componente principal que hospeda os terminais. |
| Renderização de Abas | `src/vs/workbench/contrib/terminal/browser/terminalTabsList.ts` | `TerminalTabList` | Renderização da lista de abas superior. |

## 2. Camada de Runtime e Processos (Node/Platform)
| Comportamento | Arquivo | Função/Classe | Descrição |
|---|---|---|---|
| Host do PTY | `src/vs/platform/terminal/node/ptyHostMain.ts` | `startPtyHost()` | Inicializa o processo servidor do PTY e canais RPC. |
| Orquestrador de PTY | `src/vs/platform/terminal/node/ptyService.ts` | `PtyService` | Gerencia a criação, anexo e destruição de processos PTY. |
| Processo de Terminal | `src/vs/platform/terminal/node/terminalProcess.ts` | `TerminalProcess` | Wrapper sobre o `node-pty` para comunicação I/O. |
| Persistência | `src/vs/platform/terminal/node/ptyService.ts` | `PersistentTerminalProcess` | Lida com a persistência de processos e reconexão. |
| Serialização de Buffer | `src/vs/platform/terminal/node/ptyService.ts` | `XtermSerializer` | Salva/Restaura o estado do buffer via `@xterm/addon-serialize`. |
| Comunicação RPC | `src/vs/platform/terminal/node/ptyHostMain.ts` | `ProxyChannel` | Canal de comunicação entre a UI (Renderer) e o Host (Node). |

## 3. Integração Visual (XTerm)
| Comportamento | Arquivo | Função/Classe | Descrição |
|---|---|---|---|
| Wrapper XTerm | `src/vs/workbench/contrib/terminal/browser/terminal.ts` | `IXtermTerminal` | Interface de alto nível para a instância do xterm.js. |
| Renderizador | `src/vs/workbench/contrib/terminal/browser/xterm/xtermTerminal.ts` | `XtermTerminal` | Implementação concreta da montagem do xterm no DOM. |
