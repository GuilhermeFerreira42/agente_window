// (R-035) — Shared new-session view state (LAYOUT_CONTROLLER.md §Uncreated sessions).
//
// "Uncreated sessions share a single state (sessions.newSessionViewState)".
// Quando o usuário alterna entre sessões novas (landing) a preferência de
// visibilidade da aux bar persiste entre elas e entre reloads — é um estado
// global, não por-sessão, porque a sessão ainda não existe de fato.
//
// Persiste no localStorage sob a chave NEW_SESSION_VIEW_STATE_KEY.

import type { SessionLayoutState } from './sessionLayout'

export interface NewSessionViewState {
  auxiliaryVisible: boolean
  defaultContainerId: 'changes' | 'files'
}

export const NEW_SESSION_VIEW_STATE_KEY = 'agents-new-session-layout'

export const DEFAULT_NEW_SESSION_VIEW_STATE: NewSessionViewState = {
  auxiliaryVisible: true,
  defaultContainerId: 'files',
}

/** Deriva auxiliaryVisible — útil para expressões declarativas. */
export function newSessionAuxVisible(state: NewSessionViewState): boolean {
  return state.auxiliaryVisible
}

function parse(raw: string | null): NewSessionViewState | undefined {
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed?.auxiliaryVisible !== 'boolean') return undefined
    return {
      auxiliaryVisible: parsed.auxiliaryVisible,
      defaultContainerId:
        parsed.defaultContainerId === 'changes' ? 'changes' : 'files',
    }
  } catch {
    return undefined
  }
}

type StorageLike = { getItem(key: string): string | null; setItem(key: string, value: string): void }

function storage(): StorageLike {
  if (typeof window === 'undefined') {
    // Fallback em memória para ambientes sem window (SSR, testes unitários).
    const map = new Map<string, string>()
    return {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
    }
  }
  return window.localStorage
}

/**
 * Lê o estado compartilhado de nova sessão. Aceita storage injetável para
 * testes unitários; no app real usa window.localStorage. Dados corrompidos
 * caem defensivamente no padrão.
 */
export function readNewSessionViewState(injected?: StorageLike): NewSessionViewState {
  const s = injected ?? storage()
  return parse(s.getItem(NEW_SESSION_VIEW_STATE_KEY)) ?? { ...DEFAULT_NEW_SESSION_VIEW_STATE }
}

/** Persiste o estado imediatamente (sobrevive a F5 na landing). */
export function writeNewSessionViewState(
  injected: StorageLike,
  state: NewSessionViewState,
): void
export function writeNewSessionViewState(state: NewSessionViewState): void
export function writeNewSessionViewState(
  a: StorageLike | NewSessionViewState,
  b?: NewSessionViewState,
): void {
  const s: StorageLike =
    typeof (a as StorageLike).getItem === 'function' ? (a as StorageLike) : storage()
  const state: NewSessionViewState =
    b ?? (a as NewSessionViewState)
  try {
    s.setItem(NEW_SESSION_VIEW_STATE_KEY, JSON.stringify(state))
  } catch {
    // localStorage indisponível (sandbox, quota) — degrada silenciosamente.
  }
}

/**
 * Alterna (ou define explicitamente) a visibilidade da aux bar e persiste.
 * Retorna o mesmo objeto (referência estável) quando o valor não muda — útil
 * para evitar re-renders desnecessários.
 */
export function toggleNewSessionAux(
  current: NewSessionViewState,
  next?: boolean,
): NewSessionViewState {
  const desired = next ?? !current.auxiliaryVisible
  if (desired === current.auxiliaryVisible) return current
  return { ...current, auxiliaryVisible: desired }
}

/**
 * Semeia o estado inicial de uma sessão recém-criada a partir do
 * newSessionViewState. A sessão herdará a preferência de aux bar que o usuário
 * deixou na landing, mas a partir daí o estado passa a ser por-sessão.
 */
export function seedCreatedFromNewSession(
  current: NewSessionViewState,
): SessionLayoutState {
  return {
    auxiliaryVisible: current.auxiliaryVisible,
    activeViewContainerId: current.defaultContainerId,
  }
}

