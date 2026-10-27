import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import * as path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import type { PedidoFerramenta } from '../contract'
import { criarExecutoresReais, descreverAlvoExcluir } from '../server/discos'

const base = await mkdtemp(path.join(tmpdir(), 'agir-excluir-fail-closed-'))
const raiz = path.join(base, 'ws')
await mkdir(raiz)
afterAll(async () => {
  await rm(base, { recursive: true, force: true })
})

function pedidoExcluir(caminho: unknown): PedidoFerramenta {
  return { id: 'e1', ferramenta: 'excluir', argumentos: { caminho } }
}

describe('excluir — fora do escopo desta missão e fail-closed', () => {
  it('preserva arquivo e pasta e não tenta mover nem remover', async () => {
    await writeFile(path.join(raiz, 'alvo.txt'), 'fixture sanitizada', 'utf8')
    await mkdir(path.join(raiz, 'caixa'))
    await writeFile(path.join(raiz, 'caixa', 'dentro.txt'), 'dentro', 'utf8')
    const executores = criarExecutoresReais(raiz)
    try {
      const arquivo = await executores.excluir(pedidoExcluir('alvo.txt'))
      const pasta = await executores.excluir(pedidoExcluir('caixa'))
      expect(arquivo.ok).toBe(false)
      expect(pasta.ok).toBe(false)
      expect(arquivo.resumo).toContain('Exclusão bloqueada')
      expect(pasta.resumo).toContain('Nenhum item')
      expect(await readFile(path.join(raiz, 'alvo.txt'), 'utf8')).toBe('fixture sanitizada')
      expect(await readFile(path.join(raiz, 'caixa', 'dentro.txt'), 'utf8')).toBe('dentro')
    } finally {
      executores.fechar()
    }
  })

  it('não executa exclusão em caminho externo nem na raiz enquanto a ferramenta não existe', async () => {
    const executores = criarExecutoresReais(raiz)
    try {
      const fora = await executores.excluir(pedidoExcluir('../fora.txt'))
      const raizInteira = await executores.excluir(pedidoExcluir('.'))
      expect(fora.ok).toBe(false)
      expect(fora.resumo).toContain('Exclusão bloqueada')
      expect(raizInteira.ok).toBe(false)
      expect(raizInteira.resumo).toContain('Exclusão bloqueada')
    } finally {
      executores.fechar()
    }
  })

  it('prévia informa indisponibilidade sem abrir nem inspecionar o caminho', async () => {
    const previa = await descreverAlvoExcluir(raiz, 'sumido-ou-symlink.txt')
    expect(previa).toContain('exclusão não está disponível')
    expect(previa).toContain('nenhum item foi lido, movido ou removido')
    expect(await descreverAlvoExcluir(raiz, '../fora.txt')).toBe(previa)
  })
})
