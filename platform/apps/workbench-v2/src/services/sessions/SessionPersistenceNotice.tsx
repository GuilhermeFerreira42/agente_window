import type { SessionPersistenceIssue } from './useSessionPersistence'
import './sessionPersistence.css'

interface Props {
  issues: SessionPersistenceIssue[]
  recovering?: string
  onRecover: (sessionId: string) => Promise<void>
  onRetry?: (sessionId: string) => Promise<void>
  onReload?: (sessionId: string) => Promise<void>
}

export function SessionPersistenceNotice({ issues, recovering, onRecover, onRetry, onReload }: Props) {
  if (!issues.length) return null
  return <div className="session-persistence-notices">
    {issues.map(({ session, message, backupAvailable, kind }) => <div className="session-persistence-notice" role="alert" key={session.id}>
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
    </div>)}
  </div>
}
