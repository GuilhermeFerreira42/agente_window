export type OrigemCapacidade = 'api' | 'gateway' | 'catalogo' | 'manual'
export interface LimitesContexto { total?: number; entrada?: number; saida?: number }
export interface CapacidadeContexto {
  limites: LimitesContexto
  fontes: Array<{ origem: OrigemCapacidade; versao: string; limites: LimitesContexto }>
  consultadaEm: number
  identidade: { solicitada: string; destinos: string[]; estado: 'modelo' | 'pool' | 'desconhecida' }
  estado: 'identificada' | 'parcial' | 'desconhecida'
  avisos: Array<'conflito' | 'pool-incompleto' | 'descoberta-indisponivel' | 'manual-limitado'>
}

export function limiteValido(n: unknown): n is number {
  return typeof n === 'number' && Number.isSafeInteger(n) && n > 0 && n <= 4_294_967_295
}
export function combinarLimites(fontes: LimitesContexto[]): LimitesContexto {
  return Object.fromEntries((['total', 'entrada', 'saida'] as const).flatMap((campo) => {
    const valores = fontes.map((f) => f[campo]).filter(limiteValido)
    return valores.length ? [[campo, Math.min(...valores)]] : []
  }))
}
/** Limite de entrada já é entrada: não descontar saída duas vezes. */
export function orcamentoContexto(capacidade: CapacidadeContexto | undefined, reserva: number, totalLegado?: number) {
  const limites = capacidade?.limites ?? { total: totalLegado }
  const candidatos: number[] = []
  if (limiteValido(limites.total)) candidatos.push(Math.max(0, limites.total - reserva))
  if (limiteValido(limites.entrada)) candidatos.push(limites.entrada)
  if (!candidatos.length) return undefined
  const entrada = Math.min(...candidatos)
  return { entrada, preventivo: Math.floor(entrada * 0.75) }
}
