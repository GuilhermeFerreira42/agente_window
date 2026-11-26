// Exclusão retomável da árvore privada inteira, incluindo arquivos criados
// diretamente no Explorer. Nunca remove arquivos permanentemente.
import { lstat } from 'node:fs/promises'
import path from 'node:path'
import { getDatabase } from './database'
import { raizPrivadaDaConversa } from './raizPrivadaChat'
import { garantirDiretorioReal } from './attachments/contencao'
import { lixeiraDoSistema } from './attachments/lixeira'
import type { OpcoesLimpeza } from './attachments/limpeza'

interface Plano { state: 'preparado' | 'movendo' | 'concluido'; dev: string; ino: string; destino: string | null }
const id = (info: { dev: number; ino: number }) => [String(info.dev), String(info.ino)] as const

export async function limparRaizPrivadaDaSessao(sessionId: string, opcoes: OpcoesLimpeza = {}): Promise<boolean> {
  const db = getDatabase()
  const raiz = path.dirname(raizPrivadaDaConversa(sessionId, 'identidade-interna'))
  const obter = () => db.prepare('SELECT state, dev, ino, destino FROM explorer_cleanup WHERE session_id = ?').get(sessionId) as Plano | undefined
  const concluir = db.transaction((destino: string | null) => {
    db.prepare("UPDATE explorer_cleanup SET state = 'concluido', destino = ? WHERE session_id = ?").run(destino, sessionId)
    db.prepare('DELETE FROM attachment_working_files WHERE session_id = ?').run(sessionId)
    db.prepare('DELETE FROM explorer_work_moves WHERE session_id = ?').run(sessionId)
    db.prepare('DELETE FROM explorer_work_missing WHERE session_id = ?').run(sessionId)
  })
  let plano = obter()
  if (plano?.state === 'concluido') return true
  // Checa toda a cadeia; recusa link/junction em qualquer componente.
  try { await garantirDiretorioReal(raiz) } catch { return false }
  const atual = await lstat(raiz).catch(() => null)
  if (!plano) {
    if (!atual) return true
    if (!atual.isDirectory() || atual.isSymbolicLink()) return false
    const [dev, ino] = id(atual)
    db.prepare("INSERT INTO explorer_cleanup (session_id, state, dev, ino, destino) VALUES (?, 'preparado', ?, ?, NULL)").run(sessionId, dev, ino)
    plano = obter()!
  }
  if (!atual) {
    // Depois de falha no meio da movimentação, só fecha se o destino conhecido
    // comprova a mesma identidade. Sem prova, mantém exclusão pendente.
    if (!plano.destino) return false
    const destino = await lstat(plano.destino).catch(() => null)
    if (!destino || id(destino)[0] !== plano.dev || id(destino)[1] !== plano.ino) return false
    concluir(plano.destino)
    return true
  }
  if (!atual.isDirectory() || atual.isSymbolicLink() || id(atual)[0] !== plano.dev || id(atual)[1] !== plano.ino) return false
  db.prepare("UPDATE explorer_cleanup SET state = 'movendo' WHERE session_id = ?").run(sessionId)
  const resultado = await (opcoes.lixeira ?? lixeiraDoSistema).mover(raiz, opcoes.lixeiraOpcoes)
  if (resultado.ok) {
    concluir(resultado.destino ?? null)
    return true
  }
  db.prepare('UPDATE explorer_cleanup SET state = ?, destino = ? WHERE session_id = ?')
    .run(resultado.efeitoIniciado ? 'movendo' : 'preparado', resultado.destino ?? null, sessionId)
  return false
}
