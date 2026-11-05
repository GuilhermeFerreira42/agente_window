// ============================================================================
// modules/explorer-search/core/emitter.ts — Emitter mínimo (padrão VS Code).
// Core puro: sem imports, sem DOM, sem fs.
// ============================================================================

export type Listener<T> = (e: T) => void;

/** Emitter minimalista (espelho do Emitter do VS Code, subset).
 *  add() retorna remover (padrão do contrato onEvent). */
export class Emitter<T> {
  private listeners = new Set<Listener<T>>();

  add(cb: Listener<T>): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  fire(e: T): void {
    // Cópia defensiva: um listener pode remover outro durante o fire.
    for (const cb of [...this.listeners]) {
      cb(e);
    }
  }

  hasListeners(): boolean {
    return this.listeners.size > 0;
  }

  dispose(): void {
    this.listeners.clear();
  }
}
