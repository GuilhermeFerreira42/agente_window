import type { ChatMessage, FerramentaNoChat, Session } from '../types'
import { pareceCredencial } from './memoriaProjeto'

const CONTEUDO_TEMPORARIO = 'Conteúdo disponível somente durante a execução.'

function ferramentaPersistida(ferramenta: FerramentaNoChat): FerramentaNoChat {
  const { id, status, ordem, allowSession } = ferramenta
  const omitirAlvo = ferramenta.ferramenta === 'executar'
  const omitirDetalhes = omitirAlvo || ferramenta.previa !== undefined ||
    ferramenta.progresso !== undefined || ferramenta.resumo !== undefined
  return {
    id, ferramenta: ferramenta.ferramenta, status, ordem, allowSession,
    alvo: omitirAlvo ? 'Comando' : ferramenta.ferramenta === 'buscar' || ferramenta.ferramenta === 'historico'
      ? 'Consulta' : pareceCredencial(ferramenta.alvo) ? 'Referência omitida' : ferramenta.alvo,
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

/** Campos extensíveis recebidos do navegador nunca viram um store paralelo. */
export function projetarSessaoPersistida(session: Session): Session {
  const { id, title, workspace, workspacePath, slug, worktreePath, section, status, updated,
    diffAdded, diffRemoved, branch, pinned, unread, archived, ciFailure, mainChatId,
    isQuickChat, automation, customGroup, provider, isDraft, createdSeq, updatedSeq, persistenceRevision } = session
  return {
    id, title, workspace, workspacePath, slug, worktreePath, section, status, updated,
    diffAdded, diffRemoved, branch, pinned, unread, archived, ciFailure, mainChatId,
    isQuickChat, automation, customGroup, provider, isDraft, createdSeq, updatedSeq, persistenceRevision,
    approval: session.approval ? 'Aprovação anterior expirada.' : undefined,
    chats: session.chats.map(({ id, title, status, unread, approval, messages }) => ({
      id, title, status, unread, approval: approval ? 'Aprovação anterior expirada.' : undefined,
      messages: messages.map(projetarMensagemPersistida),
    })),
  }
}
