// ============================================================================
// shell/persistenciaDeAbas.ts — Fatia 15, Onda 3 (D160).
//
// A memória de abas entre recarregamentos (F5). Saía do App.tsx porque é uma
// responsabilidade com fronteira própria: lê/escreve `localStorage`, fala com o
// módulo só pelo barrel, e não toca em estado do React.
//
// FATIA-05 5.7 fix (DoD "F5 mantém as 3 abas", 2026-10-01): o módulo persiste
// largura/maximizado, mas NÃO as abas (fato da 4.7, D2.70). O shell guarda a
// lista por sessão e reabre no boot — só `kind: 'code'`, porque `diff`/`changes`
// têm payload que não faz sentido ressuscitar de um JSON.
//
// Todo acesso ao storage está em try/catch: modo privado e cota estourada são
// situações normais, e perder a memória de abas não pode derrubar o app.
// ============================================================================
import type { IExplorerSearchModule, WorkspaceUri } from '../modules/explorer-search'

// FATIA-05 5.7 fix: chave da lista de abas por sessão.
const ATTACH_TABS_KEY = 'workbench.attachTabs.v1'

/** FATIA 09 (§3.8): qual sessão estava aberta — o F5 volta para ELA e a conversa
 *  (restaurada do .jsonl) aparece na hora. */
export const ACTIVE_SESSION_KEY = 'workbench.sessions.active.v1'

export type PersistedAttachTab = { uri: WorkspaceUri; pinned: boolean; active: boolean; presentation?: 'code' | 'preview' }

export function loadAttachTabs(): Record<string, PersistedAttachTab[]> {
  try {
    const raw = window.localStorage.getItem(ATTACH_TABS_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, PersistedAttachTab[]>) : {}
  } catch { return {} }
}

export function snapshotAttachTabs(module: IExplorerSearchModule, sessionId: string): void {
  try {
    const tabs = module.attach.getTabs({ sessionId })
      .filter((t) => t.kind === 'code')
      .map((t): PersistedAttachTab => ({ uri: t.uri, pinned: !t.preview, active: !!t.active, ...(t.presentation ? { presentation: t.presentation } : {}) }))
    const all = loadAttachTabs()
    if (tabs.length) all[sessionId] = tabs
    else delete all[sessionId]
    window.localStorage.setItem(ATTACH_TABS_KEY, JSON.stringify(all))
  } catch { /* quota/privado: ignora */ }
}

export function restoreAttachTabs(module: IExplorerSearchModule): void {
  const all = loadAttachTabs()
  for (const [sessionId, tabs] of Object.entries(all)) {
    if (!Array.isArray(tabs)) continue
    // ativa por último = fica ativa
    const ordered = [...tabs.filter((t) => !t.active), ...tabs.filter((t) => t.active)]
    for (const t of ordered) void module.attach.open({ uri: t.uri, kind: 'code', sessionId, pinned: t.pinned, ...(t.presentation ? { presentation: t.presentation } : {}) })
  }
}
