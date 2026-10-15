// Registro dos provedores (D82): a lista oficial. A tela e o servidor leem
// daqui — ninguém mantém lista paralela (regra "quem manda é o descritor").
import type { Descritor } from '../../contract'
import {
  anthropic,
  deepseek,
  gemini,
  nvidia,
  ollama,
  openai,
  openaiCompat,
  openrouter,
} from './nativos'

/** Ordem de exibição na tela (nativos primeiro; o genérico vai por último). */
export const DESCRITORES: readonly Descritor[] = [
  openai,
  nvidia,
  anthropic,
  gemini,
  ollama,
  openrouter,
  deepseek,
  openaiCompat,
]

export function descritorPorId(id: string): Descritor | undefined {
  return DESCRITORES.find((d) => d.id === id)
}

export function idsDosDescritores(): string[] {
  return DESCRITORES.map((d) => d.id)
}
