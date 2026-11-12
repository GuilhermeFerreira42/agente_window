export type OrigemCapacidade = 'api' | 'gateway' | 'catalogo' | 'manual'
export interface LimitesContexto { total?: number; entrada?: number; saida?: number }
export function modoContextoEfetivo(config: { modoContexto?: 'auto' | 'manual'; contextoModelo?: string }): 'auto' | 'manual' {
  return config.modoContexto ?? (config.contextoModelo ? 'manual' : 'auto')
}
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

/** Preferência é um teto, não promessa de geração. Auto ignora a reserva manual. */
export function saidaEfetiva(configurada: number | undefined, capacidade?: Pick<CapacidadeContexto, 'limites'>, modo?: 'auto' | 'manual'): number | undefined {
  const limites = capacidade?.limites
  let saida = modo === 'auto' ? 4096 : limiteValido(configurada) ? configurada : limites?.saida ? Math.min(4096, limites.saida) : undefined
  if (saida === undefined) return undefined
  if (limiteValido(limites?.saida)) saida = Math.min(saida, limites.saida)
  // Uma reserva que ocupa toda a janela nunca deixa espaço para a pergunta.
  // Reduzir apenas a reserva inválida, preservando tetos manuais utilizáveis.
  if (limiteValido(limites?.total) && saida >= limites.total) saida = Math.min(4096, Math.floor(limites.total / 4))
  return Math.max(1, saida)
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
