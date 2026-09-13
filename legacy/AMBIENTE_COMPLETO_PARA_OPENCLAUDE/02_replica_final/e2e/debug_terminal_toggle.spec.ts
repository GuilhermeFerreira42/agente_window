import { test, expect } from '@playwright/test'
import { BTN, BASE_URL } from './helpers'

// Spec de diagnóstico do toggle do terminal.
// Mantém-se em conformidade com o contrato anti-trapaça (e2eAssertionContract):
// usa BASE_URL de helpers (sem host/porta hardcoded), possui asserções reais
// e não usa console.log como substituto de prova.
test.describe('DEBUG — diagnóstico do toggle do terminal', () => {
  test('o painel do terminal monta sem crash ao alternar', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(err.message))

    await page.goto(BASE_URL)
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    await expect(
      page.locator('.agent-sessions-workbench'),
      'o workbench deve carregar'
    ).toBeVisible({ timeout: 10000 })

    const toggleBtn = page.getByRole('button', { name: BTN.toggleTerminal })
    await expect(toggleBtn, 'o botão de toggle do terminal deve existir').toBeVisible({
      timeout: 5000,
    })

    await toggleBtn.click()
    await page.waitForTimeout(1500)

    const terminalPanel = page.locator('.terminal-panel')
    await expect(
      terminalPanel,
      'o painel do terminal deve aparecer no DOM após o toggle'
    ).toHaveCount(1)
    expect(
      pageErrors,
      'não pode haver erros de página ao montar o terminal'
    ).toEqual([])
  })
})
