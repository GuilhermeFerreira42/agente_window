// ============================================================================
// Casa Config — contrato da FATIA 11 (preferências do agente).
// A v1 tem 2 ajustes: teto de iterações + auto-scroll do chat. Sem segredos —
// só números e liga/desliga (Q11-4, D93: settings.json, nunca .env).
// ============================================================================
/** Teto de iterações do agente: 1–250 por mensagem (Q11-2), padrão 25 (igual ao original). */
export const TETO_MINIMO = 1
export const TETO_MAXIMO = 250
export const TETO_PADRAO = 25

/** Auto-scroll do chat: LIGADO de fábrica (Q11-3). */
export const AUTOSCROLL_PADRAO = true
/** O chat só desce sozinho se já estiver a esta distância do fim (RF11-6). */
export const AUTOSCROLL_LIMITE_PX = 120

/** As preferências do agente (v1: 2 campos — a casa cresce por aqui). */
export interface ConfigAgente {
  teto: number
  autoScroll: boolean
}

/** O que a tela manda para salvar: parcial de propósito (só o que mudou). */
export interface ConfigParcial {
  teto?: unknown
  autoScroll?: unknown
}
