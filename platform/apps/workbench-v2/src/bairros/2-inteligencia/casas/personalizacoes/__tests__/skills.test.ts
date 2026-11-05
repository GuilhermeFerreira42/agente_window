// ============================================================================
// Casa Personalizações — testes de descoberta, frontmatter e criação de skills.
// Cobrem RF14-1 (desligada invisível), RF14-2 (invocação /nome), RF14-3
// (frontmatter torto marca, não derruba) e RF14-5 (duas raízes).
//
// Toda fixture mora no perfil descartável do harness (tmpdir()), que a D141/
// PEND-01 garante estar FORA do repositório e fora de segmento ignorado pelo
// watcher. Nenhum teste aponta para dado pessoal.
// ============================================================================
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ESTADO_PADRAO, type EstadoPersonalizacoes } from '../contract'
import {
  criarSkill,
  descobrirSkills,
  idDeSkill,
  interpretarFrontmatter,
  montarArquivoSkill,
  resolverInvocacao,
  skillsVisiveisAoAgente,
  validarNome,
} from '../server/skills'

let raizUsuario: string
let raizProjeto: string

beforeEach(async () => {
  raizUsuario = await mkdtemp(join(tmpdir(), 'perso-usuario-'))
  raizProjeto = await mkdtemp(join(tmpdir(), 'perso-projeto-'))
})

afterEach(async () => {
  await rm(raizUsuario, { recursive: true, force: true })
  await rm(raizProjeto, { recursive: true, force: true })
})

/** Escreve uma skill válida numa raiz `<raiz>/.agente/skills` ou `<raiz>` direta. */
async function semearSkill(raiz: string, nome: string, descricao = `Faz ${nome}.`, corpo = `Instrucao de ${nome}.`): Promise<string> {
  const pasta = join(raiz, nome)
  await mkdir(pasta, { recursive: true })
  const arquivo = join(pasta, 'SKILL.md')
  await writeFile(arquivo, montarArquivoSkill(nome, descricao, corpo), 'utf8')
  return arquivo
}

describe('interpretarFrontmatter — a leitura do SKILL.md (Q14-2)', () => {
  it('lê nome, descrição e corpo de um frontmatter válido', () => {
    const lido = interpretarFrontmatter('---\nname: commit\ndescription: Cria um commit.\n---\n\nSiga o estilo do repo.\n', 'commit')
    expect(lido).toEqual({ ok: true, nome: 'commit', descricao: 'Cria um commit.', corpo: 'Siga o estilo do repo.' })
  })

  it('tolera BOM e fim de linha do Windows', () => {
    const lido = interpretarFrontmatter('\uFEFF---\r\nname: commit\r\ndescription: Cria um commit.\r\n---\r\n\r\nCorpo.\r\n', 'commit')
    expect(lido.ok).toBe(true)
    if (lido.ok) expect(lido.corpo).toBe('Corpo.')
  })

  it('recusa arquivo que não começa com frontmatter, com motivo legível', () => {
    const lido = interpretarFrontmatter('# Só um texto\n', 'commit')
    expect(lido.ok).toBe(false)
    if (!lido.ok) expect(lido.motivo).toMatch(/não começa com o frontmatter/)
  })

  it('recusa frontmatter não fechado', () => {
    const lido = interpretarFrontmatter('---\nname: commit\ndescription: x\n', 'commit')
    expect(lido.ok).toBe(false)
    if (!lido.ok) expect(lido.motivo).toMatch(/não foi fechado/)
  })

  it('recusa ausência de name e de description, cada uma com seu motivo', () => {
    const semName = interpretarFrontmatter('---\ndescription: x\n---\n\nCorpo.\n', 'commit')
    expect(semName.ok).toBe(false)
    if (!semName.ok) expect(semName.motivo).toMatch(/não tem "name"/)

    const semDesc = interpretarFrontmatter('---\nname: commit\n---\n\nCorpo.\n', 'commit')
    expect(semDesc.ok).toBe(false)
    if (!semDesc.ok) expect(semDesc.motivo).toMatch(/não tem "description"/)
  })

  it('exige que o name do frontmatter confira com o nome da pasta', () => {
    const lido = interpretarFrontmatter('---\nname: outro\ndescription: x\n---\n\nCorpo.\n', 'commit')
    expect(lido.ok).toBe(false)
    if (!lido.ok) {
      expect(lido.motivo).toMatch(/não confere com o nome da pasta/)
      expect(lido.motivo).toContain('outro')
      expect(lido.motivo).toContain('commit')
    }
  })

  it('ignora comentário e linha sem dois-pontos dentro do frontmatter', () => {
    const lido = interpretarFrontmatter('---\n# comentário\nname: commit\nlinha solta\ndescription: x\n---\n\nCorpo.\n', 'commit')
    expect(lido.ok).toBe(true)
  })

  it('tira aspas do valor e mantém a primeira ocorrência de cada chave', () => {
    const lido = interpretarFrontmatter('---\nname: "commit"\ndescription: \'Cria um commit.\'\ndescription: segunda\n---\n\nCorpo.\n', 'commit')
    expect(lido.ok).toBe(true)
    if (lido.ok) expect(lido.descricao).toBe('Cria um commit.')
  })

  it('devolve corpo vazio quando só há frontmatter, sem quebrar', () => {
    const lido = interpretarFrontmatter('---\nname: commit\ndescription: x\n---\n', 'commit')
    expect(lido.ok).toBe(true)
    if (lido.ok) expect(lido.corpo).toBe('')
  })
})

describe('montarArquivoSkill — a escrita é o inverso exato da leitura', () => {
  it('o que é gravado volta a ser lido como válido', () => {
    const texto = montarArquivoSkill('commit', 'Cria um commit.', 'Siga o estilo do repo.')
    const lido = interpretarFrontmatter(texto, 'commit')
    expect(lido).toEqual({ ok: true, nome: 'commit', descricao: 'Cria um commit.', corpo: 'Siga o estilo do repo.' })
  })

  it('corpo vazio produz arquivo sem linhas sobrando', () => {
    expect(montarArquivoSkill('x', 'd', '')).toBe('---\nname: x\ndescription: d\n---\n\n')
  })
})

describe('validarNome — o nome vira o /comando (RF14-2)', () => {
  it.each(['commit', 'fix-ci', 'a1', 'criar-pr', 'x'])('aceita "%s"', (nome) => {
    expect(validarNome(nome)).toBeNull()
  })

  it.each(['', 'Fix', 'FIX', '-abc', 'abc-', 'a b', 'a/b', 'a\\b', '..', 'a.b', 'ação', 'a_b'])(
    'recusa "%s"',
    (nome) => {
      expect(validarNome(nome)).toBeTruthy()
    },
  )

  it('recusa nome vazio com motivo próprio, não com o da regex', () => {
    expect(validarNome('')).toMatch(/não pode ser vazio/)
  })

  it('recusa nome acima do limite informando o tamanho', () => {
    const longo = 'a'.repeat(65)
    expect(validarNome(longo)).toMatch(/limite é 64/)
  })

  it('aceita nome exatamente no limite', () => {
    expect(validarNome('a'.repeat(64))).toBeNull()
  })
})

describe('descobrirSkills — as duas raízes (RF14-5)', () => {
  it('raiz inexistente devolve lista vazia, não exceção', async () => {
    const skills = await descobrirSkills(join(raizProjeto, 'nao-existe'), ESTADO_PADRAO, join(raizUsuario, 'nao-existe'))
    expect(skills).toEqual([])
  })

  it('descobre skills das duas raízes, projeto antes de usuário', async () => {
    await semearSkill(raizUsuario, 'commit')
    await semearSkill(join(raizProjeto, '.agente', 'skills'), 'revisar', 'Revisa o diff.')
    const skills = await descobrirSkills(raizProjeto, ESTADO_PADRAO, raizUsuario)
    expect(skills.map((s) => `${s.origem}:${s.nome}`)).toEqual(['projeto:revisar', 'usuario:commit'])
    expect(skills.every((s) => s.estado === 'ok' && s.ligada)).toBe(true)
  })

  it('raiz de projeto nula lista só as do usuário', async () => {
    await semearSkill(raizUsuario, 'commit')
    const skills = await descobrirSkills(null, ESTADO_PADRAO, raizUsuario)
    expect(skills.map((s) => s.origem)).toEqual(['usuario'])
  })

  it('mesmo nome nas duas raízes não colide: ids distintos', async () => {
    await semearSkill(raizUsuario, 'commit')
    await semearSkill(join(raizProjeto, '.agente', 'skills'), 'commit', 'Versão do projeto.')
    const skills = await descobrirSkills(raizProjeto, ESTADO_PADRAO, raizUsuario)
    expect(skills.map((s) => s.id)).toEqual([idDeSkill('projeto', 'commit'), idDeSkill('usuario', 'commit')])
  })

  it('RF14-3: frontmatter torto marca a skill COM ERRO e a lista continua de pé', async () => {
    await semearSkill(raizUsuario, 'boa')
    const pastaTorta = join(raizUsuario, 'torta')
    await mkdir(pastaTorta, { recursive: true })
    await writeFile(join(pastaTorta, 'SKILL.md'), 'isto não tem frontmatter nenhum\n', 'utf8')

    const skills = await descobrirSkills(null, ESTADO_PADRAO, raizUsuario)
    expect(skills).toHaveLength(2)
    const torta = skills.find((s) => s.nome === 'torta')
    expect(torta?.estado).toBe('com_erro')
    expect(torta?.motivoErro).toMatch(/não começa com o frontmatter/)
    expect(torta?.corpo).toBe('')
    expect(skills.find((s) => s.nome === 'boa')?.estado).toBe('ok')
  })

  it('RF14-1: skill desligada pelo estado vem com ligada=false', async () => {
    await semearSkill(raizUsuario, 'commit')
    await semearSkill(raizUsuario, 'revisar')
    const estado: EstadoPersonalizacoes = { skillsDesligadas: [idDeSkill('usuario', 'commit')], ferramentasDesligadas: [] }
    const skills = await descobrirSkills(null, estado, raizUsuario)
    expect(skills.find((s) => s.nome === 'commit')?.ligada).toBe(false)
    expect(skills.find((s) => s.nome === 'revisar')?.ligada).toBe(true)
  })

  it('pasta sem SKILL.md é ignorada em silêncio', async () => {
    await mkdir(join(raizUsuario, 'nao-e-skill'), { recursive: true })
    await writeFile(join(raizUsuario, 'nao-e-skill', 'README.md'), 'oi\n', 'utf8')
    expect(await descobrirSkills(null, ESTADO_PADRAO, raizUsuario)).toEqual([])
  })

  it('link simbólico como pasta de skill é recusado (lição K1)', async () => {
    const fora = await mkdtemp(join(tmpdir(), 'perso-fora-'))
    try {
      await semearSkill(fora, 'externa')
      await symlink(join(fora, 'externa'), join(raizUsuario, 'externa'), 'dir')
      expect(await descobrirSkills(null, ESTADO_PADRAO, raizUsuario)).toEqual([])
    } finally {
      await rm(fora, { recursive: true, force: true })
    }
  })

  it('SKILL.md acima do limite vira erro com motivo, não leitura até estourar', async () => {
    const pasta = join(raizUsuario, 'grande')
    await mkdir(pasta, { recursive: true })
    await writeFile(join(pasta, 'SKILL.md'), `${'---\nname: grande\ndescription: d\n---\n\n'}${'x'.repeat(300 * 1024)}`, 'utf8')
    const skills = await descobrirSkills(null, ESTADO_PADRAO, raizUsuario)
    expect(skills[0]?.estado).toBe('com_erro')
    expect(skills[0]?.motivoErro).toMatch(/limite é 262144/)
  })

  it('ordena por nome dentro de cada raiz', async () => {
    await semearSkill(raizUsuario, 'zulu')
    await semearSkill(raizUsuario, 'alfa')
    const skills = await descobrirSkills(null, ESTADO_PADRAO, raizUsuario)
    expect(skills.map((s) => s.nome)).toEqual(['alfa', 'zulu'])
  })
})

describe('skillsVisiveisAoAgente e resolverInvocacao — RF14-1 e RF14-2', () => {
  it('desligada e com erro ficam invisíveis ao agente', async () => {
    await semearSkill(raizUsuario, 'ligada')
    await semearSkill(raizUsuario, 'desligada')
    const torta = join(raizUsuario, 'torta')
    await mkdir(torta, { recursive: true })
    await writeFile(join(torta, 'SKILL.md'), 'sem frontmatter\n', 'utf8')

    const estado: EstadoPersonalizacoes = { skillsDesligadas: [idDeSkill('usuario', 'desligada')], ferramentasDesligadas: [] }
    const skills = await descobrirSkills(null, estado, raizUsuario)
    expect(skillsVisiveisAoAgente(skills).map((s) => s.nome)).toEqual(['ligada'])
  })

  it('resolve /nome e devolve o corpo que será injetado', async () => {
    await semearSkill(raizUsuario, 'commit', 'Cria um commit.', 'Siga o estilo do repositório.')
    const skills = await descobrirSkills(null, ESTADO_PADRAO, raizUsuario)
    const achada = resolverInvocacao(skills, 'commit')
    expect(achada?.corpo).toBe('Siga o estilo do repositório.')
  })

  it('PROJETO vence usuário quando os dois têm o mesmo nome', async () => {
    await semearSkill(raizUsuario, 'commit', 'Do usuário.', 'Corpo do usuário.')
    await semearSkill(join(raizProjeto, '.agente', 'skills'), 'commit', 'Do projeto.', 'Corpo do projeto.')
    const skills = await descobrirSkills(raizProjeto, ESTADO_PADRAO, raizUsuario)
    expect(resolverInvocacao(skills, 'commit')?.origem).toBe('projeto')
  })

  it.each([['nome inexistente'], [''], ['   ']])('devolve null para %s, sem lançar', async (nome) => {
    await semearSkill(raizUsuario, 'commit')
    const skills = await descobrirSkills(null, ESTADO_PADRAO, raizUsuario)
    expect(resolverInvocacao(skills, nome)).toBeNull()
  })

  it('skill desligada NÃO é injetável mesmo existindo no disco', async () => {
    await semearSkill(raizUsuario, 'commit')
    const estado: EstadoPersonalizacoes = { skillsDesligadas: [idDeSkill('usuario', 'commit')], ferramentasDesligadas: [] }
    const skills = await descobrirSkills(null, estado, raizUsuario)
    expect(resolverInvocacao(skills, 'commit')).toBeNull()
  })

  it('skill com erro NÃO é injetável', async () => {
    const torta = join(raizUsuario, 'torta')
    await mkdir(torta, { recursive: true })
    await writeFile(join(torta, 'SKILL.md'), 'sem frontmatter\n', 'utf8')
    const skills = await descobrirSkills(null, ESTADO_PADRAO, raizUsuario)
    expect(resolverInvocacao(skills, 'torta')).toBeNull()
  })
})

describe('criarSkill — entregável c', () => {
  it('cria a pasta e o SKILL.md, e a skill volta descoberta como íntegra', async () => {
    const resultado = await criarSkill({ nome: 'commit', descricao: 'Cria um commit.', corpo: 'Siga o estilo.', origem: 'usuario' }, null, raizUsuario)
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(resultado.skill.id).toBe('usuario:commit')
    expect(resultado.skill.estado).toBe('ok')
    expect(resultado.skill.ligada).toBe(true)

    const gravado = await readFile(join(raizUsuario, 'commit', 'SKILL.md'), 'utf8')
    expect(gravado).toContain('name: commit')
    expect(gravado).toContain('description: Cria um commit.')
    expect(gravado).toContain('Siga o estilo.')

    const descobertas = await descobrirSkills(null, ESTADO_PADRAO, raizUsuario)
    expect(descobertas.map((s) => s.nome)).toEqual(['commit'])
    expect(descobertas[0]?.estado).toBe('ok')
  })

  it('cria no escopo do projeto quando há raiz resolvida', async () => {
    const resultado = await criarSkill({ nome: 'revisar', descricao: 'Revisa.', corpo: 'Olhe o diff.', origem: 'projeto' }, raizProjeto, raizUsuario)
    expect(resultado.ok).toBe(true)
    const gravado = await readFile(join(raizProjeto, '.agente', 'skills', 'revisar', 'SKILL.md'), 'utf8')
    expect(gravado).toContain('name: revisar')
  })

  it('escopo de projeto sem raiz resolvida recusa com motivo honesto, sem deduzir pasta', async () => {
    const resultado = await criarSkill({ nome: 'revisar', descricao: 'Revisa.', corpo: 'x', origem: 'projeto' }, null, raizUsuario)
    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.motivo).toMatch(/Não há pasta de trabalho resolvida/)
  })

  it.each([
    [{ nome: 'Fix', descricao: 'd', corpo: 'c' }, /não é válido/],
    [{ nome: '', descricao: 'd', corpo: 'c' }, /não pode ser vazio/],
    [{ nome: 'ok', descricao: '', corpo: 'c' }, /descrição não pode ser vazia/],
    [{ nome: 'ok', descricao: 'duas\nlinhas', corpo: 'c' }, /uma linha só/],
    [{ nome: 'ok', descricao: 'd', corpo: '   ' }, /corpo da skill não pode ser vazio/],
    [{ nome: 42, descricao: 'd', corpo: 'c' }, /não pode ser vazio/],
  ])('recusa pedido inválido %o com motivo legível', async (pedido, esperado) => {
    const resultado = await criarSkill({ ...pedido, origem: 'usuario' }, null, raizUsuario)
    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.motivo).toMatch(esperado as RegExp)
  })

  it('NUNCA sobrescreve: skill existente é recusada e o conteúdo antigo permanece', async () => {
    await semearSkill(raizUsuario, 'commit', 'Descrição antiga.', 'Corpo antigo.')
    const resultado = await criarSkill({ nome: 'commit', descricao: 'Nova.', corpo: 'Novo corpo.', origem: 'usuario' }, null, raizUsuario)
    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.motivo).toMatch(/Já existe uma skill chamada "commit"/)
    const ainda = await readFile(join(raizUsuario, 'commit', 'SKILL.md'), 'utf8')
    expect(ainda).toContain('Corpo antigo.')
    expect(ainda).not.toContain('Novo corpo.')
  })

  it('nome com barras ou pontos é recusado antes de qualquer escrita', async () => {
    for (const nome of ['../fora', 'a/b', '..', 'a.b']) {
      const resultado = await criarSkill({ nome, descricao: 'd', corpo: 'c', origem: 'usuario' }, null, raizUsuario)
      expect(resultado.ok, nome).toBe(false)
    }
    expect(await descobrirSkills(null, ESTADO_PADRAO, raizUsuario)).toEqual([])
  })

  it('corpo gigante é recusado informando o limite', async () => {
    const resultado = await criarSkill({ nome: 'grande', descricao: 'd', corpo: 'x'.repeat(300 * 1024), origem: 'usuario' }, null, raizUsuario)
    expect(resultado.ok).toBe(false)
    if (!resultado.ok) expect(resultado.motivo).toMatch(/reduza o corpo/)
  })
})
