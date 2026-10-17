// FATIA 08 — CONTRATO DE ABERTURA das superfícies (DEBT-04 · D88 · A1).
//
// A régua que faltava em 15/10: não basta a superfície "abrir" — o contrato é ONDE e
// COMO ela abre. Este arquivo existe porque o DEBT-04 passou por dois pares de olhos:
// os testes olhavam aba visível + console limpo, nunca a geometria.
//
// Travas cobertas:
//   T1 (A1)  — com Provedores aberto, a tela de sessão nova NÃO sobe (geometria medida).
//   T2 (D88) — editor já aberto em modo maximizado → Provedores abre maximizado.
//   T3 (D88) — o último modo é LEMBRADO após reload; com o editor fechado, abre nele.
//   T4 (D88) — quem nunca maximizou abre em modo anexo (padrão de fábrica; nada de forçar).
import { expect, test, type Page } from '@playwright/test'
import { resetApp, shot } from './helpers'

/** Abre uma sessão existente (o banco do servidor tem sessões semeadas). */
async function abrirSessao(page: Page) {
  await resetApp(page)
  await page.locator('.session-row').first().click()
  await page.waitForTimeout(300)
}

/** Abre a tela "Nova sessão" (+ global). */
async function abrirLanding(page: Page) {
  await resetApp(page)
  await page.getByRole('button', { name: /Nova sessão/ }).first().click()
  await expect(page.locator('.session-landing')).toBeVisible()
}

/** Conta ▸ Provedores (aba GLOBAL do editor — o caso do DEBT-09/DEBT-04). */
async function abrirProvedores(page: Page) {
  await page.getByRole('button', { name: 'Conta' }).click()
  await page.getByRole('menuitem', { name: 'Provedores' }).click()
  await expect(page.locator('.providers-view')).toBeVisible()
}

/** Abre uma aba no editor CENTRAL (Branch Changes) para haver barra de editor. */
async function abrirAbaNoEditor(page: Page) {
  await page.getByRole('button', { name: 'Abrir alterações no editor' }).click()
  await expect(page.locator('.editor-pane')).toBeVisible()
}

/**
 * Geometria da landing: (a) ela preenche a coluna? (b) o conteúdo está no centro dela?
 * Antes do fix: 353 px numa coluna de 909 (ratio 0,39) e conteúdo a ~305 px do centro.
 */
async function medirLanding(page: Page) {
  return page.evaluate(() => {
    const landing = document.querySelector('.session-landing')?.getBoundingClientRect()
    const center = document.querySelector('.session-landing-center')?.getBoundingClientRect()
    const grupo = document.querySelector('.desktop-surface-group')?.getBoundingClientRect()
    if (!landing || !center || !grupo) return null
    return {
      alturaLanding: Math.round(landing.height),
      alturaGrupo: Math.round(grupo.height),
      desvioDoCentro: Math.round(Math.abs((center.y + center.height / 2) - (grupo.y + grupo.height / 2))),
    }
  })
}

  test('T1 (A1/DEBT-04): com Provedores aberto a tela de sessão nova NÃO sobe — segue centralizada', async ({ page }) => {
  await abrirLanding(page)
  const antes = await medirLanding(page)
  expect(antes, 'landing precisa existir para medir').not.toBeNull()
  // Baseline: sozinha, a landing já preenche a coluna e fica centrada.
  expect(antes!.alturaLanding / antes!.alturaGrupo).toBeGreaterThan(0.9)

  await abrirProvedores(page)
  const depois = await medirLanding(page)
  expect(depois, 'landing some quando o Provedores abre? (não deve: a sessão continua)').not.toBeNull()
  // A TRAVA que faltava: ocupa a coluna inteira e o conteúdo NÃO cola no topo.
  expect(depois!.alturaLanding / depois!.alturaGrupo).toBeGreaterThan(0.9)
  expect(depois!.desvioDoCentro).toBeLessThan(80)
  await shot(page, 'modo_abertura_t1_landing_centrada')
})

  test('T2 (D88): editor já aberto em modo maximizado → Provedores abre maximizado (chat fora de cena)', async ({ page }) => {
  await abrirSessao(page)
  await abrirAbaNoEditor(page)
  await page.getByRole('button', { name: 'Maximizar editor' }).click()
  await expect(page.locator('.desktop-surface-group.editor-maximized')).toBeVisible()
  await abrirProvedores(page)
  // Continua maximizado depois de abrir a superfície.
  await expect(page.locator('.desktop-surface-group.editor-maximized')).toHaveCount(1)
  await expect(page.locator('.providers-view')).toBeVisible()
  // No maximizado o chat sai de cena (é o comportamento que o dono descreveu em D88).
  await expect(page.locator('.chat-pane, .session-landing')).toHaveCount(0)
  await shot(page, 'modo_abertura_t2_maximizado')
})

  test('T3 (D88): o último modo é LEMBRADO após reload — com o editor fechado, Provedores abre maximizado', async ({ page }) => {
  await abrirSessao(page)
  await abrirAbaNoEditor(page)
  await page.getByRole('button', { name: 'Maximizar editor' }).click()
  await expect(page.locator('.desktop-surface-group.editor-maximized')).toBeVisible()

  // Recarrega SEM limpar o localStorage (é exatamente o "fechou e abriu o app").
  await page.reload()
  await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' })
  await page.waitForSelector('.session-row', { state: 'attached' })

  const guardado = await page.evaluate(() => JSON.parse(localStorage.getItem('workbench.sessions.layout.v1') ?? '{}'))
  expect(guardado?.shell?.centerEditorMaximized, 'o modo maximizado tem de sobreviver ao reload (D88)').toBe(true)

  await abrirProvedores(page)
  await expect(page.locator('.desktop-surface-group.editor-maximized')).toHaveCount(1)
  await expect(page.locator('.providers-view')).toBeVisible()
  await shot(page, 'modo_abertura_t3_memoria')
})

  test('T4 (D88): quem nunca maximizou abre em modo anexo (padrão de fábrica, sem forçar maximizado)', async ({ page }) => {
  await abrirSessao(page)
  await abrirAbaNoEditor(page)
  await abrirProvedores(page)
  await expect(page.locator('.desktop-surface-group.editor-maximized')).toHaveCount(0)
  await expect(page.locator('.chat-pane')).toBeVisible()
  await shot(page, 'modo_abertura_t4_anexo')
})
