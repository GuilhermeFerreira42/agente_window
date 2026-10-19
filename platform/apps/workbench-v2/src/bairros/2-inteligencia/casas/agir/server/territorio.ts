// ============================================================================
// Casa Agir — TRAVA DE TERRITÓRIO (SPEC PARTE 2D §4/§5): nenhuma ferramenta
// sai da pasta de trabalho. Aceita caminho relativo OU absoluto DENTRO da
// pasta (lição do teste do dono em 18/10: gente e modelo escrevem caminho
// absoluto — o que decide é onde resolve, não o formato). `..` que escapa,
// unidade/pasta de fora e caminho vazio = RECUSA HONESTA, sem executar.
// A trava é pura (só caminhos) — quem lê/escreve é o disco (discos.ts).
// ============================================================================
import * as nodePath from 'node:path'

/** Resultado da trava: liberado com o caminho resolvido, ou recusa com motivo. */
export type VereditoTerritorio =
  | { liberado: true; caminho: string }
  | { liberado: false; motivo: string }

/** Módulo de caminhos injetável (testes usam `path.win32` sem depender do SO). */
export type ImplPath = Pick<typeof nodePath, 'resolve' | 'sep' | 'isAbsolute'>

export function verificarTerritorio(
  raiz: string,
  caminhoEntrada: unknown,
  pathImpl: ImplPath = nodePath,
): VereditoTerritorio {
  if (typeof caminhoEntrada !== 'string' || caminhoEntradoTrim(caminhoEntrada) === '') {
    return { liberado: false, motivo: 'O caminho do arquivo veio vazio.' }
  }
  const entrada = caminhoEntrada.trim()
  const raizResolvida = pathImpl.resolve(raiz)
  const resolvido = pathImpl.resolve(raizResolvida, entrada)
  const dentro =
    resolvido === raizResolvida || resolvido.startsWith(raizResolvida + pathImpl.sep)
  if (!dentro) {
    return {
      liberado: false,
      motivo: `Fora da pasta de trabalho: "${entrada}" resolve para fora de "${raizResolvida}". As ferramentas só mexem dentro da pasta (SPEC PARTE 2D).`,
    }
  }
  return { liberado: true, caminho: resolvido }
}

function caminhoEntradoTrim(texto: string): string {
  return texto.trim()
}
