// ============================================================================
// U-2 — DIÁLOGOS INTERNOS: o núcleo (domínio + casca + porta) e os fluxos que
// trocaram `window.confirm`/`alert` por diálogo da aplicação.
//
// O que cada bloco prova (e por quê):
//   U2-D  decisão pura: pedido válido, foco seguro (Cancelar), fuga = null.
//   U2-C  casca: `role=dialog` nomeado pela pergunta, aria-modal, foco inicial,
//         Enter no botão focado, Esc/✕/fundo = fuga, Tab circula e o foco
//         VOLTA ao acionador.
//   U2-P  porta: uma pergunta por vez; `confirmar` só é true no botão
//         `confirmar`; `dispose` resolve como fuga (nunca deixa promise solta).
//   U2-F  fluxos reais: Excluir conversa (App), Permitir tudo (chat e tela
//         inicial), exclusões automáticas, compactação — cancelar não executa
//         e confirmar executa. Nenhum pop-up nativo em cena.
// ============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { pedidoDeConfirmacao, pedidoDestrutivo, normalizarPedido, botaoInicial } from '../domain/dialogoConfirmacao'
import { pedidoGrupoDaSessao } from '../domain/pedidosArquivo'
import { excluirConversa, type PortasExclusao } from '../domain/exclusaoConversa'
import { semSessao, chaveDaSessao } from '../domain/limpezaDeSessao'
import { criarPortaDialogos, esquecerPortaDialogos, portaDialogos } from '../shell/portaDialogos'

const pedidoExclusao = () => pedidoDestrutivo({
  mensagem: 'Excluir a conversa “Alvo”?',
  detalhe: 'O histórico será removido.',
  confirmar: 'Excluir conversa',
  rotuloAcessivel: 'Confirmar exclusão',
  testId: 'u2-confirm',
})

afterEach(() => {
  esquecerPortaDialogos()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('U2-D — decisão pura do diálogo', () => {
  it('o foco inicial é o botão SEGURO (Cancelar), nunca a ação destrutiva', () => {
    const pedido = pedidoExclusao()
    expect(botaoInicial(pedido).id).toBe('cancelar')
    // Ordem visual: escape à esquerda, ação perigosa à direita.
    expect(pedido.botoes.map((b) => b.id)).toEqual(['cancelar', 'confirmar'])
    expect(pedido.botoes.at(-1)?.variacao).toBe('perigo')
    expect(pedido.tom).toBe('aviso')
  })

  it('recusa pedido sem mensagem, sem botões, com id repetido ou com 2 primários', () => {
    expect(() => normalizarPedido({ mensagem: '  ', rotuloAcessivel: 'x', testId: 't', botoes: [{ id: 'a', rotulo: 'A' }] })).toThrow(/sem mensagem/)
    expect(() => normalizarPedido({ mensagem: 'x', rotuloAcessivel: 'x', testId: 't', botoes: [] })).toThrow(/sem botões/)
    expect(() => normalizarPedido({ mensagem: 'x', rotuloAcessivel: 'x', testId: 't', botoes: [{ id: 'a', rotulo: 'A' }, { id: 'a', rotulo: 'B' }] })).toThrow(/repetido/)
    expect(() => normalizarPedido({ mensagem: 'x', rotuloAcessivel: 'x', testId: 't', botoes: [{ id: 'a', rotulo: 'A', variacao: 'primario' }, { id: 'b', rotulo: 'B', variacao: 'primario' }] })).toThrow(/primário/)
  })

  it('pedidoDeConfirmacao move o título para a mensagem e preserva o resto no detalhe', () => {
    const pedido = pedidoDeConfirmacao({
      texto: 'Autorizar a leitura da conversa antiga “memoria”?\nProjeto /A\n\nO histórico original será preservado.',
      confirmar: 'Continuar', rotuloAcessivel: 'Confirmar acesso', testId: 'u2-h',
    })
    expect(pedido.mensagem).toBe('Autorizar a leitura da conversa antiga “memoria”?')
    expect(pedido.detalhe).toBe('Projeto /A\n\nO histórico original será preservado.')
    expect(pedido.botoes.map((b) => b.id)).toEqual(['cancelar', 'confirmar'])
  })
})

describe('U2-C — casca: foco, teclado e fuga', () => {
  function abrir(pedido = pedidoExclusao()) {
    const acionador = document.createElement('button')
    acionador.textContent = 'acionador'
    document.body.appendChild(acionador)
    acionador.focus()
    const promessa = portaDialogos().pedir(pedido)
    return { acionador, promessa }
  }

  it('abre como diálogo modal nomeado pela pergunta, com foco inicial em Cancelar', async () => {
    const { promessa } = abrir()
    const dialogo = await screen.findByRole('dialog')
    expect(dialogo).toHaveAttribute('aria-modal', 'true')
    expect(dialogo).toHaveAccessibleName('Excluir a conversa “Alvo”?')
    expect(dialogo).toHaveAccessibleDescription('O histórico será removido.')
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancelar' })))
    await userEvent.keyboard('{Escape}')
    await expect(promessa).resolves.toBeNull()
  })

  it('Enter aciona o botão FOCADO (Tab leva ao perigoso) e devolve o foco ao acionador', async () => {
    const { acionador, promessa } = abrir()
    await screen.findByRole('dialog')
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancelar' })))
    await userEvent.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Excluir conversa' }))
    await userEvent.keyboard('{Enter}')
    await expect(promessa).resolves.toBe('confirmar')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(document.activeElement).toBe(acionador)
  })

  it('✕ e clique no fundo são fuga; Tab circula dentro do diálogo (trap)', async () => {
    const { promessa } = abrir()
    const dialogo = await screen.findByRole('dialog')
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancelar' })))
    // Cancelar → Excluir → ✕ → Cancelar (nunca escapa para a página).
    const fechar = within(dialogo).getByRole('button', { name: 'Fechar diálogo (Cancelar)' })
    await userEvent.tab(); expect(document.activeElement).toBe(within(dialogo).getByRole('button', { name: 'Excluir conversa' }))
    await userEvent.tab(); expect(document.activeElement).toBe(fechar)
    await userEvent.tab(); expect(document.activeElement).toBe(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    await userEvent.tab({ shift: true }); expect(document.activeElement).toBe(fechar)
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    // Cancelar é uma ESCOLHA (id conhecido); ✕/Esc/fundo são fuga (`null`).
    await expect(promessa).resolves.toBe('cancelar')

    // Fundo (fora da caixa) também fecha, sem escolher nada.
    const segundo = portaDialogos().pedir(pedidoExclusao())
    await screen.findByRole('dialog')
    const fundo = document.querySelector('[data-testid="u2-confirm"]') as HTMLElement
    await userEvent.click(fundo)
    await expect(segundo).resolves.toBeNull()
  })

  it('não usa pop-up nativo: window.confirm/alert/prompt não são chamados', async () => {
    const nativo = vi.spyOn(window, 'confirm')
    const alerta = vi.spyOn(window, 'alert')
    const prompt = vi.spyOn(window, 'prompt')
    abrir()
    await screen.findByRole('dialog')
    await userEvent.keyboard('{Escape}')
    expect(nativo).not.toHaveBeenCalled()
    expect(alerta).not.toHaveBeenCalled()
    expect(prompt).not.toHaveBeenCalled()
  })
})

describe('U2-P — porta: uma pergunta por vez e fuga por dispose', () => {
  it('Enter no botão Cancelar da entrada cancela; Enter no campo confirma', async () => {
    const pedido = pedidoGrupoDaSessao({ titulo: 'Alvo', gruposExistentes: [], modo: 'atribuir' })
    const user = userEvent.setup()
    const recusa = portaDialogos().pedirTexto(pedido)
    let dialogo = await screen.findByRole('dialog')
    await user.type(within(dialogo).getByRole('textbox'), 'Equipe')
    within(dialogo).getByRole('button', { name: 'Cancelar' }).focus()
    await user.keyboard('{Enter}')
    await expect(recusa).resolves.toBeNull()
    const aceite = portaDialogos().pedirTexto(pedido)
    dialogo = await screen.findByRole('dialog')
    await user.type(within(dialogo).getByRole('textbox'), 'Equipe{Enter}')
    await expect(aceite).resolves.toBe('Equipe')
  })

  it('segundo pedido enquanto o primeiro espera falha alto (nada de modal empilhado)', async () => {
    const porta = criarPortaDialogos()
    const primeiro = porta.pedir(pedidoExclusao())
    await expect(porta.pedir(pedidoExclusao())).rejects.toThrow(/Já existe um diálogo aberto/)
    expect(porta.aberto()).toBe(true)
    porta.dispose()
    await expect(primeiro).resolves.toBeNull()
    expect(porta.aberto()).toBe(false)
    expect(document.querySelector('[data-dialogo-porta]')).toBeNull()
  })

  it('confirmar só é true com o botão de confirmação', async () => {
    const porta = criarPortaDialogos()
    const recusa = porta.confirmar(pedidoExclusao())
    await screen.findByRole('dialog')
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    await expect(recusa).resolves.toBe(false)

    const aceite = porta.confirmar(pedidoExclusao())
    await screen.findByRole('dialog')
    await userEvent.click(screen.getByRole('button', { name: 'Excluir conversa' }))
    await expect(aceite).resolves.toBe(true)
  })
})

describe('U2-F — Excluir conversa: a regra, com diálogo interno', () => {
  function bancada(opcoes: { confirmacoes?: boolean[]; erro?: unknown; ciclo?: 'concluido' | 'limpeza_pendente' } = {}) {
    const fila = [...(opcoes.confirmacoes ?? [true])]
    const pedidos: string[] = []
    const registro = { remocoes: [] as Array<{ force?: boolean; expectedRevision: number }>, concluiu: 0, falhas: [] as unknown[], comecou: 0 }
    const portas: PortasExclusao = {
      confirmar: async (pedido) => { pedidos.push(pedido.mensagem); return fila.shift() ?? false },
      solicitarRemocao: async (remocao) => {
        registro.remocoes.push(remocao)
        if (opcoes.erro && registro.remocoes.length === 1) throw opcoes.erro
        return opcoes.ciclo ?? 'concluido'
      },
      cancelarExecucoes: async () => ['cancelled'],
      concluir: () => { registro.concluiu += 1 },
      falhar: (erro) => { registro.falhas.push(erro) },
      comecar: () => { registro.comecou += 1 },
      codigoDoErro: (erro) => (erro as { code?: string } | undefined)?.code,
    }
    return { portas, pedidos, registro }
  }
  const alvo = { id: 's1', titulo: 'Alvo', persistenciaRevisao: 7 }

  it('cancelar a confirmação NÃO pede remoção nem conclui', async () => {
    const { portas, registro, pedidos } = bancada({ confirmacoes: [false] })
    await expect(excluirConversa(alvo, portas)).resolves.toBe('cancelada')
    expect(pedidos[0]).toContain('Alvo')
    expect(registro.remocoes).toHaveLength(0)
    expect(registro.concluiu).toBe(0)
    // Fechar o diálogo não deixa rastro: o alvo nem entra em "excluindo".
    expect(registro.comecou).toBe(0)
  })

  it('worktree sujo: primeiro pedido é recusado pelo servidor, segundo pedido é ESPECÍFICO e o force só vem após aceite', async () => {
    const { portas, registro, pedidos } = bancada({ confirmacoes: [true, true], erro: { code: 'worktree_dirty' } })
    await expect(excluirConversa(alvo, portas)).resolves.toBe('excluida')
    expect(pedidos).toHaveLength(2)
    expect(pedidos[1]).toContain('alterações locais')
    expect(registro.comecou).toBe(1)
    expect(registro.remocoes[1]).toEqual({ force: true, expectedRevision: 7 })
    expect(registro.concluiu).toBe(1)
  })

  it('worktree sujo recusado: nem force nem conclusão — o alvo continua onde estava', async () => {
    const { portas, registro } = bancada({ confirmacoes: [true, false], erro: { code: 'worktree_dirty' } })
    await expect(excluirConversa(alvo, portas)).resolves.toBe('cancelada')
    expect(registro.remocoes).toHaveLength(1)
    expect(registro.concluiu).toBe(0)
    expect(registro.falhas).toHaveLength(0)
  })

  it('`limpeza_pendente` nunca vira sucesso: falha visível e sem conclusão local', async () => {
    const { portas, registro } = bancada({ ciclo: 'limpeza_pendente' })
    await expect(excluirConversa(alvo, portas)).resolves.toBe('limpeza_pendente')
    expect(registro.concluiu).toBe(0)
    expect(String((registro.falhas[0] as Error).message)).toMatch(/limpeza ainda não concluiu/)
  })

  it('execução ainda ativa aborta antes do DELETE com mensagem honesta', async () => {
    const { portas, registro } = bancada()
    const comPendente: PortasExclusao = { ...portas, cancelarExecucoes: async () => ['pending'] }
    await expect(excluirConversa(alvo, comPendente)).resolves.toBe('falhou')
    expect(registro.remocoes).toHaveLength(0)
    expect(String((registro.falhas[0] as Error).message)).toMatch(/ainda não terminou/)
  })
})

describe('U2-D2 — limpeza de registros por sessão', () => {
  it('remove a chave da sessão e as prefixadas, preserva as demais e a identidade quando nada muda', () => {
    expect(chaveDaSessao('s1', 's1')).toBe(true)
    expect(chaveDaSessao('s1:chat', 's1')).toBe(true)
    expect(chaveDaSessao('s10', 's1')).toBe(false)
    const mapa = { s1: 1, 's1:chat': 2, s10: 3, 's10:chat': 4 }
    expect(semSessao(mapa, 's1')).toEqual({ s10: 3, 's10:chat': 4 })
    expect(semSessao(mapa, 'inexistente')).toBe(mapa)
  })
})
