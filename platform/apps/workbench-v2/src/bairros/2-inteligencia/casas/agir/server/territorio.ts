// Casa Agir — resolução de caminhos para o processo local.
// O workspace é a base para caminhos relativos; caminhos absolutos e `..` que
// apontam para outro diretório são permitidos quando a conta do SO tem acesso.
// Esta não é uma sandbox nem uma contenção contra processo concorrente.
import * as nodePath from 'node:path'

export type VereditoTerritorio =
  | { liberado: true; caminho: string }
  | { liberado: false; motivo: string }

export type ImplPath = Pick<typeof nodePath, 'resolve' | 'sep' | 'isAbsolute'>

/** Resolve paths absolutos ou relativos ao workspace; rejeita entradas ambíguas. */
export function verificarTerritorio(
  raiz: string,
  caminhoEntrada: unknown,
  pathImpl: ImplPath = nodePath,
): VereditoTerritorio {
  if (typeof caminhoEntrada !== 'string' || caminhoEntrada.trim() === '') {
    return { liberado: false, motivo: 'O caminho do arquivo veio vazio.' }
  }
  let entrada = caminhoEntrada.trim()
  // Aceita a forma /C:/... usada por alguns modelos ao produzir paths Windows.
  if (pathImpl.sep === '\\') entrada = entrada.replace(/^\/(?=[A-Za-z]:[\\/])/, '')
  if (entrada.includes('\0')) return { liberado: false, motivo: 'O caminho contém um caractere inválido.' }
  try {
    return { liberado: true, caminho: pathImpl.resolve(raiz, entrada) }
  } catch {
    return { liberado: false, motivo: 'O caminho não pôde ser resolvido pelo sistema operacional.' }
  }
}
