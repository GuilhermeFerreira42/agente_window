/**
 * E2E do Terminal — FATIA-03.7
 * Fluxo obrigatório 01H:
 * 1. abrir terminal
 * 2. maximizar
 * 3. restaurar
 * 4. dividir em dois (lateral)
 * 5. digitar em ambos os lados
 * 6. executar clear
 * 7. trocar de sessão e voltar
 * 8. verificar ausência de sujeira visual ou roteamento de input
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TerminalServiceImpl } from '../../src/logic/terminal/terminalService.js';
import { WorkbenchLayoutServiceImpl } from '../../src/logic/workbench/workbenchLayoutService.js';
import { MemoryPersistenceAdapter, TerminalPersistenceService } from '../../src/logic/terminal/terminalPersistence.js';
import type { TerminalRuntimePort, TerminalEvent } from '@contracts/terminal.js';
import type { SessionId, TerminalId, WorkspaceUri } from '@contracts/common.js';

function createMockRuntime() {
  let listener: ((ev: TerminalEvent) => void) | null = null;
  let counter = 0;
  const writes = new Map<TerminalId, string[]>();
  const created: Array<{ terminalId: TerminalId; sessionId: SessionId }> = [];

  return {
    writes,
    created,
    emit(ev: TerminalEvent) {
      listener?.(ev);
    },
    async create(input: { sessionId: SessionId; cwd: WorkspaceUri; profileId: string; cols: number; rows: number }) {
      counter++;
      const terminalId = `term-${counter}` as TerminalId;
      writes.set(terminalId, []);
      created.push({ terminalId, sessionId: input.sessionId });
      // simula output inicial
      setTimeout(() => {
        listener?.({ type: 'terminal.output', terminalId, chunk: `Welcome ${input.profileId}\r\n` });
      }, 0);
      return { terminalId };
    },
    async write(input: { terminalId: TerminalId; data: string }) {
      const arr = writes.get(input.terminalId) ?? [];
      arr.push(input.data);
      writes.set(input.terminalId, arr);
      // ecoa de volta como output (simula shell)
      listener?.({ type: 'terminal.output', terminalId: input.terminalId, chunk: input.data });
    },
    async resize() {},
    async clear(input: { terminalId: TerminalId }) {
      listener?.({ type: 'terminal.output', terminalId: input.terminalId, chunk: '\x1b[2J\x1b[H' });
    },
    async kill() {},
    onEvent(l: (ev: TerminalEvent) => void) {
      listener = l;
      return () => { listener = null; };
    },
  } as unknown as TerminalRuntimePort & { writes: Map<TerminalId, string[]>; created: Array<{ terminalId: TerminalId; sessionId: SessionId }>; emit: (ev: TerminalEvent) => void };
}

describe('Terminal E2E — FATIA-03.7', () => {
  let runtime: ReturnType<typeof createMockRuntime>;
  let terminalService: TerminalServiceImpl;
  let layoutService: WorkbenchLayoutServiceImpl;
  let persistence: MemoryPersistenceAdapter;
  let persistenceService: TerminalPersistenceService;

  beforeEach(() => {
    runtime = createMockRuntime();
    terminalService = new TerminalServiceImpl(runtime);
    layoutService = new WorkbenchLayoutServiceImpl();
    persistence = new MemoryPersistenceAdapter();
    persistenceService = new TerminalPersistenceService(persistence);
    terminalService.attachPersistence(persistenceService);
  });

  it('fluxo completo: abrir, maximizar, restaurar, dividir, digitar, clear, trocar sessão', async () => {
    const sessionId = 'sess-e2e' as SessionId;
    const cwd = 'file:///tmp' as WorkspaceUri;

    // 1. abrir terminal
    const { terminalId: t1 } = await terminalService.createTerminal({ sessionId, cwd, profileId: 'bash' });
    expect(terminalService.getSessionState(sessionId)?.terminalIds).toContain(t1);

    // 2. maximizar painel terminal
    layoutService.maximizePanel({ panelId: 'terminal' });
    expect(layoutService.getMaximizedPanel()).toBe('terminal');

    // 3. restaurar
    layoutService.restorePanel({ panelId: 'terminal' });
    expect(layoutService.getMaximizedPanel()).toBeNull();

    // 4. dividir em dois (lateral)
    const { terminalId: t2 } = await terminalService.splitTerminal({ sourceTerminalId: t1, direction: 'horizontal' });
    const stateAfterSplit = terminalService.getSessionState(sessionId)!;
    expect(stateAfterSplit.groups[0].terminalIds).toEqual([t1, t2]);
    expect(stateAfterSplit.groups[0].direction).toBe('horizontal');
    expect(stateAfterSplit.terminalIds.length).toBe(2);

    // 5. digitar em ambos os lados — verifica isolamento de input
    await terminalService.write({ terminalId: t1, data: 'echo hello t1\r' });
    await terminalService.write({ terminalId: t2, data: 'echo hello t2\r' });

    expect(runtime.writes.get(t1)).toContain('echo hello t1\r');
    expect(runtime.writes.get(t2)).toContain('echo hello t2\r');
    // garante que input não foi para terminal errado
    expect(runtime.writes.get(t1)).not.toContain('echo hello t2\r');
    expect(runtime.writes.get(t2)).not.toContain('echo hello t1\r');

    // 6. executar clear no ativo (t2)
    const events: any[] = [];
    terminalService.onEvent(e => events.push(e));
    await terminalService.clear({ terminalId: t2 });
    // clear não deve fechar sessão
    expect(terminalService.getSessionState(sessionId)?.terminalIds).toContain(t2);

    // 7. trocar de sessão e voltar
    const otherSessionId = 'sess-other' as SessionId;
    const { terminalId: tOther } = await terminalService.createTerminal({ sessionId: otherSessionId, cwd, profileId: 'bash' });

    // foca outra sessão
    terminalService.focusTerminal({ terminalId: tOther });
    expect(terminalService.getActiveTerminalId(otherSessionId)).toBe(tOther);

    // volta para sessão original, foca t1
    terminalService.focusTerminal({ terminalId: t1 });
    expect(terminalService.getActiveTerminalId(sessionId)).toBe(t1);

    // 8. verificar ausência de sujeira visual ou roteamento — estado consistente
    const finalState = terminalService.getSessionState(sessionId)!;
    expect(finalState.terminalIds).toEqual([t1, t2]);
    expect(finalState.activeTerminalId).toBe(t1);
    expect(finalState.groups[0].terminalIds).toEqual([t1, t2]);

    // verifica persistência salvou snapshot
    const saved = await persistenceService.loadSnapshot(sessionId);
    expect(saved).toBeDefined();
    expect(saved?.terminalIds).toEqual([t1, t2]);
    expect(saved?.groups[0].direction).toBe('horizontal');

    // simula exit preservando aba (01E §3.1)
    runtime.emit({ type: 'terminal.exit', terminalId: t1, exitCode: 0 });
    expect(terminalService.getSessionState(sessionId)?.terminalIds).toContain(t1); // não removeu
  });

  it('regressão: input não vai para terminal errado após split e foco', async () => {
    const sessionId = 'sess-regress' as SessionId;
    const cwd = 'file:///tmp' as WorkspaceUri;

    const { terminalId: t1 } = await terminalService.createTerminal({ sessionId, cwd, profileId: 'bash' });
    const { terminalId: t2 } = await terminalService.splitTerminal({ sourceTerminalId: t1, direction: 'vertical' });
    const { terminalId: t3 } = await terminalService.splitTerminal({ sourceTerminalId: t2, direction: 'vertical' });

    // foca t2
    terminalService.focusTerminal({ terminalId: t2 });
    await terminalService.write({ terminalId: t2, data: 'ls\r' });

    expect(runtime.writes.get(t2)).toContain('ls\r');
    expect(runtime.writes.get(t1)).not.toContain('ls\r');
    expect(runtime.writes.get(t3)).not.toContain('ls\r');
  });
});
