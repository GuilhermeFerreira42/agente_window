import { describe, expect, it } from 'vitest'
import { recuperarHistorico } from '../recuperarHistorico'
import type { TranscriptEntry } from '../transcripts'

const linha = (id: string, chatId: string, content: string): TranscriptEntry =>
  ({ type: 'user', chatId, uuid: id, timestamp: 17, message: { id, role: 'user', content } })

describe('M6 — recuperação delimitada', () => {
  const dados = [
    linha('fora', 'b', 'canário externo'),
    linha('antes', 'a', 'Mensagem anterior do mesmo chat'),
    linha('origem', 'a', 'Decisão canário com fonte literal'),
    linha('segredo', 'a', 'canário token = FIXTURE_PRIVATE_TOKEN'),
  ]

  it('retorna apenas fontes do chat, sem enviar credencial ou outro chat', () => {
    const resultado = recuperarHistorico(dados, 'a', { acao: 'buscar', valor: 'canário' })
    expect(resultado.fontes).toEqual(['origem'])
    expect(JSON.parse(resultado.conteudo)).toMatchObject({ metodo: 'lexical', hits: [{ chatId: 'a', messageId: 'origem', sequence: 2 }] })
    expect(resultado.conteudo).not.toMatch(/externo|FIXTURE_PRIVATE_TOKEN/)
  })

  it('limita vizinhança e torna explícita a ausência de uma fonte', () => {
    expect(recuperarHistorico(dados, 'a', { acao: 'ler', valor: 'fora' }).fontes).toEqual([])
    const resultado = recuperarHistorico(dados, 'a', { acao: 'ler', valor: 'origem' })
    expect(resultado.fontes).toEqual(['antes', 'origem'])
    expect(resultado.conteudo).not.toContain('FIXTURE_PRIVATE_TOKEN')
    const ausente = recuperarHistorico(dados, 'a', { acao: 'buscar', valor: 'inexistente' })
    expect(ausente.conteudo).toContain('Nenhuma fonte encontrada')
  })
})
