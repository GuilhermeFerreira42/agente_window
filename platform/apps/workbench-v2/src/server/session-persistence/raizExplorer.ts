// Raiz de trabalho mediada por identidade persistida, nunca por caminho do cliente.
// Não concede acesso a ferramentas genéricas e não é um sandbox físico.
import { mkdir } from 'node:fs/promises'
import { getSessionRecord } from './database'
import { withSessionPersistenceQueue } from './filaSessao'
import { raizPrivadaDaConversa } from './raizPrivadaChat'
import { PersistenceProblem } from './persistenceErrors'
import { validateWorkspacePath } from './workspaces'
import { resolverDonoAnexos } from './attachments/dono'
import { garantirDiretorioReal } from './attachments/contencao'
import { sincronizarTrabalhosPrivadosSobFila } from './attachments/trabalhoPrivado'

export type RaizExplorer = { tipo: 'chat' | 'projeto'; raiz: string }

/**
 * Chamada depois de validar a sessão e seu chat persistido. A raiz privada é
 * diferente do estoque histórico de uploads: edits nunca alteram originais.
 * O projeto é a pasta escolhida, compartilhada mesmo com worktrees distintos.
 */
export async function resolverRaizExplorer(sessionId: string, chatId: string): Promise<RaizExplorer> {
  if (!sessionId || sessionId.length > 200 || !chatId || chatId.length > 200) {
    throw new PersistenceProblem(400, 'invalid_context', 'Identidade da conversa inválida.')
  }
  return withSessionPersistenceQueue(sessionId, async () => {
    const dono = resolverDonoAnexos(sessionId, chatId)
    if (dono.contextKind === 'workspace') {
      const registro = getSessionRecord(sessionId)
      const projeto = registro?.workspacePath && validateWorkspacePath(registro.workspacePath)
      if (!projeto || !projeto.valid || !projeto.exists || !projeto.isDir) {
        throw new PersistenceProblem(409, 'session_context_mismatch', 'A pasta do projeto não está acessível.')
      }
      return { tipo: 'projeto', raiz: projeto.realpath }
    }
    const raiz = raizPrivadaDaConversa(sessionId, chatId)
    await garantirDiretorioReal(raiz)
    await mkdir(raiz, { recursive: true, mode: 0o700 })
    await garantirDiretorioReal(raiz)
    await sincronizarTrabalhosPrivadosSobFila(sessionId, chatId)
    // Exclusão é revalidada antes de devolver o diretório.
    resolverDonoAnexos(sessionId, chatId)
    return { tipo: 'chat', raiz }
  })
}
