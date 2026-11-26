import type { SelecaoModelo } from '../../bairros/2-inteligencia/casas/conversa'
import type { ModoAgir } from '../../bairros/2-inteligencia/casas/agir'
import { pedidoDeConfirmacao } from '../../domain/dialogoConfirmacao'
import { pediuSomenteAguardar } from '../../domain/aguardarInstrucoes'
import { pedidoEscolhaAnexos } from '../../domain/pedidosArquivo'
import { portaDialogos } from '../../shell/portaDialogos'
import type { Attachment, ChatMessage, Session } from '../../types'

export interface EscolhaVisao { proposta: string; messageId: string; indices: number[] }
export interface PedidoVisaoAgir { proposta: string; messageId: string; artifactIds: string[] }
interface Proposta { proposta: string; providerId: string; modelId: string; arquivoBytes: number; quantidade: number }

async function consultarProposta(modelSelection: SelecaoModelo, messageId: string, texto: string, verificar?: string): Promise<Partial<Proposta> & { verificacao?: string } | undefined> {
  try {
    const resposta = await fetch('/api/agir/vision', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ modelSelection, messageId, texto, verificar }),
    })
    return resposta.ok ? (await resposta.json()) ?? undefined : undefined
  } catch { return undefined }
}

export async function escolherEnvioVisao(texto: string, anexos: readonly Attachment[], selecao: SelecaoModelo, modo: ModoAgir, messageId = `message-${crypto.randomUUID()}`, reenvio = false): Promise<EscolhaVisao | null | undefined> {
  if (!texto.trim() || !anexos.length || pediuSomenteAguardar(texto)) return undefined
  const candidatas = anexos.flatMap((anexo, index) =>
    anexo.mode !== 'reference' && (!reenvio || (anexo.artifactId && (anexo.envioModelo === 'pendente' || anexo.envioModelo === 'enviado'))) &&
    /\.(png|jpe?g|webp|mp4)$/iu.test(anexo.name) ? [index] : [])
  let proposta = modo === 'ask' && !texto.trim().startsWith('/') && candidatas.length
    ? await consultarProposta(selecao, messageId, texto.trim()) : undefined
  if (proposta?.verificacao && !proposta.proposta) {
    const acao = await portaDialogos().pedir({
      testId: 'verificar-visao', tom: 'aviso', rotuloAcessivel: 'Verificar visão do modelo',
      mensagem: 'Verificar se o modelo aceita imagens?',
      detalhe: `Destino: ${proposta.providerId} / ${proposta.modelId}. A verificação envia somente uma imagem de teste criada pelo aplicativo. Pode haver cobrança pelo provedor. Seus anexos só serão enviados após outra confirmação.`,
      cancelar: 'Cancelar',
      botoes: [
        { id: 'cancelar', rotulo: 'Cancelar', variacao: 'primario' },
        { id: 'sem-imagem', rotulo: 'Continuar com o texto', variacao: 'secundario' },
        { id: 'verificar', rotulo: 'Verificar visão', variacao: 'secundario' },
      ],
    })
    if (acao === 'sem-imagem') return undefined
    if (acao !== 'verificar') return null
    proposta = await consultarProposta(selecao, messageId, texto.trim(), proposta.verificacao)
  }
  const arquivoBytes = proposta?.arquivoBytes ?? 0
  const indices = candidatas.filter(index => (anexos[index].bytes ?? 0) <= arquivoBytes)
  if (!proposta?.proposta || !indices.length || indices.length > (proposta.quantidade ?? 0)) {
    return await portaDialogos().confirmar(pedidoEscolhaAnexos(anexos.map(anexo => anexo.name))) ? undefined : null
  }

  const imagens = indices.filter(index => !/\.mp4$/iu.test(anexos[index].name)).map(index => anexos[index].name)
  const videos = indices.filter(index => /\.mp4$/iu.test(anexos[index].name)).map(index => anexos[index].name)
  const guardadas = anexos.filter((_, index) => !indices.includes(index)).map(anexo => anexo.name)
  const temVideo = videos.length > 0
  const aceitou = await portaDialogos().confirmar(pedidoDeConfirmacao({
    texto: temVideo ? 'Enviar imagens e quadro selecionado de vídeo ao modelo?' : 'Enviar imagens ao modelo?',
    detalhe: `Destino: ${proposta.providerId} / ${proposta.modelId}.`
      + (imagens.length ? ` Imagens: ${imagens.join(', ')}. Quando necessário, será enviada uma cópia compatível.` : '')
      + (temVideo ? ` Vídeos: ${videos.join(', ')}. Será extraído localmente e enviado somente um quadro selecionado próximo à metade de cada vídeo; nenhum áudio ou vídeo completo será enviado. Esse quadro não representa os trechos não amostrados. Requer decodificador local e MP4 MPEG-4 compatível.` : '')
      + ' Os originais serão mantidos.'
      + (guardadas.length ? ` Estes arquivos ficarão apenas armazenados: ${guardadas.join(', ')}.` : ''),
    confirmar: temVideo ? 'Enviar quadros e texto' : 'Enviar imagens e texto', rotuloAcessivel: temVideo ? 'Confirmar envio de quadros' : 'Confirmar envio de imagens', testId: 'confirmar-envio-visao',
  }))
  return aceitou ? { proposta: proposta.proposta, messageId, indices } : null
}

export async function escolherReenvioVisao(mensagem: ChatMessage | undefined, selecao: SelecaoModelo, modo: ModoAgir): Promise<PedidoVisaoAgir | null | undefined> {
  if (!mensagem?.attachments?.length) return undefined
  const escolha = await escolherEnvioVisao(mensagem.content, mensagem.attachments, selecao, modo, mensagem.id, true)
  return escolha ? { proposta: escolha.proposta, messageId: mensagem.id,
    artifactIds: escolha.indices.map(index => mensagem.attachments![index].artifactId!) } : escolha
}

export function rotuloEnvioVisao(anexo: Attachment): string {
  const indisponivel = anexo.estado === 'falhou' || (!anexo.artifactId && (!anexo.estado || anexo.estado === 'legado'))
  const estado = indisponivel ? 'Original indisponível' : 'Armazenado'
  if (anexo.envioModelo === 'enviado' && /\.mp4$/iu.test(anexo.name)) return indisponivel ? 'Original indisponível; quadro selecionado próximo à metade enviado ao modelo' : 'Armazenado; quadro selecionado próximo à metade enviado ao modelo'
  if (anexo.envioModelo === 'enviado') return indisponivel ? 'Original indisponível; enviado ao modelo' : 'Armazenado e enviado ao modelo'
  if (anexo.envioModelo === 'pendente') return `${estado}; envio ao modelo ainda não confirmado`
  if (!anexo.artifactId && (!anexo.estado || anexo.estado === 'legado')) return `${estado}; envio ao modelo não registrado`
  return `${estado}; não enviado ao modelo`
}

export function marcarVisaoAceita(sessao: Session, chatId: string, evento: { messageId: string; artifactIds: string[] }): Session {
  return { ...sessao, chats: sessao.chats.map(chat => chat.id !== chatId ? chat : {
    ...chat, messages: chat.messages.map(msg => msg.id !== evento.messageId ? msg : {
      ...msg, attachments: msg.attachments?.map(anexo => anexo.envioModelo === 'pendente' && anexo.artifactId && evento.artifactIds.includes(anexo.artifactId)
        ? { ...anexo, envioModelo: 'enviado' } : anexo),
    }),
  }) }
}
