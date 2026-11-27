import { spawn } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, rename, rm, stat } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { get } from 'node:https'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { validateLocalRequest } from '../../server/local-boundary.mjs'
import { getAppDir } from './session-persistence/paths'
import { LIMITE_DITADO, TAXA_DITADO } from '../domain/ditado'

const ARQUIVO = 'parakeet-ultra-Q8_0.gguf'
const REVISAO = '39eeb55181f0d354fd934f06e92fd8d5037fed8e'
const TAMANHO = 740_363_168
const SHA256 = '007a59761e9258779f189df396b50d12b83bb5b79e66df4b955c230d2f2a0a59'
const URL_MODELO = `https://huggingface.co/handy-computer/parakeet-ultra-gguf/resolve/${REVISAO}/${ARQUIVO}`

async function modeloIntegro(arquivo: string): Promise<boolean> {
  try {
    if ((await stat(arquivo)).size !== TAMANHO) return false
    const hash = createHash('sha256')
    for await (const trecho of createReadStream(arquivo)) hash.update(trecho)
    return hash.digest('hex') === SHA256
  } catch {
    return false
  }
}

async function abrirDownload(url: URL, signal: AbortSignal, redirecionamentos = 0): Promise<IncomingMessage> {
  if (url.protocol !== 'https:' || redirecionamentos > 8) throw new Error('Redirecionamento inválido.')
  const resposta = await new Promise<IncomingMessage>((resolve, reject) => {
    const pedido = get(url, { signal, timeout: 60_000, headers: { 'User-Agent': 'agente-window-parakeet/1' } }, resolve)
    pedido.on('error', reject)
    pedido.on('timeout', () => pedido.destroy(new Error('O download parou de responder.')))
  })
  if (resposta.statusCode === 200) return resposta
  resposta.resume()
  if (resposta.statusCode && [301, 302, 303, 307, 308].includes(resposta.statusCode) && resposta.headers.location) {
    return abrirDownload(new URL(resposta.headers.location, url), signal, redirecionamentos + 1)
  }
  throw new Error('Download indisponível.')
}

async function prepararModelo(): Promise<string> {
  const pasta = path.join(getAppDir(), 'modelos', REVISAO)
  const destino = path.join(pasta, ARQUIVO)
  if (await modeloIntegro(destino)) return destino
  await mkdir(pasta, { recursive: true })
  const temporario = path.join(pasta, `${ARQUIVO}.${randomUUID()}.part`)
  try {
    const resposta = await abrirDownload(new URL(URL_MODELO), AbortSignal.timeout(20 * 60_000))
    let tamanho = 0
    const hash = createHash('sha256')
    await pipeline(resposta, async function* (trechos: AsyncIterable<Buffer>) {
      for await (const trecho of trechos) {
        tamanho += trecho.byteLength
        if (tamanho > TAMANHO) throw new Error('Modelo maior que o esperado.')
        hash.update(trecho)
        yield trecho
      }
    }, createWriteStream(temporario, { flags: 'wx', highWaterMark: 1024 * 1024 }))
    if (tamanho !== TAMANHO || hash.digest('hex') !== SHA256) throw new Error('Modelo divergente.')
    await rename(temporario, destino).catch(async (erro: unknown) => {
      if (!await modeloIntegro(destino)) throw erro
    })
    return destino
  } finally {
    await rm(temporario, { force: true })
  }
}

// O motor nativo roda isolado do servidor. Uma falha de DLL ou de inferência
// encerra só o processo de ditado. O PCM passa pela entrada padrão, em memória.
const PROCESSO = `
import { readFileSync } from 'node:fs';
const { TranscribeModel } = await import(process.argv[2]);
const dados = readFileSync(0);
const pcm = new Float32Array(dados.length / 2);
for (let i = 0; i < pcm.length; i++) pcm[i] = dados.readInt16LE(i * 2) / 32768;
const modelo = await TranscribeModel.load(process.argv[1], { backend: 'cpu' });
try {
  const resultado = await modelo.transcribe(pcm, { language: 'pt' });
  console.log(JSON.stringify(resultado.text.trim()));
} finally {
  modelo.dispose();
}
`

let modelo: Promise<string> | undefined
let ativo = false

export function pcmDoDitado(wav: Buffer): Buffer | undefined {
  if (wav.length <= 44 || wav.length > LIMITE_DITADO || wav.length % 2 !== 0 ||
    wav.toString('ascii', 0, 4) !== 'RIFF' || wav.readUInt32LE(4) !== wav.length - 8 ||
    wav.toString('ascii', 8, 16) !== 'WAVEfmt ' || wav.readUInt32LE(16) !== 16 ||
    wav.readUInt16LE(20) !== 1 || wav.readUInt16LE(22) !== 1 ||
    wav.readUInt32LE(24) !== TAXA_DITADO || wav.readUInt32LE(28) !== TAXA_DITADO * 2 ||
    wav.readUInt16LE(32) !== 2 || wav.readUInt16LE(34) !== 16 ||
    wav.toString('ascii', 36, 40) !== 'data' || wav.readUInt32LE(40) !== wav.length - 44) return
  return wav.subarray(44)
}

export async function transcreverDitado(pcm: Buffer, signal: AbortSignal): Promise<string> {
  if (ativo) throw new Error('Já existe um ditado em andamento.')
  ativo = true
  try {
    modelo ??= prepararModelo().catch((erro: unknown) => {
      modelo = undefined
      throw erro
    })
    const arquivo = await modelo
    signal.throwIfAborted()
    const transcricao = await new Promise<string>((resolve, reject) => {
      const processo = spawn(process.execPath, ['--input-type=module', '-e', PROCESSO, arquivo, import.meta.resolve('transcribe-cpp')], {
        windowsHide: true, signal, timeout: 90_000, stdio: ['pipe', 'pipe', 'ignore'],
      })
      const partes: Buffer[] = []
      let total = 0
      processo.stdout.on('data', (parte: Buffer) => {
        total += parte.byteLength
        if (total > 64 * 1024) processo.kill()
        else partes.push(parte)
      })
      processo.on('error', reject)
      processo.stdin.on('error', () => undefined)
      processo.on('close', codigo => {
        try {
          if (codigo !== 0 || total > 64 * 1024) throw new Error('Falha no motor de ditado.')
          const texto: unknown = JSON.parse(Buffer.concat(partes).toString('utf8'))
          if (typeof texto !== 'string' || texto.length > 16_000) throw new Error('Resposta inválida.')
          resolve(texto)
        } catch (erro) { reject(erro) }
      })
      processo.stdin.end(pcm)
    })
    return transcricao
  } finally {
    ativo = false
  }
}

export async function tratarDitado(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const responder = (status: number, corpo: { texto: string } | { message: string }) => {
    if (response.destroyed) return
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
    response.end(JSON.stringify(corpo))
  }
  if (!validateLocalRequest(request).ok) {
    responder(403, { message: 'Acesso local de mesma origem obrigatório.' })
    return
  }
  if (request.headers['content-type'] !== 'application/octet-stream') {
    responder(415, { message: 'Formato de ditado inválido.' })
    return
  }
  const comprimento = Number(request.headers['content-length'])
  if (!Number.isSafeInteger(comprimento) || comprimento <= 44 || comprimento > LIMITE_DITADO) {
    responder(413, { message: 'Tamanho de gravação inválido.' })
    return
  }
  const controle = new AbortController()
  const cancelar = () => controle.abort()
  response.once('close', cancelar)
  try {
    const partes: Buffer[] = []
    for await (const parte of request) partes.push(parte as Buffer)
    const pcm = pcmDoDitado(Buffer.concat(partes))
    if (!pcm) {
      responder(400, { message: 'O ditado precisa ser WAV mono de até 30 segundos.' })
      return
    }
    const texto = await transcreverDitado(pcm, controle.signal)
    if (texto) responder(200, { texto })
    else responder(422, { message: 'O Parakeet Ultra não detectou fala nesta gravação.' })
  } catch {
    responder(503, { message: 'Parakeet Ultra indisponível. Verifique a conexão para o primeiro download e tente novamente.' })
  } finally {
    response.off('close', cancelar)
  }
}
