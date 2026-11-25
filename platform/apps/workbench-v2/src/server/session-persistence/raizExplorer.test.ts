// @vitest-environment node
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetDatabase, upsertSessionRecord } from './database'
import { iniciarOuConsultarDelecao } from './deletions'
import { resolverRaizExplorer } from './raizExplorer'

let base: string
const sid = 'sessao-explorer', a = 'chat-a', b = 'chat-b'
function semear(id: string, projeto: string | null, worktree: string | null = null) {
  upsertSessionRecord({ id, slug: id, title: 'Teste', workspacePath: projeto, contextKind: projeto ? 'workspace' : 'chat', worktreePath: worktree,
    messageCount: 0, createdAt: 1, updatedAt: 1,
    sessionJson: JSON.stringify({ id, workspacePath: projeto, worktreePath: worktree, chats: [{ id: a, messages: [] }, { id: b, messages: [] }] }) })
}
beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'mmi-raiz-explorer-'))
  process.env.AGENTE_WINDOW_DATA_DIR = join(base, 'data')
  mkdirSync(process.env.AGENTE_WINDOW_DATA_DIR, { recursive: true })
  resetDatabase()
})
afterEach(() => { resetDatabase(); delete process.env.AGENTE_WINDOW_DATA_DIR; rmSync(base, { recursive: true, force: true }) })

describe('raízes persistidas por dono para o Explorer', () => {
  it('dois chats da mesma sessão têm raízes distintas e persistentes, separadas dos originais', async () => {
    semear(sid, null)
    const primeira = await resolverRaizExplorer(sid, a), segunda = await resolverRaizExplorer(sid, b)
    expect(primeira.tipo).toBe('chat'); expect(segunda.tipo).toBe('chat')
    expect(primeira.raiz).not.toBe(segunda.raiz)
    expect(primeira.raiz).not.toContain(join('uploads', 'chats'))
    writeFileSync(join(primeira.raiz, 'nota.txt'), 'chat A')
    expect(existsSync(join(segunda.raiz, 'nota.txt'))).toBe(false)
    resetDatabase()
    expect((await resolverRaizExplorer(sid, a)).raiz).toBe(primeira.raiz)
    expect(readFileSync(join(primeira.raiz, 'nota.txt'), 'utf8')).toBe('chat A')
  })
  it('duas sessões no mesmo projeto usam a pasta escolhida, inclusive com worktree', async () => {
    const projeto = join(base, 'projeto'), worktree = join(base, 'worktree')
    mkdirSync(projeto); mkdirSync(worktree)
    semear(sid, projeto, worktree); semear('outra-sessao', projeto)
    expect(await resolverRaizExplorer(sid, a)).toEqual({ tipo: 'projeto', raiz: realpathSync(projeto) })
    expect(await resolverRaizExplorer('outra-sessao', b)).toEqual({ tipo: 'projeto', raiz: realpathSync(projeto) })
  })
  it('nega chat alheio, sessão excluída e raiz de projeto indisponível', async () => {
    semear(sid, null)
    await expect(resolverRaizExplorer(sid, 'alheio')).rejects.toMatchObject({ code: 'chat_not_found' })
    iniciarOuConsultarDelecao({ sessionId: sid, deletionId: 'teste', expectedRevision: 0 })
    await expect(resolverRaizExplorer(sid, a)).rejects.toMatchObject({ code: 'session_deleted' })
    const projeto = join(base, 'projeto'); mkdirSync(projeto); semear('offline', projeto); rmSync(projeto, { recursive: true })
    await expect(resolverRaizExplorer('offline', a)).rejects.toMatchObject({ code: 'session_context_mismatch' })
  })
  it.skipIf(process.platform === 'win32')('recusa link em diretório pai da raiz privada', async () => {
    semear(sid, null)
    const fora = join(base, 'fora'); mkdirSync(fora)
    symlinkSync(fora, join(process.env.AGENTE_WINDOW_DATA_DIR!, 'workspaces'))
    await expect(resolverRaizExplorer(sid, a)).rejects.toThrow()
    expect(existsSync(join(fora, 'chats'))).toBe(false)
  })
})
