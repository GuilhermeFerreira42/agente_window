import { test, expect } from '@playwright/test'
import { BTN, resetApp, SEL, shot } from './helpers'

test.describe('Sessão 11D — split com sash redimensionável', () => {
  test('cria o sash, redimensiona as panes e preserva o terminal funcional', async ({ page }) => {
    await resetApp(page)

    await page.getByRole('button', { name: BTN.toggleTerminal }).click()

    const terminalPanel = page.locator(SEL.terminalPanel)
    await expect(terminalPanel).toBeVisible({ timeout: 10000 })
    await expect(terminalPanel).toHaveAttribute('data-pty-status', 'open', { timeout: 15000 })

    await page.getByRole('button', { name: 'Dividir terminal' }).click()

    const sash = page.getByRole('separator', { name: 'Redimensionar split do terminal' })
    await expect(sash).toBeVisible()

    const mainContainer = page.locator('.terminal-group-pane-main .terminal-container.is-active').first()
    const splitContainer = page.locator('.terminal-group-pane-split .terminal-container-split').first()
    await expect(mainContainer.locator('.xterm-rows')).toContainText(/[$>#]|user@/i, { timeout: 12000 })
    await expect(splitContainer.locator('.xterm-rows')).toContainText(/[$>#]|user@/i, { timeout: 15000 })

    const beforeMain = await mainContainer.boundingBox()
    const beforeSplit = await splitContainer.boundingBox()
    expect(beforeMain).toBeTruthy()
    expect(beforeSplit).toBeTruthy()

    const sashBox = await sash.boundingBox()
    expect(sashBox).toBeTruthy()

    await page.mouse.move(sashBox!.x + sashBox!.width / 2, sashBox!.y + sashBox!.height / 2)
    await page.mouse.down()
    await page.mouse.move(sashBox!.x + sashBox!.width / 2 + 120, sashBox!.y + sashBox!.height / 2, { steps: 8 })
    await page.mouse.up()

    await page.waitForTimeout(150)

    const afterMain = await mainContainer.boundingBox()
    const afterSplit = await splitContainer.boundingBox()
    expect(afterMain).toBeTruthy()
    expect(afterSplit).toBeTruthy()
    expect(afterMain!.width).toBeGreaterThan(beforeMain!.width + 40)
    expect(afterSplit!.width).toBeLessThan(beforeSplit!.width - 40)

    const splitTextarea = splitContainer.locator('textarea.xterm-helper-textarea')
    await splitTextarea.focus()
    const marker = `SASH_PROOF_${Date.now()}`
    await page.keyboard.type(`echo ${marker}`)
    await page.keyboard.press('Enter')
    await expect(splitContainer.locator('.xterm-rows')).toContainText(marker, { timeout: 12000 })

    await shot(page, 'sessao11d_split_sash_resize')
  })
})
