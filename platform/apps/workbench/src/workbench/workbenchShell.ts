/**
 * WorkbenchShell — carcaça do produto — FATIA-02
 * Fonte: docs/03_ARQUITETURA_EXECUTAVEL.md + 09F/09G
 * 
 * Responsabilidade: hospedar partes visuais e distribuir espaço, sem assumir lógica interna dos subsistemas.
 * Pode consumir contratos da Lógica, nunca detalhes de Runtime.
 */

import { LayoutManager } from './layout/layoutManager.js';
import { CommandRegistryImpl } from '../logic/commands/commandRegistry.js';
import type { PersistencePort } from '@contracts/persistence.js';

export interface WorkbenchShellOptions {
  persistence?: PersistencePort;
}

export class WorkbenchShell {
  public readonly layout: LayoutManager;
  public readonly commands: CommandRegistryImpl;

  constructor(options?: WorkbenchShellOptions) {
    this.layout = new LayoutManager(options?.persistence);
    this.commands = new CommandRegistryImpl();
    this.registerDefaultCommands();
  }

  private registerDefaultCommands(): void {
    // Comandos básicos de layout — VAL-WB-01, VAL-CMD-01
    this.commands.register({
      id: 'workbench.action.toggleSidebar',
      title: 'Toggle Sidebar',
      run: () => this.layout.getService().togglePart({ part: 'leftSidebar' }),
    });
    this.commands.register({
      id: 'workbench.action.toggleAuxiliaryBar',
      title: 'Toggle Auxiliary Bar',
      run: () => this.layout.getService().togglePart({ part: 'auxiliaryBar' }),
    });
    this.commands.register({
      id: 'workbench.action.togglePanel',
      title: 'Toggle Panel',
      run: () => this.layout.getService().togglePart({ part: 'panel' }),
    });
    this.commands.register({
      id: 'workbench.action.maximizePanel',
      title: 'Maximize Panel',
      run: () => this.layout.getService().maximizePanel({ panelId: 'terminal' }),
    });
    this.commands.register({
      id: 'workbench.action.restorePanel',
      title: 'Restore Panel',
      run: () => this.layout.getService().restorePanel({ panelId: 'terminal' }),
    });
  }

  async init(): Promise<void> {
    await this.layout.load();
  }

  async persist(): Promise<void> {
    await this.layout.save();
  }
}
