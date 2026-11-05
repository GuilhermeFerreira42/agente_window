// ============================================================================
// Provas da COMPOSIÇÃO DE CONTEXTO na prefeitura (DP-06 / D141, E-2 e E-3).
//
// O que está em jogo aqui não é só "funciona": é que a instrução de produto seja
// composta no SERVIDOR, a partir da raiz da SESSÃO, e que nada disso derrube a
// execução quando o estado ou uma skill está estragada (RNF14-2). E que a
// composição DIGA de onde veio cada fato, em vez de esconder (E-3).
// ============================================================================
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ESTADO_PADRAO, FONTE_PADRAO_NOME_SKILL, PADRAO_NOME_SKILL } from '../../../bairros/2-inteligencia/casas/personalizacoes'
import type { EstadoPersonalizacoes } from '../../../bairros/2-inteligencia/casas/personalizacoes'
import { montarArquivoSkill } from '../../../bairros/2-inteligencia/casas/personalizacoes/server/skills'
import { comporContexto, comporFerramentasPermitidas, nomesInvocados } from '../composicaoContexto'

/** As sete ferramentas reais do catálogo da casa Agir, na ordem do catálogo. */
const CATALOGO_COMPLETO = ['ler', 'listar', 'buscar', 'criar', 'escrever', 'excluir', 'executar']

let pasta: string
let raizUsuario: string
let raizProjeto: string
let caminhoEstado: string

async function criarSkill(escopo: 'usuario' | 'projeto', nome: string, corpo: string, descricao = 'Descrição de teste.'): Promise<void> {
  const destino = escopo === 'usuario'
    ? join(raizUsuario, nome)
    : join(raizProjeto, '.agente', 'skills', nome)
  await mkdir(destino, { recursive: true })
  await writeFile(join(destino, 'SKILL.md'), montarArquivoSkill(nome, descricao, corpo), 'utf8')
}

async function gravarEstado(parcial: Partial<EstadoPersonalizacoes>): Promise<void> {
  await writeFile(caminhoEstado, JSON.stringify({ ...ESTADO_PADRAO, ...parcial }), 'utf8')
}

beforeEach(async () => {
  pasta = await mkdtemp(join(tmpdir(), 'aw-composicao-'))
  raizUsuario = join(pasta, 'usuario')
  raizProjeto = join(pasta, 'projeto')
  await mkdir(raizUsuario, { recursive: true })
  await mkdir(join(raizProjeto, '.agente', 'skills'), { recursive: true })
  caminhoEstado = join(pasta, 'personalizacoes.json')
  process.env.AGENTE_WINDOW_PERSONALIZACOES_PATH = caminhoEstado
})

afterEach(async () => {
  delete process.env.AGENTE_WINDOW_PERSONALIZACOES_PATH
  await rm(pasta, { recursive: true, force: true })
})

describe('o padrão de nome continua sendo uma definição só', () => {
  it('a FONTE não carrega âncoras — senão o padrão composto nunca casaria', () => {
    // Regressão de um erro real: compor com `PADRAO_NOME_SKILL.source` enfiava
    // `^` e `$` no meio do regex de invocação. Nada casava, e os testes que
    // esperavam "não reconhecer" passavam pelo motivo errado.
    expect(FONTE_PADRAO_NOME_SKILL.startsWith('^')).toBe(false)
    expect(FONTE_PADRAO_NOME_SKILL.endsWith('$')).toBe(false)
    expect(new RegExp(`(?:^|\\s)/(${FONTE_PADRAO_NOME_SKILL})(?=\\s|$)`).test('/commit faça')).toBe(true)
  })

  it('o padrão ancorado derivado da fonte continua julgando nomes como antes', () => {
    expect(PADRAO_NOME_SKILL.test('commit')).toBe(true)
    expect(PADRAO_NOME_SKILL.test('baixar-videos')).toBe(true)
    expect(PADRAO_NOME_SKILL.test('Commit')).toBe(false)
    expect(PADRAO_NOME_SKILL.test('-commit')).toBe(false)
    expect(PADRAO_NOME_SKILL.test('commit/outra')).toBe(false)
  })
})

describe('nomesInvocados — o que conta como /nome', () => {
  it('reconhece a invocação no começo da mensagem', () => {
    expect(nomesInvocados('/commit faça o commit')).toEqual(['commit'])
  })

  it('reconhece a invocação no meio da frase, precedida de espaço', () => {
    expect(nomesInvocados('por favor use /revisar agora')).toEqual(['revisar'])
  })

  it('reconhece a invocação sozinha e a no fim da linha', () => {
    expect(nomesInvocados('/commit')).toEqual(['commit'])
    expect(nomesInvocados('faça isso\n/commit')).toEqual(['commit'])
  })

  it('NÃO confunde caminho de arquivo com invocação', () => {
    // `/home` aqui é seguido de `/`, não de espaço ou fim: não é invocação.
    expect(nomesInvocados('leia o arquivo /home/user/notas.md e resuma')).toEqual([])
    expect(nomesInvocados('crie /usr/local/bin/x')).toEqual([])
  })

  it('não reconhece nome fora do padrão (maiúscula, sublinhado, vazio)', () => {
    expect(nomesInvocados('/Commit faça')).toEqual([])
    expect(nomesInvocados('/minha_skill faça')).toEqual([])
    expect(nomesInvocados('/ faça')).toEqual([])
    expect(nomesInvocados('commit sem barra')).toEqual([])
  })

  it('o mesmo /nome citado duas vezes aparece uma vez só, na ordem da mensagem', () => {
    expect(nomesInvocados('/commit e depois /revisar e de novo /commit')).toEqual(['commit', 'revisar'])
  })

  it('mensagem vazia não produz invocação', () => {
    expect(nomesInvocados('')).toEqual([])
  })

  it('chamadas repetidas não herdam posição da anterior (regex global nova a cada vez)', () => {
    const texto = '/commit faça'
    expect(nomesInvocados(texto)).toEqual(['commit'])
    expect(nomesInvocados(texto)).toEqual(['commit'])
    expect(nomesInvocados(texto)).toEqual(['commit'])
  })
})

describe('comporContexto — etapa 1, composta no servidor', () => {
  it('sem invocação não injeta nada e anuncia o catálogo completo', async () => {
    const resultado = await comporContexto({ texto: 'faça um resumo', raizProjeto: raizProjeto, raizUsuario })
    expect(resultado.instrucoesDeProduto).toEqual([])
    expect(resultado.skillsInvocadas).toEqual([])
    expect(resultado.invocacoesIgnoradas).toEqual([])
    expect(resultado.ferramentasPermitidas).toEqual(CATALOGO_COMPLETO)
    expect(resultado.falhas).toEqual([])
  })

  it('reporta a FONTE do histórico (E-3): nesta fatia ele ainda vem do browser', async () => {
    const resultado = await comporContexto({ texto: 'oi', raizProjeto: raizProjeto, raizUsuario })
    expect(resultado.fonteHistorico).toBe('browser')
  })

  it('skill de projeto invocada vira instrução com o CORPO, sem frontmatter junto', async () => {
    await criarSkill('projeto', 'commit', 'Siga o estilo de commit deste repositório.')
    const resultado = await comporContexto({ texto: '/commit agora', raizProjeto: raizProjeto, raizUsuario })
    expect(resultado.instrucoesDeProduto).toHaveLength(1)
    expect(resultado.instrucoesDeProduto[0]).toEqual({
      origem: 'skill',
      id: 'projeto:commit',
      nome: 'commit',
      corpo: 'Siga o estilo de commit deste repositório.',
    })
    expect(resultado.instrucoesDeProduto[0]?.corpo).not.toContain('---')
    expect(resultado.instrucoesDeProduto[0]?.corpo).not.toContain('description:')
    expect(resultado.skillsInvocadas).toEqual(['projeto:commit'])
  })

  it('skill de usuário também é injetada, com id de usuário', async () => {
    await criarSkill('usuario', 'revisar', 'Aponte riscos de segurança.')
    const resultado = await comporContexto({ texto: '/revisar', raizProjeto: raizProjeto, raizUsuario })
    expect(resultado.instrucoesDeProduto[0]?.id).toBe('usuario:revisar')
  })

  it('projeto VENCE usuário quando os dois têm o mesmo nome', async () => {
    await criarSkill('usuario', 'commit', 'Versão do usuário.')
    await criarSkill('projeto', 'commit', 'Versão do projeto.')
    const resultado = await comporContexto({ texto: '/commit', raizProjeto: raizProjeto, raizUsuario })
    expect(resultado.instrucoesDeProduto).toHaveLength(1)
    expect(resultado.instrucoesDeProduto[0]?.id).toBe('projeto:commit')
    expect(resultado.instrucoesDeProduto[0]?.corpo).toBe('Versão do projeto.')
  })

  it('duas skills invocadas chegam na ordem da mensagem', async () => {
    await criarSkill('usuario', 'commit', 'Corpo do commit.')
    await criarSkill('usuario', 'revisar', 'Corpo da revisão.')
    const resultado = await comporContexto({ texto: '/revisar e depois /commit', raizProjeto: raizProjeto, raizUsuario })
    expect(resultado.instrucoesDeProduto.map((i) => i.nome)).toEqual(['revisar', 'commit'])
  })

  it('RF14-1: skill DESLIGADA não é injetada, e a invocação é reportada como ignorada', async () => {
    await criarSkill('usuario', 'commit', 'Corpo do commit.')
    await gravarEstado({ skillsDesligadas: ['usuario:commit'] })
    const resultado = await comporContexto({ texto: '/commit faça', raizProjeto: raizProjeto, raizUsuario })
    expect(resultado.instrucoesDeProduto).toEqual([])
    expect(resultado.skillsInvocadas).toEqual([])
    expect(resultado.invocacoesIgnoradas).toEqual(['commit'])
  })

  it('RF14-3: skill com frontmatter TORTO não derruba nada e é ignorada com honestidade', async () => {
    await mkdir(join(raizUsuario, 'torta'), { recursive: true })
    await writeFile(join(raizUsuario, 'torta', 'SKILL.md'), '---\nname: outra-coisa\n---\nCorpo.', 'utf8')
    await criarSkill('usuario', 'boa', 'Corpo da boa.')
    const resultado = await comporContexto({ texto: '/torta e /boa', raizProjeto: raizProjeto, raizUsuario })
    expect(resultado.instrucoesDeProduto.map((i) => i.nome)).toEqual(['boa'])
    expect(resultado.invocacoesIgnoradas).toEqual(['torta'])
    expect(resultado.falhas).toEqual([])
  })

  it('/nome inexistente é ignorado sem lançar e sem inventar instrução', async () => {
    const resultado = await comporContexto({ texto: '/nao-existe faça algo', raizProjeto: raizProjeto, raizUsuario })
    expect(resultado.instrucoesDeProduto).toEqual([])
    expect(resultado.invocacoesIgnoradas).toEqual(['nao-existe'])
  })

  it('sem raiz de projeto, só o escopo de usuário existe — e nada é deduzido', async () => {
    await criarSkill('usuario', 'commit', 'Corpo do usuário.')
    await criarSkill('projeto', 'so-projeto', 'Corpo do projeto.')
    const resultado = await comporContexto({ texto: '/commit /so-projeto', raizProjeto: null, raizUsuario })
    expect(resultado.instrucoesDeProduto.map((i) => i.id)).toEqual(['usuario:commit'])
    expect(resultado.invocacoesIgnoradas).toEqual(['so-projeto'])
  })

  it('estado ausente NÃO é erro: vale o padrão documentado', async () => {
    await criarSkill('usuario', 'commit', 'Corpo.')
    const resultado = await comporContexto({ texto: '/commit', raizProjeto: raizProjeto, raizUsuario })
    expect(resultado.falhas).toEqual([])
    expect(resultado.ferramentasPermitidas).toEqual(CATALOGO_COMPLETO)
    expect(resultado.instrucoesDeProduto).toHaveLength(1)
  })

  it('RNF14-2: estado CORROMPIDO não derruba a composição, é reportado em falhas', async () => {
    await criarSkill('usuario', 'commit', 'Corpo.')
    await writeFile(caminhoEstado, '{ isso não é json', 'utf8')
    const resultado = await comporContexto({ texto: '/commit', raizProjeto: raizProjeto, raizUsuario })
    expect(resultado.falhas).toHaveLength(1)
    expect(resultado.falhas[0]).toContain(caminhoEstado)
    // Degrada para o padrão e segue funcionando: a execução do dono não morre por
    // um arquivo de preferências estragado. A rota própria devolve 409 à tela.
    expect(resultado.ferramentasPermitidas).toEqual(CATALOGO_COMPLETO)
    expect(resultado.instrucoesDeProduto).toHaveLength(1)
  })
})

describe('comporContexto — RF14-4, o filtro do anúncio ao modelo', () => {
  it('ferramenta desligada sai da lista permitida', async () => {
    await gravarEstado({ ferramentasDesligadas: ['excluir'] })
    const resultado = await comporContexto({ texto: 'oi', raizProjeto: raizProjeto, raizUsuario })
    expect(resultado.ferramentasPermitidas).not.toContain('excluir')
    expect(resultado.ferramentasPermitidas).toEqual(CATALOGO_COMPLETO.filter((f) => f !== 'excluir'))
  })

  it('um grupo inteiro desligado sai todo, e a ordem do catálogo é preservada', async () => {
    await gravarEstado({ ferramentasDesligadas: ['criar', 'escrever'] })
    const resultado = await comporContexto({ texto: 'oi', raizProjeto: raizProjeto, raizUsuario })
    expect(resultado.ferramentasPermitidas).toEqual(['ler', 'listar', 'buscar', 'excluir', 'executar'])
  })

  it('tudo desligado devolve lista vazia — nunca undefined, que significaria catálogo completo', async () => {
    await gravarEstado({ ferramentasDesligadas: CATALOGO_COMPLETO })
    const resultado = await comporContexto({ texto: 'oi', raizProjeto: raizProjeto, raizUsuario })
    expect(resultado.ferramentasPermitidas).toEqual([])
  })

  it('id desconhecido no estado é ignorado: o catálogo continua sendo a autoridade', async () => {
    await gravarEstado({ ferramentasDesligadas: ['ferramenta-que-nao-existe', 'excluir'] })
    const resultado = await comporContexto({ texto: 'oi', raizProjeto: raizProjeto, raizUsuario })
    expect(resultado.ferramentasPermitidas).toEqual(CATALOGO_COMPLETO.filter((f) => f !== 'excluir'))
  })

  it('comporFerramentasPermitidas reflete o mesmo estado, sem precisar de mensagem', async () => {
    await gravarEstado({ ferramentasDesligadas: ['executar'] })
    expect(await comporFerramentasPermitidas()).toEqual(CATALOGO_COMPLETO.filter((f) => f !== 'executar'))
  })

  it('comporFerramentasPermitidas não lança com estado corrompido', async () => {
    await writeFile(caminhoEstado, '][', 'utf8')
    expect(await comporFerramentasPermitidas()).toEqual(CATALOGO_COMPLETO)
  })
})
