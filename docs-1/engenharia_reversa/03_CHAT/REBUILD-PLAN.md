# REBUILD PLAN: Chat & Agent Session (AGENTE WINDOW)

## 1. Executive Summary
Objective: Implement a state-driven, real-time interaction system for AI agents, featuring streaming responses, a "thinking" process visualization, a robust confirmation gate for tool use, and persistent session management.

## 2. Structural Mapping (VS Code $\rightarrow$ AGENTE WINDOW)

| VS Code Component | AGENTE WINDOW Layer | Component Name | Responsibility |
|---|---|---|---|
| `remoteAgentHostService.ts` | **Motor (Runtime)** | `AgentHostHost` | Managing the connection to the LLM/Agent runtime and tool execution. |
| `agentHostSessionHandler.ts` | **Logic (Services)** | `SessionOrchestrator` | Bridging protocol state to UI progress, handling turn lifecycles. |
| `agentHostSessionListController.ts` | **Workbench (Shell)** | `SessionManager` | Managing a collection of sessions, history, and active session switching. |
| `agentHostChatInputPicker.ts` / `ChatUI` | **Visual (UI)** | `ChatInterface` | Rendering messages, streaming text, and handling user input. |

## 3. Implementation Phases

### Phase 1: The Protocol Bridge (Motor)
- **Goal**: Establish a protocol-compliant communication channel with the Agent Host.
- **Tasks**:
  - Implement a WebSocket connection to the Agent Host.
  - Implement the `AgentHostProtocol` (Turn requests, State updates, Action dispatches).
  - Create the `SessionState` model (Turns, Messages, ToolCalls).
  - **Validation**: Ability to send a prompt and receive a raw JSON response from the agent.

### Phase 2: The Observation Loop (Logic)
- **Goal**: Translate raw protocol state into a human-readable stream of events.
- **Tasks**:
  - Implement the `SessionOrchestrator` (equivalent to `AgentHostSessionHandler`).
  - Build the `stateToProgress` adapter:
    - Convert `Reasoning` $\rightarrow$ "Thinking" block.
    - Convert `Markdown` $\rightarrow$ "Streaming Text".
    - Convert `ToolCall` $\rightarrow$ "Tool Widget".
  - Implement the turn lifecycle: `Started` $\rightarrow$ `Processing` $\rightarrow$ `Completed`.
  - **Validation**: A prompt results in a "Thinking..." indicator followed by a streaming response.

### Phase 3: The Interaction Model (Workbench/Visual)
- **Goal**: Create a high-fidelity chat UI with rich components.
- **Tasks**:
  - Implement the `ChatInterface` with a virtualized message list.
  - Build the `ToolConfirmationGate`: UI buttons to Approve/Reject tool calls.
  - Implement the `AgentSessionList` for switching between different conversations.
  - Create the `InputField` with support for context attachments.
  - **Validation**: User can approve a tool call, and the agent continues based on the tool output.

### Phase 4: Persistence & Advanced Features (Logic/Visual)
- **Goal**: Add session recovery and a visual record of agent work.
- **Tasks**:
  - Implement `SessionSnapshotController` to save/load conversation history.
  - Build the `ArtifactsView`: A side-panel that renders code/docs generated during the session.
  - Implement "Continue" functionality for truncated responses.
  - **Validation**: Reloading the app restores the full conversation history and rendered artifacts.

## 4. Critical Dependencies
- **Core**: WebSocket API (Transport), `Zustand` or `Redux` (State Management).
- **UI**: `react-markdown` (Rendering), `framer-motion` (Animations for streaming).
- **Integration**: Integration with `PtyHost` (for terminal tool calls) and `FileHost` (for file tool calls).

## 5. Validation Matrix (Linking to Layer E)

| Implementation Step | Acceptance Criterion (Layer E) | Validation Method |
|---|---|---|
| Phase 2 $\rightarrow$ Streaming | 1.1 Fluxo de Conversa | Timing check: First char rendered in $< 200$ms. |
| Phase 3 $\rightarrow$ Tool Gate | 1.2 Interação com Ferramentas | State check: Tool remains `Pending` until "Approve" is clicked. |
| Phase 3 $\rightarrow$ Sessions | 2.1 Alternância de Contexto | UI check: Chat history swaps instantly on session change. |
| Phase 4 $\rightarrow$ Snapshot | 2.2 Persistência de Histórico | DB check: Conversation saved to local storage/DB. |
| Phase 2 $\rightarrow$ Thinking | 1.1 Fluxo de Conversa | UI check: "Thinking" block appears before the answer. |
