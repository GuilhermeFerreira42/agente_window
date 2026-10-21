// ============================================================================
// Casa Agir — catálogo das ferramentas do MVP (D72) + executores FALSOS (C1).
// A C1 prova o esqueleto SEM tocar disco: os executores falsos devolvem
// resumos marcados com "SIMULADO C1" para nenhum teste passar por engano.
// A C2 troca os falsos por arquivos de verdade (fsHost, escrita atômica).
// ============================================================================
import type {
  ArgumentosFerramenta,
  ExecutorFerramenta,
  FerramentaId,
  ResultadoFerramenta,
} from '../contract'

export interface DescritorFerramenta {
  id: FerramentaId
  /** Nome de gente para a tela/cartão (C3). */
  titulo: string
  /** Uma frase honesta do que a ferramenta faz (anunciada ao modelo na C2). */
  descricao: string
  /** Argumentos sem os quais a ferramenta NÃO executa (recusa honesta). */
  obrigatorios: Array<keyof ArgumentosFerramenta>
}

/** As 5 mãos do MVP — todas de ARQUIVO, dentro da pasta de trabalho. */
export const catalogoFerramentas: DescritorFerramenta[] = [
  {
    id: 'ler',
    titulo: 'Ler arquivo',
    descricao: 'Lê o conteúdo de um arquivo da pasta de trabalho.',
    obrigatorios: ['caminho'],
  },
  {
    id: 'listar',
    titulo: 'Listar pasta',
    descricao: 'Lista o que existe dentro de uma pasta da pasta de trabalho.',
    obrigatorios: ['caminho'],
  },
  {
    id: 'buscar',
    titulo: 'Buscar arquivos',
    descricao: 'Busca arquivos pelo nome/padrão dentro da pasta de trabalho.',
    obrigatorios: ['padrao'],
  },
  {
    id: 'criar',
    titulo: 'Criar arquivo',
    descricao: 'Cria um arquivo novo com o conteúdo dado (escrita atômica).',
    obrigatorios: ['caminho', 'conteudo'],
  },
  {
    id: 'escrever',
    titulo: 'Escrever arquivo',
    descricao: 'Sobrescreve um arquivo existente com o conteúdo dado (escrita atômica).',
    obrigatorios: ['caminho', 'conteudo'],
  },
]

const idsConhecidos = new Set<string>(catalogoFerramentas.map((f) => f.id))

/** Guarda de tipo: o nome que veio do modelo é uma das 5 ferramentas? */
export function ehFerramentaConhecida(nome: unknown): nome is FerramentaId {
  return typeof nome === 'string' && idsConhecidos.has(nome)
}

/**
 * Q1=(a) (D93): LER/LISTAR/BUSCAR são de graça; CRIAR/ESCREVER são MEXIDA —
 * sempre passam pelo cartão [Permitir] [Negar] [Permitir na Sessão].
 */
export function ehMexida(ferramenta: FerramentaId): boolean {
  return ferramenta === 'criar' || ferramenta === 'escrever'
}

/** Lista curta dos argumentos que vieram, para resumos honestos. */
function descreverArgumentos(argumentos: ArgumentosFerramenta): string {
  const pedacos: string[] = []
  if (typeof argumentos.caminho === 'string') pedacos.push(`"${argumentos.caminho}"`)
  if (typeof argumentos.padrao === 'string') pedacos.push(`padrão "${argumentos.padrao}"`)
  if (typeof argumentos.conteudo === 'string') {
    pedacos.push(`${argumentos.conteudo.length} caracteres de conteúdo`)
  }
  return pedacos.length > 0 ? pedacos.join(', ') : 'sem argumentos'
}

/**
 * C1 — executores FALSOS: devolvem sempre ok, nunca tocam disco e dizem
 * em voz alta que são simulados. Faltando argumento obrigatório → ok:false
 * (a recusa honesta já nasce aqui, mesmo em simulado).
 */
export function criarExecutoresFalsos(): Record<FerramentaId, ExecutorFerramenta> {
  const falso = (ferramenta: FerramentaId): ExecutorFerramenta => {
    const descritor = catalogoFerramentas.find((f) => f.id === ferramenta)
    return async (pedido) => {
      const obrigatorios = descritor?.obrigatorios ?? []
      const ausentes = obrigatorios.filter((campo) => {
        const valor: unknown = pedido.argumentos[campo]
        return typeof valor !== 'string' || valor.length === 0
      })
      if (ausentes.length > 0) {
        return {
          ok: false,
          resumo: `A ferramenta "${ferramenta}" não executou: faltou ${ausentes.join(' e ')} (${descreverArgumentos(pedido.argumentos)}). Não foi a permissão do dono — o pedido veio incompleto. Tente de novo mandando ${ausentes.join(' e ')}.`,
        }
      }
      if (ferramenta === 'ler') {
        return {
          ok: true,
          resumo: `(SIMULADO C1) leitura de "${String(pedido.argumentos.caminho)}": conteúdo de exemplo com 3 linhas.`,
          conteudo: 'linha 1\nlinha 2\nlinha 3',
        }
      }
      if (ferramenta === 'listar') {
        return {
          ok: true,
          resumo: `(SIMULADO C1) listagem de "${String(pedido.argumentos.caminho)}": 4 itens (a.txt, b/, c.md, d.ts).`,
          conteudo: 'a.txt\nb/\nc.md\nd.ts',
        }
      }
      if (ferramenta === 'buscar') {
        return {
          ok: true,
          resumo: `(SIMULADO C1) busca por "${String(pedido.argumentos.padrao)}": 2 arquivos encontrados.`,
          conteudo: 'a.txt\nc.md',
        }
      }
      const verbo = ferramenta === 'criar' ? 'criado' : 'gravado'
      return {
        ok: true,
        resumo: `(SIMULADO C1) arquivo "${String(pedido.argumentos.caminho)}" ${verbo} — NADA foi escrito no disco (prova do esqueleto).`,
      }
    }
  }
  return {
    ler: falso('ler'),
    listar: falso('listar'),
    buscar: falso('buscar'),
    criar: falso('criar'),
    escrever: falso('escrever'),
  }
}
