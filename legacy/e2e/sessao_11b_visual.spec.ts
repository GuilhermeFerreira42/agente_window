import { test, expect } from '@playwright/test'
import { BTN, resetApp, SEL, shot } from './helpers'

test.describe('Sessão 11B — Paridade visual / multi-instância do terminal', () => {
  test('abre 2 terminais, alterna abas e preserva PIDs/scrollback por instância', async ({ page }) => {
    await resetApp(page)

    await page.getByRole('button', { name: BTN.toggleTerminal }).click()

    const terminalPanel = page.locator(SEL.terminalPanel)
    await expect(terminalPanel).toBeVisible({ timeout: 10000 })
    await expect(terminalPanel).toHaveAttribute('data-pty-status', 'open', { timeout: 15000 })

    const firstContainer = page.locator('.terminal-container.is-active').first()
    const firstRows = firstContainer.locator('.xterm-rows')
    await expect(firstRows).toContainText(/[$>#]|user@/i, { timeout: 10000 })

    const pidFirst = await terminalPanel.getAttribute('data-pty-pid')
    expect(pidFirst).toBeTruthy()

    await firstContainer.locator('textarea.xterm-helper-textarea').focus()
    const markerOne = `TAB_ONE_${Date.now()}`
    await page.keyboard.type(`echo ${markerOne}`)
    await page.keyboard.press('Enter')
    await expect(firstRows).toContainText(markerOne, { timeout: 12000 })

    await page.getByRole('button', { name: 'Novo terminal' }).click()

    const instanceTablist = page.getByRole('tablist', { name: 'Terminais abertos' })
    await expect(instanceTablist.getByRole('tab')).toHaveCount(2)

    const pidSecond = await terminalPanel.getAttribute('data-pty-pid')
    expect(pidSecond).toBeTruthy()
    expect(pidSecond).not.toBe(pidFirst)

    const secondContainer = page.locator('.terminal-container.is-active').first()
    const secondRows = secondContainer.locator('.xterm-rows')
    await expect(secondRows).toContainText(/[$>#]|user@/i, { timeout: 12000 })

    await secondContainer.locator('textarea.xterm-helper-textarea').focus()
    const markerTwo = `TAB_TWO_${Date.now()}`
    await page.keyboard.type(`echo ${markerTwo}`)
    await page.keyboard.press('Enter')
    await expect(secondRows).toContainText(markerTwo, { timeout: 12000 })

    await instanceTablist.getByRole('tab', { name: 'Terminal bash' }).click()
    await expect(terminalPanel).toHaveAttribute('data-pty-pid', pidFirst!)
    await expect(page.locator('.terminal-container.is-active').first().locator('.xterm-rows')).toContainText(markerOne, { timeout: 12000 })

    await shot(page, 'sessao11b_tabs_multi_terminal')
  })
})
