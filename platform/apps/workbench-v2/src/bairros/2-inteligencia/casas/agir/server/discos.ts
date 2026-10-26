// Casa Agir — operações de disco sob uma raiz POSIX fixada por descritor.
// Toda operação passa pelo helper N-API baseado em openat2; nenhum fallback
// path-based é permitido quando o helper/plataforma não oferece garantia.
import * as nodePath from 'node:path'
import type { ArgumentosFerramenta, ExecutorFerramenta, FerramentaId, ResultadoFerramenta } from '../contract'
import { catalogoFerramentas } from './ferramentas'
import { abrirRaizDiscoSegura, caminhoRelativoSeguro, type RaizDiscoSegura } from './fsSeguro'
import { verificarTerritorio } from './territorio'

export const LIMITE_BUSCA = 200
const PULADAS_NA_BUSCA = new Set(['node_modules', '.git', 'dist', 'build', 'coverage'])

function falha(motivo: string): ResultadoFerramenta {
  return { ok: false, resumo: motivo }
}

function falhaF2(): ResultadoFerramenta {
  return falha('Operação de disco bloqueada: a contenção segura F2 não está disponível nesta plataforma/instalação. Nenhum acesso path-based alternativo foi tentado.')
}

type Porta = { ok: true; relativo: string; caminho: string } | { ok: false; resumo: string }

function prepararPorta(raiz: string, caminho: unknown): Porta {
  const veredito = verificarTerritorio(raiz, caminho)
  if (!veredito.liberado) return { ok: false, resumo: veredito.motivo }
  return {
    ok: true,
    caminho: veredito.caminho,
    relativo: caminhoRelativoSeguro(raiz, veredito.caminho),
  }
}

/**
 * A prévia não lê o disco por paths. Como a operação de exclusão ainda está
 * bloqueada até a lixeira também ter contenção segura, não expõe conteúdo nem
 * induz uma aprovação que o backend não poderia honrar.
 */
export async function descreverAlvoExcluir(raiz: string, entrada: unknown): Promise<string> {
  if (typeof entrada !== 'string' || entrada.trim() === '') {
    return 'O caminho veio vazio — aprovar não apaga nada.'
  }
  const porta = prepararPorta(raiz, entrada.trim())
  if (!porta.ok) return 'Fora da pasta de trabalho — aprovar não apaga nada.'
  return 'A exclusão está bloqueada até a lixeira ser integrada ao mesmo limite seguro F2 — nenhum item foi lido ou removido.'
}

/**
 * Cria executores de disco presos a uma raiz aberta uma única vez. A validação
 * lexical continua sendo uma primeira barreira; a autoridade final é o helper
 * nativo que resolve cada componente relativamente ao descritor da raiz.
 */
export type ExecutoresDisco = Record<FerramentaId, ExecutorFerramenta> & { fechar: () => void }

export function criarExecutoresReais(raiz: string): ExecutoresDisco {
  const raizResolvida = nodePath.resolve(raiz)
  const fs: RaizDiscoSegura | null = abrirRaizDiscoSegura(raizResolvida)

  const faltando = (id: FerramentaId, argumentos: ArgumentosFerramenta): string | null => {
    const descritor = catalogoFerramentas.find((f) => f.id === id)
    const ausentes = (descritor?.obrigatorios ?? []).filter(
      (campo) => typeof argumentos[campo] !== 'string' || (argumentos[campo] as string).length === 0,
    )
    return ausentes.length > 0
      ? `A ferramenta "${id}" não executou: faltou ${ausentes.join(' e ')}. Não foi a sua permissão — o pedido da IA veio incompleto. Tente de novo mandando ${ausentes.join(' e ')}.`
      : null
  }

  const ler: ExecutorFerramenta = async (pedido) => {
    const motivo = faltando('ler', pedido.argumentos)
    if (motivo) return falha(motivo)
    const porta = prepararPorta(raizResolvida, pedido.argumentos.caminho)
    if (!porta.ok) return falha(porta.resumo)
    if (!fs) return falhaF2()
    try {
      const conteudo = fs.readFile(porta.relativo).toString('utf8')
      return {
        ok: true,
        resumo: `Lido "${String(pedido.argumentos.caminho)}" (${conteudo.length} caracteres).`,
        conteudo,
      }
    } catch {
      return falha(`Não deu para ler "${String(pedido.argumentos.caminho)}" (ausente, link, tipo de arquivo não permitido ou sem permissão).`)
    }
  }

  const listar: ExecutorFerramenta = async (pedido) => {
    const motivo = faltando('listar', pedido.argumentos)
    if (motivo) return falha(motivo)
    const entrada = String(pedido.argumentos.caminho ?? '')
    const porta = prepararPorta(raizResolvida, entrada === '' || entrada === '.' ? '.' : entrada)
    if (!porta.ok) return falha(porta.resumo)
    if (!fs) return falhaF2()
    try {
      const itens = fs.readDirectory(porta.relativo)
      const nomes = itens
        .map((item) => `${item.name}${item.kind === 'directory' ? '/' : item.kind === 'symlink' ? ' [link]' : ''}`)
        .sort((a, b) => a.localeCompare(b))
      return {
        ok: true,
        resumo: nomes.length === 0 ? `"${entrada}" está vazia.` : `"${entrada}": ${nomes.length} itens.`,
        conteudo: nomes.join('\n'),
      }
    } catch {
      return falha(`Não deu para listar "${entrada}" (ausente, link ou não é pasta).`)
    }
  }

  const buscar: ExecutorFerramenta = async (pedido) => {
    const motivo = faltando('buscar', pedido.argumentos)
    if (motivo) return falha(motivo)
    if (!fs) return falhaF2()
    const padrao = String(pedido.argumentos.padrao).toLowerCase()
    const entrada = typeof pedido.argumentos.caminho === 'string' && pedido.argumentos.caminho !== ''
      ? pedido.argumentos.caminho
      : '.'
    const porta = prepararPorta(raizResolvida, entrada)
    if (!porta.ok) return falha(porta.resumo)
    const achados: string[] = []
    let varridos = 0
    const varrer = (diretorio: string, relativo: string): void => {
      if (achados.length >= LIMITE_BUSCA) return
      const itens = fs.readDirectory(diretorio)
      for (const item of itens) {
        if (achados.length >= LIMITE_BUSCA) return
        const caminhoFilho = relativo === '.' ? item.name : `${relativo}/${item.name}`
        const caminhoSeguro = diretorio === '.' ? item.name : `${diretorio}/${item.name}`
        if (item.kind === 'directory') {
          if (PULADAS_NA_BUSCA.has(item.name)) continue
          varrer(caminhoSeguro, caminhoFilho)
          continue
        }
        if (item.kind !== 'file') continue
        varridos += 1
        if (item.name.toLowerCase().includes(padrao)) achados.push(caminhoFilho)
      }
    }
    try {
      varrer(porta.relativo, '.')
    } catch {
      return falha(`Não deu para varrer a pasta de trabalho procurando "${String(pedido.argumentos.padrao)}" com o limite seguro F2.`)
    }
    if (achados.length === 0) {
      return { ok: true, resumo: `Nenhum arquivo com "${String(pedido.argumentos.padrao)}" no nome (${varridos} arquivos varridos).`, conteudo: '' }
    }
    const cortado = achados.length >= LIMITE_BUSCA
    return {
      ok: true,
      resumo: `${achados.length} arquivo(s) com "${String(pedido.argumentos.padrao)}" no nome${cortado ? ` (parou em ${LIMITE_BUSCA} — refine o padrão)` : ''}.`,
      conteudo: achados.join('\n'),
    }
  }

  const criar: ExecutorFerramenta = async (pedido) => {
    const motivo = faltando('criar', pedido.argumentos)
    if (motivo) return falha(motivo)
    const porta = prepararPorta(raizResolvida, pedido.argumentos.caminho)
    if (!porta.ok) return falha(porta.resumo)
    if (!fs) return falhaF2()
    try {
      fs.createExclusive(porta.relativo, Buffer.from(String(pedido.argumentos.conteudo), 'utf8'))
    } catch (erro) {
      const codigo = (erro as NodeJS.ErrnoException)?.code
      if (codigo === 'EEXIST') return falha(`"${String(pedido.argumentos.caminho)}" já existe — criar nunca substitui um destino existente.`)
      return falha(`Não deu para criar "${String(pedido.argumentos.caminho)}" com segurança (permissão, espaço ou caminho recusado).`)
    }
    return { ok: true, resumo: `Arquivo "${String(pedido.argumentos.caminho)}" criado sem substituir destino existente.` }
  }

  const escrever: ExecutorFerramenta = async (pedido) => {
    const motivo = faltando('escrever', pedido.argumentos)
    if (motivo) return falha(motivo)
    const porta = prepararPorta(raizResolvida, pedido.argumentos.caminho)
    if (!porta.ok) return falha(porta.resumo)
    if (!fs) return falhaF2()
    try {
      fs.writeAtomic(porta.relativo, Buffer.from(String(pedido.argumentos.conteudo), 'utf8'))
    } catch (erro) {
      if ((erro as NodeJS.ErrnoException)?.code === 'ENOENT') {
        return falha(`"${String(pedido.argumentos.caminho)}" não existe ainda — peça a ferramenta "criar" para arquivos novos.`)
      }
      return falha(`Não deu para reescrever "${String(pedido.argumentos.caminho)}" com segurança (link, mudança concorrente ou falha do disco).`)
    }
    return { ok: true, resumo: `Arquivo "${String(pedido.argumentos.caminho)}" reescrito por substituição atômica segura.` }
  }

  const excluir: ExecutorFerramenta = async (pedido) => {
    const motivo = faltando('excluir', pedido.argumentos)
    if (motivo) return falha(motivo)
    const porta = prepararPorta(raizResolvida, pedido.argumentos.caminho)
    if (!porta.ok) return falha(porta.resumo)
    if (porta.relativo === '.') return falha('A pasta de trabalho inteira não pode ser excluída.')
    return falha('Exclusão bloqueada: a lixeira ainda não está integrada ao limite seguro F2. Nenhum item foi lido, movido ou removido.')
  }

  return {
    ler,
    listar,
    buscar,
    criar,
    escrever,
    excluir,
    fechar: () => fs?.close(),
  }
}
