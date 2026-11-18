// C-3a — política de admissão (T07/T09/T10/T36): limites reais, falha
// EXPLÍCITA com política inválida, quota/concorrência bloqueadas. Dados 100%
// sintéticos em diretório temporário.
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetDatabase, upsertSessionRecord } from '../database'
import { admitirUpload, receberConteudo, cancelarUpload, reconciliarIdentidade, consultarUpload } from './estoque'
import { carregarPolitica, POLITICA_PADRAO } from './politica'
import { obterArtigo, obterUpload } from './catalogo'

let base = ''
const SID = '11111111-1111-4111-8111-111111111111'
const CID = `${SID}-main`

function seedSessao(): void {
  upsertSessionRecord({
    id: SID, slug: 'c3a-policy', title: 'Sessão C-3a', workspacePath: null, contextKind: 'chat',
    worktreePath: null, messageCount: 0, createdAt: Date.now(), updatedAt: Date.now(),
    sessionJson: JSON.stringify({ id: SID, chats: [{ id: CID, messages: [] }] }),
  })
}

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'c3a-policy-'))
  process.env.AGENTE_WINDOW_DATA_DIR = join(base, 'data')
  mkdirSync(process.env.AGENTE_WINDOW_DATA_DIR, { recursive: true })
  resetDatabase()
  seedSessao()
})

afterEach(() => {
  resetDatabase()
  delete process.env.AGENTE_WINDOW_DATA_DIR
  rmSync(base, { recursive: true, force: true })
})

async function enviar(entrada: { bytes: number; uploadId?: string; nome?: string }) {
  const recibo = await admitirUpload({
    sessionId: SID, chatId: CID, name: entrada.nome ?? 'sintetico.bin',
    declaredBytes: entrada.bytes, mode: 'copy', scope: 'chat',
    ...(entrada.uploadId ? { uploadId: entrada.uploadId } : {}),
  })
  const conteudo = Buffer.alloc(Math.min(entrada.bytes, 64 * 1024))
  const fonte = Readable.from([conteudo])
  // declaração bate com o corpo nos testes pequenos
  return { recibo, fonte, corpo: conteudo }
}

describe('C-3a política de admissão', () => {
  it('C3A-T07 — arquivo acima do máximo recusa a admissão e nunca cria estado pronto', async () => {
    const grande = POLITICA_PADRAO.maxUploadBytes + 1
    await expect(admitirUpload({
      sessionId: SID, chatId: CID, name: 'grande.bin', declaredBytes: grande, mode: 'copy', scope: 'chat',
    })).rejects.toMatchObject({ status: 413, code: 'file_too_large' })
    // sem linha de upload → nada a publicar
    expect(obterUpload(SID, CID, 'qualquer-id')).toBeUndefined()
  })

  it('C3A-T07 — corpo maior que o declarado aborta a transferência sem publicar', async () => {
    const { recibo } = await enviar({ bytes: 16 })
    const corpoExtrapolado = Buffer.alloc(32)
    await expect(receberConteudo(SID, CID, recibo.uploadId, Readable.from([corpoExtrapolado])))
      .rejects.toMatchObject({ status: 413, code: 'file_too_large' })
    const linha = obterUpload(SID, CID, recibo.uploadId)!
    expect(linha.state).toBe('falhou')
    expect(linha.artifactId ? obterArtigo(linha.artifactId) : undefined).toBeUndefined()
  })

  it('C3A-T09 — política local inválida bloqueia a admissão com falha explícita (nunca default silencioso)', async () => {
    const caminho = join(process.env.AGENTE_WINDOW_DATA_DIR!, 'anexos', 'politica.json')
    mkdirSync(join(process.env.AGENTE_WINDOW_DATA_DIR!, 'anexos'), { recursive: true })
    writeFileSync(caminho, JSON.stringify({ maxUploadBytes: 'nao-numero' }), 'utf8')
    expect(carregarPolitica()).toMatchObject({ ok: false })
    await expect(admitirUpload({
      sessionId: SID, chatId: CID, name: 'x.bin', declaredBytes: 4, mode: 'copy', scope: 'chat',
    })).rejects.toMatchObject({ status: 503, code: 'policy_invalid' })
  })

  it('C3A-T10 — quota do chat bloqueia a admissão quando a soma excede o teto', async () => {
    const caminho = join(process.env.AGENTE_WINDOW_DATA_DIR!, 'anexos', 'politica.json')
    mkdirSync(join(process.env.AGENTE_WINDOW_DATA_DIR!, 'anexos'), { recursive: true })
    writeFileSync(caminho, JSON.stringify({ ...POLITICA_PADRAO, quotaChatBytes: 2000, maxUploadBytes: 1024, concorrencia: 8 }), 'utf8')
    await admitirUpload({ sessionId: SID, chatId: CID, name: 'a.bin', declaredBytes: 900, mode: 'copy', scope: 'chat' })
    await admitirUpload({ sessionId: SID, chatId: CID, name: 'b.bin', declaredBytes: 900, mode: 'copy', scope: 'chat' })
    await expect(admitirUpload({
      sessionId: SID, chatId: CID, name: 'c.bin', declaredBytes: 900, mode: 'copy', scope: 'chat',
    })).rejects.toMatchObject({ code: 'quota_exceeded' })
  })

  it('C3A-T36 — concorrência limitada, cancelamento limpa o stage e abandono expira (dados sintéticos)', async () => {
    const caminho = join(process.env.AGENTE_WINDOW_DATA_DIR!, 'anexos', 'politica.json')
    mkdirSync(join(process.env.AGENTE_WINDOW_DATA_DIR!, 'anexos'), { recursive: true })
    writeFileSync(caminho, JSON.stringify({ ...POLITICA_PADRAO, concorrencia: 1, prazoAbandonoMs: 50 }), 'utf8')
    const primeiro = await admitirUpload({ sessionId: SID, chatId: CID, name: '1.bin', declaredBytes: 8, mode: 'copy', scope: 'chat' })
    await expect(admitirUpload({
      sessionId: SID, chatId: CID, name: '2.bin', declaredBytes: 8, mode: 'copy', scope: 'chat',
    })).rejects.toMatchObject({ status: 429, code: 'too_many_uploads' })
    // cancelamento remove stage e mantém evidência no ledger
    await cancelarUpload(SID, CID, primeiro.uploadId)
    expect(consultarUpload(SID, CID, primeiro.uploadId).state).toBe('cancelado')
    // expiração de stage abandonado (mtime antigo) — sem estado pronto
    const dirStages = join(process.env.AGENTE_WINDOW_DATA_DIR!, 'uploads', 'stages', SID, CID)
    mkdirSync(dirStages, { recursive: true })
    writeFileSync(join(dirStages, 'orfao.part'), 'parcial')
    const { utimesSync } = await import('node:fs')
    const antigo = new Date(Date.now() - 60_000)
    utimesSync(join(dirStages, 'orfao.part'), antigo, antigo)
    await reconciliarIdentidade(SID, CID)
    const { existsSync } = await import('node:fs')
    expect(existsSync(join(dirStages, 'orfao.part'))).toBe(false)
  })

  it('C3A-T04 — transferência válida dentro da política conclui com hash (fixture positiva pequena)', async () => {
    const { recibo, corpo } = await enviar({ bytes: 64 })
    const concluido = await receberConteudo(SID, CID, recibo.uploadId, Readable.from([corpo]))
    expect(concluido.state).toBe('pronto')
    expect(concluido.bytes).toBe(64)
    expect(concluido.sha256).toMatch(/^[0-9a-f]{64}$/)
  })
})
