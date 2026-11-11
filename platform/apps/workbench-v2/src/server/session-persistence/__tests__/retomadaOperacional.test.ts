import { describe, expect, it } from 'vitest'
import { conferirArquivosOperacionais, revisarOperacao } from '../retomadaOperacional'
import { createHash } from 'node:crypto'
import { mkdtemp, rmdir, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { EventoGravado } from '../historicoAgir'
import type { TranscriptEntry } from '../transcripts'

const id = 'c'.repeat(64)
const evento = (sequence: number, conteudo: EventoGravado['evento']): TranscriptEntry => ({
  type: 'agir_event', chatId: 'chat', sequence, uuid: `run:${sequence}`, timestamp: 1,
  message: { version: 1, runId: 'run', turnoId: 'response', escopo: 'workspace', git: 'git-state', evento: conteudo },
})
const chamada = evento(1, { tipo: 'chamada', chamadaId: id, ferramenta: 'executar' })

describe('M7 — recibos e incerteza', () => {
  it('exige inspeção quando falta o resultado de uma ação mutável', () => {
    const revisao = revisarOperacao([chamada], 'chat', 'workspace', 'git-state')
    expect(revisao).toMatchObject({ estado: 'interrompida', podePlanejar: false, acoes: [{ estado: 'incerta' }] })
  })

  it('trata aprovação pendente ou negada como evidência, sem reautorizá-la', () => {
    const pendente = evento(2, { tipo: 'aprovacao_solicitada', chamadaId: id, ferramenta: 'executar' })
    expect(revisarOperacao([chamada, pendente], 'chat', 'workspace', 'git-state'))
      .toMatchObject({ podePlanejar: true, acoes: [{ estado: 'pendente', aprovacao: 'pendente' }] })
    const permitida = evento(3, { tipo: 'aprovacao_decidida', chamadaId: id, permitido: true })
    expect(revisarOperacao([chamada, pendente, permitida], 'chat', 'workspace', 'git-state')?.podePlanejar).toBe(false)
    const negada = evento(3, { tipo: 'aprovacao_decidida', chamadaId: id, permitido: false })
    expect(revisarOperacao([chamada, pendente, negada], 'chat', 'workspace', 'git-state'))
      .toMatchObject({ podePlanejar: true, acoes: [{ estado: 'negada' }] })
  })

  it('bloqueia pasta ou Git divergentes e uma pausa ainda viva', () => {
    const resultado = evento(2, { tipo: 'resultado', chamadaId: id, ferramenta: 'executar', ok: true, efeitoIniciado: true })
    expect(revisarOperacao([chamada, resultado], 'chat', undefined, null)?.podePlanejar).toBe(false)
    expect(revisarOperacao([chamada, resultado], 'chat', 'outra', 'git-state')?.podePlanejar).toBe(false)
    expect(revisarOperacao([chamada, resultado], 'chat', 'workspace', 'outro-git')?.podePlanejar).toBe(false)
    expect(revisarOperacao([chamada, resultado], 'chat', 'workspace', 'git-state', true)?.podePlanejar).toBe(false)
    expect(revisarOperacao([chamada, resultado], 'outro', 'workspace', 'git-state')).toBeUndefined()
  })

  it('confere uma referência de leitura e bloqueia conteúdo alterado', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'm7-ref-'))
    try {
      const arquivo = join(raiz, 'origem.txt')
      await writeFile(arquivo, 'original')
      const entries = [
        evento(1, { tipo: 'chamada', chamadaId: id, ferramenta: 'ler' }),
        evento(2, { tipo: 'referencia', chamadaId: id, localizador: { arquivo: 'origem.txt',
          digest: createHash('sha256').update('original').digest('hex') } }),
        evento(3, { tipo: 'resultado', chamadaId: id, ferramenta: 'ler', ok: true, efeitoIniciado: false }),
      ]
      const igual = revisarOperacao(entries, 'chat', 'workspace', 'git-state')!
      await conferirArquivosOperacionais(igual, entries, 'chat', raiz)
      expect(igual).toMatchObject({ podePlanejar: true, acoes: [{ arquivo: 'igual' }] })
      await writeFile(arquivo, 'alterado')
      const alterado = revisarOperacao(entries, 'chat', 'workspace', 'git-state')!
      await conferirArquivosOperacionais(alterado, entries, 'chat', raiz)
      expect(alterado).toMatchObject({ podePlanejar: false, acoes: [{ arquivo: 'alterado' }] })
    } finally {
      await unlink(join(raiz, 'origem.txt')).catch(() => undefined)
      await rmdir(raiz)
    }
  })
})
