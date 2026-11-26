import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { renomearDiretorioExclusivo } from './renomearDiretorioExclusivo'

it('preserva um destino vazio criado por outro processo e permite mover para destino livre', async () => {
  const raiz = await mkdtemp(join(tmpdir(), 'agente-move-'))
  const origem = join(raiz, 'pasta com acentuação')
  const ocupado = join(raiz, 'destino ocupado')
  const livre = join(raiz, 'destino livre')
  try {
    await Promise.all([mkdir(origem), mkdir(ocupado)])
    await writeFile(join(origem, 'arquivo.txt'), 'versão de trabalho')
    await expect(renomearDiretorioExclusivo(origem, ocupado)).rejects.toMatchObject({ code: 'EEXIST' })
    expect(await readdir(ocupado)).toEqual([])
    expect(await readFile(join(origem, 'arquivo.txt'), 'utf8')).toBe('versão de trabalho')
    await renomearDiretorioExclusivo(origem, livre)
    expect(await readFile(join(livre, 'arquivo.txt'), 'utf8')).toBe('versão de trabalho')
    expect(await readdir(raiz)).toEqual(['destino livre', 'destino ocupado'])
  } finally {
    await rm(raiz, { recursive: true, force: true })
  }
})
