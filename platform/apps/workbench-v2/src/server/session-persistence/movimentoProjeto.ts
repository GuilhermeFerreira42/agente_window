// Vínculo de trabalho das cópias de projeto, compartilhado por todas as
// conversas que apontam à mesma raiz. Não modifica o ledger histórico.
import { link, lstat, rename, rm, unlink } from 'node:fs/promises'
import path from 'node:path'
import { getDatabase, getSessionRecord } from './database'
import { withSessionPersistenceQueue } from './filaSessao'
import { PersistenceProblem } from './persistenceErrors'
import { renomearDiretorioExclusivo } from './renomearDiretorioExclusivo'
import { validateWorkspacePath } from './workspaces'
import { resolverDonoAnexos } from './attachments/dono'
import { garantirDiretorioReal } from './attachments/contencao'
import { obterArtigo } from './attachments/catalogo'
import { preservarOriginalHistorico } from './attachments/originalHistorico'
import type { LinhaArtigo } from './attachments/schemaAnexos'

type Item = { artifactId: string; sessionId: string; chatId: string; anterior: string; novo: string }
type Registro = { origem: string; destino: string; dev: string; ino: string; itens: string }
type Fonte = { artifactId: string; sessionId: string; chatId: string; locator: string; missing: number }
type Host = { assertSafeUri(uri: `file://${string}`): string }
const filas = new Map<string, Promise<void>>()
export function comFilaProjeto<T>(raiz: string, operacao: () => Promise<T>): Promise<T> {
  const anterior = filas.get(raiz) ?? Promise.resolve()
  let liberar!: () => void
  const bloqueio = new Promise<void>(resolve => { liberar = resolve })
  const cauda = anterior.then(() => bloqueio, () => bloqueio)
  filas.set(raiz, cauda)
  void cauda.then(() => { if (filas.get(raiz) === cauda) filas.delete(raiz) })
  return anterior.catch(() => undefined).then(operacao).finally(liberar)
}
function recusar(message: string): never { throw new PersistenceProblem(409, 'work_move_unavailable', message) }
function dentro(raiz: string, alvo: string): boolean {
  const rel = path.relative(raiz, alvo)
  return !!rel && rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel)
}
async function verificar(caminho: string) {
  try { return await lstat(caminho, { bigint: true }) } catch (erro) { if ((erro as NodeJS.ErrnoException).code === 'ENOENT') return null; throw erro }
}
function fontes(raiz: string): Fonte[] {
  return getDatabase().prepare(`SELECT a.artifact_id AS artifactId, a.session_id AS sessionId, a.chat_id AS chatId,
    COALESCE(w.locator, a.locator) AS locator, COALESCE(w.missing, 0) AS missing
    FROM attachment_artifacts a LEFT JOIN explorer_project_work w ON w.artifact_id = a.artifact_id
    WHERE a.root_kind = 'workspace' AND a.workspace_root = ? AND a.mode = 'copy' AND a.papel = 'upload-workspace' AND a.state = 'pronto'`).all(raiz) as Fonte[]
}
function parseItens(bruto: string): Item[] {
  const itens: unknown = JSON.parse(bruto)
  if (!Array.isArray(itens) || !itens.every(i => i && ['artifactId', 'sessionId', 'chatId', 'anterior', 'novo'].every(k => typeof i[k] === 'string'))) return recusar('Registro de movimento inválido; confira os arquivos.')
  return itens as Item[]
}
async function recuperar(raiz: string): Promise<void> {
  const db = getDatabase()
  const mov = db.prepare('SELECT origem, destino, dev, ino, itens FROM explorer_project_moves WHERE root = ?').get(raiz) as Registro | undefined
  if (!mov) return
  if (!dentro(raiz, mov.origem) || !dentro(raiz, mov.destino)) return recusar('Movimento pendente fora do projeto.')
  await garantirDiretorioReal(path.dirname(mov.origem)); await garantirDiretorioReal(path.dirname(mov.destino))
  let [origem, destino] = await Promise.all([verificar(mov.origem), verificar(mov.destino)])
  const identidade = (info: { dev: bigint; ino: bigint }) => String(info.dev) === mov.dev && String(info.ino) === mov.ino
  if (origem?.isFile() && destino?.isFile() && !origem.isSymbolicLink() && !destino.isSymbolicLink() && identidade(origem) && identidade(destino)) {
    await unlink(mov.origem); origem = await verificar(mov.origem); destino = await verificar(mov.destino)
  }
  if (origem && identidade(origem) && !destino) {
    db.transaction(() => {
      db.prepare('DELETE FROM explorer_project_moves WHERE root = ?').run(raiz)
      db.prepare('DELETE FROM explorer_project_work WHERE root = ? AND NOT EXISTS (SELECT 1 FROM attachment_artifacts a WHERE a.artifact_id = explorer_project_work.artifact_id)').run(raiz)
    }).immediate()
    return
  }
  if (!origem && destino && !destino.isSymbolicLink() && identidade(destino)) {
    const itens = parseItens(mov.itens)
    db.transaction(() => {
      for (const item of itens) {
        const result = db.prepare('UPDATE explorer_project_work SET locator = ? WHERE artifact_id = ? AND session_id = ? AND chat_id = ? AND root = ? AND locator = ? AND missing = 0')
          .run(item.novo, item.artifactId, item.sessionId, item.chatId, raiz, item.anterior)
        if (result.changes !== 1) recusar('O vínculo mudou durante a recuperação; confira os arquivos.')
      }
      db.prepare('DELETE FROM explorer_project_moves WHERE root = ?').run(raiz)
      db.prepare('DELETE FROM explorer_project_work WHERE root = ? AND NOT EXISTS (SELECT 1 FROM attachment_artifacts a WHERE a.artifact_id = explorer_project_work.artifact_id)').run(raiz)
    }).immediate()
    return
  }
  recusar('Não foi possível confirmar o movimento no projeto; confira origem e destino.')
}
function validarRaiz(sessionId: string, chatId: string, raiz: string): void {
  if (resolverDonoAnexos(sessionId, chatId).contextKind !== 'workspace') return recusar('O contexto da conversa mudou.')
  const registro = getSessionRecord(sessionId)
  const validada = registro?.workspacePath && validateWorkspacePath(registro.workspacePath)
  if (!validada || !validada.valid || !validada.exists || !validada.isDir || validada.realpath !== raiz) return recusar('A raiz do projeto mudou.')
}
function selecionar(raiz: string, alvo: string): Fonte[] {
  return fontes(raiz).filter(f => {
    if (f.missing) return false
    const absoluto = path.resolve(raiz, f.locator), rel = path.relative(alvo, absoluto)
    if (!dentro(raiz, absoluto)) return recusar('Vínculo do projeto inválido.')
    return rel === '' || (rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel))
  })
}
function recusarTransferenciaAtiva(raiz: string, ...alvos: string[]): void {
  const linhas = getDatabase().prepare("SELECT stage_path AS stage, final_path AS final FROM attachment_uploads WHERE workspace_root = ? AND state IN ('admitido', 'recebendo', 'preparado')").all(raiz) as Array<{ stage: string | null; final: string | null }>
  for (const linha of linhas) for (const caminho of [linha.stage, linha.final]) {
    if (caminho && alvos.some(alvo => path.resolve(alvo) === path.resolve(caminho) || dentro(alvo, caminho))) {
      throw new PersistenceProblem(409, 'upload_in_flight', 'Há transferência em andamento nesta pasta. Conclua ou cancele antes de mover ou excluir.')
    }
  }
}
function inserirVinculos(raiz: string, itens: Fonte[]): void {
  const inserir = getDatabase().prepare('INSERT OR IGNORE INTO explorer_project_work (artifact_id, session_id, chat_id, root, locator, missing) VALUES (?, ?, ?, ?, ?, 0)')
  for (const item of itens) inserir.run(item.artifactId, item.sessionId, item.chatId, raiz, item.locator)
}

async function preservarLegados(raiz: string, afetados: Fonte[]): Promise<void> {
  // Legados ainda íntegros ganham cópia histórica antes da operação. Se o
  // original já foi alterado, não inventamos os bytes que faltam.
  for (const item of afetados) {
    const artigo = obterArtigo(item.artifactId)
    if (!artigo) return recusar('O vínculo do anexo não está disponível.')
    try { await preservarOriginalHistorico(artigo, path.resolve(raiz, item.locator), raiz) } catch (erro) {
      if (!(erro instanceof PersistenceProblem) || !['attachment_original_absent', 'attachment_original_changed'].includes(erro.code)) throw erro
    }
  }
}

/** Chamador já está sob a fila da sessão e validou o dono do artefato. */
export async function usarTrabalhoProjeto<T>(artigo: LinhaArtigo, operacao: (caminho: string) => Promise<T>): Promise<T> {
  const raiz = artigo.workspaceRoot
  if (!raiz) return recusar('Projeto indisponível.')
  return comFilaProjeto(raiz, async () => {
    await recuperar(raiz)
    const vinculo = getDatabase().prepare('SELECT root, locator, missing FROM explorer_project_work WHERE artifact_id = ? AND session_id = ? AND chat_id = ?').get(artigo.artifactId, artigo.sessionId, artigo.chatId) as { root: string; locator: string; missing: number } | undefined
    if (vinculo && (vinculo.root !== raiz || vinculo.missing)) return recusar('O arquivo de trabalho foi excluído ou está indisponível.')
    const alvo = path.resolve(raiz, vinculo?.locator ?? artigo.locator)
    if (!dentro(raiz, alvo)) return recusar('Vínculo do projeto inválido.')
    return operacao(alvo)
  })
}

export async function moverNoExplorerProjeto(sessionId: string, chatId: string, raiz: string, host: Host, from: `file://${string}`, to: `file://${string}`): Promise<void> {
  await withSessionPersistenceQueue(sessionId, () => comFilaProjeto(raiz, async () => {
    validarRaiz(sessionId, chatId, raiz); await recuperar(raiz)
    const origem = host.assertSafeUri(from), destino = host.assertSafeUri(to)
    if (!dentro(raiz, origem) || !dentro(raiz, destino)) return recusar('Não é permitido mover a raiz do projeto.')
    recusarTransferenciaAtiva(raiz, origem, destino)
    await garantirDiretorioReal(path.dirname(origem)); await garantirDiretorioReal(path.dirname(destino))
    const info = await verificar(origem)
    if (!info || info.isSymbolicLink()) return recusar('A origem não está disponível.')
    if (await verificar(destino)) throw new PersistenceProblem(409, 'file_exists', 'O destino já existe; nada foi sobrescrito.')
    const afetados = selecionar(raiz, origem)
    await preservarLegados(raiz, afetados)
    if (afetados.length && info.ino === 0n) return recusar('O sistema de arquivos não informou identidade suficiente para rastrear este movimento.')
    const itens = afetados.map(f => ({ ...f, anterior: f.locator, novo: path.relative(raiz, path.resolve(destino, path.relative(origem, path.resolve(raiz, f.locator)))) }))
    if (itens.some(i => !dentro(raiz, path.resolve(raiz, i.novo)))) return recusar('Destino fora do projeto.')
    const db = getDatabase()
    if (itens.length) db.transaction(() => {
      inserirVinculos(raiz, afetados)
      db.prepare('INSERT INTO explorer_project_moves (root, origem, destino, dev, ino, itens) VALUES (?, ?, ?, ?, ?, ?)')
        .run(raiz, origem, destino, String(info.dev), String(info.ino), JSON.stringify(itens))
    }).immediate()
    try {
      if (itens.length && info.isFile()) await link(origem, destino)
      else if (info.isDirectory()) await renomearDiretorioExclusivo(origem, destino)
      else await rename(origem, destino)
    } catch (erro) {
      if (itens.length && (erro as NodeJS.ErrnoException).code === 'EEXIST') {
        const ainda = await verificar(origem)
        if (ainda && ainda.dev === info.dev && ainda.ino === info.ino) db.prepare('DELETE FROM explorer_project_moves WHERE root = ?').run(raiz)
      } else if (itens.length) await recuperar(raiz).catch(() => undefined)
      if ((erro as NodeJS.ErrnoException).code === 'EEXIST') throw new PersistenceProblem(409, 'file_exists', 'O destino já existe; nada foi sobrescrito.')
      throw erro
    }
    if (itens.length) await recuperar(raiz)
  }))
}

export async function excluirNoExplorerProjeto(sessionId: string, chatId: string, raiz: string, host: Host, uri: `file://${string}`, recursive: boolean): Promise<void> {
  await withSessionPersistenceQueue(sessionId, () => comFilaProjeto(raiz, async () => {
    validarRaiz(sessionId, chatId, raiz); await recuperar(raiz)
    const alvo = host.assertSafeUri(uri)
    if (!dentro(raiz, alvo)) return recusar('Não é permitido excluir a raiz do projeto.')
    recusarTransferenciaAtiva(raiz, alvo)
    await garantirDiretorioReal(path.dirname(alvo))
    const info = await verificar(alvo)
    if (!info || info.isSymbolicLink()) return recusar('O alvo não está disponível.')
    if (info.isDirectory() && !recursive) return recusar('A exclusão da pasta exige confirmação recursiva.')
    const afetados = selecionar(raiz, alvo), db = getDatabase()
    await preservarLegados(raiz, afetados)
    db.transaction(() => {
      inserirVinculos(raiz, afetados)
      const marcar = db.prepare('UPDATE explorer_project_work SET missing = 1 WHERE artifact_id = ? AND root = ?')
      for (const item of afetados) marcar.run(item.artifactId, raiz)
    }).immediate()
    try { await rm(alvo, { recursive, force: false }) } catch { return recusar('A exclusão não foi confirmada e pode ter sido parcial. Confira a árvore; os vínculos afetados permanecem indisponíveis.') }
  }))
}
