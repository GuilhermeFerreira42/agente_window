// ============================================================================
// Casa Provedores — sonda de conexão (servidor).
//
// A chamada sai SEMPRE daqui (servidor → provedor): o navegador não fala com o
// provedor (CORS + a chave não passeia pela tela). Timeout: 10 s.
// Categorias HONESTAS (nada de "erro genérico"): chave · endereco · tempo · http · resposta.
// A chave NUNCA entra em URL nem em log: vai por cabeçalho (ou cabeçalho do
// provedor, no caso do Gemini, que aceita `x-goog-api-key`).
// ============================================================================
import type { CategoriaTeste, Protocolo, ResultadoModelos, ResultadoTeste } from '../contract'
import { descritorPorId } from '../descritores/registro'

const TIMEOUT_MS = 10_000
const MIN_MSGS: { role: 'user'; content: string }[] = [{ role: 'user', content: 'ping' }]

export interface AlvoConexao {
  id: string
  baseUrl: string
  modelo?: string
  /** Chave resolvida pelo chamador (rota): corpo digitado > salva > ambiente (D84). */
  apiKey?: string | null
}

interface RespostaSonda {
  status: number
  corpo: unknown
}

async function buscar(url: string, init: RequestInit): Promise<RespostaSonda> {
  const resposta = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })
  let corpo: unknown = null
  try {
    corpo = await resposta.json()
  } catch {
    corpo = null
  }
  return { status: resposta.status, corpo }
}

function categorizar(erro: unknown): { categoria: CategoriaTeste; mensagem: string } {
  const nome = (erro as { name?: string }).name
  if (nome === 'TimeoutError' || nome === 'AbortError') {
    return { categoria: 'tempo', mensagem: 'O serviço demorou mais de 10 segundos. Pode ser lentidão da internet ou serviço fora do ar.' }
  }
  return {
    categoria: 'endereco',
    mensagem: 'Não deu para alcançar o endereço. Verifique se o serviço está ligado (no caso do Ollama, se ele está rodando na sua máquina).',
  }
}

function categoriaPorStatus(status: number): { categoria: CategoriaTeste; mensagem: string } {
  if (status === 401 || status === 403) {
    return { categoria: 'chave', mensagem: `Chave inválida (erro ${status}). Confira a chave e cole de novo.` }
  }
  return { categoria: 'http', mensagem: `O serviço respondeu com o erro ${status}. Confira o endereço e, se houver, o nome do modelo.` }
}

// Mapas por protocolo (Record garante exaustividade: protocolo novo sem entrada = erro de tipo).
const CABECALHOS: Record<Protocolo, (apiKey: string | null) => Record<string, string>> = {
  'openai-chat': (apiKey) => {
    const cabecalho: Record<string, string> = {}
    if (apiKey) cabecalho.Authorization = `Bearer ${apiKey}`
    return cabecalho
  },
  anthropic: (apiKey) => {
    const cabecalho: Record<string, string> = { 'anthropic-version': '2023-06-01' }
    if (apiKey) cabecalho['x-api-key'] = apiKey
    return cabecalho
  },
  // Gemini aceita a chave por cabeçalho — nada de chave na URL.
  gemini: (apiKey) => {
    const cabecalho: Record<string, string> = {}
    if (apiKey) cabecalho['x-goog-api-key'] = apiKey
    return cabecalho
  },
  ollama: () => ({}),
}

const URL_DE_MODELOS: Record<Protocolo, (baseUrl: string) => string> = {
  'openai-chat': (baseUrl) => `${baseUrl}/models`,
  anthropic: (baseUrl) => `${baseUrl}/models`,
  gemini: (baseUrl) => `${baseUrl}/models`,
  ollama: (baseUrl) => `${baseUrl}/api/tags`,
}

function cabecalhos(protocolo: Protocolo, apiKey: string | null): Record<string, string> {
  return CABECALHOS[protocolo](apiKey)
}

function urlDeModelos(protocolo: Protocolo, baseUrl: string): string {
  return URL_DE_MODELOS[protocolo](baseUrl)
}

/** Extrai a lista de modelos do formato de cada provedor (tolerante a variações). */
export function extrairModelos(protocolo: Protocolo, corpo: unknown): string[] {
  const dados = corpo as Record<string, unknown> | null
  if (!dados) return []
  if (protocolo === 'ollama') {
    const modelos = Array.isArray(dados.models) ? dados.models : []
    return modelos.map((m) => String((m as { name?: unknown }).name ?? '')).filter(Boolean)
  }
  if (protocolo === 'gemini') {
    const modelos = Array.isArray(dados.models) ? dados.models : []
    return modelos
      .map((m) => String((m as { name?: unknown }).name ?? '').replace(/^models\//, ''))
      .filter(Boolean)
  }
  const data = Array.isArray(dados.data) ? dados.data : []
  return data.map((m) => String((m as { id?: unknown }).id ?? '')).filter(Boolean)
}

async function pedirModelos(alvo: AlvoConexao, protocolo: Protocolo): Promise<RespostaSonda> {
  const cabecalho = cabecalhos(protocolo, alvo.apiKey ?? null)
  if (alvo.apiKey && Object.keys(cabecalho).length === 0 && protocolo !== 'ollama') {
    throw new Error('sem chave')
  }
  return buscar(urlDeModelos(protocolo, alvo.baseUrl), { method: 'GET', headers: cabecalho })
}

/** Teste mínimo para serviços que não listam modelos (só openai-chat tem ping de chat). */
async function pingarChat(alvo: AlvoConexao): Promise<RespostaSonda> {
  return buscar(`${alvo.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...cabecalhos('openai-chat', alvo.apiKey ?? null) },
    body: JSON.stringify({ model: alvo.modelo, messages: MIN_MSGS, max_tokens: 1 }),
  })
}

export async function listarModelos(alvo: AlvoConexao): Promise<ResultadoModelos> {
  const descritor = descritorPorId(alvo.id)
  if (!descritor) return { ok: false, modelos: [], mensagem: `Provedor desconhecido: ${alvo.id}` }
  if (!alvo.baseUrl) return { ok: false, modelos: [], mensagem: 'Informe o endereço do serviço primeiro.' }
  let resposta: RespostaSonda
  try {
    resposta = await pedirModelos(alvo, descritor.protocolo)
  } catch (erro) {
    if ((erro as Error).message === 'sem chave') return { ok: false, modelos: [], mensagem: 'Informe a chave para buscar os modelos.' }
    const { mensagem } = categorizar(erro)
    return { ok: false, modelos: [], mensagem }
  }
  if (resposta.status >= 400) {
    return { ok: false, modelos: [], mensagem: categoriaPorStatus(resposta.status).mensagem }
  }
  const modelos = extrairModelos(descritor.protocolo, resposta.corpo)
  if (modelos.length === 0) {
    return { ok: false, modelos: [], mensagem: 'O serviço respondeu, mas não mostrou nenhum modelo. Você pode digitar o nome do modelo à mão.' }
  }
  return { ok: true, modelos }
}

export async function testarConexao(alvo: AlvoConexao): Promise<ResultadoTeste> {
  const inicio = Date.now()
  const descritor = descritorPorId(alvo.id)
  if (!descritor) {
    return { ok: false, categoria: 'resposta', mensagem: `Provedor desconhecido: ${alvo.id}`, ms: 0 }
  }
  if (!alvo.baseUrl) {
    return { ok: false, categoria: 'endereco', mensagem: 'Informe o endereço do serviço primeiro.', ms: 0 }
  }
  if (!descritor.chaveOpcional && !alvo.apiKey) {
    return { ok: false, categoria: 'chave', mensagem: 'Informe a chave de API deste provedor.', ms: 0 }
  }

  let resposta: RespostaSonda
  try {
    resposta = await pedirModelos(alvo, descritor.protocolo)
  } catch (erro) {
    if ((erro as Error).message === 'sem chave') {
      return { ok: false, categoria: 'chave', mensagem: 'Informe a chave de API deste provedor.', ms: Date.now() - inicio }
    }
    const { categoria, mensagem } = categorizar(erro)
    return { ok: false, categoria, mensagem, ms: Date.now() - inicio }
  }
  const ms = Date.now() - inicio

  if (resposta.status >= 200 && resposta.status < 300) {
    const modelos = extrairModelos(descritor.protocolo, resposta.corpo)
    if (modelos.length > 0) {
      return { ok: true, categoria: 'ok', mensagem: `Conexão aprovada. O serviço respondeu em ${ms} ms e mostrou ${modelos.length} modelos.`, modelos: modelos.length, ms }
    }
    // Serviço respondeu 2xx mas sem lista legível: conexão vale, catálogo não veio.
    return { ok: true, categoria: 'ok', mensagem: `Conexão aprovada (o serviço respondeu em ${ms} ms), mas ele não mostrou a lista de modelos — digite o nome à mão.`, ms }
  }

  // Sem catálogo: para quem fala OpenAI, tenta um teste mínimo de conversa.
  if ((resposta.status === 404 || resposta.status === 405) && descritor.protocolo === 'openai-chat') {
    if (!alvo.modelo) {
      return {
        ok: false,
        categoria: 'http',
        mensagem: 'Este serviço não deixa listar modelos. Informe o nome do modelo à mão e teste de novo.',
        ms: Date.now() - inicio,
      }
    }
    try {
      const ping = await pingarChat(alvo)
      const msPing = Date.now() - inicio
      if (ping.status >= 200 && ping.status < 300) {
        return { ok: true, categoria: 'ok', mensagem: `Conexão aprovada (teste de conversa em ${msPing} ms). O serviço não listou modelos — digite o nome à mão.`, ms: msPing }
      }
      const { categoria, mensagem } = categoriaPorStatus(ping.status)
      return { ok: false, categoria, mensagem, ms: msPing }
    } catch (erro) {
      const { categoria, mensagem } = categorizar(erro)
      return { ok: false, categoria, mensagem, ms: Date.now() - inicio }
    }
  }

  const { categoria, mensagem } = categoriaPorStatus(resposta.status)
  return { ok: false, categoria, mensagem, ms }
}
