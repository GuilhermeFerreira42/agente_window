// ============================================================================
// C-3a — c3aSend (T02/T03/T24/T25 · R02/R07/R10/R11): primeiro envio SOMENTE
// com anexo cria uma sessão com título seguro e mensagem sem run fictício; um
// dono fixo sob duplo clique/resposta atrasada/contexto trocado (nenhuma
// sessão, worktree ou upload duplicado); texto com Google e NVIDIA simulados
// preservado com Chat tools=[] e storage independente de rede/IA; segundo
// upload falha sem perder o primeiro, o draft retém IDs p/ retry e o F5
// lista `pronto` sem criar mensagem.
// ============================================================================
import type { IncomingMessage, ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { tratarRotasAgir, type DependenciasAgir } from '../bairros/2-inteligencia/casas/agir/server/rotas'
import { criarExecutoresReais } from '../bairros/2-inteligencia/casas/agir/server/discos'
import type { AlvoConversa, ObterAlvo } from '../bairros/2-inteligencia/casas/conversa'
import { transferirAnexos, type ReciboTransporte, type TransporteAnexos } from '../domain/enviarAnexos'
import { arquivoVivo, guardarArquivoVivo, limparTodosArquivosVivos } from '../domain/arquivosVivos'
import { fundirEstadoAnexos, type ListaAnexos } from '../services/sessions/anexosClient'
import { esquecerPortaDialogos } from '../shell/portaDialogos'
import { useState } from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionLanding } from '../components/SessionLanding'
import { chatIdDaSessao, derivarTitulo, executarPrimeiroEnvio, type PortasPrimeiroEnvio, type TentativaConfirmada } from '../domain/primeiroEnvio'
import { rascunhoInicial, type RascunhoLanding, type SnapshotPrimeiroEnvio } from '../domain/landingDraft'
import { useLandingSubmission } from '../hooks/useLandingSubmission'
import type { Attachment, NestedChat, Session } from '../types'
import { enviarMensagemComAnexos } from '../services/sessions/enviarComAnexos'

const { carregarEstado } = vi.hoisted(() => ({ carregarEstado: vi.fn() }))
vi.mock('../bairros/2-inteligencia/casas/provedores', () => ({ carregarEstado: () => carregarEstado() }))

/** Snapshot do PRIMEIRO ENVIO com um anexo (T02/T03 — sem texto). */
function comAnexo(overrides: Partial<SnapshotPrimeiroEnvio> = {}): SnapshotPrimeiroEnvio {
  return Object.freeze({
    texto: '',
    contexto: 'chat' as const,
    workspacePath: null,
    workspaceName: null,
    selecaoModelo: { tipo: 'auto' as const },
    modo: 'ask' as const,
    permissao: 'manual' as const,
    geracao: 1,
    tentativaId: 't-anexo',
    anexos: [{ id: 'local:relatorio.pdf:9:1', name: 'relatorio.pdf', kind: 'local' as const, uploadId: 'u-1', estado: 'selecionado' as const }],
    ...overrides,
  })
}

// --------------------------------------------------------------------- T24
type ResFalsa = ServerResponse & {
  statusCode: number
  ended: boolean
  chunks: string[]
  cabecalhos: Record<string, string>
  corpo: () => string
}

function fakeRes(): ResFalsa {
  const cabecalhos: Record<string, string> = {}
  const chunks: string[] = []
  const res = {
    statusCode: 0,
    ended: false,
    chunks,
    cabecalhos,
    corpo: () => chunks.join(''),
    setHeader: (chave: string, valor: string) => { cabecalhos[chave.toLowerCase()] = String(valor) },
    flushHeaders: () => undefined,
    write: (dado: string) => { chunks.push(String(dado)); return true },
    end: (dado?: string) => { if (dado !== undefined) chunks.push(String(dado)); res.ended = true },
  }
  return res as unknown as ResFalsa
}

function fakeReq(corpo = '', metodo = 'POST'): IncomingMessage {
  let corpoEfetivo = corpo
  if (corpo) {
    try {
      const valor = JSON.parse(corpo) as Record<string, unknown>
      if (valor && typeof valor === 'object') {
        corpoEfetivo = JSON.stringify({ sessionId: 'sessao-t24', chatId: 'chat-t24', ...valor })
      }
    } catch { /* preserva payload inválido */ }
  }
  const req = Readable.from([Buffer.from(corpoEfetivo)]) as Readable & { method?: string }
  req.method = metodo
  return req as unknown as IncomingMessage
}

const URL_AGIR = new URL('http://localhost/api/agir')
const SSE_TEXTO = `data: ${JSON.stringify({ choices: [{ delta: { content: 'resposta sintética' } }] })}\n\n`
  + `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\n\n`

const ALVO_BASE: AlvoConversa = {
  providerId: 'openai', modelId: 'gpt-fixture', protocolo: 'openai-chat',
  baseUrl: 'http://stub.test/v1', modelo: 'gpt-fixture', apiKey: 'sk-123',
}

function frames(res: ResFalsa): Record<string, unknown>[] {
  return res.chunks.join('').split('\n\n').filter(Boolean)
    .map((linha) => JSON.parse(linha.replace(/^data: /, '')) as Record<string, unknown>)
}

function stubProvedorCapturando(respostas: string[]): Array<{ url: string; corpo: Record<string, unknown> }> {
  const chamadas: Array<{ url: string; corpo: Record<string, unknown> }> = []
  let indice = 0
  vi.stubGlobal('fetch', vi.fn(async (url: unknown, init?: RequestInit) => {
    const corpo = respostas[Math.min(indice, respostas.length - 1)]
    indice += 1
    let parseado: Record<string, unknown> = {}
    try { parseado = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown> } catch { /* corpo não-JSON */ }
    chamadas.push({ url: String(url), corpo: parseado })
    return new Response(corpo, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
  }))
  return chamadas
}

function depsChat(opcoes: { obterAlvo: ObterAlvo; gravarExecucao?: DependenciasAgir['gravarExecucao'] }): DependenciasAgir {
  const criarExecutores = vi.fn((raiz: string) => criarExecutoresReais(raiz, { plataforma: 'linux' }))
  return {
    obterAlvo: opcoes.obterAlvo,
    resolverShell: async () => ({
      profile: { id: 'sh', label: 'sh', path: '/bin/sh' },
      allProfiles: [{ id: 'sh', label: 'sh', path: '/bin/sh' }],
    }),
    // Autoridade do servidor devolve Chat: raiz nula, sem grants.
    resolverContexto: () => ({ ok: true as const, raiz: null, permissoes: [] }),
    criarExecutores,
    concederPermissaoSessao: () => undefined,
    lerModo: () => null,
    definirModo: () => undefined,
    lerPermissao: () => 'manual' as const,
    definirPermissao: () => undefined,
    lerExclusaoAutomatica: () => false,
    definirExclusaoAutomatica: () => undefined,
    lerTeto: async () => 25,
    ...(opcoes.gravarExecucao ? { gravarExecucao: opcoes.gravarExecucao } : {}),
  }
}

afterEach(() => { esquecerPortaDialogos(); vi.unstubAllGlobals() })

describe('c3aSend — T24: provedores simulados e storage independente de IA', () => {
  it('C3A-T24 — texto normal com Google e NVIDIA simulados: preservado no payload, Chat sem tools de workspace, storage gravado', async () => {
    for (const providerId of ['google', 'nvidia']) {
      const chamadas = stubProvedorCapturando([SSE_TEXTO])
      const gravarExecucao = vi.fn<NonNullable<DependenciasAgir['gravarExecucao']>>(async () => undefined)
      const res = fakeRes()
      const texto = `mensagem normal via ${providerId}`
      await tratarRotasAgir(
        fakeReq(JSON.stringify({ mode: 'agent', messages: [{ role: 'user', content: texto }], fluxo: `fluxo-${providerId}`, workspace: null })),
        res,
        URL_AGIR,
        depsChat({ obterAlvo: async () => ({ alvo: { ...ALVO_BASE, providerId, modelId: `${providerId}-simulado` } }), gravarExecucao }),
      )
      expect(res.statusCode).toBe(200)
      expect(frames(res).at(-1)).toMatchObject({ type: 'done' })

      // Texto íntegro no payload do provedor simulado.
      expect(chamadas).toHaveLength(1)
      expect(JSON.stringify(chamadas[0].corpo.messages)).toContain(texto)
      // Chat tools=[]: nenhuma ferramenta de workspace anunciada.
      const tools = chamadas[0].corpo.tools
      const nomes = Array.isArray(tools)
        ? tools.map((ferramenta) => (ferramenta as { function?: { name?: string } }).function?.name ?? (ferramenta as { name?: string }).name)
        : []
      expect(nomes).toEqual([])
      // Storage (registro de execução) gravado sem depender de ferramentas/IA.
      expect(gravarExecucao).toHaveBeenCalled()
      // Nenhum executor de disco nasce em Chat.
      expect(chamadas[0].corpo).not.toHaveProperty('workspace')
    }
  })

  it('C3A-T24 — rede de IA cai: erro honesto sem corromper o storage; a próxima execução com o mesmo storage funciona', async () => {
    const gravarExecucao = vi.fn<NonNullable<DependenciasAgir['gravarExecucao']>>(async () => undefined)
    const obterAlvo: ObterAlvo = async () => ({ alvo: { ...ALVO_BASE, providerId: 'google' } })

    // 1ª tentativa: provedor inacessível (sintético).
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNREFUSED sintético') }))
    const resErro = fakeRes()
    await tratarRotasAgir(
      fakeReq(JSON.stringify({ mode: 'agent', messages: [{ role: 'user', content: 'oi' }], fluxo: 'fluxo-rede', workspace: null })),
      resErro, URL_AGIR, depsChat({ obterAlvo, gravarExecucao }),
    )
    expect(frames(resErro).some((frame) => frame.type === 'error')).toBe(true)
    expect(frames(resErro).some((frame) => frame.type === 'done')).toBe(false)
    expect(resErro.corpo()).not.toContain('sk-123')

    // Storage não depende da IA: o registro foi gravado mesmo com a rede fora…
    expect(gravarExecucao).toHaveBeenCalled()

    // …e a execução seguinte com o MESMO storage segue funcionando.
    stubProvedorCapturando([SSE_TEXTO])
    const resOk = fakeRes()
    await tratarRotasAgir(
      fakeReq(JSON.stringify({ mode: 'agent', messages: [{ role: 'user', content: 'depois da queda' }], fluxo: 'fluxo-depois', workspace: null })),
      resOk, URL_AGIR, depsChat({ obterAlvo, gravarExecucao }),
    )
    expect(frames(resOk).at(-1)).toMatchObject({ type: 'done' })
    expect(gravarExecucao.mock.calls.length).toBeGreaterThanOrEqual(2)
  })
})

// --------------------------------------------------------------------- T25
const ID1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const ID2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

function anexoLocal(uploadId: string, name: string): Attachment {
  return { id: uploadId, name, kind: 'local', uploadId, estado: 'selecionado', modoCopia: 'privado' }
}

function recibo(uploadId: string, name: string, bytes: number): ReciboTransporte {
  return {
    uploadId, artifactId: uploadId, name, bytes, sha256: 'f'.repeat(64),
    state: 'pronto', mode: 'copy', scope: 'chat', errorCode: null,
  }
}

function transporteComFalhaNoSegundo(falhaNoSegundo: boolean): { transporte: TransporteAnexos; admitidos: string[]; enviados: string[] } {
  const admitidos: string[] = []
  const enviados: string[] = []
  const transporte: TransporteAnexos = {
    admitir: async (entrada) => {
      admitidos.push(entrada.uploadId)
      return { ...recibo(entrada.uploadId, entrada.name, entrada.bytes), state: 'admitido' }
    },
    enviar: async (_sessionId, _chatId, uploadId, file) => {
      if (falhaNoSegundo && uploadId === ID2) throw new Error('falha sintética no 2º upload')
      enviados.push(uploadId)
      return recibo(uploadId, file.name, file.size)
    },
    referencia: async (entrada) => recibo('ref-1', entrada.sourcePath, 1),
  }
  return { transporte, admitidos, enviados }
}

beforeEach(() => {
  carregarEstado.mockResolvedValue({
    provedores: [], ativo: null, storage: 'fixture',
    catalogo: [{ providerId: 'p1', modelId: 'm1', label: 'GPT Sintético', protocol: 'openai' }],
  })
  carregarEstado.mockClear()
  limparTodosArquivosVivos()
})
afterEach(() => { limparTodosArquivosVivos() })

describe('c3aSend — destino automático de uploads novos', () => {
  it.each([{ raiz: '/projeto', scope: 'workspace' as const }, { raiz: null, scope: 'chat' as const }])(
    'usa $scope para a raiz $raiz, mesmo com rascunho antigo privado', async ({ raiz, scope }) => {
      const id = `auto-${scope}`
      guardarArquivoVivo(id, new File(['texto'], 'nota.txt', { type: 'text/plain' }))
      const admitir = vi.fn(async (entrada: Parameters<TransporteAnexos['admitir']>[0]) => ({
        ...recibo(id, entrada.name, entrada.bytes), scope: entrada.scope, state: 'admitido' as const,
      }))
      const transporte: TransporteAnexos = {
        admitir,
        enviar: async () => ({ ...recibo(id, 'nota.txt', 5), scope }),
        referencia: async () => { throw new Error('não é referência') },
      }
      const resultado = await transferirAnexos({ sessionId: `s-${scope}`, chatId: 'c', workspaceRoot: raiz,
        anexos: [anexoLocal(id, 'nota.txt')], transporte })
      expect(admitir).toHaveBeenCalledWith(expect.objectContaining({ scope, ...(raiz ? { workspaceRoot: raiz } : {}) }))
      expect(resultado.anexos[0]).toMatchObject({ estado: 'pronto', modoCopia: raiz ? 'projeto' : 'privado' })
    },
  )
})

describe('c3aSend — T25: falha parcial preserva o primeiro, draft retém IDs e F5 lista sem mensagem', () => {
  it('C3A-T25 — 2º upload falha: 1º permanece pronto, draft retido com IDs; retry reutiliza os MESMOS IDs; F5 lista pronto sem mensagem', async () => {
    guardarArquivoVivo(ID1, new File(['conteúdo do primeiro'], 'primeiro.txt', { type: 'text/plain' }))
    guardarArquivoVivo(ID2, new File(['conteúdo do segundo'], 'segundo.txt', { type: 'text/plain' }))
    const draft = [anexoLocal(ID1, 'primeiro.txt'), anexoLocal(ID2, 'segundo.txt')]

    // ---- 1ª tentativa: o 2º falha ----
    const primeira = transporteComFalhaNoSegundo(true)
    const resultado1 = await transferirAnexos({
      sessionId: 's-t25', chatId: 'c-t25', anexos: draft, workspaceRoot: null, transporte: primeira.transporte,
    })
    expect(resultado1.todosProntos).toBe(false)
    expect(resultado1.falhas.map((falha) => falha.name)).toEqual(['segundo.txt'])
    // O PRIMEIRO permanece publicado com a verdade do recibo:
    expect(resultado1.anexos[0]).toMatchObject({ estado: 'pronto', uploadId: ID1, bytes: 21, name: 'primeiro.txt' })
    expect(resultado1.anexos[0].artifactId).toBe(ID1)
    expect(resultado1.anexos[0].sha256).toBe('f'.repeat(64))
    // O draft do segundo é RETIDO com o MESMO ID (R11) e o File vivo continua disponível:
    expect(resultado1.anexos[1]).toMatchObject({ estado: 'falhou', uploadId: ID2, name: 'segundo.txt' })
    expect(arquivoVivo(ID1)).toBeUndefined()
    expect(arquivoVivo(ID2)).toBeInstanceOf(File)
    // Nada de mensagem: o resultado é só estado de anexos (nunca um run).
    expect(resultado1).not.toHaveProperty('mensagem')

    // ---- retry: reutiliza os MESMOS IDs; o 1º não é reenviado ----
    const retry = transporteComFalhaNoSegundo(false)
    const resultado2 = await transferirAnexos({
      sessionId: 's-t25', chatId: 'c-t25', anexos: resultado1.anexos, workspaceRoot: null, transporte: retry.transporte,
    })
    expect(resultado2.todosProntos).toBe(true)
    expect(resultado2.anexos.every((item) => item.estado === 'pronto')).toBe(true)
    // Só o segundo foi admitido/envidado de novo — com o MESMO uploadId.
    expect(retry.admitidos).toEqual([ID2])
    expect(retry.enviados).toEqual([ID2])
    expect(resultado2.anexos[1].uploadId).toBe(ID2)
    expect(arquivoVivo(ID2)).toBeUndefined() // consumido no sucesso

    // ---- F5: a lista do ledger devolve o primeiro `pronto` — sem mensagem nova ----
    const lista: ListaAnexos = {
      attachments: [{
        artifactId: ID1, name: 'primeiro.txt', bytes: 21, sha256: 'f'.repeat(64),
        mode: 'copy', estado: 'pronto', presente: true,
      }],
      uploads: [{ uploadId: ID2, artifactId: ID2, state: 'pronto', name: 'segundo.txt', mode: 'copy', errorCode: null }],
    }
    const restauradas = fundirEstadoAnexos([{ attachments: resultado2.anexos }], lista).mensagens
    expect(restauradas[0].attachments![0]).toMatchObject({ uploadId: ID1, estado: 'pronto' })
    expect(restauradas[0].attachments![1]).toMatchObject({ uploadId: ID2, estado: 'pronto' })
    // A fusão devolve APENAS anexos — nenhuma mensagem é criada pelo F5.
    expect(Object.keys(restauradas[0])).toEqual(['attachments'])
  })
})

// --------------------------------------------------------------------- T02/T03
// (T02: primeiro envio só com anexo, sem run fictício; T03: um dono fixo sob
// duplo clique/resposta atrasada/contexto trocado — controlador com portas
// falsas e landing REAL para a identidade do File.)
describe('c3aSend — T02: primeiro envio só com anexo (sem run fictício)', () => {
  it('C3A-T02 — anexo sem texto cria UMA sessão, título seguro e mensagem sem texto sintético nem run', async () => {
    const ordem: string[] = []
    const publicadas: Array<{ texto: string; anexos: number }> = []
    const portas: PortasPrimeiroEnvio = {
      persistir: async () => { ordem.push('persistir') },
      publicar: async (sessao, _chatId, snapshot) => {
        ordem.push('publicar')
        publicadas.push({ texto: snapshot.texto, anexos: snapshot.anexos?.length ?? 0 })
        // Publicação é só de MENSAGEM: em anexo-only o App não chama iniciarRun.
        expect(sessao.title.length).toBeLessThanOrEqual(49)
      },
    }
    const resultado = await executarPrimeiroEnvio({
      snapshot: comAnexo(),
      portas,
      gerarId: () => 's-anexo',
    })

    expect(resultado.ok).toBe(true)
    expect(ordem).toEqual(['persistir', 'publicar'])
    const sessao = resultado.sessao!
    // Título derivado do NOME do anexo (nunca vazio, nunca o texto sintético antigo).
    expect(sessao.title).toBe(derivarTitulo('relatorio.pdf'))
    expect(sessao.title.trim().length).toBeGreaterThan(0)
    expect(sessao.title).not.toMatch(/Arquivos anexados/i)
    expect(sessao.chats).toHaveLength(1)
    expect(sessao.mainChatId).toBe(chatIdDaSessao('s-anexo'))
    // O snapshot publicado carrega o anexo e texto VAZIO (sem invenção de run).
    expect(publicadas).toEqual([{ texto: '', anexos: 1 }])
  })

  it('C3A-T02 — sem texto e sem anexo nada é criado; com anexo o Pasta também nasce com raiz real', async () => {
    const ordem: string[] = []
    const vazio = await executarPrimeiroEnvio({
      snapshot: comAnexo({ anexos: [] }),
      portas: { persistir: async () => { ordem.push('persistir') }, publicar: async () => { ordem.push('publicar') } },
      gerarId: () => 'nunca',
    })
    expect(vazio.ok).toBe(false)
    expect(vazio.fase).toBe('validando')
    expect(ordem).toEqual([])

    const pasta = await executarPrimeiroEnvio({
      snapshot: comAnexo({ contexto: 'workspace', workspacePath: '/repos/projeto', workspaceName: 'projeto' }),
      portas: {
        criarWorktree: async (raiz, id) => { ordem.push(`worktree:${id}`); return { repoRoot: raiz, path: `${raiz}/.wt`, slug: 'projeto', branch: 'main' } },
        persistir: async () => { ordem.push('persistir') },
        publicar: async () => { ordem.push('publicar') },
      },
      gerarId: () => 's-pasta',
    })
    expect(pasta.ok).toBe(true)
    // O anexo é do rascunho: a raiz vem do SNAPSHOT (não do cwd nem de fallback).
    expect(pasta.sessao!.workspacePath).toBe('/repos/projeto')
    expect(ordem).toEqual(['worktree:s-pasta', 'persistir', 'publicar'])
  })
})

describe('c3aSend — T03: um dono fixo sob duplo clique/resposta atrasada/contexto trocado', () => {
  it('C3A-T03 — duplo Enter e resposta atrasada não duplicam sessão nem worktree (mesma geração)', async () => {
    const criadas: string[] = []
    const liberacoes: Array<() => void> = []
    const portas: PortasPrimeiroEnvio = {
      criarWorktree: async (_raiz, id) => { criadas.push(id); return { repoRoot: '/repo', path: '/repo/.wt', slug: 'repo', branch: 'main' } },
      persistir: async () => {},
      // Cada execução tem a SUA promise: a liberação é da fila inteira.
      publicar: () => new Promise<void>((resolve) => { liberacoes.push(resolve) }),
    }
    let id = 0
    const confirmadas: TentativaConfirmada[] = []

    // Duas tentativas concorrentes do MESMO rascunho (duplo Enter)…
    const primeira = executarPrimeiroEnvio({
      snapshot: comAnexo({ geracao: 7, tentativaId: 't-1', contexto: 'workspace', workspacePath: '/repo' }),
      portas, gerarId: () => `s-${++id}`, aoConfirmar: (c) => confirmadas.push(c),
    })
    await waitFor(() => expect(liberacoes).toHaveLength(1))
    const segunda = executarPrimeiroEnvio({
      snapshot: comAnexo({ geracao: 7, tentativaId: 't-1', contexto: 'workspace', workspacePath: '/repo' }),
      portas, gerarId: () => `s-${++id}`,
      confirmada: confirmadas[0], // a resposta da 1ª volta antes da 2ª começar
    })
    await waitFor(() => expect(liberacoes).toHaveLength(2))
    for (const liberar of liberacoes.splice(0)) liberar()
    const [r1, r2] = await Promise.all([primeira, segunda])

    expect(r1.ok && r2.ok).toBe(true)
    expect(criadas).toEqual(['s-1'])
    expect(r2.sessao!.id).toBe(r1.sessao!.id)
    expect(id).toBe(1)
  })

  it('C3A-T03 — contexto/raiz trocados no meio: a tentativa antiga NÃO é reutilizada (cria na raiz nova)', async () => {
    const confirmadas: TentativaConfirmada[] = []
    const portas: PortasPrimeiroEnvio = {
      criarWorktree: async (raiz) => ({ repoRoot: raiz, path: `${raiz}/.wt`, slug: 'x', branch: 'main' }),
      persistir: async () => {},
      publicar: async () => {},
    }
    const antiga = await executarPrimeiroEnvio({
      snapshot: comAnexo({ geracao: 3, contexto: 'workspace', workspacePath: '/repo/a' }),
      portas, gerarId: () => 's-a', aoConfirmar: (c) => confirmadas.push(c),
    })
    const nova = await executarPrimeiroEnvio({
      snapshot: comAnexo({ geracao: 3, contexto: 'workspace', workspacePath: '/repo/b' }),
      portas, gerarId: () => 's-b', confirmada: confirmadas[0],
    })
    expect(antiga.sessao!.id).toBe('s-a')
    expect(nova.ok).toBe(true)
    // Raiz diferente na MESMA geração: nova identidade (nunca publica em /repo/a).
    expect(nova.sessao!.id).toBe('s-b')
    expect(nova.sessao!.workspacePath).toBe('/repo/b')
  })

  it('C3A-T03 — o lock do dono admite UM submit por vez (duplo clique com anexo gera um só snapshot)', async () => {
    let submits = 0
    let resolver: ((valor: boolean) => void) | null = null
    function Dono() {
      const [rascunho, setRascunho] = useState<RascunhoLanding>(() => ({
        ...rascunhoInicial(),
        anexos: [{ id: 'local:unico.txt:3:1', name: 'unico.txt', kind: 'local', uploadId: 'u-unico', estado: 'selecionado' }],
      }))
      const { submit } = useLandingSubmission(async () => {
        submits += 1
        return new Promise<boolean>((resolve) => { resolver = resolve })
      }, { contexto: 'chat', workspacePath: null, workspaceName: null }, { rascunho, setRascunho })
      return <button onClick={() => { void submit(); void submit() }}>fixture enviar duas vezes</button>
    }
    render(<Dono />)
    fireEvent.click(screen.getByRole('button', { name: 'fixture enviar duas vezes' }))
    await waitFor(() => expect(resolver).not.toBeNull())
    await act(async () => { resolver!(true) })
    expect(submits).toBe(1)
  })

  it('C3A-T03 — guardar o mesmo File duas vezes não duplica o chip (identidade por nome:bytes:mtime)', async () => {
    const user = userEvent.setup()
    const { container } = render(<SessionLanding workspace="Nenhuma pasta aberta" onSubmit={() => true} />)
    const entrada = container.querySelector('input[type="file"]')
    if (!(entrada instanceof HTMLInputElement)) throw new Error('file input ausente')
    const arquivo = new File(['mesma coisa'], 'duplicado.txt', { type: 'text/plain', lastModified: 1_700_000_000_000 })
    await user.upload(entrada, arquivo)
    await user.upload(entrada, arquivo)
    expect(screen.getAllByRole('group', { name: /duplicado\.txt/ })).toHaveLength(1)
  })
})

// --------------------------------------------------------------------- T23
describe('c3aSend — T23: sem codec, nome de arquivo NUNCA vira conteúdo de modelo', () => {
  /**
   * U-2 — a escolha agora é o diálogo INTERNO da aplicação. O teste espera o
   * diálogo abrir e responde como o dono; nada de `window.confirm`.
   */
  async function escolherNoDialogo(aceitar: boolean) {
    const dialogo = await screen.findByRole('dialog', { name: /Enviar só o texto e manter os arquivos anexados\?/ })
    expect(dialogo).toHaveTextContent('O envio ao modelo não está disponível para esses arquivos nesta seleção.')
    fireEvent.click(within(dialogo).getByRole('button', { name: aceitar ? 'Continuar com o texto' : 'Cancelar' }))
  }

  function portasRegistro() {
    const registro = {
      runs: [] as Array<{ texto: string; historico: unknown; modelSelection: unknown }>,
      persistidas: [] as Session[],
      rascunhos: [] as Attachment[],
      notas: [] as string[],
      statusAplicados: [] as string[],
    }
    const portas = {
      obterSessao: () => ({ ...sessaoParaT23(), chats: sessaoParaT23().chats }),
      obterHistorico: () => [],
      aplicar: () => {},
      persistir: async (sessao: Session) => { registro.persistidas.push(sessao) },
      notificar: (m: string) => { registro.notas.push(m) },
      preservarRascunho: (anexos: Attachment[]) => { registro.rascunhos.push(...anexos) },
      comprometerDraft: (sessao: Session) => sessao,
      aplicarStatus: (sessao: Session, _chatId: string, status: string) => { registro.statusAplicados.push(status); return sessao },
      iniciarRun: (e: { texto: string; historico: unknown; modelSelection: unknown }) => { registro.runs.push(e) },
      tempo: () => '10:00',
      modoAtual: 'agent' as const,
    }
    return { registro, portas, restaurar: () => {} }
  }

  function sessaoParaT23(): Session {
    const chat: NestedChat = { id: 'chat-t23', title: 'Chat', status: 'completed', messages: [] }
    return {
      id: 'sessao-t23', title: 'Sessão T23', workspace: 'Chat', workspacePath: null,
      section: 'today', status: 'completed', updated: 'agora', diffAdded: 0, diffRemoved: 0,
      branch: null, chats: [chat], mainChatId: chat.id,
    }
  }

  const NOME = 'segredo-interno.pdf'
  function anexoPronto(): Attachment {
    return {
      id: 'a-t23', name: NOME, kind: 'local', uploadId: 'u-t23', artifactId: 'art-t23',
      estado: 'pronto', bytes: 12, sha256: 'f'.repeat(64), modoCopia: 'privado',
    }
  }

  it('C3A-T23 — sem codec o texto exige ESCOLHA explícita: recusar aborta antes de qualquer transferência/publicação/run', async () => {
    const { registro, portas, restaurar } = portasRegistro()
    try {
      // Rascunho ainda NÃO transferido: é exatamente o caso em que o produto
      // precisa da escolha explícita antes de continuar sem o conteúdo.
      const rascunho: Attachment = { ...anexoPronto(), estado: 'selecionado', artifactId: undefined }
      const envio = enviarMensagemComAnexos({
        sessionId: 'sessao-t23', chatId: 'chat-t23', text: 'mensagem com anexo', attachments: [rascunho],
        modelSelection: { tipo: 'auto' }, portas: portas as never,
      })
      await escolherNoDialogo(false)
      expect(await envio).toBe('abortado')
      expect(registro.persistidas).toEqual([])
      expect(registro.runs).toEqual([])
      expect(registro.notas).toEqual([])
    } finally { restaurar() }
  })

  it('MMI — anexo já transferido também exige escolha; só o TEXTO vai ao modelo', async () => {
    const { registro, portas, restaurar } = portasRegistro()
    try {
      const envio = enviarMensagemComAnexos({
        sessionId: 'sessao-t23', chatId: 'chat-t23', text: 'só este texto deve ir', attachments: [anexoPronto()],
        modelSelection: { tipo: 'auto' }, portas: portas as never,
      })
      await escolherNoDialogo(true)
      expect(await envio).toBe('publicado')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(registro.runs).toHaveLength(1)
      // O run recebe SOMENTE o texto digitado — nenhum nome de arquivo disfarçado.
      expect(registro.runs[0].texto).toBe('só este texto deve ir')
      expect(JSON.stringify(registro.runs[0].historico)).not.toContain(NOME)
      const publicada = registro.persistidas[0]
      const mensagem = publicada.chats[0].messages[0]
      expect(mensagem.content).toBe('só este texto deve ir')
      expect(mensagem.content).not.toContain(NOME)
      // O chip registra HONESTAMENTE que o conteúdo foi excluído do modelo.
      expect(mensagem.attachments?.[0]).toMatchObject({ name: NOME, estado: 'pronto', envioModelo: 'excluido-sem-codec' })
    } finally { restaurar() }
  })

  it('MMI — cancelar anexo pronto não publica e mantém o recibo selecionado', async () => {
    const { registro, portas } = portasRegistro()
    const anexo = anexoPronto()
    const envio = enviarMensagemComAnexos({ sessionId: 'sessao-t23', chatId: 'chat-t23', text: 'pergunta', attachments: [anexo], modelSelection: { tipo: 'auto' }, portas: portas as never })
    const dialogo = await screen.findByRole('dialog', { name: /Enviar só o texto e manter os arquivos anexados\?/ })
    expect(dialogo).toHaveTextContent(NOME)
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    expect(await envio).toBe('abortado')
    expect(registro.runs).toEqual([])
    expect(registro.persistidas).toEqual([])
    expect(anexo.artifactId).toBe('art-t23')
  })

  it('MMI — cancelar na landing não cria sessão e preserva texto e arquivo', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    const { container } = render(<SessionLanding workspace="Chat" onSubmit={onSubmit} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, new File(['imagem sintética'], 'rascunho.png', { type: 'image/png' }))
    const campo = screen.getByRole('textbox', { name: 'Mensagem para a nova sessão' })
    await user.type(campo, 'Veja o arquivo')
    await user.click(screen.getByRole('button', { name: 'Enviar mensagem' }))
    const dialogo = await screen.findByRole('dialog', { name: /Enviar só o texto e manter os arquivos anexados\?/ })
    expect(dialogo).toHaveTextContent('rascunho.png')
    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(campo).toHaveValue('Veja o arquivo')
    expect(screen.getByRole('group', { name: /rascunho\.png/ })).toBeInTheDocument()
  })

  it('C3A-T23 — anexo sem texto: mensagem publicada, chip salvo e NENHUM run (nenhuma chamada de IA)', async () => {
    const { registro, portas, restaurar } = portasRegistro()
    try {
      const resultado = await enviarMensagemComAnexos({
        sessionId: 'sessao-t23', chatId: 'chat-t23', text: '', attachments: [anexoPronto()],
        modelSelection: { tipo: 'auto' }, portas: portas as never,
      })
      expect(resultado).toBe('publicado')
      expect(registro.runs, 'anexo sem texto NUNCA inicia run').toEqual([])
      expect(registro.statusAplicados).toEqual(['completed'])
      const mensagem = registro.persistidas[0].chats[0].messages[0]
      expect(mensagem.content).toBe('')
      expect(mensagem.content).not.toContain(NOME)
      expect(mensagem.attachments).toHaveLength(1)
      // Sem texto, o chip NÃO declara exclusão do modelo (não havia envio).
      expect(mensagem.attachments?.[0].envioModelo).toBeUndefined()
      expect(registro.notas.join(' ')).toMatch(/Nada foi enviado ao modelo/)
    } finally { restaurar() }
  })
})
