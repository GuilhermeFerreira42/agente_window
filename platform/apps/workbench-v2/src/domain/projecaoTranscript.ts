import type { ChatMessage, FerramentaNoChat } from '../types'

const CONTEUDO_TEMPORARIO = 'Conteúdo disponível somente durante a execução.'

function ferramentaPersistida(ferramenta: FerramentaNoChat): FerramentaNoChat {
  const { id, status, ordem, allowSession } = ferramenta
  const omitirAlvo = ferramenta.ferramenta === 'executar'
  const omitirDetalhes = omitirAlvo || ferramenta.previa !== undefined ||
    ferramenta.progresso !== undefined || ferramenta.resumo !== undefined
  return {
    id, ferramenta: ferramenta.ferramenta, status, ordem, allowSession,
    alvo: omitirAlvo ? 'Comando' : ferramenta.alvo,
    resumo: omitirDetalhes ? CONTEUDO_TEMPORARIO : undefined,
  }
}

/** Projeção para o disco e para restauração de snapshots legados. */
export function projetarMensagemPersistida(mensagem: ChatMessage): ChatMessage {
  const { id, role, time, model, mode, running, cancelled, erro, vote, reported, iteracaoAtual, tetoAtual, inicioEm } = mensagem
  return {
    id, role, time, model, mode, running, cancelled, erro, vote, reported, iteracaoAtual, tetoAtual, inicioEm,
    content: erro ? 'A execução terminou com erro. Os detalhes não foram armazenados.' : mensagem.content,
    attachments: mensagem.attachments?.map(({ id, name, kind }) => ({ id, name, kind })),
    ferramentas: mensagem.ferramentas?.map(ferramentaPersistida),
    continuar: mensagem.continuar?.map(({ id, status, iteracoes, teto, ordem }) => ({ id, status, iteracoes, teto, ordem })),
  }
}
