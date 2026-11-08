import { describe, expect, it, vi } from 'vitest';
import { createShellCommandRegistry } from './shellCommandRegistry';

describe('posse do registro de comandos', () => {
  it('cleanup antigo não apaga comando substituto durante troca de módulo', async () => {
    const registry = createShellCommandRegistry(), old = vi.fn(), current = vi.fn();
    const removeOld = registry.register({ id: 'open', title: 'Antigo', run: old });
    const removeCurrent = registry.register({ id: 'open', title: 'Atual', run: current });
    removeOld();
    await registry.execute('open');
    expect(old).not.toHaveBeenCalled();
    expect(current).toHaveBeenCalledOnce();
    removeCurrent();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await registry.execute('open');
    expect(current).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
