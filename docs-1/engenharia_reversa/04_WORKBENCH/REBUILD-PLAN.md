# REBUILD PLAN: Workbench Layout & Shell (AGENTE WINDOW)

## 1. Executive Summary
Objective: Implement the core architectural shell of the application, creating a modular, resizeable, and state-driven workbench that replicates the professional feel of VS Code. This shell acts as the host for the Terminal, Explorer, and Chat modules.

## 2. Structural Mapping (VS Code $\rightarrow$ AGENTE WINDOW)

| VS Code Component | AGENTE WINDOW Layer | Component Name | Responsibility |
|---|---|---|---|
| `workbench.ts` / `layout.ts` | **Workbench (Shell)** | `WorkbenchShell` | Root container and orchestration of layout parts. |
| `layoutService.ts` | **Logic (Services)** | `LayoutManager` | Managing visibility, positioning, and dimensions of parts. |
| `part.ts` | **Visual (UI)** | `WorkbenchPart` | Abstract base class for all UI sections (Sidebar, Panel, etc.). |
| `grid.ts` | **Motor (Runtime)** | `LayoutEngine` | The low-level math for calculating coordinates and handling resize events. |

## 3. Implementation Phases

### Phase 1: The Root Shell (Workbench Container)
- **Goal**: Create the basic HTML/CSS structure that defines the "Professional IDE" look.
- **Tasks**:
  - Implement the `WorkbenchShell` component (Root layout).
  - Create the `WorkbenchPart` container system.
  - Setup the initial layout: Activity Bar (Left), Sidebar (Left), Editor Area (Center), Panel (Bottom), Status Bar (Bottom).
  - **Validation**: A static page that looks like a professional IDE with all areas in place.

### Phase 2: The Layout Engine (Motor)
- **Goal**: Enable the "Dynamic" part of the workbench: visibility and resizing.
- **Tasks**:
  - Implement the `LayoutManager` state machine (Visibility: `HIDDEN` | `VISIBLE`).
  - Create the `ResizeHandler` using mouse events to update part widths/heights.
  - Implement the `layout()` loop to redistribute space when a part is toggled.
  - **Validation**: User can toggle the Sidebar and Panel, and the Editor expands/contracts in real-time.

### Phase 3: High-Fidelity Part Implementation (Visual)
- **Goal**: Replace static placeholders with functional UI components.
- **Tasks**:
  - Implement the `ActivityBar` (Icon-based navigation).
  - Implement the `Sidebar` (Container for views like Explorer/Chat).
  - Implement the `Panel` (Container for Terminal/Output).
  - Implement the `StatusBar` (Contextual information).
  - **Validation**: Each part is visually distinct and correctly positioned.

### Phase 4: The Editor Area & Tab System
- **Goal**: Implement the central workspace for files and agent interaction.
- **Tasks**:
  - Create the `EditorGroup` container.
  - Implement the `TabStrip` (Render list of open editors).
  - Implement the `SplitView` logic (Vertical/Horizontal split).
  - **Validation**: User can open multiple "tabs" and split the editor area.

### Phase 5: Global Modes & Persistence
- **Goal**: Add the "Polish" and professional features.
- **Tasks**:
  - Implement `ZenMode` (Global visibility override).
  - Implement `LayoutPersistence` (Save/Load layout state from `localStorage`).
  - Add responsive adjustments for different window sizes.
  - **Validation**: Layout persists after page reload; Zen Mode works as specified.

## 4. Critical Dependencies
- **State Management**: `Zustand` (recommended for Layout state due to performance).
- **Styling**: `Tailwind CSS` (for rapid layout prototyping) or `CSS Modules` (for strict isolation).
- **DOM API**: `ResizeObserver` API for monitoring container changes.

## 5. Validation Matrix (Linking to Layer E)

| Implementation Step | Acceptance Criterion (Layer E) | Validation Method |
|---|---|---|
| Phase 2 $\rightarrow$ Toggles | AC-1.1, AC-1.2 | UI check: Toggling Sidebar/Panel updates layout. |
| Phase 2 $\rightarrow$ Resize | AC-2.1 | Interaction check: Dragging border updates size. |
| Phase 5 $\rightarrow$ Zen Mode | AC-3.1 | UI check: All non-essential parts disappear. |
| Phase 5 $\rightarrow$ Persistence | AC-3.3 | State check: Layout restored after reload. |
| Phase 4 $\rightarrow$ Split | AC-4.1 | UI check: Editor splits into two equal columns. |
