// ============================================================================
// Casa Agir — provas da rota (conquista 3): pré-condições honestas, fio SSE
// com o ciclo completo do loop (chunk → tool → approval → aprovar →
// tool_result → done), a NEGAÇÃO do dono e o "Permitir na Sessão" valendo
// na segunda mexida — além do aprovar para fluxo morto.
// ============================================================================
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import * as path from 'node:path'
import { Readable } from 'node:stream'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import type { AlvoConversa, ObterAlvo } from '../../conversa'
import { rotaPertenceAoModuloAgir, tratarRotasAgir } from '../server/rotas'

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
    setHeader: (chave: string, valor: string) => {
      cabecalhos[chave.toLowerCase()] = String(valor)
    },
    flushHeaders: () => undefined,
    write: (dado: string) => {
      chunks.push(String(dado))
      return true
    },
    end: (dado?: string) => {
      if (dado !== undefined) chunks.push(String(dado))
      res.ended = true
    },
  }
  return res as unknown as ResFalsa
}

function fakeReq(corpo = '', metodo = 'POST'): IncomingMessage {
  let corpoEfetivo = corpo
  if (corpo) {
    try {
      const valor = JSON.parse(corpo) as Record<string, unknown>
      if (valor && typeof valor === 'object') {
        corpoEfetivo = JSON.stringify({ sessionId: 'sessao-1', chatId: 'chat-1', ...valor })
      }
    } catch { /* preserva payload inválido para os casos de erro */ }
  }
  const req = Readable.from([Buffer.from(corpoEfetivo)]) as Readable & { method?: string }
  req.method = metodo
  return req as unknown as IncomingMessage
}

const URL_AGIR = new URL('http://localhost/api/agir')
const URL_APROVAR = new URL('http://localhost/api/agir/aprovar')
const URL_CANCEL = new URL('http://localhost/api/agir/cancel')

const ALVO: AlvoConversa = { protocolo: 'openai-chat', baseUrl: 'http://stub.test/v1', modelo: 'm', apiKey: 'sk-123', toolCallingCapability: 'supported' }
const alvoOk: ObterAlvo = async () => ({ alvo: ALVO })

/** Raiz REAL em pasta temporária: os testes que executam ferramenta provam disco de verdade. */
const raiz = await mkdtemp(path.join(tmpdir(), 'agir-rotas-'))
const grantsPorSessao = new Map<string, Set<'criar' | 'escrever'>>()
const concederPermissaoSessao = vi.fn((sessionId: string, _raiz: string, ferramenta: 'criar' | 'escrever') => {
  const grants = grantsPorSessao.get(sessionId) ?? new Set<'criar' | 'escrever'>()
  grants.add(ferramenta)
  grantsPorSessao.set(sessionId, grants)
})
const DEPS = {
  obterAlvo: alvoOk,
  resolverContexto: (sessionId: string, chatId: string) => sessionId && chatId
    ? { ok: true as const, raiz, permissoes: [...(grantsPorSessao.get(sessionId) ?? [])] }
    : { ok: false as const, message: 'Contexto da sessão inválido.' },
  concederPermissaoSessao,
  lerTeto: async () => 25,
}

afterAll(async () => {
  await rm(raiz, { recursive: true, force: true })
})

function frames(res: ResFalsa): Record<string, unknown>[] {
  return res.chunks
    .join('')
    .split('\n\n')
    .filter(Boolean)
    .map((linha) => JSON.parse(linha.replace(/^data: /, '')) as Record<string, unknown>)
}

function identity(res: ResFalsa): { runId: string; generation: number } {
  return {
    runId: res.cabecalhos['x-agir-run-id'],
    generation: Number(res.cabecalhos['x-agir-generation']),
  }
}

function approvalBody(res: ResFalsa, fields: Record<string, unknown>): string {
  return JSON.stringify({ ...fields, ...identity(res) })
}

/** Fio SSE falso do PROVEDOR: uma sequência de respostas por chamada de fetch. */
function stubProvedor(respostas: string[]): void {
  let chamada = 0
  vi.stubGlobal('fetch', vi.fn(async () => {
    const corpo = respostas[Math.min(chamada, respostas.length - 1)]
    chamada += 1
    return new Response(corpo, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
  }))
}

const PEDIDO_BASE = JSON.stringify({
  mode: 'agent', messages: [{ role: 'user', content: 'crie o ola.txt' }],
  fluxo: 'sessao-1',
  workspace: 'raiz-real',
})

const SSE_TOOL = `data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'c1', function: { name: 'criar', arguments: '{"caminho":"ola.txt","conteudo":"oi"}' } }] } }] })}\n\n`
const SSE_DUAS_FERRAMENTAS = `data: ${JSON.stringify({
  choices: [{
    delta: {
      tool_calls: [
        { index: 0, id: 'c1', function: { name: 'criar', arguments: '{"caminho":"um.txt","conteudo":"primeiro"}' } },
        { index: 1, id: 'c2', function: { name: 'criar', arguments: '{"caminho":"dois.txt","conteudo":"segundo"}' } },
      ],
    },
  }],
})}\n\n`
const SSE_TOOL_DEPOIS_DE_RESULTADO = `data: ${JSON.stringify({ choices: [{ delta: { content: 'Pronto, criei.' } }] })}\n\ndata: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\n\n`

async function esperaFio(res: ResFalsa, contem: string, tentativas = 60): Promise<void> {
  for (let i = 0; i < tentativas; i += 1) {
    if (res.corpo().includes(contem)) return
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error(`o fio nunca ganhou "${contem}": ${res.corpo()}`)
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  grantsPorSessao.clear()
})

describe('rotas — POST /api/agir', () => {
  it('reconhece só o caminho e o método certos', async () => {
    expect(rotaPertenceAoModuloAgir('/api/agir')).toBe(true)
    expect(rotaPertenceAoModuloAgir('/api/agir/aprovar')).toBe(true)
    expect(rotaPertenceAoModuloAgir('/api/agir/cancel')).toBe(true)
    expect(rotaPertenceAoModuloAgir('/api/agirx')).toBe(false)
    const res = fakeRes()
    expect(await tratarRotasAgir(fakeReq(PEDIDO_BASE, 'GET'), res, URL_AGIR, DEPS)).toBe(false)
    expect(await tratarRotasAgir(fakeReq(PEDIDO_BASE), fakeRes(), new URL('http://localhost/api/outra'), DEPS)).toBe(false)
  })

  it('histórico vazio → 400 honesto; sem provedor → 409 honesto; fio NUNCA aberto', async () => {
    const vazio = fakeRes()
    expect(await tratarRotasAgir(fakeReq(JSON.stringify({ fluxo: 's' })), vazio, URL_AGIR, DEPS)).toBe(true)
    expect(vazio.statusCode).toBe(400)
    expect(JSON.parse(vazio.corpo()).message).toContain('Histórico vazio')

    const semProvedor = fakeRes()
    const depsSemProvedor = { ...DEPS, obterAlvo: (async () => ({ alvo: null, erro: { code: 'sem_provedor' as const, message: 'Nenhum provedor está ativo. Abra Provedores e escolha quem vai responder.' } })) as ObterAlvo }
    expect(await tratarRotasAgir(fakeReq(PEDIDO_BASE), semProvedor, URL_AGIR, depsSemProvedor)).toBe(true)
    expect(semProvedor.statusCode).toBe(409)
    expect(JSON.parse(semProvedor.corpo())).toMatchObject({ code: 'sem_provedor' })
    expect(semProvedor.corpo()).not.toContain('data: ')
  })

  it('bloqueia fail-closed modelos sem prova explícita de tool calling antes de abrir o fio', async () => {
    for (const capacidade of ['unknown', 'unsupported'] as const) {
      const res = fakeRes()
      const deps = { ...DEPS, obterAlvo: async () => ({ alvo: { ...ALVO, toolCallingCapability: capacidade } }) }
      expect(await tratarRotasAgir(fakeReq(PEDIDO_BASE), res, URL_AGIR, deps)).toBe(true)
      expect(res.statusCode).toBe(409)
      expect(JSON.parse(res.corpo())).toMatchObject({ code: 'sem_canal_nativo' })
      expect(res.corpo()).not.toContain('data: ')
    }
  })

  it('exige identidade de sessão/conversa no corpo antes de iniciar', async () => {
    const res = fakeRes()
    const corpo = JSON.stringify({ mode: 'agent', messages: [{ role: 'user', content: 'oi' }], fluxo: 's', sessionId: '', chatId: 'chat-1' })
    expect(await tratarRotasAgir(fakeReq(corpo), res, URL_AGIR, DEPS)).toBe(true)
    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.corpo()).message).toContain('identidade da sessão')
  })

  it('sem sessão persistida válida → 409 antes de abrir o fio (o browser não escolhe território)', async () => {
    const res = fakeRes()
    const corpo = JSON.stringify({ mode: 'agent', messages: [{ role: 'user', content: 'oi' }], fluxo: 's', workspace: raiz })
    const deps = { ...DEPS, resolverContexto: () => ({ ok: false as const, message: 'Sessão não registrada.' }) }
    expect(await tratarRotasAgir(fakeReq(corpo), res, URL_AGIR, deps)).toBe(true)
    expect(res.statusCode).toBe(409)
    expect(JSON.parse(res.corpo()).message).toContain('Sessão não registrada')
  })

  it('ciclo completo: tool → approval → NEGAR → tool_result "dono negou" → resposta em texto', async () => {
    stubProvedor([SSE_TOOL, SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const fio = tratarRotasAgir(fakeReq(PEDIDO_BASE), res, URL_AGIR, DEPS)
    await esperaFio(res, '"type":"approval"')
    expect(frames(res).map((e) => e.type)).toEqual(['iteracao', 'tool', 'approval'])

    const aprovar = fakeRes()
    const corpoNegar = approvalBody(res, { fluxo: 'sessao-1', id: 'c1', decisao: 'negar' })
    expect(await tratarRotasAgir(fakeReq(corpoNegar), aprovar, URL_APROVAR, DEPS)).toBe(true)
    expect(aprovar.statusCode).toBe(200)

    await fio
    const tipos = frames(res).map((e) => e.type)
    expect(tipos).toEqual(['iteracao', 'tool', 'approval', 'tool_result', 'iteracao', 'chunk', 'done'])
    const resultado = frames(res)[3] as Record<string, unknown>
    expect(resultado).toMatchObject({ type: 'tool_result', ok: false })
    expect(String(resultado.resumo)).toContain('dono negou')
    // nada foi escrito: o executor nem roda (a negação é a resposta ao modelo)
  })

  it('"Permitir na Sessão" na 1.ª mexida: a 2.ª não faz cartão (Q2a, dentro do fluxo)', async () => {
    stubProvedor([SSE_DUAS_FERRAMENTAS, SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const corpoSessao = JSON.stringify({
      mode: 'agent', messages: [{ role: 'user', content: 'crie dois arquivos' }],
      fluxo: 'sessao-2',
      workspace: 'raiz-real',
    })
    const fio = tratarRotasAgir(fakeReq(corpoSessao), res, URL_AGIR, DEPS)
    await esperaFio(res, '"type":"approval"')
    expect(frames(res).filter((e) => e.type === 'approval')).toHaveLength(1) // só a 1.ª pergunta
    const primeiro = fakeRes()
    await tratarRotasAgir(fakeReq(approvalBody(res, { fluxo: 'sessao-2', id: 'c1', decisao: 'sessao', ferramenta: 'criar' })), primeiro, URL_APROVAR, DEPS)
    await esperaFio(res, '"type":"done"')
    await fio

    const tipos = frames(res).map((e) => e.type)
    expect(tipos.filter((t) => t === 'approval')).toHaveLength(1)
    expect(tipos.filter((t) => t === 'tool_result')).toHaveLength(2)
    expect(tipos[tipos.length - 1]).toBe('done')
    expect(concederPermissaoSessao).toHaveBeenCalledWith('sessao-1', raiz, 'criar')
  })

  it('campo de permissão forjado pelo browser é ignorado; o cartão continua obrigatório', async () => {
    stubProvedor([SSE_TOOL, SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const corpo = JSON.stringify({
      mode: 'agent', messages: [{ role: 'user', content: 'crie o ola.txt' }],
      fluxo: 'sessao-3',
      workspace: '/fora',
      permissoes: ['criar'],
    })
    const fio = tratarRotasAgir(fakeReq(corpo), res, URL_AGIR, DEPS)
    await esperaFio(res, '"type":"approval"')
    expect(frames(res).map((e) => e.type)).toEqual(['iteracao', 'tool', 'approval'])
    await tratarRotasAgir(fakeReq(approvalBody(res, { fluxo: 'sessao-3', id: 'c1', decisao: 'negar' })), fakeRes(), URL_APROVAR, DEPS)
    await fio
    expect(concederPermissaoSessao).not.toHaveBeenCalled()
  })

  it('aprovar para fluxo morto → 409 honesto', async () => {
    const res = fakeRes()
    expect(await tratarRotasAgir(fakeReq(JSON.stringify({ fluxo: 'fantasma', id: 'c1', decisao: 'permitir', runId: 'nao-existe', generation: 1 })), res, URL_APROVAR, DEPS)).toBe(true)
    expect(res.statusCode).toBe(409)
    expect(JSON.parse(res.corpo()).message).toContain('expirou')
  })

  it('approval de outra sessão não consome nem executa o cartão', async () => {
    stubProvedor([SSE_TOOL, SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const fio = tratarRotasAgir(fakeReq(PEDIDO_BASE), res, URL_AGIR, DEPS)
    await esperaFio(res, '"type":"approval"')
    const estranho = fakeRes()
    await tratarRotasAgir(fakeReq(approvalBody(res, { fluxo: 'sessao-1', id: 'c1', decisao: 'permitir', sessionId: 'outra-sessao' })), estranho, URL_APROVAR, DEPS)
    expect(estranho.statusCode).toBe(409)
    expect(JSON.parse(estranho.corpo()).message).toContain('não pertence à sessão')
    await tratarRotasAgir(fakeReq(approvalBody(res, { fluxo: 'sessao-1', id: 'c1', decisao: 'negar' })), fakeRes(), URL_APROVAR, DEPS)
    await fio
    expect(frames(res).some((evento) => evento.type === 'tool_result' && evento.ok === true)).toBe(false)
  })
})

const URL_CONTINUAR = new URL('http://localhost/api/agir/continuar')
const SSE_BUSCAR = `data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'b1', function: { name: 'buscar', arguments: '{"padrao":"*.txt"}' } }] } }] })}\n\n`

describe('FATIA 11 — teto e continuar no fio', () => {
  it('teto no fio: pausa com evento `teto` e o "continuar" retoma o mesmo fluxo', async () => {
    stubProvedor([SSE_BUSCAR, SSE_TOOL_DEPOIS_DE_RESULTADO])
    const deps = { ...DEPS, lerTeto: async () => 1 }
    const pedido = JSON.stringify({ mode: 'agent', messages: [{ role: 'user', content: 'lista txt' }], fluxo: 'fluxo-teto-1', workspace: 'raiz-real' })
    const res1 = fakeRes()
    expect(await tratarRotasAgir(fakeReq(pedido), res1, URL_AGIR, deps)).toBe(true)
    const f1 = frames(res1)
    expect(f1.map((f) => f.type)).toEqual(['iteracao', 'tool', 'tool_result', 'teto'])
    expect(f1[3]).toEqual({ type: 'teto', iteracoes: 1, teto: 1 })

    const res2 = fakeRes()
    expect(await tratarRotasAgir(fakeReq(JSON.stringify({ fluxo: 'fluxo-teto-1' })), res2, URL_CONTINUAR, deps)).toBe(true)
    const f2 = frames(res2)
    expect(f2[f2.length - 1]).toMatchObject({ type: 'done' })
    expect(f2.some((f) => f.type === 'chunk')).toBe(true)
    expect(f2.some((f) => f.type === 'error')).toBe(false)
  })

  it('continuar sem pausa guardada = 409 honesto (nada para retomar)', async () => {
    const res = fakeRes()
    expect(await tratarRotasAgir(fakeReq(JSON.stringify({ fluxo: 'fluxo-fantasma' })), res, URL_CONTINUAR, DEPS)).toBe(true)
    expect(res.statusCode).toBe(409)
    expect(JSON.parse(res.corpo()).code).toBe('fluxo')
  })

  it('erro transitório (500) guarda retomada: o "continuar" retoma de onde parou (pós-11)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('erro do provedor', { status: 500 })))
    const deps = { ...DEPS, lerTeto: async () => 3 }
    const pedido = JSON.stringify({ mode: 'agent', messages: [{ role: 'user', content: 'lista txt' }], fluxo: 'fluxo-erro-1', workspace: 'raiz-real' })
    const res1 = fakeRes()
    expect(await tratarRotasAgir(fakeReq(pedido), res1, URL_AGIR, deps)).toBe(true)
    const f1 = frames(res1)
    expect(f1.map((f) => f.type)).toEqual(['iteracao', 'error'])
    expect(f1[1]).toMatchObject({ type: 'error', code: 'http', retomavel: true, iteracoes: 1, teto: 3 })
    // O continuar reabre o MESMO fluxo (agora o provedor responde bem):
    stubProvedor([SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res2 = fakeRes()
    expect(await tratarRotasAgir(fakeReq(JSON.stringify({ fluxo: 'fluxo-erro-1' })), res2, URL_CONTINUAR, deps)).toBe(true)
    const f2 = frames(res2)
    expect(f2[f2.length - 1]).toMatchObject({ type: 'done' })
    expect(f2.some((f) => f.type === 'error')).toBe(false)
  })

  it('pedido novo no mesmo fluxo descarta a retomada velha', async () => {
    stubProvedor([SSE_BUSCAR, SSE_TOOL_DEPOIS_DE_RESULTADO])
    const deps = { ...DEPS, lerTeto: async () => 1 }
    const pedido = JSON.stringify({ mode: 'agent', messages: [{ role: 'user', content: 'lista txt' }], fluxo: 'fluxo-teto-2', workspace: 'raiz-real' })
    const res1 = fakeRes()
    await tratarRotasAgir(fakeReq(pedido), res1, URL_AGIR, deps)
    expect(frames(res1).at(-1)).toMatchObject({ type: 'teto' })
    // Novo pedido no MESMO fluxo: conclui em texto — a retomada morre aqui.
    const res2 = fakeRes()
    await tratarRotasAgir(fakeReq(pedido), res2, URL_AGIR, deps)
    expect(frames(res2).at(-1)).toMatchObject({ type: 'done' })
    const res3 = fakeRes()
    await tratarRotasAgir(fakeReq(JSON.stringify({ fluxo: 'fluxo-teto-2' })), res3, URL_CONTINUAR, deps)
    expect(res3.statusCode).toBe(409)
  })
})

const SSE_EXCLUIR = (arquivo: string, id = 'x1'): string =>
  `data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id, function: { name: 'excluir', arguments: JSON.stringify({ caminho: arquivo }) } }] } }] })}\n\n`

describe('F2 — excluir pede confirmação mas permanece fail-closed até lixeira segura', () => {
  it('approval informa bloqueio; permitir não lê nem move o alvo', async () => {
    const xdg = await mkdtemp(path.join(tmpdir(), 'agir-f2-xdg-'))
    const anterior = process.env.XDG_DATA_HOME
    process.env.XDG_DATA_HOME = xdg
    try {
      await writeFile(path.join(raiz, 'alvo-f2.txt'), 'fixture sanitizada', 'utf8')
      stubProvedor([SSE_EXCLUIR('alvo-f2.txt'), SSE_TOOL_DEPOIS_DE_RESULTADO])
      const res = fakeRes()
      const pedido = JSON.stringify({ mode: 'agent', messages: [{ role: 'user', content: 'apague o alvo-f2.txt' }], fluxo: 'fluxo-f2', workspace: 'raiz-real' })
      const fio = tratarRotasAgir(fakeReq(pedido), res, URL_AGIR, DEPS)
      await esperaFio(res, '"type":"approval"')
      const cartao = frames(res).find((e) => e.type === 'approval') as Record<string, unknown>
      expect(String(cartao.previa)).toContain('exclusão está bloqueada')
      expect(String(cartao.previa)).toContain('nenhum item foi lido ou removido')
      const aprovar = fakeRes()
      expect(await tratarRotasAgir(fakeReq(approvalBody(res, { fluxo: 'fluxo-f2', id: 'x1', decisao: 'permitir' })), aprovar, URL_APROVAR, DEPS)).toBe(true)
      expect(aprovar.statusCode).toBe(200)
      await fio
      const resultado = frames(res).find((e) => e.type === 'tool_result') as Record<string, unknown>
      expect(resultado).toMatchObject({ ok: false })
      expect(String(resultado.resumo)).toContain('Exclusão bloqueada')
      expect(await readFile(path.join(raiz, 'alvo-f2.txt'), 'utf8')).toBe('fixture sanitizada')
    } finally {
      if (anterior === undefined) delete process.env.XDG_DATA_HOME
      else process.env.XDG_DATA_HOME = anterior
      await rm(xdg, { recursive: true, force: true })
    }
  })

  it('"Permitir na Sessão" para excluir → 400 honesto, e o fio continua esperando (RF12-3)', async () => {
    await writeFile(path.join(raiz, 'alvo-12b.txt'), 'b', 'utf8')
    stubProvedor([SSE_EXCLUIR('alvo-12b.txt', 'x2'), SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const pedido = JSON.stringify({ mode: 'agent', messages: [{ role: 'user', content: 'apague o alvo-12b.txt' }], fluxo: 'fluxo-12b', workspace: 'raiz-real' })
    const fio = tratarRotasAgir(fakeReq(pedido), res, URL_AGIR, DEPS)
    await esperaFio(res, '"type":"approval"')
    const tentativa = fakeRes()
    expect(await tratarRotasAgir(fakeReq(approvalBody(res, { fluxo: 'fluxo-12b', id: 'x2', decisao: 'sessao', ferramenta: 'excluir' })), tentativa, URL_APROVAR, DEPS)).toBe(true)
    expect(tentativa.statusCode).toBe(400)
    expect(JSON.parse(tentativa.corpo()).message).toContain('sempre pergunta')
    // o fio segue pendente: negar termina limpo e nada some
    await tratarRotasAgir(fakeReq(approvalBody(res, { fluxo: 'fluxo-12b', id: 'x2', decisao: 'negar' })), fakeRes(), URL_APROVAR, DEPS)
    await fio
    const resultado = frames(res).find((e) => e.type === 'tool_result') as Record<string, unknown>
    expect(String(resultado.resumo)).toContain('dono negou')
    expect(String(resultado.resumo)).toContain('nada sumiu')
    expect(await readFile(path.join(raiz, 'alvo-12b.txt'), 'utf8')).toBe('b')
  })

  it("permissoes:['excluir'] no pedido NÃO auto-libera — o cartão aparece igual (RF12-3)", async () => {
    await writeFile(path.join(raiz, 'alvo-12c.txt'), 'c', 'utf8')
    stubProvedor([SSE_EXCLUIR('alvo-12c.txt', 'x3'), SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const pedido = JSON.stringify({ mode: 'agent', messages: [{ role: 'user', content: 'apague o alvo-12c.txt' }], fluxo: 'fluxo-12c', workspace: 'raiz-real', permissoes: ['excluir'] })
    const fio = tratarRotasAgir(fakeReq(pedido), res, URL_AGIR, DEPS)
    await esperaFio(res, '"type":"approval"') // perguntou mesmo com "sessão liberada"
    expect(frames(res).some((e) => e.type === 'approval')).toBe(true)
    await tratarRotasAgir(fakeReq(approvalBody(res, { fluxo: 'fluxo-12c', id: 'x3', decisao: 'negar' })), fakeRes(), URL_APROVAR, DEPS)
    await fio
    expect(await readFile(path.join(raiz, 'alvo-12c.txt'), 'utf8')).toBe('c')
  })
})

describe('F3 — cancelamento terminal e claims de geração', () => {
  it('Parar durante approval invalida o cartão; approval tardio não executa', async () => {
    stubProvedor([SSE_TOOL, SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const pedido = JSON.stringify({ mode: 'agent', messages: [{ role: 'user', content: 'crie ola.txt' }], fluxo: 'f3-cancel-aproval' })
    const fio = tratarRotasAgir(fakeReq(pedido), res, URL_AGIR, DEPS)
    await esperaFio(res, '"type":"approval"')
    const id = identity(res)
    expect(id.runId).toBeTruthy()
    expect(id.generation).toBe(1)

    const cancelRes = fakeRes()
    const cancelBody = JSON.stringify({ fluxo: 'f3-cancel-aproval', sessionId: 'sessao-1', chatId: 'chat-1', ...id })
    await tratarRotasAgir(fakeReq(cancelBody), cancelRes, URL_CANCEL, DEPS)
    expect(cancelRes.statusCode).toBe(200)
    expect(JSON.parse(cancelRes.corpo())).toMatchObject({ status: 'cancelled', ...id })
    await fio

    const atraso = fakeRes()
    await tratarRotasAgir(fakeReq(approvalBody(res, { fluxo: 'f3-cancel-aproval', id: 'c1', decisao: 'permitir' })), atraso, URL_APROVAR, DEPS)
    expect(atraso.statusCode).toBe(409)
    expect(JSON.parse(atraso.corpo()).code).toBe('approval_expired')
    expect(frames(res).some((evento) => evento.type === 'tool_result')).toBe(false)
    await expect(readFile(path.join(raiz, 'ola.txt'), 'utf8')).rejects.toThrow()

    const repetido = fakeRes()
    await tratarRotasAgir(fakeReq(cancelBody), repetido, URL_CANCEL, DEPS)
    expect(JSON.parse(repetido.corpo())).toMatchObject({ status: 'already_terminal', ...id })
  })

  it('uma aprovação é consumida uma vez; duplicata não dispara outro efeito', async () => {
    stubProvedor([SSE_TOOL.replace('ola.txt', 'f3-uma-vez.txt'), SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const pedido = JSON.stringify({ mode: 'agent', messages: [{ role: 'user', content: 'crie f3-uma-vez.txt' }], fluxo: 'f3-approval-once' })
    const fio = tratarRotasAgir(fakeReq(pedido), res, URL_AGIR, DEPS)
    await esperaFio(res, '"type":"approval"')
    const body = approvalBody(res, { fluxo: 'f3-approval-once', id: 'c1', decisao: 'permitir' })
    const primeira = fakeRes()
    await tratarRotasAgir(fakeReq(body), primeira, URL_APROVAR, DEPS)
    expect(primeira.statusCode).toBe(200)
    const duplicada = fakeRes()
    await tratarRotasAgir(fakeReq(body), duplicada, URL_APROVAR, DEPS)
    expect(duplicada.statusCode).toBe(409)
    await fio
    const resultados = frames(res).filter((evento) => evento.type === 'tool_result')
    expect(resultados).toHaveLength(1)
    expect(resultados[0]).toMatchObject({ type: 'tool_result', id: 'c1', ok: false })
    expect(String(resultados[0].resumo)).toContain('contenção segura F2')
    await expect(readFile(path.join(raiz, 'f3-uma-vez.txt'), 'utf8')).rejects.toThrow()
  })

  it('duas continuations concorrentes fazem claim único', async () => {
    stubProvedor([SSE_BUSCAR, SSE_TOOL_DEPOIS_DE_RESULTADO])
    const deps = { ...DEPS, lerTeto: async () => 1 }
    const pedido = JSON.stringify({ mode: 'agent', messages: [{ role: 'user', content: 'busque txt' }], fluxo: 'f3-continue-once' })
    const pausa = fakeRes()
    await tratarRotasAgir(fakeReq(pedido), pausa, URL_AGIR, deps)
    expect(frames(pausa).at(-1)).toMatchObject({ type: 'teto' })

    const corpo = JSON.stringify({ fluxo: 'f3-continue-once', sessionId: 'sessao-1', chatId: 'chat-1' })
    const a = fakeRes()
    const b = fakeRes()
    const resultados = await Promise.all([
      tratarRotasAgir(fakeReq(corpo), a, URL_CONTINUAR, deps),
      tratarRotasAgir(fakeReq(corpo), b, URL_CONTINUAR, deps),
    ])
    expect(resultados).toEqual([true, true])
    expect([a.statusCode, b.statusCode].sort()).toEqual([200, 409])
    const negada = a.statusCode === 409 ? a : b
    expect(JSON.parse(negada.corpo()).code).toBe('already_running')
  })
})

describe('F5-A — política de modo imposta pela rota/loop', () => {
  it('modo ausente é 400 antes de consultar o provedor', async () => {
    const fetchStub = vi.fn()
    vi.stubGlobal('fetch', fetchStub)
    const res = fakeRes()
    await tratarRotasAgir(fakeReq(JSON.stringify({ messages: [{ role: 'user', content: 'oi' }], fluxo: 'f5-missing-mode' })), res, URL_AGIR, DEPS)
    expect(res.statusCode).toBe(400)
    expect(JSON.parse(res.corpo()).message).toContain('Modo inválido ou ausente')
    expect(fetchStub).not.toHaveBeenCalled()
  })

  it.each(['ask', 'plan'] as const)('%s não executa criar nem pede approval mesmo com tool-call adulterado', async (mode) => {
    stubProvedor([SSE_TOOL, SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const pedido = JSON.stringify({ mode, messages: [{ role: 'user', content: 'crie f5-modo.txt' }], fluxo: `f5-${mode}-write` })
    const fio = tratarRotasAgir(fakeReq(pedido), res, URL_AGIR, DEPS)
    await esperaFio(res, '"type":"tool_result"')
    const eventos = frames(res)
    expect(eventos.some((evento) => evento.type === 'approval')).toBe(false)
    expect(String((eventos.find((evento) => evento.type === 'tool_result') as Record<string, unknown>).resumo)).toContain('somente leitura')
    await fio
    await expect(readFile(path.join(raiz, 'f5-modo.txt'), 'utf8')).rejects.toThrow()
  })

  it('Continuar preserva o snapshot Planejar da execução pausada', async () => {
    stubProvedor([SSE_BUSCAR, SSE_TOOL.replace('ola.txt', 'f5-continued.txt'), SSE_TOOL_DEPOIS_DE_RESULTADO])
    const deps = { ...DEPS, lerTeto: async () => 1 }
    const pausa = fakeRes()
    const pedido = JSON.stringify({ mode: 'plan', messages: [{ role: 'user', content: 'pesquise e depois crie' }], fluxo: 'f5-plan-continue' })
    await tratarRotasAgir(fakeReq(pedido), pausa, URL_AGIR, deps)
    expect(frames(pausa).at(-1)).toMatchObject({ type: 'teto' })

    const continuação = fakeRes()
    const body = JSON.stringify({ fluxo: 'f5-plan-continue', sessionId: 'sessao-1', chatId: 'chat-1' })
    await tratarRotasAgir(fakeReq(body), continuação, URL_CONTINUAR, deps)
    const eventos = frames(continuação)
    expect(eventos.some((evento) => evento.type === 'approval')).toBe(false)
    expect(String((eventos.find((evento) => evento.type === 'tool_result') as Record<string, unknown>).resumo)).toContain('Bloqueado pelo modo Planejar')
    await expect(readFile(path.join(raiz, 'f5-continued.txt'), 'utf8')).rejects.toThrow()
  })

  it('edit mantém a política de aprovação mutável igual a agent', async () => {
    stubProvedor([SSE_TOOL.replace('ola.txt', 'f5-edit.txt'), SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const pedido = JSON.stringify({ mode: 'edit', messages: [{ role: 'user', content: 'crie f5-edit.txt' }], fluxo: 'f5-edit-same-policy' })
    const fio = tratarRotasAgir(fakeReq(pedido), res, URL_AGIR, DEPS)
    await esperaFio(res, '"type":"approval"')
    expect(frames(res).some((evento) => evento.type === 'approval')).toBe(true)
    await tratarRotasAgir(fakeReq(approvalBody(res, { fluxo: 'f5-edit-same-policy', id: 'c1', decisao: 'negar' })), fakeRes(), URL_APROVAR, DEPS)
    await fio
    await expect(readFile(path.join(raiz, 'f5-edit.txt'), 'utf8')).rejects.toThrow()
  })
})
