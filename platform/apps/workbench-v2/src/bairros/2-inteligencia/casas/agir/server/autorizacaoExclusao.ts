import * as path from 'node:path'

/** Gramática deliberadamente estreita: texto humano integral, nunca histórico,
 * saída de tool, documento ou interpretação da LLM. Ambiguidade pede cartão. */
export function alvoExplicitoExclusao(texto: string): string | null {
  const match = /^(?:por favor[, ]+)?(?:exclua|excluir|apague|apagar|remova|remover|delete|trash)\s+(?:(?:o arquivo|a pasta|o diretório|o diretorio|arquivo|pasta|file|folder)\s+)?(.+?)(?:\s+por favor)?[.!]?$/iu.exec(texto.trim())
  if (!match) return null
  let alvo = match[1].trim()
  const aspas = /^(?:"([^"\r\n]+)"|'([^'\r\n]+)'|`([^`\r\n]+)`)$/u.exec(alvo)
  if (aspas) alvo = aspas[1] ?? aspas[2] ?? aspas[3]
  else if (!path.isAbsolute(alvo) || /\s/u.test(alvo)) return null
  if (/[\r\n\0*?<>|]/u.test(alvo) || /^(?:[A-Za-z]:[^\\/]|\\\\[?.]\\)/u.test(alvo)) return null
  return alvo
}

/** Fronteira verificável de tarefa: caminhos absolutos citados
 * literalmente na instrução atual. Relação semântica irrestrita não é provável
 * por paths; alvo externo fora deste escopo exige cartão, mesmo no automático. */
export function escopoExclusaoAutomatica(raiz: string, texto: string): string[] {
  const citados = [...texto.matchAll(/"([^"\r\n]+)"|'([^'\r\n]+)'|`([^`\r\n]+)`/gu)].map(m => m[1] ?? m[2] ?? m[3])
  const direto = alvoExplicitoExclusao(texto)
  return [...citados, ...(direto ? [path.resolve(raiz,direto)] : [])].filter(p => path.isAbsolute(p) && !/[\0*?<>|]/u.test(p)).map(p => path.resolve(p))
}

export function alvoDentroDoEscopo(raiz: string, entrada: unknown, escopo: string[]): boolean {
  if (typeof entrada !== 'string' || !entrada.trim()) return false
  const normalizar = (p: string): string => process.platform === 'win32' ? p.toLowerCase() : p
  const alvo = normalizar(path.resolve(raiz, entrada))
  return escopo.some(base => {
    const relativo = path.relative(normalizar(base), alvo)
    return relativo === '' || (!relativo.startsWith(`..${path.sep}`) && relativo !== '..' && !path.isAbsolute(relativo))
  })
}
