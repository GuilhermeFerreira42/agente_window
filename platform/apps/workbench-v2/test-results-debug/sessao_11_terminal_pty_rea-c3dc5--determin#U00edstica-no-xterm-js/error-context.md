# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: sessao_11_terminal_pty_real.spec.ts >> Sessão 11 — Terminal Real com PTY (Onda A) >> T1: abre terminal real, valida PID de processo do SO e saída determinística no xterm.js
- Location: e2e\sessao_11_terminal_pty_real.spec.ts:5:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.terminal-panel')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('.terminal-panel')

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | import { BTN, collectConsoleErrors, resetApp, SEL, shot } from './helpers'
  3   | 
  4   | test.describe('Sessão 11 — Terminal Real com PTY (Onda A)', () => {
  5   |   test('T1: abre terminal real, valida PID de processo do SO e saída determinística no xterm.js', async ({ page }) => {
  6   |     const errors = collectConsoleErrors(page)
  7   |     await resetApp(page)
  8   | 
  9   |     // Abrir o painel do terminal
  10  |     const toggleTerminalBtn = page.getByRole('button', { name: BTN.toggleTerminal })
  11  |     await toggleTerminalBtn.click()
  12  |     await page.waitForTimeout(600)
  13  | 
  14  |     const terminalPanel = page.locator(SEL.terminalPanel)
> 15  |     await expect(terminalPanel).toBeVisible({ timeout: 10000 })
      |                                 ^ Error: expect(locator).toBeVisible() failed
  16  |     expect(errors, 'não pode haver erros de console ao abrir o terminal').toEqual([])
  17  | 
  18  |     // Aguardar o PTY conectar e receber status 'open'
  19  |     await expect(terminalPanel).toHaveAttribute('data-pty-status', 'open', { timeout: 15000 })
  20  | 
  21  |     // Validar que o PID retornado é um número de processo real do SO
  22  |     const pidAttr = await terminalPanel.getAttribute('data-pty-pid')
  23  |     expect(pidAttr, 'PID deve estar presente no terminal').not.toBeNull()
  24  |     const pid = Number(pidAttr)
  25  |     expect(Number.isInteger(pid) && pid > 0, `PID deve ser um número positivo real, recebido: ${pidAttr}`).toBe(true)
  26  | 
  27  |     // Focar no terminal e digitar comando com saída determinística
  28  |     const terminalContainer = page.locator('.terminal-container').first()
  29  |     const textarea = terminalContainer.locator('textarea.xterm-helper-textarea')
  30  |     await textarea.focus()
  31  | 
  32  |     const marker = `PTY_PROOF_${Date.now()}`
  33  |     // Digita comando com quebra de linha (Enter)
  34  |     await page.keyboard.type(`echo ${marker}`)
  35  |     await page.keyboard.press('Enter')
  36  | 
  37  |     // Validar que a saída exata apareceu na tela do xterm.js
  38  |     const xtermRows = terminalContainer.locator('.xterm-rows')
  39  |     await expect(xtermRows).toContainText(marker, { timeout: 12000 })
  40  | 
  41  |     await shot(page, 'sessao11_t1_terminal_real_pid_output')
  42  |   })
  43  | 
  44  |   test('T2: dropdown de perfil troca de shell de verdade e confirma alteração de shellPath', async ({ page }) => {
  45  |     await resetApp(page)
  46  | 
  47  |     const toggleTerminalBtn = page.getByRole('button', { name: BTN.toggleTerminal })
  48  |     await toggleTerminalBtn.click()
  49  |     await page.waitForTimeout(400)
  50  | 
  51  |     const terminalPanel = page.locator(SEL.terminalPanel)
  52  |     await expect(terminalPanel).toBeVisible({ timeout: 10000 })
  53  |     await expect(terminalPanel).toHaveAttribute('data-pty-status', 'open', { timeout: 15000 })
  54  | 
  55  |     const initialShellPath = await terminalPanel.getAttribute('data-pty-shell-path')
  56  |     expect(initialShellPath, 'shellPath inicial deve existir').toBeTruthy()
  57  | 
  58  |     // Abrir seletor de shell
  59  |     const shellButton = page.locator('.terminal-shell-button')
  60  |     await shellButton.click()
  61  | 
  62  |     const shellMenu = page.locator('.terminal-shell-menu')
  63  |     await expect(shellMenu).toBeVisible()
  64  | 
  65  |     // Identificar opções disponíveis no menu
  66  |     const options = shellMenu.locator('.terminal-shell-option')
  67  |     const optionCount = await options.count()
  68  |     expect(optionCount).toBeGreaterThan(0)
  69  | 
  70  |     // Clicar numa opção diferente da atual se houver múltiplas
  71  |     let targetOption = options.first()
  72  |     for (let i = 0; i < optionCount; i++) {
  73  |       const opt = options.nth(i)
  74  |       const isActive = await opt.getAttribute('aria-checked')
  75  |       if (isActive !== 'true') {
  76  |         targetOption = opt
  77  |         break
  78  |       }
  79  |     }
  80  | 
  81  |     const selectedLabel = await targetOption.textContent()
  82  |     await targetOption.click()
  83  |     await page.waitForTimeout(400)
  84  | 
  85  |     // Aguardar reconexão do PTY com o novo perfil
  86  |     await expect(terminalPanel).toHaveAttribute('data-pty-status', 'open', { timeout: 15000 })
  87  | 
  88  |     const updatedShellPath = await terminalPanel.getAttribute('data-pty-shell-path')
  89  |     expect(updatedShellPath, 'shellPath deve estar preenchido após troca').toBeTruthy()
  90  | 
  91  |     // Se havia mais de uma opção, comprova que o caminho ou profile selecionado é refletido
  92  |     if (optionCount > 1) {
  93  |       expect(shellButton).toContainText(selectedLabel?.trim() || '')
  94  |     }
  95  | 
  96  |     await shot(page, 'sessao11_t2_shell_profile_switch')
  97  |   })
  98  | 
  99  |   test('T3: divide terminal em dois PTYs independentes e fecha divisão', async ({ page }) => {
  100 |     await resetApp(page)
  101 | 
  102 |     const toggleTerminalBtn = page.getByRole('button', { name: BTN.toggleTerminal })
  103 |     await toggleTerminalBtn.click()
  104 |     await page.waitForTimeout(400)
  105 | 
  106 |     const terminalPanel = page.locator(SEL.terminalPanel)
  107 |     await expect(terminalPanel).toBeVisible({ timeout: 10000 })
  108 |     await expect(terminalPanel).toHaveAttribute('data-pty-status', 'open', { timeout: 15000 })
  109 | 
  110 |     // Clicar em dividir terminal
  111 |     const splitButton = page.getByRole('button', { name: 'Dividir terminal' })
  112 |     await splitButton.click()
  113 |     await page.waitForTimeout(400)
  114 | 
  115 |     const splitPanes = page.locator('.terminal-panes.is-split')
```