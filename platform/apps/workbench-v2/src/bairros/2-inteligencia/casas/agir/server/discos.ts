// Casa Agir — operações de disco com Node.js e as permissões normais da conta.
// O workspace é a base para caminhos relativos, não uma barreira de confinamento.
// Defesa contra erro: caminhos explícitos, links resolvidos, criar exclusivo,
// escrever exige leitura prévia + fingerprint e substituição atômica.
import { createHash, randomUUID } from 'node:crypto'
import * as fs from 'node:fs/promises'
import * as nodePath from 'node:path'
import type { ArgumentosFerramenta, ExecutorFerramenta, FerramentaId, ResultadoFerramenta } from '../contract'
import { catalogoFerramentas } from './ferramentas'
import { verificarTerritorio } from './territorio'

export const LIMITE_BUSCA = 200
const LIMITE_ARQUIVOS_BUSCA = 20_000
const PULADAS_NA_BUSCA = new Set(['node_modules', '.git', 'dist', 'build', 'coverage'])

type Porta = { ok: true; caminho: string } | { ok: false; resumo: string }
type VersaoArquivo = { identidade: string; hash: string; links: bigint }

function falha(motivo: string): ResultadoFerramenta {
  return { ok: false, resumo: motivo }
}

function mensagemErro(erro: unknown): string {
  const code = (erro as NodeJS.ErrnoException)?.code
  if (code === 'EACCES' || code === 'EPERM') return 'sem permissão do sistema operacional'
  if (code === 'ENOENT' || code === 'ENOTDIR') return 'caminho inexistente ou componente que não é pasta'
  if (code === 'ELOOP') return 'ciclo de links simbólicos'
  if (code === 'ENOSPC' || code === 'EDQUOT') return 'espaço em disco insuficiente'
  if (code === 'EXDEV') return 'o sistema de arquivos não suporta a troca atômica necessária'
  return 'erro de acesso ao sistema de arquivos'
}

function prepararPorta(raiz: string, caminho: unknown): Porta {
  const veredito = verificarTerritorio(raiz, caminho)
  return veredito.liberado
    ? { ok: true, caminho: veredito.caminho }
    : { ok: false, resumo: veredito.motivo }
}

function ehErroCodigo(erro: unknown, codigo: string): boolean {
  return (erro as NodeJS.ErrnoException)?.code === codigo
}

/** Converte metadados estáveis e conteúdo em uma versão observada. */
async function lerVersao(caminho: string): Promise<{ versao: VersaoArquivo; conteudo: Buffer }> {
  const arquivo = await fs.open(caminho, 'r')
  try {
    const antes = await arquivo.stat({ bigint: true })
    if (!antes.isFile()) throw new Error('NOT_FILE')
    const conteudo = await arquivo.readFile()
    const depois = await arquivo.stat({ bigint: true })
    const identidade = (stat: typeof antes): string => [
      stat.dev.toString(), stat.ino.toString(), stat.size.toString(),
      stat.mtimeNs.toString(), stat.ctimeNs.toString(), stat.nlink.toString(),
    ].join(':')
    if (identidade(antes) !== identidade(depois) || BigInt(conteudo.byteLength) !== depois.size) {
      throw new Error('CHANGED_DURING_READ')
    }
    return {
      versao: { identidade: identidade(depois), hash: createHash('sha256').update(conteudo).digest('hex'), links: depois.nlink },
      conteudo,
    }
  } finally {
    await arquivo.close()
  }
}

function mesmaVersao(a: VersaoArquivo, b: VersaoArquivo): boolean {
  return a.identidade === b.identidade && a.hash === b.hash && a.links === b.links
}

/** Serializa apenas escritores deste processo para o mesmo destino. */
const filasDeEscrita = new Map<string, Promise<unknown>>()
function serializar<T>(chave: string, operacao: () => Promise<T>): Promise<T> {
  const anterior = filasDeEscrita.get(chave) ?? Promise.resolve()
  const atual = anterior.then(operacao, operacao)
  filasDeEscrita.set(chave, atual.catch(() => undefined))
  return atual
}

/**
 * Exclusão ainda não é implementada nesta missão (F6/Fatia 12 não reaberta).
 * A rotina não lê alvos nem sugere uma prévia que não possa executar.
 */
export async function descreverAlvoExcluir(_raiz: string, entrada: unknown): Promise<string> {
  if (typeof entrada !== 'string' || entrada.trim() === '') return 'O caminho veio vazio — aprovar não exclui nada.'
  return 'A exclusão não está disponível nesta versão; nenhum item foi lido, movido ou removido.'
}

export type FerramentasDeDisco = Exclude<FerramentaId, 'executar'>
export type ExecutoresDisco = Record<FerramentasDeDisco, ExecutorFerramenta> & { fechar: () => void }

export function criarExecutoresReais(raiz: string): ExecutoresDisco {
  const raizResolvida = nodePath.resolve(raiz)
  // A versão só vale dentro deste fluxo/run. Uma execução nova precisa reler.
  const versoesLidas = new Map<string, VersaoArquivo>()

  const faltando = (id: FerramentaId, argumentos: ArgumentosFerramenta): string | null => {
    const descritor = catalogoFerramentas.find((f) => f.id === id)
    const ausentes = (descritor?.obrigatorios ?? []).filter(
      (campo) => typeof argumentos[campo] !== 'string' || (argumentos[campo] as string).length === 0,
    )
    return ausentes.length > 0
      ? `A ferramenta "${id}" não executou: faltou ${ausentes.join(' e ')}. Não foi a sua permissão — o pedido da IA veio incompleto. Tente de novo mandando ${ausentes.join(' e ')}.`
      : null
  }

  const caminhoRealExistente = async (caminho: string): Promise<string> => fs.realpath(caminho)
  const caminhoDeCriacao = async (caminho: string): Promise<string> => {
    const pai = nodePath.dirname(caminho)
    await fs.mkdir(pai, { recursive: true })
    return nodePath.join(await fs.realpath(pai), nodePath.basename(caminho))
  }

  const ler: ExecutorFerramenta = async (pedido) => {
    const motivo = faltando('ler', pedido.argumentos)
    if (motivo) return falha(motivo)
    const porta = prepararPorta(raizResolvida, pedido.argumentos.caminho)
    if (!porta.ok) return falha(porta.resumo)
    try {
      const caminhoReal = await caminhoRealExistente(porta.caminho)
      const { versao, conteudo } = await lerVersao(caminhoReal)
      versoesLidas.set(caminhoReal, versao)
      const texto = conteudo.toString('utf8')
      return { ok: true, resumo: `Lido "${String(pedido.argumentos.caminho)}" (${texto.length} caracteres).`, conteudo: texto }
    } catch (erro) {
      const detalhe = (erro as Error).message === 'NOT_FILE' ? 'o destino não é um arquivo comum' : mensagemErro(erro)
      return falha(`Não deu para ler "${String(pedido.argumentos.caminho)}": ${detalhe}.`)
    }
  }

  const listar: ExecutorFerramenta = async (pedido) => {
    const motivo = faltando('listar', pedido.argumentos)
    if (motivo) return falha(motivo)
    const entrada = String(pedido.argumentos.caminho ?? '.')
    const porta = prepararPorta(raizResolvida, entrada === '' ? '.' : entrada)
    if (!porta.ok) return falha(porta.resumo)
    try {
      const caminhoReal = await caminhoRealExistente(porta.caminho)
      const st = await fs.stat(caminhoReal)
      if (!st.isDirectory()) return falha(`"${entrada}" não é uma pasta.`)
      const itens = await fs.readdir(caminhoReal, { withFileTypes: true })
      const nomes = itens.map((item) => `${item.name}${item.isDirectory() ? '/' : item.isSymbolicLink() ? ' [link]' : ''}`).sort((a, b) => a.localeCompare(b))
      return { ok: true, resumo: nomes.length === 0 ? `"${entrada}" está vazia.` : `"${entrada}": ${nomes.length} itens.`, conteudo: nomes.join('\n') }
    } catch (erro) {
      return falha(`Não deu para listar "${entrada}": ${mensagemErro(erro)}.`)
    }
  }

  const buscar: ExecutorFerramenta = async (pedido) => {
    const motivo = faltando('buscar', pedido.argumentos)
    if (motivo) return falha(motivo)
    const padraoOriginal = String(pedido.argumentos.padrao)
    const padrao = padraoOriginal.toLocaleLowerCase()
    const entrada = typeof pedido.argumentos.caminho === 'string' && pedido.argumentos.caminho.trim() !== '' ? pedido.argumentos.caminho : '.'
    const porta = prepararPorta(raizResolvida, entrada)
    if (!porta.ok) return falha(porta.resumo)
    const achados: string[] = []
    let varridos = 0
    let limitado = false
    const varrer = async (diretorio: string, relativo: string, profundidade: number): Promise<void> => {
      if (achados.length >= LIMITE_BUSCA || varridos >= LIMITE_ARQUIVOS_BUSCA) { limitado = true; return }
      if (profundidade > 80) return
      const itens = await fs.readdir(diretorio, { withFileTypes: true })
      for (const item of itens) {
        if (achados.length >= LIMITE_BUSCA || varridos >= LIMITE_ARQUIVOS_BUSCA) { limitado = true; return }
        const caminhoRelativo = relativo ? nodePath.join(relativo, item.name).split(nodePath.sep).join('/') : item.name
        if (item.isDirectory()) {
          if (!PULADAS_NA_BUSCA.has(item.name)) await varrer(nodePath.join(diretorio, item.name), caminhoRelativo, profundidade + 1)
        } else if (item.isFile()) {
          varridos += 1
          if (item.name.toLocaleLowerCase().includes(padrao)) achados.push(caminhoRelativo)
        }
      }
    }
    try {
      const inicio = await caminhoRealExistente(porta.caminho)
      if (!(await fs.stat(inicio)).isDirectory()) return falha(`"${entrada}" não é uma pasta.`)
      await varrer(inicio, '', 0)
    } catch (erro) {
      return falha(`Não deu para buscar "${padraoOriginal}" em "${entrada}": ${mensagemErro(erro)}.`)
    }
    const notaLimite = limitado ? ` (busca limitada a ${LIMITE_BUSCA} resultados ou ${LIMITE_ARQUIVOS_BUSCA} arquivos)` : ''
    return {
      ok: true,
      resumo: achados.length === 0 ? `Nenhum arquivo com "${padraoOriginal}" no nome (${varridos} arquivos varridos)${notaLimite}.` : `${achados.length} arquivo(s) com "${padraoOriginal}" no nome${notaLimite}.`,
      conteudo: achados.join('\n'),
    }
  }

  const criar: ExecutorFerramenta = async (pedido) => {
    const motivo = faltando('criar', pedido.argumentos)
    if (motivo) return falha(motivo)
    const porta = prepararPorta(raizResolvida, pedido.argumentos.caminho)
    if (!porta.ok) return falha(porta.resumo)
    let temporario: string | undefined
    try {
      const destino = await caminhoDeCriacao(porta.caminho)
      const st = await fs.lstat(destino).catch((erro: unknown) => { if (ehErroCodigo(erro, 'ENOENT')) return undefined; throw erro })
      if (st) return falha(`"${String(pedido.argumentos.caminho)}" já existe — criar nunca substitui um destino existente.`)
      temporario = nodePath.join(nodePath.dirname(destino), `.agir-${randomUUID()}.tmp`)
      const arquivo = await fs.open(temporario, 'wx')
      try {
        await arquivo.writeFile(String(pedido.argumentos.conteudo), 'utf8')
        await arquivo.sync()
      } finally { await arquivo.close() }
      // link() publica o arquivo completo e falha se outro destino apareceu.
      await fs.link(temporario, destino)
      // A publicação já foi concluída com semântica exclusiva. Falha ao limpar
      // o nome temporário não transforma um sucesso real em recusa enganosa;
      // nesse caso, informe que o arquivo-alvo foi criado mas há resíduo interno.
      const temporarioLimpo = await fs.unlink(temporario).then(() => true, () => false)
      temporario = undefined
      const aviso = temporarioLimpo ? '' : ' O destino foi criado, mas um temporário interno não pôde ser removido.'
      return { ok: true, resumo: `Arquivo "${String(pedido.argumentos.caminho)}" criado sem substituir destino existente.${aviso}` }
    } catch (erro) {
      if (temporario) await fs.unlink(temporario).catch(() => undefined)
      if (ehErroCodigo(erro, 'EEXIST')) return falha(`"${String(pedido.argumentos.caminho)}" já existe — criar nunca substitui um destino existente.`)
      return falha(`Não deu para criar "${String(pedido.argumentos.caminho)}": ${mensagemErro(erro)}.`)
    }
  }

  const escrever: ExecutorFerramenta = async (pedido) => {
    const motivo = faltando('escrever', pedido.argumentos)
    if (motivo) return falha(motivo)
    const porta = prepararPorta(raizResolvida, pedido.argumentos.caminho)
    if (!porta.ok) return falha(porta.resumo)
    let temporario: string | undefined
    try {
      const caminhoReal = await caminhoRealExistente(porta.caminho)
      return await serializar(caminhoReal, async () => {
        const observado = versoesLidas.get(caminhoReal)
        if (!observado) return falha(`Conflito: releia "${String(pedido.argumentos.caminho)}" nesta execução antes de editar; nenhuma alteração foi feita.`)
        const atual = await lerVersao(caminhoReal)
        if (atual.versao.links > 1n) return falha(`Não vou substituir "${String(pedido.argumentos.caminho)}": o arquivo tem hard links e a substituição quebraria a identidade compartilhada.`)
        if (!mesmaVersao(observado, atual.versao)) {
          versoesLidas.delete(caminhoReal)
          return falha(`Conflito: "${String(pedido.argumentos.caminho)}" mudou desde a leitura; nenhuma alteração foi feita. Leia a versão atual e tente novamente.`)
        }
        const modo = (await fs.stat(caminhoReal)).mode & 0o777
        temporario = nodePath.join(nodePath.dirname(caminhoReal), `.agir-${randomUUID()}.tmp`)
        const arquivo = await fs.open(temporario, 'wx', modo)
        try {
          await arquivo.writeFile(String(pedido.argumentos.conteudo), 'utf8')
          await arquivo.sync()
        } finally { await arquivo.close() }
        // Segunda verificação reduz conflitos comuns; não fecha TOCTOU contra
        // processo hostil da mesma conta, limite aceito e documentado.
        const antesDoCommit = await lerVersao(caminhoReal)
        if (!mesmaVersao(observado, antesDoCommit.versao)) {
          await fs.unlink(temporario).catch(() => undefined)
          temporario = undefined
          versoesLidas.delete(caminhoReal)
          return falha(`Conflito: "${String(pedido.argumentos.caminho)}" mudou antes da gravação; nenhuma alteração foi feita.`)
        }
        await fs.rename(temporario, caminhoReal)
        temporario = undefined
        // O commit já ocorreu; se a recaptura da versão falhar, informe sucesso
        // do rename e exija nova leitura para qualquer edição seguinte.
        versoesLidas.delete(caminhoReal)
        const novo = await lerVersao(caminhoReal).catch(() => undefined)
        if (novo) versoesLidas.set(caminhoReal, novo.versao)
        return { ok: true, resumo: `Arquivo "${String(pedido.argumentos.caminho)}" atualizado.` }
      })
    } catch (erro) {
      if (temporario) await fs.unlink(temporario).catch(() => undefined)
      return falha(`Não deu para escrever "${String(pedido.argumentos.caminho)}": ${mensagemErro(erro)}.`)
    }
  }

  const excluir: ExecutorFerramenta = async () => falha('Exclusão bloqueada: esta missão não altera a implementação da lixeira. Nenhum item foi lido, movido ou removido.')

  return { ler, listar, buscar, criar, escrever, excluir, fechar: () => versoesLidas.clear() }
}
