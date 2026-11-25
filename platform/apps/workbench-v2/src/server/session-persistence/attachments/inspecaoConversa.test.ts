// @vitest-environment node
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as filaSessao from '../filaSessao'
import { getSessionRecord, resetDatabase, upsertSessionRecord } from '../database'
import { admitirUpload, consultarUpload, lerArtigo, receberConteudo, reconciliarIdentidade } from './estoque'
import { withSessionPersistenceQueue } from '../filaSessao'
import { listarFontesConversa, lerFonteConversa, listarZipConversa, extrairItemZipConversa, inspecionarTextoConversa } from './inspecaoConversa'
import { zipDeTeste } from './zipFixture.test-helper'
import { prepararInspecaoAgente } from './ferramentaAnexos'

const sid = '99999999-9999-4999-8999-222222222222'
const a = `${sid}-a`, b = `${sid}-b`
let base: string
beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'mmi-fontes-'))
  process.env.AGENTE_WINDOW_DATA_DIR = join(base, 'data')
  mkdirSync(process.env.AGENTE_WINDOW_DATA_DIR, { recursive: true })
  resetDatabase()
  upsertSessionRecord({ id: sid, slug: 'mmi-fontes', title: 'Teste', workspacePath: null, contextKind: 'chat', worktreePath: null, messageCount: 0, createdAt: 1, updatedAt: 1,
    sessionJson: JSON.stringify({ id: sid, contexto: { tipo: 'chat' }, workspacePath: null, worktreePath: null, chats: [{ id: a, messages: [] }, { id: b, messages: [] }] }) })
})
afterEach(() => { resetDatabase(); delete process.env.AGENTE_WINDOW_DATA_DIR; rmSync(base, { recursive: true, force: true }) })
async function anexar(chatId: string, nome: string, bytes: Buffer): Promise<string> {
  const upload = await admitirUpload({ sessionId: sid, chatId, name: nome, declaredBytes: bytes.length, mime: 'text/plain', mode: 'copy', scope: 'chat', workspaceRoot: null })
  const pronto = await receberConteudo(sid, chatId, upload.uploadId, Readable.from([bytes]))
  return pronto.artifactId!
}

describe('fontes mediadas por conversa: catálogo e leitura limitada', () => {
  it('cada chat vê e lê somente seus próprios artefatos, mesmo conhecendo o id alheio', async () => {
    const idA = await anexar(a, 'primeiro.txt', Buffer.from('segredo A'))
    const idB = await anexar(b, 'segundo.txt', Buffer.from('segredo B'))
    expect((await listarFontesConversa(sid, a)).map(x => x.artifactId)).toEqual([idA])
    expect((await listarFontesConversa(sid, b)).map(x => x.artifactId)).toEqual([idB])
    expect((await lerFonteConversa(sid, a, idA, 100)).bytes.toString()).toBe('segredo A')
    expect((await lerFonteConversa(sid, b, idB, 100)).bytes.toString()).toBe('segredo B')
    await expect(lerFonteConversa(sid, a, idB, 100)).rejects.toThrow()
    await expect(lerFonteConversa(sid, b, idA, 100)).rejects.toThrow()
    await expect(listarFontesConversa(sid, 'inexistente')).rejects.toThrow()
  })
  it('lista ZIP próprio e publica apenas o item selecionado na área privada, sem acesso cruzado', async () => {
    const imagem = readFileSync(new URL('../../../__tests__/fixtures/midia/imagem.png', import.meta.url))
    const video = readFileSync(new URL('../../../__tests__/fixtures/midia/video.webm', import.meta.url))
    const conteudo = zipDeTeste([{ nome: 'pasta/nota.txt', bytes: Buffer.from('conteúdo privado') }, { nome: 'imagem.png', bytes: imagem }, { nome: 'video.webm', bytes: video }])
    const id = await anexar(a, 'teste.zip', conteudo)
    expect((await listarZipConversa(sid, a, id)).map(e => e.nome)).toEqual(['pasta/nota.txt', 'imagem.png', 'video.webm'])
    await expect(listarZipConversa(sid, b, id)).rejects.toThrow()
    await expect(extrairItemZipConversa(sid, b, id, 0)).rejects.toThrow()
    const extraido = await extrairItemZipConversa(sid, a, id, 0)
    expect(extraido.nome).toBe('nota.txt')
    expect((await lerFonteConversa(sid, a, extraido.artifactId, 100)).bytes.toString()).toBe('conteúdo privado')
    expect((await lerArtigo(extraido.artifactId)).caminho).toContain(join('uploads', 'chats', sid, a))
    await expect(lerFonteConversa(sid, b, extraido.artifactId, 100)).rejects.toThrow()
    expect((await listarFontesConversa(sid, a)).map(x => x.nome)).toEqual(['teste.zip', 'nota.txt'])
    await expect(extrairItemZipConversa(sid, a, id, 20)).rejects.toThrow()
    const cancelado = new AbortController(); cancelado.abort()
    await expect(extrairItemZipConversa(sid, a, id, 1, cancelado.signal)).rejects.toThrow()
    expect((await listarFontesConversa(sid, a))).toHaveLength(2)
    const extraidoVideo = await extrairItemZipConversa(sid, a, id, 2)
    expect((await lerFonteConversa(sid, a, extraidoVideo.artifactId, 4 * 1024 * 1024)).bytes.equals(video)).toBe(true)
    const extraidaImagem = await extrairItemZipConversa(sid, a, id, 1)
    expect((await lerFonteConversa(sid, a, extraidaImagem.artifactId, 4 * 1024 * 1024)).bytes.equals(imagem)).toBe(true)
    expect((await listarFontesConversa(sid, a)).map(x => x.nome)).toEqual(['teste.zip', 'nota.txt', 'video.webm', 'imagem.png'])
  })
  it('extração real cancelada na fronteira de gravação não aparece ao reabrir o catálogo', async () => {
    const id = await anexar(a, 'origem.zip', zipDeTeste([{ nome: 'cancelado.txt', bytes: Buffer.from('não publicar') }]))
    const filaReal = filaSessao.withSessionPersistenceQueue
    let chegou!: () => void, continuar!: () => void, chamadas = 0
    const gravado = new Promise<void>(resolve => { chegou = resolve })
    const bloqueio = new Promise<void>(resolve => { continuar = resolve })
    const spy = vi.spyOn(filaSessao, 'withSessionPersistenceQueue').mockImplementation(async (sidFila, operacao) => {
      chamadas++
      if (chamadas === 3) { chegou(); await bloqueio }
      return filaReal(sidFila, operacao)
    })
    try {
      const abort = new AbortController()
      const extracao = extrairItemZipConversa(sid, a, id, 0, abort.signal)
      await gravado
      abort.abort()
      await reconciliarIdentidade(sid, a)
      continuar()
      await expect(extracao).rejects.toThrow()
      spy.mockRestore()
      resetDatabase()
      await reconciliarIdentidade(sid, a, {}, { todos: true })
      expect((await listarFontesConversa(sid, a)).map(fonte => fonte.nome)).toEqual(['origem.zip'])
    } finally { continuar(); spy.mockRestore() }
  })
  it('cancelamento ao terminar a gravação vence recuperação concorrente e não reaparece após reinício', async () => {
    const bytes = Buffer.from('item cancelado')
    const upload = await admitirUpload({ sessionId: sid, chatId: a, name: 'cancelado.txt', declaredBytes: bytes.length, mode: 'copy', scope: 'chat', workspaceRoot: null })
    const sinal = new AbortController()
    let chegou!: () => void, continuar!: () => void
    const chegouNaPublicacao = new Promise<void>(resolve => { chegou = resolve })
    const liberacao = new Promise<void>(resolve => { continuar = resolve })
    const fila = async <T>(operacao: () => Promise<T>): Promise<T> => {
      chegou(); await liberacao
      return withSessionPersistenceQueue(sid, operacao)
    }
    const escrita = receberConteudo(sid, a, upload.uploadId, Readable.from([bytes]), { fila, sinalPublicacao: sinal.signal })
    await chegouNaPublicacao
    expect(consultarUpload(sid, a, upload.uploadId).state).toBe('recebendo')
    sinal.abort()
    await reconciliarIdentidade(sid, a)
    continuar()
    await expect(escrita).rejects.toThrow(/cancelada/)
    expect(consultarUpload(sid, a, upload.uploadId).state).toBe('cancelado')
    resetDatabase()
    await reconciliarIdentidade(sid, a, {}, { todos: true })
    expect(consultarUpload(sid, a, upload.uploadId).state).toBe('cancelado')
    expect(await listarFontesConversa(sid, a)).toEqual([])
  })
  it('publicação concluída vence cancelamento tardio e permanece após reinício', async () => {
    const bytes = Buffer.from('item concluído')
    const upload = await admitirUpload({ sessionId: sid, chatId: a, name: 'concluido.txt', declaredBytes: bytes.length, mode: 'copy', scope: 'chat', workspaceRoot: null })
    const sinal = new AbortController()
    const fila = <T>(operacao: () => Promise<T>): Promise<T> => withSessionPersistenceQueue(sid, async () => {
      const resultado = await operacao()
      sinal.abort() // cancelamento antes do recibo, mas depois do commit
      return resultado
    })
    const recibo = await receberConteudo(sid, a, upload.uploadId, Readable.from([bytes]), { fila, sinalPublicacao: sinal.signal })
    expect(recibo.state).toBe('pronto')
    resetDatabase()
    await reconciliarIdentidade(sid, a, {}, { todos: true })
    expect((await listarFontesConversa(sid, a)).map(fonte => fonte.nome)).toEqual(['concluido.txt'])
  })
  it('extrações simultâneas usam identidades separadas e preservam os dois resultados', async () => {
    const id = await anexar(a, 'concorrente.zip', zipDeTeste([{ nome: 'nota.txt', bytes: Buffer.from('mesmo conteúdo') }]))
    const [primeira, segunda] = await Promise.all([
      extrairItemZipConversa(sid, a, id, 0), extrairItemZipConversa(sid, a, id, 0),
    ])
    expect(primeira.artifactId).not.toBe(segunda.artifactId)
    expect((await lerFonteConversa(sid, a, primeira.artifactId, 100)).bytes.toString()).toBe('mesmo conteúdo')
    expect((await lerFonteConversa(sid, a, segunda.artifactId, 100)).bytes.toString()).toBe('mesmo conteúdo')
    expect((await listarFontesConversa(sid, a))).toHaveLength(3)
  })
  it('extrai para o app mesmo quando a conversa possui pasta de projeto', async () => {
    const workspace = join(base, 'projeto'); mkdirSync(workspace)
    const registro = getSessionRecord(sid)!
    const sessao = JSON.parse(registro.sessionJson)
    sessao.workspacePath = workspace; sessao.contexto = { tipo: 'workspace' }
    upsertSessionRecord({ ...registro, workspacePath: workspace, contextKind: 'workspace', sessionJson: JSON.stringify(sessao) })
    const id = await anexar(a, 'projeto.zip', zipDeTeste([{ nome: 'fora/nota.txt', bytes: Buffer.from('privado') }]))
    const item = await extrairItemZipConversa(sid, a, id, 0)
    expect((await lerArtigo(item.artifactId)).caminho).toContain(join('uploads', 'chats', sid, a))
    expect((await lerArtigo(item.artifactId)).caminho.startsWith(workspace)).toBe(false)
    expect((await lerFonteConversa(sid, a, item.artifactId, 100)).bytes.toString()).toBe('privado')
  })
  it('extrai somente texto UTF-8 limitado e informa quando outros formatos não podem ser analisados', async () => {
    const texto = await anexar(a, 'nota.txt', Buffer.from('olá\nlinha 2'))
    expect(await inspecionarTextoConversa(sid, a, texto)).toEqual({ disponivel: true, representacao: 'texto UTF-8', nome: 'nota.txt', texto: 'olá\nlinha 2' })
    await expect(inspecionarTextoConversa(sid, b, texto)).rejects.toThrow()
    const falso = await anexar(a, 'falso.txt', Buffer.from([0xff, 0x00, 0x80]))
    expect(await inspecionarTextoConversa(sid, a, falso)).toMatchObject({ disponivel: false })
    const pdf = await anexar(a, 'documento.pdf', Buffer.from('%PDF-1.4\nsem leitor'))
    expect(await inspecionarTextoConversa(sid, a, pdf)).toMatchObject({ disponivel: false, motivo: expect.stringMatching(/PDF/) })
    const audio = await anexar(a, 'voz.wav', Buffer.from('RIFFxxxxxxxxWAVE'))
    expect(await inspecionarTextoConversa(sid, a, audio)).toMatchObject({ disponivel: false, motivo: expect.stringMatching(/áudio/i) })
    const video = await anexar(a, 'video.mp4', Buffer.from('0000ftypisom'))
    expect(await inspecionarTextoConversa(sid, a, video)).toMatchObject({ disponivel: false, motivo: expect.stringMatching(/vídeo/i) })
  })
  it('prepara autorização vinculada ao ZIP e só extrai quando a chamada aprovada é executada', async () => {
    const id = await anexar(a, 'arquivo.zip', zipDeTeste([{ nome: 'dados/segredo.txt', bytes: Buffer.from('a resposta é 742') }]))
    await expect(prepararInspecaoAgente({ sessionId: sid, chatId: b }, { acao: 'listar_zip', artifactId: id })).rejects.toThrow()
    const plano = await prepararInspecaoAgente({ sessionId: sid, chatId: a }, { acao: 'extrair_zip', artifactId: id, indice: 0 })
    expect(plano.previa).toContain('dados/segredo.txt')
    expect((await listarFontesConversa(sid, a))).toHaveLength(1)
    const resultado = await plano.executar()
    expect(resultado.ok).toBe(true)
    const publicado = JSON.parse(resultado.conteudo!) as { artifactId: string }
    expect((await lerFonteConversa(sid, a, publicado.artifactId, 128)).bytes.toString()).toBe('a resposta é 742')
    await expect(plano.executar()).rejects.toThrow()
    const leitura = await prepararInspecaoAgente({ sessionId: sid, chatId: a }, { acao: 'ler', artifactId: publicado.artifactId })
    expect(leitura.previa).toContain('segredo.txt')
    expect((await leitura.executar()).conteudo).toContain('a resposta é 742')
  })
  it('recusa fonte alterada depois da prévia em vez de transmitir bytes novos', async () => {
    const id = await anexar(a, 'texto.txt', Buffer.from('original'))
    const plano = await prepararInspecaoAgente({ sessionId: sid, chatId: a }, { acao: 'ler', artifactId: id })
    writeFileSync((await lerArtigo(id)).caminho, 'alterado')
    await expect(plano.executar()).rejects.toThrow()
  })
  it('extrai texto de PDF local sintético, sem tratar PDF danificado como texto', async () => {
    const { pdfDeTeste } = await import('./pdfFixture.test-helper')
    const id = await anexar(a, 'amostra.pdf', pdfDeTeste('Valor sintetico 742'))
    const plano = await prepararInspecaoAgente({ sessionId: sid, chatId: a }, { acao: 'ler', artifactId: id })
    expect(plano.previa).toContain('texto extraído de PDF')
    expect((await plano.executar()).conteudo).toContain('Valor sintetico 742')
    const ruim = await anexar(a, 'quebrado.pdf', Buffer.from('%PDF-1.4\nquebrado'))
    const fallback = await prepararInspecaoAgente({ sessionId: sid, chatId: a }, { acao: 'ler', artifactId: ruim })
    expect((await fallback.executar()).resumo).toMatch(/PDF/)
  })
  it('recusa tamanho, integridade alterada e chat removido', async () => {
    const id = await anexar(a, 'arquivo.txt', Buffer.from('conteudo'))
    await expect(lerFonteConversa(sid, a, id, 3)).rejects.toThrow()
    const path = (await lerArtigo(id)).caminho
    writeFileSync(path, 'alterado')
    await expect(lerFonteConversa(sid, a, id, 100)).rejects.toThrow()
    const registro = getSessionRecord(sid)!
    const sessao = JSON.parse(registro.sessionJson); sessao.chats = sessao.chats.filter((c: { id: string }) => c.id !== a)
    upsertSessionRecord({ ...registro, sessionJson: JSON.stringify(sessao) })
    await expect(listarFontesConversa(sid, a)).rejects.toThrow()
  })
})
