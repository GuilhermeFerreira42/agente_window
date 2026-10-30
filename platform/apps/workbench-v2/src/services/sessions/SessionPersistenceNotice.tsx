import type { SessionPersistenceIssue } from './useSessionPersistence'
import './sessionPersistence.css'

interface Props {
  issues: SessionPersistenceIssue[]
  recovering?: string
  onRecover: (sessionId: string) => Promise<void>
}

export function SessionPersistenceNotice({ issues, recovering, onRecover }: Props) {
  if (!issues.length) return null
  return <div className="session-persistence-notices">
    {issues.map(({ session, message, backupAvailable }) => <div className="session-persistence-notice" role="alert" key={session.id}>
      <div>
        <strong>Unsaved conversation: {session.title}</strong>
        <p>{message} Save a separate copy to keep your messages without replacing the saved version.</p>
        {!backupAvailable && <p>Browser backup is unavailable. Keep this window open until you save a copy.</p>}
      </div>
      <button type="button" disabled={Boolean(recovering) || session.chats.some((chat) => chat.messages.some((message) => message.running))}
        onClick={() => void onRecover(session.id)}>
        {recovering === session.id ? 'Saving copy…' : 'Save a separate copy'}
      </button>
    </div>)}
  </div>
}
