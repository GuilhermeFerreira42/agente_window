// FATIA 09 — prova E2E da conversa REAL com streaming (SPEC PARTE 2C §6(c)).
//
// Condições de execução (fora do repo, como a 08):
//   · Vite 5174 com AGENTE_WINDOW_PROVIDERS_PATH apontando para a fixture da
//     fatia (uploads/providers_fixture.json);
//   · stub 4599 (uploads/stub_provider.cjs): 6 chunks atrasados,
//     401 para chave ≠ nvapi-TESTE-valida-0001, serviço fora = porta morta.
// A bateria zera/repassa o estado de provedores por /api/providers — nunca
// toca o arquivo do dono. Caso (d) timeout (60 s sem primeiro byte) é de
// UNIT (conversar.test) — 30 s de E2E não alcança; registrado honestamente.
//
// REGRA DA CASA: todo teste tem pelo menos um `expect` (e2eAssertionContract).
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { resetApp, shot } from './helpers'

const STUB = 'http://127.0.0.1:4599/v1'
const CHAVE_BOA = 'nvapi-TESTE-valida-0001'
const MODELO_A = 'meta/llama-3.3-70b-instruct'
const MODELO_B = 'deepseek-ai/deepseek-r1'

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

async function stubAtivo(request: APIRequestContext, extras: Partial<ConfigProvedor> = {}): Promise<void> {
  await salvar(request, 'openai-compat', {
    'openai-compat': { nome: 'Stub Local', baseUrl: STUB, modelo: MODELO_A, apiKey: CHAVE_BOA, ...extras },
  })
}

/** Depois do reset, garante uma sessão com chat aberto (primeira da lista). */
async function abrirSessao(page: Page): Promise<void> {
  await page.locator('.session-row').first().click()
  await expect(page.getByRole('textbox', { name: 'Mensagem para o agente' })).toBeVisible()
}

async function enviar(page: Page, texto: string): Promise<void> {
  await page.getByRole('textbox', { name: 'Mensagem para o agente' }).fill(texto)
  await page.getByRole('button', { name: 'Enviar mensagem' }).click()
}

const ultimaBolha = (page: Page) => page.locator('.chat-message').last()
const rodape = (page: Page) => page.locator('.chat-message').last().locator('.chat-message-footer-details')

test.beforeEach(async ({ request }) => {
  // Toda bateria parte do provedor ativo = stub de verdade (fixture da fatia).
  await stubAtivo(request)
})

  test('T1: envio → bolha cresce em pedaços → fim com modelo efetivo e Markdown (§3.2/3/5/9)', async ({ page }) => {
  await resetApp(page)
  await abrirSessao(page)
  await enviar(page, 'Responda em pedaços, com negrito e lista.')

  // MEIO-FIO numa SÓ janela (§3.2): indicador ligado + primeiro pedaço já
  // visível + fim AINDA não chegado. Três asserts separados corridam contra o
  // "done" — em máquina lenta o fim vence entre um expect e outro, e a prova
  // de streaming vira corrida perdida. (O texto "Trabalhando" puro casa o mock
  // antigo "Estou trabalhando em…" das sessões de prova — por isso o seletor
  // exato .chat-progress.)
  await expect
    .poll(
      async () => {
        const progresso = await page.locator('.chat-pane .chat-progress').count()
        const texto = (await ultimaBolha(page).textContent().catch(() => '')) ?? ''
        return progresso > 0 && texto.includes('Olá') && !texto.includes('segundo item')
      },
      { timeout: 6000, message: 'indicador ligado com o primeiro pedaço antes do fim' },
    )
    .toBe(true)

  // Termina: some o indicador, chega o texto inteiro (§3.3)…
  await expect(ultimaBolha(page)).toContainText('segundo item', { timeout: 8000 })
  await expect(page.locator('.chat-pane .chat-progress')).toHaveCount(0)
  // …e o rodapé rotula o modelo EFETIVO que respondeu (§3.9).
  await expect(rodape(page)).toContainText(MODELO_A)

  // Markdown completo (Q3): negrito + lista renderizados de verdade.
  await expect(ultimaBolha(page).locator('strong').first()).toBeVisible()
  await expect(ultimaBolha(page).locator('li').first()).toBeVisible()
  await shot(page, 'f09_T1_streaming_fim')
})

  test('T2: Parar no meio derruba o fio e preserva o texto parcial (§3.4)', async ({ page }) => {
  await resetApp(page)
  await abrirSessao(page)
  // "LENTO" = cenário do stub (700 ms por pedaço): o fio fica aberto ~5 s —
  // janela determinística para o Parar, sem depender da velocidade da máquina.
  await enviar(page, 'LENTO — pare no meio desta resposta, por favor.')
  // O indicador real (.chat-progress) prova que a NOSSA corrida está viva —
  // o texto "Olá" sozinho casa respostas antigas das sessões de prova.
  await expect(page.locator('.chat-pane .chat-progress').last()).toBeVisible({ timeout: 5000 })
  await expect(ultimaBolha(page)).toContainText('Olá', { timeout: 5000 })
  await page.getByRole('button', { name: 'Parar execução' }).click()
  await expect(rodape(page)).toContainText('Cancelada', { timeout: 5000 })
  // Parcial ficou (sem placeholder, sem erro) e o fim tardio NÃO entra.
  await expect(ultimaBolha(page)).toContainText('Olá')
  await expect(ultimaBolha(page)).not.toContainText('Execução interrompida antes da resposta')
  // O "done" do fio lento só chegaria ~5 s depois — abortado, NUNCA entra.
  await page.waitForTimeout(1500)
  await expect(ultimaBolha(page)).not.toContainText('segundo item')
  await shot(page, 'f09_T2_parar_preserva')
})

  test('T3: histórico sobrevive ao F5 e não vaza para outra sessão (§3.8/G4)', async ({ page }) => {
  await resetApp(page)
  await abrirSessao(page)
  const marcador = `memoria-viva-${Date.now()}`
  await enviar(page, marcador)
  await expect(ultimaBolha(page)).toContainText('segundo item', { timeout: 8000 })
  // F5 só DEPOIS do "done" (§3.8 = histórico CONCLUÍDO sobrevive). Recarregar
  // no meio do fio é outra situação: a mensagem ainda em voo é descartada de
  // propósito pela gravação (running não entra no transcript) — sem esta
  // espera o teste vira corrida contra o chunk final.
  await expect(page.locator('.chat-pane .chat-progress')).toHaveCount(0, { timeout: 8000 })

  // F5: recarrega e a conversa continua lá.
  await page.reload()
  await page.waitForSelector('.agent-sessions-workbench', { state: 'visible' })
  await page.waitForSelector('.session-row', { state: 'attached' })
  await expect(page.getByText(marcador).first()).toBeVisible({ timeout: 8000 })
  await expect(ultimaBolha(page)).toContainText('segundo item')

  // Isolamento: OUTRA sessão não vê a conversa desta (G4). A bateria roda
  // num servidor com ≥ 2 sessões de prova (mesma premissa do resto do e2e).
  const outras = page.locator('.session-row:not(.is-selected)')
  expect(await outras.count(), 'precisa haver outra sessão para provar isolamento').toBeGreaterThan(0)
  await outras.first().click()
  await expect(page.getByRole('textbox', { name: 'Mensagem para o agente' })).toBeVisible()
  await expect(page.getByText(marcador)).toHaveCount(0)
  await shot(page, 'f09_T3_f5_isolamento')
})

  test('T4: erros honestos — sem provedor, chave errada, serviço fora — e a chave nunca aparece (§3.6/7)', async ({ page, request }) => {
  await resetApp(page)
  await abrirSessao(page)

  // (a) nenhum provedor configurado
  await salvar(request, null, {})
  await enviar(page, 'sem provedor nenhum')
  await expect(ultimaBolha(page)).toContainText('Nenhum provedor está ativo', { timeout: 5000 })
  await expect(ultimaBolha(page)).not.toContainText('Estou trabalhando') // nada de texto falso

  // (b) chave inválida → 401 traduzido (o stub recusa chave errada)
  await stubAtivo(request, { apiKey: 'errada-neste-teste' })
  await enviar(page, 'com chave errada')
  await expect(ultimaBolha(page)).toContainText('Chave inválida (erro 401)', { timeout: 8000 })

  // (c) endereço inalcançável → serviço fora, mensagem honesta
  await stubAtivo(request, { baseUrl: 'http://127.0.0.1:9/v1' })
  await enviar(page, 'serviço fora do ar')
  await expect(ultimaBolha(page)).toContainText('Não deu para alcançar o serviço', { timeout: 8000 })

  // §3.7: a CHAVE do dono nunca aparece em nenhuma resposta da API.
  await expect(page.locator('body')).not.toContainText(CHAVE_BOA)
  const prova = await request.get('/api/providers')
  expect((await prova.text()).includes(CHAVE_BOA), 'a chave nunca sai crua pela API').toBe(false)
  await shot(page, 'f09_T4_erros_honestos')
  // (d) timeout de primeiro byte (60 s) é coberto na UNIT (conversar.test).
})

  test('T5: trocar o provedor ativo muda quem responde na conversa seguinte, sem reiniciar (§3.9)', async ({ page, request }) => {
  await resetApp(page)
  await abrirSessao(page)
  await stubAtivo(request, { modelo: MODELO_A })
  await enviar(page, 'primeira pergunta com o modelo A')
  await expect(rodape(page)).toContainText(MODELO_A, { timeout: 8000 })

  // Troca no mesmo app: mesmo stub, outro modelo efetivo gravado.
  await stubAtivo(request, { modelo: MODELO_B })
  await enviar(page, 'segunda pergunta com o modelo B')
  await expect(rodape(page)).toContainText(MODELO_B, { timeout: 8000 })
  await shot(page, 'f09_T5_troca_provedor')
})
