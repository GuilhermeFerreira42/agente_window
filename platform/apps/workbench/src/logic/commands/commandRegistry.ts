/**
 * CommandRegistry — implementação FATIA-02
 * Fonte: docs/04_CONTRATOS_TECNICOS.md seção 11 + docs/engenharia_reversa/07_COMMAND_MENU/07F
 * 
 * Regra: menus e atalhos disparam comandos; não executam lógica de negócio inline.
 */

import type { CommandRegistry } from '@contracts/commands.js';

type CommandHandler = { id: string; title: string; run: () => Promise<void> | void };

export class CommandRegistryImpl implements CommandRegistry {
  private commands = new Map<string, CommandHandler>();
  private contexts = new Map<string, boolean | string | number>();
  private contextListeners = new Set<(key: string, value: boolean | string | number) => void>();

  register(command: CommandHandler): () => void {
    this.commands.set(command.id, command);
    return () => this.commands.delete(command.id);
  }

  async execute(commandId: string): Promise<void> {
    const cmd = this.commands.get(commandId);
    if (!cmd) throw new Error(`Command not found: ${commandId}`);
    await cmd.run();
  }

  setContext(key: string, value: boolean | string | number): void {
    this.contexts.set(key, value);
    for (const listener of this.contextListeners) {
      try {
        listener(key, value);
      } catch {
        // ignora
      }
    }
  }

  getContext(key: string): boolean | string | number | undefined {
    return this.contexts.get(key);
  }

  listCommands(): CommandHandler[] {
    return Array.from(this.commands.values());
  }

  onContextChanged(listener: (key: string, value: boolean | string | number) => void): () => void {
    this.contextListeners.add(listener);
    return () => this.contextListeners.delete(listener);
  }
}
