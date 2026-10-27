// Casa Provedores — cliente HTTP da tela (browser → servidor da casa).
// A chave só trafega INTEIRA pela rota de reveal (D83); o resto é máscara.
import type { EstadoProvedores, ResultadoModelos, ResultadoTeste, ResultadoVerificacaoToolCalling, SalvarProvedoresInput } from '../../contract'

async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  const resposta = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const corpo = (await resposta.json().catch(() => ({}))) as T & { message?: string }
  if (!resposta.ok) throw new Error(corpo?.message || `Falha na comunicação com o servidor (erro ${resposta.status}).`)
  return corpo
}

export function carregarEstado(): Promise<EstadoProvedores> {
  return pedir<EstadoProvedores>('/api/providers')
}

export function salvar(input: SalvarProvedoresInput): Promise<EstadoProvedores> {
  return pedir<EstadoProvedores>('/api/providers', { method: 'PUT', body: JSON.stringify(input) })
}

export function testar(alvo: { id: string; baseUrl: string; modelo: string; apiKey?: string }): Promise<ResultadoTeste> {
  return pedir<ResultadoTeste>('/api/providers/test', { method: 'POST', body: JSON.stringify(alvo) })
}

export function buscarModelos(alvo: { id: string; baseUrl: string; apiKey?: string }): Promise<ResultadoModelos> {
  return pedir<ResultadoModelos>('/api/providers/models', { method: 'POST', body: JSON.stringify(alvo) })
}

/** Canary de capability: exige consentimento no payload e sempre roda no backend. */
export function verificarToolCalling(input: { providerId: string; modelId: string; consent: true }): Promise<ResultadoVerificacaoToolCalling> {
  return pedir<ResultadoVerificacaoToolCalling>('/api/providers/tool-calling/verify', { method: 'POST', body: JSON.stringify(input) })
}

/** O "olhinho" (D83): a chave inteira, só neste clique. */
export async function revelarChave(id: string): Promise<string> {
  const corpo = await pedir<{ chave: string }>('/api/providers/reveal', { method: 'POST', body: JSON.stringify({ id }) })
  return corpo.chave
}
