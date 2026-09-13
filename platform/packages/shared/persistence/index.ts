/**
 * Persistência — implementação base in-memory para validação da FATIA-01
 * Contrato: PersistencePort
 */
import type { PersistencePort } from '@contracts/persistence.js';

export class InMemoryPersistence implements PersistencePort {
  private store = new Map<string, unknown>();

  async load<T>(key: string): Promise<T | null> {
    return (this.store.get(key) as T) ?? null;
  }

  async save<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }
}

export type { PersistencePort };
