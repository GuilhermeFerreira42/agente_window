import { describe, expect, it } from 'vitest'
import { projetarHistoricoAgir as compor, type EventoGravado } from '../historicoAgir'
import type { TranscriptEntry } from '../transcripts'
import { traduzirHistorico } from '../../../bairros/2-inteligencia/casas/agir/server/dialogo'

const chamadaId = 'b'.repeat(64)
const turno = [{ id: 't', role: 'assistant', content: 'Resposta visível.' }] as const
const evento = (sequence: number, conteudo: EventoGravado['evento'], opcoes: Partial<EventoGravado> = {}): TranscriptEntry => ({
  type: 'agir_event', chatId: 'c', uuid: `r:${sequence}`, timestamp: 100, sequence,
  message: { version: 1, runId: 'r', turnoId: 't', escopo: 'workspace', evento: conteudo, ...opcoes },
})
const chamada = evento(1, { tipo: 'chamada', chamadaId, ferramenta: 'ler' })
const referencia = evento(2, { tipo: 'referencia', chamadaId, localizador: { arquivo: 'src/exemplo.txt', digest: 'a'.repeat(64) } })
const resultado = evento(3, { tipo: 'resultado', chamadaId, ferramenta: 'ler', ok: true, efeitoIniciado: false })
const fim = evento(4, { tipo: 'encerramento', status: 'respondeu' })
const projetarHistoricoAgir = (...args: Parameters<typeof compor>) => compor(...args).mensagens

describe('M2 — projeção estruturada', () => {
  it.each(['openai-chat', 'anthropic', 'gemini', 'ollama'] as const)('traduz o par para %s com sequência independente do timestamp', (protocolo) => {
    const mensagens = projetarHistoricoAgir([resultado, fim, referencia, chamada], 'c', 'workspace', [...turno])
    expect(mensagens.map(({ papel }) => papel)).toEqual(['assistente', 'ferramenta', 'assistente'])
    const id = mensagens[0].pedidos?.[0].id
    expect(mensagens[1].pedidoId).toBe(id)
    const nativo = traduzirHistorico(protocolo, mensagens)
    expect(JSON.stringify(nativo[0])).toContain('src/exemplo.txt')
    expect(JSON.stringify(nativo[1])).toContain('originais omitidos')
    expect(JSON.stringify(nativo[1])).not.toContain('digest')
  })

  it('ignora pares incompletos, execuções canceladas e eventos de outro escopo', () => {
    expect(projetarHistoricoAgir([resultado, fim], 'c', 'workspace', [...turno])).toHaveLength(1)
    expect(projetarHistoricoAgir([chamada, resultado, fim], 'outro', 'workspace', [...turno])).toHaveLength(1)
    expect(projetarHistoricoAgir([chamada, resultado, fim], 'c', 'outro', [...turno])).toHaveLength(1)
    expect(projetarHistoricoAgir([chamada, resultado, evento(4, { tipo: 'encerramento', status: 'interrompido' })], 'c', 'workspace', [...turno])).toHaveLength(1)
  })

  it('reporta a fonte e mantém o turno novo do browser com o histórico persistido', () => {
    expect(compor([], 'c', 'workspace', [...turno]).fonte).toBe('browser')
    expect(compor([chamada, resultado, fim], 'c', 'workspace', [
      ...turno, { role: 'user', content: 'Nova pergunta' },
    ])).toMatchObject({ fonte: 'hibrido', mensagens: expect.arrayContaining([{ papel: 'usuario', conteudo: 'Nova pergunta' }]) })
  })

  it('não usa um ciclo de continuação e só acrescenta um par se o browser repetir um ID', () => {
    const ciclo = evento(4, { tipo: 'encerramento', status: 'respondeu' }, { anterior: 'r' })
    const chamadaCiclica = evento(1, { tipo: 'chamada', chamadaId, ferramenta: 'ler' }, { anterior: 'r' })
    expect(projetarHistoricoAgir([chamadaCiclica, resultado, ciclo], 'c', 'workspace', [...turno])).toHaveLength(1)
    expect(projetarHistoricoAgir([chamada, resultado, fim], 'c', 'workspace', [...turno, ...turno])
      .filter((mensagem) => mensagem.papel === 'ferramenta')).toHaveLength(1)
  })
})
