import { expect, test } from '@playwright/test'
import {
  BTN,
  SEL,
  collectConsoleErrors,
  openApp,
  readSessionLayouts,
  resetApp,
  shot,
} from './helpers'

// Cenários exigidos pelo pacote VALIDACAO_3_SESSAO_05_TOPOLOGIA (anti-trapaça).
// Cada teste aqui precisa poder FALHAR: nada de "elemento existe".
test.describe('Validação 3 — Layout Controller REAL', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page)
  })

  test('T1: s1 com aux aberta → s2 sem aux → voltar a s1 restaura a aux', async ({ page }) => {
    const rows = page.locator(SEL.sessionRow)
    const s1 = rows.nth(0)
    const s2 = rows.nth(1)

    await s1.click()
    await page.getByRole('button', { name: BTN.abrirAlteracoes }).click()
    await page.waitForTimeout(400)
    expect(await page.locator(SEL.auxiliaryBar).count()).toBe(1)
    await shot(page, 'val3_sessao03_T1_s1_aux_aberta')

    await s2.click()
    await page.waitForTimeout(300)
    if ((await page.locator(SEL.auxiliaryBar).count()) > 0) {
      await page.getByRole('button', { name: BTN.toggleAux }).click()
      await page.waitForTimeout(300)
    }
    expect(await page.locator(SEL.auxiliaryBar).count()).toBe(0)
    await shot(page, 'val3_sessao03_T1_s2_aux_fechada')

    await s1.click()
    await page.waitForTimeout(400)
    expect(await page.locator(SEL.auxiliaryBar).count(), 'a s1 tem que voltar com a aux dela').toBe(1)
    await shot(page, 'val3_sessao03_T1_s1_restaurado')
  })

  test('T2: B3/B4 — o mapa POR SESSÃO (não só o shell global) sobrevive ao F5', async ({ page }) => {
    const rows = page.locator(SEL.sessionRow)
    const id1 = await rows.nth(0).getAttribute('data-session-id')

    await rows.nth(0).click()
    await page.getByRole('button', { name: BTN.abrirAlteracoes }).click()
    await page.waitForTimeout(400)
    await rows.nth(1).click()
    await page.waitForTimeout(400)

    const antes = await readSessionLayouts(page)
    expect(antes, 'sessionLayouts precisa existir no localStorage (B3/B4)').toBeTruthy()
    expect(antes[id1!], 'a s1 precisa estar no mapa por sessão').toBeTruthy()
    await shot(page, 'val3_sessao03_T2_antes_f5')

    await openApp(page)
    const depois = await readSessionLayouts(page)
    expect(depois[id1!], 'o layout por sessão não pode zerar no reload').toEqual(antes[id1!])

    // E o estado restaurado tem que valer na UI, não só no storage.
    await page.locator(`${SEL.sessionRow}[data-session-id="${id1}"]`).click()
    await page.waitForTimeout(500)
    expect(await page.locator(SEL.auxiliaryBar).count(), 'após F5 a s1 volta com a aux aberta').toBe(1)
    await shot(page, 'val3_sessao03_T2_depois_f5')
  })

  test('T3: novo chat com sessões existentes mantém as laterais visíveis [00:33]', async ({ page }) => {
    await page.getByRole('button', { name: BTN.abrirAlteracoes }).click()
    await page.waitForTimeout(400)
    const auxAntes = await page.locator(SEL.auxiliaryBar).count()
    expect(auxAntes).toBe(1)
    await shot(page, 'val3_sessao03_T3_antes_novo_chat')

    await page.getByRole('button', { name: BTN.novaSessao }).first().click()
    await page.waitForTimeout(600)

    await expect(page.locator(SEL.sidebar), 'a sidebar não pode sumir ao criar chat').toBeVisible()
    await expect(page.locator(SEL.chatPane), 'o chat da nova sessão precisa aparecer').toBeVisible()
    await shot(page, 'val3_sessao03_T3_depois_novo_chat')
  })

  test('T4: [00:33] com aba Browser ativa (aux transiente) o novo chat NÃO herda aux fechada', async ({ page }) => {
    const errors = collectConsoleErrors(page)

    // 1. Sessão com aux aberta de verdade (escolha do usuário).
    await page.getByRole('button', { name: BTN.abrirAlteracoes }).click()
    await page.waitForTimeout(400)
    expect(await page.locator(SEL.auxiliaryBar).count(), 'ponto de partida: aux aberta').toBe(1)

    // 2. Abre o Browser: a aux some de forma TRANSIENTE (não é escolha do usuário).
    await page.getByRole('button', { name: BTN.abrirNavegador }).click()
    await page.waitForTimeout(500)
    expect(await page.locator(SEL.auxiliaryBar).count(), 'browser esconde a aux transientemente').toBe(0)

    // 3. Cria um novo chat exatamente nesse estado — é o bug do vídeo [00:33].
    await page.getByRole('button', { name: BTN.novaSessao }).first().click()
    await page.waitForTimeout(700)

    await expect(page.locator(SEL.sidebar), 'a lista de sessões não pode sumir').toBeVisible()
    await expect(page.locator(SEL.chatPane), 'o chat da nova sessão tem que aparecer').toBeVisible()

    // 4. E a preferência real (aux aberta) não pode ter sido contaminada pelo
    //    estado transiente do browser: ao voltar para uma sessão com Changes,
    //    a barra auxiliar precisa reaparecer.
    await page.getByRole('button', { name: BTN.abrirAlteracoes }).click()
    await page.waitForTimeout(600)
    expect(
      await page.locator(SEL.auxiliaryBar).count(),
      'a aux fechada pelo browser era transiente e não pode virar preferência persistida',
    ).toBe(1)

    expect(errors, 'o cenário do vídeo não pode lançar erro').toEqual([])
    await shot(page, 'val3_sessao03_T4_browser_transiente')
  })
})
