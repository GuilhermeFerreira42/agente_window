/**
 * P-B Evidência 4 — child de teste: reconcilia a intenção pendente de uma
 * sessão em um processo NOVO (o processo que publicou foi morto com SIGKILL)
 * e grava um relatório JSON com o estado resultante para o parent assertar.
 */
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import { reconciliarPublicacao } from '../publicacaoRecuperavel'
import { getDatabase } from '../database'
import { digestTranscriptFile } from '../transcripts'

const sessionId = process.env.PB_SESSION_ID ?? ''
const relatorio = process.env.PB_RELATORIO ?? ''
if (!sessionId || !relatorio) { console.error('PB_SESSION_ID/PB_RELATORIO ausentes'); process.exit(2) }

async function main(): Promise<void> {
  const diag = process.env.PB_DIAG ?? ''
  const marcar = (fase: string) => { if (diag) appendFileSync(diag, `${new Date().toISOString()} rec:${fase}\n`) }
  marcar('inicio')
  const destino = process.env.PB_DESTINO
  let resultado: string
  try {
    resultado = await reconciliarPublicacao(sessionId)
    marcar(`reconciliou:${resultado}`)
  } catch (error) {
    resultado = `erro:${error instanceof Error ? error.message : String(error)}`
    marcar(`erro:${resultado}`)
  }
  const connection = getDatabase()
  const row = connection.prepare('SELECT session_json FROM sessions WHERE id=?').get(sessionId) as { session_json: string } | undefined
  const ack = connection.prepare('SELECT mutation_id AS mutationId, revision, digest FROM session_persistence_receipts WHERE session_id=?').get(sessionId)
  const restantes = connection.prepare('SELECT COUNT(*) AS n FROM session_write_intents WHERE session_id=?').get(sessionId) as { n: number }
  const destDigest = destino ? await digestTranscriptFile(destino).catch(() => null) : null
  const stageDigest = process.env.PB_STAGE ? await digestTranscriptFile(process.env.PB_STAGE).catch(() => null) : null
  marcar('gravando-relatorio')
  writeFileSync(relatorio, JSON.stringify({
    resultado,
    intentsRestantes: restantes.n,
    titulo: row ? (JSON.parse(row.session_json) as { title: string }).title : null,
    revision: row ? ((JSON.parse(row.session_json) as { persistenceRevision?: number }).persistenceRevision ?? 0) : null,
    ack,
    destDigest,
    stageDigest,
    destLido: destino ? (() => { try { return readFileSync(destino).length } catch { return null } })() : null,
  }))
  marcar('fim')
  process.exit(0)
}

main().catch(error => { console.error(error); process.exit(6) })
