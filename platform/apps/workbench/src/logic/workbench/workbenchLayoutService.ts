/**
 * WorkbenchLayoutService — implementação FATIA-02
 * Fonte: docs/04_CONTRATOS_TECNICOS.md seção 8 + 09F/09G/09I
 * 
 * Responsabilidade: dono da geometria e visibilidade do workbench.
 * Regras:
 * - layout é dono da geometria, não os módulos filhos
 * - persistência versionada
 * - foco global e parte ativa observáveis
 */

import type { WorkbenchLayoutService, WorkbenchLayoutSnapshot } from '@contracts/workbench.js';
import type { ViewId } from '@contracts/common.js';
import {
  DEFAULT_ACTIVE_VIEWS,
  DEFAULT_DIMENSIONS,
  DEFAULT_PART_VISIBILITY,
  type WorkbenchPartVisibility,
  type WorkbenchLayoutSnapshot as InternalSnapshot,
} from '../../workbench/layout/types.js';

export type LayoutChangeListener = (snapshot: InternalSnapshot) => void;

export class WorkbenchLayoutServiceImpl implements WorkbenchLayoutService {
  private visibility: WorkbenchPartVisibility;
  private dimensions: Record<string, number>;
  private activeViews: Record<string, string>;
  private maximizedPanel: string | null = null;
  private previousDimensions: Record<string, number> | null = null;
  private listeners = new Set<LayoutChangeListener>();

  constructor(initial?: Partial<InternalSnapshot>) {
    this.visibility = { ...DEFAULT_PART_VISIBILITY, ...(initial?.visibleParts ?? {}) };
    this.dimensions = { ...DEFAULT_DIMENSIONS, ...(initial?.dimensions ?? {}) };
    this.activeViews = { ...DEFAULT_ACTIVE_VIEWS, ...(initial?.activeViews ?? {}) };
    this.maximizedPanel = initial?.maximizedPanel ?? null;
    this.previousDimensions = initial?.previousDimensions ?? null;
  }

  togglePart(input: { part: 'leftSidebar' | 'rightSidebar' | 'panel' | 'auxiliaryBar' }): void {
    const part = input.part as keyof WorkbenchPartVisibility;
    if (!(part in this.visibility)) return;
    this.visibility = { ...this.visibility, [part]: !this.visibility[part] };
    this.emit();
  }

  // Compatível com contrato que aceita string genérica
  togglePartGeneric(part: string): void {
    if (part in this.visibility) {
      this.togglePart({ part: part as 'leftSidebar' | 'rightSidebar' | 'panel' | 'auxiliaryBar' });
    }
  }

  resizePart(input: { part: string; pixels: number }): void {
    const { part, pixels } = input;
    if (!Number.isFinite(pixels) || pixels < 0) return;
    // Clamp básico para evitar valores absurdos
    const clamped = Math.min(800, Math.max(0, Math.round(pixels)));
    this.dimensions = { ...this.dimensions, [part]: clamped };
    this.emit();
  }

  maximizePanel(input: { panelId: ViewId }): void {
    const panelId = input.panelId;
    // Se já maximizado no mesmo painel, ignora
    if (this.maximizedPanel === panelId) return;
    // Salva dimensões anteriores para restore
    this.previousDimensions = { ...this.dimensions };
    this.maximizedPanel = panelId;
    this.emit();
  }

  restorePanel(input: { panelId: ViewId }): void {
    const panelId = input.panelId;
    if (this.maximizedPanel !== panelId && this.maximizedPanel !== null) {
      // Se pediram restore de painel diferente do maximizado, ignora por segurança
      // mas permite restore geral se panelId for o maximizado
      if (panelId !== this.maximizedPanel) return;
    }
    if (this.previousDimensions) {
      this.dimensions = { ...this.previousDimensions };
    }
    this.maximizedPanel = null;
    this.previousDimensions = null;
    this.emit();
  }

  splitEditor(input: { direction: 'horizontal' | 'vertical' }): void {
    // FATIA-02: placeholder para compatibilidade com contrato
    // A implementação real de split de editor central vem na FATIA-06
    // Por enquanto, apenas emite evento para que UI possa reagir futuramente
    void input;
    this.emit();
  }

  serialize(): WorkbenchLayoutSnapshot {
    // Converte para formato do contrato público (que usa ViewId)
    return {
      version: 1,
      visibleParts: Object.keys(this.visibility).filter(k => this.visibility[k as keyof WorkbenchPartVisibility]) as unknown as string[],
      dimensions: { ...this.dimensions },
      activeViews: this.activeViews as unknown as Record<string, ViewId>,
    } as unknown as WorkbenchLayoutSnapshot;
  }

  serializeInternal(): InternalSnapshot {
    return {
      version: 1,
      visibleParts: { ...this.visibility },
      dimensions: { ...this.dimensions },
      activeViews: { ...this.activeViews },
      maximizedPanel: this.maximizedPanel,
      previousDimensions: this.previousDimensions ? { ...this.previousDimensions } : null,
    };
  }

  hydrate(snapshot: WorkbenchLayoutSnapshot): void {
    // Suporta tanto formato novo (com visibleParts como objeto) quanto antigo (array)
    const snap = snapshot as unknown as InternalSnapshot & { visibleParts: unknown };
    if (Array.isArray(snap.visibleParts)) {
      // Formato antigo do contrato: array de strings visíveis
      const visibleArray = snap.visibleParts as unknown as string[];
      const newVis: WorkbenchPartVisibility = { ...DEFAULT_PART_VISIBILITY };
      (Object.keys(newVis) as (keyof WorkbenchPartVisibility)[]).forEach(k => {
        newVis[k] = visibleArray.includes(k);
      });
      this.visibility = newVis;
    } else if (snap.visibleParts && typeof snap.visibleParts === 'object') {
      this.visibility = { ...DEFAULT_PART_VISIBILITY, ...(snap.visibleParts as WorkbenchPartVisibility) };
    }
    if (snap.dimensions) this.dimensions = { ...DEFAULT_DIMENSIONS, ...snap.dimensions };
    if (snap.activeViews) this.activeViews = { ...DEFAULT_ACTIVE_VIEWS, ...snap.activeViews };
    if ('maximizedPanel' in snap) this.maximizedPanel = (snap as InternalSnapshot).maximizedPanel ?? null;
    if ('previousDimensions' in snap) this.previousDimensions = (snap as InternalSnapshot).previousDimensions ?? null;
    this.emit();
  }

  // API adicional para FATIA-02 (não está no contrato mínimo mas útil para testes e UI)
  getVisibility(): WorkbenchPartVisibility {
    return { ...this.visibility };
  }

  getDimensions(): Record<string, number> {
    return { ...this.dimensions };
  }

  getMaximizedPanel(): string | null {
    return this.maximizedPanel;
  }

  onDidChange(listener: LayoutChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    const snapshot = this.serializeInternal();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch {
        // Ignora erro de listener para não quebrar layout
      }
    }
  }
}
