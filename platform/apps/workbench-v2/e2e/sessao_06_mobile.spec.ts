import { expect, test } from '@playwright/test'
import { SEL, collectConsoleErrors, resetApp, shot } from './helpers'

// MOBILE.md: o gate de single-pane é POR TOQUE + largura, nunca só largura.
test.describe('Sessão 06 — Mobile (com toque)', () => {
  test.use({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true })

  test('T1: phone com toque entra em single-pane com dock de navegação', async ({ page }) => {
    await resetApp(page)
    await expect(page.locator('.mobile-dock-tabs'), 'phone + toque deve ativar o dock single-pane').toBeVisible()
    const tabs = page.locator('.mobile-dock-tabs .dock-tab')
    expect(await tabs.count(), 'o dock precisa das abas de navegação').toBeGreaterThanOrEqual(2)
    await shot(page, 'sessao06_T1_phone_single_pane')
  })

  test('T2: alvos de toque do dock respeitam o mínimo de 44px', async ({ page }) => {
    await resetApp(page)
    const boxes = await page.locator('.mobile-dock-tabs .dock-tab').evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().height),
    )
    expect(boxes.length).toBeGreaterThan(0)
    for (const height of boxes) {
      expect(Math.round(height), 'alvo de toque mínimo de 44px (MOBILE.md)').toBeGreaterThanOrEqual(44)
    }
    await shot(page, 'sessao06_T2_touch_targets')
  })

  test('T3: navegar pelo dock troca o painel exibido', async ({ page }) => {
    await resetApp(page)
    const tabs = page.locator('.mobile-dock-tabs .dock-tab')
    const chatVisibleBefore = await page.locator(SEL.chatPane).isVisible()
    expect(chatVisibleBefore, 'o phone começa no chat').toBe(true)

    await tabs.nth(1).click()
    await page.waitForTimeout(400)
    const activeTabs = page.locator('.mobile-dock-tabs .dock-tab.is-active')
    await expect(activeTabs, 'exatamente uma aba do dock fica ativa').toHaveCount(1)
    const activeLabel = (await activeTabs.first().innerText()).trim()
    expect(activeLabel.length, 'a aba ativa precisa de rótulo textual').toBeGreaterThan(0)
    expect(activeLabel, 'a aba tocada deve ser a nova ativa').not.toBe('Chat')
    await shot(page, 'sessao06_T3_dock_navegacao')
  })
})

test.describe('Sessão 06 — Mobile (sem toque)', () => {
  test('T4: desktop estreito SEM toque não entra em single-pane', async ({ page }) => {
    await resetApp(page)
    await page.setViewportSize({ width: 390, height: 780 })
    await page.waitForTimeout(400)
    await expect(page.locator('.mobile-dock-tabs'), 'sem toque não existe single-pane, só janela estreita').toBeHidden()
    await shot(page, 'sessao06_T4_sem_toque')
  })

  test('T5: a aplicação sobrevive a uma sequência de viewports sem erro', async ({ page }) => {
    await resetApp(page)
    const errors = collectConsoleErrors(page)
    for (const size of [
      { width: 1600, height: 900 },
      { width: 1024, height: 800 },
      { width: 768, height: 900 },
      { width: 480, height: 800 },
      { width: 1400, height: 900 },
    ]) {
      await page.setViewportSize(size)
      await page.waitForTimeout(250)
      await expect(page.locator(SEL.workbench)).toBeVisible()
    }
    expect(errors, 'redimensionar não pode lançar erro').toEqual([])
    await shot(page, 'sessao06_T5_viewports')
  })
})
