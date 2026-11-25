// ============================================================================
// C-3b — Cliente da rota de mídia passiva.
//
// Duas coisas vivem aqui, e só elas:
//   1. a CONSTRUÇÃO da URL escopada (o domínio não monta URL — regra dura);
//   2. o download do artefato pelo endpoint existente, com nome original.
//
// Não há fetch de bytes para memória: player nativo consome a URL com Range.
// ============================================================================

/** URL da rota de mídia com Range/HEAD. `null` sem sessão/chat/artefato. */
export function urlDeMidia(
  sessionId: string | null,
  chatId: string | null,
  artifactId: string | null,
): string | null {
  if (!sessionId || !chatId || !artifactId) return null
  return `/api/sessions/${encodeURIComponent(sessionId)}/chats/${encodeURIComponent(chatId)}`
    + `/attachments/${encodeURIComponent(artifactId)}/media`
}

/** URL de download (rota legada da C-3a, `?download=1`). */
export function urlDeDownload(
  sessionId: string | null,
  chatId: string | null,
  artifactId: string | null,
): string | null {
  if (!sessionId || !chatId || !artifactId) return null
  return `/api/sessions/${encodeURIComponent(sessionId)}/chats/${encodeURIComponent(chatId)}`
    + `/attachments/${encodeURIComponent(artifactId)}?download=1`
}

/**
 * Baixa o artefato preservando o NOME ORIGINAL no disco do usuário.
 *
 * O browser decide o diretório — o produto não promete `~/Downloads` nem abre
 * diálogo nativo de caminho (R11).
 */
export async function baixarArtefato(
  sessionId: string,
  chatId: string,
  artifactId: string,
  nome: string,
): Promise<void> {
  const url = urlDeDownload(sessionId, chatId, artifactId)
  if (!url) throw new Error('Identidade de artefato incompleta para download.')
  const resposta = await fetch(url)
  if (!resposta.ok) {
    throw new Error(`O download falhou (HTTP ${resposta.status}). O arquivo pode ter sido alterado ou removido.`)
  }
  const blob = await resposta.blob()
  const urlTemporaria = URL.createObjectURL(blob)
  try {
    const ancora = document.createElement('a')
    ancora.href = urlTemporaria
    ancora.download = nome
    ancora.rel = 'noopener'
    document.body.appendChild(ancora)
    ancora.click()
    ancora.remove()
  } finally {
    // Revogar sempre: URL de Blob viva é vazamento de memória.
    URL.revokeObjectURL(urlTemporaria)
  }
}
