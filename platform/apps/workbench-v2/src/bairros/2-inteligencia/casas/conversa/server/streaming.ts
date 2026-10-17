// ============================================================================
// Casa Conversa — encadernação do fio de streaming (conquista 2 da FATIA 09).
// Dois jeitos de empedaçar o que o provedor manda:
//   · SSE  (openai-chat, anthropic, gemini) — quadros separados por linha em branco
//   · NDJSON (ollama) — um JSON por linha
// O framer NÃO interpreta o conteúdo — só entrega payloads completos, mesmo
// que um quadro chegue partido no meio de dois pedaços de rede.
// ============================================================================
import type { AlvoConversa } from '../contract'

export interface Framer {
  /** Alimenta texto (pode cortar um quadro no meio) e devolve os payloads COMPLETOS. */
  entrar(texto: string): string[]
  /** Força a saída do que ficou pendente no fim da conexão. */
  fechar(): string[]
}

function payloadsDeBloco(bloco: string): string[] {
  const linhas = bloco.split(/\r?\n/)
  const dados = linhas.filter((linha) => linha.startsWith('data:'))
  if (dados.length === 0) return []
  const payload = dados
    .map((linha) => linha.slice(5).replace(/^ /, ''))
    .join('\n')
    .trim()
  return payload ? [payload] : []
}

function framerSSE(): Framer {
  let buffer = ''
  return {
    entrar(texto: string): string[] {
      buffer += texto
      const pedacos = buffer.split(/\r?\n\r?\n/)
      buffer = pedacos.pop() ?? ''
      return pedacos.flatMap((bloco) => payloadsDeBloco(bloco))
    },
    fechar(): string[] {
      const resto = buffer
      buffer = ''
      if (!resto.trim()) return []
      const payloads = payloadsDeBloco(resto)
      // Tolerância: provedor OpenAI-compatível que IGNOROU o stream e devolveu
      // JSON "cru" (sem moldura SSE), ou conexão que terminou sem separador final.
      if (payloads.length > 0) return payloads
      return [resto.trim()]
    },
  }
}

function framerNDJSON(): Framer {
  let buffer = ''
  return {
    entrar(texto: string): string[] {
      buffer += texto
      const linhas = buffer.split('\n')
      buffer = linhas.pop() ?? ''
      return linhas.map((linha) => linha.replace(/\r$/, '')).filter((linha) => linha.trim().length > 0)
    },
    fechar(): string[] {
      const resto = buffer
      buffer = ''
      return resto.trim() ? [resto.trim()] : []
    },
  }
}

export function criarFramer(protocolo: AlvoConversa['protocolo']): Framer {
  return protocolo === 'ollama' ? framerNDJSON() : framerSSE()
}
