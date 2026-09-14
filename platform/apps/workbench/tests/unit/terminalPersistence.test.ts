/**
 * Testes persistência terminal — FATIA-03.6
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { TerminalPersistenceService, MemoryPersistenceAdapter } from '../../src/logic/terminal/terminalPersistence.js';
import type { TerminalSessionState } from '../../src/logic/terminal/terminalService.js';

describe('TerminalPersistenceService - FATIA-03.6', () => {
  let persistence: MemoryPersistenceAdapter;
  let service: TerminalPersistenceService;

  beforeEach(() => {
    persistence = new MemoryPersistenceAdapter();
    service = new TerminalPersistenceService(persistence);
  });

  it('deve salvar e carregar snapshot leve (VAL-TP-01)', async () => {
    const state: TerminalSessionState = {
      sessionId: 'sess-1',
      terminalIds: ['term-1', 'term-2'],
      activeTerminalId: 'term-2',
      groups: [{ groupId: 'group-1', terminalIds: ['term-1', 'term-2'], direction: 'vertical' }],
    };

    await service.saveSnapshot(state);
    const loaded = await service.loadSnapshot('sess-1');

    expect(loaded).toEqual(state);
  });

  it('deve listar snapshots e remover (VAL-TP-02)', async () => {
    const s1: TerminalSessionState = {
      sessionId: 'sess-1',
      terminalIds: ['t1'],
      activeTerminalId: 't1',
      groups: [{ groupId: 'g1', terminalIds: ['t1'], direction: 'horizontal' }],
    };
    const s2: TerminalSessionState = {
      sessionId: 'sess-2',
      terminalIds: ['t2'],
      activeTerminalId: 't2',
      groups: [{ groupId: 'g2', terminalIds: ['t2'], direction: 'horizontal' }],
    };

    await service.saveSnapshot(s1);
    await service.saveSnapshot(s2);

    let list = await service.listSnapshots();
    expect(list).toContain('sess-1');
    expect(list).toContain('sess-2');

    await service.removeSnapshot('sess-1');
    list = await service.listSnapshots();
    expect(list).not.toContain('sess-1');
    expect(list).toContain('sess-2');
  });

  it('deve persistir apenas snapshot leve, nunca PTY (VAL-TP-03)', async () => {
    const state: TerminalSessionState = {
      sessionId: 'sess-1',
      terminalIds: ['term-1'],
      activeTerminalId: 'term-1',
      groups: [{ groupId: 'group-1', terminalIds: ['term-1'] }],
    };

    await service.saveSnapshot(state);
    const raw = await persistence.load<any>('terminal:snapshot:sess-1');

    expect(raw).toBeDefined();
    expect(raw.version).toBe(1);
    expect(raw.state).toEqual(state);
    // garante que não tem dados de PTY (output, pid, etc)
    expect(JSON.stringify(raw).includes('pty')).toBe(false);
    expect(JSON.stringify(raw).includes('output')).toBe(false);
  });

  it('loadAll deve retornar todos snapshots', async () => {
    const s1: TerminalSessionState = {
      sessionId: 'a',
      terminalIds: ['t1'],
      activeTerminalId: 't1',
      groups: [{ groupId: 'g1', terminalIds: ['t1'] }],
    };
    const s2: TerminalSessionState = {
      sessionId: 'b',
      terminalIds: ['t2'],
      activeTerminalId: 't2',
      groups: [{ groupId: 'g2', terminalIds: ['t2'] }],
    };

    await service.saveSnapshot(s1);
    await service.saveSnapshot(s2);

    const all = await service.loadAllSnapshots();
    expect(all.length).toBe(2);
    expect(all.map(s => s.sessionId).sort()).toEqual(['a', 'b']);
  });
});
