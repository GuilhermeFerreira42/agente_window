import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import * as path from 'node:path'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { moverParaLixeira } from '../server/lixeira'

const base = await mkdtemp(path.join(tmpdir(), 'agir-lixeira-fail-closed-'))
afterAll(async () => {
  await rm(base, { recursive: true, force: true })
})

describe('lixeira F2 — fail-closed até contenção segura', () => {
  it.each(['linux', 'win32', 'darwin'] as const)(
    'bloqueia em %s sem inspecionar a origem, iniciar processo ou tocar no destino',
    async (plataforma) => {
      const origem = path.join(base, `alvo-${plataforma}.txt`)
      await writeFile(origem, 'fixture sanitizada', 'utf8')
      const executar = vi.fn(async () => ({ stdout: '', stderr: '' }))
      const resultado = await moverParaLixeira(origem, {
        plataforma,
        pastaTrash: path.join(base, 'trash'),
        executar,
      })
      expect(resultado.ok).toBe(false)
      expect(resultado.motivo).toContain('Exclusão bloqueada')
      expect(await readFile(origem, 'utf8')).toBe('fixture sanitizada')
      expect(executar).not.toHaveBeenCalled()
    },
  )
})
