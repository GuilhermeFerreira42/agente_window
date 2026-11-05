// ============================================================================
// Provas da rota /api/personalizacoes (FATIA 14): a visão central, a criação de
// skill e o liga/desliga persistido.
//
// A propriedade de segurança mais importante aqui é a de que **a raiz de projeto
// nunca vem do browser**: ela é resolvida pela dependência `resolverContexto`
// (a sessão persistida), na forma de F1/D113. Os testes abaixo provam isso por
// dois lados — sem sessão o escopo de projeto não existe, e um parâmetro de
// caminho afirmado pelo cliente não tem efeito nenhum.
//
// O arquivo de estado é isolado por `AGENTE_WINDOW_PERSONALIZACOES_PATH`, e as
// skills moram no perfil descartável do harness — nunca em dado pessoal.
// ============================================================================
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Skill, VisaoPersonalizacoes } from '../contract'
import {
  rotaPertenceAoModuloPersonalizacoes,
  tratarRotasPersonalizacoes,
  type DependenciasPersonalizacoes,
} from '../server/rotas'

type ResFalsa = ServerResponse & { statusCode: number; chunks: string[]; corpo: () => string }

function fakeRes(): ResFalsa {
  const chunks: string[] = []
  const res = {
    statusCode: 0,
    chunks,
    corpo: () => chunks.join(''),
    setHeader: () => undefined,
    write: (dado: string) => {
      chunks.push(String(dado))
      return true
    },
    end: (dado?: string) => {
      if (dado !== undefined) chunks.push(String(dado))
    },
  }
  return res as unknown as ResFalsa
}

function fakeReq(corpo = '', metodo = 'GET'): IncomingMessage {
  const req = Readable.from([Buffer.from(corpo)]) as Readable & { method?: string }
  req.method = metodo
  return req as unknown as IncomingMessage
}

function json(res: ResFalsa): unknown {
  return JSON.parse(res.corpo())
}

let pasta: string
let deps: DependenciasPersonalizacoes
let raizSessao: string

beforeEach(async () => {
  pasta = await mkdtemp(join(tmpdir(), 'perso-rotas-'))
  raizSessao = await mkdtemp(join(tmpdir(), 'perso-sessao-'))
  process.env.AGENTE_WINDOW_PERSONALIZACOES_PATH = join(pasta, 'personalizacoes.json')
  deps = {}
})

afterEach(async () => {
  delete process.env.AGENTE_WINDOW_PERSONALIZACOES_PATH
  await rm(pasta, { recursive: true, force: true })
  await rm(raizSessao, { recursive: true, force: true })
})

/** deps que resolvem a sessão para uma raiz fixa, como a prefeitura faz. */
function comSessao(): DependenciasPersonalizacoes {
  return { resolverContexto: () => ({ ok: true, raiz: raizSessao }) }
}

async function chamar(pathname: string, corpo = '', metodo = 'GET', d: DependenciasPersonalizacoes = deps) {
  const res = fakeRes()
  const tratada = await tratarRotasPersonalizacoes(fakeReq(corpo, metodo), res, new URL(`http://localhost${pathname}`), d)
  return { res, tratada }
}

describe('rotaPertenceAoModuloPersonalizacoes', () => {
  it.each([
    '/api/personalizacoes',
    '/api/personalizacoes/skills',
    '/api/personalizacoes/estado',
  ])('reconhece %s', (pathname) => {
    expect(rotaPertenceAoModuloPersonalizacoes(pathname)).toBe(true)
  })

  it.each([
    '/api/config',
    '/api/personalizacoes/outro',
    '/api/personalizacao',
    '/',
  ])('não se apropria de %s', (pathname) => {
    expect(rotaPertenceAoModuloPersonalizacoes(pathname)).toBe(false)
  })

  it('devolve false para caminho que não é dela, sem responder', async () => {
    const { res, tratada } = await chamar('/api/config')
    expect(tratada).toBe(false)
    expect(res.statusCode).toBe(0)
  })
})

describe('GET /api/personalizacoes — a visão central', () => {
  it('devolve skills, as ferramentas REAIS e o estado, com raizProjeto nula sem sessão', async () => {
    const { res, tratada } = await chamar('/api/personalizacoes')
    expect(tratada).toBe(true)
    expect(res.statusCode).toBe(200)
    const visao = json(res) as VisaoPersonalizacoes
    expect(visao.skills).toEqual([])
    expect(visao.raizProjeto).toBeNull()
    expect(visao.estado).toEqual({ skillsDesligadas: [], ferramentasDesligadas: [] })
    expect(visao.ferramentas.map((f) => f.id)).toEqual(['ler', 'listar', 'buscar', 'criar', 'escrever', 'excluir', 'executar'])
    expect(visao.ferramentas.every((f) => f.ligada)).toBe(true)
  })

  it('com sessão resolvida, reporta a raiz de projeto vinda do SERVIDOR', async () => {
    const { res } = await chamar('/api/personalizacoes?sessionId=s1&chatId=c1', '', 'GET', comSessao())
    const visao = json(res) as VisaoPersonalizacoes
    expect(visao.raizProjeto).toBe(raizSessao)
  })

  it('SEGURANÇA: um caminho afirmado pelo browser não tem efeito nenhum', async () => {
    const { res } = await chamar('/api/personalizacoes?path=/etc&workspacePath=/etc&raiz=/etc')
    const visao = json(res) as VisaoPersonalizacoes
    expect(visao.raizProjeto).toBeNull()
  })

  it('SEGURANÇA: sem resolverContexto injetado, a sessão alegada não abre escopo de projeto', async () => {
    const { res } = await chamar('/api/personalizacoes?sessionId=s1&chatId=c1')
    expect((json(res) as VisaoPersonalizacoes).raizProjeto).toBeNull()
  })

  it('sessão que não resolve não derruba a rota: só não há escopo de projeto', async () => {
    const falha: DependenciasPersonalizacoes = { resolverContexto: () => ({ ok: false, message: 'sessão inválida' }) }
    const { res } = await chamar('/api/personalizacoes?sessionId=s1&chatId=c1', '', 'GET', falha)
    expect(res.statusCode).toBe(200)
    expect((json(res) as VisaoPersonalizacoes).raizProjeto).toBeNull()
  })

  it('lista as skills do projeto quando a sessão resolve', async () => {
    await chamar('/api/personalizacoes/skills', JSON.stringify({ nome: 'do-projeto', descricao: 'Do projeto.', corpo: 'Corpo.', origem: 'projeto', sessionId: 's1', chatId: 'c1' }), 'POST', comSessao())
    const { res } = await chamar('/api/personalizacoes?sessionId=s1&chatId=c1', '', 'GET', comSessao())
    const visao = json(res) as VisaoPersonalizacoes
    expect(visao.skills.map((s) => s.id)).toEqual(['projeto:do-projeto'])
  })

  it('estado corrompido é 409 honesto, não padrão silencioso', async () => {
    await writeFile(process.env.AGENTE_WINDOW_PERSONALIZACOES_PATH as string, '{ quebrado', 'utf8')
    const { res } = await chamar('/api/personalizacoes')
    expect(res.statusCode).toBe(409)
    expect((json(res) as { message: string }).message).toMatch(/corrompido/)
  })
})

describe('POST /api/personalizacoes/skills — entregável c', () => {
  it('cria e devolve 201 com a skill; o GET seguinte a mostra', async () => {
    const { res } = await chamar('/api/personalizacoes/skills', JSON.stringify({ nome: 'commit', descricao: 'Cria um commit.', corpo: 'Siga o estilo.', origem: 'usuario' }), 'POST')
    expect(res.statusCode).toBe(201)
    const criada = (json(res) as { skill: Skill }).skill
    expect(criada.id).toBe('usuario:commit')
    expect(criada.estado).toBe('ok')

    const { res: lista } = await chamar('/api/personalizacoes')
    expect((json(lista) as VisaoPersonalizacoes).skills.map((s) => s.nome)).toEqual(['commit'])
  })

  it.each([
    [{ nome: 'Fix', descricao: 'd', corpo: 'c' }, /não é válido/],
    [{ nome: 'ok', descricao: '', corpo: 'c' }, /descrição não pode ser vazia/],
    [{ nome: 'ok', descricao: 'd', corpo: '' }, /corpo da skill não pode ser vazio/],
  ])('pedido inválido %o é 400 com motivo legível', async (pedido, esperado) => {
    const { res } = await chamar('/api/personalizacoes/skills', JSON.stringify(pedido), 'POST')
    expect(res.statusCode).toBe(400)
    expect((json(res) as { message: string }).message).toMatch(esperado as RegExp)
  })

  it('duplicada é 400 e não sobrescreve', async () => {
    await chamar('/api/personalizacoes/skills', JSON.stringify({ nome: 'commit', descricao: 'd', corpo: 'original' }), 'POST')
    const { res } = await chamar('/api/personalizacoes/skills', JSON.stringify({ nome: 'commit', descricao: 'd', corpo: 'novo' }), 'POST')
    expect(res.statusCode).toBe(400)
    expect((json(res) as { message: string }).message).toMatch(/Já existe/)
  })

  it('escopo de projeto sem sessão é 400 honesto', async () => {
    const { res } = await chamar('/api/personalizacoes/skills', JSON.stringify({ nome: 'x', descricao: 'd', corpo: 'c', origem: 'projeto' }), 'POST')
    expect(res.statusCode).toBe(400)
    expect((json(res) as { message: string }).message).toMatch(/Não há pasta de trabalho resolvida/)
  })

  it('corpo que não é JSON é 400, não exceção', async () => {
    const { res } = await chamar('/api/personalizacoes/skills', '{ não é json', 'POST')
    expect(res.statusCode).toBe(400)
    expect((json(res) as { message: string }).message).toMatch(/não é JSON válido/)
  })
})

describe('PUT /api/personalizacoes/estado — RF14-1, RF14-4 e F5', () => {
  it('salva o liga/desliga e o GET seguinte reflete (persiste entre F5)', async () => {
    const { res } = await chamar('/api/personalizacoes/estado', JSON.stringify({ ferramentasDesligadas: ['excluir'] }), 'PUT')
    expect(res.statusCode).toBe(200)
    expect(json(res)).toEqual({ skillsDesligadas: [], ferramentasDesligadas: ['excluir'] })

    const { res: lista } = await chamar('/api/personalizacoes')
    const visao = json(lista) as VisaoPersonalizacoes
    expect(visao.estado.ferramentasDesligadas).toEqual(['excluir'])
    expect(visao.ferramentas.find((f) => f.id === 'excluir')?.ligada).toBe(false)
    expect(visao.ferramentas.find((f) => f.id === 'ler')?.ligada).toBe(true)
  })

  it('skill desligada por aqui vem com ligada=false na lista', async () => {
    await chamar('/api/personalizacoes/skills', JSON.stringify({ nome: 'commit', descricao: 'd', corpo: 'c' }), 'POST')
    await chamar('/api/personalizacoes/estado', JSON.stringify({ skillsDesligadas: ['usuario:commit'] }), 'PUT')
    const { res } = await chamar('/api/personalizacoes')
    expect((json(res) as VisaoPersonalizacoes).skills[0]?.ligada).toBe(false)
  })

  it('salvamento parcial mantém o outro eixo', async () => {
    await chamar('/api/personalizacoes/estado', JSON.stringify({ skillsDesligadas: ['usuario:a'], ferramentasDesligadas: ['excluir'] }), 'PUT')
    await chamar('/api/personalizacoes/estado', JSON.stringify({ skillsDesligadas: [] }), 'PUT')
    const { res } = await chamar('/api/personalizacoes')
    expect((json(res) as VisaoPersonalizacoes).estado).toEqual({ skillsDesligadas: [], ferramentasDesligadas: ['excluir'] })
  })

  it('lista que não é lista é saneada, não aceita como veio', async () => {
    const { res } = await chamar('/api/personalizacoes/estado', JSON.stringify({ ferramentasDesligadas: 'excluir' }), 'PUT')
    expect(res.statusCode).toBe(200)
    expect((json(res) as { ferramentasDesligadas: string[] }).ferramentasDesligadas).toEqual([])
  })

  it('corpo que não é JSON é 400', async () => {
    const { res } = await chamar('/api/personalizacoes/estado', '][', 'PUT')
    expect(res.statusCode).toBe(400)
  })
})

describe('métodos não suportados', () => {
  it.each([['/api/personalizacoes', 'DELETE'], ['/api/personalizacoes/skills', 'GET'], ['/api/personalizacoes/estado', 'POST']])(
    '%s com %s devolve false sem responder',
    async (pathname, metodo) => {
      const { res, tratada } = await chamar(pathname, '', metodo)
      expect(tratada).toBe(false)
      expect(res.statusCode).toBe(0)
    },
  )
})
