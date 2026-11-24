// U-2: casca e porta reais em Chromium, com servidor e dados descartáveis.
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, test } from '@playwright/test'

const base = 'http://127.0.0.1:5220'
let servidor: ChildProcess
let raiz: string

test.beforeAll(async () => {
  raiz = mkdtempSync(join(tmpdir(), 'u2-e2e-'))
  servidor = spawn(process.execPath, [resolve('../../node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5220', '--strictPort'], {
    cwd: process.cwd(), stdio: 'ignore', env: { ...process.env, AGENTE_WINDOW_DATA_DIR: join(raiz, 'data'), AGENTE_WINDOW_PROVIDERS_PATH: join(raiz, 'providers.json'), AGENTE_WINDOW_PERSONALIZACOES_PATH: join(raiz, 'personalizacoes.json'), AGENTE_WINDOW_SETTINGS_PATH: join(raiz, 'settings.json'), FS_TEST_ROOT: raiz },
  })
  await expect.poll(async () => { try { return (await fetch(base)).status } catch { return 0 } }, { timeout: 60_000 }).toBe(200)
})

test.afterAll(async () => {
  if (servidor && servidor.exitCode === null) {
    const saiu = new Promise<void>((ok) => servidor.once('exit', () => ok()))
    servidor.kill('SIGKILL')
    await saiu
  }
  if (raiz) rmSync(raiz, { recursive: true, force: true })
})

test.describe('U-2 — diálogos internos', () => {
  test('diálogos reais: foco seguro, recusa, campo e geometria em janela estreita', async ({ page }) => {
    let nativos = 0
    page.on('dialog', async dialog => { nativos++; await dialog.dismiss() })
    await page.setViewportSize({ width: 800, height: 600 })
    await page.goto(base)
    await page.locator('.agent-sessions-workbench').waitFor()
    await page.evaluate(async () => {
      const porta = await import('/src/shell/portaDialogos.ts')
      const pedidos = await import('/src/domain/pedidosArquivo.ts')
      Object.assign(window, { u2resultado: 'pendente' })
      void porta.portaDialogos().confirmar(pedidos.pedidoExcluirMemoria()).then(valor => Object.assign(window, { u2resultado: String(valor) }))
    })
    const dialogo = page.getByRole('dialog', { name: 'Excluir esta memória e todas as suas revisões?' })
    await expect(dialogo).toBeVisible()
    await expect(dialogo.getByRole('button', { name: 'Cancelar', exact: true })).toBeFocused()
    const caixa = await dialogo.boundingBox()
    expect(caixa).not.toBeNull()
    expect(caixa!.x).toBeGreaterThanOrEqual(0)
    expect(caixa!.x + caixa!.width).toBeLessThanOrEqual(800)
    await page.keyboard.press('Enter')
    await expect.poll(() => page.evaluate(() => (window as unknown as { u2resultado: string }).u2resultado)).toBe('false')
    await expect(dialogo).toHaveCount(0)

    await page.evaluate(async () => {
      const porta = await import('/src/shell/portaDialogos.ts')
      const pedidos = await import('/src/domain/pedidosArquivo.ts')
      Object.assign(window, { u2resultado: 'pendente' })
      void porta.portaDialogos().pedirTexto(pedidos.pedidoGrupoDaSessao({ titulo: 'Teste', gruposExistentes: [], modo: 'atribuir' })).then(valor => Object.assign(window, { u2resultado: valor }))
    })
    const entrada = page.getByRole('dialog', { name: 'Atribuir “Teste” a um grupo' })
    const campo = entrada.getByRole('textbox', { name: 'Nome do grupo' })
    await expect(campo).toBeFocused()
    await campo.fill('Equipe')
    await entrada.getByRole('button', { name: 'Cancelar', exact: true }).focus()
    await page.keyboard.press('Enter')
    await expect.poll(() => page.evaluate(() => (window as unknown as { u2resultado: string | null }).u2resultado)).toBeNull()
    expect(nativos).toBe(0)
  })
})
