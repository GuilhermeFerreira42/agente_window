import { createHash } from 'node:crypto'
import type { EventoAgir, FerramentaId, LocalizadorFerramenta } from '../contract'
import type { ResultadoAgir } from './agir'

export type EventoTranscriptAgir =
  | { tipo: 'iteracao'; iteracao: number }
  | { tipo: 'chamada' | 'aprovacao_solicitada'; chamadaId: string; ferramenta: FerramentaId }
  | { tipo: 'aprovacao_decidida'; chamadaId: string; permitido: boolean }
  | { tipo: 'referencia'; chamadaId: string; localizador: LocalizadorFerramenta }
  | { tipo: 'resultado'; chamadaId: string; ferramenta: FerramentaId; ok: boolean; efeitoIniciado: boolean }
  | { tipo: 'encerramento'; status: ResultadoAgir['status'] }

export interface RegistroExecucaoAgir {
  sessionId: string
  chatId: string
  runId: string
  anterior?: string
  turnoId?: string
  raiz: string
  alvo?: { providerId: string; modelId: string }
  eventos: readonly EventoTranscriptAgir[]
}

export function registrarExecucao(runId: string) {
  const eventos: EventoTranscriptAgir[] = []
  const chamadas = new Map<string, string>()
  return {
    eventos,
    observar(evento: EventoAgir): void {
      switch (evento.type) {
        case 'iteracao':
          eventos.push({ tipo: 'iteracao', iteracao: evento.iteracao })
          break
        case 'tool':
          // Provider tool IDs are external data and can repeat between iterations.
          chamadas.set(evento.pedido.id, createHash('sha256').update(`${runId}:${eventos.length}`).digest('hex'))
          eventos.push({
            tipo: 'chamada',
            chamadaId: chamadas.get(evento.pedido.id)!,
            ferramenta: evento.pedido.ferramenta,
          })
          break
        case 'approval': {
          const chamadaId = chamadas.get(evento.pedido.id)
          if (chamadaId) eventos.push({ tipo: 'aprovacao_solicitada', chamadaId, ferramenta: evento.pedido.ferramenta })
          break
        }
        case 'tool_result': {
          const chamadaId = chamadas.get(evento.id)
          if (chamadaId) eventos.push({ tipo: 'resultado', chamadaId, ferramenta: evento.ferramenta, ok: evento.ok, efeitoIniciado: evento.efeitoIniciado === true })
          break
        }
      }
    },
    decisao(id: string, permitido: boolean): void {
      const chamadaId = chamadas.get(id)
      if (chamadaId) eventos.push({ tipo: 'aprovacao_decidida', chamadaId, permitido })
    },
    localizar(id: string, localizador: LocalizadorFerramenta): void {
      const chamadaId = chamadas.get(id)
      if (chamadaId) eventos.push({ tipo: 'referencia', chamadaId, localizador })
    },
  }
}
