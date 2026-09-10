# 04 — MÓDULO: TERMINAL

## 1. Visão Geral
O módulo de Terminal fornece ao usuário a capacidade de interagir com shells do sistema operacional diretamente dentro do Workbench. Ele não é um terminal simulado, mas sim uma ponte para processos PTY reais, integrando a renderização de alta performance do `xterm.js` com a gestão de processos do Node.js.

## 2. Componentes Estruturais
O terminal é composto por três camadas principais:

- **Frontend (UI)**:
    - `TerminalInstance`: Gerencia a vinculação com a instância do `xterm.js`, lidando com a renderização e o redimensionamento.
    - `TerminalGroup`: Gerencia o agrupamento de terminais, permitindo a criação de splits (divisões) verticais e horizontais.
    - `Shell Picker`: Interface de seleção de perfil que permite a troca de shells (ex: Bash $\rightarrow$ PowerShell).
- **Orquestração (Service)**:
    - `TerminalService`: Ponto de entrada para a criação de novas instâncias, rastreamento de sessões ativas e reconexão pós-reload.
    - `TerminalProfileService`: Responsável por detectar os shells disponíveis no sistema operacional e resolver o perfil padrão.
- **Backend (Runtime)**:
    - `node-pty`: Processo do servidor que spawnar o shell real e gerencia o stream de dados.
    - `TerminalProcessManager`: Coordena o ciclo de vida do processo PTY e o report de exit codes.

## 3. Regras de Comportamento (Dado/Quando/Então)

### 3.1. Ciclo de Vida e Inicialização
- **Novo Terminal**: **Dado** que o usuário clica em "Novo Terminal" $\rightarrow$ **Quando** a ação é disparada $\rightarrow$ **Então** o sistema resolve o perfil padrão e spawnar um processo PTY.
- **Perfil Específico**: **Dado** a seleção de um shell no Shell Picker $\rightarrow$ **Quando** confirmado $\rightarrow$ **Então** o sistema spawnar o shell utilizando o caminho do executável selecionado.
- **Encerramento**: **Dado** que o processo termina (exit) $\rightarrow$ **Quando** `onExit` é disparado $\rightarrow$ **Então** o sistema reporta o exit code e aguarda interação do usuário para fechar a aba.

### 3.2. Layout e Interação
- **Divisão (Split)**: **Dado** um terminal ativo $\rightarrow$ **Quando** "Dividir Terminal" é acionado $\rightarrow$ **Então** cria-se uma nova instância no mesmo grupo, herdando o CWD da original.
- **Redimensionamento**: **Dado** a mudança no tamanho do container DOM $\rightarrow$ **Quando** o evento de resize ocorre $\rightarrow$ **Então** o sistema calcula colunas/linhas e envia o comando `resize` para o PTY.
- **Buffer de Scrollback**: **Dado** que o volume de dados excede o limite $\rightarrow$ **Quando** novos dados chegam $\rightarrow$ **Então** as linhas mais antigas são descartadas para preservar a memória.

## 4. Mapa de Implementação Técnica

| Funcionalidade | Referência no `vscode-main` | Responsabilidade |
| :--- | :--- | :--- |
| **Instância Core** | `src/vs/workbench/contrib/terminal/browser/terminalInstance.ts` | Ciclo de vida e vínculo xterm.js. |
| **Gestão de Splits** | `src/vs/workbench/contrib/terminal/browser/terminalGroup.ts` | Layout de painéis e `SplitPaneContainer`. |
| **Orquestração** | `src/vs/workbench/contrib/terminal/browser/terminalService.ts` | Gestão de instâncias e reconexão. |
| **Resolução de Perfil** | `src/vs/workbench/contrib/terminal/browser/terminalProfileService.ts` | Detecção de shells do SO. |
| **Gestão de Buffer** | `src/vs/workbench/contrib/terminal/browser/xterm/xtermTerminal.ts` | Configuração de `scrollback` do xterm.js. |
| **Ciclo de Saída** | `src/vs/workbench/contrib/terminal/browser/terminalInstance.ts` | Evento `onExit` e reporte de exit code. |
| **Encerramento** | `src/vs/workbench/contrib/terminal/browser/terminalInstance.ts` | Método `dispose()` para matar o processo PTY. |

## 5. Integrações Cross-Subsystem
O Terminal possui uma dependência crítica do **Subsistema de I/O de Arquivos (06)**:
- **Validação de CWD**: O diretório de trabalho atual é resolvido e validado via `IFileService` para evitar erros de spawn.
- **Verificação de Binários**: A existência e as permissões dos executáveis de shell são verificadas via `IFileSystemProvider`.
- **Sincronização**: Mudanças de diretório (`cd`) são reportadas ao `IFileService` para atualizar a URI do diretório ativo no Workbench.

## 6. Critérios de Aceite
- [ ] **Spawn**: Criação de terminal com perfil correto e CWD válido.
- [ ] **Interatividade**: Latência imperceptível entre input de teclado e output do shell.
- [ ] **Split**: Capacidade de dividir a tela mantendo o contexto do diretório.
- [ ] **Redimensionamento**: Sincronização precisa de colunas/linhas entre UI e PTY.
- [ ] **Robustez**: O terminal não fecha automaticamente após o exit do processo, exibindo o exit code.
- [ ] **Persistência**: Recuperação de sessões ativas após reload da aplicação.
