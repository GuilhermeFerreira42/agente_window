# 02_ARQUITETURA: AGENTE WINDOW

## 1. Modelo de Camadas (4-Layer Architecture)

O sistema é dividido em quatro camadas distintas para garantir a separação de preocupações e a escalabilidade.

### 1.1. Camada de Motor (Motor / Runtime)
**Responsabilidade**: Interface direta com o Sistema Operacional e processos externos.
- **Componentes**: `PtyHost`, `FileSystemHost`, `ProcessManager`.
- **Tecnologias**: Node.js, `node-pty`, `fs`, `child_process`.
- **Comunicação**: Emite fluxos de dados via WebSockets/IPC para as camadas superiores.

### 1.2. Camada de Workbench (Shell / Layout)
**Responsabilidade**: Gestão do espaço visual e orquestração de janelas.
- **Componentes**: `LayoutEngine`, `WindowManager`, `TabManager`.
- **Tecnologias**: React, CSS Grid/Flexbox.
- **Comunicação**: Coordena qual módulo (Logic) está ativo e visível.

### 1.3. Camada de Lógica (Logic / Services)
**Responsabilidade**: Regras de negócio, estado da aplicação e abstração do Motor.
- **Componentes**: `TerminalManager`, `FileService`, `AgentOrchestrator`.
- **Tecnologias**: TypeScript, State Management (Zustand/Redux).
- **Comunicação**: Traduz requisições da UI em comandos para o Motor e vice-versa.

### 1.4. Camada Visual (Visual / UI)
**Responsabilidade**: Renderização final e interação com o usuário.
- **Componentes**: `TerminalUI` (xterm.js), `FileExplorerUI`, `ChatUI`.
- **Tecnologias**: React, Tailwind CSS, xterm.js.
- **Comunicação**: Dispara eventos para a camada de Lógica.

## 2. Fluxo de Comunicação (Exemplo: Terminal)
`User Click` (Visual) $\rightarrow$ `TerminalManager.create()` (Logic) $\rightarrow$ `LayoutEngine.split()` (Workbench) $\rightarrow$ `PtyHost.spawn()` (Motor) $\rightarrow$ `Shell Process` (OS).

## 3. Princípios Arquiteturais
- **Async-First**: Toda operação de I/O deve ser assíncrona.
- **Single Source of Truth**: O estado da aplicação reside na camada de Lógica, a UI é apenas um reflexo desse estado.
- **Isolation**: O Motor roda em um processo separado para evitar que crashes de shell derrubem a interface do usuário.
