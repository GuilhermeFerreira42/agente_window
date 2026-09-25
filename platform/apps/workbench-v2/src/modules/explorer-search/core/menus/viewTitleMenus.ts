// ============================================================================
// modules/explorer-search/core/menus/viewTitleMenus.ts — Menu de contexto dos
// pane-headers do Explorer (upstream `MenuId.ViewTitleContext`) e menu "Views"
// (toggles de visibilidade das views do container).
//
// Régua viva (code-server 8080, 2026-09-25 — auditoria_45/c5/header_*.png):
//   botão direito em QUALQUER pane-header (Folders/Outline/Timeline):
//     Hide '<view>'            (desabilitado quando a view é a Folders)
//     ‖
//     ☐ Open Editors           (menuitemcheckbox; OCULTA por padrão no VS Code)
//     ☑ Folders (desabilitado) (sempre visível — não pode ser escondida)
//     ☑ Outline
//     ☑ Timeline
//   "Views and More Actions..." do título → só os 4 toggles.
// Upstream: workbench/browser/parts/views/viewPane.ts (onContextMenu →
//   ViewTitleContext), viewPaneContainer.ts (`Hide '${view.name}'` +
//   ViewsSubMenu / `canToggleVisibility`).
// NÃO entram (ADIADO 4.7 — dropdown "More Actions..." do Outline, exige
//   símbolos reais): Follow Cursor / Filter on Type / Sort By.
// Decisões 2026-09-25 (usuário): (1) escopo = Hide + toggles; (2) Open Editors
//   OCULTA por padrão (fidelidade ao VS Code).
// ============================================================================

import type { ResolvedMenuItem } from './explorerMenus';

export type ExplorerViewId = 'openEditors' | 'folders' | 'outline' | 'timeline';

/** Ordem do VS Code no menu de toggles (viewPaneContainer: ordem de registro das views). */
export const EXPLORER_VIEWS: ReadonlyArray<{ id: ExplorerViewId; label: string; canToggleVisibility: boolean }> = [
  { id: 'openEditors', label: 'Open Editors', canToggleVisibility: true },
  { id: 'folders', label: 'Folders', canToggleVisibility: false },
  { id: 'outline', label: 'Outline', canToggleVisibility: true },
  { id: 'timeline', label: 'Timeline', canToggleVisibility: true },
];

export type ExplorerViewsVisibility = Record<ExplorerViewId, boolean>;

/** Padrão do VS Code (medido): Open Editors oculta; demais visíveis. */
export const DEFAULT_VIEWS_VISIBILITY: ExplorerViewsVisibility = {
  openEditors: false, folders: true, outline: true, timeline: true,
};

export const VIEW_HIDE_COMMAND_PREFIX = 'explorer.views.hide.';
export const VIEW_TOGGLE_COMMAND_PREFIX = 'explorer.views.toggle.';
export const viewHideCommandId = (id: ExplorerViewId): string => `${VIEW_HIDE_COMMAND_PREFIX}${id}`;
export const viewToggleCommandId = (id: ExplorerViewId): string => `${VIEW_TOGGLE_COMMAND_PREFIX}${id}`;

export function viewLabel(id: ExplorerViewId): string {
  return EXPLORER_VIEWS.find((v) => v.id === id)?.label ?? id;
}

/** Toggles de visibilidade (grupo `2_views`) — usados no header e no "…". */
export function resolveViewsToggleMenu(visibility: ExplorerViewsVisibility, baseOrder = 100): ResolvedMenuItem[] {
  return EXPLORER_VIEWS.map((v, i) => ({
    id: viewToggleCommandId(v.id),
    label: v.label,
    enabled: v.canToggleVisibility,
    group: '2_views',
    order: baseOrder + i,
    checked: visibility[v.id],
  }));
}

/** Menu do pane-header: `Hide '<view>'` ‖ toggles. */
export function resolveViewTitleContextMenu(target: ExplorerViewId, visibility: ExplorerViewsVisibility): ResolvedMenuItem[] {
  const view = EXPLORER_VIEWS.find((v) => v.id === target);
  const hide: ResolvedMenuItem = {
    id: viewHideCommandId(target),
    label: `Hide '${view?.label ?? target}'`,
    enabled: view?.canToggleVisibility ?? false,
    group: '1_hide',
    order: 0,
  };
  return [hide, ...resolveViewsToggleMenu(visibility)];
}

/** Aplica um toggle/hide respeitando `canToggleVisibility` (Folders nunca some). */
export function applyViewVisibility(
  visibility: ExplorerViewsVisibility,
  id: ExplorerViewId,
  next: boolean,
): ExplorerViewsVisibility {
  const view = EXPLORER_VIEWS.find((v) => v.id === id);
  if (!view || !view.canToggleVisibility) return visibility;
  if (visibility[id] === next) return visibility;
  return { ...visibility, [id]: next };
}

/** Sanitiza o que vier da persistência (chaves desconhecidas ignoradas; Folders forçada true). */
export function normalizeViewsVisibility(raw: unknown): ExplorerViewsVisibility {
  const out: ExplorerViewsVisibility = { ...DEFAULT_VIEWS_VISIBILITY };
  if (raw && typeof raw === 'object') {
    for (const v of EXPLORER_VIEWS) {
      const val = (raw as Record<string, unknown>)[v.id];
      if (typeof val === 'boolean') out[v.id] = v.canToggleVisibility ? val : true;
    }
  }
  return out;
}
