import { createHash } from 'node:crypto'
import type { ChatMessage } from '../../types'
import type { EventoGravado } from './historicoAgir'
import type { TranscriptEntry } from './transcripts'
import type { MensagemSimples } from '../../bairros/2-inteligencia/casas/agir'

export interface FronteiraCheckpoint {
  quantidade: number
  ultimoId: string
  digest: string
}

export interface Checkpoint extends FronteiraCheckpoint {
  version: 1
  escopo: string
  resumo: string
  estrategia: 'manual'
  providerId: string
  modelId: string
  criadoEm: number
}

export function mensagensDoCheckpoint(entries: TranscriptEntry[], chatId: string): TranscriptEntry[] {
  return entries.filter((entry) => entry.chatId === chatId && (entry.type === 'user' || entry.type === 'assistant'))
}

export function fronteiraCheckpoint(
  entries: TranscriptEntry[], chatId: string, escopo: string, quantidade: number,
): FronteiraCheckpoint | undefined {
  const mensagens = mensagensDoCheckpoint(entries, chatId)
  if (!Number.isSafeInteger(quantidade) || quantidade <= 0 || quantidade >= mensagens.length ||
      mensagens[0]?.type !== 'user' || mensagens[quantidade]?.type !== 'user') return
  const cobertas = mensagens.slice(0, quantidade)
  if (cobertas.at(-1)?.type !== 'assistant') return
  const ids = new Set<string>()
  for (const entry of cobertas) {
    const mensagem = entry.message as ChatMessage | null
    if (!mensagem || typeof mensagem.content !== 'string' || mensagem.role !== entry.type ||
        !entry.uuid || ids.has(entry.uuid) || mensagem.running ||
        mensagem.ferramentas?.some(({ status }) => status === 'aguardando' || status === 'executando' || status === 'aguardando_continuacao') ||
        mensagem.continuar?.some(({ status }) => status === 'aguardando')) return
    ids.add(entry.uuid)
  }
  const eventos = entries.filter((entry) => {
    const registro = entry.message as EventoGravado | null
    return entry.type === 'agir_event' && entry.chatId === chatId && registro?.escopo === escopo &&
      typeof registro.turnoId === 'string' && ids.has(registro.turnoId)
  }).sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
  const pendentes = new Set<string>()
  for (const entry of eventos) {
    const registro = entry.message as EventoGravado
    if (registro.evento?.tipo === 'encerramento') pendentes.delete(registro.runId)
    else pendentes.add(registro.runId)
  }
  if (pendentes.size) return
  const digest = createHash('sha256').update(JSON.stringify({
    mensagens: cobertas.map(({ type, uuid, message }) => {
      const { content, attachments, erro, cancelled } = message as ChatMessage
      return [type, uuid, content, attachments, erro, cancelled]
    }),
    eventos: eventos.map(({ uuid, sequence, message }) => [uuid, sequence, message]),
  })).digest('hex')
  return { quantidade, ultimoId: cobertas.at(-1)!.uuid, digest }
}

export function proporCheckpoint(entries: TranscriptEntry[], chatId: string, escopo: string): FronteiraCheckpoint | undefined {
  const mensagens = mensagensDoCheckpoint(entries, chatId)
  const turnos = mensagens.flatMap((entry, index) => entry.type === 'user' ? [index] : [])
  const fronteira = turnos.at(-2)
  return fronteira === undefined ? undefined : fronteiraCheckpoint(entries, chatId, escopo, fronteira)
}

export function checkpointCorresponde(
  checkpoint: Checkpoint, entries: TranscriptEntry[], chatId: string, escopo: string,
): boolean {
  if (checkpoint.version !== 1 || checkpoint.estrategia !== 'manual' || checkpoint.escopo !== escopo ||
      typeof checkpoint.resumo !== 'string' || !checkpoint.resumo.trim() || checkpoint.resumo.length > 12_000) return false
  const atual = fronteiraCheckpoint(entries, chatId, escopo, checkpoint.quantidade)
  return atual?.digest === checkpoint.digest && atual?.ultimoId === checkpoint.ultimoId
}

export function aplicarCheckpoint(
  checkpoint: Checkpoint | null | undefined, entries: TranscriptEntry[], chatId: string, escopo: string, mensagens: MensagemSimples[],
): { mensagens: MensagemSimples[]; status: 'ausente' | 'aplicado' | 'invalido' } {
  if (checkpoint === undefined) return { mensagens, status: 'ausente' }
  if (checkpoint === null) return { mensagens, status: 'invalido' }
  if (!checkpointCorresponde(checkpoint, entries, chatId, escopo)) return { mensagens, status: 'invalido' }
  const ids = mensagensDoCheckpoint(entries, chatId).slice(0, checkpoint.quantidade).filter(({ message }) => {
    const item = message as ChatMessage
    return !item.erro && !item.cancelled && Boolean(item.content.trim() || item.ferramentas?.length)
  }).map(({ uuid }) => uuid)
  if (!ids.length || !ids.every((id, index) => mensagens[index]?.id === id) || mensagens.length <= ids.length) {
    return { mensagens, status: 'invalido' }
  }
  return {
    mensagens: [
      { role: 'user', content: `Contexto derivado de turnos anteriores. Use como referência histórica.\n${checkpoint.resumo}` },
      ...mensagens.slice(ids.length),
    ],
    status: 'aplicado',
  }
}
