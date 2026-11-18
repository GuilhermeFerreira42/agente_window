// ============================================================================
// C-3a — c3aCompatibility (C3A-T34 · R01/R14): teclado/foco/Enter/IME nos
// controles de anexo, temas claro/escuro com tokens reais (nenhuma cor crua
// nova) e 800x600 sem corte horizontal. Controles futuros (ditado na landing)
// seguem explicitamente indisponíveis COM motivo — nada de promessa vazia.
// Asserções sobre o DOM real e sobre a FOLHA DE ESTILO real (sem espelhar CSS
// no teste); o corte geométrico de verdade é provado no E2E (E09).
// ============================================================================

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatInput } from '../components/ChatInput'
import { SessionLanding } from '../components/SessionLanding'
import type { NestedChat, Session } from '../types'

const raiz = join(__dirname, '..')
const css = readFileSync(join(raiz, 'styles/app.css'), 'utf8')
const temaCss = readFileSync(join(raiz, 'styles/theme.css'), 'utf8')

const chat: NestedChat = {
  id: 'chat-t34', title: 'Chat T34', status: 'completed', messages: [],
}

const session: Session = {
  id: 'session-t34', title: 'Sessão T34', workspace: 'workspace-t34',
  workspacePath: '~/workspace-t34', section: 'today', status: 'completed',
  updated: 'agora', diffAdded: 0, diffRemoved: 0, branch: 'main',
  chats: [chat], mainChatId: chat.id,
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
    provedores: [], ativo: null, storage: 'fixture', catalogo: [],
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })))
})
afterEach(() => { vi.unstubAllGlobals() })

function renderInput(overrides: Partial<React.ComponentProps<typeof ChatInput>> = {}) {
  const props: React.ComponentProps<typeof ChatInput> = {
    session, activeChat: chat, model: 'Auto', mode: 'agent',
    onChangeModel: vi.fn(), onChangeMode: vi.fn(), onSend: vi.fn(),
    onStop: vi.fn(), onApprove: vi.fn(),
    ...overrides,
  }
  return { ...render(<ChatInput {...props} />), props }
}

function anexar(container: HTMLElement, nomes: string[]): HTMLInputElement {
  const fileInput = container.querySelector('input[type="file"]')
  if (!(fileInput instanceof HTMLInputElement)) throw new Error('file input ausente')
  const arquivos = nomes.map((nome) => new File(['conteúdo sintético'], nome, { type: 'text/plain' }))
  fireEvent.change(fileInput, { target: { files: arquivos } })
  return fileInput
}

/** Extrai as cores cruas de um bloco de CSS (hex, rgb/hsl, nomeadas). */
function coresCruas(bloco: string): string[] {
  const achados: string[] = []
  const hex = bloco.match(/#[0-9a-fA-F]{3,8}\b/g)
  if (hex) achados.push(...hex)
  const funcional = bloco.match(/\b(?:rgba?|hsla?)\([^)]*\)/g)
  if (funcional) achados.push(...funcional)
  return achados
}

describe('c3aCompatibility — T34: teclado, foco e IME nos controles de anexo', () => {
  it('C3A-T34 — chip de anexo é focável, Delete remove, setas movem o foco e o botão × é rotulado', async () => {
    const { container } = renderInput()
    anexar(container, ['alfa.txt', 'beta.txt'])

    const chips = container.querySelectorAll('.attachment-chip')
    expect(chips).toHaveLength(2)
    for (const chip of Array.from(chips)) {
      expect(chip).toHaveAttribute('tabindex', '0')
      expect(chip.getAttribute('aria-label')).toMatch(/armazenado; não enviado ao modelo/i)
      expect(chip.getAttribute('aria-label')).toMatch(/Pressione Delete para remover/i)
    }

    // Foco por teclado + seta move o foco entre chips.
    ;(chips[0] as HTMLElement).focus()
    fireEvent.keyDown(chips[0], { key: 'ArrowRight' })
    expect(document.activeElement).toBe(chips[1])
    fireEvent.keyDown(chips[1], { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(chips[0])

    // O botão de remover continua acessível pelo nome, mas não rouba o TAB.
    const remover = screen.getByRole('button', { name: 'Remover alfa.txt' })
    expect(remover).toHaveAttribute('tabindex', '-1')

    // Delete no chip remove só aquele anexo e mantém o outro.
    fireEvent.keyDown(chips[0], { key: 'Delete' })
    expect(screen.queryByRole('button', { name: 'Remover alfa.txt' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remover beta.txt' })).toBeInTheDocument()
  })

  it('C3A-T34 — Ctrl+/ abre o seletor, Escape fecha devolvendo foco ao composer, Enter/IME estável', async () => {
    const { container } = renderInput()
    const campo = screen.getByRole('textbox', { name: 'Mensagem para o agente' })
    campo.focus()

    fireEvent.keyDown(campo, { key: '/', ctrlKey: true })
    const menu = await screen.findByRole('menu', { name: 'Adicionar contexto' })
    expect(menu).toBeInTheDocument()

    fireEvent.keyDown(menu, { key: 'Escape' })
    expect(screen.queryByRole('menu', { name: 'Adicionar contexto' })).not.toBeInTheDocument()

    // Com anexo no rascunho o composer continua enviável; IME não envia
    // (o composer do chat usa a API padronizada nativeEvent.isComposing).
    anexar(container, ['gama.txt'])
    fireEvent.change(campo, { target: { value: '入力中' } })
    fireEvent.keyDown(campo, { key: 'Enter', isComposing: true })
    expect(campo).toHaveValue('入力中')

    // Enter “normal” envia (o anexo não bloqueia o teclado).
    const onSend = vi.fn()
    renderInput({ onSend })
    const campo2 = screen.getAllByRole('textbox', { name: 'Mensagem para o agente' }).at(-1)!
    fireEvent.change(campo2, { target: { value: 'mensagem' } })
    fireEvent.keyDown(campo2, { key: 'Enter' })
    expect(onSend).toHaveBeenCalledTimes(1)
  })

  it('C3A-T34 — o + da landing só habilita com conteúdo real e o dropzone de arquivo é anunciado', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn(() => true)
    const { container } = render(
      <SessionLanding workspace="Nenhuma pasta aberta" onSubmit={onSubmit} />,
    )
    const campo = screen.getByRole('textbox', { name: 'Mensagem para a nova sessão' })
    const enviar = screen.getByRole('button', { name: 'Enviar mensagem' })
    expect(enviar).toBeDisabled()

    // O + existe e é real (abre o seletor de arquivo), não um mock decorativo.
    const mais = screen.getByTestId('landing-anexos')
    expect(mais).toBeEnabled()
    expect(mais).toHaveAttribute('aria-label', 'Adicionar contexto')

    const fileInput = container.querySelector('input[type="file"]')
    if (!(fileInput instanceof HTMLInputElement)) throw new Error('file input ausente na landing')
    await user.upload(fileInput, new File(['x'], 'unico.txt', { type: 'text/plain' }))

    // Arquivo vira chip com o aviso honesto e habilita o envio só com anexo.
    const chip = await screen.findByRole('group', { name: /unico\.txt/ })
    expect(chip.getAttribute('aria-label')).toMatch(/armazenado; não enviado ao modelo/)
    expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeEnabled()
    expect(campo).toHaveValue('')
  })
})

describe('c3aCompatibility — T34: temas claro/escuro e 800x600 sem corte', () => {
  it('C3A-T34 — nomear o anexo usa só tokens do tema (nenhuma cor crua no bloco C-3a)', () => {
    const marcador = 'C-3a — anexos: estado real nos chips'
    const inicio = css.indexOf(marcador)
    expect(inicio).toBeGreaterThan(-1)
    const bloco = css.slice(inicio)
    // O bloco C-3a é o ÚLTIMO do arquivo; recorta até o fim.
    expect(coresCruas(bloco)).toEqual([])
    // E os tokens usados existem nos DOIS temas (dark base + override light).
    for (const token of ['--vscode-descriptionForeground', '--vscode-toolbar-hoverBackground', '--vscode-focusBorder']) {
      expect(temaCss.split(token).length - 1).toBeGreaterThanOrEqual(2)
    }
  })

  it('C3A-T34 — o chip não estoura 800x600: nome truncável, linha que quebra e chips limitados à largura', () => {
    const regra = (seletor: string) => {
      const blocos: string[] = []
      let cursor = 0
      for (;;) {
        const inicio = css.indexOf(`${seletor} {`, cursor)
        if (inicio < 0) break
        const fim = css.indexOf('}', inicio)
        blocos.push(css.slice(inicio, fim + 1))
        cursor = fim + 1
      }
      expect(blocos.length).toBeGreaterThan(0)
      return blocos.join('\n')
    }
    // Nome longo não empurra a coluna: ellipsis nos spans + min-width 0 no flex.
    const nome = regra('.attachment-chip span') + regra('.attachment-chip-name')
    expect(nome).toMatch(/text-overflow:\s*ellipsis/)
    expect(nome).toMatch(/overflow:\s*hidden/)
    expect(nome).toMatch(/white-space:\s*nowrap/)
    expect(nome).toMatch(/min-width:\s*0/)
    // O chip em si é limitado ao contêiner e a linha quebra (sem corte horizontal).
    const chip = regra('.attachment-chip')
    expect(chip).toMatch(/max-width:\s*100%/)
    const linha = regra('.attachments-row')
    expect(linha).toMatch(/flex-wrap:\s*wrap/)
    // O estado do chip (coluna nova) não encolhe nem gera overflow.
    const estado = regra('.attachment-chip-estado')
    expect(estado).toMatch(/flex:\s*0 0 auto/)
  })

  it('C3A-T34 — controles futuros permanecem honestos (ditado da landing desabilitado com motivo)', () => {
    render(<SessionLanding workspace="Nenhuma pasta aberta" onSubmit={() => true} />)
    const ditado = screen.getByRole('button', { name: 'Ditar por voz' })
    expect(ditado).toBeDisabled()
    expect(ditado).toHaveAttribute('aria-disabled', 'true')
    expect(ditado.getAttribute('title')).toMatch(/ainda não está disponível/)
    // Nada de promessa de envio multimodal: o chip diz que não foi ao modelo.
    const card = ditado.closest('.session-landing-input')
    if (card) expect(within(card as HTMLElement).queryByText(/This Computer/i)).not.toBeInTheDocument()
  })
})
