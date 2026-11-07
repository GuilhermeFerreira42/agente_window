// ============================================================================
// faixaDeAbasProtecao.test.tsx — FATIA 15, RNF15-2 (D173).
//
// TESTES DE PROTECAO escritos ANTES de mover o ESTADO da faixa de abas para fora
// do App.tsx. Ver contrato: docs/CONTRATO-MIGRACAO-ESTADO-ABAS.md
//
// Por que estes testes existem e nao bastam os que ja existiam:
//   O App.test.tsx ja cobre a sucessao ao fechar (P6), a remocao de recursos de
//   browser ao arquivar/excluir sessao (P8/P9) e a faixa por sessao. O que ele
//   NAO trava e' exatamente o que a migracao ameaca:
//     - o id da aba e' ESTAVEL enquanto ela vive (se a migracao recriar a aba a
//       cada render, o React remonta o Monaco e o usuario perde o cursor);
//     - ativar aba NAO duplica nem reordena a faixa;
//     - a memoria por sessao sobrevive ao vai-e-volta;
//     - a aba GLOBAL (Browser de sessao) nao vaza para outra sessao.
//
// Estes testes rodam contra o APP REAL. Eles nao testam a unidade nova — eles
// travam o PRODUTO. Depois da migracao eles tem de continuar verdes SEM nenhuma
// alteracao. Se algum precisar ser "ajustado", a migracao mudou comportamento.
// ============================================================================
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'
import { testSessions } from './fixtures/sessions'

vi.mock('../services/sessions/sessionsClient', () => ({
  SessionPersistenceError: class SessionPersistenceError extends Error {},
  loadPersistedSessions: vi.fn(async () => (await import('./fixtures/sessions')).testSessions),
  persistSession: vi.fn(async () => undefined),
  pickSessionWorkspace: vi.fn(async () => undefined),
  createSessionWorktree: vi.fn(async () => ({ slug: 'workspace-local', path: null, branch: null, repoRoot: '/repo' })),
  removePersistedSession: vi.fn(async () => undefined),
}))

// O painel de terminal puxa xterm + WebSocket; nao e' objeto desta protecao.
vi.mock('../components/TerminalPanel', () => ({ TerminalPanel: () => null }))

beforeEach(() => {
  window.localStorage.clear()
  const fetchOriginal = globalThis.fetch.bind(globalThis)
  vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url === '/api/agir/instruction') return Promise.resolve(new Response(JSON.stringify({ token: 'human-fixture' }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    if (url === '/api/providers') return Promise.resolve(new Response(JSON.stringify({ provedores: [], ativo: null, storage: 'fixture', catalogo: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    if (url === '/api/agir/mode' || url === '/api/agir/permission') return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    if (url.startsWith('/api/agir')) return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    return fetchOriginal(input as RequestInfo, init)
  })
})

const abas = (): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>('.editor-tab[role="tab"]'))
const tituloDe = (aba: HTMLElement): string => aba.querySelector('.editor-tab-title')?.textContent ?? ''
const ids = (): string[] => abas().map((aba) => aba.id)

async function abrirBrowser(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Abrir navegador no editor' }))
}

async function novoBrowserPeloMenu(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Adicionar aba do editor' }))
  await user.click(screen.getByRole('menuitem', { name: 'Browser' }))
}

describe('P1/P2/P3 — a faixa nao duplica e a aba ativa e a que se clicou', () => {
  it('abrir o navegador cria 1 aba, ativa, e o id da aba e estavel entre renders', async () => {
    const user = userEvent.setup()
    render(<App initialSessionSnapshot={testSessions} />)
    await abrirBrowser(user)

    expect(abas()).toHaveLength(1)
    expect(abas()[0]).toHaveAttribute('aria-selected', 'true')
    const idAntes = ids()[0]
    expect(idAntes).toBeTruthy()

    // Uma acao que apenas re-renderiza o App (trocar o titulo do documento nao
    // existe; usamos abrir/fechar o seletor de sessoes, que e' estado do App)
    // NAO pode trocar o id da aba viva: id novo = React remonta = Monaco perde
    // cursor e historico.
    await user.click(screen.getByRole('button', { name: 'Mostrar sessões' }))
    expect(ids()).toEqual([idAntes])
  })

  it('duas abas de browser convivem sem duplicata de id', async () => {
    const user = userEvent.setup()
    render(<App initialSessionSnapshot={testSessions} />)
    await abrirBrowser(user)
    await novoBrowserPeloMenu(user)

    const lista = abas()
    expect(lista).toHaveLength(2)
    expect(new Set(ids()).size).toBe(2)
    // a recem-criada e' a ativa
    expect(lista[1]).toHaveAttribute('aria-selected', 'true')
    expect(tituloDe(lista[0])).not.toBe(tituloDe(lista[1]))
  })

  it('clicar numa aba ja existente ativa ela e NAO cria outra', async () => {
    const user = userEvent.setup()
    render(<App initialSessionSnapshot={testSessions} />)
    await abrirBrowser(user)
    await novoBrowserPeloMenu(user)

    const primeira = abas()[0]
    const titulo = tituloDe(primeira)
    await user.click(primeira)

    expect(abas()).toHaveLength(2)
    const alvo = abas().find((aba) => tituloDe(aba) === titulo)
    expect(alvo).toHaveAttribute('aria-selected', 'true')
  })
})

describe('P4 — memoria por sessao (o que a migracao pode perder)', () => {
  it('voltar para uma sessao restaura a aba que estava ativa nela', async () => {
    const user = userEvent.setup()
    render(<App initialSessionSnapshot={testSessions} />)
    await abrirBrowser(user)

    const sessaoInicial = 's1-m1'
    const sessaoOutra = 's2-m1'

    // Na sessao inicial, cria uma segunda aba e deixa a PRIMEIRA ativa.
    await novoBrowserPeloMenu(user)
    const tituloLembrado = tituloDe(abas()[0])
    await user.click(abas()[0])
    expect(abas()[0]).toHaveAttribute('aria-selected', 'true')

    // Sai para outra sessao e volta.
    await user.click(document.querySelector(`.session-row[data-session-id="${sessaoOutra}"]`) as HTMLElement)
    await user.click(document.querySelector(`.session-row[data-session-id="${sessaoInicial}"]`) as HTMLElement)

    const voltou = abas().find((aba) => tituloDe(aba) === tituloLembrado)
    expect(voltou).toBeDefined()
    expect(voltou).toHaveAttribute('aria-selected', 'true')
  })
})

describe('P5/P8 — recursos de browser acompanham a aba', () => {
  it('aba de browser carrega o data-browser-id que liga a aba ao BrowserView', async () => {
    const user = userEvent.setup()
    render(<App initialSessionSnapshot={testSessions} />)
    await abrirBrowser(user)

    const aba = abas()[0]
    expect(aba).toHaveAttribute('data-browser-id')
    // o endereco do painel vem do BrowserViewState dono desta aba
    expect(screen.getByRole('textbox', { name: 'Endereço' })).toBeInTheDocument()
  })

  it('fechar a aba de browser remove a superficie (sem view orfa)', async () => {
    const user = userEvent.setup()
    render(<App initialSessionSnapshot={testSessions} />)
    await abrirBrowser(user)
    const titulo = tituloDe(abas()[0])

    await user.click(within(abas()[0]).getByRole('button', { name: `Fechar ${titulo}` }))

    expect(abas()).toHaveLength(0)
    expect(screen.queryByRole('textbox', { name: 'Endereço' })).not.toBeInTheDocument()
  })
})

describe('R-040 / RF15-4 — reabrir pelo menu apos ocultar nao perde Browser', () => {
  it('ocultar Browser, abrir Provedores e remontar preserva AMBAS as abas', async () => {
    const user = userEvent.setup()
    const mounted = render(<App initialSessionSnapshot={testSessions} />)
    await abrirBrowser(user)
    await user.click(screen.getByRole('button', { name: 'Recolher editor' }))
    await user.click(screen.getByRole('button', { name: 'Conta' }))
    await user.click(screen.getByRole('menuitem', { name: 'Provedores' }))
    expect(abas().map(tituloDe)).toContain('Browser')
    expect(abas().map(tituloDe)).toContain('Provedores')
    mounted.unmount()
    render(<App initialSessionSnapshot={testSessions} />)
    expect(abas().map(tituloDe)).toContain('Browser')
    expect(abas().map(tituloDe)).toContain('Provedores')
  })
})

describe('P10 — o que o F5 realmente preserva (comportamento MEDIDO, nao suposto)', () => {
  it('RF15-4: Provedores continua como aba nativa apos F5', async () => {
    const user = userEvent.setup()
    const mounted = render(<App initialSessionSnapshot={testSessions} />)
    await user.click(screen.getByRole('button', { name: 'Conta' }))
    await user.click(screen.getByRole('menuitem', { name: 'Provedores' }))
    expect(abas().some((t) => tituloDe(t) === 'Provedores')).toBe(true)
    mounted.unmount()
    render(<App initialSessionSnapshot={testSessions} />)
    expect(abas().some((t) => tituloDe(t) === 'Provedores')).toBe(true)
  })

  it('RF15-4: remontar o App (F5) restaura Browser nativo e preserva a sessao ativa', async () => {
    const user = userEvent.setup()
    const mounted = render(<App initialSessionSnapshot={testSessions} />)
    await abrirBrowser(user)
    expect(abas()).toHaveLength(1)
    const sessionBefore = window.localStorage.getItem('workbench.sessions.active.v1')
    expect(sessionBefore).toBeTruthy()

    mounted.unmount()
    render(<App initialSessionSnapshot={testSessions} />)
    expect(abas()).toHaveLength(1)
    expect(abas()[0]).toHaveAttribute('data-browser-id')
    expect(screen.getByRole('textbox', { name: 'Endereço' })).toHaveValue('https://agents.local/sessions/s1')
    expect(window.localStorage.getItem('workbench.sessions.active.v1')).toBe(sessionBefore)
  })

  it('a sessao ativa e a memoria de abas do modulo usam as chaves de storage esperadas', async () => {
    const user = userEvent.setup()
    render(<App initialSessionSnapshot={testSessions} />)
    await abrirBrowser(user)

    // Documenta o contrato de persistencia que a migracao NAO pode quebrar.
    expect(window.localStorage.getItem('workbench.sessions.active.v1')).toBeTruthy()
    // RF15-4/D151: a faixa nativa reconstituivel agora persiste em chave
    // PROPRIA; nao escrever em chaves antigas nem na do modulo.
    expect(window.localStorage.getItem('workbench.nativeTabs.v1')).toContain('"browser"')
    expect(window.localStorage.getItem('workbench.editorTabs.v1')).toBeNull()
  })
})
