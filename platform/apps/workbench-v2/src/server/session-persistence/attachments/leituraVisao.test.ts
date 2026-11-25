import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getDatabase, getSessionRecord, resetDatabase, upsertSessionRecord } from '../database'
import { writeTranscript } from '../transcripts'
import { admitirUpload, receberConteudo, lerArtigo } from './estoque'
import { lerCopiaPublicadaParaVisao } from './leituraVisao'

const sid = '99999999-9999-4999-8999-111111111111'
const cid = `${sid}-main`
const mensagem = 'mensagem-mmi'
const conteudo = Buffer.from('conteúdo sintético para conferir integridade')
let base = ''

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'mmi-leitura-'))
  process.env.AGENTE_WINDOW_DATA_DIR = join(base, 'data')
  mkdirSync(process.env.AGENTE_WINDOW_DATA_DIR, { recursive: true })
  resetDatabase()
  upsertSessionRecord({ id: sid, slug: 'mmi-leitura', title: 'Teste', workspacePath: null, contextKind: 'chat', worktreePath: null, messageCount: 0, createdAt: 1, updatedAt: 1,
    sessionJson: JSON.stringify({ id: sid, contexto: { tipo: 'chat' }, workspacePath: null, worktreePath: null, chats: [{ id: cid, messages: [] }] }) })
})
afterEach(() => { resetDatabase(); delete process.env.AGENTE_WINDOW_DATA_DIR; rmSync(base, { recursive: true, force: true }) })

async function criarAnexo() {
  const criado = await admitirUpload({ sessionId: sid, chatId: cid, name: 'teste.png', declaredBytes: conteudo.length, mime: 'image/png', mode: 'copy', scope: 'chat', workspaceRoot: null })
  const pronto = await receberConteudo(sid, cid, criado.uploadId, Readable.from([conteudo]))
  if (!pronto.artifactId) throw new Error('fixture sem artefato')
  return pronto.artifactId
}

async function publicar(artifactId: string, chatId = cid, messageId = mensagem) {
  const registro = getSessionRecord(sid)!
  await writeTranscript(registro.slug, sid, [{ type: 'user', chatId, uuid: messageId, timestamp: 1, message: { id: messageId, role: 'user', content: 'O que há?', attachments: [{ artifactId }] } }])
}
const entrada = (artifactId: string) => ({ sessionId: sid, chatId: cid, messageId: mensagem, artifactId, maxBytes: 1024 })

describe('MMI-05 — leitura limitada da cópia vinculada à mensagem publicada', () => {
  it('lê os bytes reais e confere o hash calculado sobre os mesmos bytes', async () => {
    const id = await criarAnexo(); await publicar(id)
    const resultado = await lerCopiaPublicadaParaVisao(entrada(id))
    expect(resultado.bytes.equals(conteudo)).toBe(true)
    expect(resultado.sha256).toBe(createHash('sha256').update(conteudo).digest('hex'))
  })
  it('recusa sem mensagem publicada, mensagem ou chat errados e artefato inexistente', async () => {
    const id = await criarAnexo()
    await expect(lerCopiaPublicadaParaVisao(entrada(id))).rejects.toThrow()
    await publicar(id)
    await expect(lerCopiaPublicadaParaVisao({ ...entrada(id), messageId: 'outra' })).rejects.toThrow()
    await expect(lerCopiaPublicadaParaVisao({ ...entrada(id), chatId: 'outro' })).rejects.toThrow()
    await expect(lerCopiaPublicadaParaVisao(entrada('inexistente'))).rejects.toThrow()
  })
  it('recusa item não citado pela mensagem e limite ausente ou excedido', async () => {
    const id = await criarAnexo(); await publicar('outro')
    await expect(lerCopiaPublicadaParaVisao(entrada(id))).rejects.toThrow()
    await publicar(id)
    await expect(lerCopiaPublicadaParaVisao({ ...entrada(id), maxBytes: conteudo.length - 1 })).rejects.toThrow()
    await expect(lerCopiaPublicadaParaVisao({ ...entrada(id), maxBytes: NaN })).rejects.toThrow()
  })
  it('recusa referência mutável e teto que ultrapassa a salvaguarda local', async () => {
    const id = await criarAnexo(); await publicar(id)
    await expect(lerCopiaPublicadaParaVisao({ ...entrada(id), maxBytes: 12 * 1024 * 1024 + 1 })).rejects.toThrow()
    getDatabase().prepare("UPDATE attachment_artifacts SET mode = 'reference' WHERE artifact_id = ?").run(id)
    await expect(lerCopiaPublicadaParaVisao(entrada(id))).rejects.toThrow()
  })
  it('recusa anexo de outro chat existente e estado ainda não publicado', async () => {
    const id = await criarAnexo(); await publicar(id)
    const registro = getSessionRecord(sid)!
    const sessao = JSON.parse(registro.sessionJson)
    sessao.chats.push({ id: `${sid}-outro`, messages: [] })
    upsertSessionRecord({ ...registro, sessionJson: JSON.stringify(sessao) })
    await expect(lerCopiaPublicadaParaVisao({ ...entrada(id), chatId: `${sid}-outro` })).rejects.toThrow()
    getDatabase().prepare("UPDATE attachment_artifacts SET state = 'recebendo' WHERE artifact_id = ?").run(id)
    await expect(lerCopiaPublicadaParaVisao(entrada(id))).rejects.toThrow()
  })
  it('recusa divergência de papel na mensagem publicada e duplicação de identidade', async () => {
    const id = await criarAnexo()
    const registro = getSessionRecord(sid)!
    const linha = { type: 'user' as const, chatId: cid, uuid: mensagem, timestamp: 1, message: { id: mensagem, role: 'assistant', attachments: [{ artifactId: id }] } }
    await writeTranscript(registro.slug, sid, [linha])
    await expect(lerCopiaPublicadaParaVisao(entrada(id))).rejects.toThrow()
    linha.message.role = 'user'
    await writeTranscript(registro.slug, sid, [linha, linha])
    await expect(lerCopiaPublicadaParaVisao(entrada(id))).rejects.toThrow()
  })
  it('recusa symlink no destino mesmo se ele apontar para bytes idênticos', async () => {
    if (process.platform === 'win32') return // criação de symlink pode exigir privilégio no Windows
    const id = await criarAnexo(); await publicar(id)
    const artigo = await lerArtigo(id)
    const outro = join(base, 'fora.png'); writeFileSync(outro, conteudo)
    rmSync(artigo.caminho); symlinkSync(outro, artigo.caminho)
    await expect(lerCopiaPublicadaParaVisao(entrada(id))).rejects.toThrow()
  })
  it('recusa conteúdo divergente ou ausente em vez de enviar a versão modificada', async () => {
    const id = await criarAnexo(); await publicar(id)
    const artigo = await lerArtigo(id)
    writeFileSync(artigo.caminho, Buffer.alloc(conteudo.length, 65))
    await expect(lerCopiaPublicadaParaVisao(entrada(id))).rejects.toThrow()
    rmSync(artigo.caminho)
    await expect(lerCopiaPublicadaParaVisao(entrada(id))).rejects.toThrow()
  })
})
