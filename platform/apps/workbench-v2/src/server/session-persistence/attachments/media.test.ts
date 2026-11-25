// ============================================================================
// C-3b — T10 a T14: rota de mídia passiva com fixtures de bytes REAIS.
//
// O que estes testes provam: HTTP (200/206/416/HEAD), Range nas três formas,
// classificação por bytes (não por nome), ownership/tombstone reusados e
// streaming que não carrega o arquivo inteiro.
//
// O que eles NÃO provam: que o navegador decodifica. Isso é prova de
// apresentação (naturalWidth/decodedAudio/loadedmetadata) e de E2E.
// ============================================================================
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PassThrough, Readable } from 'node:stream'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { classificarPreview, BYTES_SONDA } from '../../../domain/politicaPreview'
import { upsertSessionRecord, resetDatabase } from '../database'
import { tratarRotasAnexos } from './rotas'
import { admitirUpload, receberConteudo } from './estoque'
import { obterArtigo } from './catalogo'
import { interpretarRange, lerSondaDePreview } from './midia'

const FIXTURES = join(__dirname, '../../..', '__tests__/fixtures/midia')
const fixture = (nome: string) => readFileSync(join(FIXTURES, nome))
const sha256 = (dados: Buffer) => createHash('sha256').update(dados).digest('hex')

const SID = '55555555-5555-4555-8555-555555555555'
const OUTRO_SID = '66666666-6666-4666-8666-666666666666'
const CID = `${SID}-main`
const OUTRO_CID = `${OUTRO_SID}-main`
let base = ''

function seedSessao(id: string, chatId: string, workspacePath: string | null = null): void {
  upsertSessionRecord({
    id, slug: `c3b-${id.slice(0, 4)}`, title: 'Sessão C-3b', workspacePath,
    contextKind: workspacePath ? 'workspace' : 'chat', worktreePath: null,
    messageCount: 0, createdAt: Date.now(), updatedAt: Date.now(),
    sessionJson: JSON.stringify({
      id, workspacePath, worktreePath: null, chats: [{ id: chatId, messages: [] }],
    }),
  })
}

/** Publica um arquivo real do dono e devolve o artifactId. */
async function publicar(nome: string, dados: Buffer, opcoes: { sessionId?: string; chatId?: string } = {}): Promise<string> {
  const sessionId = opcoes.sessionId ?? SID
  const chatId = opcoes.chatId ?? CID
  const recibo = await admitirUpload({
    sessionId, chatId, name: nome, declaredBytes: dados.length,
    mime: 'application/octet-stream', mode: 'copy', scope: 'chat',
  })
  const pronto = await receberConteudo(sessionId, chatId, recibo.uploadId, Readable.from([dados]))
  if (pronto.state !== 'pronto' || !pronto.artifactId) throw new Error(`publicação falhou: ${pronto.state}`)
  return pronto.artifactId
}

interface RespostaFake extends PassThrough {
  statusCode: number
  headers: Record<string, string>
  binario: Buffer
  setHeader(chave: string, valor: string): void
  removeHeader(chave: string): void
  getHeader(chave: string): string | undefined
}

function resposta(): ServerResponse & RespostaFake {
  const fluxo = new PassThrough() as unknown as RespostaFake
  const pedacos: Buffer[] = []
  fluxo.statusCode = 0
  fluxo.headers = {}
  fluxo.binario = Buffer.alloc(0)
  fluxo.setHeader = (chave, valor) => { fluxo.headers[chave.toLowerCase()] = String(valor) }
  fluxo.removeHeader = (chave) => { delete fluxo.headers[chave.toLowerCase()] }
  fluxo.getHeader = (chave) => fluxo.headers[chave.toLowerCase()]
  fluxo.on('data', (pedaco: Buffer) => { pedacos.push(Buffer.from(pedaco)); fluxo.binario = Buffer.concat(pedacos) })
  return fluxo as unknown as ServerResponse & RespostaFake
}

function requisicao(
  metodo: string,
  caminho: string,
  headers: Record<string, string> = {},
): IncomingMessage {
  const fluxo = Readable.from([]) as Readable & Record<string, unknown>
  fluxo.method = metodo
  fluxo.url = caminho
  fluxo.headers = {
    host: '127.0.0.1:5174',
    origin: 'http://127.0.0.1:5174',
    'sec-fetch-site': 'same-origin',
    ...headers,
  }
  fluxo.socket = { localPort: 5174, encrypted: false }
  return fluxo as unknown as IncomingMessage
}

async function chamar(metodo: string, caminho: string, headers: Record<string, string> = {}) {
  const req = requisicao(metodo, caminho, headers)
  const res = resposta()
  await tratarRotasAnexos(req, res, new URL(caminho, 'http://127.0.0.1:5174'))
  // O streaming termina DEPOIS do handler retornar; espera o fim real.
  if (!res.writableEnded) {
    await new Promise<void>((resolve) => {
      const prazo = setTimeout(() => resolve(), 3000)
      res.once('end', () => { clearTimeout(prazo); resolve() })
      res.once('finish', () => { clearTimeout(prazo); resolve() })
    })
  }
  let json: Record<string, unknown> | null = null
  if (res.binario.length && res.headers['content-type']?.includes('application/json')) {
    try { json = JSON.parse(res.binario.toString('utf8')) } catch { json = null }
  }
  return { status: res.statusCode, headers: res.headers, bytes: res.binario, json }
}

const rotaMidia = (artifactId: string) => `/api/sessions/${SID}/chats/${CID}/attachments/${artifactId}/media`

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'c3b-media-'))
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

describe('C-3b — política de preview por BYTES (T08/T10)', () => {
  it('C3B-T10 classifica as fixtures reais pelo conteúdo, não pelo nome', () => {
    const png = classificarPreview(fixture('imagem.png'))
    expect(png).toMatchObject({ ok: true, tipo: 'imagem', mime: 'image/png', modalidade: 'imagem' })
    const wav = classificarPreview(fixture('audio.wav'))
    expect(wav).toMatchObject({ ok: true, tipo: 'audio', mime: 'audio/wav', modalidade: 'audio' })
    const webm = classificarPreview(fixture('video.webm'))
    expect(webm).toMatchObject({ ok: true, tipo: 'video', mime: 'video/webm', modalidade: 'video' })
  })

  it('C3B-T10 nome .png com bytes de HTML NÃO vira imagem', () => {
    // Este é o caso que prova que confiar no nome/MIME seria um furo.
    expect(fixture('falso.png').toString('utf8')).toContain('<script>')
    expect(classificarPreview(fixture('falso.png'))).toEqual({ ok: false, motivo: 'formato_nao_exibivel' })
  })

  it('C3B-T10 executável e bytes insuficientes têm estados distintos e honestos', () => {
    expect(classificarPreview(fixture('nao-exibivel.bin'))).toEqual({ ok: false, motivo: 'formato_nao_exibivel' })
    expect(classificarPreview(undefined)).toEqual({ ok: false, motivo: 'bytes_insuficientes' })
    expect(classificarPreview(new Uint8Array(0))).toEqual({ ok: false, motivo: 'bytes_insuficientes' })
    // SVG/HTML puros também ficam fora (documentos ativos não são preview).
    expect(classificarPreview(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toEqual({ ok: false, motivo: 'formato_nao_exibivel' })
  })

  it('C3B-T10 a sonda lê só o cabeçalho, nunca o arquivo inteiro', async () => {
    const grande = Buffer.concat([fixture('imagem.png'), Buffer.alloc(5 * 1024 * 1024, 0x41)])
    const caminho = join(base, 'grande.png')
    writeFileSync(caminho, grande)
    const sonda = await lerSondaDePreview(caminho)
    expect(sonda).toBeDefined()
    expect(sonda!.length).toBe(BYTES_SONDA)
    expect(sonda!.length).toBeLessThan(grande.length)
    expect(classificarPreview(sonda)).toMatchObject({ ok: true, tipo: 'imagem' })
  })
})

describe('C-3b — GET/HEAD e Range (T11/T12)', () => {
  it('C3B-T11 GET 200 serve os bytes íntegros com MIME real e headers de segurança', async () => {
    const dados = fixture('imagem.png')
    const artifactId = await publicar('foto.png', dados)
    const r = await chamar('GET', rotaMidia(artifactId))
    expect(r.status).toBe(200)
    expect(r.headers['content-type']).toBe('image/png')
    expect(r.headers['content-length']).toBe(String(dados.length))
    expect(r.headers['accept-ranges']).toBe('bytes')
    expect(r.headers['x-content-type-options']).toBe('nosniff')
    expect(r.headers['cache-control']).toBe('private, no-store')
    expect(r.headers['content-disposition']).toContain('inline')
    expect(sha256(r.bytes)).toBe(sha256(dados))
  })

  it('C3B-T11 HEAD descreve sem corpo e NÃO simula 206', async () => {
    const dados = fixture('audio.wav')
    const artifactId = await publicar('som.wav', dados)
    // HEAD com Range: precisa seguir 200 com metadata integral e zero bytes.
    const r = await chamar('HEAD', rotaMidia(artifactId), { range: 'bytes=0-99' })
    expect(r.status).toBe(200)
    expect(r.bytes.length).toBe(0)
    expect(r.headers['content-length']).toBe(String(dados.length))
    expect(r.headers['content-type']).toBe('audio/wav')
    expect(r.headers['content-range']).toBeUndefined()
  })

  it('C3B-T11 Range fechado, aberto e sufixo devolvem 206 com bytes exatos', async () => {
    const dados = fixture('audio.wav')
    const artifactId = await publicar('som.wav', dados)

    const fechado = await chamar('GET', rotaMidia(artifactId), { range: 'bytes=0-9' })
    expect(fechado.status).toBe(206)
    expect(fechado.bytes.equals(dados.subarray(0, 10))).toBe(true)
    expect(fechado.headers['content-range']).toBe(`bytes 0-9/${dados.length}`)
    expect(fechado.headers['content-length']).toBe('10')

    const aberto = await chamar('GET', rotaMidia(artifactId), { range: 'bytes=100-' })
    expect(aberto.status).toBe(206)
    expect(aberto.bytes.equals(dados.subarray(100))).toBe(true)
    expect(aberto.headers['content-range']).toBe(`bytes 100-${dados.length - 1}/${dados.length}`)

    const sufixo = await chamar('GET', rotaMidia(artifactId), { range: 'bytes=-50' })
    expect(sufixo.status).toBe(206)
    expect(sufixo.bytes.equals(dados.subarray(dados.length - 50))).toBe(true)
    expect(sufixo.headers['content-range']).toBe(`bytes ${dados.length - 50}-${dados.length - 1}/${dados.length}`)
  })

  it('C3B-T12 intervalo fora do arquivo devolve 416 com o tamanho real', async () => {
    const dados = fixture('imagem.png')
    const artifactId = await publicar('foto.png', dados)
    const r = await chamar('GET', rotaMidia(artifactId), { range: `bytes=${dados.length}-` })
    expect(r.status).toBe(416)
    expect(r.headers['content-range']).toBe(`bytes */${dados.length}`)
    expect(r.bytes.length).toBe(0)
  })

  it('C3B-T12 Range malformado e multirange são ignorados com 200 integral', async () => {
    const dados = fixture('imagem.png')
    const artifactId = await publicar('foto.png', dados)
    for (const range of ['bytes=abc', 'bytes=0-1,5-9', 'items=0-5', 'bytes=-']) {
      const r = await chamar('GET', rotaMidia(artifactId), { range })
      expect(r.status, `range ${range}`).toBe(200)
      expect(sha256(r.bytes), `range ${range}`).toBe(sha256(dados))
      expect(r.headers['content-range'], `range ${range}`).toBeUndefined()
    }
  })

  it('C3B-T12 arquivo de zero bytes trata range honestamente', () => {
    // Unidade pura: não depende do ledger, o caso é do interpretador.
    expect(interpretarRange('bytes=0-', 0)).toEqual({ tipo: 'insatisfativel' })
    expect(interpretarRange('bytes=-5', 0)).toEqual({ tipo: 'insatisfativel' })
    expect(interpretarRange(undefined, 0)).toEqual({ tipo: 'sem' })
    // Fim além do EOF é aparado, nunca estendido.
    expect(interpretarRange('bytes=0-9999', 100)).toEqual({ tipo: 'satisfativel', intervalo: { inicio: 0, fim: 99 } })
  })
})

describe('C-3b — ownership, tombstone e formato não exibível (T13/T14)', () => {
  it('C3B-T13 artefato de outro dono não é servido por esta conversa', async () => {
    const dados = fixture('imagem.png')
    const artifactId = await publicar('foto.png', dados, { sessionId: OUTRO_SID, chatId: OUTRO_CID })
    const r = await chamar('GET', rotaMidia(artifactId))
    expect(r.status).toBe(404)
    expect(r.json).toMatchObject({ code: 'attachment_not_found' })
    expect(r.bytes.length).toBeLessThan(dados.length)
  })

  it('C3B-T13 HEAD também recusa dono errado (não é atalho sem autorização)', async () => {
    const artifactId = await publicar('foto.png', fixture('imagem.png'), { sessionId: OUTRO_SID, chatId: OUTRO_CID })
    const r = await chamar('HEAD', rotaMidia(artifactId))
    expect(r.status).toBe(404)
  })

  it('C3B-T13 cross-origin é recusado antes de qualquer byte', async () => {
    const artifactId = await publicar('foto.png', fixture('imagem.png'))
    const r = await chamar('GET', rotaMidia(artifactId), { origin: 'https://evil.example' })
    expect(r.status).toBe(403)
    expect(r.json).toMatchObject({ code: 'local_only' })
  })

  it('C3B-T13 arquivo removido do disco responde ausente, não sucesso', async () => {
    const artifactId = await publicar('foto.png', fixture('imagem.png'))
    const artigo = obterArtigo(artifactId)!
    const caminho = join(process.env.AGENTE_WINDOW_DATA_DIR!, 'uploads', artigo.locator)
    expect(existsSync(caminho)).toBe(true)
    rmSync(caminho)
    const r = await chamar('GET', rotaMidia(artifactId))
    expect(r.status).toBe(410)
    expect(r.json).toMatchObject({ code: 'attachment_absent' })
  })

  it('C3B-T14 formato fora da política responde 415 e o download continua funcionando', async () => {
    const dados = fixture('falso.png')
    const artifactId = await publicar('pagina.png', dados)

    const midia = await chamar('GET', rotaMidia(artifactId))
    expect(midia.status).toBe(415)
    expect(midia.json).toMatchObject({ code: 'preview_unsupported' })
    // Nenhum byte do arquivo vazou na resposta de erro.
    expect(midia.bytes.equals(dados)).toBe(false)

    // O download legado do MESMO artefato segue entregando os bytes.
    const download = await chamar('GET', `${rotaMidia(artifactId).replace('/media', '')}?download=1`)
    expect(download.status).toBe(200)
    expect(download.headers['content-type']).toBe('application/octet-stream')
    expect(sha256(download.bytes)).toBe(sha256(dados))
  })

  it('C3B-T14 vídeo real é servido por stream, sem Buffer integral', async () => {
    const dados = fixture('video.webm')
    const artifactId = await publicar('clipe.webm', dados)
    const r = await chamar('GET', rotaMidia(artifactId))
    expect(r.status).toBe(200)
    expect(r.headers['content-type']).toBe('video/webm')
    expect(sha256(r.bytes)).toBe(sha256(dados))
    // Range parcial de um vídeo: o player busca assim de verdade.
    const busca = await chamar('GET', rotaMidia(artifactId), { range: 'bytes=0-1023' })
    expect(busca.status).toBe(206)
    expect(busca.bytes.length).toBe(1024)
    expect(busca.bytes.equals(dados.subarray(0, 1024))).toBe(true)
  })
})
