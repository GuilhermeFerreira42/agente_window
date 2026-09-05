# REFERENCIA ORIGINAL - LAYOUT TOPOLOGIA

## Original: sessions/LAYOUT.md

```
Workbench topology:
Title bar
Content
├── Sidebar
└── Main region
    ├── Sessions Part | Editor | Auxiliary Bar | Custom View Grid
    └── Panel

Workbench omits standard Activity Bar, Status Bar, Banner. Part positions fixed by Agents Window rather than user settings.

| Part | Ownership |
| Title bar | Window navigation e window-scoped actions |
| Sidebar | Sessions list e Sessions-owned sidebar views |
| Sessions Part | One or more visible session surfaces |
| Editor | File, browser, diff, other editor inputs |
| Auxiliary Bar | Session details such as changes e files |
| Panel | Terminal e other panel views |
| Custom View Grid | Full-surface contributed views que replace session content |

Sessions Part contains its own horizontal grid. Its leaves são not workbench editor groups.

Grid behavior:
Main workbench grid is non-proportional. Sessions Part é flexible surface que absorbs container resize e part-visibility deltas. Sidebar, Editor, Auxiliary Bar, Panel preserve user-established sizes within constraints.

At most one high-priority surface é visible in main horizontal chain: normally Sessions Part, or Custom View Grid while custom view active. This prevents fixed side parts from absorbing general window resize.

Single-pane presentation may place Auxiliary Bar inside Editor's grid node. Consumers must distinguish actual Editor content area from shared grid node when interpreting visibility or size.
```

## Original: sessions/browser/media/workbench.css + sessionsPart.css + sidebarPart.css

```css
/* workbench.css - Sessions Part é flexível */
.monaco-workbench .part.sessionspart {
  /* flexible - absorve resize */
}
.monaco-workbench .part.editor:not(.modal-editor-part) {
  background: var(--vscode-agentsPanel-background);
  border: 1px solid var(--vscode-agentsPanel-border);
  border-radius: 8px;
}
.monaco-workbench.nosessionspart .part.sessionspart {
  display: none !important;
}

/* sidebarPart.css - Sidebar title draggable */
.agent-sessions-workbench .part.sidebar > .composite.title > .titlebar-drag-region {
  -webkit-app-region: drag;
}
```

## Original: sessions/browser/parts/editorPart.ts

```ts
export class MainEditorPart extends MainEditorPartBase {
  static readonly MARGIN_TOP = 0;
  override priority = LayoutPriority.Normal; // Editor preserva tamanho, Sessions Part é flexible que absorve delta
  override layout(width, height, top, left) {
    // keepForDockedTabBar: single-pane keeps tab bar visible even when editor hidden
  }
}
```
