/**
 * LayoutManager — fachada para WorkbenchLayoutService com persistência
 * FATIA-02
 */
import { WorkbenchLayoutServiceImpl } from '../../logic/workbench/workbenchLayoutService.js';
import type { WorkbenchLayoutSnapshot } from './types.js';
import type { PersistencePort } from '@contracts/persistence.js';
import { InMemoryPersistence } from '@shared/persistence/index.js';

export const LAYOUT_PERSISTENCE_KEY = 'agente-window.layout.v1';

export class LayoutManager {
  private service: WorkbenchLayoutServiceImpl;
  private persistence: PersistencePort;

  constructor(persistence?: PersistencePort, initial?: Partial<WorkbenchLayoutSnapshot>) {
    this.persistence = persistence ?? new InMemoryPersistence();
    this.service = new WorkbenchLayoutServiceImpl(initial);
  }

  getService(): WorkbenchLayoutServiceImpl {
    return this.service;
  }

  async load(): Promise<void> {
    const snapshot = await this.persistence.load<WorkbenchLayoutSnapshot>(LAYOUT_PERSISTENCE_KEY);
    if (snapshot) {
      this.service.hydrate(snapshot as never);
    }
  }

  async save(): Promise<void> {
    const snapshot = this.service.serializeInternal();
    await this.persistence.save(LAYOUT_PERSISTENCE_KEY, snapshot);
  }

  onDidChange(listener: (snap: WorkbenchLayoutSnapshot) => void): () => void {
    return this.service.onDidChange(listener);
  }
}
