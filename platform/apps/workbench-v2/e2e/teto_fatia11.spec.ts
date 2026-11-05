// FATIA 11 — prova E2E do TETO + CONTINUAR + ABA CONFIG (§2F — aceite).
//
// Condições de execução (fora do repo, como a FATIA 10):
//   · Vite 5174 com AGENTE_WINDOW_PROVIDERS_PATH + AGENTE_WINDOW_SETTINGS_PATH
//     em fixtures (o disco do dono nunca é tocado);
//   · stub 4610 v3 (uploads/stub_agir.cjs): cenário TETO_INFINITO —
//     SEMPRE responde tool 'buscar' (leitura, args únicos por iteração), então o
//     teto SEMPRE pausa, qualquer que seja o valor;
//   · território REAL: /tmp/teto-e2e-ws (recriado por teste).
//
// REGRA DA CASA: todo teste tem pelo menos um `expect` (e2eAssertionContract).
import { mkdirSync, rmSync } from 'node:fs'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { resetApp, shot } from './helpers'

const STUB = 'http://127.0.0.1:4610/v1'
const CHAVE_BOA = 'nvapi-TESTE-agir-0001'
const MODELO = 'stub-agir-1'
const PASTA = '/tmp/teto-e2e-ws'
const MARCA = 'TETO-E2E-'
const marcador = () => `${MARCA}${Date.now()}-${Math.floor(Math.random() * 1e6)}`

interface ConfigProvedor {
  nome?: string
  baseUrl: string
  modelo: string
  apiKey?: string
}

async function ligarStub(request: APIRequestContext): Promise<void> {
  const resposta = await request.put('/api/providers', {
    data: { ativo: 'openai-compat', provedores: { 'openai-compat': { nome: 'Stub Agir', baseUrl: STUB, modelo: MODELO, apiKey: CHAVE_BOA } } },
  })
  expect(resposta.ok(), 'PUT /api/providers deve aceitar o estado de teste').toBe(true)
}

async function definirTeto(request: APIRequestContext, teto: number): Promise<void> {
  const resposta = await request.put('/api/config', { data: { teto, autoScroll: true } })
  expect(resposta.ok(), 'PUT /api/config deve aceitar o teto de teste').toBe(true)
}

/** Limpa SOMENTE as sessões deixadas por rodadas anteriores DESTA bateria. */
async function varrerMinhasSessoes(request: APIRequestContext): Promise<void> {
  const resposta = await request.get('/api/sessions')
  if (!resposta.ok()) return
  const corpo = (await resposta.json()) as { sessions?: Array<{ id: string; title?: string }> }
  for (const sessao of corpo.sessions ?? []) {
    if ((sessao.title ?? '').startsWith(MARCA)) {
      await request.delete(`/api/sessions/${encodeURIComponent(sessao.id)}?force=true`)
    }
  }
}

const ultimaBolha = (page: Page) => page.locator('.chat-message').last()
const cartoesFerramenta = (page: Page) => ultimaBolha(page).locator('.chat-tool-card')
const cartoesContinuar = (page: Page) => ultimaBolha(page).locator('.chat-continue-card')

async function enviar(page: Page, texto: string): Promise<void> {
  await page.getByRole('textbox', { name: 'Mensagem para o agente' }).fill(texto)
  await page.getByRole('button', { name: 'Enviar mensagem' }).click()
}

/** Sessão PRÓPRIA com território REAL — a jornada do dono pela UI. */
async function prepararSessaoComPasta(page: Page, marca: string): Promise<void> {
  await resetApp(page)
  await page.getByRole('button', { name: 'Nova sessão' }).first().click()
  await page.getByLabel('Mensagem para a nova sessão').fill(`${marca} primeira`)
  await page.getByLabel('Mensagem para a nova sessão').press('Enter')
  const seletor = page.getByLabel('Workspace atual').first()
  await seletor.click()
  await seletor.fill(PASTA)
  await seletor.press('Enter')
  await expect(seletor).toHaveValue(PASTA, { timeout: 8000 })
  await expect(page.getByRole('textbox', { name: 'Mensagem para o agente' })).toBeVisible()
  const linha = page.locator('.session-row', { hasText: marca })
  await expect(linha.first()).toBeVisible({ timeout: 8000 })
  await enviar(page, 'oi sem ferramenta')
  await expect(ultimaBolha(page)).toContainText('Resposta simples sem ferramenta.', { timeout: 8000 })
}

test.beforeEach(async ({ request }) => {
  rmSync(PASTA, { recursive: true, force: true })
  mkdirSync(PASTA, { recursive: true })
  await varrerMinhasSessoes(request)
  await ligarStub(request)
  await definirTeto(request, 2)
})

test.afterAll(() => {
  rmSync(PASTA, { recursive: true, force: true })
})

test.describe('FATIA 11 — Teto + Continuar + Config', () => {
  test('T1: teto 2 pausa com o cartão, Continuar dá +2 no mesmo fluxo, Parar morre limpo', async ({ page }) => {
    await prepararSessaoComPasta(page, marcador())
    await enviar(page, 'TETO_INFINITO por favor')
    const bolha = ultimaBolha(page)
    // Pausou no teto: 2 ferramentas + 1 cartão "continuar?" (sem erro).
    await expect(cartoesFerramenta(page)).toHaveCount(2, { timeout: 15000 })
    await expect(cartoesContinuar(page)).toHaveCount(1, { timeout: 8000 })
    const pausa1 = cartoesContinuar(page).first()
    await expect(pausa1).toContainText('Pausado no limite')
    await expect(pausa1).toContainText('2 de 2 iterações')
    // Continuar: +2 iterações no MESMO fluxo (4 cartões), pausa de novo.
    await pausa1.getByRole('button', { name: 'Continuar' }).click()
    await expect(pausa1).toContainText('Continuado', { timeout: 8000 })
    await expect(cartoesFerramenta(page)).toHaveCount(4, { timeout: 15000 })
    const pausa2 = cartoesContinuar(page).nth(1)
    await expect(pausa2).toContainText('Pausado no limite', { timeout: 8000 })
    // Parar: morre limpo, sem erro e sem ferramenta nova.
    await pausa2.getByRole('button', { name: 'Parar por aqui' }).click()
    await expect(pausa2).toContainText('Parado por você')
    await expect(cartoesFerramenta(page)).toHaveCount(4)
    await expect(bolha).not.toContainText('falhou')
    await shot(page, 'f11_T1_teto_continuar_parar')
  })

  test('T2: aba Config — Conta > Configurações salva teto + rolagem e sobrevive ao F5', async ({ page, request }) => {
    await resetApp(page)
    await page.getByRole('button', { name: 'Conta', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Configurações', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible({ timeout: 8000 })
    // Veio do beforeEach (teto 2, rolagem ligada).
    await expect(page.getByLabel('Teto de iterações do agente')).toHaveValue('2')
    await expect(page.getByLabel(/Rolagem automática do chat/)).toBeChecked()
    // O dono muda os dois e salva.
    await page.getByLabel('Teto de iterações do agente').fill('7')
    await page.getByLabel(/Rolagem automática do chat/).uncheck()
    await page.getByRole('button', { name: 'Salvar configurações' }).click()
    await expect(page.getByText('Configuração salva')).toBeVisible({ timeout: 8000 })
    // O servidor persistiu de verdade (não é só a tela).
    const get = await request.get('/api/config')
    expect(get.ok()).toBe(true)
    expect(await get.json()).toMatchObject({ teto: 7, autoScroll: false })
    // F5: continua valendo.
    await page.reload()
    await expect(page.locator('.agent-sessions-workbench')).toBeVisible()
    await page.getByRole('button', { name: 'Conta', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Configurações', exact: true }).click()
    await expect(page.getByLabel('Teto de iterações do agente')).toHaveValue('7', { timeout: 8000 })
    await expect(page.getByLabel(/Rolagem automática do chat/)).not.toBeChecked()
    await shot(page, 'f11_T2_aba_config')
  })
})
