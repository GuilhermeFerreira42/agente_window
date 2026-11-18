// C-3a — endpoints (T13/T18/T19/T33): dono consultado no SQLite, Host/Origin
// revalidados na própria rota (defesa além do middleware), publicação de
// mensagem só com artefatos resolvidos, F5/lista/download honestos.
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PassThrough, Readable } from 'node:stream'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ChatMessage, Session } from '../../../types'
import { resetDatabase, upsertSessionRecord } from '../database'
import { PersistenceProblem } from '../persistenceErrors'
import { validarAnexosPublicados } from './publicacao'
import { tratarRotasAnexos } from './rotas'
import { registrarReferencia } from './referencias'
import { admitirUpload, receberConteudo, caminhoFinalChat } from './estoque'
import { obterArtigo } from './catalogo'
import { lerArtigo } from './estoque'

const SID = '33333333-3333-4333-8333-333333333333'
const OUTRO_SID = '44444444-4444-4444-8444-444444444444'
const CID = `${SID}-main`
const OUTRO_CID = `${OUTRO_SID}-main`
let base = ''

function seedSessao(id: string, chatId: string): void {
  upsertSessionRecord({
    id, slug: `c3a-${id.slice(0, 4)}`, title: 'Sessão C-3a', workspacePath: null, contextKind: 'chat',
    worktreePath: null, messageCount: 0, createdAt: Date.now(), updatedAt: Date.now(),
    sessionJson: JSON.stringify({ id, chats: [{ id: chatId, messages: [] }] }),
  })
}

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'c3a-routes-'))
  process.env.AGENTE_WINDOW_DATA_DIR = join(base, 'data')
  mkdirSync(process.env.AGENTE_WINDOW_DATA_DIR, { recursive: true })
  resetDatabase()
  seedSessao(SID, CID)
  seedSessao(OUTRO_SID, OUTRO_CID)
})

afterEach(() => {
  resetDatabase()
  delete process.env.AGENTE_WINDOW_DATA_DIR
  rmSync(base, { recursive: true, force: true })
})

function requisicao(metodo: string, caminho: string, corpo?: unknown, headers: Record<string, string> = {}): IncomingMessage {
  const pedacos = corpo !== undefined ? [Buffer.from(JSON.stringify(corpo))] : []
  const fluxo = Readable.from(pedacos) as Readable & Record<string, unknown>
  fluxo.method = metodo
  fluxo.url = caminho
  fluxo.headers = {
    host: '127.0.0.1:5174',
    origin: 'http://127.0.0.1:5174',
    'sec-fetch-site': 'same-origin',
    'content-type': 'application/json',
    ...headers,
  }
  fluxo.socket = { localPort: 5174, encrypted: false }
  return fluxo as unknown as IncomingMessage
}

function resposta(): ServerResponse & { statusCode: number; body: string; headers: Record<string, string> } {
  const fluxo = new PassThrough() as PassThrough & { statusCode: number; body: string; headers: Record<string, string>; setHeader(chave: string, valor: string): void }
  fluxo.statusCode = 0
  fluxo.body = ''
  fluxo.headers = {}
  fluxo.setHeader = (chave, valor) => { fluxo.headers[chave] = String(valor) }
  fluxo.on('data', (pedaco: Buffer) => { fluxo.body += pedaco.toString('utf8') })
  return fluxo as unknown as ServerResponse & { statusCode: number; body: string; headers: Record<string, string> }
}

async function chamar(metodo: string, caminho: string, corpo?: unknown, headers: Record<string, string> = {}) {
  const req = requisicao(metodo, caminho, corpo, headers)
  const res = resposta()
  const tratado = await tratarRotasAnexos(req, res, new URL(caminho, 'http://127.0.0.1:5174'))
  return { tratado, status: res.statusCode, corpo: res.body ? JSON.parse(res.body) : null }
}

function rota(resto = ''): string {
  return `/api/sessions/${SID}/chats/${CID}/attachments${resto}`
}

async function publicarExemplo(): Promise<{ uploadId: string; artifactId: string; bytes: Buffer }> {
  const bytes = Buffer.from('bytes sintéticos C-3a', 'utf8')
  const recibo = await admitirUpload({
    sessionId: SID, chatId: CID, name: 'exemplo.txt', declaredBytes: bytes.length, mode: 'copy', scope: 'chat',
  })
  await receberConteudo(SID, CID, recibo.uploadId, Readable.from([bytes]))
  return { uploadId: recibo.uploadId, artifactId: recibo.artifactId, bytes }
}

describe('C-3a rotas de anexo', () => {
  it('C3A-T13 — endpoints recusam dono diferente, Host forjado e Origin forjado', async () => {
    const { uploadId } = await publicarExemplo()
    // dono diferente (outra sessão/chat) não enxerga nem cancela o upload
    const alheio = await chamar('GET', `/api/sessions/${OUTRO_SID}/chats/${OUTRO_CID}/attachments/uploads/${uploadId}`)
    expect(alheio.status).toBe(404)
    const alheioDelete = await chamar('DELETE', `/api/sessions/${OUTRO_SID}/chats/${OUTRO_CID}/attachments/uploads/${uploadId}`)
    expect(alheioDelete.status).toBe(404)
    // Host forjado
    const host = await chamar('POST', rota('/uploads'), { name: 'x.bin', bytes: 4, mode: 'copy', scope: 'chat' }, { host: 'attacker.test:5174' })
    expect(host.status).toBe(403)
    expect(host.corpo?.code).toBe('local_only')
    // Origin forjado
    const origem = await chamar('POST', rota('/uploads'), { name: 'x.bin', bytes: 4, mode: 'copy', scope: 'chat' }, { origin: 'http://evil.test' })
    expect(origem.status).toBe(403)
    expect(origem.corpo?.code).toBe('local_only')
    // caminho de conteúdo binário também revalida
    const binario = await chamar('PUT', rota(`/uploads/${uploadId}/content`), undefined, { host: 'evil.test:5174', 'content-type': 'application/octet-stream' })
    expect(binario.status).toBe(403)
  })

  it('C3A-T33 — a própria rota aplica a fronteira local mesmo fora do middleware do Vite', async () => {
    const semOrigin = await chamar('POST', rota('/uploads'), { name: 'x.bin', bytes: 4, mode: 'copy', scope: 'chat' }, { origin: '', 'sec-fetch-site': 'cross-site' })
    expect(semOrigin.status).toBe(403)
    expect(semOrigin.corpo?.code).toBe('local_only')
    // e a variante SAME-ORIGIN correta passa (chegou no serviço)
    const ok = await chamar('POST', rota('/uploads'), { name: 'ok.bin', bytes: 4, mode: 'copy', scope: 'chat' })
    expect(ok.status).toBe(201)
    expect(ok.corpo).toMatchObject({ state: 'admitido', scope: 'chat' })
  })

  it('C3A-T18 — publicação da mensagem resolve artefatos do dono e recusa DTO pronto forjado', async () => {
    const { artifactId, bytes } = await publicarExemplo()
    const mensagem = (anexos: ChatMessage['attachments']): Session => ({
      id: SID, title: 'Sessão C-3a', workspace: 'Chat', workspacePath: null, worktreePath: null,
      contexto: { tipo: 'chat' }, section: 'today', status: 'completed', updated: 'agora',
      diffAdded: 0, diffRemoved: 0, branch: null, chats: [{ id: CID, title: 'novo', status: 'completed', messages: [
        { id: 'm1', role: 'user', content: 'texto', time: '10:00', attachments: anexos },
      ] }], mainChatId: CID,
    })
    // legado {id,name,kind} permanece válido (compatibilidade C-1/C-2)
    const legado = validarAnexosPublicados(SID, mensagem([{ id: 'a', name: 'antigo.txt', kind: 'local' }]))
    expect(legado.chats[0].messages[0].attachments).toEqual([{ id: 'a', name: 'antigo.txt', kind: 'local' }])
    // artefato do dono resolve e o servidor impõe a verdade do ledger
    const resolvida = validarAnexosPublicados(SID, mensagem([
      { id: 'a', name: 'exemplo.txt', kind: 'local', artifactId, estado: 'pronto' },
    ]))
    const anexo = resolvida.chats[0].messages[0].attachments![0]
    expect(anexo.estado).toBe('pronto')
    expect(anexo.bytes).toBe(bytes.length)
    expect(anexo.sha256).toMatch(/^[0-9a-f]{64}$/)
    // claim de PRONTO com hash/tamanho DIVERGENTES é recusado (DTO forjado)
    expect(() => validarAnexosPublicados(SID, mensagem([
      { id: 'a2', name: 'exemplo.txt', kind: 'local', artifactId, estado: 'pronto', bytes: 999999, sha256: 'f'.repeat(64) },
    ]))).toThrowError(/diverge do ledger/)
    // DTO `pronto` SEM artefato publicado → recusa (nada é publicado com esse estado)
    expect(() => validarAnexosPublicados(SID, mensagem([
      { id: 'b', name: 'fake.txt', kind: 'local', estado: 'pronto' },
    ]))).toThrowError(PersistenceProblem)
    // artefato de OUTRA conversa → recusa
    const { artifactId: alheio } = await (async () => {
      const recibo = await admitirUpload({ sessionId: OUTRO_SID, chatId: OUTRO_CID, name: 'alheio.bin', declaredBytes: 4, mode: 'copy', scope: 'chat' })
      await receberConteudo(OUTRO_SID, OUTRO_CID, recibo.uploadId, Readable.from([Buffer.alloc(4)]))
      return recibo
    })()
    try {
      validarAnexosPublicados(SID, mensagem([
        { id: 'c', name: 'alheio.bin', kind: 'local', artifactId: alheio, estado: 'pronto' },
      ]))
      expect.fail('deveria recusar artefato alheio')
    } catch (erro) {
      expect(erro).toBeInstanceOf(PersistenceProblem)
      expect((erro as PersistenceProblem).code).toBe('attachment_not_ready')
    }
  })

  it('C3A-T19 — F5: lista honesta após falha parcial e download devolve bytes com hash igual', async () => {
    const { artifactId, bytes } = await publicarExemplo()
    // upload interrompido fica como transferência em voo (sem artefato)
    const pendente = await admitirUpload({ sessionId: SID, chatId: CID, name: 'pendente.bin', declaredBytes: 8, mode: 'copy', scope: 'chat' })
    const lista = await chamar('GET', rota())
    expect(lista.status).toBe(200)
    expect(lista.corpo.attachments).toHaveLength(1)
    expect(lista.corpo.attachments[0]).toMatchObject({ artifactId, estado: 'pronto', presente: true })
    expect(lista.corpo.uploads.map((item: { uploadId: string; state: string }) => `${item.uploadId}:${item.state}`).join(','), `esperado ${pendente.uploadId}:admitido`).toContain(`${pendente.uploadId}:admitido`)
    // download: MESMOS bytes e hash do ledger
    const alvo = await lerArtigo(artifactId)
    expect(readFileSync(alvo.caminho)).toEqual(bytes)
    expect(createHash('sha256').update(readFileSync(alvo.caminho)).digest('hex')).toBe(obterArtigo(artifactId)!.sha256)
    // rota de download real (stream no response)
    const req = requisicao('GET', rota(`/${artifactId}?download=1`))
    const res = resposta()
    const tratado = await tratarRotasAnexos(req, res, new URL(rota(`/${artifactId}?download=1`), 'http://127.0.0.1:5174'))
    expect(tratado).toBe(true)
    expect(res.headers['Content-Type']).toBe('application/octet-stream')
    await new Promise<void>((resolve) => (res as unknown as PassThrough).on('end', resolve))
    expect(Buffer.from(res.body, 'binary').length).toBeGreaterThan(0)
    // artefato alheio não baixa
    const negado = await chamar('GET', rota('/11111111-0000-4000-8000-000000000000'))
    expect(negado.status).toBe(404)
    expect(existsSync(caminhoFinalChat(undefined, SID, CID, artifactId, 'exemplo.txt'))).toBe(true)
  })

  it('C3A-T22 — referência removida/alterada: revalidação impede uso; atualização explícita sem retarget silencioso', async () => {
    const ws = join(base, 'ws-t22')
    mkdirSync(join(ws, 'docs'), { recursive: true })
    const original = join(ws, 'docs', 'relatorio.md')
    writeFileSync(original, 'versão 1 do relatório', 'utf8')
    const ref1 = await registrarReferencia({ sessionId: SID, chatId: CID, workspaceRoot: ws, sourcePath: 'docs/relatorio.md' })
    const rotaRef = `/api/sessions/${SID}/chats/${CID}/attachments/${ref1.artifactId}`

    // Referência válida: metadados relativos, nunca caminho absoluto do projeto.
    const valida = await chamar('GET', rotaRef)
    expect(valida.status).toBe(200)
    expect(valida.corpo).toMatchObject({ estado: 'pronto', presente: true, mode: 'reference', referencia: 'docs/relatorio.md' })
    expect(JSON.stringify(valida.corpo)).not.toContain(ws)

    // Alterada depois do registro → revalidação impede o uso.
    writeFileSync(original, 'versão 2 — conteúdo substituído fora do produto', 'utf8')
    const alterada = await chamar('GET', rotaRef)
    expect(alterada.corpo).toMatchObject({ estado: 'ausente', presente: false })

    // Removida → continua impedida.
    rmSync(original)
    const removida = await chamar('GET', rotaRef)
    expect(removida.corpo).toMatchObject({ estado: 'ausente', presente: false })

    // Atualização EXPLÍCITA: novo registro vale; o antigo não é retargetado.
    writeFileSync(original, 'versão 3 — atualização explícita', 'utf8')
    const ref2 = await registrarReferencia({ sessionId: SID, chatId: CID, workspaceRoot: ws, sourcePath: 'docs/relatorio.md' })
    expect(ref2.artifactId).not.toBe(ref1.artifactId)
    expect(ref2.sha256).not.toBe(ref1.sha256)
    const antigo = await chamar('GET', rotaRef)
    expect(antigo.corpo).toMatchObject({ estado: 'ausente', presente: false })
    const novo = await chamar('GET', `/api/sessions/${SID}/chats/${CID}/attachments/${ref2.artifactId}`)
    expect(novo.corpo).toMatchObject({ estado: 'pronto', presente: true, referencia: 'docs/relatorio.md' })
  })

})
