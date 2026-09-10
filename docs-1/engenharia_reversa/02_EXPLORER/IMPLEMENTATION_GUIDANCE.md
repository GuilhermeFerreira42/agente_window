# IMPLEMENTATION GUIDANCE: File Explorer (AGENTE WINDOW)

## 1. Architectural Blueprint
The Explorer uses a **Virtualized Lazy Tree** pattern. To maintain performance with massive projects, the system never loads the full file tree into memory; it only resolves the current visible "branch".

### Data Flow Sequence
`Expand Folder` $\rightarrow$ `ExplorerCoordinator` $\rightarrow$ `FileTreeManager` $\rightarrow$ `FileHost` $\rightarrow$ `fs.readdir` $\rightarrow$ `FileTreeManager` (Cache) $\rightarrow$ `ExplorerUI` (Render).

---

## 2. Component Specifications

### A. The Motor: `FileHost` (Node.js)
**Responsibility**: Atomic file system operations.

- **Key API**:
  - `listDirectory(uri: string): Promise<FileStat[]>`
  - `writeFile(uri: string, content: string): Promise<void>`
  - `moveResource(src: string, dest: string): Promise<void>`
  - `watchWorkspace(uri: string, callback: (event: FSEvent) => void): void`
- **Internal Logic**:
  - Use `fs.promises.readdir` with `withFileTypes: true`.
  - Implement a `Chokidar` instance per workspace root to stream changes.
- **Pitfall**: Handle "Permission Denied" (EACCES) errors gracefully without crashing the host.

### B. The Logic: `FileTreeManager` (TypeScript/Frontend)
**Responsibility**: Hierarchical state and lazy resolution.

- **Key API**:
  - `resolveChildren(parent: ExplorerItem): Promise<ExplorerItem[]>`
  - `findItemByUri(uri: string): ExplorerItem | null`
  - `updateItem(uri: string, stats: FileStat): void`
- **Data Structure**:
  - `ExplorerItem` class: `{ resource: URI, children: Map<string, ExplorerItem>, isResolved: boolean, isDirectory: boolean }`.
- **Pitfall**: Ensure the `children` map is cleared when a folder is "forgotten" to prevent memory leaks.

### C. The Workbench: `ExplorerCoordinator` (TypeScript/Frontend)
**Responsibility**: Action routing and context management.

- **Logic**:
  - **Action Routing**: Maps UI events (Right-click $\rightarrow$ "Delete") to `FileHost.delete`.
  - **Context Keys**: Maintains a state of `focusedItem` and `selectedItems` to determine which menu actions are active.
  - **Auto-Reveal**: Listens to `EditorService.onActiveEditorChange` and calls `FileTreeManager.reveal(uri)`.

### D. The Visual: `ExplorerUI` (React/Virtual List)
**Responsibility**: Rendering the tree.

- **Implementation**:
  - **Virtualized Tree**: Use a "flattened" list for rendering. A recursive tree is converted into a flat array of visible items: `[{ depth: 0, item: Root }, { depth: 1, item: FolderA }, { depth: 2, item: FileB }]`.
  - **Indentation**: Apply `padding-left: depth * 16px`.
  - **Twisties**: Only render the expand/collapse arrow if `item.isDirectory`.
- **Critical Step**: Implement a `useIntersectionObserver` or a virtual list to ensure only 20-30 rows are in the DOM at once.

---

## 3. Step-by-Step Implementation Order

1. **Setup `FileHost`**:
   - Implement `listDirectory` and `writeFile`.
   - Setup the WebSocket server for RPC.
2. **Build `FileTreeManager`**:
   - Implement the `ExplorerItem` recursive structure.
   - Create the `resolveChildren` method that calls the `FileHost`.
3. **Create the `ExplorerUI` (Basic)**:
   - Render a simple recursive list of files.
   - Implement "Expand/Collapse" functionality.
4. **Implement Virtualization**:
   - Convert the tree to a flat array.
   - Integrate a virtual list component for performance.
5. **Add Action & Sync**:
   - Implement "New File", "Rename", and "Delete".
   - Integrate `Chokidar` for live updates of the tree.

## 4. Performance & Stability Checklist
- [ ] **Tree Flattening**: Does the `flattenTree()` function run in $O(N)$ where $N$ is the number of visible nodes?
- [ ] **Memory Leak**: Are `Disposable` objects used for all WebSocket listeners and watchers?
- [ ] **I/O Throttling**: Are `refresh()` calls debounced to prevent flooding the disk during rapid changes?
- [ ] **URI Normalization**: Are all paths normalized to a consistent format (e.g., POSIX) to avoid duplicates on Windows?
