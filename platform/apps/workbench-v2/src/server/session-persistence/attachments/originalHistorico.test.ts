import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { caminhoOriginalHistorico, preservarOriginalHistorico } from './originalHistorico'

let base = ''
let raiz = ''
let appDir = ''
const bytes = Buffer.from('original sintético')
const item = { sessionId: 'sessao', chatId: 'chat', artifactId: 'artefato', name: 'nota.txt', bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'mm-i-original-'))
  raiz = join(base, 'projeto')
  appDir = join(base, 'app')
  process.env.AGENTE_WINDOW_DATA_DIR = appDir
  mkdirSync(raiz, { recursive: true })
  mkdirSync(appDir, { recursive: true })
})
afterEach(() => { delete process.env.AGENTE_WINDOW_DATA_DIR; rmSync(base, { recursive: true, force: true }) })

describe('original histórico de projeto', () => {
  it('publica cópia independente e trata duas migrações simultâneas', async () => {
    const fonte = join(raiz, 'nota.txt')
    writeFileSync(fonte, bytes)
    const [a, b] = await Promise.all([
      preservarOriginalHistorico(item, fonte, raiz, appDir),
      preservarOriginalHistorico(item, fonte, raiz, appDir),
    ])
    expect(a).toBe(b)
    writeFileSync(fonte, 'EDIÇÃO')
    expect(readFileSync(a)).toEqual(bytes)
    expect(await preservarOriginalHistorico(item, fonte, raiz, appDir)).toBe(a)
  })

  it('não promove bytes divergentes nem substitui arquivo histórico estranho', async () => {
    const fonte = join(raiz, 'nota.txt')
    writeFileSync(fonte, 'mesmo tamanho???')
    await expect(preservarOriginalHistorico(item, fonte, raiz, appDir)).rejects.toThrow()
    expect(existsSync(caminhoOriginalHistorico(item, appDir))).toBe(false)
    const destino = caminhoOriginalHistorico(item, appDir)
    mkdirSync(join(appDir, 'uploads', 'chats', item.sessionId, item.chatId, item.artifactId), { recursive: true })
    writeFileSync(destino, 'ARQUIVO ESTRANHO')
    writeFileSync(fonte, bytes)
    await expect(preservarOriginalHistorico(item, fonte, raiz, appDir)).rejects.toMatchObject({ code: 'attachment_original_changed' })
    expect(readFileSync(destino, 'utf8')).toBe('ARQUIVO ESTRANHO')
  })

  it('recusa caminho fora da raiz, identidade com separador e link no alvo', async () => {
    const fora = join(base, 'fora.txt')
    writeFileSync(fora, bytes)
    await expect(preservarOriginalHistorico(item, fora, raiz, appDir)).rejects.toThrow()
    await expect(preservarOriginalHistorico({ ...item, chatId: '../outro' }, fora, raiz, appDir)).rejects.toThrow()
    const link = join(raiz, 'nota.txt')
    try { symlinkSync(fora, link) } catch { return } // Windows sem privilégio para criar links
    await expect(preservarOriginalHistorico(item, link, raiz, appDir)).rejects.toThrow()
  })
})
