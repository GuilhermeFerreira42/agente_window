// ============================================================================
// Casa Agir — extratores do canal NATIVO (Q4=(b), D93): cada protocolo fala
// sua língua para pedir ferramentas, à imagem do `extrairTexto` da casa
// Conversa (espelho de forma — a vizinha NÃO é importada). Regras:
//   · pedido de ferramenta desconhecida → IGNORADO (nunca derruba o fio);
//   · argumentos em JSON torto → a chamada é ignorada (o modelo tentará de
//     novo na próxima iteração);
//   · a validade dos argumentos (o que é obrigatório) é problema de QUEM
//     EXECUTA — aqui só traduzimos o pedido.
// ============================================================================
import type {
  ArgumentosFerramenta,
  FerramentaId,
  PedidoFerramenta,
  ProtocoloAgir,
} from '../contract'
import { ehFerramentaConhecida } from './ferramentas'

/** JSON que pode estar torto: devolve null em vez de estourar. */
function jsonTolerante(texto: unknown): ArgumentosFerramenta | null {
  if (typeof texto !== 'string' || texto.trim() === '') return {}
  try {
    const dado: unknown = JSON.parse(texto)
    return dado !== null && typeof dado === 'object' ? (dado as ArgumentosFerramenta) : null
  } catch {
    return null
  }
}

function objetoTolerante(dado: unknown): ArgumentosFerramenta | null {
  return dado !== null && typeof dado === 'object' && !Array.isArray(dado)
    ? (dado as ArgumentosFerramenta)
    : null
}

/** Registro do corpo já na forma de objeto (corpos tortos → null). */
function comoObjeto(corpo: unknown): Record<string, unknown> | null {
  return corpo !== null && typeof corpo === 'object' ? (corpo as Record<string, unknown>) : null
}

function pedidoLimpo(
  idBruto: unknown,
  nomeBruto: unknown,
  argumentos: ArgumentosFerramenta | null,
  indice: number,
): PedidoFerramenta | null {
  if (!ehFerramentaConhecida(nomeBruto)) return null
  if (argumentos === null) return null
  const id = typeof idBruto === 'string' && idBruto !== '' ? idBruto : `chamada_${indice + 1}`
  return { id, ferramenta: nomeBruto as FerramentaId, argumentos }
}

// ── openai-chat: `choices[0].delta.tool_calls[]` (streaming) ou
//    `choices[0].message.tool_calls[]` (resposta inteira).
//    Os argumentos chegam como TEXTO JSON — é assim que o canal fala.
function extrairOpenai(corpo: Record<string, unknown>): PedidoFerramenta[] {
  const escolhas = Array.isArray(corpo.choices) ? corpo.choices : []
  const primeira = escolhas[0] as { delta?: unknown; message?: unknown } | undefined
  if (!primeira) return []
  const origem = (primeira.delta ?? primeira.message) as Record<string, unknown> | undefined
  const chamadas = Array.isArray(origem?.tool_calls) ? origem.tool_calls : []
  const brutos: Array<PedidoFerramenta | null> = []
  chamadas.forEach((bruta, indice) => {
    const chamada = bruta as { id?: unknown; function?: { name?: unknown; arguments?: unknown } }
    brutos.push(pedidoLimpo(chamada.id, chamada.function?.name, jsonTolerante(chamada.function?.arguments), indice))
  })
  return brutos.filter((p): p is PedidoFerramenta => p !== null)
}

// ── anthropic: blocos `content[]` com `type: 'tool_use'` → {id, name, input}.
function extrairAnthropic(corpo: Record<string, unknown>): PedidoFerramenta[] {
  const blocos = Array.isArray(corpo.content) ? corpo.content : []
  const brutos: Array<PedidoFerramenta | null> = []
  let indice = 0
  for (const bruto of blocos) {
    const bloco = bruto as { type?: unknown; id?: unknown; name?: unknown; input?: unknown }
    if (bloco.type !== 'tool_use') continue
    brutos.push(pedidoLimpo(bloco.id, bloco.name, objetoTolerante(bloco.input), indice))
    indice += 1
  }
  return brutos.filter((p): p is PedidoFerramenta => p !== null)
}

// ── gemini: `candidates[].content.parts[]` com `functionCall {name, args}`.
function extrairGemini(corpo: Record<string, unknown>): PedidoFerramenta[] {
  const candidatos = Array.isArray(corpo.candidates) ? corpo.candidates : []
  const brutos: Array<PedidoFerramenta | null> = []
  for (const bruto of candidatos) {
    const candidato = bruto as { content?: { parts?: unknown[] } }
    const partes = Array.isArray(candidato.content?.parts) ? candidato.content.parts : []
    let indice = 0
    for (const brutoParte of partes) {
      const parte = brutoParte as { functionCall?: { name?: unknown; args?: unknown } }
      if (!parte.functionCall) continue
      brutos.push(pedidoLimpo(undefined, parte.functionCall.name, objetoTolerante(parte.functionCall.args), indice))
      indice += 1
    }
  }
  return brutos.filter((p): p is PedidoFerramenta => p !== null)
}

// ── ollama: `message.tool_calls[]` → {function: {name, arguments}} com
//    argumentos JÁ em objeto (não em texto).
function extrairOllama(corpo: Record<string, unknown>): PedidoFerramenta[] {
  const mensagem = corpo.message as { tool_calls?: unknown } | undefined
  const chamadas = Array.isArray(mensagem?.tool_calls) ? mensagem.tool_calls : []
  const brutos: Array<PedidoFerramenta | null> = []
  chamadas.forEach((bruta, indice) => {
    const chamada = bruta as { id?: unknown; function?: { name?: unknown; arguments?: unknown } }
    brutos.push(pedidoLimpo(chamada.id, chamada.function?.name, objetoTolerante(chamada.function?.arguments), indice))
  })
  return brutos.filter((p): p is PedidoFerramenta => p !== null)
}

/**
 * Traduz UM corpo de resposta do provedor nos pedidos de ferramenta que ele
 * contém (vazio = resposta comum, sem ferramenta). Nunca estoura: corpo
 * torto devolve lista vazia.
 */
export function extrairFerramentas(protocolo: ProtocoloAgir, corpo: unknown): PedidoFerramenta[] {
  const objeto = comoObjeto(corpo)
  if (!objeto) return []
  if (protocolo === 'openai-chat') return extrairOpenai(objeto)
  if (protocolo === 'anthropic') return extrairAnthropic(objeto)
  if (protocolo === 'gemini') return extrairGemini(objeto)
  return extrairOllama(objeto)
}
