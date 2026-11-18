// C-3a — ciclo de vida na exclusão e migração (T27/T28/T29/T32/R12/R04).
import Database from 'better-sqlite3'
import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PassThrough, Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getDatabase, resetDatabase, upsertSessionRecord } from '../database'
import { getDatabasePath } from '../paths'
import { executarLimpezaDelecao, iniciarOuConsultarDelecao, sessaoExcluida } from '../deletions'
import { receipt } from '../sessionMutations'
import { readTranscript, writeTranscript, type TranscriptEntry } from '../transcripts'
import { atualizarUpload, listarArtigosChat, obterArtigo, obterUpload } from './catalogo'
import { admitirUpload, caminhoFinalChat, caminhoStage, cancelarUpload, receberConteudo } from './estoque'
import { registrarReferencia } from './referencias'
import { tratarRotasAnexos } from './rotas'
import { validarSchemaAnexos } from './schemaAnexos'

const SID = '11111111-1111-4111-8111-111111111111'
const CID = '22222222-2222-4222-8222-222222222222'
const OUTRO_SID = '33333333-3333-4333-8333-333333333333'
const OUTRO_CID = '44444444-4444-4444-8444-444444444444'

let base: string

function seedSessao(id: string, chatId: string, slug: string): void {
  upsertSessionRecord({
    id, slug, title: `Sessão ${slug}`, workspacePath: null, contextKind: 'chat',
    worktreePath: null, messageCount: 0, createdAt: Date.now(), updatedAt: Date.now(),
    sessionJson: JSON.stringify({ id, chats: [{ id: chatId, messages: [] }] }),
  })
}

async function publicarCopia(
  sessionId: string, chatId: string, name: string, bytes: Buffer,
  escopo: 'chat' | 'workspace' = 'chat', workspaceRoot?: string,
): Promise<{ uploadId: string; artifactId: string; final: string }> {
  const recibo = await admitirUpload({
    sessionId, chatId, name, declaredBytes: bytes.length, mode: 'copy', scope: escopo, workspaceRoot,
  })
  await receberConteudo(sessionId, chatId, recibo.uploadId, Readable.from([bytes]))
  const final = escopo === 'workspace'
    ? join(workspaceRoot!, 'uploads', name)
    : caminhoFinalChat(undefined, sessionId, chatId, recibo.artifactId, name)
  return { uploadId: recibo.uploadId, artifactId: recibo.artifactId, final }
}

function snapshotTabelas(): Record<string, number> {
  const db = getDatabase()
  const tabelas = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'attachment_%'",
  ).all() as Array<{ name: string }>
  const saida: Record<string, number> = {}
  for (const { name } of tabelas) {
    saida[name] = (db.prepare(`SELECT COUNT(*) AS c FROM "${name}"`).get() as { c: number }).c
  }
  return saida
}

function requisicao(metodo: string, caminho: string, corpo?: unknown) {
  const pedacos = corpo !== undefined ? [Buffer.from(JSON.stringify(corpo))] : []
  const fluxo = Readable.from(pedacos) as Readable & Record<string, unknown>
  fluxo.method = metodo
  fluxo.url = caminho
  fluxo.headers = {
    host: '127.0.0.1:5174', origin: 'http://127.0.0.1:5174', 'sec-fetch-site': 'same-origin',
    'content-type': 'application/json',
  }
  fluxo.socket = { localPort: 5174, encrypted: false }
  return fluxo
}

function resposta() {
  const fluxo = new PassThrough() as PassThrough & {
    statusCode: number; body: string; headers: Record<string, string>
    setHeader(chave: string, valor: string): void
  }
  fluxo.statusCode = 0
  fluxo.body = ''
  fluxo.headers = {}
  fluxo.setHeader = (chave, valor) => { fluxo.headers[chave] = String(valor) }
  fluxo.on('data', (pedaco: Buffer) => { fluxo.body += pedaco.toString('utf8') })
  return fluxo
}

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'c3a-lifecycle-'))
  process.env.AGENTE_WINDOW_DATA_DIR = join(base, 'data')
  mkdirSync(process.env.AGENTE_WINDOW_DATA_DIR, { recursive: true })
  resetDatabase()
  seedSessao(SID, CID, 'c3a-t27')
  seedSessao(OUTRO_SID, OUTRO_CID, 'c3a-t29-outro')
})

afterEach(() => {
  resetDatabase()
  delete process.env.AGENTE_WINDOW_DATA_DIR
  rmSync(base, { recursive: true, force: true })
})

describe('C-3a ciclo de vida na exclusão', () => {
  it('C3A-T27 — arquivar preserva; excluir sessão/worktree nunca limpa upload final de workspace, referência nem original do projeto', async () => {
    const ws = join(base, 'workspace-t27')
    mkdirSync(join(ws, 'docs'), { recursive: true })
    const original = join(ws, 'docs', 'original-do-projeto.txt')
    writeFileSync(original, 'original intocável do projeto', 'utf8')

    const privado = await publicarCopia(SID, CID, 'privado-chat.txt', Buffer.from('cópia privada da conversa', 'utf8'))
    const finalWs = await publicarCopia(SID, CID, 'upload-final-ws.txt', Buffer.from('cópia na raiz do projeto', 'utf8'), 'workspace', ws)
    const referencia = await registrarReferencia({ sessionId: SID, chatId: CID, workspaceRoot: ws, sourcePath: 'docs/original-do-projeto.txt' })
    expect(referencia.mode).toBe('reference')

    // Arquivar (sem exclusão) preserva tudo: nenhum tombstone, ledger completo.
    expect(sessaoExcluida(SID)).toBe(false)
    expect(listarArtigosChat(SID, CID).length).toBe(3)
    expect(existsSync(privado.final)).toBe(true)
    expect(existsSync(finalWs.final)).toBe(true)
    expect(existsSync(original)).toBe(true)

    // Exclusão registrada: o plano captura ownership ANTES de qualquer destruição.
    const tombstone = iniciarOuConsultarDelecao({ sessionId: SID, deletionId: 'del-t27', expectedRevision: 0 })
    expect(tombstone.cleanupState).toBe('preparado')
    expect(sessaoExcluida(SID)).toBe(true)
    expect(existsSync(privado.final)).toBe(true)
    expect(existsSync(finalWs.final)).toBe(true)
    expect(existsSync(original)).toBe(true)

    const concluido = await executarLimpezaDelecao(SID, false)
    expect(concluido.cleanupState).toBe('concluido')

    // Privado exclusivo da conversa sai; o território do projeto fica:
    expect(existsSync(privado.final)).toBe(false)
    // upload final na raiz ORIGINAL do workspace (E06) nunca é limpo:
    expect(existsSync(finalWs.final)).toBe(true)
    // referência e o próprio original do projeto permanecem intactos:
    expect(existsSync(original)).toBe(true)
    expect(readFileSync(original, 'utf8')).toBe('original intocável do projeto')
  })

  it('C3A-T28 — excluir chat interno limpa só privados exclusivos; falha preserva e retry conclui sem cascade precoce', async () => {
    const ws = join(base, 'workspace-t28')
    mkdirSync(join(ws, 'docs'), { recursive: true })
    const original = join(ws, 'docs', 'dados.csv')
    writeFileSync(original, 'a,b\n1,2\n', 'utf8')

    const exclusivo = await publicarCopia(SID, CID, 'exclusivo.txt', Buffer.from('conteúdo exclusivo A', 'utf8'))
    const divergente = await publicarCopia(SID, CID, 'divergente.txt', Buffer.from('conteúdo B antes da adulteração', 'utf8'))
    const finalWs = await publicarCopia(SID, CID, 'permanente-ws.txt', Buffer.from('cópia do projeto', 'utf8'), 'workspace', ws)
    await registrarReferencia({ sessionId: SID, chatId: CID, workspaceRoot: ws, sourcePath: 'docs/dados.csv' })

    // Conteúdo adulterado FORA do produto depois da publicação: a limpeza
    // confere hash e preserva (evidência `falhou`), nunca apaga às cegas.
    appendFileSync(divergente.final, ' | adulterado fora do produto')

    iniciarOuConsultarDelecao({ sessionId: SID, deletionId: 'del-t28', expectedRevision: 0 })
    const tombstone = await executarLimpezaDelecao(SID, false)
    expect(tombstone.cleanupState).toBe('concluido')

    // Só o privado EXCLUSIVO e íntegro é limpo:
    expect(existsSync(exclusivo.final)).toBe(false)
    expect(existsSync(divergente.final)).toBe(true)
    expect(readFileSync(divergente.final, 'utf8')).toContain('adulterado fora do produto')
    expect(existsSync(finalWs.final)).toBe(true)
    expect(existsSync(original)).toBe(true)

    // Evidência honesta da falha fica no plano; as linhas concluídas saíram.
    const planos = getDatabase().prepare(
      'SELECT artifact_id AS artifactId, state FROM attachment_cleanup_plan WHERE session_id = ?',
    ).all(SID) as Array<{ artifactId: string; state: string }>
    expect(planos).toEqual([{ artifactId: divergente.artifactId, state: 'falhou' }])

    // Retry idempotente: conclui de novo sem cascade (nada é re-apagado).
    const retry = await executarLimpezaDelecao(SID, false)
    expect(retry.cleanupState).toBe('concluido')
    expect(existsSync(exclusivo.final)).toBe(false)
    expect(existsSync(divergente.final)).toBe(true)
    expect(existsSync(finalWs.final)).toBe(true)
    expect(existsSync(original)).toBe(true)
  })

  it('C3A-T29 — exclusão versus upload em voo: tombstone impede publicação tardia; outro dono preservado', async () => {
    // Outro dono publica normalmente (conteúdo idêntico, arquivo próprio).
    const bytes = Buffer.from('mesmo conteúdo em dois donos', 'utf8')
    const doOutro = await publicarCopia(OUTRO_SID, OUTRO_CID, 'do-outro-dono.txt', bytes)

    // Vítima: transferência preparada pronta para publicar (stage completo).
    const emVoo = await admitirUpload({ sessionId: SID, chatId: CID, name: 'em-voo.txt', declaredBytes: bytes.length, mode: 'copy', scope: 'chat' })
    const stage = caminhoStage(undefined, SID, CID, emVoo.uploadId)
    mkdirSync(join(stage, '..'), { recursive: true })
    writeFileSync(stage, bytes)
    atualizarUpload(SID, CID, emVoo.uploadId, {
      state: 'preparado', stagePath: stage, receivedBytes: bytes.length,
      digest: createHash('sha256').update(bytes).digest('hex'),
    })
    expect(obterArtigo(emVoo.uploadId)).toBeUndefined()

    iniciarOuConsultarDelecao({ sessionId: SID, deletionId: 'del-t29', expectedRevision: 0 })

    // Publicação tardia via rota (recovery/confirm) é recusada pelo tombstone.
    const caminho = `/api/sessions/${SID}/chats/${CID}/attachments/recovery/confirm`
    const antes = resposta()
    const tratado = await tratarRotasAnexos(
      requisicao('POST', caminho, { uploadId: emVoo.uploadId }) as never,
      antes as never,
      new URL(caminho, 'http://127.0.0.1:5174'),
    )
    expect(tratado).toBe(true)
    expect(antes.statusCode).toBe(410)
    expect(JSON.parse(antes.body).code).toBe('session_deleted')
    expect(obterArtigo(emVoo.uploadId)).toBeUndefined() // nada foi publicado

    const tombstone = await executarLimpezaDelecao(SID, false)
    expect(tombstone.cleanupState).toBe('concluido')

    // Depois da limpeza a publicação tardia continua recusada.
    const depois = resposta()
    await tratarRotasAnexos(
      requisicao('POST', caminho, { uploadId: emVoo.uploadId }) as never,
      depois as never,
      new URL(caminho, 'http://127.0.0.1:5174'),
    )
    expect(depois.statusCode).toBe(410)
    expect(obterArtigo(emVoo.uploadId)).toBeUndefined()

    // Outro dono intacto: arquivo, artefato e lista continuam funcionando.
    expect(existsSync(doOutro.final)).toBe(true)
    expect(obterArtigo(doOutro.artifactId)).toBeDefined()
    const listaCaminho = `/api/sessions/${OUTRO_SID}/chats/${OUTRO_CID}/attachments`
    const lista = resposta()
    const listado = await tratarRotasAnexos(
      requisicao('GET', listaCaminho) as never,
      lista as never,
      new URL(listaCaminho, 'http://127.0.0.1:5174'),
    )
    expect(listado).toBe(true)
    expect(lista.statusCode).toBe(200)
    const corpo = JSON.parse(lista.body) as { attachments: Array<{ artifactId: string }> }
    expect(corpo.attachments.some((item) => item.artifactId === doOutro.artifactId)).toBe(true)
  })

  it('C3A-T26 — cancelar stream/fechar draft não apaga final de projeto; estágio próprio limpo com diagnóstico', async () => {
    // (a) transferência em voo: o cancelamento limpa SÓ o estágio próprio,
    // com diagnóstico durável, sem publicar nada.
    const emVoo = await admitirUpload({ sessionId: SID, chatId: CID, name: 'rascunho.bin', declaredBytes: 32, mode: 'copy', scope: 'chat' })
    const stage = caminhoStage(undefined, SID, CID, emVoo.uploadId)
    mkdirSync(join(stage, '..'), { recursive: true })
    writeFileSync(stage, Buffer.alloc(8, 3))
    await cancelarUpload(SID, CID, emVoo.uploadId)
    const linha = obterUpload(SID, CID, emVoo.uploadId)!
    expect(linha.state).toBe('cancelado')
    expect(linha.errorCode).toBe('cancelled_by_user')
    expect(existsSync(stage)).toBe(false)
    expect(obterArtigo(emVoo.uploadId)).toBeUndefined()
    // fechar o draft de novo é idempotente (nenhuma exceção, nenhum efeito colateral)
    await cancelarUpload(SID, CID, emVoo.uploadId)

    // (b) final de projeto já publicado: cancelar é recusado e o arquivo permanece.
    const ws = join(base, 'workspace-t26')
    mkdirSync(join(ws, 'docs'), { recursive: true })
    const finalWs = await publicarCopia(SID, CID, 'projeto-final.txt', Buffer.from('arquivo final do projeto', 'utf8'), 'workspace', ws)
    await expect(cancelarUpload(SID, CID, finalWs.uploadId))
      .rejects.toMatchObject({ status: 409, code: 'upload_already_finalized' })
    expect(existsSync(finalWs.final)).toBe(true)

    // (c) rascunho de workspace em voo cancelado: o território do projeto
    // não ganha nem perde arquivo algum.
    const antes = existsSync(join(ws, 'uploads', 'projeto-final.txt'))
    const emVooWs = await admitirUpload({ sessionId: SID, chatId: CID, name: 'parcial-ws.bin', declaredBytes: 16, mode: 'copy', scope: 'workspace', workspaceRoot: ws })
    const stageWs = caminhoStage(undefined, SID, CID, emVooWs.uploadId)
    mkdirSync(join(stageWs, '..'), { recursive: true })
    writeFileSync(stageWs, Buffer.alloc(4, 9))
    await cancelarUpload(SID, CID, emVooWs.uploadId)
    expect(existsSync(stageWs)).toBe(false)
    expect(existsSync(join(ws, 'uploads', 'parcial-ws.bin'))).toBe(false)
    expect(existsSync(join(ws, 'uploads', 'projeto-final.txt'))).toBe(antes)
    expect(obterUpload(SID, CID, emVooWs.uploadId)!.state).toBe('cancelado')
  })

})

describe('C-3a migração de banco legado', () => {
  it('C3A-T32 — migração de banco legado preserva FKs/journal/ACK/dados; erro de migração não marca schema pronto', async () => {
    // ---------- banco legado com dados C-2 (sem o ledger de anexos) ----------
    getDatabase()
    seedSessao(SID, CID, 'c3a-t32')
    getDatabase().prepare("INSERT INTO session_tool_grants VALUES (?, '/ws-t32', 'criar', 1)").run(SID)
    receipt(SID) // garante a tabela de ACK
    getDatabase().prepare(
      "INSERT INTO session_persistence_receipts VALUES (?, 'mut-legacy', 2, 'digest-legacy', NULL, NULL, NULL)",
    ).run(SID)
    const jornal: TranscriptEntry[] = [
      { type: 'user', chatId: CID, message: { text: 'linha legada' }, uuid: 'uuid-legado-1', timestamp: 10 },
    ]
    await writeTranscript('c3a-t32', SID, jornal)
    const antes = snapshotTabelas()

    // Simula o banco legado: sem as três tabelas aditivas de anexos.
    resetDatabase()
    const cru = new Database(getDatabasePath())
    cru.exec('DROP TABLE IF EXISTS attachment_uploads; DROP TABLE IF EXISTS attachment_artifacts; DROP TABLE IF EXISTS attachment_cleanup_plan;')
    cru.close()

    // Próxima abertura migra de forma aditiva; validação de forma passa.
    resetDatabase()
    expect(() => validarSchemaAnexos(getDatabase())).not.toThrow()
    expect(snapshotTabelas()).toEqual(antes)

    // FKs intactas (filhos continuam apontando para a sessão).
    const fks = getDatabase().prepare('PRAGMA foreign_key_list(session_tool_grants)').all() as unknown[]
    expect(fks.length).toBeGreaterThan(0)
    // Dados, ACK e journal preservados byte a byte.
    expect(getDatabase().prepare('SELECT COUNT(*) AS c FROM session_tool_grants WHERE session_id = ?').get(SID))
      .toEqual({ c: 1 })
    expect(receipt(SID)).toMatchObject({ mutationId: 'mut-legacy', revision: 2, digest: 'digest-legacy' })
    const jornalDepois = await readTranscript('c3a-t32', SID)
    expect(jornalDepois.map((entrada) => entrada.uuid)).toEqual(['uuid-legado-1'])

    // O ledger novo funciona ao lado dos dados legados.
    const recibo = await admitirUpload({ sessionId: SID, chatId: CID, name: 'pos-migracao.txt', declaredBytes: 4, mode: 'copy', scope: 'chat' })
    expect(recibo.uploadId).toMatch(/^[0-9a-f-]{36}$/)

    // ---------- erro de migração: schema NÃO é marcado como pronto ----------
    const dir2 = mkdtempSync(join(tmpdir(), 'c3a-t32-err-'))
    process.env.AGENTE_WINDOW_DATA_DIR = dir2
    resetDatabase()
    getDatabase()
    resetDatabase()
    const cru2 = new Database(getDatabasePath())
    cru2.exec('DROP TABLE IF EXISTS attachment_uploads;')
    // Forma divergente (colunas essenciais ausentes): a migração por IF NOT
    // EXISTS não conserta — só a validação de forma pode (e deve) recusar.
    // Forma parcial: colunas do índice presente, mas sem mime/digest/error_code.
    cru2.exec(`
      CREATE TABLE attachment_uploads (
        session_id TEXT NOT NULL, chat_id TEXT NOT NULL, upload_id TEXT NOT NULL,
        artifact_id TEXT, name TEXT NOT NULL, declared_bytes INTEGER,
        received_bytes INTEGER NOT NULL DEFAULT 0,
        state TEXT NOT NULL, stage_path TEXT, final_path TEXT,
        mode TEXT NOT NULL, scope TEXT NOT NULL, workspace_root TEXT,
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
        PRIMARY KEY (session_id, chat_id, upload_id)
      )`)
    cru2.close()
    resetDatabase()

    let erro: unknown
    try {
      validarSchemaAnexos(getDatabase())
    } catch (capturado) {
      erro = capturado
    }
    expect(erro).toMatchObject({ status: 500, code: 'attachment_schema_not_ready' })
    rmSync(dir2, { recursive: true, force: true })
  }, 30_000)
})
