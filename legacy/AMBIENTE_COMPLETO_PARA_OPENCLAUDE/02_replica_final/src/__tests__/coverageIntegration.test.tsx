import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChatInput } from '../components/ChatInput'
import { ChatPanel } from '../components/ChatPanel'
import { AuxiliaryBar } from '../components/AuxiliaryBar'
import type { DiffFile, NestedChat, Session } from '../types'

/**
 * P8.2 — Testes de integração/cobertura.
 * Cobrem handlers interativos ainda não exercitados (menção, ditado por voz,
 * fechar popovers por Escape, remover anexo, sugestões do welcome, novo chat,
 * ações da barra auxiliar), elevando a cobertura de funções acima do limite.
 */

const emptyChat: NestedChat = {
  id: 'chat-cov',
  title: 'Cobertura',
  status: 'completed',
  messages: [],
}

const session: Session = {
  id: 'session-cov',
  title: 'Sessão de cobertura',
  workspace: 'workspace-cov',
  workspacePath: '~/workspace-cov',
  section: 'today',
  status: 'completed',
  updated: 'agora',
  diffAdded: 0,
  diffRemoved: 0,
  branch: 'main',
  chats: [emptyChat],
  mainChatId: 'chat-cov',
}

afterEach(() => {
  vi.restoreAllMocks()
})

function renderInput(overrides: Partial<React.ComponentProps<typeof ChatInput>> = {}) {
  const props: React.ComponentProps<typeof ChatInput> = {
    session,
    activeChat: emptyChat,
    model: 'Claude Sonnet 4',
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

describe('P8.2 ChatInput — handlers interativos', () => {
  it('insere menção (@) e ditado por voz usa fallback sem SpeechRecognition', async () => {
    const user = userEvent.setup()
    // Garante o fallback: sem SpeechRecognition disponível.
    const original = (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition
    const originalWebkit = (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition

    renderInput()
    const input = screen.getByRole('textbox', { name: 'Mensagem para o agente' })

    await user.click(screen.getByRole('button', { name: 'Inserir menção' }))
    expect(input).toHaveValue('@')

    await user.click(screen.getByRole('button', { name: 'Ditado por voz' }))
    expect((input as HTMLTextAreaElement).value).toContain('Descreva a alteração')

    if (original !== undefined) (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = original
    if (originalWebkit !== undefined) (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = originalWebkit
  })

  it('abre e fecha os popovers de modo e modelo com Escape', async () => {
    const user = userEvent.setup()
    renderInput()

    const modeButton = screen.getByRole('button', { name: /Agente/ })
    await user.click(modeButton)
    expect(screen.getByRole('menu', { name: 'Selecionar modo' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu', { name: 'Selecionar modo' })).not.toBeInTheDocument()

    const modelButton = screen.getByRole('button', { name: /Claude Sonnet 4/ })
    await user.click(modelButton)
    expect(screen.getByRole('menu', { name: 'Selecionar modelo' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu', { name: 'Selecionar modelo' })).not.toBeInTheDocument()
  })

  it('adiciona e remove um anexo do workspace', async () => {
    const user = userEvent.setup()
    renderInput()

    await user.click(screen.getByRole('button', { name: /Adicionar contexto|Anexar|contexto/i }))
    const workspaceOption = await screen.findByRole('menuitem', { name: /workspace/i })
    await user.click(workspaceOption)

    const fileOption = await screen.findAllByRole('menuitem')
    // Escolhe o primeiro arquivo listado do workspace.
    const chosen = fileOption.find((el) => /\.(ts|tsx|css|json|md)/.test(el.textContent ?? ''))
    if (!chosen) throw new Error('Nenhum arquivo de workspace disponível no picker')
    await user.click(chosen)

    const removeButton = await screen.findByRole('button', { name: /Remover / })
    await user.click(removeButton)
    expect(screen.queryByRole('button', { name: /Remover / })).not.toBeInTheDocument()
  })
})

describe('P8.2 ChatPanel — welcome e novo chat', () => {
  function renderPanel(overrides: Partial<React.ComponentProps<typeof ChatPanel>> = {}) {
    const multiChatSession: Session = {
      ...session,
      chats: [
        emptyChat,
        { id: 'chat-2', title: 'Segundo', status: 'completed', messages: [] },
      ],
    }
    const props: React.ComponentProps<typeof ChatPanel> = {
      session: multiChatSession,
      activeChatId: 'chat-cov',
      model: 'Claude Sonnet 4',
      mode: 'agent',
      auxiliaryVisible: false,
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
      ...overrides,
    }
    return { ...render(<ChatPanel {...props} />), props }
  }

  it('dispara sugestão do welcome e cria novo chat', async () => {
    const user = userEvent.setup()
    const { props } = renderPanel()

    const suggestion = screen.getAllByRole('button').find((b) => b.className.includes('suggested-prompt'))
    if (!suggestion) throw new Error('Sugestão do welcome não encontrada')
    await user.click(suggestion)
    expect(props.onSend).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Novo chat' }))
    expect(props.onSend).toHaveBeenCalledWith('Inicie um novo chat contextual para esta sessão.', [])
  })
})

describe('P8.2 AuxiliaryBar — ações de checks e diff', () => {
  const diffFiles: DiffFile[] = [
    { id: 'f1', path: 'src/App.tsx', status: 'modified', added: 3, removed: 1, original: 'const a = 1', modified: 'const a = 2' },
  ]

  function renderAux(overrides: Partial<React.ComponentProps<typeof AuxiliaryBar>> = {}) {
    const props: React.ComponentProps<typeof AuxiliaryBar> = {
      session,
      visible: true,
      diffFiles,
      tab: 'changes',
      checksExpanded: true,
      expandedFolders: {},
      onChangeTab: vi.fn(),
      onOpenDiff: vi.fn(),
      onOpenFile: vi.fn(),
      onToggleChecks: vi.fn(),
      onToggleFolder: vi.fn(),
      onRerunChecks: vi.fn(),
      onOpenCheck: vi.fn(),
      onPreparePr: vi.fn(),
      onMerge: vi.fn(),
      onOpenTerminal: vi.fn(),
      onClose: vi.fn(),
      ...overrides,
    }
    return { ...render(<AuxiliaryBar {...props} />), props }
  }

  it('abre diff de arquivo, multi-diff, re-executa check e abre check no GitHub', async () => {
    const user = userEvent.setup()
    const { props } = renderAux()

    await user.click(screen.getByRole('button', { name: 'Abrir diff src/App.tsx' }))
    expect(props.onOpenDiff).toHaveBeenCalledWith('f1')

    await user.click(screen.getByRole('button', { name: /Abrir multi-diff/ }))
    expect(props.onOpenDiff).toHaveBeenCalledWith()

    // Check com falha expõe as ações inline.
    await user.click(screen.getByRole('button', { name: 'Executar novamente Accessibility' }))
    expect(props.onRerunChecks).toHaveBeenCalledWith('Accessibility')

    await user.click(screen.getByRole('button', { name: 'Abrir Accessibility no GitHub' }))
    expect(props.onOpenCheck).toHaveBeenCalledWith('Accessibility')

    // Botão "Executar novamente" global (sem argumento).
    const rerunAll = screen.getAllByRole('button', { name: /Executar novamente$/ })
    await user.click(rerunAll[rerunAll.length - 1])
    expect(props.onRerunChecks).toHaveBeenCalledWith()
  })
})

