export interface TerminalInstance {
  key: string
  ordinal: number
  ptySessionId: string
  label: string
  shellId?: string
}

export interface TerminalInstancesState {
  instances: TerminalInstance[]
  activeKey: string
  nextOrdinal: number
}

function buildKey(ordinal: number) {
  return `t${ordinal}`
}

function buildPtySessionId(agentSessionId: string, ordinal: number) {
  return `${agentSessionId}:${ordinal}`
}

export function formatTerminalInstanceLabel(baseLabel: string, ordinal: number) {
  return ordinal === 0 ? baseLabel : `${ordinal + 1}: ${baseLabel}`
}

function buildInstance(agentSessionId: string, ordinal: number, baseLabel: string, shellId?: string): TerminalInstance {
  return {
    key: buildKey(ordinal),
    ordinal,
    ptySessionId: buildPtySessionId(agentSessionId, ordinal),
    label: formatTerminalInstanceLabel(baseLabel, ordinal),
    shellId,
  }
}

export function createInitialTerminalInstances(agentSessionId: string, baseLabel = 'bash', shellId?: string): TerminalInstancesState {
  const initial = buildInstance(agentSessionId, 0, baseLabel, shellId)
  return {
    instances: [initial],
    activeKey: initial.key,
    nextOrdinal: 1,
  }
}

export function getActiveTerminalInstance(state: TerminalInstancesState): TerminalInstance | undefined {
  return state.instances.find((instance) => instance.key === state.activeKey)
}

export function openTerminalInstance(
  state: TerminalInstancesState,
  agentSessionId: string,
  baseLabel = 'bash',
  shellId?: string,
  preferredOrdinal?: number,
): TerminalInstancesState {
  const ordinal = preferredOrdinal ?? state.nextOrdinal
  const ptySessionId = buildPtySessionId(agentSessionId, ordinal)
  const existing = state.instances.find((instance) => instance.ptySessionId === ptySessionId)

  if (existing) {
    return {
      ...state,
      activeKey: existing.key,
      nextOrdinal: Math.max(state.nextOrdinal, ordinal + 1),
    }
  }

  const instance = buildInstance(agentSessionId, ordinal, baseLabel, shellId)
  return {
    instances: [...state.instances, instance],
    activeKey: instance.key,
    nextOrdinal: Math.max(state.nextOrdinal, ordinal + 1),
  }
}

export function setActiveTerminalInstance(state: TerminalInstancesState, key: string): TerminalInstancesState {
  if (state.activeKey === key) return state
  if (!state.instances.some((instance) => instance.key === key)) return state
  return { ...state, activeKey: key }
}

export function updateTerminalInstance(
  state: TerminalInstancesState,
  key: string,
  patch: Partial<Pick<TerminalInstance, 'label' | 'shellId'>>,
): TerminalInstancesState {
  let changed = false
  const instances = state.instances.map((instance) => {
    if (instance.key !== key) return instance

    const next = { ...instance, ...patch }
    if (next.label !== instance.label || next.shellId !== instance.shellId) {
      changed = true
      return next
    }
    return instance
  })

  return changed ? { ...state, instances } : state
}

export function closeTerminalInstance(state: TerminalInstancesState, key: string): TerminalInstancesState {
  const index = state.instances.findIndex((instance) => instance.key === key)
  if (index === -1) return state

  const instances = state.instances.filter((instance) => instance.key !== key)
  if (instances.length === 0) {
    return {
      instances: [],
      activeKey: '',
      nextOrdinal: state.nextOrdinal,
    }
  }

  const nextActiveKey = state.activeKey === key
    ? instances[Math.max(0, index - 1)]?.key ?? instances[0].key
    : state.activeKey

  return {
    ...state,
    instances,
    activeKey: nextActiveKey,
  }
}
