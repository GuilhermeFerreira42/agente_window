# REFERENCIA ORIGINAL - CUSTOM VIEW GRID

## Original: sessions/LAYOUT.md

```
Custom View Grid: Full-surface contributed views that replace session content

At most one high-priority surface is visible in main horizontal chain: normally Sessions Part, or Custom View Grid while custom view active. This prevents fixed side parts from absorbing general window resize.

ICustomViewService owns active contributed full-surface view.

A custom view is mutually exclusive with Sessions Part, grid Editor, Auxiliary Bar, Panel. Title bar e Sidebar remain available. Covered parts retain desired visibility separately from effective grid visibility so state can be restored when custom view closes.

Opening a session dismisses active custom view. On phone layouts, custom views participate in mobile navigation so platform back navigation dismisses them.
```

## Original: sessions/browser/parts/customViewGridPart.ts + customViewGridParts.ts + customViewNode.ts

```ts
export class CustomViewGridPart {
  // Full-surface view que substitui session content
  // Quando ativo, esconde Sessions Part, Editor, Aux Bar, Panel
  // Só Titlebar e Sidebar ficam
  // Abrir sessão dismiss custom view
}
```

## Original: sessions/contrib/aiCustomizationTreeView/browser/aiCustomizationTreeView.ts

Custom view de AI Customizations é exemplo de Custom View Grid - mostra tree de agents/skills/MCP
