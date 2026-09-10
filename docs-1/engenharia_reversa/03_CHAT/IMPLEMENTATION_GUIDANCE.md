# IMPLEMENTATION GUIDANCE: Chat & Agent Session (AGENTE WINDOW)

## 1. Architectural Blueprint
The Chat system is an **Event-Driven State Machine**. The UI does not "ask for a response"; it "subscribes to a session state". The `SessionOrchestrator` observes a stream of immutable state updates and derives the visual progress.

### Data Flow Sequence
`UserInput` $\rightarrow$ `ClientAction(turnStarted)` $\rightarrow$ `AgentHost` $\rightarrow$ `StateUpdate(turn)` $\rightarrow$ `SessionOrchestrator` $\rightarrow$ `ProgressParts` $\rightarrow$ `ChatUI`.

---

## 2. Component Specifications

### A. The Motor: `AgentHostBridge` (Transport)
**Responsibility**: Maintaining the connection to the Agent Host and dispatching actions.

- **Key API**:
  - `sendAction(action: ClientSessionAction): Promise<void>`
  - `subscribeToState(sessionUri: URI, callback: (state: SessionState) => void): IDisposable`
- **Internal Logic**:
  - Use a persistent WebSocket.
  - Handle `ProtocolError` (AHP_NOT_FOUND, AHP_AUTH_REQUIRED) and trigger the appropriate UI flow.
- **Pitfall**: Ensure the connection is kept alive with a heartbeat to prevent timeouts during long "Thinking" phases.

### B. The Logic: `SessionOrchestrator` (Adapter)
**Responsibility**: Converting immutable protocol state into UI-ready progress parts.

- **Key API**:
  - `observeTurn(turnId: string, sink: (parts: IChatProgress[]) => void): void`
- **The `stateToProgress` Algorithm**:
  1. **Markdown**: If `turn.message` contains text, emit `markdownContent`.
  2. **Thinking**: If `turn.reasoning` is present, emit `thinking` block.
  3. **Tool Calls**: Iterate through `turn.toolCalls`.
     - If `status === PendingConfirmation` $\rightarrow$ emit `toolInvocation` with `ConfirmationGate`.
     - If `status === Running` $\rightarrow$ emit `toolInvocation` with `LoadingIndicator`.
     - If `status === Completed` $\rightarrow$ emit `toolInvocation` with `Result`.
- **Pitfall**: Avoid double-emitting parts during reconnection. Use a `seedEmittedLengths` map to track what has already been rendered.

### C. The Workbench: `SessionManager` (Management)
**Responsibility**: Session lifecycle and context switching.

- **Logic**:
  - **Session Store**: Map `sessionUri` $\rightarrow$ `SessionMetadata` (name, lastActive, etc).
  - **Active Session**: A single global state `activeSessionUri`. Changing this triggers a full `SessionOrchestrator` resubscription.
- **Pitfall**: Ensure that when a session is closed, all associated `Disposable` objects (WebSocket subscriptions, etc) are cleaned up.

### D. The Visual: `ChatInterface` (UI)
**Responsibility**: High-fidelity rendering of the conversation.

- **Implementation**:
  - **Message List**: Use a virtualized list for the chat history.
  - **Streaming Text**: Use a "typewriter" effect or immediate append for `markdownContent`.
  - **Thinking Block**: A collapsible area with a distinct background, appearing at the top of the agent's response.
  - **Confirmation Widget**: A specialized component for tool approval, featuring "Approve" and "Reject" buttons.
- **Critical Step**: Implement an "Auto-scroll" lock. If the user scrolls up to read history, stop auto-scrolling to the bottom during streaming.

---

## 3. Step-by-Step Implementation Order

1. **Protocol Bridge**:
   - Implement WebSocket transport.
   - Define the `SessionState` and `ClientSessionAction` types.
2. **Observation Loop**:
   - Create the `SessionOrchestrator`.
   - Implement the basic `stateToProgress` adapter (Text $\rightarrow$ UI).
3. **Core Chat UI**:
   - Build the `ChatInterface` (Message list + Input).
   - Implement the streaming render loop.
4. **Tooling & Confirmation**:
   - Implement `ToolCall` state tracking.
   - Build the `ConfirmationGate` UI and link it to `sendAction(confirmToolCall)`.
5. **Session Management**:
   - Implement the `SessionList` and the logic to switch between `sessionUris`.
6. **Persistence**:
   - Implement `SnapshotController` for saving/loading history from storage.

## 4. Performance & Stability Checklist
- [ ] **Memory Pressure**: Does the virtualized list handle conversations with 100+ turns?
- [ ] **State Consistency**: Does the UI stay in sync with the server if a `turnCancelled` action is sent?
- [ ] **Latency**: Is the "Thinking" indicator shown immediately upon `turnStarted`?
- [ ] **Error Recovery**: Does the UI show a "Retry" button when a `ProtocolError` occurs?
