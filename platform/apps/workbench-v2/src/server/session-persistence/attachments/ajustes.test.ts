// Reprodução dos dois ajustes de usabilidade pedidos na C-3a.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resetDatabase, upsertSessionRecord } from '../database'
import { admitirUpload, lerArtigo, receberConteudo } from './estoque'
import { obterUpload } from './catalogo'
import { executarLimpezaDelecao, iniciarOuConsultarDelecao } from '../deletions'

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

  // Diagnóstico do formato legado ANTES da migração MM-I: o catálogo guarda
  // só o caminho e hash da cópia de projeto, não outros bytes históricos. Este
  // teste deve ser substituído por jornadas de migração quando ela existir.
  it('legado pré-migração — alteração ou exclusão da única cópia não fornece o original', async () => {
    const alterado = await enviarNoProjeto('alterado.txt', 'ORIGINAL')
    const excluido = await enviarNoProjeto('excluido.txt', 'ORIGINAL')
    expect(readFileSync((await lerArtigo(alterado.artifactId!)).caminho, 'utf8')).toBe('ORIGINAL')
    writeFileSync(alterado.finalPath!, 'ALTERADO')
    rmSync(excluido.finalPath!)
    await expect(lerArtigo(alterado.artifactId!)).rejects.toMatchObject({ code: 'attachment_changed' })
    await expect(lerArtigo(excluido.artifactId!)).rejects.toThrow()
  })

  it('A5 — excluir a conversa preserva a cópia explícita no projeto', async () => {
    const linha = await enviarNoProjeto('preservar.txt', 'NAO SUMIR')
    iniciarOuConsultarDelecao({ sessionId: SID, deletionId: 'del-a5', expectedRevision: 0 })
    await executarLimpezaDelecao(SID, false).catch(() => undefined)
    expect(existsSync(linha.finalPath!)).toBe(true)
    expect(readFileSync(linha.finalPath!, 'utf8')).toBe('NAO SUMIR')
  })
})
