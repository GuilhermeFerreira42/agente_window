// FATIA 08 — Conectar (Provedores). Bateria Playwright contra o app real (5174).
// O "provedor de mentira" (uploads/stub_provider.cjs, porta 4599) faz o
// papel de um serviço OpenAI-compatible: sucesso (200 + catálogo), chave errada (401)
// e um serviço que NÃO deixa listar modelos (405).
// Nada aqui toca o arquivo real do dono: o servidor de teste roda com
// AGENTE_WINDOW_PROVIDERS_PATH apontando para /tmp/prov-fixture/providers.json.
import { expect, test } from '@playwright/test'
import { resetApp, shot } from './helpers'

const STUB = 'http://127.0.0.1:4599/v1'
const STUB_SEM_CATALOGO = 'http://127.0.0.1:4599/sem-catalogo/v1'
const CHAVE_BOA = 'nvapi-TESTE-valida-0001'
const GENERICO = 'Compatível com OpenAI'
// Campos do formulário (nome exato — "Modelo" bateria também em "Modelos disponíveis"):
const CAMPO_CHAVE = `Chave de API ${GENERICO}`
const CAMPO_ENDERECO = `Endereço do serviço ${GENERICO}`
const CAMPO_MODELO = `Modelo ${GENERICO}`
const CAMPO_LISTA = `Modelos disponíveis em ${GENERICO}`

async function abrirProvedores(page: import('@playwright/test').Page) {
  await resetApp(page)
  await page.getByRole('button', { name: 'Conta' }).click()
  await page.getByRole('menuitem', { name: 'Provedores' }).click()
  await expect(page.locator('.providers-view')).toBeVisible()
}

async function abrirGenerico(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Compatível com OpenAI' }).click()
}

test.beforeEach(async ({ request }) => {
  // Cada teste parte de uma configuração limpa NA FIXTURE (o arquivo real não é tocado).
  const resposta = await request.put('/api/providers', { data: { ativo: null, provedores: {} } })
  expect(resposta.ok()).toBe(true)
  const estado = await (await request.get('/api/providers')).json()
  expect(estado.storage, 'a bateria precisa estar na fixture, nunca no arquivo do dono').toBe('fixture')
  expect(estado.caminho).toBe('/tmp/prov-fixture/providers.json')
})

  test('T1: a casa abre pela Conta e mostra os 8 provedores (7 nativos + genérico) com formulário por provedor', async ({ page }) => {
  await abrirProvedores(page)

  await expect(page.locator('.providers-item')).toHaveCount(8)
  for (const nome of ['OpenAI', 'NVIDIA', 'Anthropic', 'Google Gemini', 'Ollama (local)', 'OpenRouter', 'DeepSeek', 'Compatível com OpenAI']) {
    await expect(page.getByRole('button', { name: nome, exact: true })).toBeVisible()
  }

  // Formulário do primeiro: chave mascarada/vazia, endereço padrão já preenchido.
  await expect(page.getByLabel('Chave de API OpenAI')).toBeVisible()
  await expect(page.getByLabel('Endereço do serviço OpenAI')).toHaveValue('https://api.openai.com/v1')

  // Trocar de provedor monta o formulário dele, com o endereço padrão certo (NVIDIA).
  await page.getByRole('button', { name: 'NVIDIA', exact: true }).click()
  await expect(page.getByLabel('Endereço do serviço NVIDIA')).toHaveValue('https://integrate.api.nvidia.com/v1')
  await expect(page.getByText('NVIDIA NIM · catálogo em build.nvidia.com (formato OpenAI)')).toBeVisible()
  await shot(page, 'f08_T1_lista_e_formulario')
})

  test('T2: genérico "Compatível com OpenAI" — testar conexão de VERDADE, buscar modelos, salvar e sobreviver ao F5', async ({ page }) => {
  await abrirProvedores(page)
  await abrirGenerico(page)

  await page.getByLabel('Nome do serviço').fill('Stub Local')
  await page.getByLabel(CAMPO_ENDERECO).fill(STUB)
  await page.getByLabel(CAMPO_CHAVE).fill(CHAVE_BOA)
  await page.getByLabel(CAMPO_MODELO).fill('meta/llama-3.3-70b-instruct')

  // Teste de conexão: a chamada sai do SERVIDOR e volta com a contagem real.
  await page.getByRole('button', { name: 'Testar conexão' }).click()
  await expect(page.getByText(/Conexão aprovada/)).toBeVisible({ timeout: 15000 })
  await expect(page.getByText(/5 modelos/)).toBeVisible()
  await shot(page, 'f08_T2_conexao_aprovada')

  // Buscar modelos preenche a lista; escolher troca o campo digitável.
  await page.getByRole('button', { name: 'Buscar modelos' }).click()
  const seletor = page.getByLabel(CAMPO_LISTA)
  await expect(seletor).toBeVisible({ timeout: 15000 })
  await seletor.selectOption('deepseek-ai/deepseek-r1')
  await expect(page.getByLabel(CAMPO_MODELO)).toHaveValue('deepseek-ai/deepseek-r1')

  await page.getByRole('button', { name: 'Salvar provedores' }).click()
  await expect(page.getByText('Configuração salva')).toBeVisible()

  // F5 → reabrir pela Conta → tudo voltou (inclusive o nome do serviço no título).
  await page.reload()
  await page.waitForSelector('.session-row', { timeout: 30000 })
  await page.getByRole('button', { name: 'Conta' }).click()
  await page.getByRole('menuitem', { name: 'Provedores' }).click()
  await abrirGenerico(page)
  await expect(page.getByText('Compatível com OpenAI · Stub Local')).toBeVisible()
  await expect(page.getByLabel(CAMPO_ENDERECO)).toHaveValue(STUB)
  await expect(page.getByLabel(CAMPO_MODELO)).toHaveValue('deepseek-ai/deepseek-r1')
  await shot(page, 'f08_T2b_persistiu_apos_f5')
})

  test('T3: a chave chega mascarada e o "olhinho" mostra/esconde (D83)', async ({ page }) => {
  await abrirProvedores(page)
  await abrirGenerico(page)
  await page.getByLabel('Nome do serviço').fill('Stub Local')
  await page.getByLabel(CAMPO_ENDERECO).fill(STUB)
  await page.getByLabel(CAMPO_CHAVE).fill(CHAVE_BOA)
  await page.getByLabel(CAMPO_MODELO).fill('meta/llama-3.3-70b-instruct')
  await page.getByRole('button', { name: 'Salvar provedores' }).click()
  await expect(page.getByText('Configuração salva')).toBeVisible()

  // Recarrega: o campo abre escondido, com a máscara do servidor no placeholder.
  await page.reload()
  await page.waitForSelector('.session-row', { timeout: 30000 })
  await page.getByRole('button', { name: 'Conta' }).click()
  await page.getByRole('menuitem', { name: 'Provedores' }).click()
  await abrirGenerico(page)

  const campo = page.getByLabel(CAMPO_CHAVE)
  await expect(campo).toHaveAttribute('type', 'password')
  await expect(campo).toHaveAttribute('placeholder', /•{4,}/) // a máscara vem do servidor
  await expect(campo).toHaveValue('') // o valor inteiro não desce no carregamento (D83)

  // Olhinho: busca a chave INTEIRA no servidor, só neste clique.
  await page.getByRole('button', { name: 'Mostrar a chave' }).click()
  await expect(campo).toHaveAttribute('type', 'text')
  await expect(campo).toHaveValue(CHAVE_BOA)
  await shot(page, 'f08_T3_chave_revelada')

  await page.getByRole('button', { name: 'Ocultar a chave' }).click()
  await expect(campo).toHaveAttribute('type', 'password')
})

  test('T4: falhas honestas — chave inválida (401) e endereço inalcançável (nada de erro genérico)', async ({ page }) => {
  await abrirProvedores(page)
  await abrirGenerico(page)
  await page.getByLabel('Nome do serviço').fill('Stub Local')
  await page.getByLabel(CAMPO_ENDERECO).fill(STUB)
  await page.getByLabel(CAMPO_CHAVE).fill('nvapi-CHAVE-ERRADA-9999')
  await page.getByRole('button', { name: 'Testar conexão' }).click()
  await expect(page.getByText(/Chave inválida \(erro 401\)/)).toBeVisible({ timeout: 15000 })

  // Endereço onde nada escuta → categoria "não deu para alcançar".
  await page.getByLabel(CAMPO_ENDERECO).fill('http://127.0.0.1:4598/v1')
  await page.getByRole('button', { name: 'Testar conexão' }).click()
  await expect(page.getByText(/Não deu para alcançar o endereço/)).toBeVisible({ timeout: 15000 })
  await shot(page, 'f08_T4_falhas_honestas')
})

  test('T5: serviço que NÃO deixa listar modelos — aviso honesto, modelo à mão continua valendo', async ({ page }) => {
  await abrirProvedores(page)
  await abrirGenerico(page)
  await page.getByLabel('Nome do serviço').fill('Serviço Fechado')
  await page.getByLabel(CAMPO_ENDERECO).fill(STUB_SEM_CATALOGO)
  await page.getByLabel(CAMPO_CHAVE).fill(CHAVE_BOA)
  await page.getByLabel(CAMPO_MODELO).fill('modelo-digitado-a-mao')

  await page.getByRole('button', { name: 'Buscar modelos' }).click()
  await expect(page.getByText(/405/)).toBeVisible({ timeout: 15000 })

  // Com o modelo digitado, o teste da conversa aprova e diz a verdade sobre a lista.
  await page.getByRole('button', { name: 'Testar conexão' }).click()
  await expect(page.getByText(/Conexão aprovada/)).toBeVisible({ timeout: 15000 })
  await expect(page.getByText(/não listou modelos/)).toBeVisible()
  await shot(page, 'f08_T5_servico_sem_catalogo')
})

  test('T6: provedor ativo — escolha persiste e aparece no chip', async ({ page }) => {
  await abrirProvedores(page)
  await abrirGenerico(page)
  await page.getByLabel('Nome do serviço').fill('Stub Local')
  await page.getByLabel(CAMPO_ENDERECO).fill(STUB)
  await page.getByLabel(CAMPO_CHAVE).fill(CHAVE_BOA)
  await page.getByLabel(CAMPO_MODELO).fill('meta/llama-3.3-70b-instruct')
  await page.getByRole('button', { name: 'Salvar provedores' }).click()
  await expect(page.getByText('Configuração salva')).toBeVisible()

  await page.getByRole('radio', { name: 'usar este provedor no chat' }).check()
  await expect(page.getByText('provedor ativo do chat')).toBeVisible()

  await page.reload()
  await page.waitForSelector('.session-row', { timeout: 30000 })
  await page.getByRole('button', { name: 'Conta' }).click()
  await page.getByRole('menuitem', { name: 'Provedores' }).click()
  await abrirGenerico(page)
  await expect(page.getByText('provedor ativo do chat')).toBeVisible()
  await shot(page, 'f08_T6_provedor_ativo')
})
