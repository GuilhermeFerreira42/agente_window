// ============================================================================
// Casa Agir — provas do executor `excluir` (FATIA 12): arquivo e pasta vão
// para a lixeira XDG (temporária nos testes, via $XDG_DATA_HOME); território,
// nomes inválidos e a própria pasta raiz = recusa honesta; falha = nada some.
// ============================================================================
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import * as path from 'node:path'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { PedidoFerramenta } from '../contract'
import { criarExecutoresReais, descreverAlvoExcluir } from '../server/discos'

const base = await mkdtemp(path.join(tmpdir(), 'agir-excluir-'))
const raiz = path.join(base, 'ws')
await mkdir(raiz, { recursive: true })
const xdgAnterior = process.env.XDG_DATA_HOME
const xdgTemp = await mkdtemp(path.join(base, 'xdg-'))

beforeEach(() => {
  process.env.XDG_DATA_HOME = xdgTemp
})
afterEach(() => {
  if (xdgAnterior === undefined) delete process.env.XDG_DATA_HOME
  else process.env.XDG_DATA_HOME = xdgAnterior
})
afterAll(async () => {
  await rm(base, { recursive: true, force: true })
})

function pedidoExcluir(caminho: unknown): PedidoFerramenta {
  return { id: 'e1', ferramenta: 'excluir', argumentos: { caminho } }
}

describe('excluir — executor real', () => {
  it('arquivo some da pasta e aparece inteiro na lixeira', async () => {
    const executores = criarExecutoresReais(raiz)
    await writeFile(path.join(raiz, 'alvo.txt'), 'conteúdo do alvo', 'utf8')
    const resultado = await executores.excluir(pedidoExcluir('alvo.txt'))
    expect(resultado.ok).toBe(true)
    expect(resultado.resumo).toContain('lixeira')
    await expect(stat(path.join(raiz, 'alvo.txt'))).rejects.toThrow()
    expect(await readFile(path.join(xdgTemp, 'Trash', 'files', 'alvo.txt'), 'utf8')).toBe('conteúdo do alvo')
  })

  it('pasta com arquivos vai inteira e o resumo conta os itens', async () => {
    const executores = criarExecutoresReais(raiz)
    await mkdir(path.join(raiz, 'caixa', 'sub'), { recursive: true })
    await writeFile(path.join(raiz, 'caixa', 'um.txt'), '1', 'utf8')
    await writeFile(path.join(raiz, 'caixa', 'sub', 'dois.txt'), '2', 'utf8')
    const resultado = await executores.excluir(pedidoExcluir('caixa'))
    expect(resultado.ok).toBe(true)
    expect(resultado.resumo).toContain('3 itens')
    await expect(stat(path.join(raiz, 'caixa'))).rejects.toThrow()
    expect(await readFile(path.join(xdgTemp, 'Trash', 'files', 'caixa', 'sub', 'dois.txt'), 'utf8')).toBe('2')
  })

  it('../fora = recusa de território, mesmo aprovado (RF12-4)', async () => {
    const executores = criarExecutoresReais(raiz)
    const resultado = await executores.excluir(pedidoExcluir('../fora.txt'))
    expect(resultado.ok).toBe(false)
    expect(resultado.resumo).toContain('Fora da pasta de trabalho')
  })

  it('a própria pasta de trabalho nunca é alvo (RNF12-3)', async () => {
    const executores = criarExecutoresReais(raiz)
    for (const entrada of ['.', raiz]) {
      const resultado = await executores.excluir(pedidoExcluir(entrada))
      expect(resultado.ok).toBe(false)
      expect(resultado.resumo).toContain('pasta de trabalho inteira')
    }
    await expect(stat(raiz)).resolves.toBeDefined() // de pé
  })

  it('caminho vazio e inexistente = recusa honesta, nada some', async () => {
    const executores = criarExecutoresReais(raiz)
    const vazio = await executores.excluir(pedidoExcluir(''))
    expect(vazio.ok).toBe(false)
    expect(vazio.resumo).toContain('faltou caminho')
    const fantasma = await executores.excluir(pedidoExcluir('fantasma.txt'))
    expect(fantasma.ok).toBe(false)
    expect(fantasma.resumo).toContain('nada sumiu')
  })

  it('falha da lixeira = erro honesto com a origem intacta (RF12-5)', async () => {
    const executores = criarExecutoresReais(raiz)
    process.env.XDG_DATA_HOME = path.join(base, 'xdg-arquivo') // mkdir falha: é arquivo
    await writeFile(process.env.XDG_DATA_HOME, 'não sou pasta', 'utf8')
    await writeFile(path.join(raiz, 'vitima.txt'), 'intacta', 'utf8')
    const resultado = await executores.excluir(pedidoExcluir('vitima.txt'))
    expect(resultado.ok).toBe(false)
    expect(await readFile(path.join(raiz, 'vitima.txt'), 'utf8')).toBe('intacta')
  })
})

describe('excluir — prévia do cartão reforçado (descreverAlvoExcluir)', () => {
  it('arquivo mostra o começo do conteúdo; pasta mostra contagem + tamanho', async () => {
    await writeFile(path.join(raiz, 'carta.txt'), 'primeira linha\nsegunda linha', 'utf8')
    const previaArquivo = await descreverAlvoExcluir(raiz, 'carta.txt')
    expect(previaArquivo).toContain('primeira linha')
    await mkdir(path.join(raiz, 'pacote'), { recursive: true })
    await writeFile(path.join(raiz, 'pacote', 'a.txt'), '12345', 'utf8')
    const previaPasta = await descreverAlvoExcluir(raiz, 'pacote')
    expect(previaPasta).toContain('1 item')
    expect(previaPasta).toContain('5 B')
  })

  it('problema vira frase honesta (aprovar não apaga nada)', async () => {
    expect(await descreverAlvoExcluir(raiz, '')).toContain('não apaga nada')
    expect(await descreverAlvoExcluir(raiz, '../fora.txt')).toContain('Fora da pasta')
    expect(await descreverAlvoExcluir(raiz, 'sumido.txt')).toContain('não existe')
  })
})
