/**
 * Tipos do Workbench Layout — FATIA-02
 * Fonte: docs/engenharia_reversa/09_WORKBENCH_LAYOUT/09F + docs/04_CONTRATOS
 */

export interface WorkbenchPartVisibility {
  leftSidebar: boolean;
  rightSidebar: boolean;
  panel: boolean;
  auxiliaryBar: boolean;
  statusBar: boolean;
}

export const DEFAULT_PART_VISIBILITY: WorkbenchPartVisibility = {
  leftSidebar: true,
  rightSidebar: false,
  panel: false,
  auxiliaryBar: true,
  statusBar: true,
};

export interface WorkbenchLayoutSnapshot {
  version: 1;
  visibleParts: WorkbenchPartVisibility;
  dimensions: Record<string, number>;
  activeViews: Record<string, string>;
  maximizedPanel?: string | null;
  previousDimensions?: Record<string, number> | null;
}

export const DEFAULT_DIMENSIONS: Record<string, number> = {
  leftSidebar: 300,
  rightSidebar: 300,
  panel: 300,
  auxiliaryBar: 300,
};

export const DEFAULT_ACTIVE_VIEWS: Record<string, string> = {
  leftSidebar: 'explorer',
  rightSidebar: 'chat',
  panel: 'terminal',
  auxiliaryBar: 'files',
};
