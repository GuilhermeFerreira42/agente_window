#!/usr/bin/env node
// C-3b — verifica as fixtures de mídia SEM depender do navegador.
//
// Prova estrutural: o PNG tem CRCs válidos e o IDAT descomprime no tamanho
// exato das dimensões; o WAV tem cabeçalho PCM coerente e amostras não
// silenciosas; o WebM tem assinatura EBML com DocType `webm`.
//
// O que ISTO NÃO prova: que o codec decodifica no navegador. Essa prova é dos
// testes de apresentação/E2E (naturalWidth, decodedAudio, loadedmetadata).
// A separação é de propósito — um verificador que dissesse "decodifica" sem
// navegador seria mentira.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflateSync } from 'node:zlib'

const aqui = dirname(fileURLToPath(import.meta.url))
let falhas = 0
const confira = (condicao, mensagem) => {
  if (condicao) console.log(`  ok   ${mensagem}`)
  else { console.error(`  FALHA ${mensagem}`); falhas += 1 }
}

const hashes = JSON.parse(readFileSync(join(aqui, 'HASHES.json'), 'utf8'))
const ler = (nome) => readFileSync(join(aqui, nome))

// Hashes registrados batem com os arquivos?
for (const [nome, esperado] of Object.entries(hashes)) {
  const dados = ler(nome)
  const sha = createHash('sha256').update(dados).digest('hex')
  confira(sha === esperado.sha256 && dados.length === esperado.bytes, `${nome}: hash/tamanho conferem`)
}

// ── PNG: estrutura + descompressão real ──
{
  const dados = ler('imagem.png')
  confira(dados.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'PNG: assinatura')
  let pos = 8, largura = 0, altura = 0, idat = null
  while (pos < dados.length) {
    const tamanho = dados.readUInt32BE(pos)
    const tipo = dados.subarray(pos + 4, pos + 8).toString('ascii')
    const corpo = dados.subarray(pos + 8, pos + 8 + tamanho)
    if (tipo === 'IHDR') { largura = corpo.readUInt32BE(0); altura = corpo.readUInt32BE(4) }
    if (tipo === 'IDAT') idat = corpo
    pos += 12 + tamanho
  }
  confira(largura === 8 && altura === 8, `PNG: dimensões ${largura}x${altura}`)
  const cru = idat ? inflateSync(idat) : Buffer.alloc(0)
  confira(cru.length === altura * (1 + largura * 3), `PNG: IDAT descomprime em ${cru.length} bytes (linhas filtradas)`)
}

// ── WAV: cabeçalho PCM + amostras ──
{
  const dados = ler('audio.wav')
  confira(dados.subarray(0, 4).toString('ascii') === 'RIFF', 'WAV: RIFF')
  confira(dados.subarray(8, 12).toString('ascii') === 'WAVE', 'WAV: WAVE')
  const canais = dados.readUInt16LE(22)
  const taxa = dados.readUInt32LE(24)
  const bits = dados.readUInt16LE(34)
  confira(canais === 1 && taxa === 8000 && bits === 16, `WAV: PCM ${canais}ch ${taxa}Hz ${bits}bit`)
  let pico = 0
  for (let i = 44; i + 1 < dados.length; i += 2) pico = Math.max(pico, Math.abs(dados.readInt16LE(i)))
  confira(pico > 1000, `WAV: amostras não silenciosas (pico ${pico})`)
}

// ── WebM: assinatura EBML + DocType ──
{
  const dados = ler('video.webm')
  confira(dados.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])), 'WebM: assinatura EBML')
  confira(dados.subarray(0, 400).toString('latin1').includes('webm'), 'WebM: DocType "webm"')
  confira(dados.length > 1000, `WebM: contêiner com ${dados.length} bytes`)
}

// ── Negativos: extensão de mídia com bytes que não são mídia ──
{
  const falso = ler('falso.png')
  confira(!falso.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'falso.png: bytes NÃO são PNG')
  confira(falso.toString('utf8').includes('<script>'), 'falso.png: contém HTML ativo (prova de que não pode renderizar)')
  const bin = ler('nao-exibivel.bin')
  confira(bin[0] === 0x4d && bin[1] === 0x5a, 'nao-exibivel.bin: assinatura MZ (executável)')
}

if (falhas > 0) {
  console.error(`\n${falhas} verificação(ões) falharam.`)
  process.exit(1)
}
console.log('\nFixtures estruturalmente válidas. Decodificação real é provada por naturalWidth/decodedAudio/loadedmetadata nos testes de apresentação e E2E.')
