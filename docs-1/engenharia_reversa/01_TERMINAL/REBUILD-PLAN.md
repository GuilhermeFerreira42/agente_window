# REBUILD PLAN: Terminal Subsystem (AGENTE WINDOW)

## 1. Executive Summary
Objective: Replicate the high-fidelity terminal experience of VS Code, including multi-instance management, screen splitting, and session persistence, within the AGENTE WINDOW architecture.

## 2. Structural Mapping (VS Code $\rightarrow$ AGENTE WINDOW)

| VS Code Component | AGENTE WINDOW Layer | Component Name | Responsibility |
|---|---|---|---|
| `ptyHostMain.ts` / `ptyService.ts` | **Motor (Runtime)** | `PtyHost` | Process spawning, I/O streaming, and lifecycle management. |
| `ITerminalInstanceService` | **Logic (Services)** | `TerminalManager` | Instance tracking, profile resolution, and state orchestration. |
| `ITerminalGroupService` | **Workbench (Shell)** | `LayoutEngine` | Management of terminal grids, split logic, and focus. |
| `TerminalViewPane` / `TerminalTabList` | **Visual (UI)** | `TerminalUI` | Rendering xterm.js instances and the tab management bar. |

## 3. Implementation Phases

### Phase 1: The Motor (Runtime)
- **Goal**: Establish a stable communication channel between the UI and a real shell process.
- **Tasks**:
  - Implement `PtyHost` using `node-pty`.
  - Create a WebSocket bridge for bi-directional stream (UI $\leftrightarrow$ Host).
  - Implement basic `spawn` and `kill` commands.
  - **Validation**: A single terminal window that accepts input and shows output.

### Phase 2: The Logic (Services)
- **Goal**: Move from a "single terminal" to a "managed system of instances".
- **Tasks**:
  - Implement `TerminalInstance` class to track PID, Shell Profile, and CWD.
  - Create `TerminalManager` to handle the creation/destruction of multiple instances.
  - Implement `TerminalProfileService` for shell detection (PowerShell/Bash/Zsh).
  - **Validation**: Ability to spawn multiple independent terminals.

### Phase 3: The Workbench (Shell/Layout)
- **Goal**: Implement the "VS Code feel" for layout and navigation.
- **Tasks**:
  - Implement `TerminalGroup` to support vertical/horizontal splitting.
  - Create the `FocusManager` to handle keyboard focus between split panes.
  - Implement the `TerminalTabsList` logic (add/remove/rename tabs).
  - **Validation**: Splitting a terminal into two panes and switching focus between them.

### Phase 4: The Visual (UI)
- **Goal**: High-fidelity rendering and user interaction.
- **Tasks**:
  - Integrate `xterm.js` with the `TerminalUI` component.
  - Implement the `TerminalTabs` visual bar with icons and colors.
  - Build the `TerminalContextMenu` (Right-click actions).
  - Implement dynamic resizing (DOM $\rightarrow$ xterm.js cols/rows).
  - **Validation**: All visual elements from "Layer A: Observable Inventory" are present and functional.

## 4. Critical Dependencies
- **Core**: `node-pty` (Process management), `xterm.js` (Rendering).
- **Add-ons**: `@xterm/addon-serialize` (for Session Revive), `@xterm/addon-web-links`.
- **Transport**: `ws` (WebSockets for low-latency I/O).

## 5. Validation Matrix (Linking to Layer E)

| Implementation Step | Acceptance Criterion (Layer E) | Validation Method |
|---|---|---|
| Phase 1 $\rightarrow$ Spawn | 1.1 Criação de Instância | Log check: `PtyService.create` $\rightarrow$ PID active. |
| Phase 3 $\rightarrow$ Split | 1.2 Divisão de Painel | DOM check: 2 xterm elements + `terminalInstances.length == 2`. |
| Phase 3 $\rightarrow$ Focus | 1.3 Alternância de Foco | Event check: `focus()` event triggers input redirect. |
| Phase 4 $\rightarrow$ Tabs | 2.1 Renomeação de Aba | State check: `instance.title` updates in UI. |
| Phase 1 $\rightarrow$ Persistence | 3.2 Recuperação de Buffer | Snapshot check: `XtermSerializer` match after reload. |
