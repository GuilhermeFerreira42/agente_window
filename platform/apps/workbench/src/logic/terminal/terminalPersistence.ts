/**
 * TerminalPersistence — FATIA-03.6
 * Persistência de snapshot leve por sessão (01F)
 * - Persiste associação sessionId -> terminalIds -> layout do grupo
 * - Persiste apenas snapshot leve visual, nunca PTY
 * - Ao restaurar, reanexa ou recria instância explicitamente
 * Usa PersistencePort (localStorage, file, etc)
 */

import type { PersistencePort } from '@contracts/persistence.js';
import type { TerminalSessionState } from './terminalService.js';

const STORAGE_KEY_PREFIX = 'terminal:snapshot:';
const STORAGE_INDEX_KEY = 'terminal:snapshot:index';
const STORAGE_VERSION = 1;

interface PersistedEnvelope {
  version: number;
  timestamp: number;
  state: TerminalSessionState;
}

export class TerminalPersistenceService {
  constructor(private persistence: PersistencePort) {}

  private keyFor(sessionId: string): string {
    return `${STORAGE_KEY_PREFIX}${sessionId}`;
  }

  async saveSnapshot(state: TerminalSessionState): Promise<void> {
    const envelope: PersistedEnvelope = {
      version: STORAGE_VERSION,
      timestamp: Date.now(),
      state,
    };
    await this.persistence.save(this.keyFor(state.sessionId), envelope);

    // mantém índice de sessões com snapshot
    const index = (await this.persistence.load<string[]>(STORAGE_INDEX_KEY)) ?? [];
    if (!index.includes(state.sessionId)) {
      index.push(state.sessionId);
      await this.persistence.save(STORAGE_INDEX_KEY, index);
    }
  }

  async loadSnapshot(sessionId: string): Promise<TerminalSessionState | null> {
    const envelope = await this.persistence.load<PersistedEnvelope>(this.keyFor(sessionId));
    if (!envelope) return null;
    if (envelope.version !== STORAGE_VERSION) {
      // migração futura: por enquanto descarta se versão diferente
      // poderia implementar migração aqui
      return null;
    }
    return envelope.state;
  }

  async removeSnapshot(sessionId: string): Promise<void> {
    await this.persistence.remove(this.keyFor(sessionId));
    const index = (await this.persistence.load<string[]>(STORAGE_INDEX_KEY)) ?? [];
    const filtered = index.filter((id) => id !== sessionId);
    await this.persistence.save(STORAGE_INDEX_KEY, filtered);
  }

  async listSnapshots(): Promise<string[]> {
    const index = await this.persistence.load<string[]>(STORAGE_INDEX_KEY);
    return index ?? [];
  }

  async loadAllSnapshots(): Promise<TerminalSessionState[]> {
    const ids = await this.listSnapshots();
    const results: TerminalSessionState[] = [];
    for (const id of ids) {
      const state = await this.loadSnapshot(id);
      if (state) results.push(state);
    }
    return results;
  }
}

/**
 * Implementação browser de PersistencePort usando localStorage
 * Fallback em memória se localStorage não disponível (ex: testes)
 */
export class BrowserPersistenceAdapter implements PersistencePort {
  private memory = new Map<string, unknown>();

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  async load<T>(key: string): Promise<T | null> {
    if (this.isBrowser()) {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw === null) return null;
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    }
    return (this.memory.get(key) as T) ?? null;
  }

  async save<T>(key: string, value: T): Promise<void> {
    if (this.isBrowser()) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return;
      } catch {
        // fallback memória se quota excedida
      }
    }
    this.memory.set(key, value);
  }

  async remove(key: string): Promise<void> {
    if (this.isBrowser()) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignora
      }
    }
    this.memory.delete(key);
  }
}

/**
 * Implementação memória pura para testes
 */
export class MemoryPersistenceAdapter implements PersistencePort {
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

  clear(): void {
    this.store.clear();
  }
}
