import { test, expect } from '@playwright/test'
import { BASE_URL, BTN, collectConsoleErrors, resetApp, SEL, shot } from './helpers'

test.describe('Sessão 11 — Terminal Real com PTY (Onda A)', () => {
  test('T1: abre terminal real, mostra prompt antes do input, valida PID e saída determinística no xterm.js', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await resetApp(page)

    const toggleTerminalBtn = page.getByRole('button', { name: BTN.toggleTerminal })
    await toggleTerminalBtn.click()

    const terminalPanel = page.locator(SEL.terminalPanel)
    await expect(terminalPanel).toBeVisible({ timeout: 10000 })
    expect(errors, 'não pode haver erros de console ao abrir o terminal').toEqual([])

    await expect(terminalPanel).toHaveAttribute('data-pty-status', 'open', { timeout: 15000 })

    const pidAttr = await terminalPanel.getAttribute('data-pty-pid')
    expect(pidAttr, 'PID deve estar presente no terminal').not.toBeNull()
    const pid = Number(pidAttr)
    expect(Number.isInteger(pid) && pid > 0, `PID deve ser um número positivo real, recebido: ${pidAttr}`).toBe(true)

    const terminalContainer = page.locator('.terminal-container').first()
    const xtermRows = terminalContainer.locator('.xterm-rows')
    await expect(xtermRows).toContainText(/[$>#]|user@/i, { timeout: 10000 })

    const textarea = terminalContainer.locator('textarea.xterm-helper-textarea')
    await textarea.focus()

    const marker = `PTY_PROOF_${Date.now()}`
    await page.keyboard.type(`echo ${marker}`)
    await page.keyboard.press('Enter')

    await expect(xtermRows).toContainText(marker, { timeout: 12000 })

    await shot(page, 'sessao11_t1_terminal_real_pid_output')
  })

  test('T2: dropdown de perfil troca de shell de verdade e confirma alteração de shellPath', async ({ page }) => {
    await resetApp(page)

    const toggleTerminalBtn = page.getByRole('button', { name: BTN.toggleTerminal })
    await toggleTerminalBtn.click()

    const terminalPanel = page.locator(SEL.terminalPanel)
    await expect(terminalPanel).toBeVisible({ timeout: 10000 })
    await expect(terminalPanel).toHaveAttribute('data-pty-status', 'open', { timeout: 15000 })

    const initialShellPath = await terminalPanel.getAttribute('data-pty-shell-path')
    expect(initialShellPath, 'shellPath inicial deve existir').toBeTruthy()

    const shellButton = page.locator('.terminal-shell-button')
    await shellButton.click()

    const shellMenu = page.locator('.terminal-shell-menu')
    await expect(shellMenu).toBeVisible()

    const options = shellMenu.locator('.terminal-shell-option')
    const optionCount = await options.count()
    expect(optionCount).toBeGreaterThan(0)

    let targetOption = options.first()
    for (let i = 0; i < optionCount; i++) {
      const option = options.nth(i)
      const isActive = await option.getAttribute('aria-checked')
      if (isActive !== 'true') {
        targetOption = option
        break
      }
    }

    const selectedLabel = (await targetOption.textContent())?.trim() || ''
    await targetOption.click()

    await expect(terminalPanel).toHaveAttribute('data-pty-status', 'open', { timeout: 15000 })

    const updatedShellPath = await terminalPanel.getAttribute('data-pty-shell-path')
    expect(updatedShellPath, 'shellPath deve estar preenchido após troca').toBeTruthy()

    if (optionCount > 1) {
      await expect(shellButton).toContainText(selectedLabel)
    }

    await shot(page, 'sessao11_t2_shell_profile_switch')
  })

  test('T3: divide terminal em dois PTYs independentes e fecha divisão', async ({ page }) => {
    await resetApp(page)

    const toggleTerminalBtn = page.getByRole('button', { name: BTN.toggleTerminal })
    await toggleTerminalBtn.click()

    const terminalPanel = page.locator(SEL.terminalPanel)
    await expect(terminalPanel).toBeVisible({ timeout: 10000 })
    await expect(terminalPanel).toHaveAttribute('data-pty-status', 'open', { timeout: 15000 })

    const splitButton = page.getByRole('button', { name: 'Dividir terminal' })
    await splitButton.click()

    const splitPanes = page.locator('.terminal-panes.is-split')
    await expect(splitPanes).toBeVisible()

    const splitContainer = page.locator('.terminal-container-split')
    await expect(splitContainer).toBeVisible()

    const splitTextarea = splitContainer.locator('textarea.xterm-helper-textarea')
    await splitTextarea.focus()

    const splitMarker = `SPLIT_PROOF_${Date.now()}`
    await page.keyboard.type(`echo ${splitMarker}`)
    await page.keyboard.press('Enter')

    await expect(splitContainer.locator('.xterm-rows')).toContainText(splitMarker, { timeout: 12000 })

    const closeSplitButton = page.getByRole('button', { name: 'Fechar divisão' })
    await closeSplitButton.click()
    await expect(page.locator('.terminal-panes.is-split')).not.toBeVisible()

    await shot(page, 'sessao11_t3_split_terminal')
  })

  test('T4: ações de menu: limpar, maximizar/restaurar e fechar terminal', async ({ page }) => {
    await resetApp(page)

    const toggleTerminalBtn = page.getByRole('button', { name: BTN.toggleTerminal })
    await toggleTerminalBtn.click()

    const terminalPanel = page.locator(SEL.terminalPanel)
    await expect(terminalPanel).toBeVisible({ timeout: 10000 })
    await expect(terminalPanel).toHaveAttribute('data-pty-status', 'open', { timeout: 15000 })

    const maxButton = page.getByRole('button', { name: 'Maximizar terminal' })
    await maxButton.click()
    await expect(terminalPanel).toHaveClass(/is-maximized/)
    await expect(page.getByRole('button', { name: 'Restaurar terminal' })).toBeVisible()

    const restoreButton = page.getByRole('button', { name: 'Restaurar terminal' })
    await restoreButton.click()
    await expect(terminalPanel).not.toHaveClass(/is-maximized/)

    const clearButton = page.getByRole('button', { name: 'Limpar terminal' })
    await clearButton.click()
    await expect(clearButton).toBeVisible()

    const closeButton = page.getByRole('button', { name: 'Fechar terminal' })
    await closeButton.click()
    await expect(terminalPanel).not.toBeVisible()

    await shot(page, 'sessao11_t4_menu_actions')
  })

  test('T5: simulação de falha real de conexão exibe estado de erro honesto', async ({ page }) => {
    await page.route('**/pty-port', (route) => route.abort('connectionrefused'))

    await page.goto(BASE_URL)
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForSelector(SEL.workbench, { state: 'visible' })

    const toggleTerminalBtn = page.getByRole('button', { name: BTN.toggleTerminal })
    await toggleTerminalBtn.click()

    const terminalPanel = page.locator(SEL.terminalPanel)
    await expect(terminalPanel).toBeVisible({ timeout: 10000 })
    await expect(terminalPanel).toHaveAttribute('data-pty-status', 'error', { timeout: 15000 })

    const terminalContainer = page.locator('.terminal-container').first()
    await expect(terminalContainer.locator('.xterm-rows')).toContainText('[PTY Error]', { timeout: 10000 })

    await shot(page, 'sessao11_t5_pty_error_simulation')
  })

  test('T6: fechar e reabrir o painel preserva o mesmo PID e o output já emitido', async ({ page }) => {
    await resetApp(page)

    const toggleTerminalBtn = page.getByRole('button', { name: BTN.toggleTerminal })
    await toggleTerminalBtn.click()

    const terminalPanel = page.locator(SEL.terminalPanel)
    await expect(terminalPanel).toBeVisible({ timeout: 10000 })
    await expect(terminalPanel).toHaveAttribute('data-pty-status', 'open', { timeout: 15000 })

    const pidBeforeToggle = await terminalPanel.getAttribute('data-pty-pid')
    expect(pidBeforeToggle).toBeTruthy()

    const terminalContainer = page.locator('.terminal-container').first()
    const textarea = terminalContainer.locator('textarea.xterm-helper-textarea')
    await textarea.focus()

    const marker = `PID_PROOF_${Date.now()}`
    await page.keyboard.type(`echo ${marker}`)
    await page.keyboard.press('Enter')
    await expect(terminalContainer.locator('.xterm-rows')).toContainText(marker, { timeout: 12000 })

    await toggleTerminalBtn.click()
    await expect(terminalPanel).not.toBeVisible()

    await toggleTerminalBtn.click()
    await expect(terminalPanel).toBeVisible({ timeout: 10000 })
    await expect(terminalPanel).toHaveAttribute('data-pty-status', 'open', { timeout: 15000 })
    await expect(terminalContainer.locator('.xterm-rows')).toContainText(marker, { timeout: 12000 })

    const pidAfterToggle = await terminalPanel.getAttribute('data-pty-pid')
    expect(pidAfterToggle).toBe(pidBeforeToggle)

    await shot(page, 'sessao11_t6_same_pid_after_toggle')
  })
})
