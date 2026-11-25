// @vitest-environment node
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getDatabase, resetDatabase } from './database'
import { raizPrivadaDaConversa } from './raizPrivadaChat'
import { limparRaizPrivadaDaSessao } from './limpezaExplorer'

let base: string
beforeEach(() => { base = mkdtempSync(path.join(tmpdir(), 'mmi-limpeza-explorer-')); process.env.AGENTE_WINDOW_DATA_DIR = path.join(base, 'dados'); mkdirSync(process.env.AGENTE_WINDOW_DATA_DIR); resetDatabase() })
afterEach(() => { resetDatabase(); delete process.env.AGENTE_WINDOW_DATA_DIR; rmSync(base, { recursive: true, force: true }) })
describe('limpeza da árvore privada', () => {
  it('move para Lixeira toda a sessão sem tocar sessão vizinha', async () => {
    const a = raizPrivadaDaConversa('sessao-a', 'chat'), b = raizPrivadaDaConversa('sessao-b', 'chat')
    mkdirSync(a, { recursive: true }); mkdirSync(b, { recursive: true })
    writeFileSync(path.join(a, 'trabalho.txt'), 'trabalho editado'); writeFileSync(path.join(b, 'vizinho.txt'), 'vizinho')
    const destino = path.join(base, 'lixeira')
    const mover = async (origem: string) => { renameSync(origem, destino); return { ok: true, destino } }
    expect(await limparRaizPrivadaDaSessao('sessao-a', { lixeira: { mover } })).toBe(true)
    expect(readFileSync(path.join(destino, path.basename(a), 'trabalho.txt'), 'utf8')).toBe('trabalho editado')
    expect(readFileSync(path.join(b, 'vizinho.txt'), 'utf8')).toBe('vizinho')
    expect(await limparRaizPrivadaDaSessao('sessao-a', { lixeira: { mover } })).toBe(true)
  })
  it('falha conserva árvore e retomada exige confirmação de identidade', async () => {
    const a = raizPrivadaDaConversa('sessao-a', 'chat'); mkdirSync(a, { recursive: true }); writeFileSync(path.join(a, 'x'), 'dados')
    expect(await limparRaizPrivadaDaSessao('sessao-a', { lixeira: { mover: async () => ({ ok: false }) } })).toBe(false)
    expect(readFileSync(path.join(a, 'x'), 'utf8')).toBe('dados')
    const destino = path.join(base, 'lixeira')
    expect(await limparRaizPrivadaDaSessao('sessao-a', { lixeira: { mover: async origem => { renameSync(origem, destino); return { ok: false, efeitoIniciado: true, destino } } } })).toBe(false)
    resetDatabase()
    expect(await limparRaizPrivadaDaSessao('sessao-a')).toBe(true)
    expect(getDatabase().prepare('SELECT state FROM explorer_cleanup WHERE session_id = ?').get('sessao-a')).toEqual({ state: 'concluido' })
  })
})
