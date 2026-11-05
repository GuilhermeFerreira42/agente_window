// ============================================================================
// Casa Personalizações — contrato da FATIA 14 (SPEC 2H, `06` PARTE 2H).
//
// v1 = Visão geral + Habilidades + Ferramentas. Sem segredos: só nome,
// descrição, corpo de instrução e liga/desliga (RF14-5, Q14-4).
//
// Duas raízes de armazenamento (RF14-5):
//   usuário → ~/.agente_window/skills/<nome>/SKILL.md
//   projeto → <pasta de trabalho>/.agente/skills/<nome>/SKILL.md
//
// A instrução injetada no modelo é o `corpo` — o conteúdo do SKILL.md depois do
// frontmatter. Ela viaja pelo campo separado `instrucoes` do contrato Agir, e
// NUNCA como `papel:'usuario'` (D141 / E-1).
// ============================================================================

/** De onde a skill veio (RF14-5: usuário + projeto). */
export type OrigemSkill = 'usuario' | 'projeto'

/** RF14-3: frontmatter torto MARCA a skill; nunca derruba a lista. */
export type EstadoSkill = 'ok' | 'com_erro'

/** Nome do arquivo que define a skill (Q14-2: formato SKILL.md-compatível). */
export const ARQUIVO_SKILL = 'SKILL.md'

/** Raízes relativas — usuário a partir do home, projeto a partir da pasta ativa. */
export const CAMINHO_SKILLS_USUARIO = '.agente_window/skills'
export const CAMINHO_SKILLS_PROJETO = '.agente/skills'

/**
 * O nome vira o `/comando` (RF14-2). Minúsculas, dígitos e hífen, sem hífen nas
 * pontas — e, por construção, sem `/`, `\` ou `.`, o que torna impossível um
 * nome atravessar a raiz de armazenamento.
 */
export const PADRAO_NOME_SKILL = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/
export const TAMANHO_MAXIMO_NOME_SKILL = 64

/** Limite de descrição — o suficiente para o anúncio, curto o bastante para a lista. */
export const TAMANHO_MAXIMO_DESCRICAO_SKILL = 1024

/** Um SKILL.md maior que isto é recusado como erro, não lido até estourar a memória. */
export const LIMITE_ARQUIVO_SKILL_BYTES = 256 * 1024

/** Uma skill descoberta no disco. */
export interface Skill {
  /** Estável e sem colisão entre as duas raízes: `<origem>:<nome>`. */
  id: string
  /** Nome de invocação (`/nome`). Vem da pasta; o frontmatter precisa conferir. */
  nome: string
  descricao: string
  origem: OrigemSkill
  /** Pasta que contém o SKILL.md. */
  pasta: string
  /** Caminho completo do SKILL.md. */
  arquivo: string
  estado: EstadoSkill
  /** Motivo legível quando `estado = 'com_erro'` (RF14-3). Nunca vazio nesse caso. */
  motivoErro?: string
  /** Conteúdo após o frontmatter — é a instrução injetada. Vazio quando `com_erro`. */
  corpo: string
  /** Ligada = visível ao agente (RF14-1). Desligada: não é anunciada nem injetável. */
  ligada: boolean
}

/** Grupos para o liga/desliga por grupo de ferramentas (entregável d da SPEC 2H). */
export type GrupoFerramenta = 'leitura' | 'escrita' | 'destrutiva' | 'execucao'

export const ROTULO_GRUPO_FERRAMENTA: Record<GrupoFerramenta, string> = {
  leitura: 'Leitura',
  escrita: 'Escrita',
  destrutiva: 'Destrutiva',
  execucao: 'Execução',
}

/**
 * O estado persistido da casa — um arquivo só, sem segredo. Ausente de uma das
 * listas = LIGADO, que é o padrão das duas (RF14-1 e RF14-4).
 */
export interface EstadoPersonalizacoes {
  /** Ids (`<origem>:<nome>`) de skill desligadas pelo dono. */
  skillsDesligadas: readonly string[]
  /** Ids de ferramenta desligadas pelo dono. */
  ferramentasDesligadas: readonly string[]
}

export const ESTADO_PADRAO: EstadoPersonalizacoes = { skillsDesligadas: [], ferramentasDesligadas: [] }

/** O que a tela manda ao salvar o liga/desliga. Parcial de propósito. */
export interface EstadoParcial {
  skillsDesligadas?: unknown
  ferramentasDesligadas?: unknown
}

/** O que a tela manda ao criar uma skill (entregável c). Tudo `unknown`: valida o servidor. */
export interface PedidoCriarSkill {
  nome?: unknown
  descricao?: unknown
  corpo?: unknown
  origem?: unknown
  /** Necessários só para `origem = 'projeto'`, porque a raiz vem da sessão persistida. */
  sessionId?: unknown
  chatId?: unknown
}

/** A resposta do `GET /api/personalizacoes` — tudo que a visão central precisa. */
export interface VisaoPersonalizacoes {
  skills: Skill[]
  /** Ferramentas reais com o grupo e o estado efetivo (entregável d). */
  ferramentas: FerramentaVisivel[]
  estado: EstadoPersonalizacoes
  /**
   * A raiz de projeto usada, ou null quando não foi possível resolvê-la a partir
   * da sessão persistida. Reportado em vez de deduzido: a casa nunca confia num
   * caminho que o browser afirme (F1/D113).
   */
  raizProjeto: string | null
}

/** Uma ferramenta real projetada para a tela. */
export interface FerramentaVisivel {
  id: string
  titulo: string
  descricao: string
  grupo: GrupoFerramenta
  ligada: boolean
}
