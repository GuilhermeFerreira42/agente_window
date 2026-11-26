// Reprodução dos dois ajustes de usabilidade pedidos na C-3a.
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getDatabase, resetDatabase, upsertSessionRecord } from '../database'
import { admitirUpload, lerArtigo, receberConteudo } from './estoque'
import { obterArtigo, obterUpload } from './catalogo'
import { caminhoOriginalHistorico } from './originalHistorico'
import { lerFonteConversa, listarFontesConversa } from './inspecaoConversa'
import { prepararInspecaoAgente } from './ferramentaAnexos'
import { POLITICA_PADRAO } from './politica'
import { executarLimpezaDelecao, iniciarOuConsultarDelecao } from '../deletions'
import { excluirNoExplorerProjeto, moverNoExplorerProjeto } from '../movimentoProjeto'

const SID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const CID = `${SID}-main`
let base = ''
let ws = ''

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'c3a-aj-'))
  process.env.AGENTE_WINDOW_DATA_DIR = join(base, 'data')
  mkdirSync(process.env.AGENTE_WINDOW_DATA_DIR, { recursive: true })
  ws = join(base, 'projeto')
  mkdirSync(ws, { recursive: true })
  resetDatabase()
  upsertSessionRecord({
    id: SID, slug: 'ajustes', title: 'Sintético', workspacePath: ws, contextKind: 'workspace',
    worktreePath: null, messageCount: 0, createdAt: Date.now(), updatedAt: Date.now(),
    sessionJson: JSON.stringify({ id: SID, workspacePath: ws, worktreePath: null, chats: [{ id: CID, messages: [] }] }),
  })
})

afterEach(() => {
  resetDatabase()
  delete process.env.AGENTE_WINDOW_DATA_DIR
  rmSync(base, { recursive: true, force: true })
})

async function enviarNoProjeto(nome: string, conteudo: string) {
  const recibo = await admitirUpload({
    sessionId: SID, chatId: CID, name: nome, declaredBytes: Buffer.byteLength(conteudo),
    mode: 'copy', scope: 'workspace', workspaceRoot: ws,
  })
  await receberConteudo(SID, CID, recibo.uploadId, Readable.from([Buffer.from(conteudo)]))
  return obterUpload(SID, CID, recibo.uploadId)!
}

describe('Ajustes de usabilidade C-3a', () => {
  it('outra conversa do mesmo projeto move e exclui o trabalho sem trocar o original', async () => {
    const linha = await enviarNoProjeto('compartilhado.txt', 'ORIGINAL')
    writeFileSync(linha.finalPath!, 'EDITADO')
    const sidB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', chatB = `${sidB}-main`
    upsertSessionRecord({ id: sidB, slug: 'projeto-vizinho', title: 'Vizinho', workspacePath: ws, contextKind: 'workspace', worktreePath: null, messageCount: 0, createdAt: 1, updatedAt: 1,
      sessionJson: JSON.stringify({ id: sidB, workspacePath: ws, worktreePath: null, chats: [{ id: chatB, messages: [] }] }) })
    const destino = join(ws, 'movido.txt')
    const host = { assertSafeUri: (uri: `file://${string}`) => uri === 'file:///origem' ? linha.finalPath! : destino }
    await moverNoExplorerProjeto(sidB, chatB, ws, host, 'file:///origem', 'file:///destino')
    resetDatabase()
    expect((await lerFonteConversa(SID, CID, linha.artifactId!, 100))).toMatchObject({ nome: 'movido.txt', bytes: Buffer.from('EDITADO') })
    expect(readFileSync((await lerArtigo(linha.artifactId!)).caminho, 'utf8')).toBe('ORIGINAL')
    await excluirNoExplorerProjeto(sidB, chatB, ws, host, 'file:///destino', false)
    writeFileSync(destino, 'SUBSTITUTO')
    resetDatabase()
    expect((await listarFontesConversa(SID, CID))[0].estado).toBe('trabalho_ausente')
    await expect(lerFonteConversa(SID, CID, linha.artifactId!, 100)).rejects.toThrow()
    expect(readFileSync((await lerArtigo(linha.artifactId!)).caminho, 'utf8')).toBe('ORIGINAL')
    expect(readFileSync(destino, 'utf8')).toBe('SUBSTITUTO')
  })
  it('preserva legado íntegro antes de mover; legado editado continua sem original inventado', async () => {
    const integro = await enviarNoProjeto('integro.txt', 'ORIGINAL')
    const editado = await enviarNoProjeto('editado.txt', 'ORIGINAL')
    rmSync(caminhoOriginalHistorico(obterArtigo(integro.artifactId!)!))
    rmSync(caminhoOriginalHistorico(obterArtigo(editado.artifactId!)!))
    writeFileSync(editado.finalPath!, 'EDITADO')
    for (const [linha, nome] of [[integro, 'novo-integro.txt'], [editado, 'novo-editado.txt']] as const) {
      const destino = join(ws, nome)
      const host = { assertSafeUri: (uri: `file://${string}`) => uri === 'file:///origem' ? linha.finalPath! : destino }
      await moverNoExplorerProjeto(SID, CID, ws, host, 'file:///origem', 'file:///destino')
    }
    expect(readFileSync((await lerArtigo(integro.artifactId!)).caminho, 'utf8')).toBe('ORIGINAL')
    await expect(lerArtigo(editado.artifactId!)).rejects.toThrow()
    expect((await lerFonteConversa(SID, CID, editado.artifactId!, 100)).bytes.toString()).toBe('EDITADO')
  })
  it('recupera movimento de projeto interrompido sem perder o original', async () => {
    const linha = await enviarNoProjeto('antigo.txt', 'ORIGINAL')
    const origem = linha.finalPath!, destino = join(ws, 'novo.txt'), info = lstatSync(origem)
    getDatabase().prepare('INSERT INTO explorer_project_work (artifact_id, session_id, chat_id, root, locator, missing) VALUES (?, ?, ?, ?, ?, 0)')
      .run(linha.artifactId, SID, CID, ws, 'uploads/antigo.txt')
    getDatabase().prepare('INSERT INTO explorer_project_moves (root, origem, destino, dev, ino, itens) VALUES (?, ?, ?, ?, ?, ?)')
      .run(ws, origem, destino, String(info.dev), String(info.ino), JSON.stringify([{ artifactId: linha.artifactId, sessionId: SID, chatId: CID, anterior: 'uploads/antigo.txt', novo: 'novo.txt' }]))
    renameSync(origem, destino); resetDatabase()
    expect((await lerFonteConversa(SID, CID, linha.artifactId!, 100)).nome).toBe('novo.txt')
    expect(readFileSync((await lerArtigo(linha.artifactId!)).caminho, 'utf8')).toBe('ORIGINAL')
  })
  it('A1 — a cópia no projeto mantém o nome original', async () => {
    const linha = await enviarNoProjeto('relatorio final.txt', 'CONTEUDO')
    const nomeArquivo = basename(linha.finalPath!)
    expect(nomeArquivo).toBe('relatorio final.txt')
    expect(readFileSync(linha.finalPath!, 'utf8')).toBe('CONTEUDO')
  })

  it('A2 — dois arquivos com o MESMO nome: ambos preservados, sem sobrescrita', async () => {
    const a = await enviarNoProjeto('nota.txt', 'PRIMEIRO')
    const b = await enviarNoProjeto('nota.txt', 'SEGUNDO')
    expect(a.finalPath).not.toBe(b.finalPath)
    expect(readFileSync(a.finalPath!, 'utf8')).toBe('PRIMEIRO')
    expect(readFileSync(b.finalPath!, 'utf8')).toBe('SEGUNDO')
    // Sufixo simples, como o usuário pediu: "nota (1).txt".
    // `.stages` é o diretório interno de transferência, não uma cópia.
    const copias = readdirSync(join(ws, 'uploads')).filter((nome) => nome !== '.stages')
    expect(copias.sort()).toEqual(['nota (1).txt', 'nota.txt'])
  })

  it('A3 — arquivos já armazenados com prefixo continuam acessíveis e não são renomeados', async () => {
    const legado = join(ws, 'uploads', 'abcdef12-antigo.txt')
    mkdirSync(join(ws, 'uploads'), { recursive: true })
    writeFileSync(legado, 'ANTIGO')
    // Um novo envio com o mesmo nome NÃO toca no arquivo antigo.
    const novo = await enviarNoProjeto('antigo.txt', 'NOVO')
    expect(readFileSync(legado, 'utf8')).toBe('ANTIGO')
    expect(readFileSync(novo.finalPath!, 'utf8')).toBe('NOVO')
    expect(existsSync(legado)).toBe(true)
  })

  it('A4 — retentativa do MESMO uploadId não cria cópia adicional', async () => {
    const uploadId = 'dddddddd-1111-4222-8333-444455556666'
    await admitirUpload({ sessionId: SID, chatId: CID, uploadId, name: 'unico.txt', declaredBytes: 3, mode: 'copy', scope: 'workspace', workspaceRoot: ws })
    await receberConteudo(SID, CID, uploadId, Readable.from([Buffer.from('AAA')]))
    // Reenvio do mesmo pedido (ACK perdido): mesmo recibo, mesma cópia.
    await admitirUpload({ sessionId: SID, chatId: CID, uploadId, name: 'unico.txt', declaredBytes: 3, mode: 'copy', scope: 'workspace', workspaceRoot: ws })
    await receberConteudo(SID, CID, uploadId, Readable.from([Buffer.from('AAA')])).catch(() => undefined)
    const arquivos = readdirSync(join(ws, 'uploads')).filter((nome) => nome.endsWith('.txt'))
    expect(arquivos).toHaveLength(1)
  })

  it('originais privados de uploads de projeto contam na quota da conversa', async () => {
    const pasta = join(process.env.AGENTE_WINDOW_DATA_DIR!, 'anexos')
    mkdirSync(pasta, { recursive: true })
    writeFileSync(join(pasta, 'politica.json'), JSON.stringify({ ...POLITICA_PADRAO, quotaChatBytes: 10, maxUploadBytes: 8 }))
    await enviarNoProjeto('primeiro.txt', '12345678')
    await expect(enviarNoProjeto('segundo.txt', '123')).rejects.toMatchObject({ code: 'quota_exceeded' })
    expect(existsSync(join(ws, 'uploads', 'segundo.txt'))).toBe(false)
  })

  it('upload de projeto preserva original independente após editar ou excluir o arquivo de trabalho', async () => {
    const alterado = await enviarNoProjeto('alterado.txt', 'ORIGINAL')
    const excluido = await enviarNoProjeto('excluido.txt', 'ORIGINAL')
    writeFileSync(alterado.finalPath!, 'ALTERADO')
    rmSync(excluido.finalPath!)
    expect(readFileSync((await lerArtigo(alterado.artifactId!)).caminho, 'utf8')).toBe('ORIGINAL')
    expect(readFileSync((await lerArtigo(excluido.artifactId!)).caminho, 'utf8')).toBe('ORIGINAL')
    rmSync(ws, { recursive: true })
    expect(readFileSync((await lerArtigo(alterado.artifactId!)).caminho, 'utf8')).toBe('ORIGINAL')
  })

  it('ferramenta autorizada lê a edição do projeto sem trocar o original; exclusão não recorre ao histórico', async () => {
    const linha = await enviarNoProjeto('trabalho.txt', 'ORIGINAL')
    writeFileSync(linha.finalPath!, 'VERSÃO EDITADA')
    expect((await listarFontesConversa(SID, CID))[0]).toMatchObject({ estado: 'trabalho', bytes: Buffer.byteLength('VERSÃO EDITADA') })
    const mudado = await prepararInspecaoAgente({ sessionId: SID, chatId: CID }, { acao: 'ler', artifactId: linha.artifactId! })
    writeFileSync(linha.finalPath!, 'VERSÃO POSTERIOR')
    await expect(mudado.executar()).rejects.toThrow(/mudou/)
    writeFileSync(linha.finalPath!, 'VERSÃO EDITADA')
    const plano = await prepararInspecaoAgente({ sessionId: SID, chatId: CID }, { acao: 'ler', artifactId: linha.artifactId! })
    expect(plano.previa).toContain('texto UTF-8')
    const resultado = await plano.executar()
    expect(JSON.parse(resultado.conteudo!).texto).toBe('VERSÃO EDITADA')
    expect(readFileSync((await lerArtigo(linha.artifactId!)).caminho, 'utf8')).toBe('ORIGINAL')
    rmSync(linha.finalPath!)
    expect((await listarFontesConversa(SID, CID))[0].estado).toBe('trabalho_ausente')
    await expect(lerFonteConversa(SID, CID, linha.artifactId!, 100)).rejects.toThrow()
    expect(readFileSync((await lerArtigo(linha.artifactId!)).caminho, 'utf8')).toBe('ORIGINAL')
  })

  it('legado preserva apenas original ainda verificável, sem promover bytes alterados', async () => {
    const intacto = await enviarNoProjeto('intacto.txt', 'ORIGINAL')
    const alterado = await enviarNoProjeto('alterado.txt', 'ORIGINAL')
    const excluido = await enviarNoProjeto('excluido.txt', 'ORIGINAL')
    // Recria o formato pré-migração: só há o arquivo no projeto e seu hash.
    for (const linha of [intacto, alterado, excluido]) rmSync(caminhoOriginalHistorico(obterArtigo(linha.artifactId!)!))
    writeFileSync(alterado.finalPath!, 'ALTERADO')
    rmSync(excluido.finalPath!)
    const original = (await lerArtigo(intacto.artifactId!)).caminho
    writeFileSync(intacto.finalPath!, 'EDIÇÃO')
    expect(readFileSync(original, 'utf8')).toBe('ORIGINAL')
    expect(readFileSync((await lerArtigo(intacto.artifactId!)).caminho, 'utf8')).toBe('ORIGINAL')
    await expect(lerArtigo(alterado.artifactId!)).rejects.toThrow()
    expect((await lerFonteConversa(SID, CID, alterado.artifactId!, 100)).bytes.toString()).toBe('ALTERADO')
    await expect(lerArtigo(excluido.artifactId!)).rejects.toThrow()
    await expect(lerFonteConversa(SID, CID, excluido.artifactId!, 100)).rejects.toThrow()
  })

  it('A5 — excluir a conversa preserva a cópia explícita no projeto', async () => {
    const linha = await enviarNoProjeto('preservar.txt', 'NAO SUMIR')
    iniciarOuConsultarDelecao({ sessionId: SID, deletionId: 'del-a5', expectedRevision: 0 })
    await executarLimpezaDelecao(SID, false).catch(() => undefined)
    expect(existsSync(linha.finalPath!)).toBe(true)
    expect(readFileSync(linha.finalPath!, 'utf8')).toBe('NAO SUMIR')
  })
})
