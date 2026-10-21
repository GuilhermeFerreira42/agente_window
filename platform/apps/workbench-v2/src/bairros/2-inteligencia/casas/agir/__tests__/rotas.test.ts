// ============================================================================
// Casa Agir — provas da rota (conquista 3): pré-condições honestas, fio SSE
// com o ciclo completo do loop (chunk → tool → approval → aprovar →
// tool_result → done), a NEGAÇÃO do dono e o "Permitir na Sessão" valendo
// na segunda mexida — além do aprovar para fluxo morto.
// ============================================================================
import { mkdtemp, rm } from 'node:fs/promises'
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
  const req = Readable.from([Buffer.from(corpo)]) as Readable & { method?: string }
  req.method = metodo
  return req as unknown as IncomingMessage
}

const URL_AGIR = new URL('http://localhost/api/agir')
const URL_APROVAR = new URL('http://localhost/api/agir/aprovar')

const ALVO: AlvoConversa = { protocolo: 'openai-chat', baseUrl: 'http://stub.test/v1', modelo: 'm', apiKey: 'sk-123' }
const alvoOk: ObterAlvo = async () => ({ alvo: ALVO })

/** Raiz REAL em pasta temporária: os testes que executam ferramenta provam disco de verdade. */
const raiz = await mkdtemp(path.join(tmpdir(), 'agir-rotas-'))
const DEPS = {
  obterAlvo: alvoOk,
  pastaDeTrabalho: (caminho: string | undefined) =>
    caminho && caminho !== '/fora' ? { ok: true as const, raiz } : { ok: false as const, message: 'Nenhuma pasta de trabalho ativa nesta sessão.' },
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
  messages: [{ role: 'user', content: 'crie o ola.txt' }],
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
})

describe('rotas — POST /api/agir', () => {
  it('reconhece só o caminho e o método certos', async () => {
    expect(rotaPertenceAoModuloAgir('/api/agir')).toBe(true)
    expect(rotaPertenceAoModuloAgir('/api/agir/aprovar')).toBe(true)
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

  it('sem pasta de trabalho → 409 honesto (o território vem da prefeitura)', async () => {
    const res = fakeRes()
    const corpo = JSON.stringify({ messages: [{ role: 'user', content: 'oi' }], fluxo: 's', workspace: '/fora' })
    expect(await tratarRotasAgir(fakeReq(corpo), res, URL_AGIR, DEPS)).toBe(true)
    expect(res.statusCode).toBe(409)
    expect(JSON.parse(res.corpo()).message).toContain('Nenhuma pasta de trabalho')
  })

  it('ciclo completo: tool → approval → NEGAR → tool_result "dono negou" → resposta em texto', async () => {
    stubProvedor([SSE_TOOL, SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const fio = tratarRotasAgir(fakeReq(PEDIDO_BASE), res, URL_AGIR, DEPS)
    await esperaFio(res, '"type":"approval"')
    expect(frames(res).map((e) => e.type)).toEqual(['volta', 'tool', 'approval'])

    const aprovar = fakeRes()
    const corpoNegar = JSON.stringify({ fluxo: 'sessao-1', id: 'c1', decisao: 'negar' })
    expect(await tratarRotasAgir(fakeReq(corpoNegar), aprovar, URL_APROVAR, DEPS)).toBe(true)
    expect(aprovar.statusCode).toBe(200)

    await fio
    const tipos = frames(res).map((e) => e.type)
    expect(tipos).toEqual(['volta', 'tool', 'approval', 'tool_result', 'volta', 'chunk', 'done'])
    const resultado = frames(res)[3] as Record<string, unknown>
    expect(resultado).toMatchObject({ type: 'tool_result', ok: false })
    expect(String(resultado.resumo)).toContain('dono negou')
    // nada foi escrito: o executor nem roda (a negação é a resposta ao modelo)
  })

  it('"Permitir na Sessão" na 1.ª mexida: a 2.ª não faz cartão (Q2a, dentro do fluxo)', async () => {
    stubProvedor([SSE_DUAS_FERRAMENTAS, SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const corpoSessao = JSON.stringify({
      messages: [{ role: 'user', content: 'crie dois arquivos' }],
      fluxo: 'sessao-2',
      workspace: 'raiz-real',
    })
    const fio = tratarRotasAgir(fakeReq(corpoSessao), res, URL_AGIR, DEPS)
    await esperaFio(res, '"type":"approval"')
    expect(frames(res).filter((e) => e.type === 'approval')).toHaveLength(1) // só a 1.ª pergunta
    const primeiro = fakeRes()
    await tratarRotasAgir(fakeReq(JSON.stringify({ fluxo: 'sessao-2', id: 'c1', decisao: 'sessao', ferramenta: 'criar' })), primeiro, URL_APROVAR, DEPS)
    await esperaFio(res, '"type":"done"')
    await fio

    const tipos = frames(res).map((e) => e.type)
    expect(tipos.filter((t) => t === 'approval')).toHaveLength(1)
    expect(tipos.filter((t) => t === 'tool_result')).toHaveLength(2)
    expect(tipos[tipos.length - 1]).toBe('done')
  })

  it('permissão que chega NO PEDIDO já vale (o dono liberou numa volta anterior — C4)', async () => {
    stubProvedor([SSE_TOOL, SSE_TOOL_DEPOIS_DE_RESULTADO])
    const res = fakeRes()
    const corpo = JSON.stringify({
      messages: [{ role: 'user', content: 'crie o ola.txt' }],
      fluxo: 'sessao-3',
      workspace: 'raiz-real',
      permissoes: ['criar'],
    })
    await tratarRotasAgir(fakeReq(corpo), res, URL_AGIR, DEPS)
    const tipos = frames(res).map((e) => e.type)
    expect(tipos).toEqual(['volta', 'tool', 'tool_result', 'volta', 'chunk', 'done']) // sem approval nenhum
  })

  it('aprovar para fluxo morto → 409 honesto', async () => {
    const res = fakeRes()
    expect(await tratarRotasAgir(fakeReq(JSON.stringify({ fluxo: 'fantasma', id: 'c1', decisao: 'permitir' })), res, URL_APROVAR, DEPS)).toBe(true)
    expect(res.statusCode).toBe(409)
    expect(JSON.parse(res.corpo()).message).toContain('já não espera mais')
  })
})

const URL_CONTINUAR = new URL('http://localhost/api/agir/continuar')
const SSE_BUSCAR = `data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'b1', function: { name: 'buscar', arguments: '{"padrao":"*.txt"}' } }] } }] })}\n\n`

describe('FATIA 11 — teto e continuar no fio', () => {
  it('teto no fio: pausa com evento `teto` e o "continuar" retoma o mesmo fluxo', async () => {
    stubProvedor([SSE_BUSCAR, SSE_TOOL_DEPOIS_DE_RESULTADO])
    const deps = { ...DEPS, lerTeto: async () => 1 }
    const pedido = JSON.stringify({ messages: [{ role: 'user', content: 'lista txt' }], fluxo: 'fluxo-teto-1', workspace: 'raiz-real' })
    const res1 = fakeRes()
    expect(await tratarRotasAgir(fakeReq(pedido), res1, URL_AGIR, deps)).toBe(true)
    const f1 = frames(res1)
    expect(f1.map((f) => f.type)).toEqual(['volta', 'tool', 'tool_result', 'teto'])
    expect(f1[3]).toEqual({ type: 'teto', voltas: 1, teto: 1 })

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
    const pedido = JSON.stringify({ messages: [{ role: 'user', content: 'lista txt' }], fluxo: 'fluxo-erro-1', workspace: 'raiz-real' })
    const res1 = fakeRes()
    expect(await tratarRotasAgir(fakeReq(pedido), res1, URL_AGIR, deps)).toBe(true)
    const f1 = frames(res1)
    expect(f1.map((f) => f.type)).toEqual(['volta', 'error'])
    expect(f1[1]).toMatchObject({ type: 'error', code: 'http', retomavel: true, voltas: 1, teto: 3 })
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
    const pedido = JSON.stringify({ messages: [{ role: 'user', content: 'lista txt' }], fluxo: 'fluxo-teto-2', workspace: 'raiz-real' })
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
