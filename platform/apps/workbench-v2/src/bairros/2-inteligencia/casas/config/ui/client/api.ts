// ============================================================================
// Casa Config — CLIENTE DA ROTA (navegador): fala com GET/PUT /api/config.
// Erro vira Error com a mensagem do servidor (ou o HTTP honesto).
// ============================================================================
import type { ConfigAgente, ConfigParcial } from '../../contract'

async function mensagemDeErro(res: Response, acao: string): Promise<string> {
  try {
    const corpo: unknown = await res.json()
    if (
      typeof corpo === 'object' && corpo !== null && 'message' in corpo
      && typeof (corpo as { message?: unknown }).message === 'string'
    ) {
      return (corpo as { message: string }).message
    }
  } catch {
    // Corpo ilegível — cai no genérico abaixo.
  }
  return `Não foi possível ${acao} (HTTP ${res.status}).`
}

/** Lê a configuração atual do disco (via servidor). */
export async function carregarConfig(): Promise<ConfigAgente> {
  const res = await fetch('/api/config')
  if (!res.ok) throw new Error(await mensagemDeErro(res, 'carregar as configurações'))
  return (await res.json()) as ConfigAgente
}

/** Salva parte ou tudo; o servidor grampeia e devolve o resultado final. */
export async function salvarConfig(parcial: ConfigParcial): Promise<ConfigAgente> {
  const res = await fetch('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parcial),
  })
  if (!res.ok) throw new Error(await mensagemDeErro(res, 'salvar as configurações'))
  return (await res.json()) as ConfigAgente
}
