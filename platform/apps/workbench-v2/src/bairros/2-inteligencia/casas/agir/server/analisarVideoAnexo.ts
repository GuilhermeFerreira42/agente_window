// Execução de visão para um vídeo já armazenado: a proposta de capacidade e o
// consentimento individual precisam ter sido obtidos antes de chamar esta porta.
import type { AlvoConversa, IniciarChamadaModelo } from '../../conversa'
import type { ResultadoFerramenta } from '../contract'
import { comCorpoVisao, type FonteVisao, type PedidoVisao } from './admissaoVisao'
import type { CodecImagemVisao } from './prepararImagemVisao'
import { criarVizinhoReal } from './vizinho'

export async function analisarVideoAnexo(entrada: {
  pedido: PedidoVisao
  sessionId: string
  chatId: string
  texto: string
  alvo: AlvoConversa
  fonte: FonteVisao
  lerQuadro: () => Promise<Buffer>
  validarContexto: () => boolean
  sinal: AbortSignal
  codec?: CodecImagemVisao
  iniciarModelo?: IniciarChamadaModelo
}): Promise<ResultadoFerramenta> {
  try {
    const resposta = await comCorpoVisao(entrada.pedido, { sessionId: entrada.sessionId, chatId: entrada.chatId, texto: entrada.texto }, entrada.alvo, entrada.fonte,
      async () => ({ bytes: await entrada.lerQuadro() }),
      prepararCorpoVisao => criarVizinhoReal(entrada.alvo, { prepararCorpoVisao }, entrada.iniciarModelo)(
        [{ papel: 'usuario', conteudo: entrada.texto }],
        { sinal: entrada.sinal, validarAntesDaChamada: entrada.validarContexto, ferramentasPermitidas: [] },
      ), entrada.codec, entrada.sinal)
    if (entrada.sinal.aborted || !entrada.validarContexto() || resposta.pedidos.length || !resposta.texto.trim() || resposta.texto.length > 16_000) {
      return { ok: false, resumo: 'Não foi possível concluir a análise visual. Confira o destino antes de tentar novamente.' }
    }
    return { ok: true, resumo: 'Primeiro quadro visual analisado; o vídeo completo não foi enviado.', conteudo: JSON.stringify({ disponivel: true, representacao: 'análise visual do primeiro quadro', texto: resposta.texto }) }
  } catch (erro) {
    const msg = erro instanceof Error && erro.message.startsWith('Quadro indisponível:')
      ? erro.message : 'Não foi possível concluir a análise visual. Verifique o destino e a configuração; o quadro pode ter sido enviado antes da falha.'
    return { ok: false, resumo: msg }
  }
}
