// ============================================================================
// FATIA 10 (C4) — sanar cartões depois do F5.
// Cartões 'aguardando' ou de decisão de timeout que sobrevivem ao F5 nunca
// mais serão respondidos: o fluxo/processo no servidor morreu com a página.
// Deixá-los clicáveis seria uma promessa falsa; todos viram 'expirado'.
// ============================================================================
import type { Session } from '../../types'

export function sanarCartoesDeSessao(sessao: Session): Session {
  return {
    ...sessao,
    chats: sessao.chats.map((chat) => ({
      ...chat,
      messages: chat.messages.map((mensagem) =>
        mensagem.ferramentas?.some((carta) => carta.status === 'aguardando' || carta.status === 'aguardando_continuacao')
          ? {
              ...mensagem,
              ferramentas: mensagem.ferramentas.map((carta) =>
                carta.status === 'aguardando' || carta.status === 'aguardando_continuacao' ? { ...carta, status: 'expirado' as const } : carta,
              ),
            }
          : mensagem,
      ),
    })),
  }
}

export function sanarCartoesAposF5(sessoes: Session[]): Session[] {
  return sessoes.map(sanarCartoesDeSessao)
}
