import { crc32, deflateRawSync } from 'node:zlib'

export function zipDeTeste(entries: Array<{ nome: string; bytes: Buffer; modo?: number; crc?: number }>): Buffer {
  const locais: Buffer[] = [], centrais: Buffer[] = []
  let offset = 0
  for (const { nome, bytes, modo = 0o100644, crc = crc32(bytes) } of entries) {
    const nomeBytes = Buffer.from(nome), dados = deflateRawSync(bytes)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x800, 6); local.writeUInt16LE(8, 8)
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(dados.length, 18); local.writeUInt32LE(bytes.length, 22); local.writeUInt16LE(nomeBytes.length, 26)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(0x0314, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x800, 8); central.writeUInt16LE(8, 10)
    central.writeUInt32LE(crc, 16); central.writeUInt32LE(dados.length, 20); central.writeUInt32LE(bytes.length, 24); central.writeUInt16LE(nomeBytes.length, 28)
    central.writeUInt32LE((modo * 65536) >>> 0, 38); central.writeUInt32LE(offset, 42)
    locais.push(local, nomeBytes, dados); centrais.push(central, nomeBytes); offset += local.length + nomeBytes.length + dados.length
  }
  const central = Buffer.concat(centrais), fim = Buffer.alloc(22)
  fim.writeUInt32LE(0x06054b50, 0); fim.writeUInt16LE(entries.length, 8); fim.writeUInt16LE(entries.length, 10); fim.writeUInt32LE(central.length, 12); fim.writeUInt32LE(offset, 16)
  return Buffer.concat([...locais, central, fim])
}
