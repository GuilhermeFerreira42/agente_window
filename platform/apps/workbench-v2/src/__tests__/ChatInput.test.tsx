import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatInput } from '../components/ChatInput'
import type { NestedChat, Session } from '../types'

const chat: NestedChat = {
  id: 'chat-test',
  title: 'Chat de teste',
  status: 'completed',
  messages: [],
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
    provedores: [],
    ativo: null,
    storage: 'fixture',
    catalogo: [
      { providerId: 'openai', modelId: 'gpt-4o', label: 'OpenAI — gpt-4o', protocol: 'openai-chat' },
      { providerId: 'openai', modelId: 'gpt-4o-mini', label: 'OpenAI — gpt-4o-mini', protocol: 'openai-chat' },
    ],
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })))
})
afterEach(() => vi.unstubAllGlobals())

const session: Session = {
  id: 'session-test',
  title: 'Sessão de teste',
  workspace: 'workspace-test',
  workspacePath: '~/workspace-test',
  section: 'today',
  status: 'completed',
  updated: 'agora',
  diffAdded: 0,
  diffRemoved: 0,
  branch: 'main',
  chats: [chat],
  mainChatId: 'chat-test',
}

function renderInput(overrides: Partial<React.ComponentProps<typeof ChatInput>> = {}) {
  const props: React.ComponentProps<typeof ChatInput> = {
    session,
    activeChat: chat,
    model: 'Auto',
    mode: 'agent',
    onChangeModel: vi.fn(),
    onChangeMode: vi.fn(),
    onSend: vi.fn(),
    onStop: vi.fn(),
    onApprove: vi.fn(),
    ...overrides,
  }
  return { ...render(<ChatInput {...props} />), props }
}

describe('ChatInput', () => {
  it('exige confirmação explícita para Permitir tudo e deixa Manual sem confirmação', async () => {
    const user = userEvent.setup()
    const onChangePermission = vi.fn(async () => undefined)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderInput({ onChangePermission })

    await user.click(screen.getByRole('button', { name: 'Permissões manuais' }))
    await user.click(screen.getByRole('menuitemradio', { name: /Permitir tudo/ }))
    expect(confirm).toHaveBeenCalledOnce()
    expect(confirm.mock.calls[0][0]).toContain('privilégios da sua conta no sistema operacional')
    expect(onChangePermission).not.toHaveBeenCalled()

    confirm.mockReturnValue(true)
    await user.click(screen.getByRole('menuitemradio', { name: /Permitir tudo/ }))
    await waitFor(() => expect(onChangePermission).toHaveBeenCalledWith('allow-all'))
  })

  it('envia texto e limpa o composer', async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()
    renderInput({ onSend })

    const input = screen.getByRole('textbox', { name: 'Mensagem para o agente' })
    await user.type(input, '  revisar a sessão  ')
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))

    expect(onSend).toHaveBeenCalledWith('revisar a sessão', [], { tipo: 'auto' })
    expect(input).toHaveValue('')
  })

  it('envia com Enter e preserva quebra de linha com Shift+Enter', async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()
    renderInput({ onSend })

    const input = screen.getByRole('textbox', { name: 'Mensagem para o agente' })
    await user.type(input, 'enviar por teclado')
    await user.keyboard('{Enter}')

    expect(onSend).toHaveBeenCalledWith('enviar por teclado', [], { tipo: 'auto' })
    expect(input).toHaveValue('')

    await user.type(input, 'linha um')
    await user.keyboard('{Shift>}{Enter}{/Shift}')
    await user.type(input, 'linha dois')
    expect(onSend).toHaveBeenCalledTimes(1)
    expect(input).toHaveValue('linha um\nlinha dois')
  })

  it.each([
    ['Ctrl+Enter', '{Control>}{Enter}{/Control}'],
    ['Cmd+Enter', '{Meta>}{Enter}{/Meta}'],
  ] as const)('envia com %s sem duplicar o request', async (_shortcut, keySequence) => {
    const user = userEvent.setup()
    const onSend = vi.fn()
    renderInput({ onSend })

    const input = screen.getByRole('textbox', { name: 'Mensagem para o agente' })
    await user.type(input, 'enviar pelo atalho')
    await user.keyboard(keySequence)
    await user.keyboard('{Enter}')

    expect(onSend).toHaveBeenCalledTimes(1)
    expect(onSend).toHaveBeenCalledWith('enviar pelo atalho', [], { tipo: 'auto' })
  })

  it('impede envio vazio ou somente com whitespace', async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()
    renderInput({ onSend })

    const input = screen.getByRole('textbox', { name: 'Mensagem para o agente' })
    const sendButton = screen.getByRole('button', { name: 'Enviar mensagem' })
    expect(sendButton).toBeDisabled()

    await user.type(input, '   ')
    expect(sendButton).toBeDisabled()
    await user.keyboard('{Enter}')

    expect(onSend).not.toHaveBeenCalled()
    expect(input).toHaveValue('   ')
  })

  it('mantém o composer em loading e troca o envio por stop enquanto trabalha', async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()
    renderInput({ onSend, activeChat: { ...chat, status: 'working' } })

    const input = screen.getByRole('textbox', { name: 'Mensagem para o agente' })
    const container = document.querySelector('.chat-input-container')
    expect(container).toHaveAttribute('aria-busy', 'true')
    expect(input).toHaveAttribute('placeholder', 'Aguarde enquanto o agente trabalha…')
    expect(screen.getByRole('button', { name: 'Parar execução' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Enviar mensagem' })).not.toBeInTheDocument()

    await user.type(input, 'não enviar enquanto trabalha')
    await user.keyboard('{Control>}{Enter}{/Control}')
    expect(onSend).not.toHaveBeenCalled()
  })

  it('ajusta a altura do textarea e habilita rolagem no limite', async () => {
    const user = userEvent.setup()
    renderInput()

    const input = screen.getByRole('textbox', { name: 'Mensagem para o agente' })
    Object.defineProperty(input, 'scrollHeight', { configurable: true, value: 240 })
    await user.type(input, 'texto com várias linhas')

    expect(input).toHaveStyle({ height: '200px', overflowY: 'auto' })
  })

  it('ignora Enter durante composição de IME', async () => {
    const onSend = vi.fn()
    renderInput({ onSend })

    const input = screen.getByRole('textbox', { name: 'Mensagem para o agente' })
    fireEvent.change(input, { target: { value: '入力' } })
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })

    expect(onSend).not.toHaveBeenCalled()
    expect(input).toHaveValue('入力')
  })

  it('envia anexos mesmo sem texto', async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()
    const { container } = renderInput({ onSend })
    const fileInput = container.querySelector('input[type="file"]')
    if (!(fileInput instanceof HTMLInputElement)) throw new Error('File input not found')

    const file = new File(['conteúdo'], 'contexto.md', { type: 'text/markdown' })
    await user.upload(fileInput, file)
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))

    expect(onSend).toHaveBeenCalledWith('', [expect.objectContaining({ name: 'contexto.md', kind: 'local' })], { tipo: 'auto' })
    expect(screen.queryByText('contexto.md')).not.toBeInTheDocument()
  })

  it('navega pelo histórico, restaura o texto e preserva o rascunho ao voltar', async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()
    renderInput({ onSend })

    const input = screen.getByRole('textbox', { name: 'Mensagem para o agente' }) as HTMLTextAreaElement
    await user.type(input, 'primeira consulta')
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
    await user.type(input, 'rascunho atual')
    input.setSelectionRange(0, 0)

    await user.keyboard('{ArrowUp}')
    expect(input).toHaveValue('primeira consulta')
    input.setSelectionRange(input.value.length, input.value.length)
    await user.keyboard('{ArrowDown}')
    expect(input).toHaveValue('rascunho atual')
  })

  it('restaura texto, anexo, modo e modelo de uma entrada histórica', async () => {
    const user = userEvent.setup()
    const onChangeMode = vi.fn()
    const onChangeModel = vi.fn()
    renderInput({
      onChangeMode,
      onChangeModel,
      composerHistory: {
        'session-test:chat-test': [{
          text: 'consulta histórica',
          attachments: [{ id: 'workspace:notes.md', name: 'notes.md', kind: 'workspace' }],
          mode: 'edit',
          model: 'GPT-5',
        }],
      },
    })

    const input = screen.getByRole('textbox', { name: 'Mensagem para o agente' })
    await user.click(input)
    await user.keyboard('{ArrowUp}')

    expect(input).toHaveValue('consulta histórica')
    expect(screen.getByRole('group', { name: /notes\.md, arquivo do workspace/ })).toBeInTheDocument()
    expect(onChangeMode).toHaveBeenCalledWith('edit')
    expect(onChangeModel).toHaveBeenCalledWith('GPT-5')
  })

  it('abre o picker de contexto e seleciona um arquivo do workspace pela busca', async () => {
    const user = userEvent.setup()
    renderInput()

    await user.click(screen.getByRole('button', { name: 'Anexar arquivo' }))
    expect(screen.getByRole('menu', { name: 'Adicionar contexto' })).toBeInTheDocument()

    await user.click(screen.getByRole('menuitem', { name: /Arquivo do workspace/ }))
    const search = screen.getByRole('searchbox', { name: 'Buscar arquivos do workspace' })
    await user.type(search, 'chat.css')
    await user.click(screen.getByRole('menuitem', { name: 'src/workbench/contrib/chat/browser/widget/media/chat.css' }))

    expect(screen.getByRole('group', { name: /chat\.css, arquivo do workspace/ })).toBeInTheDocument()
    expect(screen.queryByRole('menu', { name: 'Adicionar contexto' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Anexar arquivo' }))
    await user.click(screen.getByRole('menuitem', { name: /Arquivo do workspace/ }))
    await user.click(screen.getByRole('menuitem', { name: 'src/workbench/contrib/chat/browser/widget/media/chat.css' }))
    expect(screen.getAllByRole('group', { name: /chat\.css, arquivo do workspace/ })).toHaveLength(1)
  })

  it('fecha o picker de contexto com Escape', async () => {
    const user = userEvent.setup()
    renderInput()

    await user.click(screen.getByRole('button', { name: 'Anexar arquivo' }))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('menu', { name: 'Adicionar contexto' })).not.toBeInTheDocument()
  })

  it('abre o picker local, deduplica a mesma seleção e remove o chip por teclado', async () => {
    const user = userEvent.setup()
    const onSend = vi.fn()
    const { container } = renderInput({ onSend })
    const fileInput = container.querySelector('input[type="file"]')
    if (!(fileInput instanceof HTMLInputElement)) throw new Error('File input not found')

    await user.click(screen.getByRole('button', { name: 'Anexar arquivo' }))
    await user.click(screen.getByRole('menuitem', { name: /Arquivo local/ }))
    const file = new File(['conteúdo'], 'contexto.md', { type: 'text/markdown' })
    await user.upload(fileInput, [file, file])

    expect(screen.getAllByRole('group', { name: /contexto\.md, arquivo local/ })).toHaveLength(1)
    const chip = screen.getByRole('group', { name: /contexto\.md, arquivo local/ })
    chip.focus()
    await user.keyboard('{Delete}')

    expect(screen.queryByRole('group', { name: /contexto\.md, arquivo local/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar mensagem' })).toBeDisabled()
    expect(onSend).not.toHaveBeenCalled()
  })

  it('mantém rascunhos e anexos separados por chat ao trocar o alvo', async () => {
    const user = userEvent.setup()
    const firstChat = { ...chat, id: 'chat-first' }
    const secondChat = { ...chat, id: 'chat-second' }
    const firstSession = { ...session, chats: [firstChat, secondChat], mainChatId: firstChat.id }
    const view = renderInput({ session: firstSession, activeChat: firstChat })
    const fileInput = view.container.querySelector('input[type="file"]')
    if (!(fileInput instanceof HTMLInputElement)) throw new Error('File input not found')

    await user.upload(fileInput, new File(['primeiro'], 'primeiro.ts', { type: 'text/typescript' }))
    expect(screen.getByRole('group', { name: /primeiro\.ts, arquivo local/ })).toBeInTheDocument()

    view.rerender(<ChatInput {...view.props} activeChat={secondChat} />)
    expect(screen.queryByRole('group', { name: /primeiro\.ts, arquivo local/ })).not.toBeInTheDocument()

    view.rerender(<ChatInput {...view.props} activeChat={firstChat} />)
    expect(screen.getByRole('group', { name: /primeiro\.ts, arquivo local/ })).toBeInTheDocument()
  })

  it('abre o picker de anexos com Ctrl ou Cmd mais barra', async () => {
    const user = userEvent.setup()
    renderInput()
    const input = screen.getByRole('textbox', { name: 'Mensagem para o agente' })

    await user.click(input)
    await user.keyboard('{Control>}/{/Control}')

    expect(screen.getByRole('menu', { name: 'Adicionar contexto' })).toBeInTheDocument()
  })

  it('troca o modo pelo popover e expõe o item selecionado', async () => {
    const user = userEvent.setup()
    const onChangeMode = vi.fn()
    renderInput({ onChangeMode })

    await user.click(screen.getByRole('button', { name: 'Agente' }))
    expect(screen.getByRole('menu', { name: 'Selecionar modo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Agente Descreva/, pressed: true })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Editar/ }))

    expect(onChangeMode).toHaveBeenCalledWith('edit')
  })

  it('navega pelo picker de modo com setas e retorna o foco ao trigger', async () => {
    const user = userEvent.setup()
    const onChangeMode = vi.fn()
    renderInput({ onChangeMode })

    const trigger = screen.getByRole('button', { name: 'Agente' })
    await user.click(trigger)
    expect(screen.getByRole('button', { name: /^Agente Descreva/, pressed: true })).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('button', { name: /Editar/ })).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(onChangeMode).toHaveBeenCalledWith('edit')
    expect(trigger).toHaveFocus()
  })

  it('fecha o picker de modo com Escape e ao clicar fora', async () => {
    const user = userEvent.setup()
    renderInput()
    const trigger = screen.getByRole('button', { name: 'Agente' })

    await user.click(trigger)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu', { name: 'Selecionar modo' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()

    await user.click(trigger)
    await user.click(screen.getByRole('textbox', { name: 'Mensagem para o agente' }))
    expect(screen.queryByRole('menu', { name: 'Selecionar modo' })).not.toBeInTheDocument()
  })

  it('lista pares sanitizados do catálogo, filtra e guarda o par provider/model exato', async () => {
    const user = userEvent.setup()
    const onChangeModel = vi.fn()
    renderInput({ onChangeModel })

    const trigger = screen.getByRole('button', { name: 'Auto' })
    await user.click(trigger)
    expect(screen.getByRole('menu', { name: 'Selecionar modelo' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Buscar modelos' })).toHaveFocus()
    const auto = await screen.findByRole('button', { name: /Auto Resolve o padrão/, pressed: true })
    expect(auto).toBeInTheDocument()

    const search = screen.getByRole('searchbox', { name: 'Buscar modelos' })
    await user.type(search, 'gpt-4o-mini')
    const candidato = await screen.findByRole('button', { name: /OpenAI — gpt-4o-mini/, pressed: false })
    await user.click(candidato)

    expect(onChangeModel).toHaveBeenCalledWith('pair:openai:gpt-4o-mini')
    expect(trigger).toHaveFocus()
  })

  it('revalida o catálogo ao abrir o seletor sem reiniciar a janela', async () => {
    const user = userEvent.setup()
    const resposta = (modelId: string, label: string) => new Response(JSON.stringify({
      provedores: [],
      ativo: null,
      storage: 'fixture',
      catalogo: [{ providerId: 'fixture', modelId, label, protocol: 'openai-chat' }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    const fetchCatalogo = vi.fn()
      .mockResolvedValueOnce(resposta('modelo-antigo', 'Fixture — modelo-antigo'))
      .mockResolvedValueOnce(resposta('modelo-novo', 'Fixture — modelo-novo'))
    vi.stubGlobal('fetch', fetchCatalogo)
    renderInput()

    await waitFor(() => expect(fetchCatalogo).toHaveBeenCalledTimes(1))
    await user.click(screen.getByRole('button', { name: 'Auto' }))
    expect(await screen.findByRole('button', { name: /Fixture — modelo-novo/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Fixture — modelo-antigo/ })).not.toBeInTheDocument()
    expect(fetchCatalogo).toHaveBeenCalledTimes(2)
  })

  it('navega no catálogo dinâmico com teclado e fecha com Escape', async () => {
    const user = userEvent.setup()
    const onChangeModel = vi.fn()
    renderInput({ onChangeModel })

    const trigger = screen.getByRole('button', { name: 'Auto' })
    await user.click(trigger)
    const search = screen.getByRole('searchbox', { name: 'Buscar modelos' })
    expect(search).toHaveFocus()
    await screen.findAllByRole('button', { name: /OpenAI — gpt-4o/ })
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('button', { name: /Auto Resolve o padrão/ })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('button', { name: /OpenAI — gpt-4o openai-chat/ })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('button', { name: /OpenAI — gpt-4o-mini openai-chat/ })).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(onChangeModel).toHaveBeenCalledWith('pair:openai:gpt-4o-mini')
    expect(trigger).toHaveFocus()

    await user.click(trigger)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu', { name: 'Selecionar modelo' })).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('encaminha a aprovação para o chat ativo', async () => {
    const user = userEvent.setup()
    const onApprove = vi.fn()
    renderInput({
      onApprove,
      session: { ...session, status: 'needs-input', approval: 'Aprovar comando' },
    })

    await user.click(screen.getByRole('button', { name: 'Permitir' }))

    expect(onApprove).toHaveBeenCalledWith(chat.id)
  })

  it('troca para o callback de stop enquanto trabalha', async () => {
    const user = userEvent.setup()
    const onStop = vi.fn()
    renderInput({ onStop, session: { ...session, status: 'working' } })

    await user.click(screen.getByRole('button', { name: 'Parar execução' }))

    expect(onStop).toHaveBeenCalledTimes(1)
  })

  it('aciona CancelAction por Ctrl/Cmd+Escape e Alt+Backspace', () => {
    const onStop = vi.fn()
    renderInput({ onStop, session: { ...session, status: 'working' } })

    const input = screen.getByRole('textbox', { name: 'Mensagem para o agente' })
    const stopButton = screen.getByRole('button', { name: 'Parar execução' })
    expect(stopButton).toHaveAttribute('aria-keyshortcuts', 'Control+Escape Meta+Escape Alt+Backspace')

    fireEvent.keyDown(input, { key: 'Escape', ctrlKey: true })
    fireEvent.keyDown(input, { key: 'Escape', metaKey: true })
    fireEvent.keyDown(input, { key: 'Backspace', altKey: true })

    expect(onStop).toHaveBeenCalledTimes(3)
  })
})

