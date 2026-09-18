import { test, expect } from '@playwright/test'
import { BTN, collectConsoleErrors, resetApp, SEL, shot } from './helpers'

test.describe('Sessão 11F — menu de contexto do terminal', () => {
  test('abre o menu de contexto com as ações esperadas e fecha com Escape', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await resetApp(page)

    await page.getByRole('button', { name: BTN.toggleTerminal }).click()
    const terminalPanel = page.locator(SEL.terminalPanel)
    await expect(terminalPanel).toBeVisible({ timeout: 10000 })
    await expect(terminalPanel).toHaveAttribute('data-pty-status', 'open', { timeout: 15000 })

    const terminal = page.locator('.terminal-container.is-active').first()
    await terminal.click({ button: 'right', position: { x: 32, y: 32 } })

    const menu = page.getByRole('menu', { name: 'Ações do terminal' })
    await expect(menu).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: 'Copiar' })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: 'Colar' })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: 'Selecionar tudo' })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: 'Limpar terminal' })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: 'Encerrar processo' })).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()

    expect(errors).toEqual([])
    await shot(page, 'sessao11f_context_menu_open_close')
  })

  test('encerrar processo pelo menu mantém o layout estável e entra em closed', async ({ page }) => {
    await resetApp(page)

    await page.getByRole('button', { name: BTN.toggleTerminal }).click()
    const terminalPanel = page.locator(SEL.terminalPanel)
    await expect(terminalPanel).toBeVisible({ timeout: 10000 })
    await expect(terminalPanel).toHaveAttribute('data-pty-status', 'open', { timeout: 15000 })

    const terminal = page.locator('.terminal-container.is-active').first()
    await terminal.click({ button: 'right', position: { x: 32, y: 32 } })
    await page.getByRole('menuitem', { name: 'Encerrar processo' }).click()

    await expect(terminalPanel).toHaveAttribute('data-pty-status', 'closed', { timeout: 15000 })
    await expect(page.getByRole('status')).toContainText('Processo encerrado', { timeout: 10000 })
    await expect(page.locator('.terminal-container.is-active')).toHaveAttribute('data-pty-status', 'closed')

    await shot(page, 'sessao11f_context_menu_kill_closed')
  })
})
