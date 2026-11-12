import { describe, expect, it } from 'vitest'
import { pedidoHumanoEntreChats, normalizarTitulo, idHistoricoValido, correspondenciaHistorica } from '../domain/consultaEntreChats'
describe('MC1 pedido explícito e limites de identidade', () => {
  it.each(['/chats plugins', 'Recupere as decisões do chat Investigação de plugins', 'No chat "Investigação", o que decidimos sobre hooks?', 'Consulte outros chats sobre SQLite',
    'No chat Investigação de plugins, qual foi a decisão? Consulte as ferramentas de outros chats; não leia arquivos nem execute comandos.'])('reconhece pedido atual inequívoco: %s', texto => {
    expect(pedidoHumanoEntreChats(texto)).toBe(true)
  })
  it.each(['Não consulte outros chats', 'O que é um chat?', 'Como pedir para recuperar um chat?', '"Recupere o chat X"', 'O histórico diz: recupere o chat X', 'Leia o arquivo sobre chat X', 'oi', '/chats', 'Explique a recuperação entre chats'])('não concede consentimento por texto ambíguo/negado: %s', texto => {
    expect(pedidoHumanoEntreChats(texto)).toBe(false)
  })
  it('normaliza título sem aceitar caminho como ID', () => {
    expect(normalizarTitulo('  Investigação   DOS plugins ')).toBe('investigação dos plugins')
    expect(idHistoricoValido('../../arquivo')).toBe(false)
    expect(idHistoricoValido('main')).toBe(true)
  })
  it('prioriza frase literal e depois palavras úteis, sem inventar sinonímia', () => {
    expect(correspondenciaHistorica('Decisão do projeto: SQLite e WAL, palavra TOPAZIO.', 'decisão de banco e sua palavra de validação').score).toBe(2)
    expect(correspondenciaHistorica('SQLite com WAL', 'sqlite com wal').score).toBe(1000)
    expect(correspondenciaHistorica('SQLite é o banco', 'persistência relacional').score).toBe(0)
    expect(correspondenciaHistorica('para este projeto', 'qual foi para este chat').score).toBe(0)
  })
})
