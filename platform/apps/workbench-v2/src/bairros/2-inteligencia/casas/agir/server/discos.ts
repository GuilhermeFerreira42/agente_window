// ============================================================================
// Casa Agir — EXECUTORES REAIS (conquista 2): as 5 mãos no disco, todas
// presas pela trava de território. A escrita é ATÔMICA (grava num temporário
// e troca num passo — ou grava tudo, ou não grava nada), a mesma receita do
// fsHost do módulo de arquivos — reimplementada aqui dentro da casa porque a
// fronteira LEGO não deixa importar módulo de fora (e não devia).
// Réguas honestas: `escrever` exige arquivo existente (para criar, use
// `criar`); `buscar` varre a pasta e mostra no máximo 200 nomes (conta o resto).
// ============================================================================
import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises'
import * as nodePath from 'node:path'
import type { ArgumentosFerramenta, ExecutorFerramenta, FerramentaId, ResultadoFerramenta } from '../contract'
import { catalogoFerramentas } from './ferramentas'
import { contarConteudo, formatarTamanho, moverParaLixeira } from './lixeira'
import { verificarTerritorio } from './territorio'

/** Prévia do alvo do `excluir` para o cartão reforçado (FATIA 12, RF12-6):
 * arquivo → começo do conteúdo; pasta → contagem + tamanho; problema →
 * frase honesta dizendo que aprovar não apaga nada. A rota chama antes de
 * emitir o `approval` (só o servidor enxerga o disco). */
export async function descreverAlvoExcluir(raiz: string, entrada: unknown): Promise<string> {
  if (typeof entrada !== 'string' || entrada.trim() === '') {
    return 'O caminho veio vazio — aprovar não apaga nada.'
  }
  const nome = entrada.trim()
  const veredito = verificarTerritorio(raiz, nome)
  if (!veredito.liberado) {
    return 'Fora da pasta de trabalho — aprovar não apaga nada.'
  }
  let info
  try {
    info = await stat(veredito.caminho)
  } catch {
    return `"${nome}" não existe — nada vai sumir.`
  }
  if (!info.isDirectory()) {
    try {
      const conteudo = await readFile(veredito.caminho, 'utf8')
      return `Arquivo "${nome}" (${conteudo.length} caracteres):\n${conteudo.slice(0, 400)}`
    } catch {
      return `Arquivo "${nome}" (não deu para pré-visualizar).`
    }
  }
  const contagem = await contarConteudo(veredito.caminho)
  const itemOuItens = contagem.itens === 1 ? 'item' : 'itens'
  const parcial = contagem.cortada ? ' (contagem parcial — pasta muito grande)' : ''
  return `Pasta "${nome}": ${contagem.itens} ${itemOuItens} (${formatarTamanho(contagem.bytes)}).${parcial}`
}

/** Teto do resultado da busca (o excedente é CONTADO e anunciado, nunca calado). */
export const LIMITE_BUSCA = 200
/** Pastas que a busca NÃO entra (lixo de ferramenta, não trabalho do dono). */
const PULADAS_NA_BUSCA = new Set(['node_modules', '.git', 'dist', 'build', 'coverage'])

function falha(motivo: string): ResultadoFerramenta {
  return { ok: false, resumo: motivo }
}

async function gravarAtomico(destino: string, conteudo: string): Promise<void> {
  await mkdir(nodePath.dirname(destino), { recursive: true })
  const temporario = `${destino}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  await writeFile(temporario, conteudo, 'utf8')
  try {
    await rename(temporario, destino)
  } catch (erro) {
    await writeFile(destino, conteudo, 'utf8').catch(() => {
      throw erro
    })
  }
}

/**
 * Cria os executores de disco presos à pasta `raiz` (a pasta de trabalho
 * ativa — quem resolve é a rota, na C3, pelos dados da prefeitura).
 */
export function criarExecutoresReais(raiz: string): Record<FerramentaId, ExecutorFerramenta> {
  /** União discriminada: `ok` literal deixa o TypeScript estreitar de verdade. */
  type Porta = { ok: true; caminho: string } | { ok: false; resumo: string }
  const dentro = (caminho: unknown): Porta => {
    const veredito = verificarTerritorio(raiz, caminho)
    return veredito.liberado
      ? { ok: true, caminho: veredito.caminho }
      : { ok: false, resumo: veredito.motivo }
  }

  const faltando = (id: FerramentaId, argumentos: ArgumentosFerramenta): string | null => {
    const descritor = catalogoFerramentas.find((f) => f.id === id)
    const ausentes = (descritor?.obrigatorios ?? []).filter(
      (campo) => typeof argumentos[campo] !== 'string' || (argumentos[campo] as string).length === 0,
    )
    return ausentes.length > 0 ? `A ferramenta "${id}" não executou: faltou ${ausentes.join(' e ')}. Não foi a sua permissão — o pedido da IA veio incompleto. Tente de novo mandando ${ausentes.join(' e ')}.` : null
  }

  const ler: ExecutorFerramenta = async (pedido) => {
    const motivo = faltando('ler', pedido.argumentos)
    if (motivo) return falha(motivo)
    const porta = dentro(pedido.argumentos.caminho)
    if (!porta.ok) return porta
    try {
      const info = await stat(porta.caminho)
      if (!info.isFile()) return falha(`"${String(pedido.argumentos.caminho)}" não é um arquivo (é pasta?). Use "listar".`)
      const conteudo = await readFile(porta.caminho, 'utf8')
      return {
        ok: true,
        resumo: `Lido "${String(pedido.argumentos.caminho)}" (${conteudo.length} caracteres).`,
        conteudo,
      }
    } catch {
      return falha(`Não deu para ler "${String(pedido.argumentos.caminho)}" (inexistente ou sem permissão de leitura).`)
    }
  }

  const listar: ExecutorFerramenta = async (pedido) => {
    const motivo = faltando('listar', pedido.argumentos)
    if (motivo) return falha(motivo)
    const entrada = String(pedido.argumentos.caminho ?? '')
    const porta = dentro(entrada === '' || entrada === '.' ? '.' : entrada)
    if (!porta.ok) return porta
    try {
      const itens = await readdir(porta.caminho, { withFileTypes: true })
      const nomes = itens
        .map((item) => (item.isDirectory() ? `${item.name}/` : item.name))
        .sort((a, b) => a.localeCompare(b))
      return {
        ok: true,
        resumo: nomes.length === 0
          ? `"${entrada}" está vazia.`
          : `"${entrada}": ${nomes.length} itens.`,
        conteudo: nomes.join('\n'),
      }
    } catch {
      return falha(`Não deu para listar "${entrada}" (inexistente ou não é pasta).`)
    }
  }

  const buscar: ExecutorFerramenta = async (pedido) => {
    const motivo = faltando('buscar', pedido.argumentos)
    if (motivo) return falha(motivo)
    const padrao = String(pedido.argumentos.padrao).toLowerCase()
    if (pedido.argumentos.caminho !== undefined) {
      const porta = dentro(pedido.argumentos.caminho)
      if (!porta.ok) return porta
    }
    const raizBusca = nodePath.resolve(raiz, typeof pedido.argumentos.caminho === 'string' && pedido.argumentos.caminho !== '' ? pedido.argumentos.caminho : '.')
    const achados: string[] = []
    let varridos = 0
    const varrer = async (pasta: string): Promise<void> => {
      if (achados.length >= LIMITE_BUSCA) return
      let itens
      try {
        itens = await readdir(pasta, { withFileTypes: true })
      } catch {
        return // pasta sem permissão: pula, sem derrubar a busca
      }
      for (const item of itens) {
        if (achados.length >= LIMITE_BUSCA) return
        const cheio = nodePath.join(pasta, item.name)
        if (item.isDirectory()) {
          if (PULADAS_NA_BUSCA.has(item.name)) continue
          await varrer(cheio)
          continue
        }
        varridos += 1
        if (item.name.toLowerCase().includes(padrao)) achados.push(nodePath.relative(nodePath.resolve(raiz), cheio))
      }
    }
    try {
      await varrer(raizBusca)
    } catch {
      return falha(`Não deu para varrer a pasta de trabalho procurando "${String(pedido.argumentos.padrao)}".`)
    }
    if (achados.length === 0) {
      return { ok: true, resumo: `Nenhum arquivo com "${String(pedido.argumentos.padrao)}" no nome (${varridos} arquivos varridos).`, conteudo: '' }
    }
    const cortado = varridos > 0 && achados.length >= LIMITE_BUSCA
    return {
      ok: true,
      resumo: `${achados.length} arquivo(s) com "${String(pedido.argumentos.padrao)}" no nome${cortado ? ` (parou em ${LIMITE_BUSCA} — refine o padrão)` : ''}.`,
      conteudo: achados.join('\n'),
    }
  }

  const criar: ExecutorFerramenta = async (pedido) => {
    const motivo = faltando('criar', pedido.argumentos)
    if (motivo) return falha(motivo)
    const porta = dentro(pedido.argumentos.caminho)
    if (!porta.ok) return porta
    try {
      const info = await stat(porta.caminho)
      if (info.isDirectory()) return falha(`"${String(pedido.argumentos.caminho)}" é uma pasta — não dá para criar arquivo com esse nome.`)
    } catch {
      // não existe ainda: é exatamente o caso do "criar"
    }
    try {
      await gravarAtomico(porta.caminho, String(pedido.argumentos.conteudo))
    } catch {
      return falha(`Não deu para gravar "${String(pedido.argumentos.caminho)}" (permissão negada, disco cheio ou caminho inválido).`)
    }
    return { ok: true, resumo: `Arquivo "${String(pedido.argumentos.caminho)}" criado (escrita atômica).` }
  }

  const escrever: ExecutorFerramenta = async (pedido) => {
    const motivo = faltando('escrever', pedido.argumentos)
    if (motivo) return falha(motivo)
    const porta = dentro(pedido.argumentos.caminho)
    if (!porta.ok) return porta
    let existia = false
    try {
      existia = (await stat(porta.caminho)).isFile()
    } catch {
      existia = false
    }
    if (!existia) {
      return falha(`"${String(pedido.argumentos.caminho)}" não existe ainda — peça a ferramenta "criar" para arquivos novos.`)
    }
    try {
      await gravarAtomico(porta.caminho, String(pedido.argumentos.conteudo))
    } catch {
      return falha(`Não deu para gravar "${String(pedido.argumentos.caminho)}" (permissão negada, disco cheio ou caminho inválido).`)
    }
    return { ok: true, resumo: `Arquivo "${String(pedido.argumentos.caminho)}" reescrito por completo (escrita atômica).` }
  }

  const excluir: ExecutorFerramenta = async (pedido) => {
    const motivo = faltando('excluir', pedido.argumentos)
    if (motivo) return falha(motivo)
    const porta = dentro(pedido.argumentos.caminho)
    if (!porta.ok) return porta
    // A própria pasta de trabalho nunca é alvo (RNF12-3, padrão 10).
    if (porta.caminho === nodePath.resolve(raiz)) {
      return falha('A pasta de trabalho inteira não pode ser excluída — escolha o que vai para a lixeira dentro dela.')
    }
    const entrada = String(pedido.argumentos.caminho)
    let info
    try {
      info = await stat(porta.caminho)
    } catch {
      return falha(`"${entrada}" não existe — nada sumiu.`)
    }
    const ehPasta = info.isDirectory()
    const contagem = ehPasta ? await contarConteudo(porta.caminho) : null
    const resultado = await moverParaLixeira(porta.caminho)
    if (!resultado.ok) return falha(resultado.motivo ?? 'Não deu para mover para a lixeira — nada sumiu.')
    if (!ehPasta || !contagem) {
      return { ok: true, resumo: `Arquivo "${entrada}" movido para a lixeira (para restaurar, abra a lixeira do sistema).` }
    }
    const itemOuItens = contagem.itens === 1 ? 'item' : 'itens'
    return { ok: true, resumo: `Pasta "${entrada}" (${contagem.itens} ${itemOuItens}) movida para a lixeira (para restaurar, abra a lixeira do sistema).` }
  }

  return { ler, listar, buscar, criar, escrever, excluir }
}
