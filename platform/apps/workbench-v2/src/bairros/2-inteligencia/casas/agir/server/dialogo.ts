// ============================================================================
// Casa Agir — DIÁLOGO TRADUZIDO (conquista 2): o histórico da conversa tem
// mensagens do dono, da IA e das FERRAMENTAS. Cada protocolo tem seu jeito
// de representar o pedido (a IA pedindo) e o resultado (a casa respondendo):
//   openai  → assistant.tool_calls + role:'tool'
//   anthropic → blocos tool_use + user.tool_result
//   gemini  → parts functionCall + functionResponse
//   ollama  → assistant.tool_calls (argumentos em OBJETO) + role:'tool'
// Sem tradução fiel, o modelo "esquece" o que pediu na iteração anterior — e o
// loop vira cabra-cega (ou repete, ou inventa). É a segunda metade do anúncio.
// ============================================================================
import type { InstrucaoAgir, MensagemAgir, ProtocoloAgir } from '../contract'

export function traduzirHistorico(protocolo: ProtocoloAgir, mensagens: MensagemAgir[]): unknown[] {
  return mensagens.map((mensagem): unknown => {
    if (mensagem.papel === 'usuario') {
      if (protocolo === 'anthropic') return { role: 'user', content: [{ type: 'text', text: mensagem.conteudo }] }
      if (protocolo === 'gemini') return { role: 'user', parts: [{ text: mensagem.conteudo }] }
      return { role: 'user', content: mensagem.conteudo }
    }

    if (mensagem.papel === 'ferramenta') {
      const nome = mensagem.ferramenta ?? 'ferramenta'
      if (protocolo === 'openai-chat') return { role: 'tool', tool_call_id: mensagem.pedidoId ?? '', content: mensagem.conteudo }
      if (protocolo === 'anthropic') {
        return { role: 'user', content: [{ type: 'tool_result', tool_use_id: mensagem.pedidoId ?? '', content: mensagem.conteudo }] }
      }
      if (protocolo === 'gemini') {
        return { role: 'user', parts: [{ functionResponse: { name: nome, response: { resultado: mensagem.conteudo } } }] }
      }
      return { role: 'tool', content: mensagem.conteudo } // ollama
    }

    // assistente — com ou sem pedidos de ferramenta no bolso:
    const pedidos = mensagem.pedidos ?? []
    if (protocolo === 'openai-chat') {
      return {
        role: 'assistant',
        content: mensagem.conteudo === '' ? null : mensagem.conteudo,
        ...(pedidos.length > 0
          ? {
              tool_calls: pedidos.map((p) => ({
                id: p.id,
                type: 'function',
                function: { name: p.ferramenta, arguments: JSON.stringify(p.argumentos) },
              })),
            }
          : {}),
      }
    }
    if (protocolo === 'anthropic') {
      return {
        role: 'assistant',
        content: [
          ...(mensagem.conteudo !== '' ? [{ type: 'text', text: mensagem.conteudo }] : []),
          ...pedidos.map((p) => ({ type: 'tool_use', id: p.id, name: p.ferramenta, input: p.argumentos })),
        ],
      }
    }
    if (protocolo === 'gemini') {
      return {
        role: 'model',
        parts: [
          ...(mensagem.conteudo !== '' ? [{ text: mensagem.conteudo }] : []),
          ...pedidos.map((p) => ({ functionCall: { name: p.ferramenta, args: p.argumentos } })),
        ],
      }
    }
    return {
      // ollama — argumentos em OBJETO (não em texto):
      role: 'assistant',
      content: mensagem.conteudo,
      ...(pedidos.length > 0
        ? { tool_calls: pedidos.map((p) => ({ function: { name: p.ferramenta, arguments: p.argumentos } })) }
        : {}),
    }
  })
}

// ── Instrução de PRODUTO (D141 / E-1 opção (b), DP-06) ────────────────────────
// A instrução NÃO é mensagem: entra pelo mecanismo nativo de cada protocolo, no
// mesmo espírito do anúncio de ferramentas ("um jeito por protocolo, sempre com
// o MESMO conteúdo"). É assim que uma skill invocada manualmente (RF14-2) chega
// ao modelo sem virar fala do usuário no transcript.

/**
 * O texto único da instrução, igual para os quatro protocolos. Diz de onde veio
 * e por quê — o modelo não deve achar que o produto falou como se fosse o dono.
 */
export function textoDeInstrucoes(instrucoes: readonly InstrucaoAgir[]): string {
  const ativas = instrucoes.filter((instrucao) => instrucao.corpo.trim().length > 0)
  if (ativas.length === 0) return ''
  const cabecalho = ativas.length === 1
    ? 'O dono invocou a habilidade abaixo nesta execução. Siga a instrução dela.'
    : `O dono invocou ${ativas.length} habilidades nesta execução. Siga as instruções abaixo.`
  const blocos = ativas.map((instrucao) => `## /${instrucao.nome}\n${instrucao.corpo.trim()}`)
  return `${cabecalho}\n\n${blocos.join('\n\n')}`
}

/**
 * Aplica a instrução ao corpo do pedido, no campo que CADA protocolo reserva
 * para instrução de sistema. Sem instrução, devolve o corpo intocado — o que
 * mantém o contrato aditivo de D141 (ausente = comportamento anterior).
 *
 *   openai-chat e ollama → mensagem `role:'system'` À FRENTE do histórico
 *   anthropic            → parâmetro `system` de TOPO (nunca vira mensagem)
 *   gemini               → `systemInstruction.parts[].text`
 */
export function aplicarInstrucoes(
  protocolo: ProtocoloAgir,
  corpo: Record<string, unknown>,
  instrucoes: readonly InstrucaoAgir[],
): Record<string, unknown> {
  const texto = textoDeInstrucoes(instrucoes)
  if (!texto) return corpo

  if (protocolo === 'anthropic') {
    const anterior = typeof corpo.system === 'string' ? corpo.system : ''
    return { ...corpo, system: anterior ? `${anterior}\n\n${texto}` : texto }
  }
  if (protocolo === 'gemini') {
    // Nada mais neste código escreve systemInstruction; se um dia escrever,
    // concatenar em vez de sobrescrever.
    const anterior = corpo.systemInstruction
    const partesAnteriores = typeof anterior === 'object' && anterior !== null && Array.isArray((anterior as { parts?: unknown }).parts)
      ? ((anterior as { parts: unknown[] }).parts)
      : []
    return { ...corpo, systemInstruction: { parts: [...partesAnteriores, { text: texto }] } }
  }
  const mensagens = Array.isArray(corpo.messages) ? (corpo.messages as unknown[]) : []
  return { ...corpo, messages: [{ role: 'system', content: texto }, ...mensagens] }
}
