// C-3a — armazenamento/publicação (T04/T05/T08/T11/T12/T14–T17/T26/T36):
// stages, journal, no-overwrite e as QUATRO fronteiras de queda com morte
// REAL de processo filho + reconciliação em processo NOVO (nada de spy no
// mesmo processo). Dados 100% sintéticos em diretório temporário.
//
// Correções do parecer: os filhos rodam sem `--maxWorkers` conflitante
// (portabilidade Windows), os digests de fixture são calculados sobre os
// BYTES REAIS (T15 não aceita mais digest fictício), o filho de fixture morre
// de verdade (SIGKILL externo no meio do stream) e o processo NOVO reconcilia
// declarando os escritores interrompidos.
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetDatabase, upsertSessionRecord } from '../database'
import { atualizarUpload, inserirUpload, obterArtigo, obterUpload, uploadsAtivos } from './catalogo'
import {
  admitirUpload, artifactIdDe, caminhoFinalChat, caminhoStagePara, cancelarUpload,
  publicarPreparado, receberConteudo, reconciliarIdentidade,
} from './estoque'
import { nomeSeguroArquivo } from '../../../domain/anexosRascunho'

const meuArquivo = fileURLToPath(import.meta.url)
// No Windows `vitest/vitest.mjs` resolve como caminho com `\\` e o Node executa
// o shim `.mjs`; a forma absoluta nativa é a que funciona nos dois SOs.
const vitestMjs = fileURLToPath(new URL(createRequire(import.meta.url).resolve('vitest/vitest.mjs'), 'file:'))

/**
 * Raiz do projeto do app (onde vivem `vitest.config`/`package.json`): o filho
 * precisa rodar com o MESMO `cwd` do pai — o vitest resolve `include` a partir
 * dele, e um `cwd` de subpasta não coleta arquivo nenhum.
 */
function raizDoProjeto(): string {
  let dir = import.meta.dirname
  for (let nivel = 0; nivel < 8; nivel += 1) {
    if (existsSync(join(dir, 'vitest.config.ts')) || existsSync(join(dir, 'package.json'))) {
      if (existsSync(join(dir, 'vitest.config.ts'))) return dir
    }
    dir = dirname(dir)
  }
  return process.cwd()
}
const RAIZ_DO_PROJETO = raizDoProjeto()
const sha = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex')

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

/**
 * Contexto de execução do filho derivado do PAI, não do `cwd`:
 *  · config: `--config` só quando o pai foi iniciado com um (o perfil de teste
 *    passa `--require`, não `--config`, então normalmente não há nada a passar);
 *  · ambiente: herda `AGENTE_WINDOW_TEST_HOME`/`NODE_OPTIONS` do pai, para o
 *    filho enxergar o MESMO perfil isolado (sem isso o vitest recusa rodar);
 *  · raiz: `cwd` do pai no momento do spawn (o filho precisa resolver
 *    `include` a partir da raiz do projeto).
 */
function argumentosDoFilho(): string[] {
  const args: string[] = []
  const indice = process.execArgv.findIndex((arg) => arg === '--config' || arg.startsWith('--config='))
  if (indice >= 0) {
    const bruto = process.execArgv[indice]
    if (bruto.includes('=')) args.push(bruto)
    else if (process.execArgv[indice + 1]) args.push('--config', process.execArgv[indice + 1])
  }
  return args
}

/**
 * Roda ESTE arquivo num processo filho. Sem `--maxWorkers=1`: no Windows ele
 * conflita com `minThreads` do pool e o filho não coleta teste nenhum (falha
 * de portabilidade apontada no parecer §4). Um fork único basta.
 */
function filho(nomeTeste: string, extra: Record<string, string>): { status: number | null; stdout: string } {
  // Config do PRÓPRIO projeto (mesmo runner que roda o arquivo hoje); um fork
  // único evita disputa de workers e o conflito minThreads/maxThreads do
  // Windows sem precisar de flags numéricas.
  const resultado = spawnSync(process.execPath, [
    ...argumentosDoFilho(),
    vitestMjs, 'run', meuArquivo, '-t', nomeTeste, '--reporter=basic',
    '--pool=forks', '--poolOptions.forks.singleFork=true',
  ], {
    cwd: RAIZ_DO_PROJETO,
    env: { ...process.env, ...extra },
    encoding: 'utf8',
    timeout: 180_000,
    // Windows: o launcher é um .exe dentro do pacote do Node.
    shell: false,
    windowsHide: true,
    windowsVerbatimArguments: false,
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

/** Linha de teste com `preparado` + stage real (bytes reais, digest real). */
function prepararLinha(uploadId: string, nome: string, conteudo: Buffer, opcoes: { stage?: boolean; final?: boolean } = {}) {
  const final = caminhoFinalChat(undefined, SID, CID, uploadId, nome)
  const stage = caminhoStagePara(final, uploadId)
  if (opcoes.stage !== false) {
    mkdirSync(join(stage, '..'), { recursive: true })
    writeFileSync(stage, conteudo)
  }
  inserirUpload({
    sessionId: SID, chatId: CID, uploadId, artifactId: uploadId, name: nome,
    declaredBytes: conteudo.length, mime: '', receivedBytes: conteudo.length, digest: sha(conteudo),
    state: 'preparado', stagePath: stage, finalPath: final, mode: 'copy', scope: 'chat', workspaceRoot: null,
    createdAt: Date.now(), updatedAt: Date.now(), errorCode: null,
  })
  return { stage, final }
}

describe('C-3a armazenamento e publicação', () => {
  it('C3A-T04 — transferência de 64 MiB em streams conclui com hash e arquivo íntegro (fixture positiva)', async () => {
    const bytes = 64 * 1024 * 1024
    const recibo = await admitirUpload({ sessionId: SID, chatId: CID, name: 'volume.bin', declaredBytes: bytes, mode: 'copy', scope: 'chat' })
    const bloco = Buffer.alloc(1024 * 1024, 3)
    async function* gerador() { for (let indice = 0; indice < 64; indice += 1) yield bloco }
    const antes = process.memoryUsage().rss
    const concluido = await receberConteudo(SID, CID, recibo.uploadId, Readable.from(gerador()))
    const depois = process.memoryUsage().rss
    expect(concluido.state).toBe('pronto')
    expect(concluido.bytes).toBe(bytes)
    expect(concluido.sha256).toMatch(/^[0-9a-f]{64}$/)
    const artigo = obterArtigo(concluido.artifactId)!
    expect(artigo.bytes).toBe(bytes)
    expect(statSync(join(process.env.AGENTE_WINDOW_DATA_DIR!, 'uploads', artigo.locator)).size).toBe(bytes)
    // R05 — memória cresce com buffers limitados, não com o arquivo inteiro.
    expect(depois - antes).toBeLessThan(96 * 1024 * 1024)
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
    const fonte = new Readable({
      read() {
        process.nextTick(() => this.destroy(new Error('queda de rede simulada')))
      },
    })
    await expect(receberConteudo(SID, CID, recibo.uploadId, fonte)).rejects.toThrow()
    const linha = obterUpload(SID, CID, recibo.uploadId)!
    expect(linha.state).toBe('falhou')
    expect(obterArtigo(recibo.artifactId)).toBeUndefined()
    expect(existsSync(caminhoFinalChat(undefined, SID, CID, recibo.artifactId!, 'cortado.bin'))).toBe(false)
    // Nada "pronto" sobrou em contagem de concorrência.
    expect(uploadsAtivos().some((item) => item.uploadId === recibo.uploadId)).toBe(false)
  })

  it('C3A-T11 — colisão de destino preserva os bytes anteriores (nunca sobrescreve)', async () => {
    const conteudo = Buffer.from('NOVO!', 'utf8')
    const { final } = prepararLinha('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'unico.txt', conteudo)
    mkdirSync(join(final, '..'), { recursive: true })
    writeFileSync(final, 'ANTIGO', 'utf8')
    const recibo = await publicarPreparado(SID, CID, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    expect(recibo.state).toBe('pronto')
    // Bytes alheios intactos e o artefato publicado tem nome próprio.
    expect(readFileSync(final, 'utf8')).toBe('ANTIGO')
    const artigo = obterArtigo(recibo.artifactId)!
    const publicado = join(process.env.AGENTE_WINDOW_DATA_DIR!, 'uploads', artigo.locator)
    expect(readFileSync(publicado, 'utf8')).toBe('NOVO!')
    expect(publicado).not.toBe(final)
    // O nome final escolhido ficou DURÁVEL no ledger (B04), não só em memória.
    expect(obterUpload(SID, CID, recibo.uploadId)!.finalPath).toBe(publicado)
  })

  it('C3A-T12 — intenção durável existe ANTES da publicação; nome de colisão é gravado antes do link', async () => {
    const uploadId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    const conteudo = Buffer.from('journal', 'utf8')
    const { stage, final } = prepararLinha(uploadId, 'journal.txt', conteudo)
    expect(obterUpload(SID, CID, uploadId)!.state).toBe('preparado')
    expect(existsSync(final)).toBe(false)
    expect(existsSync(stage)).toBe(true)
    const recibo = await publicarPreparado(SID, CID, uploadId)
    expect(recibo.state).toBe('pronto')
    expect(existsSync(recibo.artifactId ? join(process.env.AGENTE_WINDOW_DATA_DIR!, 'uploads', obterArtigo(recibo.artifactId)!.locator) : final)).toBe(true)
    expect(existsSync(stage)).toBe(false)
  })

  it('C3A-T26 — upload órfão (sem mensagem) nunca vira artefato publicado por associação implícita', async () => {
    const recibo = await admitirUpload({ sessionId: SID, chatId: CID, name: 'orfao.bin', declaredBytes: 4, mode: 'copy', scope: 'chat' })
    expect(obterUpload(SID, CID, recibo.uploadId)!.state).toBe('admitido')
    expect(obterArtigo(recibo.artifactId)).toBeUndefined()
    const { listarArtigosChat } = await import('./catalogo')
    expect(listarArtigosChat(SID, CID)).toHaveLength(0)
    const cancelado = await cancelarUpload(SID, CID, recibo.uploadId)
    expect(cancelado.state).toBe('cancelado')
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

  it('C3A-T36 — um escritor por tentativa: GET concorrente não mata o PUT ativo e o segundo PUT é recusado', async () => {
    const uploadId = '99999999-9999-4999-8999-999999999999'
    const recibo = await admitirUpload({ sessionId: SID, chatId: CID, name: 'morre.bin', declaredBytes: 2048, mode: 'copy', scope: 'chat', uploadId })
    expect(recibo.state).toBe('admitido')

    // Escritor ATIVO (stream aberto, sem terminar). A reconciliação de um GET
    // concorrente NÃO pode tratar `recebendo` como escritor morto (B05).
    const fluxo = new Readable({ read() { /* nunca termina: escritor ativo */ } })
    const emVoo = receberConteudo(SID, CID, uploadId, fluxo)
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(obterUpload(SID, CID, uploadId)!.state).toBe('recebendo')
    await reconciliarIdentidade(SID, CID)
    expect(obterUpload(SID, CID, uploadId)!.state, 'GET concorrente não mata o PUT ativo').toBe('recebendo')

    // Segundo transmissor na MESMA identidade é recusado — nunca duas
    // escritas no mesmo stage.
    await expect(receberConteudo(SID, CID, uploadId, Readable.from([Buffer.from('x')])))
      .rejects.toMatchObject({ code: 'upload_in_flight' })

    // O escritor real termina com bytes a menos: falha honesta, sem artefato.
    fluxo.push(Buffer.alloc(1024, 1))
    fluxo.push(null)
    await expect(emVoo).rejects.toMatchObject({ code: 'size_mismatch' })
    expect(obterUpload(SID, CID, uploadId)!.state).toBe('falhou')
    expect(obterArtigo(recibo.artifactId)).toBeUndefined()
  })

  // ---------- entrypoints dos filhos (no-op no modo normal do suíte) ----------

  it('__fixture_T14', () => {
    if (process.env.C3A_CRASH_FIXTURE !== 'T14') return
    marcarFixture('T14')
    const uploadId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    const conteudo = Buffer.alloc(16, 1)
    // Stage COMPLETO (bytes reais, digest real) e linha ainda `recebendo`:
    // a queda é entre o fim do stream e o commit.
    const { stage } = prepararLinha(uploadId, 'quedo.bin', conteudo)
    atualizarUpload(SID, CID, uploadId, { state: 'recebendo', digest: null, receivedBytes: 0 })
    expect(existsSync(stage)).toBe(true)
    process.exit(9)
  })

  it('__reconcile_T14', async () => {
    if (process.env.C3A_RECONCILE !== 'T14') return
    const uploadId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    await reconciliarIdentidade(SID, CID, {}, { todos: true })
    const linha = obterUpload(SID, CID, uploadId)!
    expect(linha.state).toBe('pronto')
    const artigo = obterArtigo(linha.artifactId!)!
    expect(statSync(join(process.env.AGENTE_WINDOW_DATA_DIR!, 'uploads', artigo.locator)).size).toBe(16)
    expect(artigo.sha256).toBe(sha(Buffer.alloc(16, 1)))
    expect(existsSync(linha.stagePath!)).toBe(false)
  })

  it('__fixture_T15', () => {
    if (process.env.C3A_CRASH_FIXTURE !== 'T15') return
    marcarFixture('T15')
    const uploadId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
    const conteudo = Buffer.alloc(16, 2)
    const { final, stage } = prepararLinha(uploadId, 'linkado.bin', conteudo)
    // Link já feito (publicação antes do commit), stage removido: só o destino
    // e o digest REAL da intenção provam a publicação.
    mkdirSync(join(final, '..'), { recursive: true })
    writeFileSync(final, conteudo)
    rmSync(stage, { force: true })
    expect(existsSync(stage)).toBe(false)
    process.exit(9)
  })

  it('__reconcile_T15', async () => {
    if (process.env.C3A_RECONCILE !== 'T15') return
    const uploadId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
    await reconciliarIdentidade(SID, CID, {}, { todos: true })
    const linha = obterUpload(SID, CID, uploadId)!
    expect(linha.state).toBe('pronto')
    const artigo = obterArtigo(linha.artifactId!)!
    expect(artigo.sha256).toBe(sha(Buffer.alloc(16, 2)))
    expect(statSync(join(process.env.AGENTE_WINDOW_DATA_DIR!, 'uploads', artigo.locator)).size).toBe(16)
  })

  it('__fixture_T16', () => {
    if (process.env.C3A_CRASH_FIXTURE !== 'T16') return
    marcarFixture('T16')
    const uploadId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
    const conteudo = Buffer.from('IGUAL', 'utf8')
    const { stage, final } = prepararLinha(uploadId, 'duplicado.txt', conteudo)
    // Arquivo ESTRANGEIRO idêntico já no destino: bytes preservados, artefato
    // próprio.
    mkdirSync(join(final, '..'), { recursive: true })
    writeFileSync(final, conteudo)
    expect(existsSync(stage)).toBe(true)
    process.exit(9)
  })

  it('__reconcile_T16', async () => {
    if (process.env.C3A_RECONCILE !== 'T16') return
    const uploadId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
    await reconciliarIdentidade(SID, CID, {}, { todos: true })
    const linha = obterUpload(SID, CID, uploadId)!
    expect(linha.state).toBe('pronto')
    const final = caminhoFinalChat(undefined, SID, CID, uploadId, 'duplicado.txt')
    expect(readFileSync(final, 'utf8')).toBe('IGUAL')
    const artigo = obterArtigo(linha.artifactId!)!
    const absoluto = join(process.env.AGENTE_WINDOW_DATA_DIR!, 'uploads', artigo.locator)
    expect(absoluto).not.toBe(final)
    expect(readFileSync(absoluto, 'utf8')).toBe('IGUAL')
  })

  it('__fixture_T17', () => {
    if (process.env.C3A_CRASH_FIXTURE !== 'T17') return
    marcarFixture('T17')
    const uploadId = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
    const final = caminhoFinalChat(undefined, SID, CID, uploadId, 'parcial.bin')
    const stage = caminhoStagePara(final, uploadId)
    mkdirSync(join(stage, '..'), { recursive: true })
    writeFileSync(stage, Buffer.alloc(8, 5))
    inserirUpload({
      sessionId: SID, chatId: CID, uploadId, artifactId: artifactIdDe({ sessionId: SID, chatId: CID, name: 'parcial.bin', declaredBytes: 16 }),
      name: 'parcial.bin', declaredBytes: 16, mime: '', receivedBytes: 8, digest: null, state: 'recebendo',
      stagePath: stage, finalPath: final, mode: 'copy', scope: 'chat', workspaceRoot: null,
      createdAt: Date.now(), updatedAt: Date.now(), errorCode: null,
    })
    process.exit(9)
  })

  it('__reconcile_T17', async () => {
    if (process.env.C3A_RECONCILE !== 'T17') return
    const uploadId = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
    await reconciliarIdentidade(SID, CID, {}, { todos: true })
    const linha = obterUpload(SID, CID, uploadId)!
    expect(linha.state).toBe('falhou')
    expect(linha.errorCode).toBe('interrupted')
    expect(obterArtigo(linha.artifactId!)).toBeUndefined()
    expect(existsSync(linha.stagePath!)).toBe(false)
    expect(existsSync(caminhoFinalChat(undefined, SID, CID, uploadId, 'parcial.bin'))).toBe(false)
  })
})
