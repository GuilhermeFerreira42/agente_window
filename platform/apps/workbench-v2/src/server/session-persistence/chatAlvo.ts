// ============================================================================
// Prefeitura — glicose entre a casa Provedores e a casa Conversa.
// Só aqui (src/server/**) as duas casas se encontram: a Provedores entrega
// dados/chave (D81–D84) e a Conversa recebe o alvo pronto. As casas em si
// nunca se importam pela porta dos fundos (fronteiras LEGO).
// ============================================================================
import type { AlvoOuErro } from '../../bairros/2-inteligencia/casas/conversa'
import { descritorPorId, lerArquivo, resolverChave } from '../../bairros/2-inteligencia/casas/provedores/server/providersRepo'

/**
 * Resolve quem vai responder AGORA: provedor ativo + endereço + modelo +
 * chave (salva > ambiente, D84). Cada ausência vira uma categoria honesta —
 * a tela nunca inventa resposta no lugar do erro.
 */
export async function obterAlvoDeConversa(): Promise<AlvoOuErro> {
  const arquivo = await lerArquivo()
  const id = arquivo.ativo
  const salvo = id ? arquivo.provedores[id] : undefined
  if (!id || !salvo) {
    return {
      alvo: null,
      erro: { code: 'sem_provedor', message: 'Nenhum provedor está ativo. Abra Provedores e escolha quem vai responder.' },
    }
  }

  const descritor = descritorPorId(id)
  if (!descritor) {
    return {
      alvo: null,
      erro: { code: 'sem_provedor', message: 'O provedor ativo não é mais reconhecido. Escolha outro em Provedores.' },
    }
  }

  const baseUrl = (salvo.baseUrl || descritor.baseUrlPadrao || '').replace(/\/+$/, '')
  const modelo = salvo.modelo || ''
  if (!baseUrl || !modelo) {
    return {
      alvo: null,
      erro: { code: 'configuracao', message: 'Falta o endereço ou o modelo do provedor ativo. Complete o cadastro em Provedores.' },
    }
  }

  const { chave } = resolverChave(id, arquivo)
  if (!descritor.chaveOpcional && !chave) {
    return {
      alvo: null,
      erro: { code: 'chave', message: 'Este provedor precisa de chave e nenhuma foi encontrada. Cole a chave em Provedores.' },
    }
  }

  return {
    alvo: {
      protocolo: descritor.protocolo,
      baseUrl,
      modelo,
      apiKey: chave,
      temperatura: salvo.temperatura,
      maxSaida: salvo.maxSaida,
    },
  }
}
