// ============================================================================
// Provas da TRAVA DE TERRITÓRIO — ninguém sai da pasta de trabalho, nem com
// caminho relativo, nem com absoluto, nem com `..`, nem em outro disco.
// O caso Windows (o dono é Windows) é provado com o path.win32 injetado.
// ============================================================================
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { verificarTerritorio } from '../server/territorio'

const RAIZ = path.resolve('/casa/trabalho')

describe('Trava de território (posix)', () => {
  it('caminho relativo dentro: liberado e resolvido', () => {
    const v = verificarTerritorio(RAIZ, 'docs/nota.md')
    expect(v).toEqual({ liberado: true, caminho: path.resolve(RAIZ, 'docs/nota.md') })
  })
  it('caminho absoluto DENTRO da pasta: liberado (lição do teste do dono, 18/10)', () => {
    const v = verificarTerritorio(RAIZ, `${RAIZ}/AGENTS.md`)
    expect(v.liberado).toBe(true)
  })
  it('`..` que escapa: recusa honesta', () => {
    const v = verificarTerritorio(RAIZ, '../segredos.txt')
    expect(v.liberado).toBe(false)
    if (!v.liberado) expect(v.motivo).toContain('Fora da pasta')
  })
  it('absoluto de fora: recusa honesta', () => {
    const v = verificarTerritorio(RAIZ, '/etc/passwd')
    expect(v.liberado).toBe(false)
  })
  it('pardisposição (`..` no meio que continua dentro): liberado', () => {
    const v = verificarTerritorio(RAIZ, 'docs/../nota.md')
    expect(v.liberado).toBe(true)
  })
  it('caminho vazio/não-texto: recusa honesta', () => {
    expect(verificarTerritorio(RAIZ, '').liberado).toBe(false)
    expect(verificarTerritorio(RAIZ, '   ').liberado).toBe(false)
    expect(verificarTerritorio(RAIZ, undefined).liberado).toBe(false)
    expect(verificarTerritorio(RAIZ, 42).liberado).toBe(false)
  })
})

describe('Trava de território (win32 — o dono é Windows)', () => {
  const RAIZ_W = 'C:\\Users\\Usuario\\Desktop\\agente_window'
  it('absoluto do Windows DENTRO da pasta: liberado', () => {
    const v = verificarTerritorio(RAIZ_W, 'C:\\Users\\Usuario\\Desktop\\agente_window\\AGENTS.md', path.win32)
    expect(v.liberado).toBe(true)
  })
  it('relativo do Windows: liberado', () => {
    const v = verificarTerritorio(RAIZ_W, 'docs\\arquivo.md', path.win32)
    expect(v.liberado).toBe(true)
  })
  it('outro ramo do disco: recusa honesta', () => {
    const v = verificarTerritorio(RAIZ_W, 'C:\\Windows\\system32\\x.dll', path.win32)
    expect(v.liberado).toBe(false)
  })
  it('`..` escapando no Windows: recusa honesta', () => {
    const v = verificarTerritorio(RAIZ_W, '..\\outro-projeto\\x.txt', path.win32)
    expect(v.liberado).toBe(false)
  })
})
