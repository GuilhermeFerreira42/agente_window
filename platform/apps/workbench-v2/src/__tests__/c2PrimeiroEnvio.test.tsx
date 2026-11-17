// ============================================================================
// C-2 — c2PrimeiroEnvio (C2-T04..T07/T11/T12/T15 · R03/R04/R05): snapshot único por
// tentativa, par exato no primeiro pedido (sem fallback), identidade
// confirmada reaproveitada só na MESMA geração, ordem das fases (nenhum efeito
// remoto antes do ACK), Chat nasce ask/manual com raiz nula e "Permitir tudo"
// explícito só em Pasta. Controlador testado com portas falsas puras.
// ============================================================================

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionLanding } from '../components/SessionLanding'
import type { EntradaSubmitLanding } from '../hooks/useLandingSubmission'
import {
  chatIdDaSessao,
  construirSessaoChat,
  executarPrimeiroEnvio,
  derivarTitulo,
  type PortasPrimeiroEnvio,
  type TentativaConfirmada,
} from '../domain/primeiroEnvio'
import { modoEfetivo, permissaoEfetiva, rascunhoInicial, editarRascunho, snapshotDoRascunho } from '../domain/landingDraft'
import type { SnapshotPrimeiroEnvio } from '../domain/landingDraft'
import type { Session } from '../types'

const { carregarEstado } = vi.hoisted(() => ({ carregarEstado: vi.fn() }))
vi.mock('../bairros/2-inteligencia/casas/provedores', () => ({ carregarEstado: () => carregarEstado() }))

beforeEach(() => {
  carregarEstado.mockReset()
  carregarEstado.mockResolvedValue({
    provedores: [],
    catalogo: [{ providerId: 'p1', modelId: 'm1', label: 'GPT Sintético', protocol: 'openai' }],
    ativo: 'p1',
    storage: 'fixture',
  })
})

function snapshotBase(sobre: Partial<SnapshotPrimeiroEnvio> = {}): SnapshotPrimeiroEnvio {
  return Object.freeze({
    texto: 'mensagem',
    contexto: 'chat' as const,
    workspacePath: null,
    workspaceName: null,
    selecaoModelo: { tipo: 'auto' as const },
    modo: 'ask' as const,
    permissao: 'manual' as const,
    geracao: 1,
    tentativaId: 't-1',
    ...sobre,
  })
}

function portasRegistro(ordem: string[], extra: Partial<PortasPrimeiroEnvio> = {}): PortasPrimeiroEnvio {
  return {
    criarWorktree: async (caminhoRaiz) => {
      ordem.push('criar')
      return { repoRoot: '/repo', path: `${caminhoRaiz}/.wt`, slug: 'pasta', branch: 'main' }
    },
    persistir: async () => { ordem.push('persistir') },
    publicar: async (_sessao, _chatId, snap) => { ordem.push(`publicar:${snap.selecaoModelo.tipo}`) },
    ...extra,
  }
}

describe('c2PrimeiroEnvio — R03/R04 fases e snapshot explícito', () => {
  it('T06: ordem validar→criar→persistir→publicar; erro em publicar preserva a identidade p/ retry', async () => {
    const ordem: string[] = []
    const snapshot = snapshotBase({ contexto: 'workspace', workspacePath: '/ws/demo', workspaceName: 'demo' })
    const primeira = await executarPrimeiroEnvio({
      snapshot,
      portas: portasRegistro(ordem, {
        publicar: async () => { ordem.push('publicar:falha'); throw new Error('sem rede') },
      }),
      gerarId: () => 'id-1',
    })
    expect(ordem).toEqual(['criar', 'persistir', 'publicar:falha'])
    expect(primeira.ok).toBe(false)
    expect(primeira.fase).toBe('erro')
    // A identidade criada fica confirmada (mesma tentativa pode ser repetida).
    expect(primeira.confirmada?.sessao.id).toBe('id-1')

    // Retry da MESMA geração: NÃO cria outra sessão nem persiste de novo.
    const ordem2: string[] = []
    const segunda = await executarPrimeiroEnvio({
      snapshot,
      confirmada: primeira.confirmada ?? null,
      portas: portasRegistro(ordem2),
      gerarId: () => 'id-2',
    })
    expect(ordem2).toEqual(['publicar:auto'])
    expect(segunda.ok).toBe(true)
    expect(segunda.sessao?.id).toBe('id-1')
  })

  it('T05: edição nova (geração diferente) DESCARTA a identidade e cria outra sessão', async () => {
    const ordem: string[] = []
    const snapshot = snapshotBase({ contexto: 'workspace', workspacePath: '/ws/demo', workspaceName: 'demo', geracao: 1 })
    const confirmada: TentativaConfirmada = {
      geracao: snapshot.geracao,
      tentativaId: snapshot.tentativaId,
      sessao: construirSessaoChat('id-velho', snapshot.texto),
      chatId: chatIdDaSessao('id-velho'),
      contexto: 'workspace',
      workspacePathSolicitado: '/ws/demo',
    }
    const editado = snapshotBase({ contexto: 'workspace', workspacePath: '/ws/demo', workspaceName: 'demo', geracao: 2, tentativaId: 't-2' })
    const resultado = await executarPrimeiroEnvio({
      snapshot: editado,
      confirmada,
      portas: portasRegistro(ordem),
      gerarId: () => 'id-novo',
    })
    expect(ordem).toEqual(['criar', 'persistir', 'publicar:auto'])
    expect(resultado.sessao?.id).toBe('id-novo')
  })

  it('T06/RV03: geração igual com OUTRA raiz NÃO reutiliza — cria outra sessão (nunca publica na raiz antiga)', async () => {
    const ordem: string[] = []
    const snapshotA = snapshotBase({ contexto: 'workspace', workspacePath: '/ws/raiz-a', workspaceName: 'raiz-a' })
    const primeira = await executarPrimeiroEnvio({
      snapshot: snapshotA,
      portas: portasRegistro(ordem, { publicar: async () => { ordem.push('publicar:falha'); throw new Error('rede') } }),
      gerarId: () => 'id-a',
    })
    expect(primeira.ok).toBe(false)
    expect(primeira.confirmada?.workspacePathSolicitado).toBe('/ws/raiz-a')

    // Mesmo texto/geração, raiz B: identidade da A não pode publicar em A.
    const ordem2: string[] = []
    const snapshotB = snapshotBase({ contexto: 'workspace', workspacePath: '/ws/raiz-b', workspaceName: 'raiz-b' })
    const segunda = await executarPrimeiroEnvio({
      snapshot: snapshotB,
      confirmada: primeira.confirmada ?? null,
      portas: portasRegistro(ordem2),
      gerarId: () => 'id-b',
    })
    expect(ordem2).toEqual(['criar', 'persistir', 'publicar:auto'])
    expect(segunda.ok).toBe(true)
    expect(segunda.sessao?.id).toBe('id-b')
    expect(segunda.sessao?.workspacePath).not.toBe('/ws/raiz-a')
  })

  it('T06/RV03: Chat com geração igual e MESMA raiz reutiliza a identidade (retry sem novo create)', async () => {
    const ordem: string[] = []
    const snapshot = snapshotBase({ contexto: 'chat', workspacePath: null, workspaceName: null })
    const primeira = await executarPrimeiroEnvio({
      snapshot,
      portas: portasRegistro(ordem, { publicar: async () => { ordem.push('publicar:falha'); throw new Error('rede') } }),
      gerarId: () => 'id-chat',
    })
    expect(primeira.confirmada?.contexto).toBe('chat')
    const ordem2: string[] = []
    const segunda = await executarPrimeiroEnvio({
      snapshot,
      confirmada: primeira.confirmada ?? null,
      portas: portasRegistro(ordem2),
      gerarId: () => 'id-outro',
    })
    expect(ordem2).toEqual(['publicar:auto'])
    expect(segunda.sessao?.id).toBe('id-chat')
  })

  it('T06: falha em criar/persistir NÃO chama publicar (nenhum efeito antes do ACK)', async () => {
    const ordem: string[] = []
    const resultado = await executarPrimeiroEnvio({
      snapshot: snapshotBase({ contexto: 'workspace', workspacePath: '/ws/demo', workspaceName: 'demo' }),
      portas: portasRegistro(ordem, { persistir: async () => { ordem.push('persistir:falha'); throw new Error('P-A recusou') } }),
      gerarId: () => 'id-x',
    })
    expect(ordem).toEqual(['criar', 'persistir:falha'])
    expect(resultado.ok).toBe(false)
    expect(resultado.confirmada).toBeUndefined()
  })

  it('T05: snapshot inválido (texto vazio/Pasta sem raiz) recusa na fase validar SEM tocar nas portas', async () => {
    const criarWorktree = vi.fn()
    const resultado = await executarPrimeiroEnvio({
      snapshot: snapshotBase({ texto: '   ', geracao: 0 }),
      portas: { criarWorktree: criarWorktree as never, persistir: vi.fn(), publicar: vi.fn() },
      gerarId: () => 'id-vazio',
    })
    expect(resultado).toMatchObject({ ok: false, fase: 'validando' })
    expect(criarWorktree).not.toHaveBeenCalled()

    const semRaiz = await executarPrimeiroEnvio({
      snapshot: snapshotBase({ contexto: 'workspace', workspacePath: null }),
      portas: { persistir: vi.fn(), publicar: vi.fn() },
      gerarId: () => 'id-semraiz',
    })
    expect(semRaiz).toMatchObject({ ok: false, fase: 'validando' })
  })

  it('T07: o PRIMEIRO pedido recebe o par exato escolhido (sem fallback para Auto)', async () => {
    const publicar = vi.fn<(sessao: Session, chatId: string, snap: SnapshotPrimeiroEnvio) => Promise<void>>(async () => {})
    await executarPrimeiroEnvio({
      snapshot: snapshotBase({ selecaoModelo: { tipo: 'explicita', providerId: 'p1', modelId: 'm1' } }),
      portas: { persistir: vi.fn(), publicar },
      gerarId: () => 'id-par',
    })
    expect(publicar).toHaveBeenCalledTimes(1)
    expect(publicar.mock.calls[0][2].selecaoModelo).toEqual({ tipo: 'explicita', providerId: 'p1', modelId: 'm1' })
  })

  it('T15: sessão Chat nasce sem raiz, sem worktree e com contexto chat (contrato C-1 preservado)', async () => {
    const persistir = vi.fn<(sessao: Session) => Promise<void>>(async () => {})
    await executarPrimeiroEnvio({
      snapshot: snapshotBase({ contexto: 'chat', workspacePath: null, workspaceName: null, texto: 'criar chat' }),
      portas: { persistir, publicar: vi.fn() },
      gerarId: () => 'id-chat',
    })
    const sessao = persistir.mock.calls[0][0] as Session
    expect(sessao.contexto).toEqual({ tipo: 'chat' })
    expect(sessao.workspacePath).toBeNull()
    expect(sessao.worktreePath).toBeNull()
    expect(sessao.chats[0].id).toBe(chatIdDaSessao('id-chat'))
    expect(sessao.title).toBe(derivarTitulo('criar chat'))
  })
})

describe('c2PrimeiroEnvio — C2-T11/T12 modalidade e permissão efetivas', () => {
  it('T11: Chat força ask/manual no snapshot mesmo com modo agent no rascunho', () => {
    expect(modoEfetivo('chat', 'agent')).toBe('ask')
    expect(permissaoEfetiva('chat', 'allow-all')).toBe('manual')
    const rascunho = editarRascunho(rascunhoInicial(), { modo: 'agent', permissao: 'allow-all' })
    const snapshot = snapshotDoRascunho(rascunho, 'chat', null, null, 't-chat')
    expect(snapshot.modo).toBe('ask')
    expect(snapshot.permissao).toBe('manual')
    expect(snapshot.workspacePath).toBeNull()
  })

  it('T12: Permitir tudo é EXPLÍCITO no rascunho e sobrevive ao snapshot em Pasta', () => {
    const rascunho = editarRascunho(rascunhoInicial(), { permissao: 'allow-all' })
    const snapshot = snapshotDoRascunho(rascunho, 'workspace', '/ws/demo', 'demo', 't-ws')
    expect(snapshot.permissao).toBe('allow-all')
    expect(snapshot.modo).toBe('agent')
    expect(snapshot.workspacePath).toBe('/ws/demo')
  })
})

// — integração com a landing: o DONO do rascunho captura o snapshot —
function Monte({ onSubmit }: { onSubmit: (entrada: EntradaSubmitLanding) => unknown }) {
  const [contexto, setContexto] = useState<'chat' | 'workspace'>('chat')
  return (
    <SessionLanding
      workspace="Nenhuma pasta aberta"
      contexto={contexto}
      onChangeContexto={setContexto}
      onSubmit={onSubmit as never}
    />
  )
}

describe('c2PrimeiroEnvio — landing como aceitador (T04/T07)', () => {
  it('T04: um clique = UMA tentativa; falha preserva o texto e a nova tentativa mantém a geração', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
      .mockImplementationOnce(async (entrada: EntradaSubmitLanding) => {
        entrada.aoConfirmar({ geracao: entrada.snapshot.geracao, tentativaId: entrada.snapshot.tentativaId, sessao: construirSessaoChat('id-1', entrada.snapshot.texto), chatId: chatIdDaSessao('id-1'), contexto: 'chat', workspacePathSolicitado: null })
        return false
      })
      .mockResolvedValue(true)
    render(<Monte onSubmit={onSubmit} />)
    const campo = screen.getByRole('textbox', { name: 'Mensagem para a nova sessão' })
    await user.type(campo, 'primeira tentativa')
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(campo).toHaveValue('primeira tentativa')

    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2))
    const primeira = onSubmit.mock.calls[0][0] as EntradaSubmitLanding
    const segunda = onSubmit.mock.calls[1][0] as EntradaSubmitLanding
    expect(segunda.snapshot.tentativaId).not.toBe(primeira.snapshot.tentativaId)
    expect(segunda.snapshot.geracao).toBe(primeira.snapshot.geracao)
    // A identidade confirmada pela primeira tentativa chega na segunda.
    expect(segunda.confirmada?.sessao.id).toBe('id-1')
    // Sucesso limpa o rascunho.
    await waitFor(() => expect(campo).toHaveValue(''))
  })

  it('T07: o snapshot carrega par exato, modo e permissão escolhidos na landing', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Monte onSubmit={onSubmit} />)
    const campo = screen.getByRole('textbox', { name: 'Mensagem para a nova sessão' })
    await user.type(campo, 'com escolhas')
    await user.click(screen.getByTestId('landing-modelo-topo'))
    await user.click(await screen.findByRole('menuitemradio', { name: /GPT Sintético/ }))
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
    const entrada = onSubmit.mock.calls[0][0] as EntradaSubmitLanding
    expect(entrada.snapshot.selecaoModelo).toEqual({ tipo: 'explicita', providerId: 'p1', modelId: 'm1' })
    expect(entrada.snapshot.texto).toBe('com escolhas')
    // Chat: modo/permissão efetivos (C-1) mesmo sem tocar em nada.
    expect(entrada.snapshot.modo).toBe('ask')
    expect(entrada.snapshot.permissao).toBe('manual')
  })
})
