import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoriaProjeto } from '../components/MemoriaProjeto'
import { RevisaoOperacional } from '../components/RevisaoOperacional'
import { SessionSidebar } from '../components/SessionSidebar'
import { esquecerPortaDialogos } from '../shell/portaDialogos'
import { testSessions } from './fixtures/sessions'

afterEach(() => {
  esquecerPortaDialogos()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('U-2 — diálogos dos fluxos adicionais', () => {
  it('memória: cancelar preserva o texto; confirmar grava', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ projeto: 'Projeto', projetoId: 'p', memorias: [] }), { status: 200 }))
    const user = userEvent.setup()
    render(<MemoriaProjeto sessionId="s" chatId="c" messages={[]} />)
    await user.click(screen.getByRole('button', { name: 'Memória do projeto' }))
    await screen.findByText('Projeto')
    await user.type(screen.getByRole('textbox', { name: 'Conteúdo da memória' }), 'Decisão importante')
    await user.click(screen.getByRole('button', { name: 'Salvar memória' }))
    let dialogo = await screen.findByRole('dialog')
    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('textbox', { name: 'Conteúdo da memória' })).toHaveValue('Decisão importante')
    await user.click(screen.getByRole('button', { name: 'Salvar memória' }))
    dialogo = await screen.findByRole('dialog')
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar memória' }))
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3))
    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toMatchObject({ operacao: 'gravar', confirmado: true, conteudo: 'Decisão importante' })
  })

  it('retomar planejamento requer confirmação', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ativa: false, revisao: { runId: 'r1', estado: 'interrompida', pasta: 'igual', git: 'igual', acoes: [], podePlanejar: true } }), { status: 200 }))
    const planejar = vi.fn()
    const user = userEvent.setup()
    render(<RevisaoOperacional sessionId="s" chatId="c" ocupada={false} planejar={planejar} />)
    await user.click(screen.getByRole('button', { name: 'Revisar retomada de tarefa' }))
    await user.click(await screen.findByRole('button', { name: 'Retomar planejamento' }))
    let dialogo = await screen.findByRole('dialog')
    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    expect(planejar).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Retomar planejamento' }))
    dialogo = await screen.findByRole('dialog')
    await user.click(within(dialogo).getByRole('button', { name: 'Retomar planejamento' }))
    expect(planejar).toHaveBeenCalledWith('r1')
  })

  it('grupo: cancelamento não altera, confirmação atribui o nome digitado', async () => {
    const user = userEvent.setup()
    const onAssignGroup = vi.fn()
    const session = { ...testSessions[0], customGroup: undefined }
    render(<SessionSidebar sessions={[session]} visible activeSessionId={session.id} activeChatId={session.mainChatId}
      onSelectSession={vi.fn()} onSelectChat={vi.fn()} onNewSession={vi.fn()} onTogglePinned={vi.fn()}
      onToggleArchived={vi.fn()} onDelete={vi.fn()} onRename={vi.fn()} onApprove={vi.fn()}
      onOpenDiff={vi.fn()} onReorderSessions={vi.fn()} onAssignGroup={onAssignGroup} onRemoveGroup={vi.fn()} />)
    const abrirMenu = async () => {
      fireEvent.contextMenu(screen.getByText(session.title).closest('.session-row')!)
      await user.click(screen.getByRole('menuitem', { name: 'Atribuir a grupo' }))
    }
    await abrirMenu()
    let dialogo = await screen.findByRole('dialog')
    await user.type(within(dialogo).getByRole('textbox', { name: 'Nome do grupo' }), 'Equipe')
    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    expect(onAssignGroup).not.toHaveBeenCalled()
    await abrirMenu()
    dialogo = await screen.findByRole('dialog')
    await user.type(within(dialogo).getByRole('textbox', { name: 'Nome do grupo' }), 'Equipe')
    await user.click(within(dialogo).getByRole('button', { name: 'Atribuir grupo' }))
    expect(onAssignGroup).toHaveBeenCalledWith(session.id, 'Equipe')
  })
})
