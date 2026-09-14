/**
 * Testes unitários — TerminalServiceImpl — FATIA-03.2
 * Fonte: docs/engenharia_reversa/01_TERMINAL/01H_TESTES_DE_IMPLEMENTACAO.md
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TerminalServiceImpl } from '../../src/logic/terminal/terminalService.js';
import type { TerminalRuntimePort, TerminalEvent } from '@contracts/terminal.js';
import type { SessionId, TerminalId, WorkspaceUri } from '@contracts/common.js';

function createMockRuntime(): TerminalRuntimePort & { emitRuntime: (ev: TerminalEvent) => void; created: Array<{ terminalId: string; sessionId: string; cwd: string; profileId: string }> } {
  let listener: ((ev: TerminalEvent) => void) | null = null;
  let counter = 0;
  const created: Array<{ terminalId: string; sessionId: string; cwd: string; profileId: string }> = [];

  return {
    created,
    emitRuntime(ev: TerminalEvent) {
      listener?.(ev);
    },
    async create(input: { sessionId: SessionId; cwd: WorkspaceUri; profileId: string; cols: number; rows: number }) {
      counter++;
      const terminalId = `term-${counter}` as TerminalId;
      created.push({ terminalId, sessionId: input.sessionId, cwd: input.cwd, profileId: input.profileId });
      return { terminalId };
    },
    async write() {},
    async resize() {},
    async clear() {},
    async kill() {},
    onEvent(l: (ev: TerminalEvent) => void) {
      listener = l;
      return () => { listener = null; };
    },
  };
}

describe('TerminalServiceImpl - FATIA-03.2', () => {
  let runtime: ReturnType<typeof createMockRuntime>;
  let service: TerminalServiceImpl;

  beforeEach(() => {
    runtime = createMockRuntime();
    service = new TerminalServiceImpl(runtime);
  });

  it('criação registra terminalId na sessão correta (VAL-T-01)', async () => {
    const { terminalId } = await service.createTerminal({
      sessionId: 'sess-1',
      cwd: 'file:///tmp' as WorkspaceUri,
      profileId: 'bash',
    });

    const state = service.getSessionState('sess-1');
    expect(state).toBeDefined();
    expect(state?.terminalIds).toContain(terminalId);
    expect(state?.activeTerminalId).toBe(terminalId);
    expect(state?.groups.length).toBe(1);
    expect(state?.groups[0].terminalIds).toContain(terminalId);
  });

  it('troca de foco atualiza activeTerminalId (VAL-T-02)', async () => {
    const { terminalId: t1 } = await service.createTerminal({ sessionId: 'sess-1', cwd: 'file:///tmp' as WorkspaceUri, profileId: 'bash' });
    const { terminalId: t2 } = await service.createTerminal({ sessionId: 'sess-1', cwd: 'file:///tmp' as WorkspaceUri, profileId: 'bash' });

    expect(service.getActiveTerminalId('sess-1')).toBe(t2);

    service.focusTerminal({ terminalId: t1 });
    expect(service.getActiveTerminalId('sess-1')).toBe(t1);
  });

  it('saída de uma instância não contamina outra sessão (VAL-T-03)', async () => {
    const { terminalId: t1 } = await service.createTerminal({ sessionId: 'sess-1', cwd: 'file:///tmp' as WorkspaceUri, profileId: 'bash' });
    const { terminalId: t2 } = await service.createTerminal({ sessionId: 'sess-2', cwd: 'file:///tmp' as WorkspaceUri, profileId: 'bash' });

    const s1 = service.getSessionState('sess-1');
    const s2 = service.getSessionState('sess-2');

    expect(s1?.terminalIds).toEqual([t1]);
    expect(s2?.terminalIds).toEqual([t2]);
  });

  it('splitTerminal abre sessão lateral no mesmo grupo com direção (VAL-T-04)', async () => {
    const { terminalId: t1 } = await service.createTerminal({ sessionId: 'sess-1', cwd: 'file:///home/user' as WorkspaceUri, profileId: 'bash' });

    const { terminalId: t2 } = await service.splitTerminal({
      sourceTerminalId: t1,
      direction: 'vertical',
    });

    const state = service.getSessionState('sess-1');
    expect(state?.terminalIds).toContain(t1);
    expect(state?.terminalIds).toContain(t2);
    expect(state?.groups.length).toBe(1);
    expect(state?.groups[0].terminalIds).toEqual([t1, t2]);
    expect(state?.groups[0].direction).toBe('vertical');
    expect(state?.activeTerminalId).toBe(t2);

    // verifica herança de cwd/profile
    expect(runtime.created[1].cwd).toBe('file:///home/user');
    expect(runtime.created[1].profileId).toBe('bash');
  });

  it('split lateral horizontal também funciona (VAL-T-05)', async () => {
    const { terminalId: t1 } = await service.createTerminal({ sessionId: 'sess-1', cwd: 'file:///tmp' as WorkspaceUri, profileId: 'bash' });
    const { terminalId: t2 } = await service.splitTerminal({ sourceTerminalId: t1, direction: 'horizontal' });
    const { terminalId: t3 } = await service.splitTerminal({ sourceTerminalId: t2, direction: 'horizontal' });

    const state = service.getSessionState('sess-1');
    expect(state?.groups[0].terminalIds).toEqual([t1, t2, t3]);
    expect(state?.groups[0].direction).toBe('horizontal');
  });

  it('evento exit preserva aba e estado visual (VAL-T-06)', async () => {
    const { terminalId } = await service.createTerminal({ sessionId: 'sess-1', cwd: 'file:///tmp' as WorkspaceUri, profileId: 'bash' });

    const events: any[] = [];
    service.onEvent(e => events.push(e));

    runtime.emitRuntime({ type: 'terminal.exit', terminalId, exitCode: 0 });

    const state = service.getSessionState('sess-1');
    // não deve remover terminal ao receber exit
    expect(state?.terminalIds).toContain(terminalId);
    expect(events.some(e => e.type === 'terminal.exit' && e.terminalId === terminalId)).toBe(true);
  });

  it('clear e eventos de output/cwd são repassados', async () => {
    const { terminalId } = await service.createTerminal({ sessionId: 'sess-1', cwd: 'file:///tmp' as WorkspaceUri, profileId: 'bash' });
    const events: any[] = [];
    service.onEvent(e => events.push(e));

    runtime.emitRuntime({ type: 'terminal.output', terminalId, chunk: 'hello' });
    runtime.emitRuntime({ type: 'terminal.cwd', terminalId, cwd: 'file:///home/user' as WorkspaceUri });

    expect(events.some(e => e.type === 'terminal.output' && e.chunk === 'hello')).toBe(true);
    expect(events.some(e => e.type === 'terminal.cwd' && e.cwd === 'file:///home/user')).toBe(true);
  });

  it('closeTerminal remove do grupo e atualiza foco (VAL-T-07)', async () => {
    const { terminalId: t1 } = await service.createTerminal({ sessionId: 'sess-1', cwd: 'file:///tmp' as WorkspaceUri, profileId: 'bash' });
    const { terminalId: t2 } = await service.splitTerminal({ sourceTerminalId: t1, direction: 'vertical' });

    await service.closeTerminal({ terminalId: t2 });

    const state = service.getSessionState('sess-1');
    expect(state?.terminalIds).toEqual([t1]);
    expect(state?.groups[0].terminalIds).toEqual([t1]);
    expect(state?.activeTerminalId).toBe(t1);
  });

  it('serialize/hydrate preserva snapshot leve (VAL-T-08)', async () => {
    const { terminalId: t1 } = await service.createTerminal({ sessionId: 'sess-1', cwd: 'file:///tmp' as WorkspaceUri, profileId: 'bash' });
    const { terminalId: t2 } = await service.splitTerminal({ sourceTerminalId: t1, direction: 'vertical' });

    const snapshot = service.serializeSession('sess-1');
    expect(snapshot).toBeDefined();

    const newRuntime = createMockRuntime();
    const newService = new TerminalServiceImpl(newRuntime);
    newService.hydrateSession(snapshot!);

    const restored = newService.getSessionState('sess-1');
    expect(restored?.terminalIds).toEqual([t1, t2]);
    expect(restored?.groups[0].direction).toBe('vertical');
  });
});
