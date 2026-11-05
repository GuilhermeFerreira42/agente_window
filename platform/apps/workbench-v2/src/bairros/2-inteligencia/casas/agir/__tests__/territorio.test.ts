// O workspace é base para paths relativos, não fronteira de confinamento.
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { verificarTerritorio } from '../server/territorio'

const RAIZ = path.resolve('/fixture/workspace')

describe('Resolução de caminhos locais (posix)', () => {
  it('resolve relativo a partir do workspace', () => {
    expect(verificarTerritorio(RAIZ, 'docs/nota.md')).toEqual({
      liberado: true,
      caminho: path.resolve(RAIZ, 'docs/nota.md'),
    })
  })
  it('aceita caminho absoluto dentro do workspace', () => {
    expect(verificarTerritorio(RAIZ, `${RAIZ}/AGENTS.md`).liberado).toBe(true)
  })
  it('aceita caminho absoluto fora e travessia explícita para outro projeto', () => {
    expect(verificarTerritorio(RAIZ, '/tmp/outro-projeto/arquivo.txt')).toEqual({
      liberado: true,
      caminho: '/tmp/outro-projeto/arquivo.txt',
    })
    expect(verificarTerritorio(RAIZ, '../outro-projeto/arquivo.txt').liberado).toBe(true)
  })
  it('rejeita somente entradas ausentes, não-texto ou com NUL', () => {
    expect(verificarTerritorio(RAIZ, '').liberado).toBe(false)
    expect(verificarTerritorio(RAIZ, '   ').liberado).toBe(false)
    expect(verificarTerritorio(RAIZ, undefined).liberado).toBe(false)
    expect(verificarTerritorio(RAIZ, 42).liberado).toBe(false)
    expect(verificarTerritorio(RAIZ, 'a\0b').liberado).toBe(false)
  })
})

describe('Resolução de caminhos locais (win32 — simulado)', () => {
  const raizWindows = 'C:\\Users\\Fixture\\workspace'
  it('resolve relativo, absoluto e outro drive com path.win32', () => {
    expect(verificarTerritorio(raizWindows, 'docs\\nota.md', path.win32)).toMatchObject({
      liberado: true,
      caminho: 'C:\\Users\\Fixture\\workspace\\docs\\nota.md',
    })
    expect(verificarTerritorio(raizWindows, 'D:\\fixtures\\outro\\arquivo.txt', path.win32)).toMatchObject({
      liberado: true,
      caminho: 'D:\\fixtures\\outro\\arquivo.txt',
    })
  })
  it('normaliza o formato /C:/ usado por alguns modelos', () => {
    expect(verificarTerritorio(raizWindows, '/C:/Users/Fixture/workspace/a.txt', path.win32)).toMatchObject({
      liberado: true,
      caminho: 'C:\\Users\\Fixture\\workspace\\a.txt',
    })
  })
})
