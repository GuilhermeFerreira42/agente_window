# REBUILD PLAN: File Explorer (AGENTE WINDOW)

## 1. Executive Summary
Objective: Implement a high-performance, asynchronous file explorer that supports lazy-loading of large directory structures, real-time disk synchronization, and a professional set of file manipulation actions, mirroring the VS Code experience.

## 2. Structural Mapping (VS Code $\rightarrow$ AGENTE WINDOW)

| VS Code Component | AGENTE WINDOW Layer | Component Name | Responsibility |
|---|---|---|---|
| `IFileService` / `FileSystemProvider` | **Motor (Runtime)** | `FileHost` | Low-level OS calls (readDir, readFile, writeFile, move). |
| `ExplorerModel` / `ExplorerItem` | **Logic (Services)** | `FileTreeManager` | Managing the hierarchical state, caching, and lazy resolution. |
| `ExplorerView` / `ExplorerDataSource` | **Workbench (Shell)** | `ExplorerCoordinator` | Orchestrating the tree view, handling selection, and focus. |
| `FilesRenderer` / `ExplorerView` | **Visual (UI)** | `ExplorerUI` | Rendering the virtualized tree and handling user interaction. |

## 3. Implementation Phases

### Phase 1: The Motor (Runtime)
- **Goal**: Create a secure and efficient bridge to the local file system.
- **Tasks**:
  - Implement `FileHost` using Node.js `fs/promises`.
  - Implement `WorkspaceWatcher` using `chokidar` for real-time file system events.
  - Create a WebSocket-based RPC for file operations (List, Read, Write, Move, Delete).
  - **Validation**: Ability to list files of a directory from the frontend.

### Phase 2: The Logic (Services)
- **Goal**: Build the data model that supports deep hierarchies without memory bloat.
- **Tasks**:
  - Implement `ExplorerItem` with lazy-loading (children are resolved only on demand).
  - Implement `FileTreeManager` to handle the root folder and the tree state.
  - Create the `FileFilter` logic for instant searching/filtering of the tree.
  - **Validation**: Expanding a folder triggers an async request to the Motor and updates the tree.

### Phase 3: The Workbench (Shell/Layout)
- **Goal**: Manage the view's interaction with the rest of the workbench.
- **Tasks**:
  - Implement the `ExplorerCoordinator` to handle "Open File" requests and send them to the `EditorService`.
  - Create the `ContextKey` system to enable/disable actions (e.g., "Delete" is disabled for read-only files).
  - Implement the "Auto-Reveal" logic (Syncing the explorer focus with the active editor).
  - **Validation**: Double-clicking a file opens it in the editor.

### Phase 4: The Visual (UI)
- **Goal**: Implement a professional, virtualized tree UI.
- **Tasks**:
  - Implement the `ExplorerUI` using a virtualized list (to handle 10k+ files without lag).
  - Build the `FilesRenderer` (Icons, Labels, Dirty indicators).
  - Implement the `FileContextMenu` (Right-click actions).
  - Add "Compact Folders" visual logic.
  - **Validation**: Smooth scrolling and instant interaction with a large project structure.

## 4. Critical Dependencies
- **Core**: `fs/promises` (Runtime), `chokidar` (Watcher).
- **UI**: `react-window` or `virtuoso` (Virtualization), `lucide-react` (Icons).
- **Transport**: `ws` (WebSockets).

## 5. Validation Matrix (Linking to Layer E)

| Implementation Step | Acceptance Criterion (Layer E) | Validation Method |
|---|---|---|
| Phase 2 $\rightarrow$ Lazy Load | 1.1 Navegação de Árvore | Log check: `resolveChildren` called only on expand. |
| Phase 3 $\rightarrow$ Open | 1.2 Abertura de Arquivo | Event check: `EditorService.open` triggered on double-click. |
| Phase 2 $\rightarrow$ Create | 1.3 Criação de Novo Arquivo | File check: `fs.exists` is true after "New File" action. |
| Phase 4 $\rightarrow$ Filter | 2.1 Filtro de Busca | DOM check: Only matching items are visible. |
| Phase 1 $\rightarrow$ Watcher | 2.2 Sincronização de Disco | Event check: `chokidar` event $\rightarrow$ UI update without reload. |
| Phase 4 $\rightarrow$ Virtualization | 3.1 Virtualização de Volume | DOM check: Constant number of `div` elements during scroll. |
| Phase 1 $\rightarrow$ Error Handle | 3.2 Tratamento de Erros | UI check: "Access Denied" toast on permission error. |
