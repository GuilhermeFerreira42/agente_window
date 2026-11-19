#!/usr/bin/env node
// C-3b — gerador DETERMINÍSTICO das fixtures de mídia.
//
// Por que existe: os testes precisam provar decodificação REAL de imagem,
// áudio e vídeo. Arquivo renomeado não prova nada, e ffmpeg não existe neste
// ambiente. Cada fixture é produzida por um caminho verificável:
//
//   • PNG e WAV — bytes montados à mão (CRC/IDAT do PNG com deflate, WAV PCM
//     com senoide). Verificados por `verificar-fixtures.mjs`.
//   • WebM    — gravado pelo PRÓPRIO Chromium via MediaRecorder VP8 sobre um
//     canvas animado. Depois de gravar, o script REABRE o vídeo e exige que
//     `loadedmetadata` traga videoWidth>0 — ou seja, o fixture só é aceito se
//     o navegador que vai usá-lo conseguir decodificá-lo. Um codificador VP8
//     escrito à mão foi tentado antes e produziu DEMUXER_ERROR (ver entrega).
//
// Rodar: node gerar-fixtures.mjs [--chromium /caminho/chromium]
// Em sistemas sem Chromium, as fixtures já commitadas continuam válidas e
// `verificar-fixtures.mjs` confere os hashes.
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const aqui = dirname(fileURLToPath(import.meta.url))
const argChromium = process.argv.indexOf('--chromium')

// ───────────────────────────── PNG (RGB 8-bit) ─────────────────────────────
function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) {
    c ^= byte
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return (c ^ 0xffffffff) >>> 0
}
function chunk(tipo, dados) {
  const tamanho = Buffer.alloc(4); tamanho.writeUInt32BE(dados.length)
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dados])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(corpo))
  return Buffer.concat([tamanho, corpo, crc])
}
function png(largura, altura) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(largura, 0); ihdr.writeUInt32BE(altura, 4)
  ihdr[8] = 8; ihdr[9] = 2 // 8 bits, RGB
  const linhas = []
  for (let y = 0; y < altura; y += 1) {
    const linha = Buffer.alloc(1 + largura * 3) // filtro 0
    for (let x = 0; x < largura; x += 1) {
      linha[1 + x * 3] = (x * 8) % 256
      linha[2 + x * 3] = (y * 8) % 256
      linha[3 + x * 3] = 128
    }
    linhas.push(linha)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(linhas), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ─────────────────────────────── WAV PCM 16-bit ────────────────────────────
function wav(segundos, taxa = 8000, frequencia = 440) {
  const amostras = Math.floor(segundos * taxa)
  const dados = Buffer.alloc(amostras * 2)
  for (let i = 0; i < amostras; i += 1) {
    dados.writeInt16LE(Math.round(Math.sin((2 * Math.PI * frequencia * i) / taxa) * 8000), i * 2)
  }
  const cabecalho = Buffer.alloc(44)
  cabecalho.write('RIFF', 0, 'ascii'); cabecalho.writeUInt32LE(36 + dados.length, 4)
  cabecalho.write('WAVE', 8, 'ascii'); cabecalho.write('fmt ', 12, 'ascii')
  cabecalho.writeUInt32LE(16, 16); cabecalho.writeUInt16LE(1, 20); cabecalho.writeUInt16LE(1, 22)
  cabecalho.writeUInt32LE(taxa, 24); cabecalho.writeUInt32LE(taxa * 2, 28)
  cabecalho.writeUInt16LE(2, 32); cabecalho.writeUInt16LE(16, 34)
  cabecalho.write('data', 36, 'ascii'); cabecalho.writeUInt32LE(dados.length, 40)
  return Buffer.concat([cabecalho, dados])
}

// ─────────────────────── WebM VP8 real (via Chromium) ──────────────────────
async function webmComChromium(executavel) {
  const { chromium } = await import('playwright-core')
  const perfil = mkdtempSync(join(tmpdir(), 'c3b-fixture-'))
  const navegador = await chromium.launch({ executablePath: executavel, args: ['--no-sandbox', '--disable-gpu'] })
  try {
    const pagina = await navegador.newPage()
    await pagina.goto('about:blank')
    const base64 = await pagina.evaluate(async () => {
      const canvas = document.createElement('canvas')
      canvas.width = 64; canvas.height = 64
      const ctx = canvas.getContext('2d')
      const fluxo = canvas.captureStream(10)
      const gravador = new MediaRecorder(fluxo, { mimeType: 'video/webm;codecs=vp8' })
      const pedacos = []
      gravador.ondataavailable = (e) => { if (e.data.size) pedacos.push(e.data) }
      const parado = new Promise((res) => { gravador.onstop = res })
      gravador.start()
      for (let i = 0; i < 10; i += 1) {
        ctx.fillStyle = `hsl(${i * 30}, 80%, 50%)`
        ctx.fillRect(0, 0, 64, 64)
        ctx.fillStyle = '#fff'
        ctx.fillRect(i * 6, 20, 8, 24)
        await new Promise((r) => setTimeout(r, 100))
      }
      gravador.stop()
      await parado
      const blob = new Blob(pedacos, { type: 'video/webm' })
      const bytes = new Uint8Array(await blob.arrayBuffer())

      // AUTO-VERIFICAÇÃO: o fixture só vale se este navegador decodificar.
      const url = URL.createObjectURL(blob)
      const meta = await new Promise((res) => {
        const el = document.createElement('video')
        const limite = setTimeout(() => res({ ok: false, motivo: 'timeout' }), 5000)
        el.onloadedmetadata = () => { clearTimeout(limite); res({ ok: true, w: el.videoWidth, h: el.videoHeight }) }
        el.onerror = () => { clearTimeout(limite); res({ ok: false, motivo: `code ${el.error?.code}` }) }
        el.preload = 'metadata'
        el.src = url
      })
      if (!meta.ok || !meta.w) throw new Error(`WebM gerado não decodifica: ${JSON.stringify(meta)}`)
      let binario = ''
      for (const byte of bytes) binario += String.fromCharCode(byte)
      return btoa(binario)
    })
    return Buffer.from(base64, 'base64')
  } finally {
    await navegador.close()
    rmSync(perfil, { recursive: true, force: true })
  }
}

// ─────────────────────────────── saída ─────────────────────────────────────
const executavel = argChromium !== -1 ? process.argv[argChromium + 1] : (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? '/tmp/chromium')

const arquivos = {
  'imagem.png': png(8, 8),
  'audio.wav': wav(0.5),
  // Controles NEGATIVOS: extensão de mídia com bytes que NÃO são mídia.
  // É o caso que prova que a política classifica bytes, não nomes.
  'falso.png': Buffer.from('<html><script>alert(1)</script></html>', 'utf8'),
  'nao-exibivel.bin': Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]),
}

let video
try {
  video = await webmComChromium(executavel)
  console.log(`WebM gerado pelo Chromium em ${executavel}: ${video.length} bytes`)
} catch (erro) {
  // Reaproveita o fixture já commitado, mas DIZ isso — nada de silêncio.
  console.warn(`AVISO: WebM não regerado (${String(erro).split('\n')[0]}); usando o commitado.`)
  video = readFileSync(join(aqui, 'video.webm'))
}
arquivos['video.webm'] = video

const hashes = {}
for (const [nome, dados] of Object.entries(arquivos)) {
  writeFileSync(join(aqui, nome), dados)
  hashes[nome] = { sha256: createHash('sha256').update(dados).digest('hex'), bytes: dados.length }
}
writeFileSync(join(aqui, 'HASHES.json'), `${JSON.stringify(hashes, null, 2)}\n`)
console.log(JSON.stringify(hashes, null, 2))
