// ============================================================================
// C-1 (SPEC C §4) — execução em conversa Chat:
//   1. o provedor NÃO recebe ferramentas de workspace no anúncio (`tools: []`);
//   2. a fábrica `criarExecutores` NUNCA é chamada com raiz nula (nenhum
//      executor de disco/comando nasce para Chat);
//   3. uma chamada de ferramenta FORJADA chega à primeira guarda e é recusada
//      com motivo honesto — mesmo com o payload do modelo a insistir.
// ============================================================================
import type { IncomingMessage, ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AlvoConversa, ObterAlvo } from '../../conversa'
import { tratarRotasAgir, type DependenciasAgir } from '../server/rotas'
import { criarExecutoresReais } from '../server/discos'

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
        corpoEfetivo = JSON.stringify({ sessionId: 'chat-sessao-1', chatId: 'chat-main', ...valor })
      }
    } catch { /* preserva payload inválido */ }
  }
  const req = Readable.from([Buffer.from(corpoEfetivo)]) as Readable & { method?: string }
  req.method = metodo
  return req as unknown as IncomingMessage
}

const URL_AGIR = new URL('http://localhost/api/agir')

const ALVO: AlvoConversa = { providerId: 'openai', modelId: 'gpt-fixture', protocolo: 'openai-chat', baseUrl: 'http://stub.test/v1', modelo: 'gpt-fixture', apiKey: 'sk-123' }
const alvoOk: ObterAlvo = async () => ({ alvo: ALVO })

/** Resposta sintética de texto puro (fim de run). */
const SSE_TEXTO = `data: ${JSON.stringify({ choices: [{ delta: { content: 'resposta sintética' } }] })}\n\ndata: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\n\n`
/** Modelo FABRICANDO uma chamada de ferramenta de pasta (payload não anunciado). */
const SSE_TOOL_CRIAR = `data: ${JSON.stringify({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'c1', function: { name: 'criar', arguments: '{"caminho":"ola.txt","conteudo":"oi"}' } }] } }] })}\n\n`
const SSE_DEPOIS = `data: ${JSON.stringify({ choices: [{ delta: { content: 'Pronto.' } }] })}\n\ndata: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\n\n`

/** Fetch stub que CAPTURA o corpo de cada chamada ao provedor. */
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

function depsChat(criarExecutores: ReturnType<typeof vi.fn>): DependenciasAgir {
  return {
    obterAlvo: alvoOk,
    resolverShell: async () => ({ profile: { id: 'sh', label: 'sh', path: '/bin/sh' }, allProfiles: [{ id: 'sh', label: 'sh', path: '/bin/sh' }] }),
    // C-1 — a autoridade do servidor devolve Chat: raiz nula, sem grants.
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
  }
}

function frames(res: ResFalsa): Record<string, unknown>[] {
  return res.chunks.join('').split('\n\n').filter(Boolean)
    .map((linha) => JSON.parse(linha.replace(/^data: /, '')) as Record<string, unknown>)
}

async function esperaFio(res: ResFalsa, contem: string, tentativas = 80): Promise<void> {
  for (let i = 0; i < tentativas; i += 1) {
    if (res.corpo().includes(contem)) return
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  throw new Error(`o fio nunca ganhou "${contem}": ${res.corpo()}`)
}

const FERRAMENTAS_DE_PASTA = ['ler', 'listar', 'buscar', 'criar', 'escrever', 'excluir', 'executar']

afterEach(() => { vi.unstubAllGlobals() })

describe('C-1 — execução em conversa Chat (SPEC C §4)', () => {
  it('C-T04 — anúncio SEM ferramentas de workspace e fábrica de executores nunca chamada', async () => {
    const criarExecutores = vi.fn((raiz: string) => criarExecutoresReais(raiz, { plataforma: 'linux' }))
    const chamadas = stubProvedorCapturando([SSE_TEXTO])
    const res = fakeRes()
    const fio = tratarRotasAgir(fakeReq(JSON.stringify({
      mode: 'agent', messages: [{ role: 'user', content: 'olá, apenas conversa' }], fluxo: 'chat-fluxo-1', workspace: null,
    })), res, URL_AGIR, depsChat(criarExecutores))
    await fio
    expect(res.statusCode).toBe(200)
    expect(frames(res).at(-1)).toMatchObject({ type: 'done' })
    // O payload do provedor não anuncia nenhuma ferramenta de pasta/comando.
    expect(chamadas).toHaveLength(1)
    const tools = chamadas[0].corpo.tools
    const nomes = Array.isArray(tools)
      ? tools.map((ferramenta) => (ferramenta as { function?: { name?: string }; name?: string }).function?.name ?? (ferramenta as { name?: string }).name)
      : []
    expect(nomes).toEqual([])
    for (const nome of FERRAMENTAS_DE_PASTA) expect(nomes).not.toContain(nome)
    // Nenhuma fábrica de disco foi acionada (nada de raiz falsa nem cwd).
    expect(criarExecutores).not.toHaveBeenCalled()
  })

  it('C-T04 — chamada forjada de ferramenta de pasta é recusada na primeira guarda, sem fábrica', async () => {
    const criarExecutores = vi.fn((raiz: string) => criarExecutoresReais(raiz, { plataforma: 'linux' }))
    const chamadas = stubProvedorCapturando([SSE_TOOL_CRIAR, SSE_DEPOIS])
    const res = fakeRes()
    const fio = tratarRotasAgir(fakeReq(JSON.stringify({
      mode: 'agent', messages: [{ role: 'user', content: 'crie o ola.txt' }], fluxo: 'chat-fluxo-2', workspace: null,
    })), res, URL_AGIR, depsChat(criarExecutores))
    await esperaFio(res, '"type":"tool_result"')
    const tool = frames(res).find((evento) => evento.type === 'tool_result') as Record<string, unknown>
    expect(tool).toMatchObject({ ok: false })
    expect(String(tool.resumo)).toContain('Conversa Chat não tem pasta')
    await fio
    expect(frames(res).some((evento) => evento.type === 'done')).toBe(true)
    expect(criarExecutores).not.toHaveBeenCalled()
    // Nem no segundo pedido ao provedor as ferramentas de pasta aparecem.
    const nomes = (chamadas.flatMap((chamada) => {
      const tools = chamada.corpo.tools
      return Array.isArray(tools) ? tools : []
    })).map((ferramenta) => (ferramenta as { function?: { name?: string }; name?: string }).function?.name ?? (ferramenta as { name?: string }).name)
    for (const nome of FERRAMENTAS_DE_PASTA) expect(nomes).not.toContain(nome)
  })
})

// ============================================================================
// C-1 — negativos nos endpoints de Agir para conversa Chat (SPEC C §4/§5.3):
// instrução de arquivo/comando e seleção de permissão recusam com 409 antes
// de qualquer preparação; a fábrica de executores nunca é acionada.
// (O grant "Permitir na Sessão" em aprovação é defesa em profundidade: em
// Chat nenhum `pendente` nasce — a primeira guarda do C-T04 já recusa a
// ferramenta forjada — e por isso não há estado a injetar aqui.)
// ============================================================================
describe('C-1 — negativos de endpoint em conversa Chat', () => {
  const URL_INSTRUCTION = new URL('http://localhost/api/agir/instruction')
  const URL_PERMISSION = new URL('http://localhost/api/agir/permission')

  it('instruction de arquivo/comando → 409, sem executores e sem recibo', async () => {
    const criarExecutores = vi.fn((raiz: string) => criarExecutoresReais(raiz, { plataforma: 'linux' }))
    const res = fakeRes()
    await tratarRotasAgir(fakeReq(JSON.stringify({ fluxo: 'chat-neg-instruction', text: 'apague o arquivo sintético.txt' })), res, URL_INSTRUCTION, depsChat(criarExecutores))
    expect(res.statusCode).toBe(409)
    const corpo = JSON.parse(res.corpo()) as { code: string; message: string }
    expect(corpo.code).toBe('configuracao')
    expect(corpo.message).toContain('instruções de arquivo e comando exigem uma conversa workspace')
    expect(criarExecutores).not.toHaveBeenCalled()
  })

  it('seleção de permissão (inclusive "Permitir tudo") → 409 e a permissão permanece manual', async () => {
    const criarExecutores = vi.fn((raiz: string) => criarExecutoresReais(raiz, { plataforma: 'linux' }))
    for (const permission of ['manual', 'allow-all'] as const) {
      const res = fakeRes()
      await tratarRotasAgir(fakeReq(JSON.stringify({ permission })), res, URL_PERMISSION, depsChat(criarExecutores))
      expect(res.statusCode).toBe(409)
      const corpo = JSON.parse(res.corpo()) as { code: string; message: string }
      expect(corpo.code).toBe('fluxo')
      expect(corpo.message).toContain('permanece em modo manual')
    }
    expect(criarExecutores).not.toHaveBeenCalled()
  })
})
