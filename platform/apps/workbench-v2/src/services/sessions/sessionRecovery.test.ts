import { afterEach, expect, it, vi } from 'vitest'
import { testSessions } from '../../__tests__/fixtures/sessions'
import { descartarRecuperacoesExcluidas, mergeHydratedSessions, readSessionRecoveries, restoreUnsavedSessions, storeSessionRecovery } from './sessionRecovery'
import { persistSession, resumeSessionPersistence } from './sessionsClient'

afterEach(() => { localStorage.clear(); vi.unstubAllGlobals() })

it('retains drafts and newly edited local sessions when delayed hydration finishes', () => {
  const draft = { ...testSessions[0], id: crypto.randomUUID(), isDraft: true }
  const edit = { ...testSessions[0], id: crypto.randomUUID(), title: 'edit while loading' }
  const remote = { ...edit, title: 'older remote' }
  const other = { ...testSessions[0], id: crypto.randomUUID() }
  expect(mergeHydratedSessions([draft, edit], [remote, other])).toEqual([draft, edit, other])
})

it('does not grant a new remote base to a divergent backup after reload', async () => {
  const local = { ...testSessions[0], id: crypto.randomUUID(), persistenceRevision: 1 }
  const remote = { ...local, title: 'remote changed', persistenceRevision: 2 }
  resumeSessionPersistence(local)
  storeSessionRecovery({ session: local, message: 'fixture', kind: 'unavailable' })
  restoreUnsavedSessions([remote])
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
  await expect(persistSession(local)).rejects.toMatchObject({ status: 409 })
  expect(fetcher).not.toHaveBeenCalled()
})

it('P-C §5 — 410 preserva a cópia marcada como EXCLUÍDA: não ressuscita o original nem some do registro (PC-R2)', async () => {
  const excluida = { ...testSessions[0], id: crypto.randomUUID(), persistenceRevision: 1 }
  const rascunho = { ...testSessions[0], id: crypto.randomUUID() }
  storeSessionRecovery({ session: excluida, message: 'fixture', kind: 'unavailable' })
  storeSessionRecovery({ session: rascunho, message: 'fixture', kind: 'local' })
  const consultas: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    consultas.push(String(input))
    return { status: String(input).includes(excluida.id) ? 410 : 404, ok: false } as Response
  }))
  await descartarRecuperacoesExcluidas([{ id: rascunho.id }])
  const restantes = readSessionRecoveries()
  expect(consultas).toHaveLength(1)
  // 404 = nunca confirmada no servidor → rascunho local legítimo permanece.
  expect(restantes.map((recovery) => recovery.session.id)).toContain(rascunho.id)
  // 410 = excluída → a cópia é PRESERVADA e marcada (nunca descartada): o
  // registro fica disponível para oferecer uma cópia em vez de sumir.
  const marcada = restantes.find((recovery) => recovery.session.id === excluida.id)
  expect(marcada).toBeDefined()
  expect(marcada?.kind).toBe('excluida')
  // A identidade marcada não reanexa na restauração (a lista nunca a ressuscita)…
  const restauradas = restoreUnsavedSessions([]).map((session) => session.id)
  expect(restauradas).not.toContain(excluida.id)
  // …enquanto o rascunho nunca confirmado continua sendo restaurado.
  expect(restauradas).toContain(rascunho.id)
})

it('P-C §5 — falha de consulta local não destrói cópia (storage indisponível preserva conteúdo)', async () => {
  const local = { ...testSessions[0], id: crypto.randomUUID() }
  storeSessionRecovery({ session: local, message: 'fixture', kind: 'unavailable' })
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
  await descartarRecuperacoesExcluidas([])
  expect(readSessionRecoveries().map((recovery) => recovery.session.id)).toContain(local.id)
})

it('P-C §5 — identidades que continuam no servidor não são consultadas nem tocadas', async () => {
  const presente = { ...testSessions[0], id: crypto.randomUUID() }
  storeSessionRecovery({ session: presente, message: 'fixture', kind: 'unavailable' })
  const fetcher = vi.fn()
  vi.stubGlobal('fetch', fetcher)
  await descartarRecuperacoesExcluidas([{ id: presente.id }])
  expect(fetcher).not.toHaveBeenCalled()
  expect(readSessionRecoveries().map((recovery) => recovery.session.id)).toContain(presente.id)
})
