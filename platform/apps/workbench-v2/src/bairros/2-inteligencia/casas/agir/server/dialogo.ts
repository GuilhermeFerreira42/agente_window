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
import type { MensagemAgir, ProtocoloAgir } from '../contract'

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
