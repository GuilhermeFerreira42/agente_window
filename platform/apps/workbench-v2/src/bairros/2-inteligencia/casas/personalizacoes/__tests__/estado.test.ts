// ============================================================================
// Casa Personalizações — testes do estado persistido e da projeção de ferramentas.
// Cobrem o critério de aceite 6 (F5 persiste) e RF14-4 (ferramenta desligada
// some do anúncio ao modelo).
// ============================================================================
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { catalogoFerramentas } from '../../agir'
import { ESTADO_PADRAO, type EstadoPersonalizacoes } from '../contract'
import { caminhoDoArquivo, lerEstado, sanarEstado, salvarEstado } from '../server/estado'
import { GRUPO_POR_FERRAMENTA, ferramentasPermitidas, gruposPresentes, projetarFerramentas } from '../server/ferramentas'

let pasta: string
let arquivo: string

beforeEach(async () => {
  pasta = await mkdtemp(join(tmpdir(), 'perso-estado-'))
  arquivo = join(pasta, 'personalizacoes.json')
})

afterEach(async () => {
  await rm(pasta, { recursive: true, force: true })
})

describe('estado persistido — critério de aceite 6 (F5 persiste)', () => {
  it('sem arquivo devolve o padrão, e não é erro', async () => {
    expect(await lerEstado(arquivo)).toEqual(ESTADO_PADRAO)
  })

  it('o que é salvo volta igual na leitura seguinte', async () => {
    await salvarEstado({ skillsDesligadas: ['usuario:commit'], ferramentasDesligadas: ['excluir'] }, arquivo)
    expect(await lerEstado(arquivo)).toEqual({ skillsDesligadas: ['usuario:commit'], ferramentasDesligadas: ['excluir'] })
  })

  it('salvar é parcial: o eixo que não veio é mantido', async () => {
    await salvarEstado({ skillsDesligadas: ['usuario:commit'], ferramentasDesligadas: ['excluir'] }, arquivo)
    await salvarEstado({ ferramentasDesligadas: [] }, arquivo)
    expect(await lerEstado(arquivo)).toEqual({ skillsDesligadas: ['usuario:commit'], ferramentasDesligadas: [] })
  })

  it('arquivo corrompido é erro honesto em português, nunca padrão silencioso', async () => {
    await writeFile(arquivo, '{ isto não é json', 'utf8')
    await expect(lerEstado(arquivo)).rejects.toThrow(/está corrompido/)
    await expect(lerEstado(arquivo)).rejects.toThrow(arquivo)
  })

  it('a gravação é atômica: não sobra temporário', async () => {
    await salvarEstado({ ferramentasDesligadas: ['excluir'] }, arquivo)
    const entradas = await readdir(pasta)
    expect(entradas).toEqual(['personalizacoes.json'])
  })

  it('o arquivo é criado com o diretório, sem exigir que ~/.agente_window exista', async () => {
    const fundo = join(pasta, 'fundo', 'personalizacoes.json')
    await salvarEstado({ skillsDesligadas: ['a:b'] }, fundo)
    expect(await lerEstado(fundo)).toEqual({ skillsDesligadas: ['a:b'], ferramentasDesligadas: [] })
  })

  it('o caminho padrão fica fora do repositório e sob .agente_window', () => {
    const caminho = caminhoDoArquivo()
    expect(caminho).toContain('.agente_window')
    expect(caminho).toContain('personalizacoes.json')
  })
})

describe('sanarEstado — nada que não seja lista de string survives', () => {
  it.each([
    [null, ESTADO_PADRAO],
    [undefined, ESTADO_PADRAO],
    ['texto', ESTADO_PADRAO],
    [{}, { skillsDesligadas: [], ferramentasDesligadas: [] }],
    [{ skillsDesligadas: 'não é lista' }, { skillsDesligadas: [], ferramentasDesligadas: [] }],
    [{ skillsDesligadas: [1, null, 'ok', '  ok  ', 'outro'] }, { skillsDesligadas: ['ok', 'outro'], ferramentasDesligadas: [] }],
  ])('sanea %o para %o', (entrada, esperado) => {
    expect(sanarEstado(entrada)).toEqual(esperado)
  })

  it('remove repetidos preservando a ordem da primeira ocorrência', () => {
    expect(sanarEstado({ ferramentasDesligadas: ['b', 'a', 'b'] }).ferramentasDesligadas).toEqual(['b', 'a'])
  })
})

describe('projetarFerramentas — entregável d: a lista é a REAL', () => {
  it('projeta exatamente o catálogo real da casa Agir, sem inventar nem omitir', () => {
    const projetadas = projetarFerramentas(ESTADO_PADRAO)
    expect(projetadas.map((f) => f.id)).toEqual(catalogoFerramentas.map((f) => f.id))
    expect(projetadas).toHaveLength(catalogoFerramentas.length)
  })

  it('todas nascem ligadas — o padrão é ligado', () => {
    expect(projetarFerramentas(ESTADO_PADRAO).every((f) => f.ligada)).toBe(true)
  })

  it('traz título e descrição do catálogo real, não texto inventado aqui', () => {
    const excluir = projetarFerramentas(ESTADO_PADRAO).find((f) => f.id === 'excluir')
    const real = catalogoFerramentas.find((f) => f.id === 'excluir')
    expect(excluir?.titulo).toBe(real?.titulo)
    expect(excluir?.descricao).toBe(real?.descricao)
  })

  it('as 7 ferramentas estão presentes, incluindo excluir e executar', () => {
    const ids = projetarFerramentas(ESTADO_PADRAO).map((f) => f.id)
    for (const esperado of ['ler', 'listar', 'buscar', 'criar', 'escrever', 'excluir', 'executar']) {
      expect(ids, esperado).toContain(esperado)
    }
  })

  it('ferramenta desligada vem com ligada=false', () => {
    const estado: EstadoPersonalizacoes = { skillsDesligadas: [], ferramentasDesligadas: ['excluir'] }
    const projetadas = projetarFerramentas(estado)
    expect(projetadas.find((f) => f.id === 'excluir')?.ligada).toBe(false)
    expect(projetadas.find((f) => f.id === 'ler')?.ligada).toBe(true)
  })

  it('toda ferramenta do catálogo tem grupo, e os grupos cobrem as quatro categorias', () => {
    const projetadas = projetarFerramentas(ESTADO_PADRAO)
    expect(projetadas.every((f) => GRUPO_POR_FERRAMENTA[f.id] !== undefined)).toBe(true)
    expect(gruposPresentes(projetadas).map((g) => g.grupo)).toEqual(['leitura', 'escrita', 'destrutiva', 'execucao'])
  })

  it('gruposPresentes só lista grupo que tem ferramenta', () => {
    expect(gruposPresentes([{ id: 'ler', titulo: 't', descricao: 'd', grupo: 'leitura', ligada: true }])).toEqual([
      { grupo: 'leitura', rotulo: 'Leitura' },
    ])
  })
})

describe('ferramentasPermitidas — RF14-4: desligada some do anúncio', () => {
  it('com nada desligado, permite o catálogo inteiro na ordem real', () => {
    expect(ferramentasPermitidas(ESTADO_PADRAO)).toEqual(catalogoFerramentas.map((f) => f.id))
  })

  it('excluir desligada sai da lista que alimenta o anúncio', () => {
    const permitidas = ferramentasPermitidas({ skillsDesligadas: [], ferramentasDesligadas: ['excluir'] })
    expect(permitidas).not.toContain('excluir')
    expect(permitidas).toContain('ler')
    expect(permitidas).toHaveLength(catalogoFerramentas.length - 1)
  })

  it('todo o grupo de leitura desligado sai junto', () => {
    const permitidas = ferramentasPermitidas({ skillsDesligadas: [], ferramentasDesligadas: ['ler', 'listar', 'buscar'] })
    expect(permitidas.some((id) => ['ler', 'listar', 'buscar'].includes(id))).toBe(false)
    expect(permitidas).toContain('executar')
  })

  it('tudo desligado devolve lista vazia — anúncio sem ferramenta nenhuma', () => {
    const todas = catalogoFerramentas.map((f) => f.id)
    expect(ferramentasPermitidas({ skillsDesligadas: [], ferramentasDesligadas: todas })).toEqual([])
  })

  it('id desconhecido gravado no estado é ignorado: o catálogo é a autoridade', () => {
    const permitidas = ferramentasPermitidas({ skillsDesligadas: [], ferramentasDesligadas: ['ferramenta-que-nao-existe'] })
    expect(permitidas).toEqual(catalogoFerramentas.map((f) => f.id))
  })
})
