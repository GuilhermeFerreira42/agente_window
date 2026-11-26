// Composição da prefeitura: prepara uma ação local e só a executa após o
// chamador obter autorização individual. Nenhum path vem do modelo.
import { extrairItemZipConversa, inspecionarTextoConversa, lerFonteConversa, listarFontesConversa, TETO_FONTE_BYTES } from './inspecaoConversa'
import { listarZipSeguro } from './zipSeguro'
import { quadroSelecionadoVideo } from './quadroSelecionadoVideo'

export interface PedidoInspecao { acao?: unknown; artifactId?: unknown; indice?: unknown }
export interface PlanoInspecao {
  previa: string
  executar: () => Promise<{ ok: boolean; resumo: string; conteudo?: string; efeitoIniciado?: boolean }>
  quadro?: { artifactId: string; ler: () => Promise<Buffer> }
}

/** O plano é transitório, de uso único; não contém uma autorização por si só. */
export async function prepararInspecaoAgente(dono: { sessionId: string; chatId: string }, pedido: PedidoInspecao, sinal?: AbortSignal): Promise<PlanoInspecao> {
  const { sessionId, chatId } = dono
  if (sinal?.aborted || !pedido || typeof pedido !== 'object' || Object.keys(pedido).some(chave => !['acao', 'artifactId', 'indice'].includes(chave))) throw new Error('Pedido de anexo inválido ou cancelado.')
  const acao = pedido.acao
  let previa: string
  let quadro: PlanoInspecao['quadro']
  let operacao: () => Promise<{ ok: boolean; resumo: string; conteudo?: string; efeitoIniciado?: boolean }>
  if (acao === 'listar') {
    if (pedido.artifactId !== undefined || pedido.indice !== undefined) throw new Error('Parâmetros inválidos.')
    const fontes = await listarFontesConversa(sessionId, chatId)
    if (fontes.length > 128 || JSON.stringify(fontes).length > 32768) throw new Error('Há fontes demais para esta consulta; refine o pedido.')
    previa = `Enviar ao modelo a lista de ${fontes.length} anexo(s) desta conversa: ${fontes.map(f => f.nome).join(', ') || '(nenhum)'}.`
    operacao = async () => {
      if (JSON.stringify(await listarFontesConversa(sessionId, chatId)) !== JSON.stringify(fontes)) throw new Error('As fontes mudaram após a confirmação.')
      return { ok: true, resumo: `Lista de ${fontes.length} anexo(s) desta conversa.`, conteudo: JSON.stringify(fontes) }
    }
  } else {
    if (typeof pedido.artifactId !== 'string' || pedido.artifactId.length > 200 || !pedido.artifactId) throw new Error('Identificador de anexo inválido.')
    const id = pedido.artifactId
    const fonte = await lerFonteConversa(sessionId, chatId, id, TETO_FONTE_BYTES)
    const verificar = async () => {
      const atual = await lerFonteConversa(sessionId, chatId, id, TETO_FONTE_BYTES)
      if (atual.sha256 !== fonte.sha256 || atual.nome !== fonte.nome) throw new Error('A fonte mudou após a confirmação.')
    }
    if (acao === 'analisar_video') {
      if (pedido.indice !== undefined) throw new Error('Parâmetros inválidos.')
      if (!fonte.nome.toLowerCase().endsWith('.mp4') || fonte.bytes.length > 12 * 1024 * 1024) {
        previa = `Enviar ao modelo o motivo de indisponibilidade da análise visual de ${fonte.nome}; o original não será enviado.`
        operacao = async () => { await verificar(); return { ok: true, resumo: 'Vídeo incompatível.', conteudo: JSON.stringify({ disponivel: false, motivo: 'Somente MP4 MPEG-4 de até 12 MiB é aceito para análise de um quadro próximo à metade.' }) } }
      } else {
        previa = `Extrair localmente um quadro selecionado próximo à metade de ${fonte.nome} e enviá-lo com a pergunta atual ao modelo de visão comprovado; enviar a análise textual ao modelo. Nenhum áudio ou vídeo completo será enviado. O quadro não representa os trechos não amostrados.`
        quadro = { artifactId: id, ler: async () => {
          await verificar()
          const imagem = await quadroSelecionadoVideo(fonte.bytes, sinal)
          await verificar()
          if (!imagem || sinal?.aborted) throw new Error('Quadro indisponível: configure o decodificador local e use MP4 MPEG-4 de até 60 segundos e 1024 por lado.')
          return imagem
        } }
        operacao = async () => { throw new Error('A análise visual precisa de destino comprovado.') }
      }
    } else if (acao === 'listar_zip') {
      if (pedido.indice !== undefined) throw new Error('Parâmetros inválidos.')
      const itens = await listarZipSeguro(fonte.bytes)
      previa = `Enviar ao modelo os nomes e tamanhos dos itens do ZIP ${fonte.nome} (${itens.length} itens).`
      operacao = async () => { await verificar(); return { ok: true, resumo: `Itens de ${fonte.nome}: ${itens.length}.`, conteudo: JSON.stringify(itens) } }
    } else if (acao === 'extrair_zip') {
      if (!Number.isSafeInteger(pedido.indice) || (pedido.indice as number) < 0) throw new Error('Índice inválido.')
      const indice = pedido.indice as number
      const itens = await listarZipSeguro(fonte.bytes), item = itens[indice]
      if (!item || item.diretorio) throw new Error('Item não disponível para extração.')
      previa = `Extrair ${item.nome} do ZIP ${fonte.nome} para a área privada desta conversa e enviar o nome e o identificador ao modelo.`
      operacao = async () => {
        await verificar()
        const extraido = await extrairItemZipConversa(sessionId, chatId, id, indice, sinal, fonte.sha256)
        return { ok: true, resumo: `Item ${item.nome} extraído para a área privada da conversa.`, conteudo: JSON.stringify(extraido), efeitoIniciado: true }
      }
    } else if (acao === 'ler') {
      if (pedido.indice !== undefined) throw new Error('Parâmetros inválidos.')
      // Reconhecimento é uma inspeção local: somente após autorização. A
      // confirmação também abrange o envio da transcrição (nunca do áudio) ao
      // destino selecionado. Outras representações seguem o fluxo existente.
      if (fonte.nome.toLowerCase().endsWith('.wav')) {
        previa = `Transcrever localmente em português o áudio ${fonte.nome} e enviar ao modelo a transcrição, ou o motivo de indisponibilidade. O áudio original não será enviado; a transcrição automática pode conter erros.`
        operacao = async () => {
          await verificar()
          const texto = await inspecionarTextoConversa(sessionId, chatId, id, sinal)
          await verificar()
          return { ok: true, resumo: texto.disponivel ? `Transcrição local de ${fonte.nome}.` : texto.motivo, conteudo: JSON.stringify(texto) }
        }
      } else {
        const texto = await inspecionarTextoConversa(sessionId, chatId, id, sinal)
        previa = texto.disponivel ? `Enviar ao modelo o ${texto.representacao} do anexo ${fonte.nome}.` : `Enviar ao modelo o motivo de indisponibilidade de análise do anexo ${fonte.nome}; o original não será enviado.`
        operacao = async () => {
          await verificar()
          return { ok: true, resumo: texto.disponivel ? `Texto extraído de ${fonte.nome}.` : texto.motivo, conteudo: JSON.stringify(texto) }
        }
      }
    } else throw new Error('Ação de anexo desconhecida.')
  }
  let consumido = false
  const consumir = () => {
    if (consumido || sinal?.aborted) throw new Error('Esta preparação expirou ou foi cancelada.')
    consumido = true
  }
  const quadroPreparado = quadro && { artifactId: quadro.artifactId, ler: async () => { consumir(); return quadro!.ler() } }
  return { previa, ...(quadroPreparado && { quadro: quadroPreparado }), executar: async () => {
    consumir()
    return operacao()
  } }
}
