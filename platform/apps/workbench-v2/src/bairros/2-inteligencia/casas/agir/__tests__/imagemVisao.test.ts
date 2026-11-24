import { describe, expect, it } from 'vitest'
import { crc32, deflateSync } from 'node:zlib'
import jpeg from 'jpeg-js'
import { PNG } from 'pngjs'
import { inspecionarImagemVisao, LIMITES_IMAGEM_VISAO } from '../server/imagemVisao'

function png(): Buffer {
  const img = new PNG({ width: 2, height: 1 })
  img.data = Buffer.from([255, 0, 0, 255, 0, 0, 255, 255])
  return PNG.sync.write(img)
}
function jpg(): Buffer {
  return jpeg.encode({ width: 2, height: 1, data: Buffer.from([255, 0, 0, 255, 0, 0, 255, 255]) }, 80).data
}
function chunk(tipo: string, dados: Buffer): Buffer {
  const nome = Buffer.from(tipo, 'ascii'), comprimento = Buffer.alloc(4), crc = Buffer.alloc(4)
  comprimento.writeUInt32BE(dados.length)
  crc.writeUInt32BE(crc32(Buffer.concat([nome, dados])))
  return Buffer.concat([comprimento, nome, dados, crc])
}
function pngBruto(dadosComprimidos: Buffer, interlace = 0, extras: Buffer[] = []): Buffer {
  const cabecalho = Buffer.alloc(13)
  cabecalho.writeUInt32BE(1, 0); cabecalho.writeUInt32BE(1, 4)
  cabecalho[8] = 8; cabecalho[9] = 6; cabecalho[12] = interlace
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', cabecalho), ...extras, chunk('IDAT', dadosComprimidos), chunk('IEND', Buffer.alloc(0))])
}

describe('MMI-05/06 — inspeção dos bytes de PNG e JPEG', () => {
  it('detecta a partir dos bytes e decodifica imagens reais sintéticas', () => {
    expect(inspecionarImagemVisao(png())).toEqual({ mime: 'image/png', largura: 2, altura: 1 })
    expect(inspecionarImagemVisao(jpg())).toEqual({ mime: 'image/jpeg', largura: 2, altura: 1 })
  })
  it('rejeita bytes de outro formato, assinatura forjada, arquivo vazio e dados truncados', () => {
    for (const dados of [Buffer.from('%PDF-1.7'), Buffer.alloc(0), png().subarray(0, 32), jpg().subarray(0, 20), Buffer.from('89504e470d0a1a0a', 'hex')]) {
      expect(() => inspecionarImagemVisao(dados)).toThrow()
    }
  })
  it('rejeita conteúdo e CRC PNG alterados, dimensões inválidas e bytes em excesso', () => {
    const corrompido = png(); corrompido[corrompido.length - 1] ^= 1
    expect(() => inspecionarImagemVisao(corrompido)).toThrow()
    const grande = png(); grande.writeUInt32BE(LIMITES_IMAGEM_VISAO.largura + 1, 16)
    expect(() => inspecionarImagemVisao(grande)).toThrow()
    const vazia = png(); vazia.writeUInt32BE(0, 16)
    expect(() => inspecionarImagemVisao(vazia)).toThrow()
    expect(() => inspecionarImagemVisao(Buffer.alloc(LIMITES_IMAGEM_VISAO.bytes + 1))).toThrow()
  })
  it('aceita Adam7 válido mas rejeita bomba, dados excedentes e CRC de chunk auxiliar', () => {
    const pixel = Buffer.from([0, 1, 2, 3, 255])
    expect(inspecionarImagemVisao(pngBruto(deflateSync(pixel), 1))).toEqual({ mime: 'image/png', largura: 1, altura: 1 })
    for (const entrelacado of [0, 1]) {
      expect(() => inspecionarImagemVisao(pngBruto(deflateSync(Buffer.alloc(41 * 1024 * 1024)), entrelacado))).toThrow()
      expect(() => inspecionarImagemVisao(pngBruto(deflateSync(Buffer.concat([pixel, Buffer.from('extra')])), entrelacado))).toThrow()
      expect(() => inspecionarImagemVisao(pngBruto(Buffer.concat([deflateSync(pixel), Buffer.from('extra')]), entrelacado))).toThrow()
    }
    const auxiliar = chunk('tEXt', Buffer.from('chave\0valor')); auxiliar[auxiliar.length - 1] ^= 1
    expect(() => inspecionarImagemVisao(pngBruto(deflateSync(pixel), 0, [auxiliar]))).toThrow()
  })
  it('limita quantidade de chunks mesmo quando o arquivo é pequeno', () => {
    const vazio = chunk('tEXt', Buffer.alloc(0))
    expect(() => inspecionarImagemVisao(pngBruto(deflateSync(Buffer.from([0, 1, 2, 3, 255])), 0, Array(4097).fill(vazio)))).toThrow()
  })
  it('não aceita conteúdo extra depois do fim da imagem', () => {
    expect(() => inspecionarImagemVisao(Buffer.concat([png(), Buffer.from('extra')]))).toThrow()
    expect(() => inspecionarImagemVisao(Buffer.concat([jpg(), Buffer.from('extra')]))).toThrow()
    expect(() => inspecionarImagemVisao(Buffer.concat([jpg(), Buffer.from('extra'), Buffer.from([0xff, 0xd9])]))).toThrow()
  })
})
