// FATIA 10 — prova E2E do AGIR (SPEC PARTE 2D §6 — os critérios de aceite).
//
// Condições de execução (fora do repo, como as fatias 08/09):
//   · Vite 5174 com AGENTE_WINDOW_PROVIDERS_PATH em fixture (a bateria repassa
//     o estado de provedores por /api/providers — nunca toca o arquivo do dono);
//   · stub 4610 (validacao_fatia10/stub_agir.cjs): provedor OpenAI-compatível
//     COM tool_calls nativos — argumentos FRAGMENTADOS para provar a
//     remontagem; 401 para chave ≠ nvapi-TESTE-agir-0001;
//   · território REAL: /tmp/agir-e2e-ws (recriado por teste) — as provas de
//     disco são de verdade (o arquivo existe / não existe).
//
// REGRA DA CASA: todo teste tem pelo menos um `expect` (e2eAssertionContract).
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { resetApp, shot } from './helpers'

const STUB = 'http://127.0.0.1:4610/v1'
const CHAVE_BOA = 'nvapi-TESTE-agir-0001'
const MODELO = 'stub-agir-1'
const PASTA = '/tmp/agir-e2e-ws'
// Marcador único por teste: o título da sessão nasce do 1.º envio, então a
// linha da NOSSA sessão é achável com precisão — a lista pode ter sessões de
// outras pessoas/demonstração, e o teste nunca clica nelas nem as apaga.
const marcador = () => `AGIR-E2E-${Date.now()}-${Math.floor(Math.random() * 1e6)}`

interface ConfigProvedor {
  nome?: string
  baseUrl: string
  modelo: string
  apiKey?: string
}

async function salvar(request: APIRequestContext, ativo: string | null, provedores: Record<string, ConfigProvedor>): Promise<void> {
  const resposta = await request.put('/api/providers', { data: { ativo, provedores } })
  expect(resposta.ok(), 'PUT /api/providers deve aceitar o estado de teste').toBe(true)
}

async function ligarStub(request: APIRequestContext): Promise<void> {
  await salvar(request, 'openai-compat', {
    'openai-compat': { nome: 'Stub Agir', baseUrl: STUB, modelo: MODELO, apiKey: CHAVE_BOA },
  })
}

/** Limpa SOMENTE as sessões deixadas por rodadas anteriores DESTA bateria
 * (marcador AGIR-E2E) — nunca toca nas sessões de outras pessoas. */
async function varrerMinhasSessoes(request: APIRequestContext): Promise<void> {
  const resposta = await request.get('/api/sessions')
  if (!resposta.ok()) return
  const corpo = (await resposta.json()) as { sessions?: Array<{ id: string; title?: string }> }
  for (const sessao of corpo.sessions ?? []) {
    if ((sessao.title ?? '').startsWith('AGIR-E2E-')) {
      await request.delete(`/api/sessions/${encodeURIComponent(sessao.id)}?force=true`)
    }
  }
}

const ultimaBolha = (page: Page) => page.locator('.chat-message').last()
const cartoes = (page: Page) => ultimaBolha(page).locator('.chat-tool-card')

async function enviar(page: Page, texto: string): Promise<void> {
  await page.getByRole('textbox', { name: 'Mensagem para o agente' }).fill(texto)
  await page.getByRole('button', { name: 'Enviar mensagem' }).click()
}

/** Sessão PRÓPRIA com território REAL — a jornada do dono pela UI: botão Nova
 * sessão → escolhe a pasta na landing (caminho manual validado) → 1.ª mensagem
 * com marcador único (batiza a linha da sessão). Zero API por baixo. */
async function prepararSessaoComPasta(page: Page, marca: string): Promise<void> {
  await resetApp(page)
  await page.getByRole('button', { name: 'Nova sessão' }).first().click()
  await page.getByLabel('Mensagem para a nova sessão').fill(`${marca} primeira`)
  await page.getByLabel('Mensagem para a nova sessão').press('Enter')
  // A jornada do dono (lição do teste dele): digitar o caminho ABSOLUTO da
  // pasta no interruptor do topo e dar Enter — validação real pela UI. A pasta
  // vem ANTES da primeira conversa (sem ela o agir responde o 409 honesto).
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
})

test.afterAll(() => {
  rmSync(PASTA, { recursive: true, force: true })
})

test.describe('FATIA 10 — Agir (ferramentas + permissões)', () => {
  test('T1: conversa comum no fio do agir — idêntica à 09, rodapé com o modelo efetivo (§6.1)', async ({ page }) => {
    await prepararSessaoComPasta(page, marcador())
    await enviar(page, 'mais uma sem ferramenta')
    await expect(ultimaBolha(page)).toContainText('Resposta simples sem ferramenta.', { timeout: 8000 })
    await expect(ultimaBolha(page).locator('.chat-message-footer-details')).toContainText(MODELO)
    await expect(cartoes(page)).toHaveCount(0)
    await shot(page, 'f10_T1_conversa_comum')
  })

  test('T2 — o teste final do MVP: cartão aparece, NADA é escrito sem aprovar, e o disco é a régua (§6.2/3)', async ({ page }) => {
    await prepararSessaoComPasta(page, marcador())
    await enviar(page, 'CRIE_ARQUIVO ola.txt')
    const cartao = cartoes(page).first()
    await expect(cartao).toContainText('Criar arquivo', { timeout: 8000 })
    await expect(cartao).toContainText('ola.txt')
    await expect(cartao).toContainText('Esperando você permitir')
    await expect(cartao).toContainText('Conteúdo gravado pela FATIA 10') // prévia (Q3a)
    // ★ o critério de aceite do MVP: sem aprovação, NADA no disco:
    expect(existsSync(`${PASTA}/ola.txt`), 'nada pode ser escrito antes do Permitir').toBe(false)
    await page.getByRole('button', { name: 'Permitir esta mexida' }).click()
    await expect(cartao).toContainText('Feito', { timeout: 8000 })
    await expect(ultimaBolha(page)).toContainText('Rodada concluída', { timeout: 8000 })
    // o disco é a régua: conteúdo EXATO, escrito de fato:
    expect(readFileSync(`${PASTA}/ola.txt`, 'utf8')).toBe('Conteúdo gravado pela FATIA 10')
    await shot(page, 'f10_T2_aprovado_escrito')
  })

  test('T3: Negar devolve o "não" ao modelo e o arquivo nunca nasce (§6.4)', async ({ page }) => {
    await prepararSessaoComPasta(page, marcador())
    await enviar(page, 'NEGUE_ARQUIVO negado.txt')
    const cartao = cartoes(page).first()
    await expect(cartao).toContainText('Esperando você permitir', { timeout: 8000 })
    await page.getByRole('button', { name: 'Negar esta mexida' }).click()
    await expect(cartao).toContainText('Negado por você', { timeout: 8000 })
    await expect(cartao).toContainText('dono negou')
    await expect(ultimaBolha(page)).toContainText('Rodada concluída', { timeout: 8000 })
    expect(existsSync(`${PASTA}/negado.txt`), 'negado = arquivo não existe').toBe(false)
    await shot(page, 'f10_T3_negado')
  })

  test('T4: "Permitir na Sessão" — a 2.ª mexida no fluxo não pergunta; após F5, também não (§6.5/6 + Q2a)', async ({ page }) => {
    const marca = marcador()
    await prepararSessaoComPasta(page, marca)
    await enviar(page, 'SESSAO_ARQUIVO')
    // O fluxo pergunta SEQUENCIALMENTE: só a 1.ª mexida vira pergunta agora.
    const cartao1 = cartoes(page).first()
    await expect(cartao1).toContainText('Esperando você permitir', { timeout: 8000 })
    await page.getByRole('button', { name: 'Permitir nesta sessão' }).click()
    await expect(cartao1).toContainText('Feito', { timeout: 8000 })
    // A 2.ª mexida do MESMO fluxo herda a permissão da sessão — nem pergunta:
    const cartao2 = cartoes(page).nth(1)
    await expect(cartao2).toContainText('Feito', { timeout: 8000 })
    expect(await page.getByText('Esperando você permitir').count()).toBe(0)
    expect(readFileSync(`${PASTA}/s1.txt`, 'utf8')).toBe('primeiro da sessao')
    expect(readFileSync(`${PASTA}/s2.txt`, 'utf8')).toBe('segundo da sessao')

    // F5: a permissão da sessão SOBREVIVE (Q2a) — nova mexida nem pergunta:
    await page.reload()
    await expect(page.locator('.agent-sessions-workbench')).toBeVisible()
    await page.locator('.session-row', { hasText: marca }).first().click()
    await enviar(page, 'CRIE_ARQUIVO ola.txt')
    const cartao = cartoes(page).first()
    await expect(cartao).toContainText('Feito', { timeout: 8000 })
    await expect(page.getByText('Esperando você permitir')).toHaveCount(0)
    expect(readFileSync(`${PASTA}/ola.txt`, 'utf8')).toBe('Conteúdo gravado pela FATIA 10')
    await shot(page, 'f10_T4_sessao_pos_f5')
  })

  test('T5: território — aprovada ou não, ferramenta nenhuma sai da pasta (§6.7)', async ({ page }) => {
    await prepararSessaoComPasta(page, marcador())
    await enviar(page, 'FORA_DA_PASTA')
    const cartao = cartoes(page).first()
    await expect(cartao).toContainText('Esperando você permitir', { timeout: 8000 })
    await page.getByRole('button', { name: 'Permitir esta mexida' }).click()
    await expect(cartao).toContainText('Não executou', { timeout: 8000 })
    await expect(cartao).toContainText('Fora da pasta')
    expect(existsSync('/tmp/fora.txt'), 'nada é escrito fora do território').toBe(false)
    await shot(page, 'f10_T5_territorio')
  })
})
