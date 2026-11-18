// C-3a — recuperação (R11/R13; T30/T31) com as correções do parecer B02:
//  - retomada da MESMA tentativa NÃO aceita caminho do cliente;
//  - cópia de CONVERSA é um plano opaco `{recoveryId, token}` com mapa
//    oldId→newId + indisponíveis, cópia privada independente e recibo
//    idempotente depois do consumo.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getDatabase, resetDatabase, upsertSessionRecord } from '../database'
import { writeTranscript, type TranscriptEntry } from '../transcripts'
import { admitirUpload, caminhoStagePara, receberConteudo, caminhoFinalChat } from './estoque'
import { atualizarUpload, obterArtigo, obterUpload, listarUploads } from './catalogo'
import { confirmRecovery, prepareRecovery, retomarUpload } from './recuperacao'
import { registrarReferencia } from './referencias'

const SID = '11111111-1111-4111-8111-111111111111'
const CID = '22222222-2222-4222-8222-222222222222'
const ORIGEM = '55555555-5555-4555-8555-555555555555'
const ORIGEM_CID = '66666666-6666-4666-8666-666666666666'
const DESTINO = '77777777-7777-4777-8777-777777777777'
const DESTINO_CID = '88888888-8888-4888-8888-888888888888'

let base: string

function seed(id: string, chatId: string, slug: string): void {
  upsertSessionRecord({
    id, slug, title: `Sessão ${slug}`, workspacePath: null, contextKind: 'chat',
    worktreePath: null, messageCount: 0, createdAt: Date.now(), updatedAt: Date.now(),
    sessionJson: JSON.stringify({ id, chats: [{ id: chatId, messages: [] }] }),
  })
}

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'c3a-recovery-'))
  process.env.AGENTE_WINDOW_DATA_DIR = join(base, 'data')
  mkdirSync(process.env.AGENTE_WINDOW_DATA_DIR, { recursive: true })
  resetDatabase()
  seed(SID, CID, 'c3a-recovery')
})

afterEach(() => {
  resetDatabase()
  delete process.env.AGENTE_WINDOW_DATA_DIR
  rmSync(base, { recursive: true, force: true })
})

describe('C-3a recuperação pós-falha (mesma tentativa)', () => {
  it('C3A-T30 — retomada finaliza a MESMA tentativa pelo stage do dono, sem path do cliente e sem duplicar', async () => {
    // Crash de um PUT: linha 'recebendo' com stage COMPLETO no volume do destino.
    const bytes = Buffer.from('conteúdo original do rascunho C-3a', 'utf8')
    const recibo = await admitirUpload({ sessionId: SID, chatId: CID, name: 'original-do-rascunho.txt', declaredBytes: bytes.length, mode: 'copy', scope: 'chat' })
    const stage = caminhoStagePara(obterUpload(SID, CID, recibo.uploadId)!.finalPath!, recibo.uploadId)
    mkdirSync(join(stage, '..'), { recursive: true })
    writeFileSync(stage, bytes)
    atualizarUpload(SID, CID, recibo.uploadId, { state: 'recebendo', stagePath: stage, receivedBytes: bytes.length })

    const retomado = await retomarUpload(SID, CID, recibo.uploadId)
    expect(retomado).toMatchObject({ uploadId: recibo.uploadId, state: 'pronto', verified: true })
    expect(retomado.sha256).toMatch(/^[0-9a-f]{64}$/)

    const final = caminhoFinalChat(undefined, SID, CID, recibo.artifactId, 'original-do-rascunho.txt')
    expect(final).toContain(join('uploads', 'chats'))
    expect(existsSync(final)).toBe(true)
    expect(readFileSync(final)).toEqual(bytes)
    // MESMO identificador — sem duplicar linhas nem arquivos.
    expect(listarUploads(SID, CID).filter((item) => item.uploadId === recibo.uploadId)).toHaveLength(1)
    expect(obterArtigo(recibo.artifactId)?.bytes).toBe(bytes.length)

    // Idempotência: repetir devolve o mesmo estado pronto.
    const idempotente = await retomarUpload(SID, CID, recibo.uploadId)
    expect(idempotente.state).toBe('pronto')
    expect(idempotente.uploadId).toBe(recibo.uploadId)
  })

  it('C3A-T31 — sem origem a retomada é indisponível honesta; referência não é recuperável; hash divergente é recusado', async () => {
    const semOrigem = await admitirUpload({ sessionId: SID, chatId: CID, name: 'sumiu.bin', declaredBytes: 8, mode: 'copy', scope: 'chat' })
    await expect(retomarUpload(SID, CID, semOrigem.uploadId)).rejects.toMatchObject({ status: 410, code: 'recovery_unavailable' })

    const workspaceRoot = join(base, 'workspace')
    mkdirSync(workspaceRoot, { recursive: true })
    writeFileSync(join(workspaceRoot, 'projeto.txt'), 'arquivo do projeto', 'utf8')
    const referencia = await registrarReferencia({ sessionId: SID, chatId: CID, workspaceRoot, sourcePath: 'projeto.txt' })
    await expect(retomarUpload(SID, CID, referencia.uploadId)).rejects.toMatchObject({ status: 409, code: 'upload_not_recoverable' })

    // Cópia recuperada com hash divergente do ledger: recusada e stage removido.
    const conteudo = Buffer.from('bytes originais', 'utf8')
    const recebido = await admitirUpload({ sessionId: SID, chatId: CID, name: 'divergente.txt', declaredBytes: conteudo.length, mode: 'copy', scope: 'chat' })
    await receberConteudo(SID, CID, recebido.uploadId, Readable.from([conteudo]))
    const linha = obterUpload(SID, CID, recebido.uploadId)!
    atualizarUpload(SID, CID, recebido.uploadId, { state: 'recebendo', digest: '0'.repeat(64) })
    // stage com outro conteúdo, mesmo tamanho
    writeFileSync(linha.stagePath!, Buffer.alloc(conteudo.length, 9))
    await expect(retomarUpload(SID, CID, recebido.uploadId))
      .rejects.toMatchObject({ status: 409, code: 'recovery_verification_failed' })
    expect(existsSync(obterUpload(SID, CID, recebido.uploadId)!.stagePath!)).toBe(false)
  })
})

describe('C-3a R13 — cópia de conversa com plano opaco', () => {
  async function publicarNaOrigem(nome: string, bytes: Buffer): Promise<string> {
    const recibo = await admitirUpload({ sessionId: ORIGEM, chatId: ORIGEM_CID, name: nome, declaredBytes: bytes.length, mode: 'copy', scope: 'chat' })
    const pronto = await receberConteudo(ORIGEM, ORIGEM_CID, recibo.uploadId, Readable.from([bytes]))
    return pronto.artifactId
  }

  function jornalCom(artifactId: string, nome: string): TranscriptEntry[] {
    return [{
      type: 'user', chatId: ORIGEM_CID,
      message: { id: 'm-origem-1', role: 'user', content: 'segue o anexo', time: '09:00', attachments: [{ id: artifactId, artifactId, name: nome, kind: 'local', estado: 'pronto' }] },
      uuid: 'uuid-origem-1', timestamp: 1,
    }]
  }

  it('C3A-T30/R13 — prepare devolve plano curto cujas fontes vêm do TRANSCRIPT, não do cliente', async () => {
    seed(ORIGEM, ORIGEM_CID, 'c3a-origem')
    seed(DESTINO, DESTINO_CID, 'c3a-destino')
    const artifactId = await publicarNaOrigem('relatorio.bin', Buffer.from('conteúdo do relatório'))
    await writeTranscript('c3a-origem', ORIGEM, jornalCom(artifactId, 'relatorio.bin'))

    const plano = await prepareRecovery({ destinoSessionId: DESTINO, destinoChatId: DESTINO_CID, origemSessionId: ORIGEM })
    expect(plano.recoveryId).toMatch(/^[0-9a-f-]{36}$/)
    expect(plano.token.length).toBeGreaterThan(30)
    expect(plano.itens).toEqual([{ oldId: artifactId, name: 'relatorio.bin', bytes: Buffer.byteLength('conteúdo do relatório'), disponivel: true }])
    // O plano NÃO carrega caminho: nada de `source`/`path` na resposta.
    expect(JSON.stringify(plano)).not.toContain(base)
  })

  it('C3A-T30/R13 — confirm materializa cópia privada INDEPENDENTE e devolve mapa oldId→newId; retry devolve o mesmo recibo', async () => {
    seed(ORIGEM, ORIGEM_CID, 'c3a-origem')
    seed(DESTINO, DESTINO_CID, 'c3a-destino')
    const bytes = Buffer.from('bytes que viram cópia independente')
    const artifactId = await publicarNaOrigem('copia.bin', bytes)
    await writeTranscript('c3a-origem', ORIGEM, jornalCom(artifactId, 'copia.bin'))

    const plano = await prepareRecovery({ destinoSessionId: DESTINO, destinoChatId: DESTINO_CID, origemSessionId: ORIGEM })
    const recibo = await confirmRecovery({ destinoSessionId: DESTINO, destinoChatId: DESTINO_CID, recoveryId: plano.recoveryId, token: plano.token })
    expect(recibo.mapa).toHaveLength(1)
    expect(recibo.mapa[0].oldId).toBe(artifactId)
    expect(recibo.mapa[0].newId).not.toBe(artifactId)
    expect(recibo.indisponiveis).toEqual([])

    // Cópia REAL, privada do destino e independente da origem.
    const novo = obterArtigo(recibo.mapa[0].newId)!
    expect(novo.sessionId).toBe(DESTINO)
    expect(novo.chatId).toBe(DESTINO_CID)
    expect(novo.sha256).toBe(obterArtigo(artifactId)!.sha256)
    const caminhoNovo = join(process.env.AGENTE_WINDOW_DATA_DIR!, 'uploads', novo.locator)
    expect(readFileSync(caminhoNovo)).toEqual(bytes)

    // Token não amplia permissão: outro dono é recusado.
    await expect(confirmRecovery({ destinoSessionId: SID, destinoChatId: CID, recoveryId: plano.recoveryId, token: plano.token }))
      .rejects.toMatchObject({ status: 403, code: 'recovery_out_of_scope' })

    // Retry depois do consumo: MESMO recibo, sem segunda cópia.
    const retry = await confirmRecovery({ destinoSessionId: DESTINO, destinoChatId: DESTINO_CID, recoveryId: plano.recoveryId, token: plano.token })
    expect(retry.mapa).toEqual(recibo.mapa)
    expect(getDatabase().prepare('SELECT COUNT(*) AS c FROM attachment_artifacts WHERE session_id = ?').get(DESTINO)).toEqual({ c: 1 })
  })

  it('C3A-T31/R13 — origem excluída não emite token; item ausente vira indisponível sem bloquear o resto', async () => {
    seed(ORIGEM, ORIGEM_CID, 'c3a-origem')
    seed(DESTINO, DESTINO_CID, 'c3a-destino')
    const artifactId = await publicarNaOrigem('vivo.bin', Buffer.from('vivo'))
    // Segundo anexo citado no transcript mas SEM registro no ledger.
    const jornal = jornalCom(artifactId, 'vivo.bin')
    jornal.push({
      type: 'user', chatId: ORIGEM_CID,
      message: { id: 'm-origem-2', role: 'user', content: 'outro', time: '09:01', attachments: [{ id: 'fantasma', artifactId: 'ffffffff-ffff-4fff-8fff-ffffffffffff', name: 'fantasma.bin', kind: 'local', estado: 'pronto' }] },
      uuid: 'uuid-origem-2', timestamp: 2,
    })
    await writeTranscript('c3a-origem', ORIGEM, jornal)

    const plano = await prepareRecovery({ destinoSessionId: DESTINO, destinoChatId: DESTINO_CID, origemSessionId: ORIGEM })
    expect(plano.itens.find((item) => item.name === 'fantasma.bin')?.disponivel).toBe(false)
    const recibo = await confirmRecovery({ destinoSessionId: DESTINO, destinoChatId: DESTINO_CID, recoveryId: plano.recoveryId, token: plano.token })
    expect(recibo.mapa.map((item) => item.oldId)).toEqual([artifactId])
    expect(recibo.indisponiveis.map((item) => item.name)).toEqual(['fantasma.bin'])

    // Origem tombstoned: nenhum token novo (texto continua recuperável fora daqui).
    getDatabase().prepare("INSERT INTO session_deletions (session_id, deletion_id, revision, requested_at, cleanup_state) VALUES (?, 'del-r13', 0, ?, 'preparado')")
      .run(ORIGEM, Date.now())
    await expect(prepareRecovery({ destinoSessionId: DESTINO, destinoChatId: DESTINO_CID, origemSessionId: ORIGEM }))
      .rejects.toMatchObject({ status: 410, code: 'recovery_source_unavailable' })
  })

  it('C3A-T31/R13 — plano expirado é refeito por gesto novo e origem alterada não é copiada', async () => {
    seed(ORIGEM, ORIGEM_CID, 'c3a-origem')
    seed(DESTINO, DESTINO_CID, 'c3a-destino')
    const artifactId = await publicarNaOrigem('muda.bin', Buffer.from('versão A'))
    await writeTranscript('c3a-origem', ORIGEM, jornalCom(artifactId, 'muda.bin'))

    const plano = await prepareRecovery({ destinoSessionId: DESTINO, destinoChatId: DESTINO_CID, origemSessionId: ORIGEM })
    // Expiração explícita (relógio injetado): o plano não pode ser reutilizado.
    await expect(confirmRecovery({
      destinoSessionId: DESTINO, destinoChatId: DESTINO_CID, recoveryId: plano.recoveryId, token: plano.token,
      agora: () => Date.now() + 11 * 60_000,
    })).rejects.toMatchObject({ status: 409, code: 'recovery_plan_expired' })

    // Origem alterada depois do registro: recusa honrada, nada é copiado.
    const origemArtigo = obterArtigo(artifactId)!
    writeFileSync(join(process.env.AGENTE_WINDOW_DATA_DIR!, 'uploads', origemArtigo.locator), 'versão B (adulterada)')
    const novoPlano = await prepareRecovery({ destinoSessionId: DESTINO, destinoChatId: DESTINO_CID, origemSessionId: ORIGEM })
    const recibo = await confirmRecovery({ destinoSessionId: DESTINO, destinoChatId: DESTINO_CID, recoveryId: novoPlano.recoveryId, token: novoPlano.token })
    expect(recibo.mapa).toEqual([])
    expect(recibo.indisponiveis).toHaveLength(1)
    expect(recibo.indisponiveis[0].motivo).toMatch(/mudou|alterad/i)
  })
})
