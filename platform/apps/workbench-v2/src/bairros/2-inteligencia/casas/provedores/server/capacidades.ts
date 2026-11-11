import { createHash } from 'node:crypto'
import type { Protocolo, ProvedorConfig } from '../contract'
import { combinarLimites, limiteValido, type CapacidadeContexto, type LimitesContexto } from '../../../../../domain/capacidadeContexto'

type Registro = Record<string, unknown>
const obj = (v: unknown): Registro => v && typeof v === 'object' && !Array.isArray(v) ? v as Registro : {}
const nomeSeguro = (v: unknown): string | undefined => typeof v === 'string' && /^[\w./:@+-]{1,180}$/.test(v) && !/sk-|nvapi-|AIza/.test(v) ? v : undefined
const cache = new Map<string, { expira: number; pedido: Promise<CapacidadeContexto> }>()
export function invalidarCapacidades() { cache.clear() }

// Catálogo pequeno, exato e revisável; não identifica deployments pelo apelido.
export const VERSAO_CATALOGO = '2026-11-11.1'
export const VALIDADE_CATALOGO = '2027-02-11T00:00:00Z'
const catalogo: Record<string, LimitesContexto> = {
  'gemini-2.5-flash': { entrada: 1_048_576, saida: 65_536 },
  'gemini-2.5-pro': { entrada: 1_048_576, saida: 65_536 },
  'gpt-4.1': { total: 1_047_576, saida: 32_768 },
  'gpt-4.1-mini': { total: 1_047_576, saida: 32_768 },
  'gpt-4o': { total: 128_000, saida: 16_384 },
  'claude-sonnet-4-20250514': { total: 200_000, saida: 64_000 },
  'nvidia/nemotron-3.5-lightning-30b-a3b': { total: 1_000_000 },
}
function doCatalogo(modelo: string, protocolo: Protocolo, base: string): LimitesContexto | undefined {
  if (Date.now() > Date.parse(VALIDADE_CATALOGO)) return
  let host: string
  try { host = new URL(base).hostname } catch { return }
  if (!['api.openai.com', 'api.anthropic.com', 'generativelanguage.googleapis.com', 'integrate.api.nvidia.com'].includes(host)) return
  const id = protocolo === 'gemini' ? modelo.replace(/^models\//, '') : modelo
  return Object.prototype.hasOwnProperty.call(catalogo, id) ? catalogo[id] : undefined
}

/** Metadados somente; nunca recebe mensagens ou caminhos de projeto. */
async function jsonLimitado(url: string, apiKey: string | null, protocolo: Protocolo, body?: object): Promise<unknown> {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 1800)
  try {
    const response = await fetch(url, { method: body ? 'POST' : 'GET', redirect: 'error', signal: controller.signal,
      headers: { ...(protocolo === 'anthropic' ? { 'anthropic-version': '2023-06-01' } : {}),
        ...(apiKey ? protocolo === 'gemini' ? { 'x-goog-api-key': apiKey } : protocolo === 'anthropic' ? { 'x-api-key': apiKey } : { Authorization: `Bearer ${apiKey}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
    if (!response.ok || !response.body) { await response.body?.cancel(); return undefined }
    const reader = response.body.getReader(), partes: Uint8Array[] = []; let tamanho = 0
    try {
      while (true) {
        const { value, done } = await reader.read(); if (done) break
        tamanho += value.length; if (tamanho > 512_000) return undefined
        partes.push(value)
      }
      return JSON.parse(Buffer.concat(partes).toString('utf8')) as unknown
    } finally { await reader.cancel().catch(() => undefined) }
  } catch { return undefined } finally { clearTimeout(timer) }
}

function limitesAPI(registro: Registro): LimitesContexto {
  return Object.fromEntries(Object.entries({ total: registro.context_window ?? registro.context_length ?? registro.max_model_len,
    entrada: registro.max_input_tokens ?? registro.inputTokenLimit, saida: registro.max_output_tokens ?? registro.outputTokenLimit })
    .filter(([, v]) => limiteValido(v)))
}
function membrosPool(dados: unknown, modelo: string) {
  const todos = obj(dados).data
  return Array.isArray(todos) ? todos.map(obj).filter((m) => m.model_name === modelo) : []
}

export async function descobrirCapacidade(config: { providerId: string; modelId: string; protocolo: Protocolo; baseUrl: string; apiKey: string | null },
  salvo: ProvedorConfig, forcar = false): Promise<CapacidadeContexto> {
  const chave = createHash('sha256').update(JSON.stringify([config, salvo])).digest('hex')
  const agora = Date.now(), existente = cache.get(chave)
  if (!forcar && existente && existente.expira > agora) return structuredClone(await existente.pedido)
  const pedido = descobrir(config, salvo)
  if (cache.size >= 128) cache.delete(cache.keys().next().value!)
  cache.set(chave, { expira: agora + 60_000, pedido })
  const resultado = await pedido
  const atual = cache.get(chave)
  if (atual?.pedido === pedido && resultado.estado === 'desconhecida') atual.expira = agora + 15_000
  return structuredClone(resultado)
}

async function descobrir(config: { providerId: string; modelId: string; protocolo: Protocolo; baseUrl: string; apiKey: string | null }, salvo: ProvedorConfig): Promise<CapacidadeContexto> {
  const { modelId: modelo, protocolo, apiKey } = config
  const base = config.baseUrl.replace(/\/+$/, '')
  const resultado: CapacidadeContexto = { limites: {}, fontes: [], consultadaEm: Date.now(),
    identidade: { solicitada: modelo, destinos: [], estado: 'desconhecida' }, estado: 'desconhecida', avisos: [] }
  const adicionar = (origem: 'api' | 'gateway' | 'catalogo' | 'manual', limites: LimitesContexto, versao = 'endpoint') => {
    if (Object.keys(limites).length) resultado.fontes.push({ origem, limites, versao })
  }
  const conhecido = doCatalogo(modelo, protocolo, base)
  if (conhecido) { adicionar('catalogo', conhecido, VERSAO_CATALOGO); resultado.identidade = { solicitada: modelo, destinos: [modelo], estado: 'modelo' } }
  if (protocolo === 'anthropic') {
    const dados = obj(await jsonLimitado(`${base}/models/${encodeURIComponent(modelo)}`, apiKey, protocolo))
    adicionar('api', limitesAPI({ ...dados, max_output_tokens: dados.max_tokens }))
    const nome = nomeSeguro(dados.id)
    if (nome) resultado.identidade = { solicitada: modelo, destinos: [nome], estado: 'modelo' }
  } else if (protocolo === 'gemini') {
    const nome = modelo.replace(/^models\//, '')
    const dados = obj(await jsonLimitado(`${base}/models/${encodeURIComponent(nome)}`, apiKey, protocolo))
    adicionar('api', limitesAPI(dados))
    if (nomeSeguro(dados.name)) resultado.identidade = { solicitada: modelo, destinos: [String(dados.name)], estado: 'modelo' }
  } else if (protocolo === 'ollama') {
    const dados = obj(await jsonLimitado(`${base.replace(/\/api$/, '')}/api/show`, apiKey, protocolo, { model: modelo }))
    const info = obj(dados.model_info)
    const limite = Object.entries(info).find(([k]) => k.endsWith('.context_length'))?.[1]
    const parametros = typeof dados.parameters === 'string' ? dados.parameters.match(/(?:^|\n)\s*num_ctx\s+(\d+)/)?.[1] : undefined
    const rodando = obj(await jsonLimitado(`${base.replace(/\/api$/, '')}/api/ps`, apiKey, protocolo)).models
    const normalizar = (m: unknown) => typeof m === 'string' ? m.replace(/:latest$/, '') : ''
    const carregado = Array.isArray(rodando) ? rodando.map(obj).find((m) => normalizar(m.name ?? m.model) === normalizar(modelo)) : undefined
    const runtime = combinarLimites([{ total: limiteValido(carregado?.context_length) ? carregado.context_length : undefined },
      { total: parametros && limiteValido(Number(parametros)) ? Number(parametros) : undefined }]).total
    // Arquitetura sozinha não informa a alocação local efetiva.
    if (limiteValido(runtime)) adicionar('api', combinarLimites([{ total: limiteValido(limite) ? limite : undefined }, { total: runtime }]))
    else if (limiteValido(limite) && salvo.modoContexto !== 'auto' && salvo.contextoModelo === modelo && limiteValido(salvo.contexto)) {
      adicionar('api', { total: limite })
    }
    if (Object.keys(info).length) resultado.identidade = { solicitada: modelo, destinos: [modelo], estado: 'modelo' }
  } else if (protocolo === 'openai-chat') {
    const url = new URL(base)
    const oficial = ['api.openai.com', 'integrate.api.nvidia.com'].includes(url.hostname)
    if (!oficial) {
      const raiz = base.replace(/\/v1$/, '')
      const pool = membrosPool(await jsonLimitado(`${raiz}/model/info`, apiKey, protocolo), modelo)
      if (pool.length) {
        const anunciados = pool.map((m) => limitesAPI(obj(m.model_info)))
        const nominais = pool.map((m) => {
          const params = obj(m.litellm_params), nome = nomeSeguro(params.model)
          return nome && typeof params.api_base === 'string' ? doCatalogo(nome.replace(/^openai\//, ''), 'openai-chat', params.api_base) ?? {} : {}
        })
        const limites = anunciados.map((m, i) => combinarLimites([m, nominais[i]]))
        const nomes = pool.map((m) => nomeSeguro(obj(m.litellm_params).model))
        resultado.identidade = { solicitada: modelo, destinos: [...new Set(nomes.filter((n): n is string => !!n))], estado: nomes.every(Boolean) ? pool.length > 1 ? 'pool' : 'modelo' : 'desconhecida' }
        const todosComEntrada = limites.every((l) => l.total || l.entrada)
        for (const campo of ['total', 'entrada', 'saida'] as const) {
          if (campo === 'saida' ? !limites.every((l) => l.saida) : !todosComEntrada) continue
          const valores = limites.map((l) => l[campo]).filter(limiteValido)
          if (!valores.length) continue
          const minimo = Math.min(...valores)
          const origem = anunciados.some((l) => l[campo] === minimo) ? 'gateway' : 'catalogo'
          adicionar(origem, { [campo]: minimo }, origem === 'catalogo' ? VERSAO_CATALOGO : 'intersecao-deployments')
        }
        if (limites.some((l) => !l.total && !l.entrada)) resultado.avisos.push('pool-incompleto')
      } else {
        const lista = obj(await jsonLimitado(`${base}/models`, apiKey, protocolo)).data
        const registro = Array.isArray(lista) ? lista.map(obj).find((m) => m.id === modelo) : undefined
        if (registro) { if (registro.owned_by === 'litellm') resultado.avisos.push('pool-incompleto')
          else adicionar('gateway', limitesAPI(registro))
          const nome = nomeSeguro(registro.model ?? registro.id)
          if (nome && nome !== modelo) resultado.identidade = { solicitada: modelo, destinos: [nome], estado: 'modelo' } }
      }
    }
  }
  const manual = salvo.modoContexto !== 'auto' && salvo.contextoModelo === modelo && limiteValido(salvo.contexto) ? salvo.contexto : undefined
  if (manual) adicionar('manual', { total: manual }, 'usuario')
  resultado.limites = combinarLimites(resultado.fontes.map((f) => f.limites))
  for (const k of ['total', 'entrada', 'saida'] as const) {
    const valores = resultado.fontes.map((f) => f.limites[k]).filter(limiteValido)
    if (new Set(valores).size > 1 && !resultado.avisos.includes('conflito')) resultado.avisos.push('conflito')
  }
  if (manual && resultado.limites.total !== manual) resultado.avisos.push('manual-limitado')
  resultado.estado = resultado.limites.total || resultado.limites.entrada ? 'identificada' : Object.keys(resultado.limites).length ? 'parcial' : 'desconhecida'
  if (!resultado.fontes.some((f) => f.origem === 'api' || f.origem === 'gateway')) resultado.avisos.push('descoberta-indisponivel')
  return resultado
}
