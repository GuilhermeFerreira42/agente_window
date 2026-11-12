interface HistoryAccess { status: 'observed' | 'needs_consent' | 'consented'; title: string; project: string; token?: string }
async function requestHistoryAccess(body: object) {
  const response = await fetch('/api/sessions/history-access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!response.ok) throw new Error('A conversa, o projeto ou a confirmação mudou. Abra novamente Gerenciar acesso histórico.')
  return response.json()
}
export async function manageHistoryAccess(sessionId: string, chatId: string, ui: { confirm(text: string): boolean; notify(text: string): void }): Promise<void> {
  try {
    const prepared = await requestHistoryAccess({ acao: 'preparar', sessionId, chatId }) as HistoryAccess
    if (prepared.status === 'observed') { ui.notify('Esta conversa já tem origem comprovada. Pode ser consultada por pedido explícito em outros chats do mesmo projeto.'); return }
    const revoke = prepared.status === 'consented'
    const question = revoke ? `Revogar a autorização de consulta da conversa “${prepared.title}” em outros chats deste projeto?\n${prepared.project}\n\nIsso impede novas consultas; não apaga respostas já enviadas.`
      : `Autorizar a leitura da conversa antiga “${prepared.title}” por pedidos explícitos em outros chats SOMENTE deste projeto?\n${prepared.project}\n\nO histórico original será preservado. Isso não autoriza comandos nem alterações de arquivos, não libera outros chats antigos e pode ser revogado neste menu.`
    if (!prepared.token || !ui.confirm(question)) return
    await requestHistoryAccess({ acao: 'confirmar', token: prepared.token })
    ui.notify(revoke ? 'Autorização histórica revogada. O histórico original foi preservado.' : 'Consulta desta conversa autorizada somente neste projeto. Envie novamente o pedido no outro chat.')
  } catch { ui.notify('Não foi possível gerenciar o acesso histórico. A conversa, o projeto ou a confirmação mudou ou está indisponível. Abra novamente o menu.') }
}
