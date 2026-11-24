import type { SessaoIndisponivel } from './sessionWriteQueue'
import type { SessionPersistenceIssue } from './useSessionPersistence'
import './sessionPersistence.css'

export function SessionLoadNotices({ items = [], deleting, failures, onResumeDeletion, onReload }: {
  items?: SessaoIndisponivel[]
  deleting: ReadonlySet<string>
  failures: ReadonlyMap<string, string>
  onResumeDeletion: (id: string, revision: number) => Promise<void>
  onReload: () => void
}) {
  const unavailable = items.filter(item => item.deletionRevision === undefined)
  return <>
    {items.map(({ sessionId, titulo, deletionRevision }) => deletionRevision !== undefined && (
      <div key={sessionId} role="alert" className="session-persistence-notice">
        <div>
          <strong>Exclusão pendente: {titulo ?? sessionId}</strong>
          <p>{deleting.has(sessionId) ? 'Encaminhando os anexos privados à Lixeira…'
            : failures.get(sessionId) ?? 'Ainda falta mover anexos privados para a Lixeira.'}</p>
        </div>
        <button type="button" disabled={deleting.has(sessionId)}
          onClick={() => void onResumeDeletion(sessionId, deletionRevision)}>Retomar exclusão</button>
      </div>
    ))}
    {unavailable.length > 0 && (
      <div role="alert" className="session-persistence-notice">
        <p>{unavailable.length === 1 ? 'Não foi possível carregar uma conversa salva.' : `Não foi possível carregar ${unavailable.length} conversas salvas.`} As demais conversas foram carregadas e nenhuma mensagem local foi apagada — uma conversa indisponível não é uma conversa vazia ou inexistente.</p>
        <ul className="session-unavailable-list">{unavailable.map(item => <li key={item.sessionId}>{item.titulo ?? item.sessionId}</li>)}</ul>
        <button type="button" onClick={onReload}>Tentar carregar conversas novamente</button>
      </div>
    )}
  </>
}

interface Props {
  issues: SessionPersistenceIssue[]
  recovering?: string
  onRecover: (sessionId: string) => Promise<void>
  onRetry?: (sessionId: string) => Promise<void>
  onReload?: (sessionId: string) => Promise<void>
  /** P-C — novo ciclo da exclusão (falha visível e retomável, sem esconder o alvo). */
  onExcluir?: (sessionId: string) => void
}

export function SessionPersistenceNotice({ issues, recovering, onRecover, onRetry, onReload, onExcluir }: Props) {
  if (!issues.length) return null
  return <div className="session-persistence-notices">
    {issues.map(({ session, message, backupAvailable, kind }) => {
      // P-C §2 — estados de exclusão honestos: progresso visível; falha fica
      // no lugar (não vira sucesso) com retomada explícita do mesmo alvo.
      if (kind === 'excluindo') return (
        <div className="session-persistence-notice" role="alert" key={session.id}>
          <div>
            <strong>Excluindo conversa: {session.title}</strong>
            <p>{message}</p>
          </div>
        </div>
      )
      if (kind === 'falha_exclusao') return (
        <div className="session-persistence-notice" role="alert" key={session.id}>
          <div>
            <strong>Exclusão não concluída: {session.title}</strong>
            <p>{message}</p>
          </div>
          {onExcluir && <button type="button" disabled={Boolean(recovering)} onClick={() => onExcluir(session.id)}>Tentar excluir novamente</button>}
        </div>
      )
      // P-C (PC-R2) — identidade morta no servidor: nunca "Tentar novamente"
      // (renasceria) nem recarregar (410); a ÚNICA saída honesta é a cópia nova.
      if (kind === 'excluida') return (
        <div className="session-persistence-notice" role="alert" key={session.id}>
          <div>
            <strong>Conversa excluída: {session.title}</strong>
            <p>{message}</p>
            {!backupAvailable && <p>Backup do navegador indisponível. Mantenha esta janela aberta até salvar uma cópia.</p>}
          </div>
          <button type="button" disabled={Boolean(recovering)} onClick={() => void onRecover(session.id)}>Salvar uma cópia separada</button>
        </div>
      )
      return (
        <div className="session-persistence-notice" role="alert" key={session.id}>
          <div>
            <strong>{kind === 'local' ? 'Conversa salva' : 'Conversa não salva'}: {session.title}</strong>
            <p>{message}</p>
            {!backupAvailable && <p>Backup do navegador indisponível. Mantenha esta janela aberta até salvar uma cópia.</p>}
          </div>
          {kind !== 'conflict' && onRetry && <button type="button" disabled={Boolean(recovering)} onClick={() => void onRetry(session.id)}>{kind === 'local' ? 'Limpar backup local' : 'Tentar novamente'}</button>}
          {kind === 'conflict' && onReload && <button type="button" disabled={Boolean(recovering)} onClick={() => void onReload(session.id)}>Recarregar versão salva</button>}
          {kind !== 'local' &&
          <button type="button" disabled={Boolean(recovering) || session.chats.some((chat) => chat.messages.some((message) => message.running))}
            onClick={() => void onRecover(session.id)}>
            {recovering === session.id ? 'Salvando cópia…' : 'Salvar uma cópia separada'}
          </button>}
        </div>
      )
    })}
  </div>
}
