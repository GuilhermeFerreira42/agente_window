// C-3a — ciclo de vida dos anexos na exclusão da conversa (T27/T28/T29):
// o plano é registrado ANTES de apagar o catálogo que prova ownership;
// cópia da conversa só sai com hash+ownership confirmados; referência de
// projeto NUNCA toca o arquivo original do usuário. Idempotente e retomável.
import { lstat, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { getAppDir } from '../paths'
import { getDatabase } from '../database'
import {
  inserirPlanoLimpeza, listarArtigosChat, marcarPlano, planosPendentes, removerArtigosChatCompleto,
} from './catalogo'
import { hashDeArquivo, removerVazioDescendente } from './estoque'

/** Captura o ownership de TODOS os artefatos do chat no plano (antes de destruir). */
export function registrarPlanoAnexos(sessionId: string): void {
  const db = getDatabase()
  const chats = db.prepare('SELECT DISTINCT chat_id FROM attachment_artifacts WHERE session_id = ?').all(sessionId) as Array<{ chat_id: string }>
  for (const { chat_id: chatId } of chats) {
    for (const artigo of listarArtigosChat(sessionId, chatId)) {
      const alvo = artigo.mode === 'reference' ? 'referencia' as const
        : artigo.rootKind === 'workspace' ? 'workspace-copy' as const
        : 'chat-copy' as const
      inserirPlanoLimpeza({
        sessionId, artifactId: artigo.artifactId, alvo, locator: artigo.locator,
        rootKind: artigo.rootKind, workspaceRoot: artigo.workspaceRoot, sha256: artigo.sha256,
      })
    }
  }
}

async function removerSeConfirmado(linha: ReturnType<typeof planosPendentes>[number]): Promise<boolean> {
  if (linha.alvo === 'referencia') {
    // T29 — referência é metadado: o arquivo original do usuário fica intacto.
    return true
  }
  if (linha.alvo === 'workspace-copy') {
    // E06/T29 — cópia na raiz ORIGINAL do workspace pertence ao território do
    // usuário: a exclusão do Chat remove o registro, nunca o arquivo dele.
    return true
  }
  const absoluto = linha.rootKind === 'workspace' && linha.workspaceRoot
    ? path.resolve(linha.workspaceRoot, linha.locator)
    : path.join(getAppDir(), 'uploads', linha.locator)

  // Ownership estrito: a cópia privada precisa estar sob a raiz da conversa;
  // a cópia de workspace, sob <raiz>/uploads/ — nunca um caminho qualquer.
  const raizEsperada = linha.rootKind === 'workspace' && linha.workspaceRoot
    ? path.join(path.resolve(linha.workspaceRoot), 'uploads')
    : path.join(getAppDir(), 'uploads', 'chats')
  const dentro = absoluto.startsWith(raizEsperada + path.sep)
  if (!dentro) return false

  const info = await lstat(absoluto).catch(() => null)
  if (!info) return true // já ausente: limpeza idempotente
  if (info.isSymbolicLink()) return false // nunca seguir/apagar link alheio
  if (!info.isFile()) return false

  if (linha.sha256) {
    const hash = await hashDeArquivo(absoluto)
    if (hash !== linha.sha256) return false // T28: conteúdo divergente preservado
  }
  await rm(absoluto, { force: true })
  await removerVazioDescendente(absoluto, raizEsperada)
  return true
}

/**
 * Executa o plano registrado (retomável): arquivos → ledger → plano.
 * Falha de um item nunca apaga evidência: a linha do plano fica `falhou`.
 */
export async function executarPlanoAnexos(sessionId: string): Promise<void> {
  const linhas = planosPendentes(sessionId)
  for (const linha of linhas) {
    if (linha.state === 'concluido') continue
    try {
      const ok = await removerSeConfirmado(linha)
      marcarPlano(linha.artifactId, ok ? 'concluido' : 'falhou')
    } catch {
      marcarPlano(linha.artifactId, 'falhou')
    }
  }
  // Stages privados da sessão inteira (área identificada do journal).
  const raizStages = path.join(getAppDir(), 'uploads', 'stages', sessionId)
  const infoStages = await stat(raizStages).catch(() => null)
  if (infoStages?.isDirectory()) await rm(raizStages, { recursive: true, force: true }).catch(() => undefined)
  // Catálogo do dono só depois que o plano provou ownership de cada alvo.
  removerArtigosChatCompleto(sessionId)
  // Linhas concluídas saem; `falhou` fica como evidência honesta da limpeza.
  getDatabase().prepare('DELETE FROM attachment_cleanup_plan WHERE session_id = ? AND state != ?')
    .run(sessionId, 'falhou')
}
