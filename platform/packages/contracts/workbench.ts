/**
 * Contrato do Workbench / Layout — AGENTE WINDOW
 * Fonte: docs/04_CONTRATOS_TECNICOS.md seção 8 + docs/engenharia_reversa/09_WORKBENCH_LAYOUT/09F
 */
import type { ViewId } from './common.js';

export interface WorkbenchLayoutService {
  togglePart(input: { part: 'leftSidebar' | 'rightSidebar' | 'panel' | 'auxiliaryBar' }): void;
  resizePart(input: { part: string; pixels: number }): void;
  maximizePanel(input: { panelId: ViewId }): void;
  restorePanel(input: { panelId: ViewId }): void;
  splitEditor(input: { direction: 'horizontal' | 'vertical' }): void;
  serialize(): WorkbenchLayoutSnapshot;
  hydrate(snapshot: WorkbenchLayoutSnapshot): void;
}

export interface WorkbenchLayoutSnapshot {
  version: 1;
  visibleParts: string[];
  dimensions: Record<string, number>;
  activeViews: Record<string, ViewId>;
}
