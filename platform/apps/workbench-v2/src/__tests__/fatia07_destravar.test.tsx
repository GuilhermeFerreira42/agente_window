/**
 * FATIA 07 — Destravar (15/10/2026). Testes de regressão das duas dívidas
 * estruturais corrigidas nesta fatia:
 *
 * - DEBT-09: Provedores abre pelo menu da conta MESMO na tela inicial (landing,
 *   sem sessões). A aba `providers` é global (sem dono de sessão) e passa a
 *   abrir o editor central ao lado da landing.
 * - DEBT-06 (opção C aprovada pelo dono): trocar a pasta da sessão reinicia o
 *   painel do terminal — o shell novo nasce já na pasta nova (a chave do painel
 *   inclui a pasta). E, na tela inicial, a pasta escolhida já comanda o Explorer
 *   (o efeito de boot reage a `explorerWorkspacePath`).
 *
 * O arquivo é isolado de `App.test.tsx` de propósito: lá o painel do terminal é
 * mockado como `null` e a troca de pasta real do Explorer não pode ser observada.
 */
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { testSessions } from './fixtures/sessions'

// Espelha o App.test: as abas do EDITOR ficam escopadas ao `.editor-tabs`
// (a Activity Bar também expõe `role="tab"`).
const editorTab = (name: string | RegExp) => within(document.querySelector('.editor-tabs') as HTMLElement).getByRole('tab', { name })

vi.mock('../services/sessions/sessionsClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/sessions/sessionsClient')>()
  const { testSessions: sessions } = await import('./fixtures/sessions')
  return {
    ...actual,
    loadPersistedSessions: vi.fn(async () => sessions),
    persistSession: vi.fn(async () => undefined),
    pickSessionWorkspace: vi.fn(async () => undefined),
    createSessionWorktree: vi.fn(async () => ({ slug: 'workspace-local', path: null, branch: null, repoRoot: '/repo' })),
    removePersistedSession: vi.fn(async () => undefined),
    validateSessionWorkspace: vi.fn(async (path: string) => ({ path, slug: 'pasta-nova', name: 'pasta-nova', isGit: false })),
    listSessionWorkspaceDirectories: vi.fn(async (path: string) => ({ path, realpath: path, parent: '/', folders: [] })),
    changeSessionWorkspace: vi.fn(async (sessionId: string, path: string) => ({
      session: { ...sessions[0], id: sessionId, workspacePath: path, worktreePath: null },
      workspace: { path, slug: 'pasta-nova', name: 'pasta-nova', isGit: false },
    })),
  }
})

// Stub do painel do terminal: expõe a pasta recebida em `data-workspace`. Com o
// conserto, a troca de pasta REMONTA o painel (nó novo); sem ele, o React só
// atualizaria o atributo no mesmo nó.
vi.mock('../components/TerminalPanel', () => ({
  TerminalPanel: (props: { workspace: string }) => <div data-testid="terminal-stub" data-workspace={props.workspace} />,
}))

const providersPayload = {
  config: {
    openai: { enabled: false, apiKeySource: 'environment' },
    gemini: { enabled: false, apiKeySource: 'environment' },
    ollama: { enabled: true, baseUrl: 'http://localhost:11434' },
  },
  environment: { openaiConfigured: false, geminiConfigured: false },
}

let workspacePosts: string[]

beforeEach(() => {
  window.localStorage.clear()
  workspacePosts = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input)
    if (url === '/api/providers') {
      return new Response(JSON.stringify(providersPayload), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    if (url === '/fs/workspace' && (init?.method ?? 'GET') === 'POST') {
      workspacePosts.push(JSON.parse(String(init?.body ?? '{}')).path)
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
  })
})

describe('FATIA 07 — Destravar', () => {
  it('DEBT-09: abre Provedores pelo menu da conta na tela inicial (landing, sem sessões)', async () => {
    const user = userEvent.setup()
    render(<App initialSessionSnapshot={[]} />)

    // Ponto de partida real da dívida: a tela inicial vazia, sem nenhuma sessão.
    expect(screen.getByRole('region', { name: 'Nova sessão' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Conta' }))
    await user.click(screen.getByRole('menuitem', { name: 'Provedores' }))

    // A página abre no editor central — o mesmo fluxo homologado com sessões.
    expect(await screen.findByRole('region', { name: 'Provedores' })).toBeInTheDocument()
    expect(editorTab('Provedores')).toHaveAttribute('data-tab-type', 'providers')
    expect(await screen.findByText('Não configurada — use OPENAI_API_KEY')).toBeInTheDocument()
    // A landing continua montada ao lado (a sessão futura segue disponível).
    expect(screen.getByRole('region', { name: 'Nova sessão' })).toBeInTheDocument()
  })

  it('DEBT-06: na tela inicial, a pasta escolhida já comanda o Explorer (sem mensagem no chat, sem F5)', async () => {
    const user = userEvent.setup()
    render(<App initialSessionSnapshot={[]} />)

    const before = workspacePosts.length
    const input = screen.getByRole('combobox', { name: 'Workspace atual' })
    await user.clear(input)
    await user.type(input, '/tmp/pasta-nova')
    await user.click(screen.getByRole('button', { name: 'Usar esta pasta' }))

    // Dois envios: o do próprio clique e o do efeito de boot do Explorer, que
    // reage à pasta nova e recria a árvore na hora.
    await waitFor(() => expect(workspacePosts.filter((path) => path === '/tmp/pasta-nova').length).toBeGreaterThanOrEqual(2))
    expect(before).toBe(0)
  })

  it('DEBT-06: trocar a pasta da sessão reinicia o painel do terminal na pasta nova', async () => {
    const user = userEvent.setup()
    render(<App initialSessionSnapshot={testSessions} />)

    const panelBefore = screen.getByTestId('terminal-stub')
    expect(panelBefore).toHaveAttribute('data-workspace', testSessions[0].workspacePath)

    const input = screen.getByRole('combobox', { name: 'Workspace atual' })
    await user.clear(input)
    await user.type(input, '/tmp/pasta-nova')
    await user.click(screen.getByRole('button', { name: 'Usar esta pasta' }))

    await waitFor(() => {
      const panelAfter = screen.getByTestId('terminal-stub')
      // Nó novo = painel remontado = shell novo já nascendo na pasta nova.
      expect(panelAfter).not.toBe(panelBefore)
      expect(panelAfter).toHaveAttribute('data-workspace', '/tmp/pasta-nova')
    })
  })
})
