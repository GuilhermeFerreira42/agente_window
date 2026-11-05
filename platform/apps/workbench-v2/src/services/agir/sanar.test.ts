// ============================================================================
// Provas do sanar de cartões (C4): 'aguardando' que sobreviveu ao F5 vira
// 'expirado'; todo o resto fica intocado.
// ============================================================================
import { describe, expect, it } from 'vitest'
import type { ChatMessage, Session } from '../../types'
import { sanarCartoesAposF5, sanarCartoesDeSessao } from './sanar'

function sessaoComMensagens(mensagens: ChatMessage[]): Session {
  return {
    id: 's1',
    mainChatId: 'c1',
    title: 'Sessão',
    status: 'completed',
    isDraft: false,
    workspacePath: '/casa',
    createdSeq: 1,
    updated: 'agora',
    unread: false,
    chats: [{ id: 'c1', title: 'Conversa', status: 'completed', messages: mensagens }],
  } as unknown as Session
}

function mensagem(ferramentas: ChatMessage['ferramentas']): ChatMessage {
  return { id: 'm1', role: 'assistant', content: 'texto', time: '10:00', ...(ferramentas ? { ferramentas } : {}) }
}

describe('sanar cartões após o F5', () => {
  it("'aguardando' vira 'expirado' (o fluxo morreu com a página)", () => {
    const antes = sessaoComMensagens([
      mensagem([{ id: 'c1', ferramenta: 'criar', alvo: 'ola.txt', status: 'aguardando', previa: 'oi' }]),
    ])
    const depois = sanarCartoesDeSessao(antes)
    expect(depois.chats[0].messages[0].ferramentas?.[0].status).toBe('expirado')
    expect(depois.chats[0].messages[0].ferramentas?.[0].previa).toBe('oi') // a prévia fica (memória do que era)
  })

  it("os outros status ('ok', 'negado', 'erro', 'executando' já concluído...) ficam intocados", () => {
    const antes = sessaoComMensagens([
      mensagem([
        { id: 'a', ferramenta: 'criar', alvo: 'a.txt', status: 'ok', resumo: 'criado' },
        { id: 'b', ferramenta: 'escrever', alvo: 'b.txt', status: 'negado', resumo: 'dono negou' },
        { id: 'c', ferramenta: 'ler', alvo: 'c.txt', status: 'erro', resumo: 'faltou caminho' },
      ]),
    ])
    const depois = sanarCartoesDeSessao(antes)
    expect(depois.chats[0].messages[0].ferramentas?.map((c) => c.status)).toEqual(['ok', 'negado', 'erro'])
  })

  it('sessão sem cartões e mensagem sem ferramentas: nada muda', () => {
    const antes = sessaoComMensagens([mensagem(undefined)])
    const sanitizada = sanarCartoesDeSessao(antes)
    expect(sanitizada.chats[0].messages[0].ferramentas).toBeUndefined()
    expect(sanarCartoesAposF5([antes, antes]).length).toBe(2)
  })
})
