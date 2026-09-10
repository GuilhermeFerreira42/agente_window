# IMPLEMENTATION GUIDANCE: Terminal Subsystem (AGENTE WINDOW)

## 1. Architectural Blueprint
The terminal implementation follows a **Decoupled Process Model**. The UI (Renderer) never talks to the shell directly; it communicates with a `PtyHost` (Backend) via a WebSocket bridge.

### Data Flow Sequence
`User Input` $\rightarrow$ `XTerm Terminal` $\rightarrow$ `WebSocket` $\rightarrow$ `PtyHost` $\rightarrow$ `node-pty` $\rightarrow$ `Shell Process` $\rightarrow$ `PtyHost` $\rightarrow$ `WebSocket` $\rightarrow$ `XTerm Terminal` $\rightarrow$ `Display`

---

## 2. Component Specifications

### A. The Motor: `PtyHost` (Node.js)
**Responsibility**: Process lifecycle and raw I/O.

- **Key API**:
  - `spawn(shellConfig: ShellConfig): Promise<PtySession>`
  - `kill(sessionId: string): Promise<void>`
  - `resize(sessionId: string, cols: number, rows: number): void`
- **Internal Logic**:
  - Use `node-pty` to spawn the process.
  - Map `sessionId` $\rightarrow$ `PtyProcess`.
  - Implement a `WebSocketServer` to handle multiple client connections.
- **Pitfall**: Ensure the `pty` process is killed when the WebSocket disconnects (unless `persistence: true`).

### B. The Logic: `TerminalManager` (TypeScript/Frontend)
**Responsibility**: State management and business rules.

- **Key API**:
  - `createTerminal(profileId: string): TerminalInstance`
  - `getActiveInstance(): TerminalInstance | null`
  - `closeTerminal(instanceId: string): void`
- **Data Structure**:
  - `instances: Map<string, TerminalInstance>`
  - `activeInstanceId: string`
- **Pitfall**: Handle the race condition where a terminal is requested to be created but the `PtyHost` is still booting.

### C. The Workbench: `LayoutEngine` (TypeScript/Frontend)
**Responsibility**: Grid management and focus.

- **Logic**:
  - Use a **Split-Pane Tree** structure. Each node is either a `Leaf` (containing a `TerminalInstance`) or a `Split` (containing `left` and `right` children).
  - **Focus Shift**: When a pane is clicked, update `TerminalManager.activeInstanceId` and trigger a CSS focus class.
- **Sash Handling**:
  - Listen to `mousemove` on the divider. Update the width/height of children and call `TerminalInstance.resize()`.

### D. The Visual: `TerminalUI` (React/XTerm)
**Responsibility**: Rendering and interaction.

- **Implementation**:
  - Use `xterm.js` wrapped in a React `useEffect` hook.
  - **Sizing**: Use `@xterm/addon-fit` to calculate the correct columns and rows based on the parent container's pixel size.
  - **Tabs**: Implement a horizontal list that filters `TerminalManager.instances`.
- **Critical Step**: Call `term.open(domElement)` only once per instance. Use a `ref` to store the xterm instance to avoid re-renders.

---

## 3. Step-by-Step Implementation Order

1. **Setup `PtyHost`**:
   - Install `node-pty` and `ws`.
   - Create a minimal server that spawns `powershell.exe` (Win) or `/bin/bash` (Unix).
2. **Connect UI**:
   - Install `xterm` and `@xterm/addon-fit`.
   - Create a WebSocket client that pipes `term.onData` $\rightarrow$ `socket.send` and `socket.onMessage` $\rightarrow$ `term.write`.
3. **Implement Multi-Instance Logic**:
   - Create the `TerminalManager` to handle a list of sessions.
   - Implement the Tab bar to switch between sessions (which involves swapping the `domElement` or swapping the WebSocket channel).
4. **Add Layout Splitting**:
   - Implement the Split-Pane logic.
   - Integrate `LayoutEngine` with the `TerminalUI` components.
5. **Final Polish**:
   - Add the Right-Click context menu.
   - Implement `XtermSerializer` for session revival.

## 4. Performance & Stability Checklist
- [ ] **Backpressure**: Ensure the WebSocket doesn't overflow if the shell produces massive output (e.g., `cat` of a huge file).
- [ ] **Zombie Processes**: Implement a heartbeat between `PtyHost` and UI to kill orphan processes.
- [ ] **Resize Lag**: Debounce the `resize` event to avoid flooding the `PtyHost` with resize requests.
- [ ] **UTF-8**: Ensure all communication is strictly UTF-8 encoded to avoid character corruption in the terminal.
