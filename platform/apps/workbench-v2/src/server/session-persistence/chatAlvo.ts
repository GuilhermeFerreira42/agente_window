// ============================================================================
// Prefeitura — resolve e fixa o par de modelo no começo do run.
// Só aqui as casas Provedores e Conversa se encontram; segredo nunca vai ao browser.
// ============================================================================
import type { AlvoOuErro, SelecaoModelo } from '../../bairros/2-inteligencia/casas/conversa'
import { descritorPorId, fingerprintToolCalling, lerArquivo, resolverChave } from '../../bairros/2-inteligencia/casas/provedores/server/providersRepo'
import { AGIR_TOOL_ADAPTER_VERSION } from '../../bairros/2-inteligencia/casas/agir'

export async function obterAlvoDeConversa(selecao: SelecaoModelo = { tipo: 'auto' }): Promise<AlvoOuErro> {
  const arquivo = await lerArquivo()
  const id = selecao.tipo === 'auto' ? arquivo.ativo : selecao.providerId
  const salvo = id ? arquivo.provedores[id] : undefined
  if (!id || !salvo) {
    return { alvo: null, erro: { code: 'sem_provedor', message: 'Nenhum provedor disponível para esta seleção. Configure-o em Provedores.' } }
  }
  if (salvo.habilitado === false) {
    return { alvo: null, erro: { code: 'selection_unavailable', message: `O provedor ${id} está desabilitado ou indisponível. Habilite-o em Provedores; nenhum substituto foi escolhido.` } }
  }

  const descritor = descritorPorId(id)
  if (!descritor) {
    return { alvo: null, erro: { code: 'selection_unavailable', message: 'O provedor selecionado não é mais reconhecido. Escolha outro em Provedores.' } }
  }

  const modelId = selecao.tipo === 'auto' ? salvo.modelo : selecao.modelId
  if (!modelId) {
    return { alvo: null, erro: { code: 'configuracao', message: 'A seleção não contém um modelo. Configure um modelo padrão em Provedores.' } }
  }
  const habilitados = Array.isArray(salvo.modelosHabilitados) ? salvo.modelosHabilitados : []
  if (!habilitados.includes(modelId)) {
    const motivo = selecao.tipo === 'auto'
      ? `O modelo padrão ${modelId} do provedor ${id} não está habilitado. Corrija a seleção em Provedores; Auto não troca de modelo.`
      : `O par selecionado (${id}, ${modelId}) foi removido ou desabilitado. Escolha um par habilitado; nenhum substituto foi escolhido.`
    return { alvo: null, erro: { code: 'model_disabled', message: motivo } }
  }

  const baseUrl = (salvo.baseUrl || descritor.baseUrlPadrao || '').replace(/\/+$/, '')
  if (!baseUrl) {
    return { alvo: null, erro: { code: 'configuracao', message: `Falta o endereço do provedor ${id}. Complete o cadastro em Provedores.` } }
  }
  const { chave } = resolverChave(id, arquivo)
  if (!descritor.chaveOpcional && !chave) {
    return { alvo: null, erro: { code: 'chave', message: `A credencial do provedor ${id} está indisponível. Confira-a em Provedores.` } }
  }

  const fingerprint = fingerprintToolCalling({
    providerId: id,
    modelId,
    baseUrl,
    protocol: descritor.protocolo,
    adapterVersion: AGIR_TOOL_ADAPTER_VERSION,
    apiKey: chave,
    temperature: salvo.temperatura,
    maxOutput: salvo.maxSaida,
  })
  const prova = arquivo.toolCallingAssessments?.[id]?.[modelId]
  const toolCallingCapability = prova && prova.adapterVersion === AGIR_TOOL_ADAPTER_VERSION && prova.fingerprint === fingerprint
    ? prova.status
    : 'unknown'

  return {
    alvo: {
      providerId: id,
      modelId,
      toolCallingCapability,
      protocolo: descritor.protocolo,
      baseUrl,
      modelo: modelId,
      apiKey: chave,
      temperatura: salvo.temperatura,
      maxSaida: salvo.maxSaida,
    },
  }
}
