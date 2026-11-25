// MM-I: inspeção de bytes no servidor, sem ler nomes/MIME do cliente e sem IO.
// Limites locais conservadores PROVISÓRIOS; o chamador também deve aplicar
// os tetos comprovados do alvo e do corpo, quando conhecidos. Isto sozinho
// não autoriza envio nem substitui a verificação de dono e integridade.
import { crc32, inflateSync } from 'node:zlib'
import jpeg from 'jpeg-js'
import { PNG } from 'pngjs'

export const LIMITES_IMAGEM_VISAO = Object.freeze({
  bytes: 4 * 1024 * 1024,
  largura: 1024,
  altura: 1024,
  pixels: 1024 * 1024,
  chunksPNG: 4096,
  // PNG com 16 bits e quatro canais: 8 bytes por pixel + filtros por linha;
  // a margem também cobre o overhead dos sete passos do entrelaçamento.
  descomprimido: 10 * 1024 * 1024,
})

export interface ImagemInspecionada {
  mime: 'image/png' | 'image/jpeg'
  largura: number
  altura: number
}

function recusar(): never { throw new Error('Imagem inválida ou acima do limite local. O arquivo foi preservado e não foi enviado.') }
const LIMITES_ORIGINAL = Object.freeze({ largura: 8192, altura: 8192, pixels: 12 * 1024 * 1024, descomprimido: 100 * 1024 * 1024 })
function verificarDimensoes(largura: number, altura: number, limites: { largura: number; altura: number; pixels: number } = LIMITES_IMAGEM_VISAO): void {
  if (!Number.isSafeInteger(largura) || !Number.isSafeInteger(altura) || largura <= 0 || altura <= 0 ||
      largura > limites.largura || altura > limites.altura || largura * altura > limites.pixels) recusar()
}

// Número exato de bytes filtrados, inclusive cada linha dos sete passos Adam7.
// Limitar pelo esperado protege também imagens pequenas com fluxo inflado grande.
function tamanhoPNG(largura: number, altura: number, profundidade: number, cor: number, interlace: number, maxDescomprimido: number): number {
  const canais: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }
  const profundidades: Record<number, readonly number[]> = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] }
  if (!profundidades[cor]?.includes(profundidade) || (interlace !== 0 && interlace !== 1)) return recusar()
  const bits = profundidade * canais[cor]
  const dimensao = (n: number, inicio: number, passo: number) => Math.max(0, Math.ceil((n - inicio) / passo))
  const passes = interlace === 0 ? [[0, 0, 1, 1]] : [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]]
  let total = 0
  for (const [x, y, dx, dy] of passes) {
    const w = dimensao(largura, x, dx), h = dimensao(altura, y, dy)
    if (w && h) total += (Math.ceil(w * bits / 8) + 1) * h
  }
  if (total <= 0 || total > maxDescomprimido) return recusar()
  return total
}

function inspecionarPNG(bytes: Buffer, original = false): ImagemInspecionada {
  if (bytes.length < 33 || bytes.readUInt32BE(8) !== 13 || bytes.toString('ascii', 12, 16) !== 'IHDR') return recusar()
  const largura = bytes.readUInt32BE(16), altura = bytes.readUInt32BE(20)
  const limites = original ? LIMITES_ORIGINAL : LIMITES_IMAGEM_VISAO
  verificarDimensoes(largura, altura, limites)
  const tamanhoEsperado = tamanhoPNG(largura, altura, bytes[24], bytes[25], bytes[28], limites.descomprimido)
  // Examina chunks SEM confiar no comprimento declarado; exige fim exato e
  // recusa APNG (o recorte inicial não prevê múltiplos quadros).
  const idat: Buffer[] = []
  let pos = 8, fim = false, primeiro = true, terminouIdat = false, numeroChunks = 0
  while (pos + 12 <= bytes.length) {
    if (++numeroChunks > LIMITES_IMAGEM_VISAO.chunksPNG) return recusar()
    const tamanho = bytes.readUInt32BE(pos)
    const proximo = pos + 12 + tamanho
    if (proximo > bytes.length) return recusar()
    const tipo = bytes.toString('ascii', pos + 4, pos + 8)
    if ((primeiro && tipo !== 'IHDR') || (!primeiro && tipo === 'IHDR') || tipo === 'acTL') return recusar()
    // pngjs ignora CRC de chunks auxiliares desconhecidos; verificar todos.
    if (crc32(bytes.subarray(pos + 4, pos + 8 + tamanho)) !== bytes.readUInt32BE(pos + 8 + tamanho)) return recusar()
    if (tipo === 'IDAT') {
      if (terminouIdat) return recusar()
      idat.push(bytes.subarray(pos + 8, pos + 8 + tamanho))
    } else if (idat.length) terminouIdat = true
    if (tipo === 'IEND') { if (tamanho !== 0 || proximo !== bytes.length) return recusar(); fim = true; break }
    primeiro = false
    pos = proximo
  }
  if (!fim || idat.length === 0) return recusar()
  // pngjs usa inflate sem teto para PNG entrelaçado. Antes da decodificação,
  // limitar a MESMA sequência IDAT ao tamanho exato e recusar bytes ignorados.
  const comprimido = Buffer.concat(idat)
  // @types/node ainda tipa a variante síncrona com info como Buffer simples.
  const inflado = inflateSync(comprimido, { maxOutputLength: tamanhoEsperado, info: true }) as unknown as { buffer: Buffer; engine: { bytesWritten: number } }
  if (inflado.buffer.length !== tamanhoEsperado || inflado.engine.bytesWritten !== comprimido.length) return recusar()
  if (!original) {
    const decodificada = PNG.sync.read(bytes, { checkCRC: true })
    if (decodificada.width !== largura || decodificada.height !== altura) return recusar()
  }
  return { mime: 'image/png', largura, altura }
}

// Percorre segmentos e varreduras JPEG para garantir que o PRIMEIRO EOI real
// encerra o arquivo. Não confunde FF D9 dentro de um bloco APP com o final;
// na imagem comprimida respeita byte stuffing e marcadores de reinício.
export function verificarFimJPEG(bytes: Buffer): void {
  let pos = 2
  while (pos < bytes.length) {
    if (bytes[pos++] !== 0xff) return recusar()
    while (pos < bytes.length && bytes[pos] === 0xff) pos++
    if (pos >= bytes.length) return recusar()
    const marcador = bytes[pos++]
    if (marcador === 0xd9) { if (pos !== bytes.length) recusar(); return }
    if (marcador === 0xd8 || marcador === 0x00) return recusar()
    if (marcador === 0x01 || (marcador >= 0xd0 && marcador <= 0xd7)) continue
    if (pos + 2 > bytes.length) return recusar()
    const tamanho = bytes.readUInt16BE(pos)
    if (tamanho < 2 || pos + tamanho > bytes.length) return recusar()
    pos += tamanho
    if (marcador !== 0xda) continue
    let encontrouMarcador = false
    while (pos < bytes.length) {
      if (bytes[pos++] !== 0xff) continue
      const inicio = pos - 1
      while (pos < bytes.length && bytes[pos] === 0xff) pos++
      if (pos >= bytes.length) return recusar()
      const proximo = bytes[pos]
      if (proximo === 0x00 || (proximo >= 0xd0 && proximo <= 0xd7)) { pos++; continue }
      pos = inicio
      encontrouMarcador = true
      break
    }
    if (!encontrouMarcador) return recusar()
  }
  return recusar()
}

/** Valida estrutura do original maior; a decodificação completa pertence ao preparador. */
export function validarEstruturaOriginal(bytes: Buffer, formato: string, largura: number, altura: number): void {
  verificarDimensoes(largura, altura, LIMITES_ORIGINAL)
  if (formato === 'png') {
    if (!bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return recusar()
    const imagem = inspecionarPNG(bytes, true)
    if (imagem.largura !== largura || imagem.altura !== altura) return recusar()
  } else if (formato === 'jpeg') {
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return recusar()
    verificarFimJPEG(bytes)
  } else if (formato === 'webp') {
    if (bytes.length < 20 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP' || bytes.readUInt32LE(4) + 8 !== bytes.length) return recusar()
  } else return recusar()
}

export function inspecionarImagemVisao(bytes: Buffer): ImagemInspecionada {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > LIMITES_IMAGEM_VISAO.bytes) return recusar()
  try {
    if (bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return inspecionarPNG(bytes)
    if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9) {
      verificarFimJPEG(bytes)
      // Decodificador com limites explícitos de memória e resolução; o erro de
      // biblioteca não é repassado, pois pode conter bytes do arquivo.
      const imagem = jpeg.decode(bytes, { useTArray: true, tolerantDecoding: false, maxResolutionInMP: LIMITES_IMAGEM_VISAO.pixels / 1_000_000, maxMemoryUsageInMB: 64 })
      verificarDimensoes(imagem.width, imagem.height)
      return { mime: 'image/jpeg', largura: imagem.width, altura: imagem.height }
    }
  } catch { return recusar() }
  return recusar()
}
