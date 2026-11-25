// C-3a — Lixeira para os blobs privados de anexo (R12/B06).
//
// Reutiliza a porta existente `moverParaLixeira` (Casa Agir, FATIA 12) tal como
// ela é — K1 recusa link, K2 confere identidade, K3 recusa EXDEV em vez de
// copiar+apagar. Nenhuma exclusão permanente de arquivo final é usada como
// fallback: se a Lixeira não aceitar, o plano fica `falhou` e o arquivo fica
// onde está.
//
// O adapter é injetável: os ensaios apontam `pastaTrash` para um diretório
// temporário e a plataforma é explícita, sem tocar a Lixeira real do usuário.
import { moverParaLixeira, type OpcoesLixeira, type ResultadoLixeira } from '../../../bairros/2-inteligencia/casas/agir/server/lixeira'

export type { OpcoesLixeira, ResultadoLixeira }

export interface PortaLixeira {
  mover(absoluto: string, opcoes?: OpcoesLixeira): Promise<ResultadoLixeira>
}

export const lixeiraDoSistema: PortaLixeira = {
  mover: (absoluto, opcoes) => moverParaLixeira(absoluto, opcoes),
}

/**
 * Motivos em que a operação é definitivamente recusada (retentar não muda o
 * resultado) — o plano fica `falhou` e a exclusão NÃO é anunciada concluída.
 */
export function recusaDefinitiva(resultado: ResultadoLixeira): boolean {
  if (resultado.ok) return false
  if (resultado.efeitoIniciado) return false // pode ter movido: estado incerto exige retomada
  const motivo = resultado.motivo ?? ''
  return /link \(não um arquivo|outro disco|não tem lixeira conhecida|Não existe nada/i.test(motivo)
}
