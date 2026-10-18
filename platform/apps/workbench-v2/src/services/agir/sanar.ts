// ============================================================================
// FATIA 10 (C4) — sanar cartões depois do F5.
// Um cartão 'aguardando' que sobreviveu ao recarregamento nunca mais será
// respondido: o fluxo no servidor morreu junto com a página (a aprovação
// devolveria 409 "fluxo morto"). Deixá-lo eternamente clicável seria a
// mesma mentira do chip "Trabalhando" fantasma da FATIA 09 — então ele
// vira 'expirado' na restauração (cliente E servidor usam este helper puro).
// ============================================================================
import type { Session } from '../../types'

export function sanarCartoesDeSessao(sessao: Session): Session {
  return {
    ...sessao,
    chats: sessao.chats.map((chat) => ({
      ...chat,
      messages: chat.messages.map((mensagem) =>
        mensagem.ferramentas?.some((carta) => carta.status === 'aguardando')
          ? {
              ...mensagem,
              ferramentas: mensagem.ferramentas.map((carta) =>
                carta.status === 'aguardando' ? { ...carta, status: 'expirado' as const } : carta,
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
