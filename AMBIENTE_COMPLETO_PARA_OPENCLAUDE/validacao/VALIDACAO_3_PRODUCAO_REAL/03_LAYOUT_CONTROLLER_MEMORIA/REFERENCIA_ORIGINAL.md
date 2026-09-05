# REFERENCIA ORIGINAL - LAYOUT CONTROLLER

## Original: sessions/contrib/layout/browser/baseSessionLayoutController.md - Regras B1-B5

```md
B1 — Panel visibility é lembrado por sessão e defaults to hidden. Toggling panel updates that session's remembered state.

B2 — Cada sessão restaura seu próprio set de open editors quando ativa. Switching sessions salva editores que tinha aberto e aplica target session's. New/untitled sessions, e sessions com no saved editors, nunca force editor area open ou wipe it.

B3 — Restored on start: On startup cada session's saved layout é restored. Corrupt data é ignored.

B4 — Saved on close: Closing/reloading app salva every session's current layout

B5 — Fall back to defaults: While multiple sessions visible, per-session panel restore é paused e remembered panel/auxiliary-bar state for those sessions é discarded, so collapsing back to single session shows default layout instead of stale state. Open editors ainda preservados.
```

## Original: sessions/contrib/layout/browser/desktopSessionLayoutController.md - Regras D1-D9

```md
D1 — When you switch away from a session, its current side-pane state é captured for that session.

D2 — Immediately when you toggle it: Opening/closing side pane é captured right away, not only when you switch sessions. Suspended while multiple sessions visible, while editor maximized (D5), while controller hides side pane to restore session's remembered state.

D3 — Restore priority:
- D3a — No session / no workspace → nothing changes.
- D3b — A new (uncreated) session → all new sessions share one remembered side-pane state. If you explicitly closed side pane it stays closed (across switches *and* reloads); otherwise opens to default view (D3d).
- D3c — Existing (created) session → side pane é never opened automatically on restore. If it was closed or has no remembered state stays closed; if open and view still exists reopens; if view gone fallback to default (D3d).
- D3d — Default view → Files until session has produced at least one file change, Changes from then on.

D4 — Submitting a new session: When new session becomes created while staying active, side pane stays exactly as you left it.

D5 — Maximizing editor: While editor maximized, side pane always shows Changes, regardless of saved state. Forced state not remembered.

D9 — Closing whole side pane is not an aux-bar choice: "side pane" is editor + auxiliary bar. Closing it hides both at once. For existing session not remembered as choice to hide side pane, so reopening Changes editor shows it again (D8) - even across reload.

D9b — Closing whole side pane on a new session is remembered: For new (uncreated) session, closing/opening whole side pane IS recorded as shared new-session side-pane choice (D3b).
```

## Original: sessions/browser/dockedAuxiliaryBarController.ts

```ts
// Original controla transição Detail-only: FECHA abas não-acopladas, CAPTURA restauráveis, DESCARTA não-restauráveis
export function enterDetailOnly() {
  // fecha abas não-acopladas (mantém Changes/Files), captura restauráveis (Browser/Customizations)
}

export function showEditorRestore() {
  // restaura capturadas ao fim
}
```

## Original: LAYOUT.md - Grid behavior

```
Main workbench grid is non-proportional. Sessions Part is flexible surface that absorbs container resize and part-visibility deltas. Sidebar, Editor, Auxiliary Bar, Panel preserve user-established sizes.
At most one high-priority surface is visible: normally Sessions Part, or Custom View Grid while custom view active.
```
