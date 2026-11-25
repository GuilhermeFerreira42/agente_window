// Leitor ZIP limitado, usado pela ferramenta de anexos. Não cria arquivos por si.
// A autorização do dono, identidade do chat e publicação privada pertencem ao chamador.
import { crc32 } from 'node:zlib'
import { fromBuffer, type Entry, type ZipFile } from 'yauzl'

const MAX_ARQUIVO = 32 * 1024 * 1024
const MAX_ENTRADAS = 128
const MAX_ITEM = 4 * 1024 * 1024
const MAX_TOTAL = 16 * 1024 * 1024
const MAX_RAZAO = 200

export interface EntradaZipSegura { indice: number; nome: string; bytes: number; comprimido: number; diretorio: boolean }
interface EntradaInterna { publico: EntradaZipSegura; entry: Entry }
function recusar(): never { throw new Error('ZIP inválido, inseguro ou acima dos limites locais. Nenhum item foi extraído.') }

function validarNome(nome: string, diretorio: boolean): string {
  if (!nome || nome.length > 512 || /[\\<>:"|?*]/u.test(nome) || nome.startsWith('/') ||
      [...nome].some(caractere => caractere.charCodeAt(0) < 32 || caractere.charCodeAt(0) === 127)) return recusar()
  const partes = (diretorio ? nome.slice(0, -1) : nome).split('/')
  if (partes.some(p => !p || p === '.' || p === '..' || /[. ]$/u.test(p) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(p))) return recusar()
  return nome.normalize('NFC')
}

async function abrir(bytes: Buffer): Promise<ZipFile> {
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > MAX_ARQUIVO) return recusar()
  return new Promise((resolve, reject) => fromBuffer(bytes, { lazyEntries: true, autoClose: false, strictFileNames: true, validateEntrySizes: true },
    (erro, zip) => erro || !zip ? reject(new Error('ZIP inválido ou indisponível.')) : resolve(zip)))
}

async function lerCatalogo(zip: ZipFile): Promise<EntradaInterna[]> {
  return new Promise((resolve, reject) => {
    const entradas: EntradaInterna[] = [], nomes = new Set<string>()
    let total = 0
    zip.on('error', reject)
    zip.on('end', () => {
      const arquivos = new Set(entradas.filter(item => !item.publico.diretorio).map(item => item.publico.nome.toLocaleLowerCase('en-US')))
      for (const item of entradas) {
        const partes = item.publico.nome.replace(/\/$/u, '').toLocaleLowerCase('en-US').split('/')
        for (let i = 1; i < partes.length; i++) {
          if (arquivos.has(partes.slice(0, i).join('/'))) { reject(new Error('ZIP contém caminhos incompatíveis.')); return }
        }
      }
      resolve(entradas)
    })
    zip.on('entry', (entry: Entry) => {
      try {
        if (entradas.length >= MAX_ENTRADAS || (entry.generalPurposeBitFlag & 1) !== 0 || ![0, 8].includes(entry.compressionMethod)) return recusar()
        const diretorio = entry.fileName.endsWith('/')
        const nome = validarNome(entry.fileName, diretorio)
        const chave = nome.replace(/\/$/u, '').toLocaleLowerCase('en-US')
        if (nomes.has(chave)) return recusar()
        nomes.add(chave)
        const modo = entry.versionMadeBy >> 8 === 3 ? (entry.externalFileAttributes >>> 16) & 0xf000 : 0
        if (modo && modo !== 0x8000 && modo !== 0x4000) return recusar()
        if ((modo === 0x4000) !== diretorio && modo !== 0) return recusar()
        if (!Number.isSafeInteger(entry.uncompressedSize) || !Number.isSafeInteger(entry.compressedSize) || entry.uncompressedSize > MAX_ITEM ||
          (entry.uncompressedSize > 0 && (!entry.compressedSize || entry.uncompressedSize > entry.compressedSize * MAX_RAZAO))) return recusar()
        total += entry.uncompressedSize
        if (total > MAX_TOTAL || (diretorio && entry.uncompressedSize !== 0)) return recusar()
        entradas.push({ publico: { indice: entradas.length, nome, bytes: entry.uncompressedSize, comprimido: entry.compressedSize, diretorio }, entry })
        zip.readEntry()
      } catch (erro) { reject(erro) }
    })
    zip.readEntry()
  })
}

async function lerItem(zip: ZipFile, item: EntradaInterna): Promise<Buffer> {
  return new Promise((resolve, reject) => zip.openReadStream(item.entry, (erro, stream) => {
    if (erro || !stream) { reject(new Error('Não foi possível ler o item ZIP.')); return }
    const partes: Buffer[] = []
    let total = 0, crc = 0
    stream.on('data', (parte: Buffer) => {
      total += parte.length
      if (total > item.publico.bytes || total > MAX_ITEM) { stream.destroy(new Error('Item ZIP excede o limite.')); return }
      crc = crc32(parte, crc); partes.push(Buffer.from(parte))
    })
    stream.on('error', reject)
    stream.on('end', () => {
      if (total !== item.publico.bytes || crc !== item.entry.crc32) { reject(new Error('Integridade do item ZIP não confirmada.')); return }
      resolve(Buffer.concat(partes, total))
    })
  }))
}

export async function listarZipSeguro(bytes: Buffer): Promise<EntradaZipSegura[]> {
  const zip = await abrir(bytes)
  try { return (await lerCatalogo(zip)).map(item => item.publico) } finally { zip.close() }
}

/** Retorna bytes em memória, sem extrair por caminho ou gravar em disco. */
export async function extrairZipSeguro(bytes: Buffer, indices: readonly number[]): Promise<Array<{ nome: string; bytes: Buffer }>> {
  if (!Array.isArray(indices) || !indices.length || indices.length > MAX_ENTRADAS || new Set(indices).size !== indices.length || !indices.every(Number.isSafeInteger)) return recusar()
  const zip = await abrir(bytes)
  try {
    const catalogo = await lerCatalogo(zip)
    const selecionados = indices.map(indice => catalogo[indice])
    if (selecionados.some(item => !item || item.publico.diretorio)) return recusar()
    const resultado: Array<{ nome: string; bytes: Buffer }> = []
    for (const item of selecionados) resultado.push({ nome: item.publico.nome, bytes: await lerItem(zip, item) })
    return resultado
  } finally { zip.close() }
}
