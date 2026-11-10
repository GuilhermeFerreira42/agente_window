import { describe, expect, it } from 'vitest'
import { aplicarCheckpoint, checkpointCorresponde, proporCheckpoint, type Checkpoint } from '../checkpoint'
import type { TranscriptEntry } from '../transcripts'

const linhas = (): TranscriptEntry[] => Array.from({ length: 8 }, (_, index) => {
  const type = index % 2 === 0 ? 'user' : 'assistant'
  const id = `m${index}`
  return { type, chatId: 'chat', uuid: id, timestamp: 1, message: { id, role: type, content: `texto ${index}` } }
})

function montarCheckpoint(entries: TranscriptEntry[]): Checkpoint {
  return { ...proporCheckpoint(entries, 'chat', 'workspace')!, version: 1, estrategia: 'manual', escopo: 'workspace', resumo: 'Resumo anterior',
    providerId: 'fixture', modelId: 'fixture-model', criadoEm: 1 }
}

describe('M3 — fronteiras de checkpoint', () => {
  it('preserva os dois últimos turnos e aceita nova cauda sem invalidar o prefixo', () => {
    const entries = linhas()
    const checkpoint = montarCheckpoint(entries)
    expect(checkpoint).toMatchObject({ quantidade: 4, ultimoId: 'm3' })
    expect(checkpointCorresponde(checkpoint, [...entries, { ...entries[0], uuid: 'novo' }], 'chat', 'workspace')).toBe(true)
    const mensagens = entries.map(({ type, uuid, message }) => ({ id: uuid, role: type as 'user' | 'assistant', content: (message as { content: string }).content }))
    const resultado = aplicarCheckpoint(checkpoint, entries, 'chat', 'workspace', mensagens)
    expect(resultado.status).toBe('aplicado')
    expect(resultado.mensagens[0].content).toContain('Resumo anterior')
    expect(resultado.mensagens.slice(1)).toEqual(mensagens.slice(4))
    expect(aplicarCheckpoint(checkpoint, entries, 'chat', 'workspace', mensagens.slice(1)).status).toBe('invalido')
    expect(aplicarCheckpoint(null, entries, 'chat', 'workspace', mensagens)).toEqual({ mensagens, status: 'invalido' })
  })

  it('rejeita mudança de conteúdo, escopo, chat, digest e resumo vazio', () => {
    const entries = linhas()
    const checkpoint = montarCheckpoint(entries)
    expect(checkpointCorresponde(checkpoint, entries, 'chat', 'outra pasta')).toBe(false)
    expect(checkpointCorresponde(checkpoint, entries, 'outro', 'workspace')).toBe(false)
    expect(checkpointCorresponde({ ...checkpoint, resumo: ' ' }, entries, 'chat', 'workspace')).toBe(false)
    entries[0].message = { id: 'm0', role: 'user', content: 'Alteração em registro existente' }
    expect(checkpointCorresponde(checkpoint, entries, 'chat', 'workspace')).toBe(false)
  })

  it('recusa uma fronteira com evento ativo vinculado ao prefixo', () => {
    const entries = linhas()
    entries.push({ type: 'agir_event', chatId: 'chat', uuid: 'run:1', sequence: 1, timestamp: 1,
      message: { version: 1, runId: 'run', turnoId: 'm1', escopo: 'workspace', evento: { tipo: 'iteracao', iteracao: 1 } } })
    expect(proporCheckpoint(entries, 'chat', 'workspace')).toBeUndefined()
  })
})
