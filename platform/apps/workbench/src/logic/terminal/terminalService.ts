/**
 * TerminalService — FATIA-03.2
 * Fonte: docs/engenharia_reversa/01_TERMINAL/01F_CONTRATO_DE_IMPLEMENTACAO.md
 *       docs/04_CONTRATOS_TECNICOS.md seção 4 + 01G/01I
 *
 * Responsabilidade: gerenciar instâncias, grupos, sessão ativa e snapshots leves.
 * Isolamento por sessionId. Não conhece React. Depende apenas de TerminalRuntimePort.
 *
 * Eventos mínimos emitidos:
 * - terminal.created { terminalId, sessionId, profileId }
 * - terminal.output { terminalId, chunk }
 * - terminal.exit { terminalId, exitCode }
 * - terminal.cwd { terminalId, cwd }
 * - terminal.focusChanged { terminalId }
 * - terminal.closed { terminalId, sessionId }
 */

import type { SessionId, TerminalId, WorkspaceUri } from '@contracts/common.js';
import type { TerminalRuntimePort, TerminalEvent } from '@contracts/terminal.js';

export interface TerminalSessionState {
  sessionId: SessionId;
  terminalIds: TerminalId[];
  activeTerminalId: TerminalId | null;
  groups: Array<{
    groupId: string;
    terminalIds: TerminalId[];
    direction?: 'horizontal' | 'vertical';
  }>;
}

export interface TerminalServiceContract {
  createTerminal(input: {
    sessionId: SessionId;
    cwd: WorkspaceUri;
    profileId: string;
    cols?: number;
    rows?: number;
  }): Promise<{ terminalId: TerminalId }>;
  splitTerminal(input: {
    sourceTerminalId: TerminalId;
    direction: 'horizontal' | 'vertical';
    cwd?: WorkspaceUri;
    profileId?: string;
  }): Promise<{ terminalId: TerminalId }>;
  focusTerminal(input: { terminalId: TerminalId }): void;
  closeTerminal(input: { terminalId: TerminalId }): Promise<void>;
  write(input: { terminalId: TerminalId; data: string }): Promise<void>;
  resize(input: { terminalId: TerminalId; cols: number; rows: number }): Promise<void>;
  clear(input: { terminalId: TerminalId }): Promise<void>;
  // adicionais para UI e testes
  getSessionState(sessionId: SessionId): TerminalSessionState | undefined;
  getAllSessionStates(): TerminalSessionState[];
  getTerminalSessionId(terminalId: TerminalId): SessionId | undefined;
  getActiveTerminalId(sessionId: SessionId): TerminalId | null;
  onEvent(listener: (event: TerminalServiceEvent) => void): () => void;
  dispose(): void;
}

export type TerminalServiceEvent =
  | { type: 'terminal.created'; terminalId: TerminalId; sessionId: SessionId; profileId: string }
  | { type: 'terminal.output'; terminalId: TerminalId; chunk: string }
  | { type: 'terminal.exit'; terminalId: TerminalId; exitCode: number | null }
  | { type: 'terminal.cwd'; terminalId: TerminalId; cwd: WorkspaceUri }
  | { type: 'terminal.focusChanged'; terminalId: TerminalId; sessionId: SessionId }
  | { type: 'terminal.closed'; terminalId: TerminalId; sessionId: SessionId }
  | { type: 'terminal.groupChanged'; sessionId: SessionId; groups: TerminalSessionState['groups'] };

interface InternalTerminalMeta {
  sessionId: SessionId;
  profileId: string;
  cwd: WorkspaceUri;
  exitCode: number | null;
}

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

export class TerminalServiceImpl implements TerminalServiceContract {
  private sessions = new Map<SessionId, TerminalSessionState>();
  private terminalMeta = new Map<TerminalId, InternalTerminalMeta>();
  private terminalToGroup = new Map<TerminalId, string>(); // terminalId -> groupId
  private listeners = new Set<(event: TerminalServiceEvent) => void>();
  private runtimeUnsub: (() => void) | null = null;

  constructor(private runtime: TerminalRuntimePort) {
    // escuta eventos do runtime e repassa
    this.runtimeUnsub = this.runtime.onEvent((ev: TerminalEvent) => {
      this.handleRuntimeEvent(ev);
    });
  }

  // --- criação ---

  async createTerminal(input: {
    sessionId: SessionId;
    cwd: WorkspaceUri;
    profileId: string;
    cols?: number;
    rows?: number;
  }): Promise<{ terminalId: TerminalId }> {
    const { sessionId, cwd, profileId, cols = 80, rows = 24 } = input;

    // garante estado da sessão
    let state = this.sessions.get(sessionId);
    if (!state) {
      state = {
        sessionId,
        terminalIds: [],
        activeTerminalId: null,
        groups: [],
      };
      this.sessions.set(sessionId, state);
    }

    // chama runtime real
    const { terminalId } = await this.runtime.create({
      sessionId,
      cwd,
      profileId,
      cols,
      rows,
    });

    // registra meta
    this.terminalMeta.set(terminalId, {
      sessionId,
      profileId,
      cwd,
      exitCode: null,
    });

    // adiciona à sessão
    state.terminalIds.push(terminalId);
    state.activeTerminalId = terminalId;

    // grupo: se não há grupos, cria primeiro grupo com direção padrão
    if (state.groups.length === 0) {
      const groupId = generateId('group');
      state.groups.push({
        groupId,
        terminalIds: [terminalId],
        direction: 'horizontal',
      });
      this.terminalToGroup.set(terminalId, groupId);
    } else {
      // por padrão, adiciona ao grupo ativo (último grupo que contém active anterior ou primeiro)
      // para manter compatibilidade com "nova aba" abrindo no grupo principal
      const targetGroup = this.findGroupForTerminal(state, state.activeTerminalId) ?? state.groups[0];
      if (targetGroup) {
        // se já tem terminals, mantém; se for split futuro, adiciona lateralmente
        // aqui, para create simples, adiciona ao mesmo grupo mas não altera direction
        if (!targetGroup.terminalIds.includes(terminalId)) {
          targetGroup.terminalIds.push(terminalId);
        }
        this.terminalToGroup.set(terminalId, targetGroup.groupId);
      }
    }

    this.emit({ type: 'terminal.created', terminalId, sessionId, profileId });
    this.emit({ type: 'terminal.focusChanged', terminalId, sessionId });
    this.emit({ type: 'terminal.groupChanged', sessionId, groups: state.groups });

    return { terminalId };
  }

  // --- split lateral (abre ao lado) ---

  async splitTerminal(input: {
    sourceTerminalId: TerminalId;
    direction: 'horizontal' | 'vertical';
    cwd?: WorkspaceUri;
    profileId?: string;
  }): Promise<{ terminalId: TerminalId }> {
    const { sourceTerminalId, direction, cwd: overrideCwd, profileId: overrideProfileId } = input;
    const sourceMeta = this.terminalMeta.get(sourceTerminalId);
    if (!sourceMeta) {
      throw new Error(`Terminal source não encontrado: ${sourceTerminalId}`);
    }

    const sessionId = sourceMeta.sessionId;
    const state = this.sessions.get(sessionId);
    if (!state) {
      throw new Error(`Sessão não encontrada para terminal ${sourceTerminalId}`);
    }

    const sourceGroupId = this.terminalToGroup.get(sourceTerminalId);
    const sourceGroup = sourceGroupId
      ? state.groups.find(g => g.groupId === sourceGroupId)
      : undefined;

    // cwd herdado da origem, profile herdado se não sobrescrito (regra 01B §2.1)
    const cwd = overrideCwd ?? sourceMeta.cwd;
    const profileId = overrideProfileId ?? sourceMeta.profileId;

    const { terminalId } = await this.runtime.create({
      sessionId,
      cwd,
      profileId,
      cols: 80,
      rows: 24,
    });

    this.terminalMeta.set(terminalId, {
      sessionId,
      profileId,
      cwd,
      exitCode: null,
    });

    state.terminalIds.push(terminalId);
    state.activeTerminalId = terminalId;

    if (sourceGroup) {
      // split lateral: adiciona ao mesmo grupo e define direção
      sourceGroup.direction = direction;
      if (!sourceGroup.terminalIds.includes(terminalId)) {
        // insere após o source para manter ordem visual
        const idx = sourceGroup.terminalIds.indexOf(sourceTerminalId);
        if (idx >= 0) {
          sourceGroup.terminalIds.splice(idx + 1, 0, terminalId);
        } else {
          sourceGroup.terminalIds.push(terminalId);
        }
      }
      this.terminalToGroup.set(terminalId, sourceGroup.groupId);
    } else {
      // fallback: cria novo grupo com source + novo lado a lado
      const groupId = generateId('group');
      state.groups.push({
        groupId,
        terminalIds: [sourceTerminalId, terminalId],
        direction,
      });
      this.terminalToGroup.set(sourceTerminalId, groupId);
      this.terminalToGroup.set(terminalId, groupId);
    }

    this.emit({ type: 'terminal.created', terminalId, sessionId, profileId });
    this.emit({ type: 'terminal.focusChanged', terminalId, sessionId });
    this.emit({ type: 'terminal.groupChanged', sessionId, groups: state.groups });

    return { terminalId };
  }

  // --- foco ---

  focusTerminal(input: { terminalId: TerminalId }): void {
    const { terminalId } = input;
    const meta = this.terminalMeta.get(terminalId);
    if (!meta) return;
    const state = this.sessions.get(meta.sessionId);
    if (!state) return;
    if (!state.terminalIds.includes(terminalId)) return;

    state.activeTerminalId = terminalId;
    this.emit({ type: 'terminal.focusChanged', terminalId, sessionId: meta.sessionId });
  }

  // --- write / resize / clear (para UI) ---

  async write(input: { terminalId: TerminalId; data: string }): Promise<void> {
    await this.runtime.write(input);
  }

  async resize(input: { terminalId: TerminalId; cols: number; rows: number }): Promise<void> {
    await this.runtime.resize(input);
  }

  async clear(input: { terminalId: TerminalId }): Promise<void> {
    await this.runtime.clear(input);
  }

  // --- fechar ---

  async closeTerminal(input: { terminalId: TerminalId }): Promise<void> {
    const { terminalId } = input;
    const meta = this.terminalMeta.get(terminalId);
    if (!meta) return;

    const sessionId = meta.sessionId;
    const state = this.sessions.get(sessionId);

    try {
      await this.runtime.kill({ terminalId });
    } catch {
      // ignora erro de kill se já fechado
    }

    // remove de grupos
    const groupId = this.terminalToGroup.get(terminalId);
    if (groupId && state) {
      const group = state.groups.find(g => g.groupId === groupId);
      if (group) {
        group.terminalIds = group.terminalIds.filter(id => id !== terminalId);
        // se grupo ficou vazio, remove grupo
        if (group.terminalIds.length === 0) {
          state.groups = state.groups.filter(g => g.groupId !== groupId);
        }
      }
    }
    this.terminalToGroup.delete(terminalId);

    // remove da sessão
    if (state) {
      state.terminalIds = state.terminalIds.filter(id => id !== terminalId);
      if (state.activeTerminalId === terminalId) {
        // foca último restante ou null
        state.activeTerminalId = state.terminalIds.length > 0 ? state.terminalIds[state.terminalIds.length - 1] : null;
        if (state.activeTerminalId) {
          this.emit({ type: 'terminal.focusChanged', terminalId: state.activeTerminalId, sessionId });
        }
      }
      // se sessão ficou sem terminais, mantém estado vazio (não deleta automaticamente para permitir recriação)
      this.emit({ type: 'terminal.groupChanged', sessionId, groups: state.groups });
    }

    this.terminalMeta.delete(terminalId);
    this.emit({ type: 'terminal.closed', terminalId, sessionId });
  }

  // --- getters ---

  getSessionState(sessionId: SessionId): TerminalSessionState | undefined {
    const state = this.sessions.get(sessionId);
    if (!state) return undefined;
    // retorna cópia para evitar mutação externa
    return {
      sessionId: state.sessionId,
      terminalIds: [...state.terminalIds],
      activeTerminalId: state.activeTerminalId,
      groups: state.groups.map(g => ({ ...g, terminalIds: [...g.terminalIds] })),
    };
  }

  getAllSessionStates(): TerminalSessionState[] {
    return Array.from(this.sessions.values()).map(s => this.getSessionState(s.sessionId)!);
  }

  getTerminalSessionId(terminalId: TerminalId): SessionId | undefined {
    return this.terminalMeta.get(terminalId)?.sessionId;
  }

  getActiveTerminalId(sessionId: SessionId): TerminalId | null {
    return this.sessions.get(sessionId)?.activeTerminalId ?? null;
  }

  // --- eventos runtime ---

  private handleRuntimeEvent(ev: TerminalEvent): void {
    switch (ev.type) {
      case 'terminal.output': {
        this.emit({ type: 'terminal.output', terminalId: ev.terminalId, chunk: ev.chunk });
        break;
      }
      case 'terminal.exit': {
        const meta = this.terminalMeta.get(ev.terminalId);
        if (meta) {
          meta.exitCode = ev.exitCode;
        }
        // regra 01F proibição: não limpar automaticamente aba ao receber exit
        // apenas reporta, preserva estado visual
        this.emit({ type: 'terminal.exit', terminalId: ev.terminalId, exitCode: ev.exitCode });
        break;
      }
      case 'terminal.cwd': {
        const meta = this.terminalMeta.get(ev.terminalId);
        if (meta) {
          meta.cwd = ev.cwd;
        }
        this.emit({ type: 'terminal.cwd', terminalId: ev.terminalId, cwd: ev.cwd });
        break;
      }
    }
  }

  // --- event bus ---

  onEvent(listener: (event: TerminalServiceEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: TerminalServiceEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // ignora erro de listener
      }
    }
  }

  private findGroupForTerminal(state: TerminalSessionState, terminalId: TerminalId | null): TerminalSessionState['groups'][number] | undefined {
    if (!terminalId) return state.groups[0];
    const groupId = this.terminalToGroup.get(terminalId);
    if (!groupId) return state.groups[0];
    return state.groups.find(g => g.groupId === groupId) ?? state.groups[0];
  }

  // --- integração opcional com persistência (FATIA-03.6) ---
  private persistenceUnsub: (() => void) | null = null;

  attachPersistence(persistenceService: { saveSnapshot: (state: TerminalSessionState) => Promise<void> }): () => void {
    // salva automaticamente em groupChanged, created, closed, focusChanged
    const unsub = this.onEvent((ev) => {
      if (ev.type === 'terminal.groupChanged' || ev.type === 'terminal.created' || ev.type === 'terminal.closed' || ev.type === 'terminal.focusChanged') {
        const sessionId = (ev as any).sessionId as SessionId;
        const state = this.getSessionState(sessionId);
        if (state) {
          void persistenceService.saveSnapshot(state);
        }
      }
    });
    this.persistenceUnsub = unsub;
    return unsub;
  }

  dispose(): void {
    if (this.runtimeUnsub) {
      this.runtimeUnsub();
      this.runtimeUnsub = null;
    }
    if (this.persistenceUnsub) {
      this.persistenceUnsub();
      this.persistenceUnsub = null;
    }
    this.listeners.clear();
    this.sessions.clear();
    this.terminalMeta.clear();
    this.terminalToGroup.clear();
  }

  // --- snapshot leve para persistência (01F) ---
  serializeSession(sessionId: SessionId): TerminalSessionState | null {
    return this.getSessionState(sessionId) ?? null;
  }

  hydrateSession(state: TerminalSessionState): void {
    // hidrata apenas estrutura visual, não recria PTY automaticamente
    // o chamador deve decidir se reanexa ou recria via runtime
    this.sessions.set(state.sessionId, {
      sessionId: state.sessionId,
      terminalIds: [...state.terminalIds],
      activeTerminalId: state.activeTerminalId,
      groups: state.groups.map(g => ({ ...g, terminalIds: [...g.terminalIds] })),
    });
    for (const group of state.groups) {
      for (const tid of group.terminalIds) {
        this.terminalToGroup.set(tid, group.groupId);
        // meta placeholder se ainda não existe (será preenchida ao recriar)
        if (!this.terminalMeta.has(tid)) {
          this.terminalMeta.set(tid, {
            sessionId: state.sessionId,
            profileId: 'bash',
            cwd: 'file:///tmp' as WorkspaceUri,
            exitCode: null,
          });
        }
      }
    }
  }
}
