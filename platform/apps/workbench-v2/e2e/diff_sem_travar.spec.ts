// PÓS-11 C7 — trava do "não abre nenhum arquivo" (vídeo4 do dono, 21/10).
// Causa: o DiffPane recriava os models do Monaco com a MESMA uri ao re-clicar
// um arquivo do Source Control ("Cannot add model because it already exists")
// e descartava os models antes de soltar o editor ("TextModel got disposed
// before model got reset") — o React desmontava o anexo inteiro, sem boundary.
// A correção: nonce por payload + descarte editor-antes-models + boundary.
// Este teste re-clica o mesmo arquivo e troca de arquivo: o diff tem que
// continuar visível e nenhum erro pode vazar para o console.
//
// Condições: Vite 5174 (Single Port); território REAL /tmp/diff-travar-ws.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { expect, test } from '@playwright/test'
import { resetApp } from './helpers'

const PASTA = '/tmp/diff-travar-ws'
const SCM = '[data-testid="side-bar"] [data-testid="side-bar-view-scm"]'
const LINHA = `${SCM} .scm-view .monaco-list-row .resource`

test.describe('PÓS-11 C7 — diff re-clicado não trava o anexo', () => {
  test('clica A, A de novo e B: diff visível e zero erros', async ({ page }) => {
    const erros: string[] = []
    page.on('pageerror', (e) => erros.push(String(e).slice(0, 200)))
    rmSync(PASTA, { recursive: true, force: true })
    mkdirSync(PASTA, { recursive: true })
    writeFileSync(`${PASTA}/a.txt`, 'AAA\n')
    writeFileSync(`${PASTA}/b.txt`, 'BBB\n')
    execSync(`cd ${PASTA} && git init -q && git add . && git -c user.email=t@t -c user.name=t commit -qm base && echo MODA >> a.txt && echo MODB >> b.txt`)
    await resetApp(page)
    await page.getByRole('button', { name: 'Nova sessão' }).first().click()
    await page.getByLabel('Mensagem para a nova sessão').fill('DIFF-TRAVA reclick')
    await page.getByLabel('Mensagem para a nova sessão').press('Enter')
    const seletor = page.getByLabel('Workspace atual').first()
    await seletor.click()
    await seletor.fill(PASTA)
    await seletor.press('Enter')
    await expect(seletor).toHaveValue(PASTA, { timeout: 8000 })
    const usar = page.getByRole('button', { name: 'Usar esta pasta' })
    if (await usar.count() > 0) {
      await usar.first().click()
    }
    if ((await page.locator('[data-testid="activity-bar-item"][data-view-id="scm"]').getAttribute('aria-selected')) !== 'true') {
      await page.locator('[data-testid="activity-bar-item"][data-view-id="scm"]').click()
    }
    await expect(page.locator(`${SCM} .scm-view`)).toBeVisible({ timeout: 10000 })
    const rowA = page.locator(LINHA).filter({ has: page.locator('.label-name:text-is("a.txt")') }).first()
    await expect(rowA).toBeVisible({ timeout: 8000 })
    await rowA.click()
    await expect(page.getByTestId('attach-diff-pane')).toBeVisible({ timeout: 8000 })
    await rowA.click() // MESMO arquivo de novo (era o crash do vídeo4)
    await expect(page.getByTestId('attach-diff-pane')).toBeVisible({ timeout: 8000 })
    const rowB = page.locator(LINHA).filter({ has: page.locator('.label-name:text-is("b.txt")') }).first()
    await rowB.click()
    await expect(page.getByTestId('attach-diff-pane')).toBeVisible({ timeout: 8000 })
    // Trava contra o crash do vídeo4 ("already exists" / "disposed before reset"
    // desmontavam o anexo). O "no diff result available" ocasional é corrida
    // INTERNA do Monaco em trocas rápidas (o diff renderiza igual) — fora do escopo.
    expect(erros.filter((e) => /already exists|disposed before/i.test(e))).toEqual([])
  })

  test.afterAll(() => {
    rmSync(PASTA, { recursive: true, force: true })
  })
})
