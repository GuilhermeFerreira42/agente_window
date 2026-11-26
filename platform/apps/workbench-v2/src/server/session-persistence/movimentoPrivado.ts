// Rastreia movimentos feitos PELO Explorer na árvore privada. O ledger de
// intenção é gravado antes da operação e só é resolvido por identidade; em
// dúvida nenhuma cópia histórica é apresentada como trabalho atual.
import { link, lstat, rename, rm, unlink } from 'node:fs/promises'
import path from 'node:path'
import { getDatabase } from './database'
import { withSessionPersistenceQueue } from './filaSessao'
import { PersistenceProblem } from './persistenceErrors'
import { raizPrivadaDaConversa } from './raizPrivadaChat'
import { resolverDonoAnexos } from './attachments/dono'
import { garantirDiretorioReal } from './attachments/contencao'

type Item = { artifactId: string; anterior: string; novo: string }
type Intencao = { origem: string; destino: string; dev: string; ino: string; itens: string }
interface HostMovimento { assertSafeUri(uri: `file://${string}`): string }

function recusar(message: string): never { throw new PersistenceProblem(409, 'work_move_unavailable', message) }
function obterIntencao(sessionId: string, chatId: string): Intencao | undefined {
  return getDatabase().prepare('SELECT origem, destino, dev, ino, itens FROM explorer_work_moves WHERE session_id = ? AND chat_id = ?').get(sessionId, chatId) as Intencao | undefined
}
function itensDe(texto: string): Item[] {
  const valor: unknown = JSON.parse(texto)
  if (!Array.isArray(valor) || !valor.every(i => i && typeof i.artifactId === 'string' && typeof i.anterior === 'string' && typeof i.novo === 'string')) return recusar('Registro de movimento inválido; confira os arquivos.')
  return valor as Item[]
}
function dentro(raiz: string, alvo: string): boolean {
  const rel = path.relative(raiz, alvo)
  return !!rel && rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel)
}
function identificar(info: { dev: number; ino: number }, registro: Intencao): boolean {
  return String(info.dev) === registro.dev && String(info.ino) === registro.ino
}
async function verificar(caminho: string) {
  try { return await lstat(caminho) } catch (erro) { if ((erro as NodeJS.ErrnoException).code === 'ENOENT') return null; throw erro }
}

/** Chamar sob a fila da sessão, inclusive na recuperação após reinício. */
export async function recuperarMovimentoPrivadoSobFila(sessionId: string, chatId: string): Promise<void> {
  const intencao = obterIntencao(sessionId, chatId)
  if (!intencao) return
  const raiz = raizPrivadaDaConversa(sessionId, chatId)
  if (!dentro(raiz, intencao.origem) || !dentro(raiz, intencao.destino)) return recusar('Movimento pendente fora da raiz; confira os arquivos.')
  await garantirDiretorioReal(path.dirname(intencao.origem)); await garantirDiretorioReal(path.dirname(intencao.destino))
  let [origem, destino] = await Promise.all([verificar(intencao.origem), verificar(intencao.destino)])
  const db = getDatabase()
  if (origem?.isFile() && destino?.isFile() && !origem.isSymbolicLink() && !destino.isSymbolicLink() && identificar(origem, intencao) && identificar(destino, intencao)) {
    // O link exclusivo foi publicado, mas a origem ainda não foi removida.
    // Só concluímos quando ambas as entradas provam a identidade registrada.
    await unlink(intencao.origem)
    origem = await verificar(intencao.origem)
    destino = await verificar(intencao.destino)
  }
  if (origem && identificar(origem, intencao) && !destino) {
    // Não começou, ou o syscall falhou sem efeito.
    db.prepare('DELETE FROM explorer_work_moves WHERE session_id = ? AND chat_id = ?').run(sessionId, chatId)
    return
  }
  if (!origem && destino && !destino.isSymbolicLink() && identificar(destino, intencao)) {
    const itens = itensDe(intencao.itens)
    db.transaction(() => {
      for (const item of itens) {
        const atualizado = db.prepare("UPDATE attachment_working_files SET locator = ? WHERE artifact_id = ? AND session_id = ? AND chat_id = ? AND locator = ? AND state = 'pronto'")
          .run(item.novo, item.artifactId, sessionId, chatId, item.anterior)
        if (atualizado.changes !== 1) recusar('O vínculo mudou durante a recuperação; confira os arquivos.')
      }
      db.prepare('DELETE FROM explorer_work_moves WHERE session_id = ? AND chat_id = ?').run(sessionId, chatId)
    }).immediate()
    return
  }
  recusar('Não foi possível confirmar o movimento; confira origem e destino antes de continuar.')
}

/** Um vínculo pendente nunca pode ser lido pelo caminho anterior. */
export function trabalhoMarcadoAusente(sessionId: string, chatId: string, artifactId: string): boolean {
  return !!getDatabase().prepare('SELECT 1 FROM explorer_work_missing WHERE artifact_id = ? AND session_id = ? AND chat_id = ?').get(artifactId, sessionId, chatId)
}

export function trabalhoComMovimentoPendente(sessionId: string, chatId: string, artifactId: string): boolean {
  const pendente = obterIntencao(sessionId, chatId)
  if (!pendente) return false
  try { return itensDe(pendente.itens).some(item => item.artifactId === artifactId) } catch { return true }
}

export async function moverNoExplorerPrivado(sessionId: string, chatId: string, host: HostMovimento, from: `file://${string}`, to: `file://${string}`): Promise<void> {
  await withSessionPersistenceQueue(sessionId, async () => {
    if (resolverDonoAnexos(sessionId, chatId).contextKind !== 'chat') return recusar('O contexto da conversa mudou.')
    await recuperarMovimentoPrivadoSobFila(sessionId, chatId)
    const raiz = raizPrivadaDaConversa(sessionId, chatId)
    const origem = host.assertSafeUri(from), destino = host.assertSafeUri(to)
    if (!dentro(raiz, origem) || !dentro(raiz, destino)) return recusar('Não é permitido mover a raiz da conversa.')
    const info = await verificar(origem)
    if (!info || info.isSymbolicLink()) return recusar('A origem não está disponível.')
    if (await verificar(destino)) throw new PersistenceProblem(409, 'file_exists', 'O destino já existe; nada foi sobrescrito.')
    await garantirDiretorioReal(path.dirname(origem)); await garantirDiretorioReal(path.dirname(destino))
    const linhas = getDatabase().prepare("SELECT artifact_id AS artifactId, locator FROM attachment_working_files WHERE session_id = ? AND chat_id = ? AND state = 'pronto'").all(sessionId, chatId) as Array<{ artifactId: string; locator: string }>
    const itens: Item[] = []
    for (const linha of linhas) {
      if (trabalhoMarcadoAusente(sessionId, chatId, linha.artifactId)) continue
      const absoluto = path.resolve(raiz, linha.locator), abaixo = path.relative(origem, absoluto)
      if (!dentro(raiz, absoluto)) return recusar('Vínculo de trabalho inválido.')
      if (abaixo === '' || (abaixo !== '..' && !abaixo.startsWith(`..${path.sep}`) && !path.isAbsolute(abaixo))) {
        const novo = path.resolve(destino, abaixo)
        if (!dentro(raiz, novo)) return recusar('Destino de trabalho fora da conversa.')
        itens.push({ artifactId: linha.artifactId, anterior: linha.locator, novo: path.relative(raiz, novo) })
      }
    }
    const afetados = new Set(itens.map(item => item.artifactId))
    const ocupados = new Set(linhas.filter(l => !afetados.has(l.artifactId)).map(l => l.locator.toLowerCase()))
    if (itens.some(item => ocupados.has(item.novo.toLowerCase()))) return recusar('O destino já está vinculado a outro anexo; nada foi sobrescrito.')
    if (itens.length && (!Number.isSafeInteger(info.ino) || info.ino === 0)) return recusar('O sistema de arquivos não informou identidade suficiente para rastrear este movimento.')
    if (itens.length) getDatabase().prepare('INSERT INTO explorer_work_moves (session_id, chat_id, origem, destino, dev, ino, itens) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(sessionId, chatId, origem, destino, String(info.dev), String(info.ino), JSON.stringify(itens))
    try {
      // Para arquivo rastreado, link cria o destino EXCLUSIVAMENTE e nunca
      // substitui outro arquivo, inclusive em corrida após a checagem inicial.
      // A recuperação termina a retirada da origem depois de conferir o inode.
      if (itens.length && info.isFile()) await link(origem, destino)
      else await rename(origem, destino)
    } catch (erro) {
      if (itens.length && (erro as NodeJS.ErrnoException).code === 'EEXIST') {
        const ainda = await verificar(origem)
        if (ainda && String(ainda.dev) === String(info.dev) && String(ainda.ino) === String(info.ino)) {
          getDatabase().prepare('DELETE FROM explorer_work_moves WHERE session_id = ? AND chat_id = ?').run(sessionId, chatId)
        }
      } else if (itens.length) await recuperarMovimentoPrivadoSobFila(sessionId, chatId).catch(() => undefined)
      if ((erro as NodeJS.ErrnoException).code === 'EEXIST') throw new PersistenceProblem(409, 'file_exists', 'O destino já existe; nada foi sobrescrito.')
      throw erro
    }
    if (itens.length) await recuperarMovimentoPrivadoSobFila(sessionId, chatId)
  })
}

/** Marca os vínculos ANTES de remover. Falha ou interrupção pode deixar
 * trabalho não confirmado, mas nunca troca a fonte por um arquivo recriado. */
export async function excluirNoExplorerPrivado(sessionId: string, chatId: string, host: HostMovimento, uri: `file://${string}`, recursive: boolean): Promise<void> {
  await withSessionPersistenceQueue(sessionId, async () => {
    if (resolverDonoAnexos(sessionId, chatId).contextKind !== 'chat') return recusar('O contexto da conversa mudou.')
    await recuperarMovimentoPrivadoSobFila(sessionId, chatId)
    const raiz = raizPrivadaDaConversa(sessionId, chatId), alvo = host.assertSafeUri(uri)
    if (!dentro(raiz, alvo)) return recusar('Não é permitido excluir a raiz da conversa.')
    await garantirDiretorioReal(path.dirname(alvo))
    const info = await verificar(alvo)
    if (!info || info.isSymbolicLink()) return recusar('O alvo não está disponível.')
    if (info.isDirectory() && !recursive) return recusar('A exclusão da pasta exige confirmação recursiva.')
    const db = getDatabase()
    const linhas = db.prepare("SELECT artifact_id AS artifactId, locator FROM attachment_working_files WHERE session_id = ? AND chat_id = ? AND state = 'pronto'").all(sessionId, chatId) as Array<{ artifactId: string; locator: string }>
    const afetados = linhas.filter(linha => {
      const absoluto = path.resolve(raiz, linha.locator), relativo = path.relative(alvo, absoluto)
      if (!dentro(raiz, absoluto)) return recusar('Vínculo de trabalho inválido.')
      return relativo === '' || (relativo !== '..' && !relativo.startsWith(`..${path.sep}`) && !path.isAbsolute(relativo))
    })
    db.transaction(() => {
      const marcar = db.prepare('INSERT OR IGNORE INTO explorer_work_missing (artifact_id, session_id, chat_id) VALUES (?, ?, ?)')
      for (const linha of afetados) marcar.run(linha.artifactId, sessionId, chatId)
    }).immediate()
    try { await rm(alvo, { recursive, force: false }) } catch {
      // rm(recursive) pode ter efeito parcial. Não reata os vínculos nem
      // anuncia ausência de efeito: o usuário deve conferir a árvore.
      return recusar('A exclusão não foi confirmada e pode ter sido parcial. Confira a árvore; os vínculos afetados permanecem indisponíveis.')
    }
  })
}
