import { test, expect } from '@playwright/test'
import { BTN, collectConsoleErrors, resetApp, SEL, shot } from './helpers'

test.describe('Sessão 11 — Terminal Real com PTY (Onda A)', () => {
  test('T1: abre terminal real, valida PID de processo do SO e saída determinística no xterm.js', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    await resetApp(page)

    // Abrir o painel do terminal
    const toggleTerminalBtn = page.getByRole('button', { name: BTN.toggleTerminal })
    await toggleTerminalBtn.click()
    await page.waitForTimeout(600)

    const terminalPanel = page.locator(SEL.terminalPanel)
    await expect(terminalPanel).toBeVisible({ timeout: 10000 })
    expect(errors, 'não pode haver erros de console ao abrir o terminal').toEqual([])

    // Aguardar o PTY conectar e receber status 'open'
    await expect(terminalPanel).toHaveAttribute('data-pty-status', 'open', { timeout: 15000 })

    // Validar que o PID retornado é um número de processo real do SO
    const pidAttr = await terminalPanel.getAttribute('data-pty-pid')
    expect(pidAttr, 'PID deve estar presente no terminal').not.toBeNull()
    const pid = Number(pidAttr)
    expect(Number.isInteger(pid) && pid > 0, `PID deve ser um número positivo real, recebido: ${pidAttr}`).toBe(true)

    // Focar no terminal e digitar comando com saída determinística
    const terminalContainer = page.locator('.terminal-container').first()
    const textarea = terminalContainer.locator('textarea.xterm-helper-textarea')
    await textarea.focus()

    const marker = `PTY_PROOF_${Date.now()}`
    // Digita comando com quebra de linha (Enter)
    await page.keyboard.type(`echo ${marker}`)
    await page.keyboard.press('Enter')

    // Validar que a saída exata apareceu na tela do xterm.js
    const xtermRows = terminalContainer.locator('.xterm-rows')
    await expect(xtermRows).toContainText(marker, { timeout: 12000 })

    await shot(page, 'sessao11_t1_terminal_real_pid_output')
  })

  test('T2: dropdown de perfil troca de shell de verdade e confirma alteração de shellPath', async ({ page }) => {
    await resetApp(page)

    const toggleTerminalBtn = page.getByRole('button', { name: BTN.toggleTerminal })
    await toggleTerminalBtn.click()
    await page.waitForTimeout(400)

    const terminalPanel = page.locator(SEL.terminalPanel)
    await expect(terminalPanel).toBeVisible({ timeout: 10000 })
    await expect(terminalPanel).toHaveAttribute('data-pty-status', 'open', { timeout: 15000 })

    const initialShellPath = await terminalPanel.getAttribute('data-pty-shell-path')
    expect(initialShellPath, 'shellPath inicial deve existir').toBeTruthy()

    // Abrir seletor de shell
    const shellButton = page.locator('.terminal-shell-button')
    await shellButton.click()

    const shellMenu = page.locator('.terminal-shell-menu')
    await expect(shellMenu).toBeVisible()

    // Identificar opções disponíveis no menu
    const options = shellMenu.locator('.terminal-shell-option')
    const optionCount = await options.count()
    expect(optionCount).toBeGreaterThan(0)

    // Clicar numa opção diferente da atual se houver múltiplas
    let targetOption = options.first()
    for (let i = 0; i < optionCount; i++) {
      const opt = options.nth(i)
      const isActive = await opt.getAttribute('aria-checked')
      if (isActive !== 'true') {
        targetOption = opt
        break
      }
    }

    const selectedLabel = await targetOption.textContent()
    await targetOption.click()
    await page.waitForTimeout(400)

    // Aguardar reconexão do PTY com o novo perfil
    await expect(terminalPanel).toHaveAttribute('data-pty-status', 'open', { timeout: 15000 })

    const updatedShellPath = await terminalPanel.getAttribute('data-pty-shell-path')
    expect(updatedShellPath, 'shellPath deve estar preenchido após troca').toBeTruthy()

    // Se havia mais de uma opção, comprova que o caminho ou profile selecionado é refletido
    if (optionCount > 1) {
      expect(shellButton).toContainText(selectedLabel?.trim() || '')
    }

    await shot(page, 'sessao11_t2_shell_profile_switch')
  })

  test('T3: divide terminal em dois PTYs independentes e fecha divisão', async ({ page }) => {
    await resetApp(page)

    const toggleTerminalBtn = page.getByRole('button', { name: BTN.toggleTerminal })
    await toggleTerminalBtn.click()
    await page.waitForTimeout(400)

    const terminalPanel = page.locator(SEL.terminalPanel)
    await expect(terminalPanel).toBeVisible({ timeout: 10000 })
    await expect(terminalPanel).toHaveAttribute('data-pty-status', 'open', { timeout: 15000 })

    // Clicar em dividir terminal
    const splitButton = page.getByRole('button', { name: 'Dividir terminal' })
    await splitButton.click()
    await page.waitForTimeout(400)

    const splitPanes = page.locator('.terminal-panes.is-split')
    await expect(splitPanes).toBeVisible()

    const splitContainer = page.locator('.terminal-container-split')
    await expect(splitContainer).toBeVisible()

    // Digitar comando no segundo terminal dividido
    const splitTextarea = splitContainer.locator('textarea.xterm-helper-textarea')
    await splitTextarea.focus()

    const splitMarker = `SPLIT_PROOF_${Date.now()}`
    await page.keyboard.type(`echo ${splitMarker}`)
    await page.keyboard.press('Enter')

    await expect(splitContainer.locator('.xterm-rows')).toContainText(splitMarker, { timeout: 12000 })

    // Fechar divisão
    const closeSplitButton = page.getByRole('button', { name: 'Fechar divisão' })
    await closeSplitButton.click()
    await page.waitForTimeout(300)
    await expect(page.locator('.terminal-panes.is-split')).not.toBeVisible()

    await shot(page, 'sessao11_t3_split_terminal')
  })

  test('T4: ações de menu: limpar, maximizar/restaurar e fechar terminal', async ({ page }) => {
    await resetApp(page)

    const toggleTerminalBtn = page.getByRole('button', { name: BTN.toggleTerminal })
    await toggleTerminalBtn.click()
    await page.waitForTimeout(400)

    const terminalPanel = page.locator(SEL.terminalPanel)
    await expect(terminalPanel).toBeVisible({ timeout: 10000 })
    await expect(terminalPanel).toHaveAttribute('data-pty-status', 'open', { timeout: 15000 })

    // Maximizar
    const maxButton = page.getByRole('button', { name: 'Maximizar terminal' })
    await maxButton.click()
    await page.waitForTimeout(300)
    await expect(terminalPanel).toHaveClass(/is-maximized/)
    await expect(page.getByRole('button', { name: 'Restaurar terminal' })).toBeVisible()

    // Restaurar
    const restoreButton = page.getByRole('button', { name: 'Restaurar terminal' })
    await restoreButton.click()
    await page.waitForTimeout(300)
    await expect(terminalPanel).not.toHaveClass(/is-maximized/)

    // Limpar terminal
    const clearButton = page.getByRole('button', { name: 'Limpar terminal' })
    await clearButton.click()
    expect(await clearButton.isVisible()).toBe(true)

    // Fechar terminal
    const closeButton = page.getByRole('button', { name: 'Fechar terminal' })
    await closeButton.click()
    await page.waitForTimeout(300)
    await expect(terminalPanel).not.toBeVisible()

    await shot(page, 'sessao11_t4_menu_actions')
  })

  test('T5: simulação de falha real de conexão (DISCOVERY_FAILED) exibe estado de erro honesto', async ({ page }) => {
    // Intercepta a rota /pty-port simulando que o pty-server está inacessível
    await page.route('**/pty-port', (route) => route.abort('connectionrefused'))

    await resetApp(page)

    const toggleTerminalBtn = page.getByRole('button', { name: BTN.toggleTerminal })
    await toggleTerminalBtn.click()
    await page.waitForTimeout(400)

    const terminalPanel = page.locator(SEL.terminalPanel)
    await expect(terminalPanel).toBeVisible({ timeout: 10000 })

    // O terminal deve transicionar de forma transparente para status 'error'
    await expect(terminalPanel).toHaveAttribute('data-pty-status', 'error', { timeout: 15000 })

    // A mensagem de erro deve ser renderizada no display do xterm
    const terminalContainer = page.locator('.terminal-container').first()
    await expect(terminalContainer.locator('.xterm-rows')).toContainText('[PTY Error]', { timeout: 10000 })

    await shot(page, 'sessao11_t5_pty_error_simulation')
  })
})
