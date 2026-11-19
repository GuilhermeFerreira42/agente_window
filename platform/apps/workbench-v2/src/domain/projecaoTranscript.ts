import type { ChatMessage, FerramentaNoChat, Session } from '../types'
import { pareceCredencial } from './memoriaProjeto'
import { FERRAMENTAS_ENTRE_CHATS } from './consultaEntreChats'

const CONTEUDO_TEMPORARIO = 'Conteúdo disponível somente durante a execução.'

function ferramentaPersistida(ferramenta: FerramentaNoChat, indice: number): FerramentaNoChat {
  const { status, ordem, allowSession } = ferramenta
  const omitirAlvo = ferramenta.ferramenta === 'executar'
  const omitirDetalhes = omitirAlvo || ferramenta.previa !== undefined ||
    ferramenta.progresso !== undefined || ferramenta.resumo !== undefined
  return {
    id: `persistida-${indice}`, ferramenta: ferramenta.ferramenta, status, ordem, allowSession,
    alvo: omitirAlvo ? 'Comando' : ferramenta.ferramenta === 'buscar' || ferramenta.ferramenta === 'historico' || (FERRAMENTAS_ENTRE_CHATS as readonly string[]).includes(ferramenta.ferramenta)
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
    // C-3a (P30 aditiva): metadados seguros do anexo junto da mensagem —
    // nunca bytes, base64, locator físico ou token.
    attachments: mensagem.attachments?.map((anexo) => ({
      id: anexo.id,
      name: anexo.name,
      kind: anexo.kind,
      artifactId: anexo.artifactId,
      modalidade: anexo.modalidade,
      bytes: anexo.bytes,
      sha256: anexo.sha256,
      estado: anexo.estado,
      mode: anexo.mode,
      modoCopia: anexo.modoCopia,
      envioModelo: anexo.envioModelo,
      referencia: anexo.referencia,
      legado: anexo.legado,
    })),
    // C-3b — o envelope multimodal PRECISA atravessar a projeção. Sem esta
    // linha o campo é descartado silenciosamente ao gravar/restaurar, e a
    // mensagem reabriria sem ordem de partes (provado em c3bMensagens).
    // Só metadados: IDs, ordem e modalidade — nunca bytes/URL/path.
    multimodal: mensagem.multimodal,
    ferramentas: mensagem.ferramentas?.map(ferramentaPersistida),
    continuar: mensagem.continuar?.map(({ id, status, iteracoes, teto, ordem }) => ({ id, status, iteracoes, teto, ordem })),
  }
}

/** Campos extensíveis recebidos do navegador nunca viram um store paralelo. */
export function projetarSessaoPersistida(session: Session): Session {
  const { id, title, workspace, workspacePath, contexto, slug, worktreePath, section, status, updated,
    diffAdded, diffRemoved, branch, pinned, unread, archived, ciFailure, mainChatId,
    isQuickChat, automation, customGroup, provider, isDraft, createdSeq, updatedSeq, persistenceRevision } = session
  return {
    id, title, workspace, workspacePath, contexto, slug, worktreePath, section, status, updated,
    diffAdded, diffRemoved, branch, pinned, unread, archived, ciFailure, mainChatId,
    isQuickChat, automation, customGroup, provider, isDraft, createdSeq, updatedSeq, persistenceRevision,
    approval: session.approval ? 'Aprovação anterior expirada.' : undefined,
    chats: session.chats.map(({ id, title, status, unread, approval, messages }) => ({
      id, title, status, unread, approval: approval ? 'Aprovação anterior expirada.' : undefined,
      messages: messages.map(projetarMensagemPersistida),
    })),
  }
}
