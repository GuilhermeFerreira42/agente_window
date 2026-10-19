// ============================================================================
// Casa Agir — ANÚNCIO NATIVO das ferramentas (conquista 2): é este payload
// que diz ao modelo "você tem mãos" — o que faltou no teste do dono de
// 18/10 (o modelo respondeu "não tenho acesso" porque ninguém anunciou
// nada). Um jeito por protocolo (Q4=(b), D93), sempre com o MESMO catálogo.
// ============================================================================
import type { ProtocoloAgir } from '../contract'
import { catalogoFerramentas } from './ferramentas'

/** JSON Schema dos argumentos, ferramenta a ferramenta. */
function esquemaDe(id: string): Record<string, unknown> {
  const caminho = { type: 'string', description: 'Caminho do arquivo/pasta DENTRO da pasta de trabalho (relativo ou absoluto).' }
  switch (id) {
    case 'ler':
      return { type: 'object', properties: { caminho }, required: ['caminho'], additionalProperties: false }
    case 'listar':
      return { type: 'object', properties: { caminho: { ...caminho, description: 'Pasta a listar ("." ou vazio = a própria pasta de trabalho).' } }, required: [], additionalProperties: false }
    case 'buscar':
      return {
        type: 'object',
        properties: { padrao: { type: 'string', description: 'Trecho do nome de arquivo a procurar (sem acento-distinção).' }, caminho },
        required: ['padrao'],
        additionalProperties: false,
      }
    default: // criar · escrever
      return {
        type: 'object',
        properties: { caminho, conteudo: { type: 'string', description: 'Conteúdo COMPLETO a gravar no arquivo.' } },
        required: ['caminho', 'conteudo'],
        additionalProperties: false,
      }
  }
}

/**
 * O campo de anúncio no formato que CADA protocolo espera — entra direto no
 * corpo do pedido HTTP.
 */
export function anunciarFerramentas(protocolo: ProtocoloAgir): Record<string, unknown> {
  if (protocolo === 'anthropic') {
    return {
      tools: catalogoFerramentas.map((f) => ({
        name: f.id,
        description: f.descricao,
        input_schema: esquemaDe(f.id),
      })),
    }
  }
  if (protocolo === 'gemini') {
    return {
      tools: [
        {
          functionDeclarations: catalogoFerramentas.map((f) => ({
            name: f.id,
            description: f.descricao,
            parameters: esquemaDe(f.id),
          })),
        },
      ],
    }
  }
  // openai-chat e ollama falam a mesma língua de anúncio:
  return {
    tools: catalogoFerramentas.map((f) => ({
      type: 'function',
      function: { name: f.id, description: f.descricao, parameters: esquemaDe(f.id) },
    })),
  }
}
