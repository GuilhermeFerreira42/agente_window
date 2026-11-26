// Vínculos entre upload privado imutável e arquivo de trabalho editável.
// As funções com sufixo SobFila exigem a fila persistente da sessão no chamador.
import { createHash, randomUUID } from 'node:crypto'
import { constants } from 'node:fs'
import { copyFile, link, lstat, mkdir, statfs, unlink } from 'node:fs/promises'
import path from 'node:path'
import { getDatabase } from '../database'
import { raizPrivadaDaConversa } from '../raizPrivadaChat'
import { recuperarMovimentoPrivadoSobFila, trabalhoComMovimentoPendente, trabalhoMarcadoAusente } from '../movimentoPrivado'
import { PersistenceProblem } from '../persistenceErrors'
import { listarArtigosChat } from './catalogo'
import { garantirDiretorioReal } from './contencao'
import { hashDeArquivo, lerArtigo } from './estoque'
import { carregarPolitica, problemaPolitica } from './politica'
import type { LinhaArtigo } from './schemaAnexos'

export interface VinculoTrabalho { artifactId: string; sessionId: string; chatId: string; locator: string; state: 'preparado' | 'pronto' }
const hash = (valor: string) => createHash('sha256').update(valor).digest('hex')
const sqlSelect = `SELECT artifact_id AS artifactId, session_id AS sessionId, chat_id AS chatId, locator, state FROM attachment_working_files WHERE artifact_id = ?`
export function obterVinculoTrabalho(artifactId: string): VinculoTrabalho | undefined {
  const vinculo = getDatabase().prepare(sqlSelect).get(artifactId) as VinculoTrabalho | undefined
  if (vinculo && (trabalhoMarcadoAusente(vinculo.sessionId, vinculo.chatId, artifactId) || trabalhoComMovimentoPendente(vinculo.sessionId, vinculo.chatId, artifactId))) return undefined
  return vinculo
}
function nomeAlternativo(nome: string, indice: number): string {
  if (!indice) return nome
  const ext = path.extname(nome)
  return `${nome.slice(0, nome.length - ext.length)} (${indice})${ext}`
}
function caminhoEtapa(artigo: LinhaArtigo): string {
  const raiz = raizPrivadaDaConversa(artigo.sessionId, artigo.chatId)
  return path.join(path.dirname(raiz), '.stages', path.basename(raiz), `${hash(artigo.artifactId)}.part`)
}
function seguro(nome: string): boolean { return !!nome && nome !== '.' && nome !== '..' && !/[\\/\0]/u.test(nome) }

/** Caminho vem do ledger e deve continuar contido na raiz da conversa. */
export function caminhoTrabalhoPrivado(vinculo: VinculoTrabalho): string {
  const raiz = raizPrivadaDaConversa(vinculo.sessionId, vinculo.chatId)
  const alvo = path.resolve(raiz, vinculo.locator)
  const relativo = path.relative(raiz, alvo)
  if (!relativo || relativo === '..' || relativo.startsWith(`..${path.sep}`) || path.isAbsolute(relativo)) throw new PersistenceProblem(409, 'source_unavailable', 'Vínculo de trabalho inválido.')
  return alvo
}

async function mesmaEtapa(stage: string, destino: string): Promise<boolean> {
  const [a, b] = await Promise.all([lstat(stage).catch(() => null), lstat(destino).catch(() => null)])
  return !!a && !!b && a.isFile() && b.isFile() && !a.isSymbolicLink() && !b.isSymbolicLink() && a.dev === b.dev && a.ino === b.ino
}

/** Vincula uma única vez. Um vínculo pronto nunca é recriado após exclusão. */
async function prepararArtigo(artigo: LinhaArtigo, raiz: string): Promise<void> {
  if (trabalhoMarcadoAusente(artigo.sessionId, artigo.chatId, artigo.artifactId)) return
  if (!seguro(artigo.name)) throw new PersistenceProblem(409, 'source_unavailable', 'Nome de trabalho inválido.')
  const db = getDatabase()
  let vinculo = obterVinculoTrabalho(artigo.artifactId)
  if (vinculo?.state === 'pronto') return
  if (vinculo && (vinculo.sessionId !== artigo.sessionId || vinculo.chatId !== artigo.chatId)) throw new PersistenceProblem(409, 'source_unavailable', 'Dono de trabalho divergente.')
  const stage = caminhoEtapa(artigo), pasta = path.dirname(stage)
  await garantirDiretorioReal(pasta); await mkdir(pasta, { recursive: true, mode: 0o700 }); await garantirDiretorioReal(pasta)
  if (!vinculo) {
    for (let indice = 0; indice < 10000; indice++) {
      const locator = nomeAlternativo(artigo.name, indice)
      if (await lstat(path.join(raiz, locator)).catch(() => null)) continue
      try {
        db.prepare("INSERT INTO attachment_working_files (artifact_id, session_id, chat_id, locator, state) VALUES (?, ?, ?, ?, 'preparado')").run(artigo.artifactId, artigo.sessionId, artigo.chatId, locator)
        vinculo = obterVinculoTrabalho(artigo.artifactId)
        break
      } catch (erro) {
        if (!(erro instanceof Error) || !erro.message.includes('UNIQUE constraint failed')) throw erro
      }
    }
  }
  if (!vinculo) throw new PersistenceProblem(409, 'source_unavailable', 'Não foi possível reservar um nome de trabalho.')
  let etapa = await lstat(stage).catch(() => null)
  if (!etapa) {
    const original = await lerArtigo(artigo.artifactId)
    const politica = carregarPolitica()
    if (!politica.ok) { const e = problemaPolitica(politica); throw new PersistenceProblem(e.status, e.code, e.message) }
    const volume = await statfs(pasta)
    if (volume.bavail * volume.bsize - artigo.bytes < politica.politica.reservaDiscoBytes) throw new PersistenceProblem(507, 'insufficient_storage', 'Não há espaço para a versão de trabalho.')
    const temporario = `${stage}.${randomUUID()}.tmp`
    try {
      await copyFile(original.caminho, temporario, constants.COPYFILE_EXCL)
      const info = await lstat(temporario)
      if (!info.isFile() || info.isSymbolicLink() || info.size !== artigo.bytes || await hashDeArquivo(temporario) !== artigo.sha256) {
        throw new PersistenceProblem(409, 'source_unavailable', 'O original mudou ao preparar a versão de trabalho.')
      }
      try { await link(temporario, stage) } catch (erro) { if ((erro as NodeJS.ErrnoException).code !== 'EEXIST') throw erro }
    } finally { await unlink(temporario).catch(() => undefined) }
    etapa = await lstat(stage)
  }
  if (!etapa.isFile() || etapa.isSymbolicLink() || etapa.size !== artigo.bytes || await hashDeArquivo(stage) !== artigo.sha256) throw new PersistenceProblem(409, 'source_unavailable', 'Etapa de trabalho não confere; nenhum arquivo foi substituído.')
  for (let indice = 0; indice < 10000; indice++) {
    const destino = caminhoTrabalhoPrivado(vinculo)
    if (!(await mesmaEtapa(stage, destino))) {
      try { await link(stage, destino) } catch (erro) {
        if ((erro as NodeJS.ErrnoException).code !== 'EEXIST') throw erro
        let atualizado = false
        for (let candidato = indice + 1; candidato < 10000; candidato++) {
          const nome = nomeAlternativo(artigo.name, candidato)
          if (await lstat(path.join(raiz, nome)).catch(() => null)) continue
          try {
            db.prepare("UPDATE attachment_working_files SET locator = ? WHERE artifact_id = ? AND state = 'preparado'").run(nome, artigo.artifactId)
            vinculo = obterVinculoTrabalho(artigo.artifactId)!
            atualizado = true
            break
          } catch (e) { if (!(e instanceof Error) || !e.message.includes('UNIQUE constraint failed')) throw e }
        }
        if (!atualizado) throw new PersistenceProblem(409, 'source_unavailable', 'Não foi possível publicar a versão de trabalho.')
        continue
      }
    }
    db.prepare("UPDATE attachment_working_files SET state = 'pronto' WHERE artifact_id = ? AND state = 'preparado'").run(artigo.artifactId)
    await unlink(stage).catch(() => undefined)
    return
  }
  throw new PersistenceProblem(409, 'source_unavailable', 'Não foi possível publicar a versão de trabalho.')
}

/** Migra uploads verificáveis, mas não torna uma falha em arquivo falso positivo. */
export async function sincronizarTrabalhosPrivadosSobFila(sessionId: string, chatId: string): Promise<void> {
  await recuperarMovimentoPrivadoSobFila(sessionId, chatId)
  const raiz = raizPrivadaDaConversa(sessionId, chatId)
  await garantirDiretorioReal(raiz); await mkdir(raiz, { recursive: true, mode: 0o700 }); await garantirDiretorioReal(raiz)
  const artigos = listarArtigosChat(sessionId, chatId).filter(a => a.rootKind === 'appdir' && a.mode === 'copy' && a.papel === 'upload-chat')
  for (const artigo of artigos) await prepararArtigo(artigo, raiz).catch(() => undefined)
}
