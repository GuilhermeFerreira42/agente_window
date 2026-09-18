import { expect, test } from '@playwright/test'
import { BTN, SEL, collectConsoleErrors, resetApp, shot } from './helpers'

test.describe('Sessão 07 — Browser & Editor', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page)
  })

  test('T1: o browser abre no editor e pertence à sessão ativa', async ({ page }) => {
    const activeId = await page.locator(SEL.activeRow).first().getAttribute('data-session-id')
    await page.getByRole('button', { name: BTN.abrirNavegador }).click()
    await page.waitForTimeout(500)

    const view = page.locator('.browser-view')
    await expect(view, 'a superfície de browser deve abrir no editor').toBeVisible()
    expect(await view.getAttribute('data-session-id'), 'o browser precisa pertencer à sessão ativa').toBe(activeId)
    await expect(page.locator('.browser-frame'), 'o iframe do browser deve existir').toBeAttached()
    await shot(page, 'sessao07_T1_browser_abre')
  })

  test('T2: a aba do editor guarda tipo e sessão', async ({ page }) => {
    await page.getByRole('button', { name: BTN.abrirNavegador }).click()
    await page.waitForTimeout(400)

    const tab = page.locator(`${SEL.editorTabs} [data-tab-type="browser"]`).first()
    await expect(tab, 'deve existir aba do tipo browser').toBeVisible()
    const sessionId = await tab.getAttribute('data-session-id')
    expect(sessionId, 'a aba precisa carregar o sessionId').toBeTruthy()
    await shot(page, 'sessao07_T2_aba_browser')
  })

  test('T3: os controles de viewport mudam a largura renderizada do frame', async ({ page }) => {
    await page.getByRole('button', { name: BTN.abrirNavegador }).click()
    await page.waitForTimeout(500)

    const wrap = page.locator('.browser-frame-wrap')
    const desktopWidth = (await wrap.boundingBox())!.width

    await page.locator('.browser-viewport-button', { hasText: '375' }).click()
    await page.waitForTimeout(400)
    const mobileWidth = (await wrap.boundingBox())!.width
    expect(mobileWidth, 'viewport mobile deve estreitar o frame de verdade').toBeLessThan(desktopWidth)
    expect(Math.round(mobileWidth), 'viewport mobile deve ficar próximo de 375px').toBeLessThanOrEqual(420)

    await page.locator('.browser-viewport-button', { hasText: '768' }).click()
    await page.waitForTimeout(400)
    const tabletWidth = (await wrap.boundingBox())!.width
    expect(tabletWidth, 'tablet deve ser maior que mobile').toBeGreaterThan(mobileWidth)
    await shot(page, 'sessao07_T3_viewports')
  })

  test('T4: a barra de endereço navega e o botão Voltar volta ao endereço anterior', async ({ page }) => {
    await page.getByRole('button', { name: BTN.abrirNavegador }).click()
    await page.waitForTimeout(400)

    const address = page.getByRole('textbox', { name: 'Endereço' })
    const initial = await address.inputValue()
    expect(initial, 'a barra de endereço deve começar preenchida').toBeTruthy()

    await address.fill('agents.local/docs')
    await address.press('Enter')
    await page.waitForTimeout(600)
    const navigated = await address.inputValue()
    expect(navigated, 'o endereço digitado deve ser normalizado com esquema').toContain('agents.local/docs')
    expect(navigated.startsWith('http'), 'o endereço deve virar URL absoluta').toBe(true)

    await page.getByRole('button', { name: 'Voltar' }).click()
    await page.waitForTimeout(500)
    expect(await address.inputValue(), 'Voltar deve restaurar o endereço anterior').toBe(initial)
    await shot(page, 'sessao07_T4_history')
  })

  test('T5: abrir browser, busca e alterações não gera erro e mantém 3 abas', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await page.getByRole('button', { name: BTN.abrirNavegador }).click()
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: BTN.abrirBusca }).click()
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: BTN.abrirAlteracoes }).click()
    await page.waitForTimeout(500)

    const tabs = page.locator(`${SEL.editorTabs} .editor-tab`)
    expect(await tabs.count(), 'as três superfícies devem abrir abas distintas').toBeGreaterThanOrEqual(3)
    const types = await tabs.evaluateAll((els) => els.map((el) => el.getAttribute('data-tab-type')))
    for (const expected of ['browser', 'search', 'diff']) {
      expect(types, `deveria existir aba do tipo ${expected}`).toContain(expected)
    }
    expect(errors, 'abrir as superfícies não pode lançar erro').toEqual([])
    await shot(page, 'sessao07_T5_tres_superficies')
  })
})
