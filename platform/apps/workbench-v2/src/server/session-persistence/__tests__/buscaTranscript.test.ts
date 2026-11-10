import { describe, expect, it } from 'vitest'
import { buscarTranscript } from '../buscaTranscript'
import type { TranscriptEntry } from '../transcripts'

const linha = (id: string, chatId: string, content: string): TranscriptEntry =>
  ({ type: 'user', chatId, uuid: id, timestamp: 17, message: { id, role: 'user', content } })

describe('M4 — busca lexical na fonte', () => {
  it('mantém acentos e pontuação literais e retorna a posição no chat certo', () => {
    const entradas = [linha('fora', 'b', 'decisão (A+B)'), linha('primeira', 'a', 'sem correspondência'),
      linha('origem', 'a', 'A Decisão (A+B) foi registrada.')]
    expect(buscarTranscript(entradas, 'a', 'DECISÃO (a+b)')).toEqual({
      parcial: false, hits: [{ messageId: 'origem', sequence: 2, papel: 'user', timestamp: 17, offset: 2,
        trecho: 'A Decisão (A+B) foi registrada.' }],
    })
    expect(buscarTranscript(entradas.slice(0, 2), 'a', 'DECISÃO (a+b)').hits).toEqual([])
  })

  it('exclui campos de anexos, eventos brutos, erros e mensagens canceladas', () => {
    const anexada = linha('mensagem', 'a', 'Texto visível')
    Object.assign(anexada.message as object, { attachments: [{ name: 'CANARIO' }] })
    const evento = { ...linha('evento', 'a', 'CANARIO'), type: 'agir_event' as const }
    const cancelada = linha('cancelada', 'a', 'CANARIO')
    Object.assign(cancelada.message as object, { cancelled: true })
    expect(buscarTranscript([anexada, evento, cancelada], 'a', 'CANARIO').hits).toEqual([])
  })

  it('limita resultados e sinaliza inspeção parcial para históricos grandes', () => {
    const entries = Array.from({ length: 80 }, (_, i) => linha(String(i), 'a', 'a palavra procurada'))
    expect(buscarTranscript(entries, 'a', 'x'.repeat(121))).toEqual({ hits: [], parcial: false })
    expect(buscarTranscript(entries, 'a', 'palavra')).toMatchObject({ parcial: true, hits: expect.any(Array) })
    expect(buscarTranscript(entries, 'a', 'palavra').hits).toHaveLength(40)
    expect(buscarTranscript([linha('longo', 'a', 'x'.repeat(2_000_001) + 'segredo')], 'a', 'segredo'))
      .toEqual({ parcial: true, hits: [] })
  })
})
