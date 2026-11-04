// Casa Agir — operações de disco com Node.js e as permissões normais da conta.
// O workspace é a base para caminhos relativos, não uma barreira de confinamento.
// Defesa contra erro: caminhos explícitos, links resolvidos, criar exclusivo,
// escrever exige leitura prévia + fingerprint e substituição atômica.
import { createHash, randomUUID } from 'node:crypto'
import * as fs from 'node:fs/promises'
import * as nodePath from 'node:path'
import type { ArgumentosFerramenta, ExecutorFerramenta, FerramentaId, ResultadoFerramenta, PedidoFerramenta } from '../contract'
import { catalogoFerramentas } from './ferramentas'
import { contarConteudo, formatarTamanho, moverParaLixeira, type OpcoesLixeira } from './lixeira'
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
 * DEBT-24 / D128 — normalização para COMPARAÇÃO de caminhos.
 * Lição C5 da FATIA 12 (homologada em D97): no Windows o `realpath` pode
 * devolver prefixo UNC `\\?\` e caixa diferente do caminho pedido, e comparar
 * sem normalizar fazia o território recusar alvo legítimo.
 */
function normalizaCaminho(caminho: string): string {
  if (process.platform !== 'win32') return caminho
  return caminho.replace(/^\\\\\?\\/, '').toLowerCase().replace(/\//g, '\\')
}

/** Separador usado na comparação já normalizada (C5: no Windows vira `\`). */
function separadorNormalizado(): string {
  return process.platform === 'win32' ? '\\' : nodePath.sep
}

/** Motivo tipado — evita checar prefixo de string para decidir a mensagem. */
type MotivoExclusao = 'fora' | 'raiz' | 'inexistente' | 'link' | 'sem_pasta'

type AlvoExclusao =
  | { ok: true; real: string; ehPasta: boolean }
  | { ok: false; motivo: MotivoExclusao }

const FRASE_MOTIVO: Record<MotivoExclusao, string> = {
  fora: 'Fora da pasta de trabalho — a exclusão não sai dela',
  raiz: 'A pasta de trabalho inteira não pode ser excluída — escolha o que vai para a lixeira dentro dela',
  inexistente: 'não existe no disco',
  link: 'é um link (não um arquivo/pasta real) — recusado',
  sem_pasta: 'A pasta de trabalho não existe no disco — nada pode ser excluído',
}

function estaDentro(raizNorm: string, alvoNorm: string): boolean {
  return alvoNorm.startsWith(`${raizNorm}${separadorNormalizado()}`)
}

/**
 * DEBT-24 / D128 — contenção do `excluir` na pasta de trabalho.
 *
 * D121 permite caminho absoluto/externo para ler/listar/buscar/criar/escrever
 * (o workspace é base de resolução, não sandbox). **Exclusão é destrutiva e foi
 * homologada por D97 com "território = pasta ativa"**: a contenção aqui é
 * mantida DE PROPÓSITO, mais estrita que a das cinco ferramentas irmãs, e é a
 * proteção que o dono pediu para preservar.
 *
 * ORDEM das checagens (cada uma com motivo próprio, na ordem homologada):
 *   1. território LEXICAL e "raiz nunca é alvo" — ANTES de olhar o disco, para
 *      que `../fora` devolva "fora da pasta" e não "não existe" (o motivo certo
 *      importa: é o que o modelo e o dono leem);
 *   2. `lstat` no caminho pedido — link simbólico/junction é RECUSADO. Tem que
 *      vir ANTES do `realpath`, que resolveria o link e esconderia a troca;
 *   3. território FÍSICO via `realpath` — resolve links de componentes pai e
 *      fecha o escape por symlink de pasta (achado comprovado da auditoria F2);
 *   4. re-conferência com `lstat` no caminho real, no momento da ação.
 */
async function resolverAlvoExclusao(raiz: string, caminhoResolvido: string): Promise<AlvoExclusao> {
  const raizLexical = normalizaCaminho(nodePath.resolve(raiz))
  const alvoLexical = normalizaCaminho(caminhoResolvido)
  if (alvoLexical === raizLexical) return { ok: false, motivo: 'raiz' }
  if (!estaDentro(raizLexical, alvoLexical)) return { ok: false, motivo: 'fora' }

  let cru
  try {
    cru = await fs.lstat(caminhoResolvido)
  } catch {
    return { ok: false, motivo: 'inexistente' }
  }
  if (cru.isSymbolicLink()) return { ok: false, motivo: 'link' }

  let raizReal: string
  try {
    raizReal = await fs.realpath(raiz)
  } catch {
    return { ok: false, motivo: 'sem_pasta' }
  }
  let real: string
  try {
    real = await fs.realpath(caminhoResolvido)
  } catch {
    return { ok: false, motivo: 'inexistente' }
  }
  const raizNorm = normalizaCaminho(raizReal)
  const realNorm = normalizaCaminho(real)
  if (realNorm === raizNorm) return { ok: false, motivo: 'raiz' }
  if (!estaDentro(raizNorm, realNorm)) return { ok: false, motivo: 'fora' }

  let info
  try {
    info = await fs.lstat(real)
  } catch {
    return { ok: false, motivo: 'inexistente' }
  }
  if (info.isSymbolicLink()) return { ok: false, motivo: 'link' }
  return { ok: true, real, ehPasta: info.isDirectory() }
}

/** Prévia do alvo do `excluir` para o cartão reforçado (FATIA 12, RF12-6):
 * arquivo → começo do conteúdo; pasta → contagem + tamanho; problema →
 * frase honesta dizendo que aprovar não apaga nada. A rota chama antes de
 * emitir o `approval` (só o servidor enxerga o disco).
 *
 * RESTAURADA por DEBT-24/D128: a versão fail-closed dizia "exclusão não está
 * disponível" porque o executor estava bloqueado. Com o executor restaurado,
 * a prévia volta a mostrar o alvo real — que é o que o cartão promete.
 */
export async function descreverAlvoExcluir(raiz: string, entrada: unknown): Promise<string> {
  if (typeof entrada !== 'string' || entrada.trim() === '') {
    return 'O caminho veio vazio — aprovar não apaga nada.'
  }
  const nome = entrada.trim()
  const veredito = verificarTerritorio(raiz, nome)
  if (!veredito.liberado) {
    return 'Fora da pasta de trabalho — aprovar não apaga nada.'
  }
  const alvo = await resolverAlvoExclusao(nodePath.resolve(raiz), veredito.caminho)
  if (!alvo.ok) {
    switch (alvo.motivo) {
      case 'inexistente':
        return `"${nome}" não existe — nada vai sumir.`
      case 'link':
        return `"${nome}" é um link, não um arquivo/pasta real — aprovar não apaga nada.`
      case 'fora':
        return 'Fora da pasta de trabalho — aprovar não apaga nada.'
      case 'raiz':
        return `${FRASE_MOTIVO.raiz}.`
      case 'sem_pasta':
        return FRASE_MOTIVO.sem_pasta
    }
  }
  if (!alvo.ehPasta) {
    try {
      const conteudo = await fs.readFile(alvo.real, 'utf8')
      return `Arquivo "${nome}" (${conteudo.length} caracteres):\n${conteudo.slice(0, 400)}`
    } catch {
      return `Arquivo "${nome}" (não deu para pré-visualizar).`
    }
  }
  const contagem = await contarConteudo(alvo.real)
  const itemOuItens = contagem.itens === 1 ? 'item' : 'itens'
  const parcial = contagem.cortada ? ' (contagem parcial — pasta muito grande)' : ''
  return `Pasta "${nome}": ${contagem.itens} ${itemOuItens} (${formatarTamanho(contagem.bytes)}).${parcial}`
}

export type FerramentasDeDisco = Exclude<FerramentaId, 'executar'>
export type ExecutoresDisco = Record<FerramentasDeDisco, ExecutorFerramenta> & {
  fechar: () => void
  prepararExclusao: (pedido: PedidoFerramenta) => Promise<string>
}

/** Versão observada da árvore, sem seguir links internos. Falha fechada se
 * não for possível observar tudo. Metadados + conteúdo detectam também edição
 * de arquivo dentro de uma pasta cujo próprio mtime não mudou. */
async function versaoExclusao(caminho: string): Promise<string> {
  const hash = createHash('sha256')
  let itens = 0
  const visitar = async (atual: string, profundidade: number): Promise<void> => {
    if (++itens > 20_000 || profundidade > 128) throw new Error('Limite de observação da exclusão')
    const antes = await fs.lstat(atual, { bigint: true })
    const metadata = (s: typeof antes): string => [s.dev, s.ino, s.mode, s.size, s.mtimeNs, s.ctimeNs, s.nlink].join(':')
    hash.update(JSON.stringify([nodePath.relative(caminho, atual), metadata(antes)]))
    if (antes.isSymbolicLink()) hash.update(await fs.readlink(atual))
    else if (antes.isDirectory()) {
      for (const nome of (await fs.readdir(atual)).sort()) await visitar(nodePath.join(atual, nome), profundidade + 1)
    } else if (antes.isFile()) {
      const arquivo = await fs.open(atual, 'r')
      try {
        const esperado = metadata(antes)
        if (metadata(await arquivo.stat({ bigint: true })) !== esperado) throw new Error('Alvo mudou antes da leitura')
        const conteudo = createHash('sha256')
        let bytes = 0n
        for await (const bloco of arquivo.createReadStream({ autoClose: false })) {
          conteudo.update(bloco)
          bytes += BigInt(bloco.length)
        }
        if (bytes !== antes.size || metadata(await arquivo.stat({ bigint: true })) !== esperado) {
          throw new Error('Alvo mudou durante a leitura')
        }
        hash.update(conteudo.digest('hex'))
      } finally {
        await arquivo.close()
      }
    } else throw new Error('Tipo de arquivo não suportado')
    if (metadata(antes) !== metadata(await fs.lstat(atual, { bigint: true }))) throw new Error('Alvo mudou durante a observação')
  }
  await visitar(caminho, 0)
  return hash.digest('hex')
}

export function criarExecutoresReais(raiz: string, opcoesLixeira: OpcoesLixeira = {}): ExecutoresDisco {
  const raizResolvida = nodePath.resolve(raiz)
  // A versão só vale dentro deste fluxo/run. Uma execução nova precisa reler.
  const versoesLidas = new Map<string, VersaoArquivo>()
  // Apenas servidor: nunca aceitamos identidade ou aprovação vinda do modelo.
  let previas = new WeakMap<PedidoFerramenta, { real: string; versao: string }>()
  const prepararExclusao = async (pedido: PedidoFerramenta): Promise<string> => {
    previas.delete(pedido)
    const porta = prepararPorta(raizResolvida, pedido.argumentos.caminho)
    if (!porta.ok) return porta.resumo
    const alvo = await resolverAlvoExclusao(raizResolvida, porta.caminho)
    if (!alvo.ok) return descreverAlvoExcluir(raizResolvida, pedido.argumentos.caminho)
    try {
      const antes = await versaoExclusao(alvo.real)
      const previa = await descreverAlvoExcluir(raizResolvida, pedido.argumentos.caminho)
      const depois = await resolverAlvoExclusao(raizResolvida, porta.caminho)
      if (!depois.ok || depois.real !== alvo.real || antes !== await versaoExclusao(depois.real)) throw new Error('Alvo mudou')
      previas.set(pedido, { real: alvo.real, versao: antes })
      return previa
    } catch {
      return 'Não foi possível observar uma versão estável e completa do alvo — nada será movido. Solicite uma nova prévia.'
    }
  }

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

  /**
   * RESTAURADO por DEBT-24/D128 (2026-10-31) — contrato homologado em D97
   * (SPEC 2F): arquivo E pasta para a LIXEIRA do sistema, nunca permanente,
   * sempre com cartão, sessão nunca cobre, território = pasta ativa.
   *
   * O que estava aqui era um stub de falha fixa que nem chamava
   * `moverParaLixeira` — resíduo "temporário" do episódio fail-closed F2,
   * cuja condição de religamento (helper de handles) foi aposentada por D121.
   *
   * Proteções vivas nesta restauração:
   *   · contenção na pasta de trabalho via realpath (mais estrita que as cinco
   *     irmãs, que sob D121 aceitam caminho externo);
   *   · a raiz da pasta de trabalho nunca é alvo;
   *   · link simbólico/junction é recusado, nunca seguido;
   *   · serialização por destino (mesma fila que criar/escrever) — duas
   *     exclusões concorrentes do mesmo caminho não correm juntas;
   *   · versão lida em cache é descartada após mover;
   *   · falha antes de mover mantém a origem; efeito parcial informa destino.
   * Exclusão PERMANENTE continua fora (DEBT-23 separada; SPEC 2F §6 "nunca
   * permanente" segue valendo até ordem expressa do dono).
   */
  const excluir: ExecutorFerramenta = async (pedido, contexto) => {
    const motivo = faltando('excluir', pedido.argumentos)
    if (motivo) return falha(motivo)
    const entrada = String(pedido.argumentos.caminho)
    const porta = prepararPorta(raizResolvida, pedido.argumentos.caminho)
    if (!porta.ok) return falha(porta.resumo)
    return serializar(porta.caminho, async () => {
      const alvo = await resolverAlvoExclusao(raizResolvida, porta.caminho)
      if (!alvo.ok) {
        switch (alvo.motivo) {
          case 'inexistente':
            return falha(`"${entrada}" não existe — nada sumiu.`)
          case 'link':
            return falha(
              `"${entrada}" é um link, não um arquivo/pasta real — recusado: nada sumiu. Peça a exclusão do alvo do link.`,
            )
          case 'fora':
            return falha(`${FRASE_MOTIVO.fora}. Nada sumiu.`)
          case 'raiz':
            return falha(`${FRASE_MOTIVO.raiz}.`)
          case 'sem_pasta':
            return falha(FRASE_MOTIVO.sem_pasta)
        }
      }
      const aprovada = previas.get(pedido)
      previas.delete(pedido) // autorização de uso único, inclusive em caso de erro
      if (!aprovada) return falha('Não há prévia estável vinculada a esta exclusão. Solicite uma nova confirmação — nada sumiu.')
      const validarAprovada = async (): Promise<boolean> => {
        const atual = await resolverAlvoExclusao(raizResolvida, porta.caminho)
        return atual.ok && atual.real === aprovada.real && aprovada.versao === await versaoExclusao(atual.real)
      }
      const contagem = alvo.ehPasta ? await contarConteudo(alvo.real) : null
      // Revalida dentro da lixeira, após a reserva XDG e imediatamente antes
      // do despacho Windows/rename. D121: ainda não é CAS de syscall por handle.
      const resultado = await moverParaLixeira(alvo.real, { ...opcoesLixeira, validar: validarAprovada, sinal: contexto?.sinal })
      if (resultado.efeitoIniciado) {
        versoesLidas.delete(alvo.real)
        versoesLidas.delete(porta.caminho)
      }
      if (!resultado.ok) return {
        ...falha(resultado.motivo ?? 'Não deu para mover para a lixeira — nada sumiu.'),
        efeitoIniciado: resultado.efeitoIniciado,
        requerNovaAprovacao: resultado.requerNovaAprovacao,
      }
      // O item saiu do disco: qualquer versão em cache deste caminho é mentira.
      versoesLidas.delete(alvo.real)
      versoesLidas.delete(porta.caminho)
      if (!alvo.ehPasta || !contagem) {
        return {
          ok: true,
          resumo: `Arquivo "${entrada}" movido para a lixeira (para restaurar, abra a lixeira do sistema).`,
        }
      }
      const itemOuItens = contagem.itens === 1 ? 'item' : 'itens'
      const parcial = contagem.cortada ? ', contagem parcial' : ''
      return {
        ok: true,
        resumo: `Pasta "${entrada}" (${contagem.itens} ${itemOuItens}${parcial}) movida para a lixeira (para restaurar, abra a lixeira do sistema).`,
      }
    })
  }

  return { ler, listar, buscar, criar, escrever, excluir, prepararExclusao, fechar: () => { versoesLidas.clear(); previas = new WeakMap() } }
}
