import { test, expect } from '@playwright/test'
import { BASE_URL, BTN, SEL } from './helpers'

test.describe('Gate 0 - Terminal Real Validation', () => {
  test('valida conectividade, prompt antes do input e persistência do mesmo PTY', async ({ page }) => {
    await page.goto(BASE_URL)

    const terminalToggle = page.getByRole('button', { name: BTN.toggleTerminal })
    await terminalToggle.click()

    const terminalPanel = page.locator(SEL.terminalPanel)
    await expect(terminalPanel).toBeVisible({ timeout: 10000 })
    await expect(terminalPanel).toHaveAttribute('data-pty-status', 'open', { timeout: 15000 })

    const terminalRows = page.locator('.xterm-rows').first()
    await expect(terminalRows).toContainText(/[$>#]|user@/i, { timeout: 10000 })

    const pidBeforeToggle = await terminalPanel.getAttribute('data-pty-pid')
    expect(pidBeforeToggle).not.toBeNull()

    const textarea = page.locator('.terminal-container').first().locator('textarea.xterm-helper-textarea')
    await textarea.focus()
    await page.keyboard.type('echo GATE0_TEST')
    await page.keyboard.press('Enter')

    await expect(terminalRows).toContainText('GATE0_TEST', { timeout: 10000 })

    await terminalToggle.click()
    await expect(terminalPanel).not.toBeVisible()

    await terminalToggle.click()
    await expect(terminalPanel).toBeVisible({ timeout: 10000 })
    await expect(terminalPanel).toHaveAttribute('data-pty-status', 'open', { timeout: 15000 })
    await expect(terminalRows).toContainText('GATE0_TEST', { timeout: 10000 })

    const pidAfterToggle = await terminalPanel.getAttribute('data-pty-pid')
    expect(pidAfterToggle).toBe(pidBeforeToggle)
  })
})
