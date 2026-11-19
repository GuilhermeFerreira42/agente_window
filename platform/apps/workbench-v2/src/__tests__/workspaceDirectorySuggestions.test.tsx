import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { listSessionWorkspaceDirectories, type WorkspaceDirectoryListing } from '../services/sessions/sessionsClient'
import { useWorkspaceDirectorySuggestions } from '../hooks/useWorkspaceDirectorySuggestions'

vi.mock('../services/sessions/sessionsClient', () => ({ listSessionWorkspaceDirectories: vi.fn() }))
beforeEach(() => { vi.useFakeTimers(); vi.mocked(listSessionWorkspaceDirectories).mockReset() })
afterEach(() => { vi.useRealTimers() })
const tick = async () => { await act(async () => { await vi.advanceTimersByTimeAsync(180) }) }
const listing = (name: string): WorkspaceDirectoryListing => ({ path: '/', realpath: '/', parent: '/', folders: [{ name, path: `/${name}`, isDir: true }] })

describe('sugestões de diretórios locais', () => {
  it('só consulta caminho absoluto com menu aberto; não pesquisa FS para busca por nome', async () => {
    const { rerender } = renderHook(({ open, query }) => useWorkspaceDirectorySuggestions(open, query), { initialProps: { open: false, query: '/tmp' } })
    await tick(); rerender({ open: true, query: 'repo' }); await tick()
    expect(listSessionWorkspaceDirectories).not.toHaveBeenCalled()
    rerender({ open: true, query: '' }); await tick()
    expect(listSessionWorkspaceDirectories).not.toHaveBeenCalled()
  })
  it('segmento incompleto Windows busca no pai e filtra; drive sem barra consulta raiz', async () => {
    vi.mocked(listSessionWorkspaceDirectories).mockResolvedValueOnce({ ...listing(''), error: 'not_found' })
      .mockResolvedValueOnce({ ...listing('Desktop'), folders: [{ name: 'Desktop', path: 'C:\\Users\\Desktop', isDir: true }, { name: 'Downloads', path: 'C:\\Users\\Downloads', isDir: true }] })
      .mockResolvedValue(listing('Users'))
    const { result, rerender } = renderHook(({ query }) => useWorkspaceDirectorySuggestions(true, query), { initialProps: { query: 'C:\\Users\\Desk' } })
    await tick()
    expect(vi.mocked(listSessionWorkspaceDirectories).mock.calls.map(([path]) => path)).toEqual(['C:\\Users\\Desk', 'C:\\Users\\'])
    expect(result.current.folders.map((folder) => folder.name)).toEqual(['Desktop'])
    rerender({ query: 'C:' }); await tick()
    expect(listSessionWorkspaceDirectories).toHaveBeenLastCalledWith('C:\\', expect.any(AbortSignal))
  })
  it('resposta antiga não substitui o texto atual, mesmo se o serviço ignorar abort', async () => {
    let resolveOld!: (result: WorkspaceDirectoryListing) => void
    vi.mocked(listSessionWorkspaceDirectories).mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve })).mockResolvedValueOnce(listing('nova'))
    const { result, rerender } = renderHook(({ query }) => useWorkspaceDirectorySuggestions(true, query), { initialProps: { query: '/antiga' } })
    await tick(); const signal = vi.mocked(listSessionWorkspaceDirectories).mock.calls[0]![1]!
    rerender({ query: '/nova' }); expect(signal.aborted).toBe(true)
    await tick(); await act(async () => resolveOld(listing('antiga')))
    expect(result.current.folders[0]?.name).toBe('nova')
  })
  it('negação é erro visível; pasta vazia é resultado válido distinto', async () => {
    vi.mocked(listSessionWorkspaceDirectories).mockResolvedValueOnce({ ...listing(''), error: 'permission' })
      .mockResolvedValueOnce({ ...listing(''), folders: [] })
    const { result, rerender } = renderHook(({ query }) => useWorkspaceDirectorySuggestions(true, query), { initialProps: { query: '/negada' } })
    await tick(); expect(result.current.error).toContain('Sem permissão')
    expect(result.current.available).toBe(false)
    rerender({ query: '/vazia' }); await tick()
    expect(result.current.error).toBeNull(); expect(result.current.available).toBe(true); expect(result.current.folders).toEqual([])
  })
})
