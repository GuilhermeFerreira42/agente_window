// C-3a — as 13 SONDAS da revisão independente (parecer 2026-11-18) como
// REGRESSÕES do projeto. Cada `Hn` corresponde ao achado homonônimo e mantém o
// cenário e a asserção substantivos (fronteiras reais: SQLite, disco, streams,
// HTTP handler real com sockets simulados). O nome do teste não substitui a
// prova: a asserção é a mesma do parecer, agora no caminho corrigido.
//
// Portabilidade: symlink/junction é criado com a primitiva do SO; quando o
// ambiente não permite (Windows sem privilégio), a prova é declarada como
// platform-dependent, nunca silenciosamente pulada por falta de cenário.
import { createHash } from 'node:crypto'
import {
  appendFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync,
  symlinkSync, writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PassThrough, Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDatabase, resetDatabase, upsertSessionRecord } from '../database'
import { executarLimpezaDelecao, iniciarOuConsultarDelecao } from '../deletions'
import { withSessionPersistenceQueue } from '../filaSessao'
import { admitirUpload, caminhoFinalChat, receberConteudo, reconciliarIdentidade } from './estoque'
import { listarArtigosChat, obterArtigo, obterUpload, uploadsAtivos } from './catalogo'
import { tratarRotasAnexos } from './rotas'
import { verificarReferencia } from './referencias'

const SID = '99999999-9999-4999-8999-999999999999'
const CID = `${SID}-main`
const sha = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex')

let base = ''

function seed(id: string, chatId: string, extra: Record<string, unknown> = {}): void {
  upsertSessionRecord({
    id, slug: `probes-${id.slice(0, 4)}`, title: 'Sonda', workspacePath: null, contextKind: 'chat',
    worktreePath: null, messageCount: 0, createdAt: Date.now(), updatedAt: Date.now(),
    sessionJson: JSON.stringify({ id, workspacePath: null, worktreePath: null, chats: [{ id: chatId, messages: [] }], ...extra }),
  })
}

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'c3a-probes-'))
  process.env.AGENTE_WINDOW_DATA_DIR = join(base, 'data')
  mkdirSync(process.env.AGENTE_WINDOW_DATA_DIR, { recursive: true })
  resetDatabase()
  seed(SID, CID)
})

afterEach(() => {
  vi.restoreAllMocks()
  resetDatabase()
  delete process.env.AGENTE_WINDOW_DATA_DIR
  rmSync(base, { recursive: true, force: true })
})

interface ResultadoRota { status: number; json: unknown; texto: string; headers: Record<string, string> }

async function rota(metodo: string, resto: string, corpo?: unknown, chatId = CID, cabecalhos: Record<string, string> = {}): Promise<ResultadoRota> {
  const url = `http://127.0.0.1:5214/api/sessions/${SID}/chats/${chatId}/attachments${resto}`
  const req = Readable.from(corpo === undefined ? [] : [Buffer.from(JSON.stringify(corpo))]) as never as Record<string, unknown>
  Object.assign(req, {
    method: metodo, url: new URL(url).pathname,
    headers: { host: '127.0.0.1:5214', origin: 'http://127.0.0.1:5214', 'sec-fetch-site': 'same-origin', 'content-type': 'application/json', ...cabecalhos },
    socket: { localPort: 5214, encrypted: false },
  })
  const res = new PassThrough() as PassThrough & Record<string, unknown>
  res.statusCode = 0
  res.headers = {}
  res.setHeader = (chave: string, valor: string) => { (res.headers as Record<string, string>)[chave] = valor }
  let texto = ''
  res.on('data', (pedaco: Buffer) => { texto += pedaco.toString('utf8') })
  const terminou = new Promise<void>((resolve) => res.on('finish', () => resolve()))
  await tratarRotasAnexos(req as never, res as never, new URL(url))
  await terminou
  let json: unknown
  try { json = JSON.parse(texto) } catch { json = undefined }
  return { status: Number(res.statusCode), json, texto, headers: res.headers as Record<string, string> }
}

async function admitir(nome = 'a.bin', bytes = 3): Promise<{ uploadId: string; artifactId: string }> {
  return admitirUpload({ sessionId: SID, chatId: CID, name: nome, declaredBytes: bytes, mode: 'copy', scope: 'chat' })
}

async function pronto(nome = 'a.bin', conteudo = 'AAA'): Promise<{ uploadId: string; artifactId: string; finalPath: string }> {
  const recibo = await admitir(nome, Buffer.byteLength(conteudo))
  await receberConteudo(SID, CID, recibo.uploadId, Readable.from([Buffer.from(conteudo)]))
  const linha = obterUpload(SID, CID, recibo.uploadId)!
  return { uploadId: recibo.uploadId, artifactId: recibo.artifactId, finalPath: linha.finalPath! }
}

describe('C-3a sondas da revisão (regressões)', () => {
  it('H1: Chat não admite pasta arbitrária fornecida no corpo', async () => {
    const fora = join(base, 'fora-do-chat')
    mkdirSync(fora)
    const r = await rota('POST', '/uploads', {
      uploadId: crypto.randomUUID(), name: 'a.bin', bytes: 3, mode: 'copy', scope: 'workspace', workspaceRoot: fora,
    })
    expect(r.status).toBe(403)
    // Raiz em conversa de Chat é recusada ANTES de qualquer leitura de escopo.
    expect((r.json as { code: string }).code).toBe('storage_out_of_scope')
    expect(existsSync(join(fora, 'uploads'))).toBe(false)
  })

  it('H1b: conversa interna inexistente não admite upload', async () => {
    const r = await rota('POST', '/uploads', { name: 'a.bin', bytes: 3, mode: 'copy', scope: 'chat' }, 'chat-inexistente')
    expect(r.status).toBe(404)
    expect((r.json as { code: string }).code).toBe('chat_not_found')
  })

  it('H1c: raiz declarada diferente da raiz do catálogo é recusada (nunca default permissivo)', async () => {
    const raiz = join(base, 'projeto-real')
    const outra = join(base, 'outro-lugar')
    mkdirSync(raiz)
    mkdirSync(outra)
    upsertSessionRecord({
      id: SID, slug: 'probes-ws', title: 'Sonda Pasta', workspacePath: raiz, contextKind: 'workspace',
      worktreePath: null, messageCount: 0, createdAt: Date.now(), updatedAt: Date.now(),
      sessionJson: JSON.stringify({ id: SID, workspacePath: raiz, worktreePath: null, chats: [{ id: CID, messages: [] }] }),
    })
    const r = await rota('POST', '/uploads', {
      name: 'a.bin', bytes: 3, mode: 'copy', scope: 'workspace', workspaceRoot: outra,
    })
    expect(r.status).toBe(403)
    expect((r.json as { code: string }).code).toBe('workspace_mismatch')
    expect(existsSync(join(outra, 'uploads'))).toBe(false)
    // campo desconhecido também não vira default silencioso
    const extra = await rota('POST', '/uploads', { name: 'b.bin', bytes: 3, mode: 'copy', scope: 'chat', destino: 'C:\\Windows' })
    expect(extra.status).toBe(400)
    expect((extra.json as { code: string }).code).toBe('unexpected_field')
  })

  it('H1d: pasta offline — lista segue consultável, escrita continua recusada', async () => {
    const raiz = join(base, 'projeto-offline')
    mkdirSync(raiz)
    upsertSessionRecord({
      id: SID, slug: 'probes-ws-off', title: 'Sonda Pasta', workspacePath: raiz, contextKind: 'workspace',
      worktreePath: null, messageCount: 0, createdAt: Date.now(), updatedAt: Date.now(),
      sessionJson: JSON.stringify({ id: SID, workspacePath: raiz, worktreePath: null, chats: [{ id: CID, messages: [] }] }),
    })
    // Pasta "sai do ar" (renomeada): a raiz persistida não existe mais.
    rmSync(raiz, { recursive: true, force: true })
    // Leitura: 200 com lista vazia — o dono não fica sem diagnóstico (F5).
    const lista = await rota('GET', '')
    expect(lista.status).toBe(200)
    expect(lista.json).toMatchObject({ attachments: [], uploads: [] })
    // Escrita: recusada com 409 e mensagem de estado (nunca grava às cegas).
    const escrita = await rota('POST', '/uploads', { name: 'a.bin', bytes: 3, mode: 'copy', scope: 'chat' })
    expect(escrita.status).toBe(409)
    expect((escrita.json as { code: string }).code).toBe('session_context_mismatch')
    mkdirSync(raiz)
  })

  it('H2: recovery não lê caminho arbitrário recebido do cliente', async () => {
    const { uploadId } = await admitir('copiado.txt', 1)
    const externo = join(base, 'origem-fora-do-storage.txt')
    writeFileSync(externo, 'DADOS SINTÉTICOS EXTERNOS')
    const r = await rota('POST', '/recovery/prepare', { uploadId, source: externo })
    expect(r.status).toBe(400)
    expect((r.json as { code: string }).code).toBe('unexpected_field')
    // Nada do conteúdo externo foi copiado para o storage.
    expect(JSON.stringify(obterUpload(SID, CID, uploadId))).not.toContain('DADOS SINTÉTICOS')
  })

  it('H3: limpeza com arquivo divergente não conclui nem apaga o ledger', async () => {
    const publicado = await pronto('h3.bin', 'AAA')
    writeFileSync(publicado.finalPath, 'BBB')
    iniciarOuConsultarDelecao({ sessionId: SID, deletionId: 'sonda-h3', expectedRevision: 0 })
    await expect(executarLimpezaDelecao(SID, false))
      .rejects.toMatchObject({ status: 503, code: 'session_cleanup_pending' })
    expect(existsSync(publicado.finalPath)).toBe(true)
    expect(obterArtigo(publicado.artifactId)).toBeDefined()
    expect(readFileSync(publicado.finalPath, 'utf8')).toBe('BBB')
  })

  it('H4: stage modificado depois do digest não publica como íntegro', async () => {
    const recibo = await admitir('h4.bin', 3)
    const linha = obterUpload(SID, CID, recibo.uploadId)!
    mkdirSync(join(linha.stagePath!, '..'), { recursive: true })
    writeFileSync(linha.stagePath!, 'BBB')
    // intenção preparada com o digest de 'AAA' (mesmo tamanho)
    const { atualizarUpload } = await import('./catalogo')
    atualizarUpload(SID, CID, recibo.uploadId, { state: 'preparado', receivedBytes: 3, digest: sha('AAA') })
    const { publicarPreparado } = await import('./estoque')
    await expect(publicarPreparado(SID, CID, recibo.uploadId)).rejects.toMatchObject({ code: 'integrity_mismatch' })
    expect(obterArtigo(recibo.artifactId)).toBeUndefined()
    expect(readFileSync(linha.stagePath!, 'utf8')).toBe('BBB') // bytes preservados
    expect(obterUpload(SID, CID, recibo.uploadId)!.state).toBe('falhou')
  })

  it('H5: stage ausente + destino divergente não provam publicação', async () => {
    const recibo = await admitir('h5.bin', 3)
    const linha = obterUpload(SID, CID, recibo.uploadId)!
    const { atualizarUpload } = await import('./catalogo')
    atualizarUpload(SID, CID, recibo.uploadId, { state: 'preparado', receivedBytes: 3, digest: sha('AAA') })
    mkdirSync(join(linha.finalPath!, '..'), { recursive: true })
    writeFileSync(linha.finalPath!, 'BBB')
    const { publicarPreparado } = await import('./estoque')
    await expect(publicarPreparado(SID, CID, recibo.uploadId))
      .rejects.toMatchObject({ code: 'recovery_verification_failed' })
    expect(obterArtigo(recibo.artifactId)).toBeUndefined()
    expect(readFileSync(linha.finalPath!, 'utf8')).toBe('BBB') // não sobrescreveu
  })

  it('H6: mesmo uploadId com metadados diferentes conflita (e o replay igual devolve o recibo)', async () => {
    const primeiro = await pronto('h6.bin', 'AAA')
    await expect(admitirUpload({
      sessionId: SID, chatId: CID, uploadId: primeiro.uploadId, name: 'outro.bin', declaredBytes: 2, mode: 'copy', scope: 'chat',
    })).rejects.toMatchObject({ status: 409, code: 'upload_conflict' })
    // replay IDÊNTICO devolve o MESMO recibo (idempotência R07)
    const replay = await admitirUpload({
      sessionId: SID, chatId: CID, uploadId: primeiro.uploadId, name: 'h6.bin', declaredBytes: 3, mode: 'copy', scope: 'chat',
    })
    expect(replay).toMatchObject({ uploadId: primeiro.uploadId, state: 'pronto' })
    expect(listarArtigosChat(SID, CID)).toHaveLength(1)
  })

  it('H7: tombstone durante o stream impede a publicação tardia (upload já em voo)', async () => {
    const recibo = await admitir('h7.bin', 3)
    let liberar!: () => void
    let começou!: () => void
    const portao = new Promise<void>((resolve) => { liberar = resolve })
    const iniciado = new Promise<void>((resolve) => { começou = resolve })
    async function* bytes() { começou(); await portao; yield Buffer.from('AAA') }
    const tarefa = receberConteudo(SID, CID, recibo.uploadId, Readable.from(bytes()))
    await iniciado
    iniciarOuConsultarDelecao({ sessionId: SID, deletionId: 'sonda-h7', expectedRevision: 0 })
    liberar()
    await expect(tarefa).rejects.toMatchObject({ status: 410, code: 'session_deleted' })
    expect(obterArtigo(recibo.artifactId)).toBeUndefined()
  })

  it('H8: referência modificada não entrega os bytes novos (409 honesto)', async () => {
    const ws = join(base, 'ws-h8')
    mkdirSync(ws)
    writeFileSync(join(ws, 'a.txt'), 'AAA')
    upsertSessionRecord({
      id: SID, slug: 'probes-ws-h8', title: 'Sonda Pasta', workspacePath: ws, contextKind: 'workspace',
      worktreePath: null, messageCount: 0, createdAt: Date.now(), updatedAt: Date.now(),
      sessionJson: JSON.stringify({ id: SID, workspacePath: ws, worktreePath: null, chats: [{ id: CID, messages: [] }] }),
    })
    const criada = await rota('POST', '/references', { workspaceRoot: ws, sourcePath: 'a.txt' })
    expect(criada.status).toBe(201)
    const artifactId = (criada.json as { artifactId: string }).artifactId
    writeFileSync(join(ws, 'a.txt'), 'BBB')
    expect(await verificarReferencia(artifactId)).toEqual({ presente: true, integro: false })
    const download = await rota('GET', `/${artifactId}?download=1`)
    expect(download.status).toBe(409)
    expect((download.json as { code: string }).code).toBe('reference_changed')
    expect(download.texto).not.toContain('BBB')
  })

  it('H9: falha SQL no ledger não deixa recibo pronto irrecuperável', async () => {
    const recibo = await admitir('h9.bin', 3)
    getDatabase().exec("CREATE TRIGGER sonda_fail BEFORE INSERT ON attachment_artifacts BEGIN SELECT RAISE(ABORT,'injetado'); END")
    await expect(receberConteudo(SID, CID, recibo.uploadId, Readable.from([Buffer.from('AAA')]))).rejects.toThrow()
    getDatabase().exec('DROP TRIGGER sonda_fail')
    await reconciliarIdentidade(SID, CID, {}, { todos: true })
    // Invariante: nunca `pronto` sem artefato consultável.
    expect(obterUpload(SID, CID, recibo.uploadId)!.state === 'pronto' && !obterArtigo(recibo.artifactId)).toBe(false)
  })

  it('H10: link/junction em diretório PAI da referência não escapa da raiz', async () => {
    const ws = join(base, 'ws-h10')
    const externo = join(base, 'externo-h10')
    mkdirSync(ws)
    mkdirSync(externo)
    writeFileSync(join(externo, 'a.txt'), 'SINTÉTICO EXTERNO')
    const atalho = join(ws, 'atalho')
    try {
      symlinkSync(externo, atalho, 'junction')
    } catch {
      symlinkSync(externo, atalho, 'dir')
    }
    // Sanidade do fixture: o link aponta MESMO para fora.
    expect(lstatSync(atalho).isSymbolicLink() || process.platform === 'win32').toBe(true)
    await expect(import('./referencias').then(({ registrarReferencia }) => registrarReferencia({
      sessionId: SID, chatId: CID, workspaceRoot: ws, sourcePath: 'atalho/a.txt',
    }))).rejects.toMatchObject({ code: 'reference_out_of_scope' })
    // O sinal positivo: um arquivo REAL na raiz continua aceito.
    writeFileSync(join(ws, 'dentro.txt'), 'DENTRO')
    const ok = await import('./referencias').then(({ registrarReferencia }) => registrarReferencia({
      sessionId: SID, chatId: CID, workspaceRoot: ws, sourcePath: 'dentro.txt',
    }))
    expect(ok.mode).toBe('reference')
  })

  it('H11: falha no segundo arquivo da landing permite retentar o primeiro pronto sem File', async () => {
    const { prepararAnexosDaLanding } = await import('../../../services/sessions/enviarComAnexos')
    const { guardarArquivoVivo, limparTodosArquivosVivos, arquivoVivo } = await import('../../../domain/arquivosVivos')
    const { limparRecibosDoRascunho, lerRecibo } = await import('../../../domain/rascunhoTransferencia')
    limparTodosArquivosVivos()
    limparRecibosDoRascunho()
    const a = crypto.randomUUID()
    const b = crypto.randomUUID()
    guardarArquivoVivo(a, new File(['AAA'], 'primeiro.bin'))
    guardarArquivoVivo(b, new File(['BBB'], 'segundo.bin'))
    const recibo = (id: string, nome: string, state: string) => ({
      uploadId: id, artifactId: id, name: nome, bytes: 3, sha256: sha('AAA'),
      state, mode: 'copy' as const, scope: 'chat' as const, errorCode: null,
    })
    const cliente = await import('../../../services/sessions/anexosClient')
    vi.spyOn(cliente, 'admitirAnexo').mockImplementation(async (entrada) => recibo(entrada.uploadId, entrada.name, 'admitido') as never)
    let falhou = false
    vi.spyOn(cliente, 'enviarConteudoAnexo').mockImplementation(async (_s, _c, id, file) => {
      if (id === b && !falhou) { falhou = true; throw new Error('falha sintética do segundo') }
      return recibo(id, file.name, 'pronto') as never
    })
    // Retry consulta o RECIBO antes do File (B10): o primeiro já está pronto
    // no servidor mesmo depois de o File transitório ser consumido.
    vi.spyOn(cliente, 'estadoAnexo').mockImplementation(async (_s, _c, id) => recibo(id, id === a ? 'primeiro.bin' : 'segundo.bin', id === a ? 'pronto' : 'falhou') as never)

    const anexos = [
      { id: a, name: 'primeiro.bin', kind: 'local' as const, uploadId: a, estado: 'selecionado' as const },
      { id: b, name: 'segundo.bin', kind: 'local' as const, uploadId: b, estado: 'selecionado' as const },
    ]
    const entrada = { sessionId: SID, chatId: CID, texto: '', workspaceRoot: null, anexos }

    let primeiraFalha: unknown
    try { await prepararAnexosDaLanding(entrada) } catch (erro) { primeiraFalha = erro }
    expect(primeiraFalha).toBeDefined()
    // O PRIMEIRO ficou salvo: recibo do servidor guardado pelo dono.
    expect(lerRecibo(SID, CID, a)?.recibo.state).toBe('pronto')
    void arquivoVivo

    // Retry: o primeiro é reusado pelo recibo do servidor (sem File local).
    const segunda = await prepararAnexosDaLanding(entrada)
    expect(segunda.map((item) => `${item.name}:${item.estado}`)).toEqual(['primeiro.bin:pronto', 'segundo.bin:pronto'])
    limparTodosArquivosVivos()
    limparRecibosDoRascunho()
  })

  it('H12: admissões paralelas respeitam a concorrência configurada', async () => {
    const resultados = await Promise.allSettled([admitir('a.bin'), admitir('b.bin'), admitir('c.bin')])
    expect(resultados.filter((item) => item.status === 'fulfilled').length).toBeLessThanOrEqual(2)
    expect(uploadsAtivos().length).toBeLessThanOrEqual(2)
    const recusada = resultados.find((item) => item.status === 'rejected') as PromiseRejectedResult | undefined
    expect(recusada?.reason).toMatchObject({ code: 'too_many_uploads' })
  })

  it('H7b: a fila do dono serializa admissão/finalização (uma fila só, compartilhada)', async () => {
    const ordem: string[] = []
    const tarefa = (nome: string, espera: number) => withSessionPersistenceQueue(SID, async () => {
      ordem.push(`${nome}:inicio`)
      await new Promise((resolve) => setTimeout(resolve, espera))
      ordem.push(`${nome}:fim`)
    })
    await Promise.all([tarefa('a', 30), tarefa('b', 1)])
    expect(ordem).toEqual(['a:inicio', 'a:fim', 'b:inicio', 'b:fim'])
  })

  it('H13: arquivo privado alterado fora do produto não é servido com hash antigo', async () => {
    const publicado = await pronto('h13.bin', 'AAA')
    appendFileSync(publicado.finalPath, ' | adulterado')
    const download = await rota('GET', `/${publicado.artifactId}?download=1`)
    expect(download.status).toBe(409)
    expect((download.json as { code: string }).code).toBe('attachment_changed')
    const meta = await rota('GET', `/${publicado.artifactId}`)
    expect(meta.json).toMatchObject({ estado: 'ausente', presente: false })
    // O arquivo adulterado continua no disco (evidência preservada).
    expect(existsSync(publicado.finalPath)).toBe(true)
    expect(caminhoFinalChat(undefined, SID, CID, publicado.artifactId, 'h13.bin')).toBe(publicado.finalPath)
  })

  it('H14: stage de workspace vive no volume do destino (mesma partição do arquivo final)', async () => {
    const ws = join(base, 'projeto-h14')
    mkdirSync(ws)
    upsertSessionRecord({
      id: SID, slug: 'probes-ws-h14', title: 'Sonda Pasta', workspacePath: ws, contextKind: 'workspace',
      worktreePath: null, messageCount: 0, createdAt: Date.now(), updatedAt: Date.now(),
      sessionJson: JSON.stringify({ id: SID, workspacePath: ws, worktreePath: null, chats: [{ id: CID, messages: [] }] }),
    })
    const recibo = await admitirUpload({
      sessionId: SID, chatId: CID, name: 'proj.bin', declaredBytes: 5, mode: 'copy', scope: 'workspace', workspaceRoot: ws,
    })
    const linha = obterUpload(SID, CID, recibo.uploadId)!
    expect(linha.stagePath!.startsWith(join(ws, 'uploads'))).toBe(true)
    expect(linha.finalPath!.startsWith(join(ws, 'uploads'))).toBe(true)
    const resultado = await receberConteudo(SID, CID, recibo.uploadId, Readable.from([Buffer.from('AAAAA')]))
    expect(resultado.state).toBe('pronto')
    expect(readFileSync(linha.finalPath!, 'utf8')).toBe('AAAAA')
    // Cópia no projeto não entra na quota privada do chat.
    expect(listarArtigosChat(SID, CID)[0]).toMatchObject({ rootKind: 'workspace' })
  })

  it('H15: publicação concorrente de dois pedidos com o mesmo nome não cruza bytes', async () => {
    const ws = join(base, 'projeto-h15')
    mkdirSync(ws)
    upsertSessionRecord({
      id: SID, slug: 'probes-ws-h15', title: 'Sonda Pasta', workspacePath: ws, contextKind: 'workspace',
      worktreePath: null, messageCount: 0, createdAt: Date.now(), updatedAt: Date.now(),
      sessionJson: JSON.stringify({ id: SID, workspacePath: ws, worktreePath: null, chats: [{ id: CID, messages: [] }] }),
    })
    mkdirSync(join(ws, 'uploads'), { recursive: true })
    const um = await admitirUpload({ sessionId: SID, chatId: CID, name: 'mesmo.txt', declaredBytes: 3, mode: 'copy', scope: 'workspace', workspaceRoot: ws })
    const dois = await admitirUpload({ sessionId: SID, chatId: CID, name: 'mesmo.txt', declaredBytes: 4, mode: 'copy', scope: 'workspace', workspaceRoot: ws })
    await receberConteudo(SID, CID, um.uploadId, Readable.from([Buffer.from('AAA')]))
    await receberConteudo(SID, CID, dois.uploadId, Readable.from([Buffer.from('BBBB')]))
    const linhaUm = obterUpload(SID, CID, um.uploadId)!
    const linhaDois = obterUpload(SID, CID, dois.uploadId)!
    expect(linhaUm.finalPath).not.toBe(linhaDois.finalPath)
    expect(readFileSync(linhaUm.finalPath!, 'utf8')).toBe('AAA')
    expect(readFileSync(linhaDois.finalPath!, 'utf8')).toBe('BBBB')
  })
})
