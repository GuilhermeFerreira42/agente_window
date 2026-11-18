// C-3a — suíte de recuperação pós-falha (T30/T31/R11/E08).
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetDatabase, upsertSessionRecord } from '../database'
import { admitirUpload, receberConteudo, cancelarUpload } from './estoque'
import { obterUpload, inserirUpload, listarUploads, atualizarUpload } from './catalogo'
import { caminhoFinalChat } from './estoque'
import { confirmRecovery, prepareRecovery } from './recuperacao'
import { Readable } from 'node:stream'

const SID = '11111111-1111-4111-8111-111111111111'
const CID = '22222222-2222-4222-8222-222222222222'
const UPLOAD = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

let base: string

function seed(): void {
  upsertSessionRecord({
    id: SID, slug: 'c3a-recovery', title: 'Sessão C-3a', workspacePath: null, contextKind: 'chat',
    worktreePath: null, messageCount: 0, createdAt: Date.now(), updatedAt: Date.now(),
    sessionJson: JSON.stringify({ id: SID, chats: [{ id: CID, messages: [] }] }),
  })
}

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'c3a-recovery-'))
  process.env.AGENTE_WINDOW_DATA_DIR = join(base, 'data')
  mkdirSync(process.env.AGENTE_WINDOW_DATA_DIR, { recursive: true })
  resetDatabase()
  seed()
})

afterEach(() => {
  resetDatabase()
  delete process.env.AGENTE_WINDOW_DATA_DIR
  rmSync(base, { recursive: true, force: true })
})

describe('C-3a recuperação pós-falha', () => {
  it('C3A-T30 — prepare+confirm recuperam a cópia no MESMO id, no âmbito privado, sem duplicar', async () => {
    // Simula o crash de um POST: linha 'recebendo' com stage parcial e um
    // arquivo de origem (o rascunho local) ainda disponível.
    const origem = join(base, 'original-do-rascunho.txt')
    const bytes = Buffer.from('conteúdo original do rascunho C-3a', 'utf8')
    writeFileSync(origem, bytes)
    const stage = join(process.env.AGENTE_WINDOW_DATA_DIR!, 'uploads', 'stages', SID, CID, UPLOAD)
    mkdirSync(join(stage, '..'), { recursive: true })
    writeFileSync(stage, Buffer.alloc(4, 7))
    inserirUpload({
      sessionId: SID, chatId: CID, uploadId: UPLOAD, artifactId: UPLOAD, name: 'original-do-rascunho.txt',
      declaredBytes: bytes.length, mime: 'text/plain', receivedBytes: 4, digest: null, state: 'recebendo',
      stagePath: stage, finalPath: caminhoFinalChat(undefined, SID, CID, UPLOAD, 'original-do-rascunho.txt'),
      mode: 'copy', scope: 'chat', workspaceRoot: null,
      createdAt: Date.now(), updatedAt: Date.now(), errorCode: null,
    })

    const preparado = await prepareRecovery(SID, CID, UPLOAD, origem)
    expect(preparado).toMatchObject({ uploadId: UPLOAD, state: 'preparado', verified: true })
    expect(preparado.sha256).toMatch(/^[0-9a-f]{64}$/)
    // stage privado agora tem os bytes íntegros da origem
    expect(readFileSync(stage)).toEqual(bytes)

    const pronto = await confirmRecovery(SID, CID, UPLOAD)
    expect(pronto.state).toBe('pronto')
    const linha = obterUpload(SID, CID, UPLOAD)!
    expect(linha.state).toBe('pronto')
    // âmbito PRIVADO (D152): nunca no workspace do projeto
    const final = caminhoFinalChat(undefined, SID, CID, UPLOAD, 'original-do-rascunho.txt')
    expect(final).toContain(join('uploads', 'chats'))
    expect(existsSync(final)).toBe(true)
    expect(readFileSync(final)).toEqual(bytes)
    // MESMO identificador — sem duplicar linhas nem arquivos
    expect(listarUploads(SID, CID).filter((item) => item.uploadId === UPLOAD)).toHaveLength(1)

    // Idempotência: repetir prepare/confirm devolve o mesmo estado pronto.
    const deNovo = await prepareRecovery(SID, CID, UPLOAD)
    expect(deNovo.state).toBe('pronto')
    const confirmaDeNovo = await confirmRecovery(SID, CID, UPLOAD)
    expect(confirmaDeNovo).toMatchObject({ uploadId: UPLOAD, state: 'pronto' })
  })

  it('C3A-T31 — sem origem a recuperação é indisponível honesta; referência não é recuperável; hash divergente é recusado', async () => {
    // (a) admitido sem stage, sem final e sem origem → indisponível honesto (E08).
    const semOrigem = await admitirUpload({ sessionId: SID, chatId: CID, name: 'sumiu.bin', declaredBytes: 8, mode: 'copy', scope: 'chat' })
    await expect(prepareRecovery(SID, CID, semOrigem.uploadId)).rejects.toMatchObject({ status: 410, code: 'stage_missing' })

    // (b) referência de projeto não tem transferência a recuperar.
    const workspaceRoot = join(base, 'workspace')
    mkdirSync(workspaceRoot, { recursive: true })
    const referencia = await admitirUpload({ sessionId: SID, chatId: CID, name: 'link-externo', declaredBytes: null, mode: 'reference', scope: 'workspace', workspaceRoot })
    await expect(prepareRecovery(SID, CID, referencia.uploadId)).rejects.toMatchObject({ status: 409, code: 'upload_not_recoverable' })

    // (c) confirm sem prepare é recusado.
    await expect(confirmRecovery(SID, CID, semOrigem.uploadId)).rejects.toMatchObject({ status: 409, code: 'upload_not_prepared' })
    // libera a concorrência (política:2 transferências ativas) para o caso (d)
    await cancelarUpload(SID, CID, semOrigem.uploadId)
    await cancelarUpload(SID, CID, referencia.uploadId)

    // (d) cópia recuperada com hash divergente do ledger é recusada e o stage é removido.
    const conteudo = Buffer.from('bytes originais', 'utf8')
    const recebido = await admitirUpload({ sessionId: SID, chatId: CID, name: 'divergente.txt', declaredBytes: conteudo.length, mode: 'copy', scope: 'chat' })
    await receberConteudo(SID, CID, recebido.uploadId, Readable.from([conteudo]))
    // força o estado de volta para 'recebendo' com o digest antigo (crash após o receive)
    const linha = obterUpload(SID, CID, recebido.uploadId)!
    atualizarUpload(SID, CID, recebido.uploadId, { state: 'recebendo', digest: linha.digest ?? '0'.repeat(64) })
    const outraOrigem = join(base, 'outra-versao.txt')
    writeFileSync(outraOrigem, Buffer.from('OUTROS bytes', 'utf8'))
    await expect(prepareRecovery(SID, CID, recebido.uploadId, outraOrigem))
      .rejects.toMatchObject({ status: 409, code: 'recovery_verification_failed' })
    expect(existsSync(linha.stagePath!)).toBe(false)
  })
})
