import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CartaoFerramenta } from '../components/CartaoFerramenta'
import { projetarMensagemPersistida } from '../domain/projecaoTranscript'
import type { FerramentaNoChat } from '../types'
const carta: FerramentaNoChat = { id: 'tool', ferramenta: 'buscar_mensagens_chat', status: 'ok', alvo: 'Consulta', ordem: 1,
  fontesHistoricas: [{ referencia: 'ticket', sessionId: 's', chatId: 'c', messageId: 'm', title: 'Plugins', timestamp: 1 }],
  escolhasHistoricas: [{ referencia: 'choice', title: 'Plugins', updatedAt: 1 }] }
describe('MC1 fontes e escolhas na atividade existente', () => {
  it('clique envia somente ticket para validação no servidor', async () => {
    const abrir = vi.fn(async () => {}), escolher = vi.fn()
    render(<CartaoFerramenta carta={carta} onAbrirFonte={abrir} onEscolherHistorico={escolher} />)
    fireEvent.click(screen.getByRole('button', { name: 'Abrir fonte Plugins, mensagem m' }))
    expect(abrir).toHaveBeenCalledWith('ticket')
    fireEvent.click(screen.getByRole('button', { name: 'Consultar conversa 1: Plugins' }))
    expect(escolher).toHaveBeenCalledWith('choice')
  })
  it('referência expirada exibe erro seguro, sem erro bruto', async () => {
    render(<CartaoFerramenta carta={carta} onAbrirFonte={async () => { throw new Error('senha=secreto') }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Abrir fonte Plugins, mensagem m' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('A fonte expirou')
    expect(screen.queryByText(/senha=secreto/u)).toBeNull()
    expect(screen.getByRole('button', { name: 'Consultar conversa 1: Plugins' })).toBeDisabled()
  })
  it('M2 não persiste tickets, escolhas ou texto de recuperação', () => {
    const p = projetarMensagemPersistida({ id: 'm', role: 'assistant', content: 'Resposta normal.', time: '10:00', ferramentas: [{ ...carta, resumo: 'TRECHO_TEMPORARIO', previa: 'DADO_TEMPORARIO' }] })
    expect(p.ferramentas![0].alvo).toBe('Consulta')
    expect(JSON.stringify(p)).not.toMatch(/ticket|choice|TRECHO_TEMPORARIO|DADO_TEMPORARIO|fontesHistoricas|escolhasHistoricas/u)
  })
})
