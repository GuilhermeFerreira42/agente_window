import { afterEach, describe, expect, it, vi } from 'vitest'
import { manageHistoryAccess } from '../services/sessions/historyAccessClient'
afterEach(() => vi.unstubAllGlobals())
describe('consentimento histórico é uma decisão humana específica', () => {
  it('cancelar confirmação não concede acesso', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ status: 'needs_consent', title: 'memoria', project: '/A', token: 'nonce' })))
    vi.stubGlobal('fetch', fetch)
    const confirm = vi.fn(() => false), notify = vi.fn()
    await manageHistoryAccess('session', 'chat', { confirm, notify })
    expect(fetch).toHaveBeenCalledTimes(1); expect(confirm).toHaveBeenCalledWith(expect.stringContaining('SOMENTE deste projeto'))
    expect(notify).not.toHaveBeenCalled()
  })
  it('confirmar transmite somente token, sem pasta/IDs de outro alvo', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ status: 'needs_consent', title: 'memoria', project: '/A', token: 'nonce' })))
      .mockResolvedValueOnce(new Response('{"autorizado":true}'))
    vi.stubGlobal('fetch', fetch); const notify = vi.fn()
    await manageHistoryAccess('session', 'chat', { confirm: () => true, notify })
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ acao: 'confirmar', token: 'nonce' })
    expect(notify).toHaveBeenCalledWith(expect.stringContaining('Envie novamente'))
  })
  it('revogar exige confirmação própria e não mostra erro bruto de endpoint', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ status: 'consented', title: 'memoria', project: '/A', token: 'nonce' })))
      .mockResolvedValueOnce(new Response('senha=SEGREDO', { status: 409 }))
    vi.stubGlobal('fetch', fetch); const confirm = vi.fn(() => true), notify = vi.fn()
    await manageHistoryAccess('session', 'chat', { confirm, notify })
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Revogar'))
    expect(JSON.stringify(notify.mock.calls)).not.toContain('SEGREDO')
  })
  it('resposta inválida não vaza trecho de JSON na mensagem de erro', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('senha=SEGREDO')))
    const notify = vi.fn(), confirm = vi.fn(() => true)
    await manageHistoryAccess('session', 'chat', { confirm, notify })
    expect(confirm).not.toHaveBeenCalled(); expect(JSON.stringify(notify.mock.calls)).not.toContain('SEGREDO')
  })
})
