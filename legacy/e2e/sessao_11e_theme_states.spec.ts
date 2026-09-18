import { test, expect } from '@playwright/test'
import { BTN, collectConsoleErrors, resetApp, SEL, shot } from './helpers'

test.describe('Sessão 11E — tema reativo e estados closed/error', () => {
  test('troca para tema claro sem recriar os PTYs das instâncias abertas', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await resetApp(page)

    await page.getByRole('button', { name: BTN.toggleTerminal }).click()
    const terminalPanel = page.locator(SEL.terminalPanel)
    await expect(terminalPanel).toBeVisible({ timeout: 10000 })
    await expect(terminalPanel).toHaveAttribute('data-pty-status', 'open', { timeout: 15000 })

    await page.getByRole('button', { name: 'Novo terminal' }).click()
    const terminalZero = page.locator('[data-pty-session-id$=":0"]').first()
    const terminalOne = page.locator('[data-pty-session-id$=":1"]').first()
    await expect(terminalZero).toHaveAttribute('data-pty-pid', /\d+/, { timeout: 15000 })
    await expect(terminalOne).toHaveAttribute('data-pty-pid', /\d+/, { timeout: 15000 })

    const pid0Before = await terminalZero.getAttribute('data-pty-pid')
    const pid1Before = await terminalOne.getAttribute('data-pty-pid')
    const darkBackground = await page.evaluate(() => getComputedStyle(document.querySelector('.terminal-container.is-active .xterm-scrollable-element') as Element).backgroundColor)
    expect(darkBackground).toBe('rgb(30, 30, 30)')

    await page.getByRole('button', { name: 'Mudar para tema claro' }).click()
    await expect(page.locator('html')).toHaveClass(/theme-light/)
    await expect(page.getByRole('button', { name: 'Mudar para tema escuro' })).toBeVisible()

    await expect.poll(async () => page.evaluate(() => getComputedStyle(document.querySelector('.terminal-container.is-active .xterm-scrollable-element') as Element).backgroundColor)).toBe('rgb(255, 255, 255)')

    expect(await terminalZero.getAttribute('data-pty-pid')).toBe(pid0Before)
    expect(await terminalOne.getAttribute('data-pty-pid')).toBe(pid1Before)

    await page.getByRole('tab', { name: 'Terminal Bash' }).click()
    await expect(terminalPanel).toHaveAttribute('data-pty-pid', pid0Before!)
    await page.getByRole('tab', { name: /Terminal 2: Bash/ }).click()
    await expect(terminalPanel).toHaveAttribute('data-pty-pid', pid1Before!)

    expect(errors).toEqual([])
    await shot(page, 'sessao11e_theme_light_same_pids')
  })

  test('quando o shell encerra, mantém o painel estável e preserva o scrollback visível', async ({ page }) => {
    await resetApp(page)

    await page.getByRole('button', { name: BTN.toggleTerminal }).click()
    const terminalPanel = page.locator(SEL.terminalPanel)
    await expect(terminalPanel).toBeVisible({ timeout: 10000 })
    await expect(terminalPanel).toHaveAttribute('data-pty-status', 'open', { timeout: 15000 })

    const terminalContainer = page.locator('.terminal-container.is-active').first()
    const rows = terminalContainer.locator('.xterm-rows')
    await expect(rows).toContainText(/[$>#]|user@/i, { timeout: 10000 })

    const textarea = terminalContainer.locator('textarea.xterm-helper-textarea')
    await textarea.focus()
    const marker = `EXIT_PROOF_${Date.now()}`
    await page.keyboard.type(`echo ${marker}`)
    await page.keyboard.press('Enter')
    await expect(rows).toContainText(marker, { timeout: 12000 })

    await page.keyboard.type('exit')
    await page.keyboard.press('Enter')

    await expect(terminalPanel).toHaveAttribute('data-pty-status', 'closed', { timeout: 15000 })
    await expect(rows).toContainText(marker, { timeout: 12000 })
    await expect(page.getByRole('status')).toContainText('Processo encerrado', { timeout: 10000 })

    await shot(page, 'sessao11e_closed_state_scrollback')
  })
})
