import { expect, test } from '@playwright/test'
import {
  BTN,
  SEL,
  activeSessionId,
  collectConsoleErrors,
  dragSidebar,
  openApp,
  readLayoutState,
  resetApp,
  shot,
  widthOf,
} from './helpers'

test.describe('Sessão 01 — Sessions Core', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page)
  })

  test('T1: sessões persistidas carregam ao iniciar', async ({ page }) => {
    const rows = page.locator(SEL.sessionRow)
    const count = await rows.count()
    expect(count, 'seed de sessões deveria popular a sidebar').toBeGreaterThanOrEqual(5)

    // Toda linha precisa de identidade estável — sem id não há memória por sessão.
    const ids = await rows.evaluateAll((els) => els.map((el) => el.getAttribute('data-session-id')))
    expect(ids.every((id) => !!id && id.length > 0), 'toda sessão precisa de data-session-id').toBe(true)
    expect(new Set(ids).size, 'os ids das sessões devem ser únicos').toBe(ids.length)

    // Exatamente uma sessão ativa.
    await expect(page.locator(`${SEL.sessionRow}.is-selected`)).toHaveCount(1)
    await shot(page, 'sessao01_T1_sessoes_carregadas')
  })

  test('T2: nova sessão via botão "Nova sessão" cria exatamente uma e a ativa', async ({ page }) => {
    const rows = page.locator(SEL.sessionRow)
    const before = await rows.count()
    const idBefore = await activeSessionId(page)

    await page.getByRole('button', { name: BTN.novaSessao }).first().click()
    await page.waitForTimeout(400)

    await expect(rows, 'deve criar exatamente 1 sessão').toHaveCount(before + 1)
    const idAfter = await activeSessionId(page)
    expect(idAfter, 'a nova sessão deve virar a ativa').not.toBe(idBefore)
    expect(idAfter).toBeTruthy()
    await shot(page, 'sessao01_T2_nova_sessao')
  })

  test('T3: sessão ativa persiste após F5', async ({ page }) => {
    const rows = page.locator(SEL.sessionRow)
    const target = rows.nth(2)
    const targetId = await target.getAttribute('data-session-id')
    await target.click()
    await expect(page.locator(`${SEL.sessionRow}[data-session-id="${targetId}"]`)).toHaveClass(/is-selected/)

    await page.reload()
    await page.waitForSelector(SEL.sessionRow, { state: 'visible' })
    await page.waitForTimeout(400)

    expect(await activeSessionId(page), 'a sessão ativa deve sobreviver ao F5').toBe(targetId)
    await shot(page, 'sessao01_T3_ativa_apos_f5')
  })

  test('T4: estados de sessão têm ícone com rótulo acessível', async ({ page }) => {
    const icons = page.locator('.session-status-icon')
    const total = await icons.count()
    expect(total, 'sessões devem exibir ícone de status').toBeGreaterThan(0)

    const labels = await icons.evaluateAll((els) =>
      els.map((el) => el.getAttribute('aria-label') || el.getAttribute('title') || ''),
    )
    expect(labels.filter((label) => label.trim().length > 0).length, 'todo status precisa de rótulo textual').toBe(total)
    await shot(page, 'sessao01_T4_status_icons')
  })

  test('T5: largura da sidebar é persistida em px e restaurada após F5', async ({ page }) => {
    const errors = collectConsoleErrors(page)
    const initial = await widthOf(page, SEL.sidebar)

    await dragSidebar(page, 70)
    const dragged = await widthOf(page, SEL.sidebar)
    expect(dragged, 'o sash deve realmente redimensionar a sidebar').toBeGreaterThan(initial + 30)

    const state = await readLayoutState(page)
    expect(state, 'estado de layout deve estar no localStorage').toBeTruthy()
    expect(Math.abs(state.shell.sidebarWidth - dragged), 'localStorage deve refletir a largura medida').toBeLessThanOrEqual(4)

    await openApp(page)
    const restored = await widthOf(page, SEL.sidebar)
    expect(Math.abs(restored - dragged), 'a largura deve ser restaurada após F5').toBeLessThanOrEqual(4)
    expect(errors, 'nenhum erro de console durante o resize').toEqual([])
    await shot(page, 'sessao01_T5_sidebar_persistida')
  })
})
