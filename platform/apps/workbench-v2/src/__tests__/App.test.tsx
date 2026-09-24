import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'

// O layout é persistido em localStorage (visibilidade global + estado por
// sessão). Cada teste começa com um estado limpo para não herdar layout de
// outro — importante agora que a visibilidade da barra auxiliar é por sessão.
beforeEach(() => {
  window.localStorage.clear()
})

vi.mock('../components/TerminalPanel', () => ({
  TerminalPanel: () => null,
}))

function sessionRow(title: string): HTMLElement {
  const titleElement = Array.from(document.querySelectorAll<HTMLElement>('.session-row .session-title-text'))
    .find((element) => element.textContent === title)
  const row = titleElement?.closest<HTMLElement>('.session-row')
  if (!row) throw new Error(`Session row not found: ${title}`)
  return row
}

function browserEditorTab(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.editor-tab[role="tab"]')
}

// O botão "Novo Browser" foi removido; um novo browser agora é criado pelo
// menu do "+" do editor (Adicionar aba do editor → Browser).
async function createBrowserTab(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Adicionar aba do editor' }))
  await user.click(screen.getByRole('menuitem', { name: 'Browser' }))
}

// 4.8-B3: o Browser não abre mais no boot. Os fluxos abaixo foram homologados
// com uma aba Browser inicial — recriamos esse ponto de partida pelo botão do
// cabeçalho ("Abrir navegador no editor"), que é o caminho real do usuário.
async function openInitialBrowser(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Abrir navegador no editor' }))
  expect(browserEditorTab()).toBeInTheDocument()
}

// jsdom não implementa DataTransfer; este mock cobre o que o DnD do app usa.
function createDataTransfer() {
  const store = new Map<string, string>()
  return {
    data: store,
    dropEffect: 'none',
    effectAllowed: 'all',
    get types() { return Array.from(store.keys()) },
    setData(type: string, value: string) { store.set(type, value) },
    getData(type: string) { return store.get(type) ?? '' },
  }
}

function nestedChat(title: string): HTMLElement {
  const element = Array.from(document.querySelectorAll<HTMLElement>('.nested-chat-title'))
    .find((candidate) => candidate.textContent === title)
  if (!element) throw new Error(`Nested chat not found: ${title}`)
  return element
}

describe('App session flows', () => {
  it('aplica unread, pin/unpin e rename no estado real da sidebar', async () => {
    const user = userEvent.setup()
    render(<App />)

    const waitingRow = sessionRow('Revisar alterações do workbench')
    expect(waitingRow).toHaveClass('is-unread')
    await user.click(waitingRow)
    expect(sessionRow('Revisar alterações do workbench')).toHaveClass('is-selected')
    expect(sessionRow('Revisar alterações do workbench')).not.toHaveClass('is-unread')

    const layoutRow = sessionRow('Ajustar layout single-pane')
    await user.click(within(layoutRow).getByRole('button', { name: 'Fixar' }))
    const pinnedHeader = screen.getByRole('button', { name: /Fixadas/ })
    expect(pinnedHeader).toHaveAttribute('aria-expanded', 'false')
    await user.click(pinnedHeader)
    const pinnedRow = sessionRow('Ajustar layout single-pane')
    expect(pinnedRow).toHaveClass('is-pinned')
    await user.click(within(pinnedRow).getByRole('button', { name: 'Desafixar' }))
    expect(sessionRow('Ajustar layout single-pane')).not.toHaveClass('is-pinned')

    const renameRow = sessionRow('Ajustar layout single-pane')
    await user.click(within(renameRow).getByRole('button', { name: 'Renomear sessão' }))
    const renameInput = within(renameRow).getByRole('textbox', { name: 'Renomear sessão' })
    await user.clear(renameInput)
    await user.type(renameInput, 'Layout renomeado')
    await user.keyboard('{Enter}')
    expect(sessionRow('Layout renomeado')).toBeInTheDocument()
  })

  it('aprova uma ação e atualiza o status da sessão sem depender só da aparência', async () => {
    const user = userEvent.setup()
    render(<App />)

    const waitingRow = sessionRow('Revisar alterações do workbench')
    await user.click(within(waitingRow).getByRole('button', { name: 'Permitir' }))

    expect(screen.getByText('Ação aprovada')).toBeInTheDocument()
    expect(sessionRow('Revisar alterações do workbench')).toHaveClass('is-working')
    expect(within(sessionRow('Revisar alterações do workbench')).queryByRole('button', { name: 'Permitir' })).not.toBeInTheDocument()
  })

  it('arquiva e restaura, destrói Browser da sessão e faz fallback ao excluir a sessão ativa', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openInitialBrowser(user)

    expect(browserEditorTab()).toBeInTheDocument()
    const activeRow = sessionRow('Replicar a Janela de Agentes')
    await user.click(within(activeRow).getByRole('button', { name: 'Arquivar' }))

    expect(browserEditorTab()).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Arquivadas/ }))
    const archivedRow = sessionRow('Replicar a Janela de Agentes')
    expect(archivedRow).toHaveClass('is-archived')
    await user.click(within(archivedRow).getByRole('button', { name: 'Restaurar' }))

    const restoredRow = sessionRow('Replicar a Janela de Agentes')
    expect(restoredRow).not.toHaveClass('is-archived')
    expect(browserEditorTab()).not.toBeInTheDocument()

    await user.click(within(restoredRow).getByRole('button', { name: 'Excluir sessão' }))
    expect(() => sessionRow('Replicar a Janela de Agentes')).toThrow('Session row not found')
    expect(sessionRow('Revisar alterações do workbench')).toHaveAttribute('aria-current', 'true')
  })

  it('conecta regenerar e feedback ao estado persistido da mensagem', async () => {
    const user = userEvent.setup()
    render(<App />)

    const responseText = screen.getByText(/A composição visual está pronta para revisão/)
    const responseRow = responseText.closest<HTMLElement>('.chat-message')
    if (!responseRow) throw new Error('Assistant message row not found')

    await user.click(within(responseRow).getByRole('button', { name: 'Útil' }))
    expect(within(responseRow).getByRole('button', { name: 'Útil' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Feedback útil registrado')).toBeInTheDocument()

    await user.click(within(responseRow).getByRole('button', { name: 'Copiar' }))
    expect(screen.getByText('Mensagem copiada')).toBeInTheDocument()
    const codeResponseRow = screen.getByText(/Entendido\. Vou manter/).closest<HTMLElement>('.chat-message')
    if (!codeResponseRow) throw new Error('Code response row not found')
    await user.click(within(codeResponseRow).getByRole('button', { name: 'Copiar código' }))
    expect(screen.getByText('Código copiado')).toBeInTheDocument()
    await user.click(within(responseRow).getByRole('button', { name: 'Relatar problema' }))
    expect(screen.getByText('Problema relatado para análise')).toBeInTheDocument()
    expect(within(responseRow).getByRole('button', { name: 'Relatar problema' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(within(responseRow).getByRole('button', { name: 'Mais ações' }))
    await user.click(screen.getByRole('menuitem', { name: 'Copiar tudo' }))
    expect(screen.getByText('Todas as mensagens copiadas')).toBeInTheDocument()
    await user.click(within(responseRow).getByRole('button', { name: 'Mais ações' }))
    await user.click(screen.getByRole('menuitem', { name: 'Copiar resposta final' }))
    expect(screen.getByText('Resposta final copiada')).toBeInTheDocument()

    await user.click(within(responseRow).getByRole('button', { name: 'Regenerar' }))
    expect(screen.getByText('Regenerando resposta')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText(/Resposta regenerada para:/)).toBeInTheDocument(), { timeout: 5000 })
    expect(screen.getByRole('status')).toHaveTextContent('Resposta regenerada')
  })

  it('interrompe uma resposta em andamento e não deixa o timer concluir depois', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(sessionRow('Ajustar layout single-pane'))
    const input = screen.getByRole('textbox', { name: 'Mensagem para o agente' })
    await user.type(input, 'interromper esta execução')
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
    expect(screen.getByText('Trabalhando')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Parar execução' }))
    expect(screen.getByText(/Execução interrompida antes da resposta/)).toBeInTheDocument()
    expect(screen.queryByText('Trabalhando')).not.toBeInTheDocument()

    await new Promise((resolve) => window.setTimeout(resolve, 1100))
    expect(screen.queryByText(/Estou trabalhando em/)).not.toBeInTheDocument()
  })

  it('cancela o request da sessão mesmo após trocar para outro nested chat', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(sessionRow('Ajustar layout single-pane'))
    const layoutRow = sessionRow('Ajustar layout single-pane')
    await user.click(within(layoutRow).getByRole('button', { name: 'Expandir chats' }))
    const input = screen.getByRole('textbox', { name: 'Mensagem para o agente' })
    await user.type(input, 'cancelar depois de trocar de chat')
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
    expect(screen.getByText('Trabalhando')).toBeInTheDocument()

    await user.click(nestedChat('Cenários de transição'))
    expect(screen.getByRole('button', { name: 'Parar execução' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Parar execução' }))

    expect(screen.queryByText('Trabalhando')).not.toBeInTheDocument()
    await user.click(nestedChat('Estratégia de layout'))
    expect(screen.getByText(/Execução interrompida antes da resposta/)).toBeInTheDocument()

    await new Promise((resolve) => window.setTimeout(resolve, 1100))
    expect(screen.queryByText(/Estou trabalhando em/)).not.toBeInTheDocument()
  })

  it('persiste o modo selecionado por sessão sem cruzar ao trocar de sessão', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Agente' }))
    await user.click(screen.getByRole('button', { name: /Editar/ }))
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()

    await user.click(nestedChat('Ajustes de UI'))
    expect(screen.getByRole('button', { name: 'Agente' })).toBeInTheDocument()
    await user.click(nestedChat('Implementação principal'))
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()

    await user.click(sessionRow('Revisar alterações do workbench'))
    expect(screen.getByRole('button', { name: 'Agente' })).toBeInTheDocument()

    await user.click(sessionRow('Replicar a Janela de Agentes'))
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
  })

  it('persiste o modelo por sessão e nested chat e usa a seleção no envio', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Claude Sonnet 4' }))
    await user.click(screen.getByRole('button', { name: /^GPT-5 mini Resposta/ }))
    expect(screen.getByRole('button', { name: 'GPT-5 mini' })).toBeInTheDocument()

    await user.click(nestedChat('Ajustes de UI'))
    expect(screen.getByRole('button', { name: 'Claude Sonnet 4' })).toBeInTheDocument()
    await user.click(nestedChat('Implementação principal'))
    expect(screen.getByRole('button', { name: 'GPT-5 mini' })).toBeInTheDocument()

    await user.click(sessionRow('Revisar alterações do workbench'))
    expect(screen.getByRole('button', { name: 'Claude Sonnet 4' })).toBeInTheDocument()
    await user.click(sessionRow('Replicar a Janela de Agentes'))
    expect(screen.getByRole('button', { name: 'GPT-5 mini' })).toBeInTheDocument()

    await user.click(sessionRow('Ajustar layout single-pane'))
    await user.click(screen.getByRole('button', { name: 'Claude Sonnet 4' }))
    await user.click(screen.getByRole('button', { name: /^GPT-5 Raciocínio/ }))
    const input = screen.getByRole('textbox', { name: 'Mensagem para o agente' })
    await user.type(input, 'usar o modelo selecionado')
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
    await waitFor(() => expect(screen.getByText(/· GPT-5$/)).toBeInTheDocument(), { timeout: 2500 })
  })

  it('envia o payload com anexo local, exibe o contexto e limpa o chip após submit', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)

    await user.click(sessionRow('Ajustar layout single-pane'))
    await user.click(screen.getByRole('button', { name: 'Agente' }))
    await user.click(screen.getByRole('button', { name: /Editar/ }))
    const fileInput = container.querySelector('input[type="file"]')
    if (!(fileInput instanceof HTMLInputElement)) throw new Error('File input not found')

    await user.upload(fileInput, new File(['conteúdo'], 'app.ts', { type: 'text/typescript' }))
    expect(screen.getByRole('group', { name: /app\.ts, arquivo local/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))

    expect(screen.getByRole('list', { name: 'Anexos enviados' })).toBeInTheDocument()
    expect(screen.getByRole('listitem', { name: 'app.ts, arquivo local' })).toBeInTheDocument()
    expect(screen.getByText('Arquivos anexados: app.ts')).toBeInTheDocument()
    expect(screen.getByText('· Editar')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /app\.ts, arquivo local/ })).not.toBeInTheDocument()
    expect(screen.getByText('Trabalhando')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Parar execução' }))
  })

  it('preserva o anexo do rascunho ao alternar a superfície mobile', async () => {
    const user = userEvent.setup()
    const originalWidth = window.innerWidth
    const originalTouch = Object.getOwnPropertyDescriptor(window.navigator, 'maxTouchPoints')
    const originalMatchMedia = window.matchMedia
    // O single-pane agora é gated por plataforma móvel (toque/SO), não só pela
    // largura — mockamos um ambiente móvel para exercitar as dock tabs.
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 640 })
    Object.defineProperty(window.navigator, 'maxTouchPoints', { configurable: true, value: 5 })
    window.matchMedia = ((query: string) => ({
      matches: query.includes('coarse'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia

    try {
      const { container } = render(<App />)
      const fileInput = container.querySelector('input[type="file"]')
      if (!(fileInput instanceof HTMLInputElement)) throw new Error('File input not found')

      await user.upload(fileInput, new File(['rascunho'], 'rascunho.md', { type: 'text/markdown' }))
      expect(screen.getByRole('group', { name: /rascunho\.md, arquivo local/ })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /^Editor/ }))
      expect(screen.queryByRole('group', { name: /rascunho\.md, arquivo local/ })).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: /^Chat$/ }))

      expect(screen.getByRole('group', { name: /rascunho\.md, arquivo local/ })).toBeInTheDocument()
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth })
      if (originalTouch) Object.defineProperty(window.navigator, 'maxTouchPoints', originalTouch)
      window.matchMedia = originalMatchMedia
    }
  })

  // R-077: no phone, abrir uma superfície mobile empilha uma camada na
  // MobileNavigationStack; a back-navigation (botão Voltar / Escape) dispensa a
  // camada do topo e retorna ao chat quando esvazia.
  it('empilha e dispensa camadas de navegação mobile (back-navigation) no phone (R-077)', async () => {
    const user = userEvent.setup()
    const originalWidth = window.innerWidth
    const originalTouch = Object.getOwnPropertyDescriptor(window.navigator, 'maxTouchPoints')
    const originalMatchMedia = window.matchMedia
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 600 })
    Object.defineProperty(window.navigator, 'maxTouchPoints', { configurable: true, value: 5 })
    window.matchMedia = ((query: string) => ({
      matches: query.includes('coarse'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia

    try {
      render(<App />)

      // Sem camadas, não há botão Voltar.
      expect(screen.queryByRole('button', { name: 'Voltar navegação' })).not.toBeInTheDocument()

      // Abrir "Editor" empilha uma camada full-screen → surge o botão Voltar.
      await user.click(screen.getByRole('button', { name: /^Editor/ }))
      const back = await screen.findByRole('button', { name: 'Voltar navegação' })
      expect(back).toBeInTheDocument()

      // Voltar dispensa a camada do topo e retorna ao chat (pilha vazia).
      await user.click(back)
      expect(screen.queryByRole('button', { name: 'Voltar navegação' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^Chat$/ })).toHaveClass('is-active')
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth })
      if (originalTouch) Object.defineProperty(window.navigator, 'maxTouchPoints', originalTouch)
      window.matchMedia = originalMatchMedia
    }
  })

  it('mantém histórico do composer isolado por sessão e nested chat', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(sessionRow('Ajustar layout single-pane'))
    const input = screen.getByRole('textbox', { name: 'Mensagem para o agente' })
    await user.type(input, 'consulta histórica da sessão s3')
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
    await user.click(screen.getByRole('button', { name: 'Parar execução' }))

    const layoutRow = sessionRow('Ajustar layout single-pane')
    await user.click(within(layoutRow).getByRole('button', { name: 'Expandir chats' }))
    await user.click(nestedChat('Cenários de transição'))
    const isolatedInput = screen.getByRole('textbox', { name: 'Mensagem para o agente' })
    isolatedInput.focus()
    await user.keyboard('{ArrowUp}')
    expect(isolatedInput).toHaveValue('')

    await user.click(nestedChat('Estratégia de layout'))
    const mainInput = screen.getByRole('textbox', { name: 'Mensagem para o agente' })
    mainInput.focus()
    await user.keyboard('{ArrowUp}')
    expect(mainInput).toHaveValue('consulta histórica da sessão s3')
  })

  it('propaga Ctrl+Enter do composer para o request real da sessão', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(sessionRow('Ajustar layout single-pane'))
    const input = screen.getByRole('textbox', { name: 'Mensagem para o agente' })
    expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeDisabled()

    await user.type(input, 'enviar pelo composer')
    await user.keyboard('{Control>}{Enter}{/Control}')

    expect(screen.getByText('enviar pelo composer')).toBeInTheDocument()
    expect(screen.getByText('Trabalhando')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Parar execução' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Parar execução' }))
  })

  it('preserva seleção de chat e oculta/mostra Browser conforme ownership da sessão', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openInitialBrowser(user)

    const nestedUiChat = Array.from(document.querySelectorAll<HTMLElement>('.nested-chat-title'))
      .find((element) => element.textContent === 'Ajustes de UI')
    if (!nestedUiChat) throw new Error('Nested UI chat not found')
    await user.click(nestedUiChat)
    expect(screen.getByRole('tab', { name: /Ajustes de UI/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Ajustei os tokens de spacing e as guias de árvore.')).toBeInTheDocument()

    await user.click(sessionRow('Revisar alterações do workbench'))
    expect(browserEditorTab()).not.toBeInTheDocument()
    await user.click(sessionRow('Replicar a Janela de Agentes'))
    expect(browserEditorTab()).toBeInTheDocument()
  })

  it('cria, seleciona, navega, recarrega, reporta erro e fecha múltiplas abas Browser no Editor', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openInitialBrowser(user)

    const editorTabs = () => Array.from(document.querySelectorAll<HTMLElement>('.editor-tab[role="tab"]'))
    const browserFrame = () => screen.getByTitle(/Browser https:\/\//) as HTMLIFrameElement
    const browserTabTitles = () => editorTabs().map((tab) => tab.querySelector('.editor-tab-title')?.textContent)

    expect(editorTabs()).toHaveLength(1)
    // B3: o browser é criado por clique (assíncrono) — em jsdom o `load` do
    // iframe srcdoc pode já ter disparado; o ciclo loading→ready é provado abaixo.
    expect(screen.getByText(/^(Carregando|Pronto)$/)).toBeInTheDocument()
    await createBrowserTab(user)
    await createBrowserTab(user)
    expect(editorTabs()).toHaveLength(3)
    expect(browserTabTitles()).toEqual(['Browser', 'Browser 2', 'Browser 3'])

    const secondTab = editorTabs().find((tab) => tab.querySelector('.editor-tab-title')?.textContent === 'Browser 2')
    if (!secondTab) throw new Error('Second Browser tab not found')
    await user.click(secondTab)
    expect(secondTab).toHaveAttribute('aria-selected', 'true')

    const initialFrame = browserFrame()
    fireEvent.load(initialFrame)
    expect(screen.getByText('Pronto')).toBeInTheDocument()

    const address = screen.getByRole('textbox', { name: 'Endereço' })
    await user.clear(address)
    await user.type(address, 'example.test/next')
    await user.keyboard('{Enter}')
    expect(address).toHaveValue('https://example.test/next')
    expect(screen.getByRole('button', { name: 'Voltar' })).not.toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(screen.getByRole('textbox', { name: 'Endereço' })).toHaveValue('https://agents.local/sessions/s1')
    expect(screen.getByRole('button', { name: 'Avançar' })).not.toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Avançar' }))
    expect(screen.getByRole('textbox', { name: 'Endereço' })).toHaveValue('https://example.test/next')

    const frameBeforeReload = browserFrame()
    await user.click(screen.getByRole('button', { name: 'Recarregar' }))
    await waitFor(() => expect(browserFrame()).not.toBe(frameBeforeReload))

    const invalidAddress = screen.getByRole('textbox', { name: 'Endereço' })
    await user.clear(invalidAddress)
    await user.type(invalidAddress, 'https://')
    await user.keyboard('{Enter}')
    expect(screen.getByText('Falha')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Verifique o endereço')
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    fireEvent.load(browserFrame())
    expect(screen.getByText('Pronto')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '375' }))
    expect(browserFrame().parentElement).toHaveClass('is-mobile')
    await user.click(screen.getByRole('button', { name: '768' }))
    expect(browserFrame().parentElement).toHaveClass('is-tablet')
    await user.click(screen.getByRole('button', { name: 'Desk' }))
    expect(browserFrame().parentElement).not.toHaveClass('is-tablet')
    expect(browserFrame().parentElement).not.toHaveClass('is-mobile')

    const closeTab = async (title: string) => {
      const tab = editorTabs().find((candidate) => candidate.querySelector('.editor-tab-title')?.textContent === title)
      if (!tab) throw new Error(`Browser tab not found: ${title}`)
      const close = tab.querySelector<HTMLElement>('.editor-tab-close')
      if (!close) throw new Error(`Close button not found: ${title}`)
      await user.click(close)
    }

    await closeTab('Browser 2')
    expect(browserTabTitles()).toEqual(['Browser', 'Browser 3'])
    await closeTab('Browser 3')
    await closeTab('Browser')
    expect(editorTabs()).toHaveLength(0)
    expect(screen.queryByRole('textbox', { name: 'Endereço' })).not.toBeInTheDocument()
  })

  it('seleciona a próxima aba correta ao fechar e expõe o tabpanel ativo', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openInitialBrowser(user)

    const editorTabs = () => Array.from(document.querySelectorAll<HTMLElement>('.editor-tab[role="tab"]'))
    const tabByTitle = (title: string) => editorTabs().find((tab) => tab.querySelector('.editor-tab-title')?.textContent === title)
    const close = async (title: string) => {
      const tab = tabByTitle(title)
      if (!tab) throw new Error(`Editor tab not found: ${title}`)
      const closeButton = within(tab).getByRole('button', { name: `Fechar ${title}` })
      await user.click(closeButton)
    }

    await createBrowserTab(user)
    await createBrowserTab(user)
    const browserTwo = tabByTitle('Browser 2')
    if (!browserTwo) throw new Error('Browser 2 tab not found')
    await user.click(browserTwo)
    expect(browserTwo).toHaveAttribute('aria-selected', 'true')
    expect(within(screen.getByRole('region', { name: 'Área principal do editor' })).getByRole('tabpanel')).toHaveAttribute('aria-labelledby', browserTwo.id)

    await close('Browser 2')
    expect(tabByTitle('Browser 3')).toHaveAttribute('aria-selected', 'true')
    await close('Browser 3')
    expect(tabByTitle('Browser')).toHaveAttribute('aria-selected', 'true')
    await close('Browser')
    // CAT-A1/A2: ao fechar a última aba, a área do editor desaparece — não fica
    // mais um editor vazio fixo em 50%. Com a barra de detalhes ainda visível, o
    // estado é "detail-only"; o chat absorve a largura do editor.
    expect(screen.queryByTestId('editor-empty-state')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Área principal do editor' })).not.toBeInTheDocument()
    expect(document.querySelector('.desktop-surface-group.side-pane-detail-only')).not.toBeNull()

    // Ao ocultar também os detalhes, o side pane fecha e o chat centraliza (CAT-H5).
    await user.click(screen.getByRole('button', { name: 'Alternar barra auxiliar' }))
    expect(document.querySelector('.desktop-surface-group.chat-centered')).not.toBeNull()
  })

  it('navega pelas tabs por teclado e cria Files, Search e Changes no menu de nova aba', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openInitialBrowser(user)

    await createBrowserTab(user)
    const browserTwo = Array.from(document.querySelectorAll<HTMLElement>('.editor-tab[role="tab"]')).find((tab) => tab.querySelector('.editor-tab-title')?.textContent === 'Browser 2')
    if (!browserTwo) throw new Error('Browser 2 tab not found')
    browserTwo.focus()
    await user.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'Browser' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Browser 2' })).toHaveAttribute('aria-selected', 'true')

    const editorPane = screen.getByRole('region', { name: 'Área principal do editor' })
    const addTab = screen.getByRole('button', { name: 'Adicionar aba do editor' })
    await user.click(addTab)
    expect(screen.getByRole('menu', { name: 'Novas abas do editor' })).toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: 'Files' }))
    expect(within(editorPane).getByRole('tab', { name: 'Files' })).toHaveAttribute('aria-selected', 'true')

    await user.click(addTab)
    await user.click(screen.getByRole('menuitem', { name: 'Search' }))
    expect(within(editorPane).getByRole('tab', { name: 'Search' })).toHaveAttribute('aria-selected', 'true')

    await user.click(addTab)
    await user.click(screen.getByRole('menuitem', { name: 'Changes' }))
    expect(within(editorPane).getByRole('tab', { name: 'Branch Changes' })).toHaveAttribute('aria-selected', 'true')
  })

  it('restaura a tab ativa própria da sessão sem remover Search ou arquivos compartilhados', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Abrir alterações no editor' }))
    expect(screen.getByRole('tab', { name: 'Branch Changes' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('button', { name: 'Abrir busca no editor' }))
    expect(screen.getByRole('tab', { name: 'Search' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('tab', { name: 'Branch Changes' }))
    expect(screen.getByRole('tab', { name: 'Branch Changes' })).toHaveAttribute('aria-selected', 'true')

    await user.click(sessionRow('Revisar alterações do workbench'))
    expect(screen.queryByRole('tab', { name: 'Branch Changes' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Search' })).toHaveAttribute('aria-selected', 'true')

    await user.click(sessionRow('Replicar a Janela de Agentes'))
    expect(screen.getByRole('tab', { name: 'Branch Changes' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Search' })).toBeInTheDocument()
  })

  it('preserva Browser por sessão e remove todos os browsers ao arquivar ou excluir', async () => { 
    const user = userEvent.setup()
    render(<App />)
    await openInitialBrowser(user)

    const editorTabs = () => Array.from(document.querySelectorAll<HTMLElement>('.editor-tab[role="tab"]'))
    await createBrowserTab(user)
    await user.click(sessionRow('Revisar alterações do workbench'))
    expect(editorTabs()).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Abrir navegador no editor' }))
    expect(editorTabs()).toHaveLength(1)
    expect(editorTabs()[0]).toHaveAttribute('data-session-id', 's2')
    expect(editorTabs()[0]).toHaveAttribute('data-browser-id')
    expect(screen.getByRole('textbox', { name: 'Endereço' })).toHaveValue('https://agents.local/sessions/s2')

    await user.click(sessionRow('Replicar a Janela de Agentes'))
    expect(editorTabs()).toHaveLength(2)
    expect(editorTabs().every((tab) => tab.dataset.sessionId === 's1')).toBe(true)
    const s1SecondTab = editorTabs().find((tab) => tab.querySelector('.editor-tab-title')?.textContent === 'Browser 2')
    if (!s1SecondTab) throw new Error('Second session Browser tab not found')
    await user.click(s1SecondTab)
    const s1Address = screen.getByRole('textbox', { name: 'Endereço' })
    await user.clear(s1Address)
    await user.type(s1Address, 's1-private.test')
    await user.keyboard('{Enter}')
    expect(s1Address).toHaveValue('https://s1-private.test/')
    await user.click(screen.getByRole('button', { name: '375' }))
    expect(screen.getByTitle(/Browser https:\/\//).parentElement).toHaveClass('is-mobile')

    await user.click(sessionRow('Revisar alterações do workbench'))
    expect(editorTabs()).toHaveLength(1)
    expect(screen.getByRole('textbox', { name: 'Endereço' })).toHaveValue('https://agents.local/sessions/s2')

    await user.click(sessionRow('Replicar a Janela de Agentes'))
    expect(editorTabs()).toHaveLength(2)
    expect(screen.getByRole('textbox', { name: 'Endereço' })).toHaveValue('https://s1-private.test/')
    expect(screen.getByTitle(/Browser https:\/\//).parentElement).toHaveClass('is-mobile')
    const restoredBrowserTab = editorTabs().find((tab) => tab.querySelector('.editor-tab-title')?.textContent === 'Browser 2')
    expect(restoredBrowserTab).toHaveAttribute('aria-selected', 'true')

    await user.click(within(sessionRow('Replicar a Janela de Agentes')).getByRole('button', { name: 'Arquivar' }))
    expect(editorTabs()).toHaveLength(0)
    await user.click(sessionRow('Revisar alterações do workbench'))
    expect(editorTabs()).toHaveLength(1)

    await user.click(within(sessionRow('Revisar alterações do workbench')).getByRole('button', { name: 'Excluir sessão' }))
    expect(editorTabs()).toHaveLength(0)
    expect(screen.queryByRole('textbox', { name: 'Endereço' })).not.toBeInTheDocument()
    expect(screen.queryByText('Revisar alterações do workbench')).not.toBeInTheDocument()
  })

  it('abre Search no Editor com foco, filtra, conta, destaca, mostra vazio e abre arquivo', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openInitialBrowser(user)

    await user.click(screen.getByRole('button', { name: 'Abrir busca no editor' }))
    const searchInput = screen.getByRole('textbox', { name: 'Pesquisar no workspace' })
    expect(searchInput).toHaveFocus()
    expect(screen.getByRole('tab', { name: /Search/ })).toHaveAttribute('aria-selected', 'true')
    expect(document.querySelector('.auxiliary-bar .search-view')).toBeNull()
    expect(screen.getByText('1 resultado')).toBeInTheDocument()
    expect(document.querySelector('.search-result-line mark')).toHaveTextContent('menubar')

    await user.clear(searchInput)
    await user.type(searchInput, 'active session')
    expect(screen.getByText('1 resultado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sessionBrowserView\.ts, linha 58/ })).toBeInTheDocument()
    expect(document.querySelector('.search-result-line mark')).toHaveTextContent('active session')

    await user.clear(searchInput)
    await user.type(searchInput, 'sessionBrowserView')
    expect(screen.getByText('1 resultado')).toBeInTheDocument()
    expect(document.querySelector('.search-result-meta mark')).toHaveTextContent('sessionBrowserView')

    await user.clear(searchInput)
    await user.type(searchInput, 'term-that-does-not-exist')
    expect(screen.getByText('0 resultados')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Nenhum resultado')

    await user.clear(searchInput)
    await user.type(searchInput, 'menubar')
    const resultButton = document.querySelector<HTMLButtonElement>('.search-result')
    if (!resultButton) throw new Error('Search result button not found')
    await user.click(resultButton)

    const fileTab = screen.getByRole('tab', { name: /titlebarPart\.ts/ })
    expect(fileTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByRole('textbox', { name: 'Pesquisar no workspace' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Abrir alterações no editor' }))
    expect(screen.getByRole('tab', { name: /Branch Changes/ })).toHaveAttribute('aria-selected', 'true')
    const browserTab = document.querySelector<HTMLElement>('.editor-tab[role="tab"][data-browser-id]')
    if (!browserTab) throw new Error('Browser editor tab not found after opening Search result')
    await user.click(browserTab)
    expect(screen.getByRole('textbox', { name: 'Endereço' })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Search/ }))
    expect(screen.getByRole('textbox', { name: 'Pesquisar no workspace' })).toHaveValue('menubar')
  })

  it('abre Branch Changes como aba do Editor, lista arquivos, seleciona o diff e preserva a seleção por sessão', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openInitialBrowser(user)

    await user.click(screen.getByRole('button', { name: 'Abrir alterações no editor' }))
    const diffTab = screen.getByRole('tab', { name: /Branch Changes/ })
    expect(diffTab).toHaveAttribute('aria-selected', 'true')
    expect(diffTab).toHaveAttribute('data-session-id', 's1')
    expect(document.querySelector('.auxiliary-bar .diff-view')).toBeNull()
    expect(screen.getByText('4 arquivos')).toBeInTheDocument()
    expect(screen.getByText('src/browser/parts/titlebarPart.ts')).toBeInTheDocument()
    expect(screen.getByText('Original')).toBeInTheDocument()
    expect(screen.getByText('Modificado')).toBeInTheDocument()
    expect(document.querySelector('.diff-selected-editor[data-selected-diff-id="diff-1"]')).toBeInTheDocument()

    const secondFileHeader = screen.getByRole('button', { name: 'Selecionar src/contrib/sessions/browser/media/sessionsList.css' })
    await user.click(secondFileHeader)
    expect(secondFileHeader).toHaveAttribute('aria-pressed', 'true')
    expect(document.querySelector('.diff-entry[data-diff-file-id="diff-1"]')).not.toHaveClass('is-active')
    expect(document.querySelector('.diff-selected-editor[data-selected-diff-id="diff-2"]')).toBeInTheDocument()

    const thirdFileHeader = screen.getByRole('button', { name: 'Selecionar src/contrib/browserView/browser/sessionBrowserView.ts' })
    thirdFileHeader.focus()
    fireEvent.keyDown(thirdFileHeader, { key: ' ', code: 'Space' })
    expect(screen.getByRole('button', { name: 'Selecionar src/contrib/browserView/browser/sessionBrowserView.ts' })).toHaveAttribute('aria-pressed', 'true')
    expect(document.querySelector('.diff-selected-editor[data-selected-diff-id="diff-3"]')).toBeInTheDocument()

    const browserTab = document.querySelector<HTMLElement>('.editor-tab[role="tab"][data-browser-id]')
    if (!browserTab) throw new Error('Browser editor tab not found')
    await user.click(browserTab)
    await user.click(screen.getByRole('tab', { name: /Branch Changes/ }))
    expect(document.querySelector('.diff-selected-editor[data-selected-diff-id="diff-3"]')).toBeInTheDocument()

    await user.click(sessionRow('Revisar alterações do workbench'))
    expect(screen.queryByRole('tab', { name: /Branch Changes/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Abrir alterações no editor' }))
    const secondSessionDiffTab = screen.getByRole('tab', { name: /Branch Changes/ })
    expect(secondSessionDiffTab).toHaveAttribute('data-session-id', 's2')
    expect(document.querySelector('.diff-selected-editor[data-selected-diff-id="diff-1"]')).toBeInTheDocument()

    await user.click(sessionRow('Replicar a Janela de Agentes'))
    const restoredDiffTab = screen.getByRole('tab', { name: /Branch Changes/ })
    await user.click(restoredDiffTab)
    expect(restoredDiffTab).toHaveAttribute('data-session-id', 's1')
    expect(document.querySelector('.diff-selected-editor[data-selected-diff-id="diff-3"]')).toBeInTheDocument()
  })

  it('executa as ações de Diff por arquivo e em lote com feedback observável e isolamento por sessão', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Abrir alterações no editor' }))

    const entry = (id: string): HTMLElement => {
      const element = document.querySelector<HTMLElement>(`.diff-entry[data-diff-file-id="${id}"]`)
      if (!element) throw new Error(`Diff entry not found: ${id}`)
      return element
    }

    const first = entry('diff-1')
    const viewed = within(first).getByRole('button', { name: 'Viewed' })
    await user.click(viewed)
    expect(viewed).toHaveAttribute('aria-pressed', 'true')
    expect(first).toHaveClass('is-viewed')
    expect(first.querySelector('.diff-code-preview')).toBeNull()
    expect(screen.getByText('Arquivo marcado como Viewed')).toBeInTheDocument()

    await user.click(viewed)
    expect(viewed).toHaveAttribute('aria-pressed', 'false')
    expect(first.querySelector('.diff-code-preview')).toBeInTheDocument()
    expect(screen.getByText('Arquivo reaberto para revisão')).toBeInTheDocument()

    await user.click(within(first).getByRole('button', { name: 'Aceitar src/browser/parts/titlebarPart.ts' }))
    expect(within(first).getByText('Aceito')).toBeInTheDocument()
    expect(screen.getByText('Alteração aceita')).toBeInTheDocument()

    await user.click(within(first).getByRole('button', { name: 'Reverter src/browser/parts/titlebarPart.ts' }))
    expect(within(first).getByText('Revertido')).toBeInTheDocument()
    expect(screen.getByText('Alteração revertida')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Aceitar tudo' }))
    expect(document.querySelectorAll('.diff-resolution.accepted')).toHaveLength(4)
    expect(screen.getByText('Todas as alterações foram aceitas')).toBeInTheDocument()
    const toolbarStats = document.querySelector('.diff-toolbar-stats')
    expect(toolbarStats).toHaveTextContent('+0')
    expect(toolbarStats).toHaveTextContent('−0')

    await user.click(screen.getByRole('button', { name: 'Reverter tudo' }))
    expect(document.querySelectorAll('.diff-resolution.reverted')).toHaveLength(4)
    expect(screen.getByText('Todas as alterações foram revertidas')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Commit' }))
    expect(screen.getByText('Commit preparado para a sessão')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Criar PR' }))
    expect(screen.getByText('Pull request preparado')).toBeInTheDocument()

    await user.click(sessionRow('Revisar alterações do workbench'))
    await user.click(screen.getByRole('button', { name: 'Abrir alterações no editor' }))
    expect(document.querySelectorAll('.diff-resolution.pending')).toHaveLength(4)

    await user.click(sessionRow('Replicar a Janela de Agentes'))
    await user.click(screen.getByRole('button', { name: 'Abrir alterações no editor' }))
    expect(document.querySelectorAll('.diff-resolution.reverted')).toHaveLength(4)
  })

  it('audita Changes, Files e Checks da barra auxiliar com ações reais e isolamento por sessão', async () => {
    const user = userEvent.setup()
    render(<App />)

    // A aba padrão é Browser, que oculta o detalhe transitoriamente (R-044).
    // Ativa a aba Changes do editor para revelar o painel de detalhes.
    await user.click(screen.getByRole('button', { name: 'Abrir alterações no editor' }))
    const auxiliary = () => screen.getByRole('complementary', { name: 'Barra auxiliar' })
    expect(auxiliary()).toBeInTheDocument()

    await user.click(within(auxiliary()).getByRole('tab', { name: /Files/ }))
    expect(screen.getByText('Workspace Files')).toBeInTheDocument()
    const browserFolder = screen.getByRole('button', { name: 'Recolher pasta browser' })
    await user.click(browserFolder)
    expect(browserFolder).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: 'Abrir arquivo parts/titlebarPart.ts' })).not.toBeInTheDocument()

    // (E4) A visibilidade da barra auxiliar e o container ativo (Changes/Files)
    // são estado por sessão: ao trocar para a s2 — nunca aberta — o detalhe
    // volta ao padrão (oculto). Reabrimos o detalhe para auditar a s2.
    await user.click(sessionRow('Revisar alterações do workbench'))
    expect(screen.queryByRole('complementary', { name: 'Barra auxiliar' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Abrir alterações no editor' }))
    await user.click(within(auxiliary()).getByRole('tab', { name: /Files/ }))
    // A pasta browser da s2 continua expandida — isolada da s1.
    expect(screen.getByRole('button', { name: 'Recolher pasta browser' })).toBeInTheDocument()

    // Ao voltar para a s1, o estado capturado é restaurado (detalhe visível,
    // aba Files) e a pasta browser continua recolhida.
    await user.click(sessionRow('Replicar a Janela de Agentes'))
    expect(auxiliary()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Expandir pasta browser' })).toHaveAttribute('aria-expanded', 'false')
    await user.click(screen.getByRole('button', { name: 'Expandir pasta browser' }))
    await user.click(screen.getByRole('button', { name: 'Abrir arquivo parts/titlebarPart.ts' }))
    expect(screen.getByRole('tab', { name: /titlebarPart\.ts/ })).toHaveAttribute('aria-selected', 'true')

    await user.click(within(auxiliary()).getByRole('tab', { name: /Changes/ }))
    const checksHeader = screen.getByRole('button', { name: 'Alternar Checks' })
    expect(checksHeader).toHaveAttribute('aria-expanded', 'true')
    await user.click(checksHeader)
    expect(checksHeader).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Typecheck')).not.toBeInTheDocument()

    // Isolamento de Checks por sessão: a s2 restaura seu detalhe (aba Files);
    // trocamos para Changes e confirmamos que seus Checks seguem expandidos.
    await user.click(sessionRow('Revisar alterações do workbench'))
    await user.click(within(auxiliary()).getByRole('tab', { name: /Changes/ }))
    expect(screen.getByRole('button', { name: 'Alternar Checks' })).toHaveAttribute('aria-expanded', 'true')
    // De volta à s1: detalhe restaurado na aba Changes e Checks ainda recolhidos.
    await user.click(sessionRow('Replicar a Janela de Agentes'))
    expect(screen.getByRole('button', { name: 'Alternar Checks' })).toHaveAttribute('aria-expanded', 'false')
    await user.click(screen.getByRole('button', { name: 'Alternar Checks' }))

    await user.click(screen.getByRole('button', { name: 'Executar novamente' }))
    expect(screen.getByRole('status')).toHaveTextContent('Checks executados novamente (mock)')
    await user.click(screen.getByRole('button', { name: 'Abrir Accessibility no GitHub' }))
    expect(screen.getByRole('status')).toHaveTextContent('Accessibility aberto no GitHub (mock)')

    await user.click(screen.getByRole('button', { name: 'Revisar' }))
    expect(screen.getByRole('tab', { name: /Branch Changes/ })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('button', { name: 'Abrir diff src/browser/parts/titlebarPart.ts' }))
    expect(document.querySelector('.diff-selected-editor[data-selected-diff-id="diff-1"]')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Preparar PR' }))
    expect(screen.getByRole('status')).toHaveTextContent('Pull request preparado')

    await user.click(screen.getByRole('button', { name: 'Fechar barra auxiliar' }))
    expect(screen.queryByRole('complementary', { name: 'Barra auxiliar' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Alternar barra auxiliar' }))
    expect(auxiliary()).toBeInTheDocument()
  })

  it('build the project → changes view (package.json/build.ts/index.ts) + Merge + Abrir terminal (R-060/R-063)', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Envia "build the project" no chat de uma sessão com composer visível.
    await user.click(sessionRow('Ajustar layout single-pane'))
    const input = screen.getByRole('textbox', { name: 'Mensagem para o agente' })
    await user.type(input, 'build the project')
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))

    // Após a resposta, o changeset de build aparece na changes view.
    await user.click(await screen.findByRole('button', { name: 'Abrir alterações no editor' }))
    const auxiliary = () => screen.getByRole('complementary', { name: 'Barra auxiliar' })
    await user.click(within(auxiliary()).getByRole('tab', { name: /Changes/ }))

    await waitFor(() => {
      expect(within(auxiliary()).getByRole('button', { name: 'Abrir diff package.json' })).toBeInTheDocument()
    })
    expect(within(auxiliary()).getByRole('button', { name: 'Abrir diff build.ts' })).toBeInTheDocument()
    expect(within(auxiliary()).getByRole('button', { name: 'Abrir diff src/index.ts' })).toBeInTheDocument()

    // index.ts abre no diff editor.
    await user.click(within(auxiliary()).getByRole('button', { name: 'Abrir diff src/index.ts' }))
    expect(document.querySelector('.diff-selected-editor[data-selected-diff-id="build-index-ts"]')).toBeInTheDocument()

    // "Abrir terminal" torna o terminal visível (toast de confirmação).
    await user.click(within(auxiliary()).getByRole('button', { name: 'Abrir terminal' }))
    expect(await screen.findByText('Terminal aberto')).toBeInTheDocument()

    // Merge mescla as alterações e esvazia a changes view.
    await user.click(within(auxiliary()).getByRole('button', { name: 'Merge' }))
    expect(await screen.findByText(/mesclado/)).toBeInTheDocument()
    await waitFor(() => {
      expect(within(auxiliary()).queryByRole('button', { name: 'Abrir diff build.ts' })).not.toBeInTheDocument()
    })
  })

  it('mostra empty state coerente quando a sessão não possui alterações', async () => {
    const user = userEvent.setup()
    render(<App />)

    const newSessionButton = document.querySelector<HTMLButtonElement>('.titlebar [aria-label="Nova sessão"]')
    if (!newSessionButton) throw new Error('New session button not found')
    await user.click(newSessionButton)
    await user.click(screen.getByRole('button', { name: 'Abrir alterações no editor' }))

    expect(screen.getByTestId('diff-empty-state')).toHaveTextContent('Sem alterações pendentes')
    expect(screen.getByTestId('diff-empty-state')).toHaveTextContent('Esta sessão não possui arquivos alterados')
    expect(screen.queryByText('4 arquivos')).not.toBeInTheDocument()
  })

  it('mantém Branch Changes no Editor quando o layout entra em single-pane', async () => {
    const user = userEvent.setup()
    const originalWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 760 })

    try {
      render(<App />)
      await user.click(screen.getByRole('button', { name: 'Abrir alterações no editor' }))

      expect(document.querySelector('.editor-pane .diff-view')).toBeInTheDocument()
      expect(document.querySelector('.auxiliary-bar .diff-view')).toBeNull()
      expect(document.querySelector('.mobile-dock-tabs .dock-tab.is-active')).toHaveTextContent('Editor')
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth })
    }
  })

  // E15 (SINGLE_PANE_SCENARIOS.md / R-039): no single-pane o Main Editor tem
  // exatamente 1 group — split/grid ficam desabilitados via serviço de layout.
  it('bloqueia dividir editor no layout single-pane (um único grupo)', async () => {
    const user = userEvent.setup()
    const originalWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 720 })
    const originalTouch = Object.getOwnPropertyDescriptor(window.navigator, 'maxTouchPoints')
    const originalMatchMedia = window.matchMedia
    Object.defineProperty(window.navigator, 'maxTouchPoints', { configurable: true, value: 5 })
    window.matchMedia = ((query: string) => ({
      matches: query.includes('coarse'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia

    try {
      render(<App />)
      // Abre o navegador (a toolbar do editor com "Dividir editor" aparece).
      await user.click(screen.getAllByRole('button', { name: 'Abrir navegador no editor' })[0])
      await user.click(screen.getByRole('button', { name: 'Dividir editor' }))
      const toast = await screen.findByRole('status')
      expect(toast).toHaveTextContent('Divisão indisponível')
      // Nenhuma aba extra "Files (divisão)" foi criada.
      expect(screen.queryByText('Files (divisão)')).not.toBeInTheDocument()
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth })
      if (originalTouch) Object.defineProperty(window.navigator, 'maxTouchPoints', originalTouch)
      window.matchMedia = originalMatchMedia
    }
  })

  // E15 (MOBILE_DIFF_EDITORS.md / R-049): em single-pane, a aba de Detalhes
  // apresenta a revisão de diff full-screen unificada (MobileDiffView).
  it('mostra o diff unificado full-screen na aba Detalhes em single-pane', async () => {
    const user = userEvent.setup()
    const originalWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 560 })
    const originalTouch = Object.getOwnPropertyDescriptor(window.navigator, 'maxTouchPoints')
    const originalMatchMedia = window.matchMedia
    Object.defineProperty(window.navigator, 'maxTouchPoints', { configurable: true, value: 5 })
    window.matchMedia = ((query: string) => ({
      matches: query.includes('coarse'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia

    try {
      render(<App />)
      // A sessão ativa (s1) tem arquivos alterados. Vai para a aba Detalhes.
      await user.click(screen.getByRole('button', { name: /Detalhes/ }))
      const overlay = screen.getByRole('dialog', { name: 'Revisão de alterações' })
      expect(overlay).toBeInTheDocument()
      // Diff unificado: há linhas adicionadas e/ou removidas renderizadas.
      expect(overlay.querySelector('.mobile-diff-line.is-added, .mobile-diff-line.is-removed')).not.toBeNull()

      // Navegação entre arquivos irmãos (contador avança).
      expect(within(overlay).getByLabelText(/Arquivo 1 de/)).toBeInTheDocument()
      await user.click(within(overlay).getByRole('button', { name: 'Próximo arquivo' }))
      expect(within(overlay).getByLabelText(/Arquivo 2 de/)).toBeInTheDocument()
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth })
      if (originalTouch) Object.defineProperty(window.navigator, 'maxTouchPoints', originalTouch)
      window.matchMedia = originalMatchMedia
    }
  })

  // R-076 (LEIA-ME §5): navegação por teclado com setas move o foco entre as
  // linhas de sessão (roving focus), sem wrap.
  it('navega entre sessões com as setas do teclado', () => {
    render(<App />)
    const rows = Array.from(document.querySelectorAll<HTMLElement>('.session-row[data-session-nav="true"]'))
    expect(rows.length).toBeGreaterThan(1)

    rows[0].focus()
    expect(document.activeElement).toBe(rows[0])

    fireEvent.keyDown(rows[0], { key: 'ArrowDown' })
    expect(document.activeElement).toBe(rows[1])

    fireEvent.keyDown(rows[1], { key: 'ArrowUp' })
    expect(document.activeElement).toBe(rows[0])

    // Sem wrap: ArrowUp no primeiro mantém o foco no primeiro.
    fireEvent.keyDown(rows[0], { key: 'ArrowUp' })
    expect(document.activeElement).toBe(rows[0])

    // End vai para a última linha.
    fireEvent.keyDown(rows[0], { key: 'End' })
    expect(document.activeElement).toBe(rows[rows.length - 1])
  })

  // E14 (R-022/R-026/R-027/R-028): o Sessions Part grid mostra várias sessões
  // lado a lado quando o usuário abre uma "ao lado"; fechar volta ao single.
  it('abre e fecha uma sessão peer no Sessions Part grid', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Sem grid inicialmente (uma única sessão visível).
    expect(document.querySelector('.sessions-part-grid')).toBeNull()

    // Abre a 2ª sessão "ao lado" pelo menu de contexto de outra linha.
    const rows = Array.from(document.querySelectorAll<HTMLElement>('.session-row'))
    expect(rows.length).toBeGreaterThan(1)
    fireEvent.contextMenu(rows[1])
    await user.click(screen.getByRole('menuitem', { name: 'Abrir ao lado' }))

    // Agora o grid tem 2 leaves.
    const grid = document.querySelector('.sessions-part-grid') as HTMLElement
    expect(grid).not.toBeNull()
    expect(grid.querySelectorAll('.sessions-part-leaf')).toHaveLength(2)

    // Fecha um peer → volta ao arranjo single (sem grid).
    const closeButtons = within(grid).getAllByRole('button', { name: /Fechar sessão .* do grid/ })
    await user.click(closeButtons[0])
    expect(document.querySelector('.sessions-part-grid')).toBeNull()
  })

  it('abre Search pelo atalho Ctrl ou Cmd mais Shift mais F', async () => {
    render(<App />)

    fireEvent.keyDown(window, { key: 'f', ctrlKey: true, shiftKey: true })
    expect(screen.getByRole('textbox', { name: 'Pesquisar no workspace' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: /Search/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('alterna sidebar, terminal e barra auxiliar pela titlebar', async () => {
    const user = userEvent.setup()
    render(<App />)

    const workbench = document.querySelector('.workbench') ?? document.body

    // Sidebar começa visível; alterna e verifica o efeito real no layout.
    const sidebarToggle = screen.getByRole('button', { name: 'Alternar lista de sessões' })
    expect(sidebarToggle).toHaveClass('is-active')
    // A barra de sessões está de fato visível (sem is-hidden).
    expect(document.querySelector('.sessions-sidebar')).not.toHaveClass('is-hidden')
    await user.click(sidebarToggle)
    expect(screen.getByRole('button', { name: 'Alternar lista de sessões' })).not.toHaveClass('is-active')
    // ...e agora ela some de fato do layout (bug corrigido: o toggle recolhe a barra).
    expect(document.querySelector('.sessions-sidebar')).toHaveClass('is-hidden')
    // Reexibe para não afetar o restante do teste.
    await user.click(screen.getByRole('button', { name: 'Alternar lista de sessões' }))
    expect(document.querySelector('.sessions-sidebar')).not.toHaveClass('is-hidden')

    // Barra auxiliar: alternar deve mudar o estado is-active do botão.
    const auxToggle = screen.getByRole('button', { name: 'Alternar barra auxiliar' })
    const auxWasActive = auxToggle.classList.contains('is-active')
    await user.click(auxToggle)
    expect(screen.getByRole('button', { name: 'Alternar barra auxiliar' }).classList.contains('is-active')).toBe(!auxWasActive)

    // Terminal: alternar liga o estado is-active.
    const terminalToggle = screen.getByRole('button', { name: 'Alternar terminal' })
    const terminalWasActive = terminalToggle.classList.contains('is-active')
    await user.click(terminalToggle)
    expect(screen.getByRole('button', { name: 'Alternar terminal' }).classList.contains('is-active')).toBe(!terminalWasActive)

    expect(workbench).toBeTruthy()
  })

  it('cria nova sessão pela titlebar e fecha o aviso (toast)', async () => {
    const user = userEvent.setup()
    render(<App />)

    const newSessionButtons = screen.getAllByRole('button', { name: 'Nova sessão' })
    await user.click(newSessionButtons[0])

    // A nova sessão vira a ativa (como draft) e um toast é exibido.
    const toast = await screen.findByRole('status')
    expect(toast).toHaveTextContent('Rascunho de sessão criado')

    await user.click(within(toast).getByRole('button', { name: 'Fechar aviso' }))
    await waitFor(() => {
      expect(screen.queryByText('Rascunho de sessão criado')).not.toBeInTheDocument()
    })
  })

  // R-003: uma nova sessão nasce como DRAFT ("Nova sessão") e só entra no
  // catálogo commitado no primeiro envio, quando o título passa a ser derivado
  // do texto enviado (SESSIONS.md §Drafts / §New session).
  it('commita o draft de nova sessão no primeiro envio e deriva o título', async () => {
    const user = userEvent.setup()
    render(<App />)

    const newSessionButtons = screen.getAllByRole('button', { name: 'Nova sessão' })
    await user.click(newSessionButtons[0])

    // Enquanto draft, o título permanece "Nova sessão".
    expect(within(sessionRow('Nova sessão')).getByText('Nova sessão')).toBeInTheDocument()

    // Primeiro envio: commita o draft e deriva o título do texto.
    const input = screen.getByRole('textbox', { name: 'Mensagem para o agente' })
    await user.type(input, 'implementar o fluxo de rascunho de sessão')
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))

    await waitFor(() => {
      expect(sessionRow('implementar o fluxo de rascunho de sessão')).toBeTruthy()
    })
    // O título antigo do draft não sobra na lista.
    expect(screen.queryByText('Nova sessão', { selector: '.session-title-text' })).not.toBeInTheDocument()
  })

  it('o pill do Command Center abre o seletor flutuante de sessões (não cria sessão)', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Mostrar sessões' }))

    // Abre o quick-pick flutuante e foca o campo de busca; não cria sessão.
    const dialog = screen.getByRole('dialog', { name: 'Buscar sessões' })
    await waitFor(() => expect(within(dialog).getByRole('combobox')).toHaveFocus())
    expect(screen.queryByText('Nova sessão criada')).not.toBeInTheDocument()
  })

  it('filtra, navega por teclado e abre uma sessão pelo seletor flutuante (E9)', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Mostrar sessões' }))
    const dialog = screen.getByRole('dialog', { name: 'Buscar sessões' })
    const input = within(dialog).getByRole('combobox')
    await user.type(input, 'single-pane')

    // Só a sessão correspondente sobra como opção (além do New Session).
    const options = within(dialog).getAllByRole('option')
    expect(options.some((o) => o.textContent?.includes('Ajustar layout single-pane'))).toBe(true)

    // Enter abre a opção ativa; o seletor fecha e a sessão vira ativa.
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.queryByRole('dialog', { name: 'Buscar sessões' })).not.toBeInTheDocument()
  })

  it('a Changes pill do cabeçalho abre o diff e revela o editor (E10/R-083)', async () => {
    window.localStorage.clear()
    const user = userEvent.setup()
    render(<App />)
    await openInitialBrowser(user)

    // Oculta o editor (detail-only) para provar que a pill o revela de novo.
    await user.click(screen.getByRole('button', { name: 'Ocultar editor' }))
    expect(screen.getByTestId('editor-hidden-content')).toBeInTheDocument()

    // A pill do cabeçalho do chat abre a aba de diff e revela o editor.
    const headerPill = document.querySelector<HTMLButtonElement>('.chat-pane-header .changes-pill')
    if (!headerPill) throw new Error('Changes pill do cabeçalho não encontrada')
    await user.click(headerPill)
    expect(screen.getByRole('tab', { name: /Branch Changes/ })).toHaveAttribute('aria-selected', 'true')
    expect(document.querySelector('.editor-pane .diff-view')).toBeInTheDocument()
    expect(screen.queryByTestId('editor-hidden-content')).not.toBeInTheDocument()
  })

  it('cria uma nova sessão pela ação New Session do seletor flutuante (E9)', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Mostrar sessões' }))
    const dialog = screen.getByRole('dialog', { name: 'Buscar sessões' })
    await user.click(within(dialog).getByRole('option', { name: /New Session/ }))
    expect(screen.getByText('Rascunho de sessão criado')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Buscar sessões' })).not.toBeInTheDocument()
  })

  it('abre o menu da conta e dispara uma ação real', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Conta' }))
    await user.click(screen.getByRole('menuitem', { name: 'Perfil' }))

    const toast = await screen.findByRole('status')
    expect(toast).toHaveTextContent('Perfil aberto')
  })

  it('maximiza e restaura a área do editor', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)

    // Abre uma superfície de editor para o toolbar aparecer.
    await user.click(screen.getAllByRole('button', { name: 'Abrir navegador no editor' })[0])
    await user.click(screen.getByRole('button', { name: 'Maximizar editor' }))
    expect(container.querySelector('.desktop-surface-group.editor-maximized')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: 'Restaurar editor' }))
    expect(container.querySelector('.desktop-surface-group.editor-maximized')).toBeNull()
  })

  it('divide o editor abrindo uma segunda superfície de arquivos', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getAllByRole('button', { name: 'Abrir navegador no editor' })[0])
    await user.click(screen.getByRole('button', { name: 'Dividir editor' }))

    const toast = await screen.findByRole('status')
    expect(toast).toHaveTextContent('Editor dividido')
  })

  it('oculta e mostra o conteúdo do editor mantendo a barra de abas (detail-only)', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openInitialBrowser(user)

    // A sessão inicial já tem uma aba Browser aberta.
    expect(document.querySelector('.editor-tabs')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: 'Ocultar editor' }))
    // A barra de abas permanece visível (invariante CAT-A4)...
    expect(document.querySelector('.editor-tabs')).not.toBeNull()
    // ...mas o conteúdo do editor é substituído pelo placeholder de oculto.
    expect(screen.getByTestId('editor-hidden-content')).toBeInTheDocument()

    // O botão da toolbar (o primeiro) alterna de volta para "Mostrar editor".
    await user.click(screen.getAllByRole('button', { name: 'Mostrar editor' })[0])
    expect(screen.queryByTestId('editor-hidden-content')).not.toBeInTheDocument()
  })

  // R-040: o DockedAuxiliaryBarController fecha as abas NÃO-acopladas ao entrar
  // em Detail-only (mantém Changes/Files acopladas), capturando as restauráveis
  // (Browser) e restaurando-as ao mostrar o editor de novo.
  it('Detail-only fecha a aba Browser não-acoplada e a restaura ao mostrar o editor (R-040)', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openInitialBrowser(user)

    // Abre a aba acoplada Changes (docked) além da Browser inicial.
    await user.click(screen.getByRole('button', { name: 'Abrir alterações no editor' }))
    expect(screen.getByRole('tab', { name: /Branch Changes/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Browser' })).toBeInTheDocument()

    // Hide Editor → Detail-only: a Browser (não-acoplada) é fechada, a Changes fica.
    await user.click(screen.getByRole('button', { name: 'Ocultar editor' }))
    expect(screen.queryByRole('tab', { name: 'Browser' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Branch Changes/ })).toBeInTheDocument()

    // Show Editor → a Browser capturada é restaurada.
    await user.click(screen.getAllByRole('button', { name: 'Mostrar editor' })[0])
    expect(screen.getByRole('tab', { name: 'Browser' })).toBeInTheDocument()
  })

  it('persiste a visibilidade do terminal entre reloads (remontagem)', async () => {
    const user = userEvent.setup()
    window.localStorage.clear()
    const first = render(<App />)

    // Liga o terminal (parte oculto por padrão) e desmonta (simula fechar a aba).
    const terminalToggle = screen.getByRole('button', { name: 'Alternar terminal' })
    if (!terminalToggle.classList.contains('is-active')) await user.click(terminalToggle)
    expect(screen.getByRole('button', { name: 'Alternar terminal' })).toHaveClass('is-active')
    first.unmount()

    // Nova montagem (reload) restaura o terminal ligado a partir do storage.
    render(<App />)
    expect(screen.getByRole('button', { name: 'Alternar terminal' })).toHaveClass('is-active')
    window.localStorage.clear()
  })

  it('redistribui os tamanhos com duplo-clique no sash', async () => {
    render(<App />)
    await openInitialBrowser(userEvent.setup())

    // A sessão inicial tem editor visível → o sash existe.
    const handle = document.querySelector('.panel-resize-handle') as HTMLElement | null
    expect(handle).not.toBeNull()
    fireEvent.doubleClick(handle as HTMLElement)

    const toast = await screen.findByRole('status')
    expect(toast).toHaveTextContent('redistribuídos igualmente')
  })

  // R-082: os tamanhos do split por sessão são persistidos (Sizing.Distribute)
  // no storage, sobrevivendo a um reload (flicker-free: lido de uma vez no boot).
  it('persiste os tamanhos do split por sessão no storage', async () => {
    window.localStorage.clear()
    render(<App />)
    await openInitialBrowser(userEvent.setup())

    const handle = document.querySelector('.panel-resize-handle') as HTMLElement | null
    expect(handle).not.toBeNull()
    fireEvent.doubleClick(handle as HTMLElement)
    await screen.findByRole('status')

    // O estado persistido contém os tamanhos por sessão (mapa partSizesBySession).
    const raw = window.localStorage.getItem('workbench.sessions.layout.v1')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw as string)
    expect(parsed.partSizesBySession).toBeTruthy()
    const anySizes = Object.values(parsed.partSizesBySession)[0] as number[]
    expect(Array.isArray(anySizes)).toBe(true)
    expect(anySizes).toEqual([50, 50])
  })

  // R-071: duplo-clique no sash da barra de sessões restaura a largura padrão.
  it('restaura a largura da barra de sessões com duplo-clique no sash', async () => {
    // Parte de uma largura persistida diferente do padrão (360px).
    window.localStorage.setItem(
      'workbench.sessions.layout.v1',
      JSON.stringify({ shell: { sidebarVisible: true, auxiliaryVisible: true, terminalVisible: false, editorHidden: false, sidebarWidth: 360 }, partSizesBySession: {} }),
    )
    render(<App />)

    const body = document.querySelector('.workbench-body') as HTMLElement
    const handle = document.querySelector('.sidebar-resize-handle') as HTMLElement | null
    expect(handle).not.toBeNull()
    expect(body.style.getPropertyValue('--sidebar-width')).toBe('360px')

    // Duplo-clique restaura o padrão (300px) e avisa.
    fireEvent.doubleClick(handle as HTMLElement)
    expect(body.style.getPropertyValue('--sidebar-width')).toBe('300px')
    const toast = await screen.findByRole('status')
    expect(toast).toHaveTextContent('Largura da barra de sessões restaurada')
  })

  it('protege abas gerenciadas (Files) de fechamento em detail-only', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openInitialBrowser(user)

    // Abre uma aba Files (gerenciada) e oculta o editor → estado detail-only.
    await user.click(screen.getByRole('button', { name: 'Adicionar aba do editor' }))
    await user.click(screen.getByRole('menuitem', { name: 'Files' }))
    await user.click(screen.getByRole('button', { name: 'Ocultar editor' }))

    // A aba Files agora exibe o marcador de gerenciada, sem botão de fechar.
    const filesTab = Array.from(document.querySelectorAll<HTMLElement>('.editor-tab[role="tab"]'))
      .find((tab) => tab.querySelector('.editor-tab-title')?.textContent === 'Files')
    expect(filesTab).toBeTruthy()
    expect(within(filesTab as HTMLElement).queryByRole('button', { name: 'Fechar Files' })).not.toBeInTheDocument()
    expect((filesTab as HTMLElement).querySelector('.editor-tab-managed')).not.toBeNull()

    // (E13/R-081) Reforço: o menu de contexto também desabilita "Fechar aba".
    fireEvent.contextMenu(filesTab as HTMLElement)
    const closeItem = within(screen.getByRole('menu')).getByRole('menuitem', { name: /Fechar aba/ })
    expect(closeItem).toHaveAttribute('aria-disabled', 'true')
  })

  it('exclui até a última sessão, cai na tela inicial e recria uma sessão ao enviar', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Expande todas as seções colapsadas para que todos os botões de excluir fiquem acessíveis.
    for (const label of [/Fixadas/, /Semana passada/, /Anteriores/, /Arquivadas/]) {
      const header = screen.queryByRole('button', { name: label })
      if (header && header.getAttribute('aria-expanded') === 'false') {
        await user.click(header)
      }
    }

    // Exclui todas as sessões visíveis, uma a uma.
    let guard = 0
    let deleteButtons = screen.queryAllByRole('button', { name: 'Excluir sessão' })
    while (deleteButtons.length > 0 && guard < 20) {
      await user.click(deleteButtons[0])
      guard += 1
      deleteButtons = screen.queryAllByRole('button', { name: 'Excluir sessão' })
    }

    // Sem sessões → tela inicial (landing) centralizada.
    expect(screen.getByRole('region', { name: 'Nova sessão' })).toBeInTheDocument()
    const landingInput = screen.getByRole('textbox', { name: 'Mensagem para a nova sessão' })
    expect(landingInput).toBeInTheDocument()

    // Enviar a primeira mensagem recria uma sessão com título derivado do texto.
    await user.type(landingInput, 'começar do zero')
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))

    await waitFor(() => expect(screen.queryByRole('region', { name: 'Nova sessão' })).not.toBeInTheDocument())
    expect(sessionRow('começar do zero')).toBeInTheDocument()
  })

  // E5 (R-066/R-086): a landing centralizada é uma condição do painel central,
  // não uma tela separada — as colunas laterais permanecem montadas.
  it('mantém a lista de sessões (esquerda) visível na tela inicial vazia', async () => {
    const user = userEvent.setup()
    render(<App />)

    for (const label of [/Fixadas/, /Semana passada/, /Anteriores/, /Arquivadas/]) {
      const header = screen.queryByRole('button', { name: label })
      if (header && header.getAttribute('aria-expanded') === 'false') {
        await user.click(header)
      }
    }

    let guard = 0
    let deleteButtons = screen.queryAllByRole('button', { name: 'Excluir sessão' })
    while (deleteButtons.length > 0 && guard < 20) {
      await user.click(deleteButtons[0])
      guard += 1
      deleteButtons = screen.queryAllByRole('button', { name: 'Excluir sessão' })
    }

    // Sem sessões: input centralizado presente E o shell lateral permanece.
    expect(screen.getByRole('region', { name: 'Nova sessão' })).toBeInTheDocument()
    // A barra de sessões (esquerda) continua montada — não foi substituída por
    // uma tela cheia. A titlebar completa (com toggles) também permanece.
    expect(document.querySelector('.sessions-sidebar')).toBeTruthy()
    expect(screen.getByRole('complementary', { name: 'Lista de sessões' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alternar lista de sessões' })).toBeInTheDocument()
    // Não sobra o ramo antigo de tela cheia.
    expect(document.querySelector('.app-frame.is-empty-landing')).toBeNull()
  })

  // ── Onda 2 / E1 — menu de contexto (botão direito) ──────────────────────────
  it('abre menu de contexto na linha de sessão com as ações esperadas', async () => {
    render(<App />)

    fireEvent.contextMenu(sessionRow('Replicar a Janela de Agentes'))

    const menu = screen.getByRole('menu')
    expect(menu).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: 'Abrir sessão' })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: 'Abrir ao lado' })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: /Renomear/ })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: /Excluir/ })).toBeInTheDocument()

    // Escape fecha o menu.
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('abre menu de contexto numa aba do editor com Fechar/Dividir', async () => {
    render(<App />)
    await openInitialBrowser(userEvent.setup())

    const tab = browserEditorTab()
    if (!tab) throw new Error('Editor tab not found')
    fireEvent.contextMenu(tab)

    const menu = screen.getByRole('menu')
    expect(within(menu).getByRole('menuitem', { name: /Fechar aba/ })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: /Dividir editor/ })).toBeInTheDocument()
  })

  it('abre menu de contexto num chat aninhado da lista de sessões', async () => {
    render(<App />)

    const chat = nestedChat('Ajustes de UI').closest<HTMLElement>('.nested-chat-row')
    if (!chat) throw new Error('Nested chat row not found')
    fireEvent.contextMenu(chat)

    const menu = screen.getByRole('menu')
    expect(within(menu).getByRole('menuitem', { name: /Abrir chat/ })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: /Revisar alterações/ })).toBeInTheDocument()
  })

  // ── Onda 3 / E3 — drag & drop ───────────────────────────────────────────────
  it('reordena sessões da mesma seção por drag & drop', async () => {
    window.localStorage.clear()
    render(<App />)

    // Duas sessões do mesmo workspace/seção (grupo de reordenação válido).
    const a = 'Revisar alterações do workbench'
    const b = 'Ajustar layout single-pane'
    const order = () => Array.from(document.querySelectorAll<HTMLElement>('.session-row .session-title-text')).map((el) => el.textContent)
    const before = order()
    expect(before.indexOf(a)).toBeLessThan(before.indexOf(b))

    const dt = createDataTransfer()
    fireEvent.dragStart(sessionRow(a), { dataTransfer: dt })
    fireEvent.dragOver(sessionRow(b), { dataTransfer: dt })
    fireEvent.drop(sessionRow(b), { dataTransfer: dt })

    const after = order()
    // 'a' agora aparece depois de 'b' — houve reordenação dentro do grupo.
    expect(after.indexOf(a)).toBeGreaterThan(after.indexOf(b))
  })

  it('anexa ao chat um arquivo arrastado da árvore do workspace', async () => {
    window.localStorage.clear()
    const user = userEvent.setup()
    render(<App />)

    // A aba padrão é Browser (detalhe oculto, R-044). Ativa Changes para revelar
    // a barra de detalhes e então abre a aba Files para expor a árvore de arquivos.
    await user.click(screen.getByRole('button', { name: 'Abrir alterações no editor' }))
    await user.click(screen.getByRole('tab', { name: /Files/ }))
    const fileRow = document.querySelector<HTMLElement>('.file-tree-file')
    if (!fileRow) throw new Error('File tree row not found')
    const filePath = fileRow.getAttribute('title')!
    const container = document.querySelector<HTMLElement>('.chat-input-container')
    if (!container) throw new Error('Chat input container not found')

    const dt = createDataTransfer()
    fireEvent.dragStart(fileRow, { dataTransfer: dt })
    fireEvent.dragOver(container, { dataTransfer: dt })
    fireEvent.drop(container, { dataTransfer: dt })

    const chips = screen.getByRole('list', { name: 'Arquivos anexados' })
    expect(within(chips).getByText(filePath.split('/').pop()!)).toBeInTheDocument()
  })

  it('esconde o detalhe transitoriamente sob a aba Browser e o restaura em Changes (R-044)', async () => {
    window.localStorage.clear()
    const user = userEvent.setup()
    render(<App />)
    await openInitialBrowser(user)

    // Aba padrão = Browser → o painel de detalhes está oculto transitoriamente.
    expect(document.querySelector('.auxiliary-bar')).toBeNull()

    // Ativar Changes revela o detalhe...
    await user.click(screen.getByRole('button', { name: 'Abrir alterações no editor' }))
    expect(document.querySelector('.auxiliary-bar')).toBeInTheDocument()

    // ...e voltar ao Browser volta a escondê-lo (regra transiente, sem perder a intenção).
    const browserTab = document.querySelector<HTMLElement>('.editor-tab[role="tab"][data-browser-id]')
    if (!browserTab) throw new Error('Browser editor tab not found')
    await user.click(browserTab)
    expect(document.querySelector('.auxiliary-bar')).toBeNull()

    // Ocultar o editor com Browser ativo mostra o fallback (não fica em branco).
    await user.click(screen.getByRole('button', { name: 'Ocultar editor' }))
    expect(document.querySelector('.auxiliary-bar')).toBeInTheDocument()
  })

  it('reordena abas do editor da mesma sessão por drag & drop', async () => {
    window.localStorage.clear()
    const user = userEvent.setup()
    render(<App />)
    await openInitialBrowser(user)

    // Cria uma 2ª aba Browser para ter o que reordenar.
    await createBrowserTab(user)
    const tabs = () => Array.from(document.querySelectorAll<HTMLElement>('.editor-tab[role="tab"]'))
    const titlesBefore = tabs().map((tab) => tab.querySelector('.editor-tab-title')?.textContent)
    expect(tabs().length).toBeGreaterThanOrEqual(2)

    const dt = createDataTransfer()
    fireEvent.dragStart(tabs()[0], { dataTransfer: dt })
    fireEvent.dragOver(tabs()[1], { dataTransfer: dt })
    fireEvent.drop(tabs()[1], { dataTransfer: dt })

    const titlesAfter = tabs().map((tab) => tab.querySelector('.editor-tab-title')?.textContent)
    expect(titlesAfter[0]).toBe(titlesBefore[1])
    expect(titlesAfter[1]).toBe(titlesBefore[0])
  })

  // ── Onda 2 / E2 — atalhos de teclado + ações "gated" ────────────────────────
  it('oculta e reexibe o editor pelo atalho Alt+Cmd+E', async () => {
    window.localStorage.clear()
    render(<App />)
    await openInitialBrowser(userEvent.setup())

    // Editor visível inicialmente.
    expect(screen.queryByTestId('editor-hidden-content')).not.toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'e', metaKey: true, altKey: true })
    expect(screen.getByTestId('editor-hidden-content')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'e', metaKey: true, altKey: true })
    expect(screen.queryByTestId('editor-hidden-content')).not.toBeInTheDocument()
  })

  it('Toggle Details (Alt+Cmd+L) é gated: não faz nada numa aba Browser', async () => {
    window.localStorage.clear()
    render(<App />)

    // A sessão inicial abre numa aba Browser — sem detalhe acoplado.
    const auxToggle = screen.getByRole('button', { name: 'Alternar barra auxiliar' })
    const wasActive = auxToggle.classList.contains('is-active')
    fireEvent.keyDown(window, { key: 'l', metaKey: true, altKey: true })
    // Estado da barra auxiliar não muda numa aba Browser (ação inibida pelo gate).
    expect(screen.getByRole('button', { name: 'Alternar barra auxiliar' }).classList.contains('is-active')).toBe(wasActive)
  })

  it('Toggle Details (Alt+Cmd+L) alterna o detalhe numa aba de diff', async () => {
    window.localStorage.clear()
    const user = userEvent.setup()
    render(<App />)

    // Abre a aba de diff (Changes) a partir do painel de chat.
    await user.click(screen.getByRole('button', { name: 'Revisar alterações' }))
    expect(document.querySelector('.diff-view')).toBeInTheDocument()

    // Com aba de diff ativa, o atalho oculta o detalhe (auxiliary bar).
    expect(document.querySelector('.auxiliary-bar')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'l', metaKey: true, altKey: true })
    expect(document.querySelector('.auxiliary-bar')).not.toBeInTheDocument()

    // E o atalho volta a exibir.
    fireEvent.keyDown(window, { key: 'l', metaKey: true, altKey: true })
    expect(document.querySelector('.auxiliary-bar')).toBeInTheDocument()
  })

  // E16 (AI_CUSTOMIZATIONS.md): abre a superfície de customizações pelo menu de
  // nova aba; contagens == linhas; troca de harness filtra seções; enablement de
  // built-in alterna; skill runnable dispara ação real (toast).
  it('abre AI Customizations, troca harness, alterna enablement e executa skill', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openInitialBrowser(user)

    await user.click(screen.getByRole('button', { name: 'Adicionar aba do editor' }))
    await user.click(screen.getByRole('menuitem', { name: 'AI Customizations' }))

    const surface = screen.getByRole('region', { name: 'Personalizações de IA' })
    expect(surface).toBeInTheDocument()
    // A seção Plugins não existe no harness Local (default).
    expect(within(surface).queryByText('Plugins')).not.toBeInTheDocument()

    // Trocar para Copilot CLI revela a seção Plugins.
    await user.selectOptions(within(surface).getByRole('combobox', { name: 'Selecionar harness' }), 'copilot')
    expect(within(surface).getByText('Plugins')).toBeInTheDocument()
    // (R-065) Contribuições dinâmicas dos agent plugins aparecem no harness
    // Copilot (fonte 'plugin'): a colisão de identidade canônica escolhe a
    // versão do marketplace do "team-toolkit" (triage-bot/scaffold-component).
    expect(within(surface).getByText('triage-bot')).toBeInTheDocument()
    expect(within(surface).getByText('scaffold-component')).toBeInTheDocument()
    // O harness Claude esconde a fonte 'plugin' → some.
    await user.selectOptions(within(surface).getByRole('combobox', { name: 'Selecionar harness' }), 'claude')
    expect(within(surface).queryByText('triage-bot')).not.toBeInTheDocument()
    await user.selectOptions(within(surface).getByRole('combobox', { name: 'Selecionar harness' }), 'copilot')

    // Voltar ao Local e desabilitar um skill built-in (commit).
    await user.selectOptions(within(surface).getByRole('combobox', { name: 'Selecionar harness' }), 'local')
    await user.click(within(surface).getByRole('button', { name: 'Desabilitar commit' }))
    expect(within(surface).getByRole('button', { name: 'Habilitar commit' })).toBeInTheDocument()

    // Executar a skill create-pr dispara feedback observável (mock).
    await user.click(within(surface).getByRole('button', { name: 'Executar skill create-pr' }))
    expect(screen.getByRole('status')).toHaveTextContent('Skill create-pr executada (mock)')

    // Filtrar reduz as linhas exibidas mantendo o mesmo modelo (contagem coerente).
    fireEvent.change(within(surface).getByRole('textbox'), { target: { value: 'pull request' } })
    expect(within(surface).getByText('create-pr')).toBeInTheDocument()
    expect(within(surface).queryByText('changelog')).not.toBeInTheDocument()
  })

  // E4 (LAYOUT_CONTROLLER.md): a visibilidade da barra auxiliar é estado por
  // sessão. Ao sair de uma sessão o estado é capturado; ao voltar, restaurado —
  // sem vazar para as demais sessões.
  it('preserva a visibilidade da barra auxiliar por sessão', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Na sessão ativa (s1), revela o detalhe abrindo as alterações.
    await user.click(sessionRow('Replicar a Janela de Agentes'))
    await user.click(screen.getByRole('button', { name: 'Revisar alterações' }))
    expect(document.querySelector('.auxiliary-bar')).toBeInTheDocument()

    // Vai para outra sessão nunca aberta: herda o padrão (detalhe oculto).
    await user.click(sessionRow('Ajustar layout single-pane'))
    expect(document.querySelector('.auxiliary-bar')).not.toBeInTheDocument()

    // Volta à primeira: o estado capturado é restaurado (detalhe visível).
    await user.click(sessionRow('Replicar a Janela de Agentes'))
    expect(document.querySelector('.auxiliary-bar')).toBeInTheDocument()
  })
})

