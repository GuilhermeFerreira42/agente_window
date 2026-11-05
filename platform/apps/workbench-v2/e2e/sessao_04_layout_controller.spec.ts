import { expect, test } from '@playwright/test'
import {
  BTN,
  SEL,
  activeSessionId,
  collectConsoleErrors,
  openApp,
  readSessionLayouts,
  resetApp,
  shot,
} from './helpers'

test.describe('Sessão 04 — Layout Controller', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page)
  })

  test('T1: a barra auxiliar é lembrada por sessão (capture/restore)', async ({ page }) => {
    const rows = page.locator(SEL.sessionRow)
    const s1 = rows.nth(0)
    const s2 = rows.nth(1)

    await s1.click()
    await page.getByRole('button', { name: BTN.abrirAlteracoes }).click()
    await page.waitForTimeout(300)
    const auxOnS1 = (await page.locator(SEL.auxiliaryBar).count()) > 0
    expect(auxOnS1, 'a sessão 1 deve ficar com a barra auxiliar aberta').toBe(true)

    // Na s2, fecha a barra auxiliar.
    await s2.click()
    await page.waitForTimeout(300)
    if ((await page.locator(SEL.auxiliaryBar).count()) > 0) {
      await page.getByRole('button', { name: BTN.toggleAux }).click()
      await page.waitForTimeout(300)
    }
    expect(await page.locator(SEL.auxiliaryBar).count(), 'a sessão 2 deve ficar sem barra auxiliar').toBe(0)

    // Voltar para s1 tem que restaurar a barra auxiliar dela.
    await s1.click()
    await page.waitForTimeout(400)
    expect(await page.locator(SEL.auxiliaryBar).count(), 'voltar para a s1 deve restaurar a barra auxiliar').toBe(1)
    await shot(page, 'sessao04_T1_memoria_por_sessao')
  })

  test('T2: alternar entre 4 sessões não gera erro de runtime', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    const rows = page.locator(SEL.sessionRow)
    const total = Math.min(4, await rows.count())

    for (let i = 0; i < total; i++) {
      await rows.nth(i).click()
      await page.waitForTimeout(200)
      await expect(page.locator(SEL.chatPane), 'o chat da sessão deve continuar renderizado').toBeVisible()
    }
    expect(errors, 'trocar de sessão não pode lançar erro').toEqual([])
    await shot(page, 'sessao04_T2_troca_sessoes')
  })

  test('T3: sessionLayouts é gravado por sessionId no localStorage (B3/B4)', async ({ page }) => {
    const rows = page.locator(SEL.sessionRow)
    const id1 = await rows.nth(0).getAttribute('data-session-id')
    const id2 = await rows.nth(1).getAttribute('data-session-id')

    await rows.nth(0).click()
    await page.getByRole('button', { name: BTN.abrirAlteracoes }).click()
    await page.waitForTimeout(300)
    await rows.nth(1).click()
    await page.waitForTimeout(300)
    await rows.nth(0).click()
    await page.waitForTimeout(400)

    const map = await readSessionLayouts(page)
    expect(map, 'workbench.sessions.layouts.v1 deve existir').toBeTruthy()
    expect(Object.keys(map).length, 'deve haver layout salvo por sessão').toBeGreaterThanOrEqual(1)
    expect(Object.keys(map), 'a sessão visitada deve estar no mapa').toContain(id1!)
    const entry = map[id1!] ?? map[id2!]
    expect(typeof entry.auxiliaryVisible, 'o layout salvo guarda a visibilidade da aux').toBe('boolean')
    await shot(page, 'sessao04_T3_session_layouts')
  })

  test('T4: alternar a barra auxiliar não derruba o workbench', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    for (let i = 0; i < 6; i++) {
      await page.getByRole('button', { name: BTN.toggleAux }).click()
      await page.waitForTimeout(120)
    }
    await expect(page.locator(SEL.workbench)).toBeVisible()
    await expect(page.locator(SEL.chatPane)).toBeVisible()
    expect(errors).toEqual([])
    await shot(page, 'sessao04_T4_toggle_aux')
  })

  test('T5: a memória por sessão sobrevive ao F5', async ({ page }) => {
    const rows = page.locator(SEL.sessionRow)
    const id = await rows.nth(0).getAttribute('data-session-id')
    await rows.nth(0).click()
    await page.getByRole('button', { name: BTN.abrirAlteracoes }).click()
    await page.waitForTimeout(300)
    await rows.nth(1).click()
    await page.waitForTimeout(300)

    const before = await readSessionLayouts(page)
    expect(before[id!], 'o layout da s1 deve ter sido capturado antes do F5').toBeTruthy()

    await openApp(page)
    const after = await readSessionLayouts(page)
    expect(after, 'o mapa por sessão precisa sobreviver ao reload').toBeTruthy()
    expect(after[id!], 'o layout da s1 continua no mapa após F5').toBeTruthy()
    expect(after[id!]).toEqual(before[id!])

    expect(await activeSessionId(page)).toBeTruthy()
    await shot(page, 'sessao04_T5_memoria_apos_f5')
  })
})
