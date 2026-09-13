import { describe, it, expect } from 'vitest';
import { CommandRegistryImpl } from '../../src/logic/commands/commandRegistry.js';

describe('CommandRegistryImpl - FATIA-02', () => {
  it('deve registrar e executar comando (VAL-CMD-01)', async () => {
    const registry = new CommandRegistryImpl();
    let executed = false;
    registry.register({ id: 'test.command', title: 'Test', run: () => { executed = true; } });
    await registry.execute('test.command');
    expect(executed).toBe(true);
  });

  it('deve remover comando ao chamar dispose', async () => {
    const registry = new CommandRegistryImpl();
    const dispose = registry.register({ id: 'test', title: 'Test', run: () => {} });
    dispose();
    await expect(registry.execute('test')).rejects.toThrow();
  });

  it('deve gerenciar context keys', () => {
    const registry = new CommandRegistryImpl();
    registry.setContext('editorFocus', true);
    expect(registry.getContext('editorFocus')).toBe(true);
    registry.setContext('editorFocus', false);
    expect(registry.getContext('editorFocus')).toBe(false);
  });
});
