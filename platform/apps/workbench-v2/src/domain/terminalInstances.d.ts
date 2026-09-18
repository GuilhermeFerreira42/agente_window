export interface TerminalInstance {
    key: string;
    ordinal: number;
    ptySessionId: string;
    label: string;
    shellId?: string;
}
export interface TerminalInstancesState {
    instances: TerminalInstance[];
    activeKey: string;
    nextOrdinal: number;
}
export declare function formatTerminalInstanceLabel(baseLabel: string, ordinal: number): string;
export declare function createInitialTerminalInstances(agentSessionId: string, baseLabel?: string, shellId?: string): TerminalInstancesState;
export declare function getActiveTerminalInstance(state: TerminalInstancesState): TerminalInstance | undefined;
export declare function openTerminalInstance(state: TerminalInstancesState, agentSessionId: string, baseLabel?: string, shellId?: string, preferredOrdinal?: number): TerminalInstancesState;
export declare function setActiveTerminalInstance(state: TerminalInstancesState, key: string): TerminalInstancesState;
export declare function updateTerminalInstance(state: TerminalInstancesState, key: string, patch: Partial<Pick<TerminalInstance, 'label' | 'shellId'>>): TerminalInstancesState;
export declare function closeTerminalInstance(state: TerminalInstancesState, key: string): TerminalInstancesState;
//# sourceMappingURL=terminalInstances.d.ts.map