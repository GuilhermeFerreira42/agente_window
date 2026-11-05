// ============================================================================
// Casa Personalizações — CLIENTE DA ROTA (navegador).
// Fala com GET /api/personalizacoes, POST .../skills e PUT .../estado.
// Erro vira Error com a mensagem do servidor (ou o HTTP honesto), no padrão da
// casa Config.
//
// A identidade da sessão vai como parâmetro, nunca um caminho de pasta: quem
// resolve a raiz de projeto é o servidor, a partir da sessão persistida.
// ============================================================================
import type { EstadoParcial, Skill, VisaoPersonalizacoes } from '../../contract'

async function mensagemDeErro(res: Response, acao: string): Promise<string> {
  try {
    const corpo: unknown = await res.json()
    if (
      typeof corpo === 'object' && corpo !== null && 'message' in corpo
      && typeof (corpo as { message?: unknown }).message === 'string'
    ) {
      return (corpo as { message: string }).message
    }
  } catch {
    // Corpo ilegível — cai no genérico abaixo.
  }
  return `Não foi possível ${acao} (HTTP ${res.status}).`
}

/** Identidade da conversa ativa; vazia = só o escopo do usuário é listado. */
export interface AlvoPersonalizacoes {
  sessionId?: string
  chatId?: string
}

function query(alvo: AlvoPersonalizacoes): string {
  const params = new URLSearchParams()
  if (alvo.sessionId) params.set('sessionId', alvo.sessionId)
  if (alvo.chatId) params.set('chatId', alvo.chatId)
  const texto = params.toString()
  return texto ? `?${texto}` : ''
}

/** Carrega a visão central: skills reais + ferramentas reais + estado persistido. */
export async function carregarPersonalizacoes(alvo: AlvoPersonalizacoes = {}): Promise<VisaoPersonalizacoes> {
  const res = await fetch(`/api/personalizacoes${query(alvo)}`)
  if (!res.ok) throw new Error(await mensagemDeErro(res, 'carregar as personalizações'))
  return (await res.json()) as VisaoPersonalizacoes
}

export interface PedidoCriarSkillTela {
  nome: string
  descricao: string
  corpo: string
  origem: 'usuario' | 'projeto'
}

/** Cria uma skill (pasta + SKILL.md) no escopo pedido. */
export async function criarSkillNaTela(pedido: PedidoCriarSkillTela, alvo: AlvoPersonalizacoes = {}): Promise<Skill> {
  const res = await fetch('/api/personalizacoes/skills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...pedido, sessionId: alvo.sessionId, chatId: alvo.chatId }),
  })
  if (!res.ok) throw new Error(await mensagemDeErro(res, 'criar a skill'))
  const corpo = (await res.json()) as { skill: Skill }
  return corpo.skill
}

/** Salva o liga/desliga (RF14-1 e RF14-4). Parcial: só o eixo que mudou. */
export async function salvarEstadoPersonalizacoes(parcial: EstadoParcial): Promise<VisaoPersonalizacoes['estado']> {
  const res = await fetch('/api/personalizacoes/estado', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parcial),
  })
  if (!res.ok) throw new Error(await mensagemDeErro(res, 'salvar o liga/desliga'))
  return (await res.json()) as VisaoPersonalizacoes['estado']
}
