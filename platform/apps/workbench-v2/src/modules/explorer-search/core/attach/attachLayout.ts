// ============================================================================
// core/attach/attachLayout.ts — 4.7 c1. Estado de layout do Editor Anexo
// (PURO, FT-07): visibilidade por sessão, largura única por workspace
// (04_18 4.6 item 1), clamp 280–1200 px / 25–75 % (constants.ts congelado),
// persistência injetável (`explorer-search.attach.v1`).
// Regra de ouro (docs/18 Regra 10 / 04_05 §3): esconder NUNCA desmonta —
// quem consome `visible=false` aplica `display:none`.
// ============================================================================
import { ATTACH_MAX_WIDTH_PX, ATTACH_MAX_WIDTH_RATIO, ATTACH_MIN_WIDTH_PX, ATTACH_MIN_WIDTH_RATIO } from '../constants';
import { Emitter } from '../emitter';

export const ATTACH_STORAGE_KEY = 'explorer-search.attach.v1';
/** 04_05 §1: largura padrão = 46 % da largura útil da sessão. */
export const ATTACH_DEFAULT_RATIO = 0.46;
export const ATTACH_KEYBOARD_STEP_PX = 10;

export interface AttachStorageLike { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }

/** Clamp em px E em fração do container (o que for mais restritivo dos dois
 *  mínimos / máximos, como o sash do VS Code com min/max em px e %). */
export function clampAttachWidth(pixels: number, containerWidth: number): number {
  const c = Math.max(0, containerWidth || 0);
  const minR = c > 0 ? c * ATTACH_MIN_WIDTH_RATIO : 0;
  const maxR = c > 0 ? c * ATTACH_MAX_WIDTH_RATIO : Number.POSITIVE_INFINITY;
  const min = Math.max(ATTACH_MIN_WIDTH_PX, minR);
  const max = Math.min(ATTACH_MAX_WIDTH_PX, maxR);
  const p = Number.isFinite(pixels) ? pixels : min;
  // container pequeno demais → o mínimo em px vence (nunca menor que 280)
  if (max < min) return Math.round(Math.max(ATTACH_MIN_WIDTH_PX, Math.min(p, ATTACH_MAX_WIDTH_PX)));
  return Math.round(Math.max(min, Math.min(max, p)));
}

export function defaultAttachWidth(containerWidth: number): number {
  return clampAttachWidth(Math.round((containerWidth || 0) * ATTACH_DEFAULT_RATIO), containerWidth);
}

export type AttachLayoutEvent =
  | { type: 'attach.visibilityChanged'; sessionId: string; visible: boolean }
  | { type: 'attach.widthChanged'; width: number }
  /** c6: maximizado dentro da sessão (persistido junto da largura). */
  | { type: 'attach.maximizedChanged'; maximized: boolean };

export class AttachLayoutStore {
  private readonly visibleBySession = new Map<string, boolean>();
  private width: number | null = null;
  private maximized = false;
  private containerWidth = 0;
  private readonly events = new Emitter<AttachLayoutEvent>();

  constructor(private readonly storage: AttachStorageLike | null) {
    try {
      const raw = storage?.getItem(ATTACH_STORAGE_KEY);
      if (raw) {
        const v = JSON.parse(raw) as { width?: unknown; maximized?: unknown };
        if (typeof v.width === 'number' && Number.isFinite(v.width)) this.width = v.width;
        if (v.maximized === true) this.maximized = true;
      }
    } catch { this.width = null; }
  }

  onEvent(cb: (e: AttachLayoutEvent) => void): () => void { return this.events.add(cb); }

  isVisible(sessionId: string): boolean { return this.visibleBySession.get(sessionId) === true; }

  setVisible(sessionId: string, visible: boolean): void {
    if (this.isVisible(sessionId) === visible) return;
    this.visibleBySession.set(sessionId, visible);
    this.events.fire({ type: 'attach.visibilityChanged', sessionId, visible });
  }

  /** Largura do container que limita o clamp (%); informada pela UI (ResizeObserver). */
  setContainerWidth(px: number): void {
    this.containerWidth = Math.max(0, px);
  }

  getWidth(): number {
    return this.width === null ? defaultAttachWidth(this.containerWidth) : clampAttachWidth(this.width, this.containerWidth);
  }

  setWidth(pixels: number): number {
    const next = clampAttachWidth(pixels, this.containerWidth);
    if (next === this.width) return next;
    this.width = next;
    this.persist();
    this.events.fire({ type: 'attach.widthChanged', width: next });
    return next;
  }

  /** c6 — maximizado: o anexo ocupa o MÁXIMO do clamp dentro da banda da
   *  sessão (nunca position:fixed); a largura anterior fica guardada e volta
   *  no restore. Persistido (reload restaura maximizado). */
  isMaximized(): boolean { return this.maximized; }
  /** Largura efetiva quando maximizado = teto do clamp para o container atual. */
  getMaximizedWidth(): number { return clampAttachWidth(Number.MAX_SAFE_INTEGER, this.containerWidth); }
  setMaximized(maximized: boolean): void {
    if (this.maximized === maximized) return;
    this.maximized = maximized;
    this.persist();
    this.events.fire({ type: 'attach.maximizedChanged', maximized });
  }
  toggleMaximized(): boolean { this.setMaximized(!this.maximized); return this.maximized; }

  resetWidth(): number {
    this.width = null;
    if (this.maximized) this.persist();
    else { try { this.storage?.removeItem(ATTACH_STORAGE_KEY); } catch { /* storage indisponível */ } }
    const w = this.getWidth();
    this.events.fire({ type: 'attach.widthChanged', width: w });
    return w;
  }

  private persist(): void {
    try { this.storage?.setItem(ATTACH_STORAGE_KEY, JSON.stringify({ width: this.width, maximized: this.maximized })); } catch { /* storage indisponível */ }
  }

  dispose(): void { this.events.dispose(); }
}
