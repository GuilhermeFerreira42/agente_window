import { expect, test } from '@playwright/test'
import { BTN, SEL, resetApp, shot } from './helpers'

test.describe('Sessão 08 — Filesystem/Workspace', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page)
  })

  test('T1: a detecção da File System Access API bate com a capacidade do browser', async ({ page }) => {
    const supported = await page.evaluate(() => 'showDirectoryPicker' in window)
    expect(supported, 'Chromium deve expor showDirectoryPicker').toBe(true)

    await page.getByRole('button', { name: BTN.abrirAlteracoes }).click()
    await page.waitForTimeout(300)
    await page.getByRole('tab', { name: /Files/ }).click()
    await page.waitForTimeout(300)

    const naoSuportado = page.getByText('File System Access API não suportada')
    expect(await naoSuportado.count(), 'não pode dizer "não suportada" em um browser que suporta').toBe(0)
    await shot(page, 'sessao08_T1_deteccao_api')
  })

  test('T2: a aba Files mostra a árvore Workspace Files', async ({ page }) => {
    await page.getByRole('button', { name: BTN.abrirAlteracoes }).click()
    await page.waitForTimeout(300)
    await page.getByRole('tab', { name: /Files/ }).click()
    await page.waitForTimeout(300)

    const aux = page.locator(SEL.auxiliaryBar)
    await expect(aux).toBeVisible()
    await expect(aux.getByText('Workspace Files')).toBeVisible()
    await expect(page.getByRole('tab', { name: /Files/ }), 'a aba Files deve ficar selecionada').toHaveAttribute('aria-selected', 'true')
    await shot(page, 'sessao08_T2_workspace_files')
  })

  test('T3: o seletor de pasta é um botão de verdade, não um span decorativo', async ({ page }) => {
    // Zera as sessões para cair na landing (é lá que fica o chip do workspace).
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForSelector(SEL.workbench)
    await page.waitForTimeout(400)

    await page.getByRole('button', { name: BTN.abrirAlteracoes }).click()
    await page.waitForTimeout(300)
    await page.getByRole('tab', { name: /Files/ }).click()
    await page.waitForTimeout(300)

    const picker = page.getByRole('button', { name: /Escolher pasta real do disco|Trocar pasta/ })
    await expect(picker, 'precisa existir um BOTÃO para escolher pasta real').toBeVisible()
    const tagName = await picker.first().evaluate((el) => el.tagName)
    expect(tagName, 'o seletor de pasta não pode ser um span sem ação').toBe('BUTTON')
    await expect(picker.first()).toBeEnabled()
    await shot(page, 'sessao08_T3_botao_escolher_pasta')
  })

  test('T4: clicar no seletor chama showDirectoryPicker (API real, não desenho)', async ({ page }) => {
    // Instrumenta a API nativa: o teste prova a CHAMADA, já que o diálogo do SO
    // não pode ser automatizado em headless.
    await page.addInitScript(() => {
      ;(window as unknown as { __pickerCalls: number }).__pickerCalls = 0
      Object.defineProperty(window, 'showDirectoryPicker', {
        configurable: true,
        value: async () => {
          ;(window as unknown as { __pickerCalls: number }).__pickerCalls++
          throw new DOMException('The user aborted a request.', 'AbortError')
        },
      })
    })
    await page.reload()
    await page.waitForSelector(SEL.workbench)
    await page.waitForTimeout(400)

    await page.getByRole('button', { name: BTN.abrirAlteracoes }).click()
    await page.waitForTimeout(300)
    await page.getByRole('tab', { name: /Files/ }).click()
    await page.waitForTimeout(300)

    await page.getByRole('button', { name: /Escolher pasta real do disco|Trocar pasta/ }).first().click()
    await page.waitForTimeout(400)

    const calls = await page.evaluate(() => (window as unknown as { __pickerCalls: number }).__pickerCalls)
    expect(calls, 'o clique precisa chamar showDirectoryPicker de verdade').toBeGreaterThan(0)
    await expect(page.locator(SEL.workbench), 'cancelar o diálogo não pode quebrar o app').toBeVisible()
    await shot(page, 'sessao08_T4_picker_chamado')
  })

  test('T5: IndexedDB disponível para guardar o handle da pasta', async ({ page }) => {
    const ok = await page.evaluate(async () => {
      if (!('indexedDB' in window)) return false
      return await new Promise<boolean>((resolve) => {
        const request = indexedDB.open('e2e-probe', 1)
        request.onsuccess = () => { request.result.close(); resolve(true) }
        request.onerror = () => resolve(false)
      })
    })
    expect(ok, 'IndexedDB é requisito para persistir FileSystemDirectoryHandle').toBe(true)
  })
})
