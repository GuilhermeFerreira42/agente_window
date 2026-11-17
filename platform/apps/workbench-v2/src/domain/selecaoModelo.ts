// ============================================================================
// C-2 — seleção de modelo: regra ÚNICA do par providerId/modelId (token) e
// decodificação. Extraída de ChatInput para compartilhar com o seletor
// superior da landing sem duplicar catálogo nem criar dois cadastros.
// Puro: sem IO, sem catálogo próprio (o catálogo pertence a Provedores).
// ============================================================================

import type { SelecaoModelo } from '../bairros/2-inteligencia/casas/conversa'

export const MODEL_AUTO = 'Auto'

/** Token de UI para um par exato. Mesmo label em dois provedores = tokens distintos. */
export function tokenDoPar(providerId: string, modelId: string): string {
  return `pair:${encodeURIComponent(providerId)}:${encodeURIComponent(modelId)}`
}

/**
 * Decodifica o token da UI em SelecaoModelo. Token inválido vira seleção
 * explícita vazia (o consumidor trata como indisponível — nunca Auto).
 */
export function selecaoDoToken(token: string): SelecaoModelo {
  if (token === MODEL_AUTO) return { tipo: 'auto' }
  const partes = token.startsWith('pair:') ? token.slice(5).split(':') : []
  if (partes.length !== 2) return { tipo: 'explicita', providerId: '', modelId: '' }
  try {
    return { tipo: 'explicita', providerId: decodeURIComponent(partes[0]), modelId: decodeURIComponent(partes[1]) }
  } catch {
    return { tipo: 'explicita', providerId: '', modelId: '' }
  }
}

/** Token canônico de uma seleção (Auto ou par). */
export function tokenDaSelecao(selecao: SelecaoModelo): string {
  return selecao.tipo === 'auto' ? MODEL_AUTO : tokenDoPar(selecao.providerId, selecao.modelId)
}

/** Par exato exibido no resumo inferior (mesma seleção, nunca escolha nova). */
export function rotuloDaSelecao(selecao: SelecaoModelo): string {
  return selecao.tipo === 'auto' ? MODEL_AUTO : `${selecao.providerId} / ${selecao.modelId}`
}

/** Igualdade estrutural da seleção (par exato; sem normalização de label). */
export function mesmaSelecao(a: SelecaoModelo, b: SelecaoModelo): boolean {
  if (a.tipo === 'auto' || b.tipo === 'auto') return a.tipo === b.tipo
  return a.providerId === b.providerId && a.modelId === b.modelId
}
