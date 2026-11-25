/**
 * FATIA 07 — Destravar (15/10/2026). Testes de regressão das duas dívidas
 * estruturais corrigidas nesta fatia:
 *
 * - DEBT-09: Provedores abre pelo menu da conta MESMO na tela inicial (landing,
 *   sem sessões). A aba `providers` é global (sem dono de sessão) e passa a
 *   abrir o editor central ao lado da landing.
 * - DEBT-06: a pasta escolhida na landing comanda o Explorer sem mensagem/F5.
 *   Na sessão ativa, a troca atualiza o contexto de novas operações sem remontar
 *   o painel nem destruir os shells que já estavam abertos; o E2E D98 cobre o PTY
 *   novo no workspace novo e a preservação do WebSocket existente.
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
// U-1: a faixa nativa não expõe mais aba de Provedores; o helper fica para
// consultas futuras de abas do editor.
const _editorTab = (name: string | RegExp) => within(document.querySelector('.editor-tabs') as HTMLElement).getByRole('tab', { name })
void _editorTab

vi.mock('../services/sessions/sessionsClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/sessions/sessionsClient')>()
  const { testSessions: sessions } = await import('./fixtures/sessions')
  return {
    ...actual,
    loadPersistedSessions: vi.fn(async () => ({ sessions, unavailable: [], state: 'ok' as const })),
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

// Stub do painel do terminal: expõe a pasta recebida em `data-workspace`.
// O contrato atual conserva o painel/sessões abertas e atualiza somente o
// contexto usado para criar novos terminais.
vi.mock('../components/TerminalPanel', () => ({
  TerminalPanel: (props: { workspace: string }) => <div data-testid="terminal-stub" data-workspace={props.workspace} />,
}))

// FATIA 08: a tela de Provedores agora fala o formato v2 da Casa Provedores.
const providersPayload = {
  provedores: [],
  ativo: null,
  storage: 'fixture',
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

    // U-1 R09: a página abre no MODAL unificado, na categoria Provedores e
    // modelos — mesmo fluxo da conta, agora sem inventar aba no editor.
    const dialogo = await screen.findByRole('dialog', { name: 'Configurações' })
    expect(within(dialogo).getByRole('button', { name: 'Provedores e modelos' }))
      .toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('tab', { name: 'Provedores' }), 'nada de aba legada').not.toBeInTheDocument()
    // FATIA 08 preservada: a lista de provedores vem da Casa, com o formulário.
    expect(await within(dialogo).findByRole('button', { name: 'OpenAI' })).toBeInTheDocument()
    // A landing continua montada por baixo (a sessão futura segue disponível).
    expect(screen.getByRole('region', { name: 'Nova sessão' })).toBeInTheDocument()
  })

  it('DEBT-06: na tela inicial, a pasta escolhida já comanda o Explorer (sem mensagem no chat, sem F5)', async () => {
    const user = userEvent.setup()
    render(<App initialSessionSnapshot={[]} />)

    const before = workspacePosts.length
    const landing = within(screen.getByRole('region', { name: 'Nova sessão' }))
    // C-1: a landing nasce em Chat; a pasta (e o caminho manual) aparecem
    // somente após a escolha explícita da modalidade Pasta.
    await user.click(landing.getByTestId('contexto-workspace'))
    await user.click(landing.getByRole('button', { name: 'Digitar caminho' }))
    const input = landing.getByRole('combobox', { name: 'Caminho manual do workspace' })
    await user.type(input, '/tmp/pasta-nova')
    await user.click(landing.getByRole('button', { name: 'Usar pasta' }))

    // Dois envios: o do próprio clique e o do efeito de boot do Explorer, que
    // reage à pasta nova e recria a árvore na hora.
    await waitFor(() => expect(workspacePosts.filter((path) => path === '/tmp/pasta-nova').length).toBeGreaterThanOrEqual(2))
    expect(before).toBe(0)
  })

  it('DEBT-06: trocar a pasta atualiza o contexto sem remontar o painel do terminal', async () => {
    const user = userEvent.setup()
    render(<App initialSessionSnapshot={testSessions} />)

    const panelBefore = screen.getByTestId('terminal-stub')
    expect(panelBefore).toHaveAttribute('data-workspace', testSessions[0].workspacePath)

    await user.click(screen.getByRole('button', { name: 'Selecionar pasta' }))
    await user.click(screen.getByRole('menuitem', { name: 'Digitar caminho de pasta' }))
    const input = screen.getByRole('combobox', { name: 'Workspace atual' })
    await user.clear(input)
    await user.type(input, '/tmp/pasta-nova')
    await user.click(screen.getByRole('button', { name: 'Usar esta pasta' }))

    await waitFor(() => {
      const panelAfter = screen.getByTestId('terminal-stub')
      // O painel fica montado para preservar shells/WebSocket; a prop nova vale
      // para os terminais que forem criados após a troca. O PTY real é coberto no E2E.
      expect(panelAfter).toBe(panelBefore)
      expect(panelAfter).toHaveAttribute('data-workspace', '/tmp/pasta-nova')
    })
  })
})
