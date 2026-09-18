import { test, expect } from '@playwright/test'
import { BTN, resetApp, SEL, shot } from './helpers'

test.describe('Sessão 11C — clear ativo sem ressuscitar output', () => {
  test('faz split, limpa só a pane focada e o conteúdo limpo não volta após toggle do painel', async ({ page }) => {
    await resetApp(page)

    const toggleTerminalBtn = page.getByRole('button', { name: BTN.toggleTerminal })
    await toggleTerminalBtn.click()

    const terminalPanel = page.locator(SEL.terminalPanel)
    await expect(terminalPanel).toBeVisible({ timeout: 10000 })
    await expect(terminalPanel).toHaveAttribute('data-pty-status', 'open', { timeout: 15000 })

    const mainContainer = page.locator('.terminal-container.is-active').first()
    const mainRows = mainContainer.locator('.xterm-rows')
    await expect(mainRows).toContainText(/[$>#]|user@/i, { timeout: 10000 })

    await mainContainer.locator('textarea.xterm-helper-textarea').focus()
    const mainMarker = `MAIN_CLEAR_${Date.now()}`
    await page.keyboard.type(`echo ${mainMarker}`)
    await page.keyboard.press('Enter')
    await expect(mainRows).toContainText(mainMarker, { timeout: 12000 })

    await page.getByRole('button', { name: 'Dividir terminal' }).click()
    const splitContainer = page.locator('.terminal-container-split')
    await expect(splitContainer).toBeVisible({ timeout: 10000 })

    const splitRows = splitContainer.locator('.xterm-rows')
    await expect(splitRows).toContainText(/[$>#]|user@/i, { timeout: 15000 })

    const splitTextarea = splitContainer.locator('textarea.xterm-helper-textarea')
    await splitTextarea.focus()

    const splitMarker = `SPLIT_CLEAR_${Date.now()}`
    await page.keyboard.type(`echo ${splitMarker}`)
    await page.keyboard.press('Enter')
    await expect(splitRows).toContainText(splitMarker, { timeout: 12000 })

    await page.getByRole('button', { name: 'Limpar terminal' }).click()
    await expect(splitRows).not.toContainText(splitMarker, { timeout: 10000 })
    await expect(mainRows).toContainText(mainMarker, { timeout: 10000 })

    await toggleTerminalBtn.click()
    await expect(terminalPanel).not.toBeVisible()

    await toggleTerminalBtn.click()
    await expect(terminalPanel).toBeVisible({ timeout: 10000 })
    await expect(terminalPanel).toHaveAttribute('data-pty-status', 'open', { timeout: 15000 })

    await expect(mainRows).toContainText(mainMarker, { timeout: 12000 })
    await expect(splitRows).not.toContainText(splitMarker, { timeout: 10000 })

    await splitTextarea.focus()
    const afterClearMarker = `AFTER_CLEAR_${Date.now()}`
    await page.keyboard.type(`echo ${afterClearMarker}`)
    await page.keyboard.press('Enter')
    await expect(splitRows).toContainText(afterClearMarker, { timeout: 12000 })

    await shot(page, 'sessao11c_clear_ativo_sem_ressuscitar')
  })
})
