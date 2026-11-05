// ============================================================================
// Casa Personalizações — DESCOBERTA E CRIAÇÃO DE SKILLS (FATIA 14, RF14-2/3/5).
//
// Regras que este arquivo garante:
//   · Uma skill é uma PASTA com um SKILL.md dentro (Q14-2).
//   · Frontmatter torto MARCA a skill como 'com_erro' com motivo legível e a
//     lista continua de pé (RF14-3 / RNF14-2): nada aqui lança por conteúdo.
//   · O nome de invocação é o da PASTA; o `name` do frontmatter precisa
//     conferir, senão é erro — dois nomes para o mesmo /comando é ambiguidade.
//   · Pasta de projeto e de usuário podem ter o mesmo nome: os ids não colidem
//     (`<origem>:<nome>`) e a invocação resolve PROJETO primeiro.
//   · Erro de I/O na raiz (não existe, sem permissão) = lista vazia, nunca exceção.
//
// Segurança: só descendentes DIRETOS da raiz são lidos, link simbólico é
// recusado (a lição K1 da casa Agir), e o tamanho do arquivo é limitado antes
// da leitura. O nome é validado por regex que exclui `/`, `\` e `.`, e ainda
// assim o destino é conferido contra a raiz antes de gravar.
// ============================================================================
import type { Dirent, Stats } from 'node:fs'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import {
  ARQUIVO_SKILL,
  CAMINHO_SKILLS_PROJETO,
  CAMINHO_SKILLS_USUARIO,
  LIMITE_ARQUIVO_SKILL_BYTES,
  PADRAO_NOME_SKILL,
  TAMANHO_MAXIMO_DESCRICAO_SKILL,
  TAMANHO_MAXIMO_NOME_SKILL,
  type EstadoPersonalizacoes,
  type EstadoSkill,
  type OrigemSkill,
  type Skill,
} from '../contract'

/** Raiz das skills do usuário (RF14-5). */
export function raizSkillsUsuario(): string {
  return join(homedir(), ...CAMINHO_SKILLS_USUARIO.split('/'))
}

/** Raiz das skills do projeto (RF14-5), a partir da pasta de trabalho efetiva. */
export function raizSkillsProjeto(raiz: string): string {
  return join(raiz, ...CAMINHO_SKILLS_PROJETO.split('/'))
}

/** Identificador estável: não colide entre as duas raízes. */
export function idDeSkill(origem: OrigemSkill, nome: string): string {
  return `${origem}:${nome}`
}

export type ResultadoFrontmatter =
  | { ok: true; nome: string; descricao: string; corpo: string }
  | { ok: false; motivo: string }

/**
 * Interpreta o frontmatter `---` de um SKILL.md. Puro e determinístico: recebe
 * o texto, devolve o resultado ou o motivo legível. Tolera BOM e fim de linha
 * do Windows; não usa YAML (nenhuma dependência nova para dois campos).
 */
export function interpretarFrontmatter(texto: string, nomeDaPasta: string): ResultadoFrontmatter {
  const semBom = texto.replace(/^\uFEFF/, '')
  const linhas = semBom.split(/\r?\n/)
  if (linhas[0]?.trim() !== '---') {
    return { ok: false, motivo: `O ${ARQUIVO_SKILL} não começa com o frontmatter "---".` }
  }
  let fim = -1
  for (let i = 1; i < linhas.length; i += 1) {
    if (linhas[i]?.trim() === '---') { fim = i; break }
  }
  if (fim < 0) return { ok: false, motivo: 'O frontmatter não foi fechado com "---".' }

  const campos = new Map<string, string>()
  for (const linha of linhas.slice(1, fim)) {
    if (!linha.trim() || linha.trimStart().startsWith('#')) continue
    const doisPontos = linha.indexOf(':')
    if (doisPontos < 0) continue
    const chave = linha.slice(0, doisPontos).trim().toLowerCase()
    const valor = linha.slice(doisPontos + 1).trim().replace(/^["']|["']$/g, '')
    if (chave && !campos.has(chave)) campos.set(chave, valor)
  }

  const nome = campos.get('name') ?? ''
  if (!nome) return { ok: false, motivo: 'O frontmatter não tem "name".' }
  const descricao = campos.get('description') ?? ''
  if (!descricao) return { ok: false, motivo: 'O frontmatter não tem "description".' }
  if (nome !== nomeDaPasta) {
    return { ok: false, motivo: `O "name" do frontmatter ("${nome}") não confere com o nome da pasta ("${nomeDaPasta}").` }
  }
  const problema = validarNome(nome)
  if (problema) return { ok: false, motivo: problema }
  if (descricao.length > TAMANHO_MAXIMO_DESCRICAO_SKILL) {
    return { ok: false, motivo: `A "description" tem ${descricao.length} caracteres; o limite é ${TAMANHO_MAXIMO_DESCRICAO_SKILL}.` }
  }

  const corpo = linhas.slice(fim + 1).join('\n').replace(/^\n+/, '').trimEnd()
  return { ok: true, nome, descricao, corpo }
}

/** Motivo legível quando o nome não serve, ou null quando serve. */
export function validarNome(nome: string): string | null {
  if (!nome) return 'O nome da skill não pode ser vazio.'
  if (nome.length > TAMANHO_MAXIMO_NOME_SKILL) {
    return `O nome tem ${nome.length} caracteres; o limite é ${TAMANHO_MAXIMO_NOME_SKILL}.`
  }
  if (!PADRAO_NOME_SKILL.test(nome)) {
    return `O nome "${nome}" não é válido: use letras minúsculas, dígitos e hífen, sem hífen nas pontas.`
  }
  return null
}

function skillComErro(pasta: string, arquivo: string, origem: OrigemSkill, nome: string, motivo: string, ligada: boolean): Skill {
  return {
    id: idDeSkill(origem, nome),
    nome,
    descricao: '',
    origem,
    pasta,
    arquivo,
    estado: 'com_erro' as EstadoSkill,
    motivoErro: motivo,
    corpo: '',
    ligada,
  }
}

/** Lê uma raiz inteira. Falha de I/O na raiz = nenhuma skill, nunca exceção. */
async function descobrirNaRaiz(
  raiz: string,
  origem: OrigemSkill,
  desligadas: ReadonlySet<string>,
): Promise<Skill[]> {
  let entradas: Dirent[]
  try {
    entradas = await readdir(raiz, { withFileTypes: true })
  } catch {
    return [] // raiz inexistente ou sem permissão: o dono simplesmente não tem skills aqui
  }
  const achadas: Skill[] = []
  for (const entrada of entradas) {
    // Link simbólico é recusado: poderia apontar para fora da raiz (lição K1).
    if (!entrada.isDirectory() || entrada.isSymbolicLink()) continue
    const nome = entrada.name
    const pasta = join(raiz, nome)
    const arquivo = join(pasta, ARQUIVO_SKILL)
    const ligada = !desligadas.has(idDeSkill(origem, nome))

    let info: Stats
    try {
      info = await stat(arquivo)
    } catch {
      continue // pasta sem SKILL.md não é uma skill — ignorada em silêncio
    }
    if (!info.isFile()) {
      achadas.push(skillComErro(pasta, arquivo, origem, nome, `${ARQUIVO_SKILL} não é um arquivo comum.`, ligada))
      continue
    }
    if (info.size > LIMITE_ARQUIVO_SKILL_BYTES) {
      achadas.push(skillComErro(pasta, arquivo, origem, nome, `O ${ARQUIVO_SKILL} tem ${info.size} bytes; o limite é ${LIMITE_ARQUIVO_SKILL_BYTES}.`, ligada))
      continue
    }

    let texto: string
    try {
      texto = await readFile(arquivo, 'utf8')
    } catch (erro) {
      achadas.push(skillComErro(pasta, arquivo, origem, nome, `Não foi possível ler o ${ARQUIVO_SKILL}: ${(erro as Error).message}`, ligada))
      continue
    }

    const lido = interpretarFrontmatter(texto, nome)
    if (!lido.ok) {
      achadas.push(skillComErro(pasta, arquivo, origem, nome, lido.motivo, ligada))
      continue
    }
    achadas.push({
      id: idDeSkill(origem, nome),
      nome: lido.nome,
      descricao: lido.descricao,
      origem,
      pasta,
      arquivo,
      estado: 'ok',
      corpo: lido.corpo,
      ligada,
    })
  }
  return achadas
}

/**
 * Descobre as skills das duas raízes (RF14-5) e aplica o liga/desliga do estado
 * (RF14-1). `raizProjeto` nulo = só as do usuário (a pasta de trabalho não pôde
 * ser resolvida a partir da sessão persistida).
 *
 * Ordem devolvida: projeto antes de usuário, cada uma por nome — é a mesma
 * ordem em que `resolverInvocacao` procura, então a lista mostra o que vence.
 */
export async function descobrirSkills(
  raizProjeto: string | null,
  estado: EstadoPersonalizacoes,
  raizUsuario: string = raizSkillsUsuario(),
): Promise<Skill[]> {
  const desligadas = new Set(estado.skillsDesligadas)
  const doProjeto = raizProjeto ? await descobrirNaRaiz(raizSkillsProjeto(raizProjeto), 'projeto', desligadas) : []
  const doUsuario = await descobrirNaRaiz(raizUsuario, 'usuario', desligadas)
  const porNome = (a: Skill, b: Skill) => a.nome.localeCompare(b.nome)
  return [...doProjeto.sort(porNome), ...doUsuario.sort(porNome)]
}

/** Só o que o agente pode ver: íntegra E ligada (RF14-1). */
export function skillsVisiveisAoAgente(skills: readonly Skill[]): Skill[] {
  return skills.filter((skill) => skill.estado === 'ok' && skill.ligada)
}

/**
 * Resolve `/nome` (RF14-2). Devolve null quando não há skill íntegra e ligada
 * com esse nome — o chat segue normal, sem instrução injetada (RNF14-2).
 * Projeto vence usuário quando os dois existem.
 */
export function resolverInvocacao(skills: readonly Skill[], nome: string): Skill | null {
  const alvo = nome.trim()
  if (!alvo) return null
  const injetaveis = skillsVisiveisAoAgente(skills)
  return injetaveis.find((skill) => skill.origem === 'projeto' && skill.nome === alvo)
    ?? injetaveis.find((skill) => skill.nome === alvo)
    ?? null
}

/** Monta o texto do SKILL.md a partir das partes — é o inverso exato da leitura. */
export function montarArquivoSkill(nome: string, descricao: string, corpo: string): string {
  const texto = corpo.trim()
  return `---\nname: ${nome}\ndescription: ${descricao.trim()}\n---\n\n${texto ? `${texto}\n` : ''}`
}

export type ResultadoCriarSkill = { ok: true; skill: Skill } | { ok: false; motivo: string }

/**
 * Cria uma skill (entregável c). Falha de forma honesta e legível; nunca
 * sobrescreve: a pasta é criada com exclusividade e o arquivo com flag `wx`.
 */
export async function criarSkill(
  pedido: { nome?: unknown; descricao?: unknown; corpo?: unknown; origem?: unknown },
  raizProjeto: string | null,
  raizUsuario: string = raizSkillsUsuario(),
): Promise<ResultadoCriarSkill> {
  const nome = typeof pedido.nome === 'string' ? pedido.nome.trim() : ''
  const problemaNome = validarNome(nome)
  if (problemaNome) return { ok: false, motivo: problemaNome }

  const descricao = typeof pedido.descricao === 'string' ? pedido.descricao.trim() : ''
  if (!descricao) return { ok: false, motivo: 'A descrição não pode ser vazia: é o que aparece na lista e no anúncio ao modelo.' }
  if (descricao.length > TAMANHO_MAXIMO_DESCRICAO_SKILL) {
    return { ok: false, motivo: `A descrição tem ${descricao.length} caracteres; o limite é ${TAMANHO_MAXIMO_DESCRICAO_SKILL}.` }
  }
  if (descricao.includes('\n')) return { ok: false, motivo: 'A descrição precisa caber em uma linha só.' }

  const corpo = typeof pedido.corpo === 'string' ? pedido.corpo : ''
  if (!corpo.trim()) return { ok: false, motivo: 'O corpo da skill não pode ser vazio: é a instrução que o agente vai seguir.' }
  const arquivoTexto = montarArquivoSkill(nome, descricao, corpo)
  if (Buffer.byteLength(arquivoTexto, 'utf8') > LIMITE_ARQUIVO_SKILL_BYTES) {
    return { ok: false, motivo: `A skill ficaria com mais de ${LIMITE_ARQUIVO_SKILL_BYTES} bytes; reduza o corpo.` }
  }

  const origem: OrigemSkill = pedido.origem === 'projeto' ? 'projeto' : 'usuario'
  let raiz: string
  if (origem === 'projeto') {
    // A raiz de projeto só vem da sessão persistida; sem ela, recusa honesta —
    // nunca deduzir uma pasta (F1/D113).
    if (!raizProjeto) {
      return { ok: false, motivo: 'Não há pasta de trabalho resolvida nesta sessão; crie a skill no escopo do usuário ou escolha a pasta primeiro.' }
    }
    raiz = raizSkillsProjeto(raizProjeto)
  } else {
    raiz = raizUsuario
  }

  // Cinturão e suspensório: o nome já exclui `/`, `\` e `.`, mas o destino é
  // conferido contra a raiz de qualquer forma.
  const pasta = resolve(raiz, nome)
  const raizResolvida = resolve(raiz)
  if (pasta !== raizResolvida && !pasta.startsWith(raizResolvida + sep)) {
    return { ok: false, motivo: 'O destino da skill está fora da raiz de armazenamento; nada foi gravado.' }
  }

  // A RAIZ é criada de forma recursiva (pode não existir ainda — é o caso normal
  // na primeira skill). A PASTA DA SKILL é criada com exclusividade, sem
  // `recursive`, para que duplicidade seja detectada como EEXIST em vez de
  // sobrescrever em silêncio.
  try {
    await mkdir(raiz, { recursive: true })
  } catch (erro) {
    return { ok: false, motivo: `Não foi possível criar a raiz de armazenamento das skills: ${(erro as Error).message}` }
  }
  try {
    await mkdir(pasta)
  } catch (erro) {
    const codigo = (erro as NodeJS.ErrnoException).code
    if (codigo === 'EEXIST') {
      return { ok: false, motivo: `Já existe uma skill chamada "${nome}" nesse escopo.` }
    }
    return { ok: false, motivo: `Não foi possível criar a pasta da skill: ${(erro as Error).message}` }
  }

  const caminho = join(pasta, ARQUIVO_SKILL)
  try {
    await writeFile(caminho, arquivoTexto, { encoding: 'utf8', flag: 'wx', mode: 0o644 })
  } catch (erro) {
    return { ok: false, motivo: `A pasta foi criada mas o ${ARQUIVO_SKILL} não foi gravado: ${(erro as Error).message}` }
  }

  return {
    ok: true,
    skill: {
      id: idDeSkill(origem, nome),
      nome,
      descricao,
      origem,
      pasta,
      arquivo: caminho,
      estado: 'ok',
      corpo: corpo.trim(),
      ligada: true,
    },
  }
}
