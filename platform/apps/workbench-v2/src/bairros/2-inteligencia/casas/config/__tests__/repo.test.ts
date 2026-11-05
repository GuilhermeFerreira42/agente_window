// ============================================================================
// Provas do repositório da Casa Config (FATIA 11, SPEC §8 — unit):
// padrão sem arquivo · faixa 1–250 · inválidos honestos · roundtrip ·
// parcial · arquivo corrompido · campo torto cai no padrão.
// ============================================================================
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { AUTOSCROLL_PADRAO, TETO_MAXIMO, TETO_MINIMO, TETO_PADRAO } from '../contract'
import { caminhoDoArquivo, lerConfig, salvarConfig, validarEntrada, validarTeto } from '../server/repo'

const raiz = await mkdtemp(join(tmpdir(), 'config-repo-'))
afterAll(async () => {
  await rm(raiz, { recursive: true, force: true })
})
const arquivo = (nome: string) => join(raiz, nome)

describe('Repositório de preferências (settings.json)', () => {
  it('sem arquivo = padrão 25 + auto-scroll ligado (RF11-4)', async () => {
    expect(TETO_PADRAO).toBe(25)
    expect(AUTOSCROLL_PADRAO).toBe(true)
    await expect(lerConfig(arquivo('ausente.json'))).resolves.toEqual({ teto: 25, autoScroll: true })
  })

  it('faixa 1–250: bordas entram, fora dá erro honesto (RF11-1/RF11-5)', () => {
    expect(TETO_MINIMO).toBe(1)
    expect(TETO_MAXIMO).toBe(250)
    expect(validarTeto(1)).toBe(1)
    expect(validarTeto(250)).toBe(250)
    for (const torto of [0, 251, -3, 25.5, Number.NaN, '25', null, undefined, {}]) {
      expect(() => validarTeto(torto), `teto ${String(torto)} deveria falhar`).toThrow(/número inteiro de 1 a 250/)
    }
  })

  it('roundtrip: salva e lê de volta igual', async () => {
    const caminho = arquivo('roundtrip.json')
    await expect(salvarConfig({ teto: 42, autoScroll: false }, caminho)).resolves.toEqual({ teto: 42, autoScroll: false })
    await expect(lerConfig(caminho)).resolves.toEqual({ teto: 42, autoScroll: false })
  })

  it('parcial: só o que veio é validado e salvo (o resto mantém)', async () => {
    const caminho = arquivo('parcial.json')
    await salvarConfig({ teto: 10 }, caminho)
    await expect(salvarConfig({ autoScroll: false }, caminho)).resolves.toEqual({ teto: 10, autoScroll: false })
    await expect(salvarConfig({}, caminho)).resolves.toEqual({ teto: 10, autoScroll: false })
    await expect(salvarConfig({ teto: 999 }, caminho)).rejects.toThrow(/número inteiro de 1 a 250/)
    await expect(salvarConfig({ autoScroll: 'sim' }, caminho)).rejects.toThrow(/ligado ou desligado/)
    expect(() => validarEntrada(null as unknown as Record<string, unknown>, { teto: 25, autoScroll: true })).toThrow(/Payload inválido/)
  })

  it('arquivo corrompido = erro honesto com o caminho (nunca silêncio)', async () => {
    const caminho = arquivo('torto.json')
    await writeFile(caminho, '{ não é json', 'utf8')
    await expect(lerConfig(caminho)).rejects.toThrow(/corrompido/)
  })

  it('campo torto NO ARQUIVO (mão humana) cai no padrão sem quebrar', async () => {
    const caminho = arquivo('mao-humana.json')
    await writeFile(caminho, JSON.stringify({ teto: 9999, autoScroll: 'talvez' }), 'utf8')
    await expect(lerConfig(caminho)).resolves.toEqual({ teto: 25, autoScroll: true })
  })

  it('E2E aponta para fixture: o arquivo do dono nunca é tocado', () => {
    const antes = process.env.AGENTE_WINDOW_SETTINGS_PATH
    process.env.AGENTE_WINDOW_SETTINGS_PATH = '/tmp/fixture-test/settings.json'
    expect(caminhoDoArquivo()).toBe('/tmp/fixture-test/settings.json')
    if (antes === undefined) delete process.env.AGENTE_WINDOW_SETTINGS_PATH
    else process.env.AGENTE_WINDOW_SETTINGS_PATH = antes
    expect(caminhoDoArquivo()).toContain('.agente_window')
  })
})
