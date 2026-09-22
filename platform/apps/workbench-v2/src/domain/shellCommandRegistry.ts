// ============================================================================
// domain/shellCommandRegistry.ts — adapter CommandRegistryLike do shell.
// Referência upstream (04_10 §2.4): MenuRegistry/CommandsRegistry do VS Code —
// aqui um registry mínimo de id→run + contextos when, injetado como dep do
// módulo explorer-search (que NUNCA toca o shell diretamente — LEGO).
// ============================================================================

import type { CommandRegistryLike } from '../modules/explorer-search';

export function createShellCommandRegistry(): CommandRegistryLike {
  const commands = new Map<string, { title: string; run: (ctx?: unknown) => Promise<void> | void }>();
  const contexts = new Map<string, boolean | string | number>();

  return {
    register(command) {
      commands.set(command.id, { title: command.title, run: command.run });
      return () => {
        commands.delete(command.id);
      };
    },
    async execute(commandId, ctx) {
      const cmd = commands.get(commandId);
      if (!cmd) {
        console.warn(`[shellCommandRegistry] comando desconhecido: ${commandId}`);
        return;
      }
      await cmd.run(ctx);
    },
    setContext(key, value) {
      contexts.set(key, value);
    },
    getContext(key) {
      return contexts.get(key);
    },
  };
}
