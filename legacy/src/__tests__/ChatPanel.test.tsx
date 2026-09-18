import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ChatPanel } from '../components/ChatPanel'
import type { NestedChat, Session } from '../types'

const chat: NestedChat = {
  id: 'chat-actions',
  title: 'Ações',
  status: 'completed',
  messages: [
    {
      id: 'request-1',
      role: 'user',
      content: 'Mostre o estado atual.',
      time: '10:00',
    },
    {
      id: 'response-1',
      role: 'assistant',
      content: 'Aqui está o estado atual.\n\n```ts\nconst ready = true\n```',
      time: '10:01',
      model: 'Claude Sonnet 4',
    },
  ],
}

const session: Session = {
  id: 'session-actions',
  title: 'Sessão de ações',
  workspace: 'workspace-actions',
  workspacePath: '~/workspace-actions',
  section: 'today',
  status: 'completed',
  updated: 'agora',
  diffAdded: 0,
  diffRemoved: 0,
  branch: 'main',
  chats: [chat],
  mainChatId: chat.id,
}

function renderPanel() {
  const props = {
    session,
    activeChatId: chat.id,
    model: 'Claude Sonnet 4',
    mode: 'agent',
    auxiliaryVisible: true,
    onSelectChat: vi.fn(),
    onChangeModel: vi.fn(),
    onChangeMode: vi.fn(),
    onSend: vi.fn(),
    onStop: vi.fn(),
    onApprove: vi.fn(),
    onCopy: vi.fn(),
    onCopyAll: vi.fn(),
    onCopyFinalResponse: vi.fn(),
    onRegenerate: vi.fn(),
    onFeedback: vi.fn(),
    onReport: vi.fn(),
    onOpenBrowser: vi.fn(),
    onOpenDiff: vi.fn(),
    onToggleAuxiliary: vi.fn(),
  }
  return { ...render(<ChatPanel {...props} />), props }
}

describe('ChatPanel message actions', () => {
  it('mantém request/response, markdown e ação de copiar código', () => {
    renderPanel()

    expect(screen.getByText('Mostre o estado atual.')).toBeInTheDocument()
    expect(screen.getByText('Aqui está o estado atual.')).toBeInTheDocument()
    expect(screen.getByText('const ready = true')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copiar código' })).toBeInTheDocument()

    const userMessage = screen.getByText('Mostre o estado atual.').closest('article')
    if (!userMessage) throw new Error('User message row not found')
    expect(within(userMessage).queryByRole('button', { name: 'Regenerar' })).not.toBeInTheDocument()
  })

  it('encaminha regenerar e feedback para o chat e a mensagem corretos', async () => {
    const user = userEvent.setup()
    const { props } = renderPanel()

    await user.click(screen.getByRole('button', { name: 'Regenerar' }))
    await user.click(screen.getByRole('button', { name: 'Útil' }))
    await user.click(screen.getByRole('button', { name: 'Não útil' }))

    expect(props.onRegenerate).toHaveBeenCalledWith(chat.id, 'response-1')
    expect(props.onFeedback).toHaveBeenNthCalledWith(1, chat.id, 'response-1', 'up')
    expect(props.onFeedback).toHaveBeenNthCalledWith(2, chat.id, 'response-1', 'down')
  })

  it('encaminha cópia de mensagem, cópia de código e relato de problema', async () => {
    const user = userEvent.setup()
    const { props } = renderPanel()
    const responseRow = screen.getByText('Aqui está o estado atual.').closest('article')
    if (!responseRow) throw new Error('Assistant message row not found')

    await user.click(within(responseRow).getByRole('button', { name: 'Copiar' }))
    await user.click(within(responseRow).getByRole('button', { name: 'Copiar código' }))
    await user.click(within(responseRow).getByRole('button', { name: 'Relatar problema' }))
    await user.click(within(responseRow).getByRole('button', { name: 'Mais ações' }))
    await user.click(screen.getByRole('menuitem', { name: 'Copiar tudo' }))
    await user.click(within(responseRow).getByRole('button', { name: 'Mais ações' }))
    await user.click(screen.getByRole('menuitem', { name: 'Copiar resposta final' }))

    expect(props.onCopy).toHaveBeenCalledWith(chat.id, 'response-1', 'message')
    expect(props.onCopy).toHaveBeenCalledWith(chat.id, 'response-1', 'code')
    expect(props.onReport).toHaveBeenCalledWith(chat.id, 'response-1')
    expect(props.onCopyAll).toHaveBeenCalledWith(chat.id)
    expect(props.onCopyFinalResponse).toHaveBeenCalledWith(chat.id, 'response-1')
  })
})

