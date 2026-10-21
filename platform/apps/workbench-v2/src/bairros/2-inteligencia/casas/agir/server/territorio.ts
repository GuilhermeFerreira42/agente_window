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

/**
 * Forma CANÔNICA para comparar dois caminhos no Windows (FATIA 12 C5): o SO
 * é case-insensitive e o realpath da raiz pode vir com o prefixo `\\?\`
 * ou com caixa diferente da que o modelo digitou (`Usuario` x `usuario`) —
 * comparar cru diz "fora" para pasta de DENTRO (o dono provou no teste real).
 * No POSIX a comparação segue exata (o SO é case-sensitive).
 */
function canonicoParaComparar(resolvido: string, pathImpl: ImplPath): string {
  if (pathImpl.sep !== '\\') return resolvido
  const semPrefixo = resolvido.startsWith('\\\\?\\') ? resolvido.slice(4) : resolvido
  return semPrefixo.toLowerCase()
}

export function verificarTerritorio(
  raiz: string,
  caminhoEntrada: unknown,
  pathImpl: ImplPath = nodePath,
): VereditoTerritorio {
  if (typeof caminhoEntrada !== 'string' || caminhoEntradoTrim(caminhoEntrada) === '') {
    return { liberado: false, motivo: 'O caminho do arquivo veio vazio.' }
  }
  let entrada = caminhoEntrada.trim()
  // Modelo às vezes manda absoluto com barra inicial (`/C:/...`, jeito POSIX)
  // — no Windows isso resolve para um lugar inexistente (C5).
  if (pathImpl.sep === '\\') entrada = entrada.replace(/^\/(?=[A-Za-z]:[\\/])/, '')
  const raizResolvida = pathImpl.resolve(raiz)
  const resolvido = pathImpl.resolve(raizResolvida, entrada)
  const raizC = canonicoParaComparar(raizResolvida, pathImpl)
  const resolvidoC = canonicoParaComparar(resolvido, pathImpl)
  const dentro =
    resolvidoC === raizC || resolvidoC.startsWith(raizC + pathImpl.sep)
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
