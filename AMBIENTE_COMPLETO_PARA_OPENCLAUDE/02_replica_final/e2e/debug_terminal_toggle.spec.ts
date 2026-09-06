import { test, expect } from '@playwright/test'
import { BTN } from './helpers'

test('DEBUG: diagnostico do toggle do terminal', async ({ page }) => {
  // Capturar erros desde o início
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', err => pageErrors.push(err.message))

  await page.goto('http://localhost:5173')
  await page.evaluate(() => localStorage.clear())
  await page.reload()

  // Aguardar o workbench aparecer
  try {
    await page.waitForSelector('.agent-sessions-workbench', { state: 'visible', timeout: 10000 })
    console.log('✅ workbench encontrado')
  } catch {
    const bodyText = await page.evaluate(() => document.body?.innerHTML?.slice(0, 1000) || 'body vazio')
    console.log('❌ workbench NÃO encontrado! Body:', bodyText)
  }

  await page.waitForTimeout(500)

  // Verificar se o botão toggle existe
  const toggleBtn = page.getByRole('button', { name: BTN.toggleTerminal })
  try {
    await expect(toggleBtn).toBeVisible({ timeout: 5000 })
    console.log('✅ toggleTerminalBtn encontrado')
  } catch {
    console.log('❌ toggleTerminalBtn NÃO encontrado')
    // Listar todos os botões no DOM
    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).map(b => b.getAttribute('aria-label') + ' / ' + b.textContent)
    })
    console.log('Botões no DOM:', JSON.stringify(buttons))
  }

  // Captura o estado antes do clique
  const countBefore = await page.locator('.terminal-panel').count()
  console.log(`Estado antes do clique: .terminal-panel count = ${countBefore}`)

  await toggleBtn.click()
  await page.waitForTimeout(1500)

  // Captura o estado depois do clique
  const countAfter = await page.locator('.terminal-panel').count()
  console.log(`Estado após clique (1.5s depois): .terminal-panel count = ${countAfter}`)

  // Verificar toda a estrutura HTML do workbench para entender o DOM
  const workbenchInfo = await page.evaluate(() => {
    const workbench = document.querySelector('.agent-sessions-workbench')
    if (!workbench) return { found: false, html: document.body?.innerHTML?.slice(-500) || '' }
    return { found: true, html: workbench.innerHTML.slice(-1500) }
  })
  if (workbenchInfo.found) {
    console.log('Fim do workbench HTML:', workbenchInfo.html.slice(-600))
  } else {
    console.log('Workbench NÃO encontrado depois do clique. Body tail:', workbenchInfo.html)
  }

  // Erros capturados
  console.log('Console errors:', consoleErrors)
  console.log('Page errors:', pageErrors)

  // o assert real
  expect(countAfter, 'O terminal deve aparecer no DOM após clicar no toggle').toBeGreaterThan(0)
})
