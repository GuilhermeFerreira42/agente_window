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

describe('excluir F2 — bloqueio controlado até lixeira segura', () => {
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

  it('recusa caminho externo e a própria raiz antes de qualquer operação de disco', async () => {
    const executores = criarExecutoresReais(raiz)
    try {
      const fora = await executores.excluir(pedidoExcluir('../fora.txt'))
      const raizInteira = await executores.excluir(pedidoExcluir('.'))
      expect(fora.ok).toBe(false)
      expect(fora.resumo).toContain('Fora da pasta')
      expect(raizInteira.ok).toBe(false)
      expect(raizInteira.resumo).toContain('pasta de trabalho inteira')
    } finally {
      executores.fechar()
    }
  })

  it('prévia explica bloqueio sem abrir nem inspecionar o caminho', async () => {
    const previa = await descreverAlvoExcluir(raiz, 'sumido-ou-symlink.txt')
    expect(previa).toContain('exclusão está bloqueada')
    expect(previa).toContain('nenhum item foi lido ou removido')
    expect(await descreverAlvoExcluir(raiz, '../fora.txt')).toContain('Fora da pasta')
  })
})
