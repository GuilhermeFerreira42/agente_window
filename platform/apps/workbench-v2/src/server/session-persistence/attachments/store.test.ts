// C-3a — armazenamento/publicação (T04/T05/T08/T11/T12/T14–T17/T26):
// stages, journal, no-overwrite e as QUATRO fronteiras de queda com morte
// REAL de processo filho + reconciliação em processo NOVO (nada de spy no
// mesmo processo). Dados 100% sintéticos em diretório temporário.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetDatabase, upsertSessionRecord } from '../database'
import { inserirUpload, obterArtigo, obterUpload } from './catalogo'
import {
  admitirUpload, caminhoFinalChat, caminhoStage, cancelarUpload, publicarPreparado,
  receberConteudo, reconciliarIdentidade,
} from './estoque'
import { nomeSeguroArquivo } from '../../../domain/anexosRascunho'

const meuArquivo = fileURLToPath(import.meta.url)
const vitestMjs = createRequire(import.meta.url).resolve('vitest/vitest.mjs')

const SID = '22222222-2222-4222-8222-222222222222'
const CID = `${SID}-main`
let base = ''
let dirLocal = false

function seedSessao(): void {
  upsertSessionRecord({
    id: SID, slug: 'c3a-store', title: 'Sessão C-3a', workspacePath: null, contextKind: 'chat',
    worktreePath: null, messageCount: 0, createdAt: Date.now(), updatedAt: Date.now(),
    sessionJson: JSON.stringify({ id: SID, chats: [{ id: CID, messages: [] }] }),
  })
}

beforeEach(() => {
  const compartilhado = process.env.C3A_SHARED_DIR
  if (compartilhado) {
    dirLocal = false
    base = compartilhado
    process.env.AGENTE_WINDOW_DATA_DIR = join(compartilhado, 'data')
  } else {
    dirLocal = true
    base = mkdtempSync(join(tmpdir(), 'c3a-store-'))
    process.env.AGENTE_WINDOW_DATA_DIR = join(base, 'data')
  }
  mkdirSync(process.env.AGENTE_WINDOW_DATA_DIR, { recursive: true })
  resetDatabase()
  seedSessao()
})

afterEach(() => {
  resetDatabase()
  delete process.env.AGENTE_WINDOW_DATA_DIR
  // O diretório compartilhado dos filhos NUNCA é apagado aqui (o orquestrador
  // é quem limpa o próprio temp ao final).
  if (dirLocal && base && existsSync(base)) rmSync(base, { recursive: true, force: true })
})

/** Roda ESTE arquivo num processo filho (fixture com morte real / reconciliação nova). */
function filho(nomeTeste: string, extra: Record<string, string>): { status: number | null; stdout: string } {
  const resultado = spawnSync(process.execPath, [vitestMjs, 'run', meuArquivo, '-t', nomeTeste, '--reporter=basic', '--maxWorkers=1'], {
    cwd: process.cwd(),
    env: { ...process.env, ...extra },
    encoding: 'utf8',
    timeout: 120_000,
  })
  return { status: resultado.status, stdout: `${resultado.stdout ?? ''}${resultado.stderr ?? ''}` }
}

async function admissaoCompleta(nome: string, bytes: number) {
  const recibo = await admitirUpload({ sessionId: SID, chatId: CID, name: nome, declaredBytes: bytes, mode: 'copy', scope: 'chat' })
  const corpo = Buffer.alloc(bytes, 7)
  const concluido = await receberConteudo(SID, CID, recibo.uploadId, Readable.from([corpo]))
  return { recibo, concluido }
}

function marcarFixture(codigo: string): void {
  writeFileSync(join(base, `fixture-${codigo}-ran`), 'ok', 'utf8')
}

describe('C-3a armazenamento e publicação', () => {
  it('C3A-T04 — transferência de 64 MiB síncronos conclui com hash e arquivo íntegro (fixture positiva)', async () => {
    const bytes = 64 * 1024 * 1024
    const recibo = await admitirUpload({ sessionId: SID, chatId: CID, name: 'volume.bin', declaredBytes: bytes, mode: 'copy', scope: 'chat' })
    const bloco = Buffer.alloc(1024 * 1024, 3)
    async function* gerador() { for (let indice = 0; indice < 64; indice += 1) yield bloco }
    const concluido = await receberConteudo(SID, CID, recibo.uploadId, Readable.from(gerador()))
    expect(concluido.state).toBe('pronto')
    expect(concluido.bytes).toBe(bytes)
    expect(concluido.sha256).toMatch(/^[0-9a-f]{64}$/)
    const artigo = obterArtigo(recibo.artifactId)!
    expect(artigo.bytes).toBe(bytes)
    expect(statSync(join(process.env.AGENTE_WINDOW_DATA_DIR!, 'uploads', artigo.locator)).size).toBe(bytes)
  }, 60_000)

  it('C3A-T05 — nomes Unicode/perigosos viram segmento seguro; caminho armazenado nunca contém nome de risco', async () => {
    const perigoso = '../..\\evilnome com acentuação çãé.txt'
    const { concluido } = await admissaoCompleta(perigoso, 4)
    const artigo = obterArtigo(concluido.artifactId)!
    expect(artigo.locator).not.toContain('..')
    expect(artigo.locator).not.toContain('\\')
    expect(artigo.locator.endsWith('evilnome com acentuação çãé.txt')).toBe(true)
    expect(nomeSeguroArquivo(perigoso)).toBe('evilnome com acentuação çãé.txt')
    const absoluto = join(process.env.AGENTE_WINDOW_DATA_DIR!, 'uploads', artigo.locator)
    expect(absoluto.startsWith(join(process.env.AGENTE_WINDOW_DATA_DIR!, 'uploads', 'chats'))).toBe(true)
    expect(existsSync(absoluto)).toBe(true)
  })

  it('C3A-T06 — referência registra fingerprint e recusa caminho fora do workspace', async () => {
    const { registrarReferencia, verificarReferencia } = await import('./referencias')
    const raiz = join(base, 'projeto')
    mkdirSync(join(raiz, 'docs'), { recursive: true })
    writeFileSync(join(raiz, 'docs', 'nota.md'), 'conteúdo sintético', 'utf8')
    const recibo = await registrarReferencia({
      sessionId: SID, chatId: CID, workspaceRoot: raiz, sourcePath: 'docs/nota.md',
    })
    expect(recibo.mode).toBe('reference')
    expect(recibo.sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(await verificarReferencia(recibo.artifactId)).toEqual({ presente: true, integro: true })
    await expect(registrarReferencia({
      sessionId: SID, chatId: CID, workspaceRoot: raiz, sourcePath: '../../fora.txt',
    })).rejects.toMatchObject({ code: 'reference_out_of_scope' })
    writeFileSync(join(raiz, 'docs', 'nota.md'), 'alterado', 'utf8')
    expect(await verificarReferencia(recibo.artifactId)).toEqual({ presente: true, integro: false })
  })

  it('C3A-T08 — interrupção antes do commit não cria estado pronto nem artefato publicado', async () => {
    const recibo = await admitirUpload({ sessionId: SID, chatId: CID, name: 'cortado.bin', declaredBytes: 32, mode: 'copy', scope: 'chat' })
    const { Readable: ReadableNode } = await import('node:stream')
    const fonte = new ReadableNode({
      read() {
        // A falha acontece DURANTE o consumo (depois dos handlers ligados).
        process.nextTick(() => this.destroy(new Error('queda de rede simulada')))
      },
    })
    await expect(receberConteudo(SID, CID, recibo.uploadId, fonte)).rejects.toThrow()
    const linha = obterUpload(SID, CID, recibo.uploadId)!
    expect(linha.state).toBe('falhou')
    expect(obterArtigo(recibo.artifactId)).toBeUndefined()
    expect(existsSync(caminhoFinalChat(undefined, SID, CID, recibo.artifactId, 'cortado.bin'))).toBe(false)
  })

  it('C3A-T11 — colisão de destino preserva os bytes anteriores (nunca sobrescreve)', async () => {
    const uploadId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    const final = caminhoFinalChat(undefined, SID, CID, uploadId, 'unico.txt')
    mkdirSync(join(final, '..'), { recursive: true })
    writeFileSync(final, 'ANTIGO', 'utf8')
    const stage = caminhoStage(undefined, SID, CID, uploadId)
    mkdirSync(join(stage, '..'), { recursive: true })
    writeFileSync(stage, 'NOVO!', 'utf8')
    inserirUpload({
      sessionId: SID, chatId: CID, uploadId, artifactId: uploadId, name: 'unico.txt',
      declaredBytes: 5, mime: '', receivedBytes: 5, digest: 'd'.repeat(64), state: 'preparado',
      stagePath: stage, finalPath: final, mode: 'copy', scope: 'chat', workspaceRoot: null,
      createdAt: Date.now(), updatedAt: Date.now(), errorCode: null,
    })
    const recibo = await publicarPreparado(SID, CID, uploadId)
    expect(recibo.state).toBe('pronto')
    expect(readFileSync(final, 'utf8')).toBe('ANTIGO')
    const artigo = obterArtigo(uploadId)!
    expect(readFileSync(join(process.env.AGENTE_WINDOW_DATA_DIR!, 'uploads', artigo.locator), 'utf8')).toBe('NOVO!')
    expect(artigo.locator).not.toBe(join('chats', SID, CID, uploadId, 'unico.txt').split('\\').join('/'))
  })

  it('C3A-T12 — intenção durável existe ANTES da publicação (journal primeiro, link depois)', async () => {
    const uploadId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    const stage = caminhoStage(undefined, SID, CID, uploadId)
    const final = caminhoFinalChat(undefined, SID, CID, uploadId, 'journal.txt')
    mkdirSync(join(stage, '..'), { recursive: true })
    writeFileSync(stage, 'journal', 'utf8')
    inserirUpload({
      sessionId: SID, chatId: CID, uploadId, artifactId: uploadId, name: 'journal.txt',
      declaredBytes: 7, mime: '', receivedBytes: 7, digest: 'e'.repeat(64), state: 'preparado',
      stagePath: stage, finalPath: final, mode: 'copy', scope: 'chat', workspaceRoot: null,
      createdAt: Date.now(), updatedAt: Date.now(), errorCode: null,
    })
    expect(obterUpload(SID, CID, uploadId)!.state).toBe('preparado')
    expect(existsSync(final)).toBe(false)
    const recibo = await publicarPreparado(SID, CID, uploadId)
    expect(recibo.state).toBe('pronto')
    expect(existsSync(final)).toBe(true)
    expect(existsSync(stage)).toBe(false)
  })

  it('C3A-T26 — upload órfão (sem mensagem) nunca vira artefato publicado por associação implícita', async () => {
    const recibo = await admitirUpload({ sessionId: SID, chatId: CID, name: 'orfao.bin', declaredBytes: 4, mode: 'copy', scope: 'chat' })
    expect(obterUpload(SID, CID, recibo.uploadId)!.state).toBe('admitido')
    expect(obterArtigo(recibo.artifactId)).toBeUndefined()
    const { listarArtigosChat } = await import('./catalogo')
    expect(listarArtigosChat(SID, CID)).toHaveLength(0)
    await cancelarUpload(SID, CID, recibo.uploadId)
    expect(obterUpload(SID, CID, recibo.uploadId)!.state).toBe('cancelado')
    expect(obterArtigo(recibo.artifactId)).toBeUndefined()
  })

  // ---------- fronteiras de queda: filho morre de verdade; processo NOVO reconcilia ----------

  it('C3A-T14 — stage completo antes do commit é finalizado por processo NOVO (morte real do filho)', () => {
    const fix = filho('__fixture_T14', { C3A_SHARED_DIR: base, C3A_CRASH_FIXTURE: 'T14' })
    expect(existsSync(join(base, 'fixture-T14-ran')), fix.stdout.slice(-1200)).toBe(true)
    expect(fix.status, fix.stdout.slice(-1200)).not.toBe(0)
    const rec = filho('__reconcile_T14', { C3A_SHARED_DIR: base, C3A_RECONCILE: 'T14' })
    expect(rec.status, rec.stdout.slice(-1200)).toBe(0)
  }, 180_000)

  it('C3A-T15 — publicação antes do commit é confirmada por processo NOVO (morte real do filho)', () => {
    const fix = filho('__fixture_T15', { C3A_SHARED_DIR: base, C3A_CRASH_FIXTURE: 'T15' })
    expect(existsSync(join(base, 'fixture-T15-ran')), fix.stdout.slice(-1200)).toBe(true)
    expect(fix.status, fix.stdout.slice(-1200)).not.toBe(0)
    const rec = filho('__reconcile_T15', { C3A_SHARED_DIR: base, C3A_RECONCILE: 'T15' })
    expect(rec.status, rec.stdout.slice(-1200)).toBe(0)
  }, 180_000)

  it('C3A-T16 — arquivo idêntico já existente: bytes preservados e artefato próprio por processo NOVO', () => {
    const fix = filho('__fixture_T16', { C3A_SHARED_DIR: base, C3A_CRASH_FIXTURE: 'T16' })
    expect(existsSync(join(base, 'fixture-T16-ran')), fix.stdout.slice(-1200)).toBe(true)
    expect(fix.status, fix.stdout.slice(-1200)).not.toBe(0)
    const rec = filho('__reconcile_T16', { C3A_SHARED_DIR: base, C3A_RECONCILE: 'T16' })
    expect(rec.status, rec.stdout.slice(-1200)).toBe(0)
  }, 180_000)

  it('C3A-T17 — stage parcial antes do commit vira falha honesta, sem publicação, em processo NOVO', () => {
    const fix = filho('__fixture_T17', { C3A_SHARED_DIR: base, C3A_CRASH_FIXTURE: 'T17' })
    expect(existsSync(join(base, 'fixture-T17-ran')), fix.stdout.slice(-1200)).toBe(true)
    expect(fix.status, fix.stdout.slice(-1200)).not.toBe(0)
    const rec = filho('__reconcile_T17', { C3A_SHARED_DIR: base, C3A_RECONCILE: 'T17' })
    expect(rec.status, rec.stdout.slice(-1200)).toBe(0)
  }, 180_000)

  // ---------- entrypoints dos filhos (no-op no modo normal do suíte) ----------

  it('__fixture_T14', () => {
    if (process.env.C3A_CRASH_FIXTURE !== 'T14') return
    marcarFixture('T14')
    const uploadId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    const stage = caminhoStage(undefined, SID, CID, uploadId)
    const final = caminhoFinalChat(undefined, SID, CID, uploadId, 'quedo.bin')
    mkdirSync(join(stage, '..'), { recursive: true })
    writeFileSync(stage, Buffer.alloc(16, 1))
    inserirUpload({
      sessionId: SID, chatId: CID, uploadId, artifactId: uploadId, name: 'quedo.bin',
      declaredBytes: 16, mime: '', receivedBytes: 16, digest: null, state: 'recebendo',
      stagePath: stage, finalPath: final, mode: 'copy', scope: 'chat', workspaceRoot: null,
      createdAt: Date.now(), updatedAt: Date.now(), errorCode: null,
    })
    process.exit(9)
  })

  it('__reconcile_T14', async () => {
    if (process.env.C3A_RECONCILE !== 'T14') return
    await reconciliarIdentidade(SID, CID)
    const uploadId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    const linha = obterUpload(SID, CID, uploadId)!
    expect(linha.state).toBe('pronto')
    const artigo = obterArtigo(uploadId)!
    expect(statSync(join(process.env.AGENTE_WINDOW_DATA_DIR!, 'uploads', artigo.locator)).size).toBe(16)
    expect(existsSync(linha.stagePath!)).toBe(false)
  })

  it('__fixture_T15', () => {
    if (process.env.C3A_CRASH_FIXTURE !== 'T15') return
    marcarFixture('T15')
    const uploadId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
    const stage = caminhoStage(undefined, SID, CID, uploadId)
    const final = caminhoFinalChat(undefined, SID, CID, uploadId, 'linkado.bin')
    mkdirSync(join(final, '..'), { recursive: true })
    writeFileSync(final, Buffer.alloc(16, 2))
    inserirUpload({
      sessionId: SID, chatId: CID, uploadId, artifactId: uploadId, name: 'linkado.bin',
      declaredBytes: 16, mime: '', receivedBytes: 16, digest: 'f'.repeat(64), state: 'preparado',
      stagePath: stage, finalPath: final, mode: 'copy', scope: 'chat', workspaceRoot: null,
      createdAt: Date.now(), updatedAt: Date.now(), errorCode: null,
    })
    process.exit(9)
  })

  it('__reconcile_T15', async () => {
    if (process.env.C3A_RECONCILE !== 'T15') return
    await reconciliarIdentidade(SID, CID)
    const uploadId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
    expect(obterUpload(SID, CID, uploadId)!.state).toBe('pronto')
    const artigo = obterArtigo(uploadId)!
    expect(artigo.sha256).toBe('f'.repeat(64))
    expect(statSync(join(process.env.AGENTE_WINDOW_DATA_DIR!, 'uploads', artigo.locator)).size).toBe(16)
  })

  it('__fixture_T16', () => {
    if (process.env.C3A_CRASH_FIXTURE !== 'T16') return
    marcarFixture('T16')
    const uploadId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
    const stage = caminhoStage(undefined, SID, CID, uploadId)
    const final = caminhoFinalChat(undefined, SID, CID, uploadId, 'duplicado.txt')
    mkdirSync(join(final, '..'), { recursive: true })
    mkdirSync(join(stage, '..'), { recursive: true })
    writeFileSync(final, 'IGUAL', 'utf8')
    writeFileSync(stage, 'IGUAL', 'utf8')
    const digest = createHash('sha256').update('IGUAL').digest('hex')
    inserirUpload({
      sessionId: SID, chatId: CID, uploadId, artifactId: uploadId, name: 'duplicado.txt',
      declaredBytes: 5, mime: '', receivedBytes: 5, digest, state: 'preparado',
      stagePath: stage, finalPath: final, mode: 'copy', scope: 'chat', workspaceRoot: null,
      createdAt: Date.now(), updatedAt: Date.now(), errorCode: null,
    })
    process.exit(9)
  })

  it('__reconcile_T16', async () => {
    if (process.env.C3A_RECONCILE !== 'T16') return
    await reconciliarIdentidade(SID, CID)
    const uploadId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
    const linha = obterUpload(SID, CID, uploadId)!
    expect(linha.state).toBe('pronto')
    const final = caminhoFinalChat(undefined, SID, CID, uploadId, 'duplicado.txt')
    expect(readFileSync(final, 'utf8')).toBe('IGUAL')
    const artigo = obterArtigo(uploadId)!
    const absoluto = join(process.env.AGENTE_WINDOW_DATA_DIR!, 'uploads', artigo.locator)
    expect(absoluto).not.toBe(final)
    expect(readFileSync(absoluto, 'utf8')).toBe('IGUAL')
  })

  it('__fixture_T17', () => {
    if (process.env.C3A_CRASH_FIXTURE !== 'T17') return
    marcarFixture('T17')
    const uploadId = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
    const stage = caminhoStage(undefined, SID, CID, uploadId)
    const final = caminhoFinalChat(undefined, SID, CID, uploadId, 'parcial.bin')
    mkdirSync(join(stage, '..'), { recursive: true })
    writeFileSync(stage, Buffer.alloc(8, 5))
    inserirUpload({
      sessionId: SID, chatId: CID, uploadId, artifactId: uploadId, name: 'parcial.bin',
      declaredBytes: 16, mime: '', receivedBytes: 8, digest: null, state: 'recebendo',
      stagePath: stage, finalPath: final, mode: 'copy', scope: 'chat', workspaceRoot: null,
      createdAt: Date.now(), updatedAt: Date.now(), errorCode: null,
    })
    process.exit(9)
  })

  it('__reconcile_T17', async () => {
    if (process.env.C3A_RECONCILE !== 'T17') return
    await reconciliarIdentidade(SID, CID)
    const uploadId = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
    const linha = obterUpload(SID, CID, uploadId)!
    expect(linha.state).toBe('falhou')
    expect(linha.errorCode).toBe('interrupted')
    expect(obterArtigo(uploadId)).toBeUndefined()
    expect(existsSync(linha.stagePath!)).toBe(false)
    expect(existsSync(caminhoFinalChat(undefined, SID, CID, uploadId, 'parcial.bin'))).toBe(false)
  })
})
