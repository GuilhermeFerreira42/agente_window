import { useEffect, useRef, useState, type ComponentProps } from 'react'
import {
  Check,
  Clipboard,
  FileCode2,
  Flag,
  Globe2,
  GitBranch,
  GitCompareArrows,
  MessageCircle,
  MoreHorizontal,
  PanelRight,
  RotateCcw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Attachment, ChatCopyKind, ChatMessage, ChatVote, ComposerDraft, ComposerHistoryEntry, NestedChat, Session } from '../types'
import { ChatInput } from './ChatInput'

const modeLabels: Record<string, string> = {
  agent: 'Agente',
  edit: 'Editar',
  ask: 'Perguntar',
  plan: 'Planejar',
}

interface ChatPanelProps {
  session: Session
  activeChatId: string
  model: string
  mode: string
  auxiliaryVisible: boolean
  onSelectChat: (chatId: string) => void
  onChangeModel: (model: string) => void
  onChangeMode: (mode: string) => void
  onSend: (text: string, attachments: Attachment[]) => void
  onStop: () => void
  onApprove: (chatId?: string) => void
  onCopy: (chatId: string, messageId: string, kind: ChatCopyKind) => void
  onCopyAll: (chatId: string) => void
  onCopyFinalResponse: (chatId: string, messageId: string) => void
  onRegenerate: (chatId: string, messageId: string) => void
  onFeedback: (chatId: string, messageId: string, vote: ChatVote) => void
  onReport: (chatId: string, messageId: string) => void
  onOpenBrowser: () => void
  onOpenDiff: () => void
  onToggleAuxiliary: () => void
  composerDrafts?: Record<string, ComposerDraft>
  onChangeComposerDraft?: (key: string, updater: (current: ComposerDraft) => ComposerDraft) => void
  composerHistory?: Record<string, ComposerHistoryEntry[]>
  onAppendComposerHistory?: (key: string, entry: ComposerHistoryEntry) => void
}

function MessageActions({
  message,
  onCopy,
  onCopyAll,
  onCopyFinalResponse,
  onFeedback,
  onRegenerate,
  onReport,
  canRegenerate,
}: {
  message: ChatMessage
  onCopy: (messageId: string, kind: ChatCopyKind) => void
  onCopyAll: () => void
  onCopyFinalResponse: () => void
  onFeedback: (messageId: string, vote: ChatVote) => void
  onRegenerate: (messageId: string) => void
  onReport: (messageId: string) => void
  canRegenerate: boolean
}) {
  const [copied, setCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const copiedTimer = useRef<number | undefined>(undefined)
  // Limpa o timer de "Copiado" ao desmontar para evitar setState pós-unmount.
  useEffect(() => () => window.clearTimeout(copiedTimer.current), [])
  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(message.content)
    } catch {
      // Clipboard is optional in a sandboxed preview.
    }
    setCopied(true)
    onCopy(message.id, 'message')
    window.clearTimeout(copiedTimer.current)
    copiedTimer.current = window.setTimeout(() => setCopied(false), 1200)
  }
  return (
    <div className="chat-message-toolbar" aria-label="Ações da mensagem">
      <button className="message-action" type="button" aria-label="Copiar" title={copied ? 'Copiado' : 'Copiar'} onClick={copy}>{copied ? <Check size={13} /> : <Clipboard size={13} />}</button>
      {message.role === 'assistant' && <>
        {canRegenerate && <button className="message-action" type="button" aria-label="Regenerar" title="Regenerar resposta" disabled={message.running} onClick={() => onRegenerate(message.id)}><RotateCcw size={13} /></button>}
        <button className={`message-action${message.vote === 'up' ? ' is-active' : ''}`} type="button" aria-label="Útil" title="Marcar como útil" aria-pressed={message.vote === 'up'} onClick={() => onFeedback(message.id, 'up')}><ThumbsUp size={13} /></button>
        <button className={`message-action${message.vote === 'down' ? ' is-active' : ''}`} type="button" aria-label="Não útil" title="Marcar como não útil" aria-pressed={message.vote === 'down'} onClick={() => onFeedback(message.id, 'down')}><ThumbsDown size={13} /></button>
        <button className={`message-action${message.reported ? ' is-active' : ''}`} type="button" aria-label="Relatar problema" title={message.reported ? 'Problema relatado' : 'Relatar problema'} aria-pressed={message.reported === true} onClick={() => onReport(message.id)}><Flag size={13} /></button>
        <button className="message-action" type="button" aria-label="Mais ações" title="Mais ações" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((current) => !current)}><MoreHorizontal size={13} /></button>
        {menuOpen && <div className="chat-message-action-menu" role="menu" aria-label="Mais ações da resposta">
          <button type="button" role="menuitem" onClick={() => { onCopyAll(); setMenuOpen(false) }}>Copiar tudo</button>
          <button type="button" role="menuitem" onClick={() => { onCopyFinalResponse(); setMenuOpen(false) }}>Copiar resposta final</button>
        </div>}
      </>}
    </div>
  )
}

function MarkdownCode({ className, children, node: _node, onCopy, ...props }: ComponentProps<'code'> & { node?: unknown; onCopy?: () => void }) {
  const rawCode = String(children)
  const isBlock = Boolean(className || rawCode.endsWith('\n'))
  const code = rawCode.replace(/\n$/, '')
  void _node
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<number | undefined>(undefined)
  // Limpa o timer de "Copiado" ao desmontar para evitar setState pós-unmount.
  useEffect(() => () => window.clearTimeout(copiedTimer.current), [])

  if (!isBlock) return <code {...props}>{children}</code>

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(code)
    } catch {
      // Clipboard is optional in a sandboxed preview.
    }
    setCopied(true)
    onCopy?.()
    window.clearTimeout(copiedTimer.current)
    copiedTimer.current = window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <span className="chat-code-block">
      <button className={`chat-code-block-copy${copied ? ' is-copied' : ''}`} type="button" aria-label="Copiar código" title={copied ? 'Código copiado' : 'Copiar código'} onClick={copy}>
        {copied ? <Check size={12} /> : <Clipboard size={12} />}
      </button>
      <code className={className} {...props}>{children}</code>
    </span>
  )
}

function createMarkdownComponents(onCopy: () => void): Components {
  return {
    code: (props) => <MarkdownCode {...props} onCopy={onCopy} />,
  }
}

function MessageRow({
  message,
  onCopy,
  onCopyAll,
  onCopyFinalResponse,
  onFeedback,
  onRegenerate,
  onReport,
  canRegenerate,
}: {
  message: ChatMessage
  onCopy: (messageId: string, kind: ChatCopyKind) => void
  onCopyAll: () => void
  onCopyFinalResponse: () => void
  onFeedback: (messageId: string, vote: ChatVote) => void
  onRegenerate: (messageId: string) => void
  onReport: (messageId: string) => void
  canRegenerate: boolean
}) {
  return (
    <article className={`chat-message ${message.role === 'user' ? 'is-request' : 'is-response'}${message.running ? ' is-running' : ''}${message.cancelled ? ' is-cancelled' : ''}`} tabIndex={0}>
      <div className="chat-message-header">
        <div className="chat-message-user">
          <span className="chat-avatar" aria-hidden="true">{message.role === 'user' ? 'U' : <Sparkles size={11} />}</span>
          <span className="chat-message-name">{message.role === 'user' ? 'Você' : 'Agente'}</span>
          {message.role === 'user' && <span className="chat-message-time">{message.time}</span>}
          {message.role === 'user' && message.model && <span className="chat-message-time">· {message.model}</span>}
          {message.role === 'user' && message.mode && <span className="chat-message-time">· {modeLabels[message.mode] ?? message.mode}</span>}
        </div>
      </div>
      <div className="chat-message-body">
        {message.attachments && message.attachments.length > 0 && (
          <div className="chat-message-attachments" role="list" aria-label="Anexos enviados">
            {message.attachments.map((attachment) => (
              <span
                className="chat-message-attachment"
                key={attachment.id}
                role="listitem"
                aria-label={`${attachment.name}, ${attachment.kind === 'local' ? 'arquivo local' : 'arquivo do workspace'}`}
              >
                <FileCode2 size={11} aria-hidden="true" />
                <span>{attachment.name}</span>
              </span>
            ))}
          </div>
        )}
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={createMarkdownComponents(() => onCopy(message.id, 'code'))}>{message.content}</ReactMarkdown>
        {message.running && <div className="chat-progress"><Sparkles size={13} /><span>Trabalhando</span><span className="chat-progress-dots">...</span></div>}
      </div>
      {!message.running && (
        <div className="chat-message-footer">
          <MessageActions
            message={message}
            onCopy={onCopy}
            onCopyAll={onCopyAll}
            onCopyFinalResponse={onCopyFinalResponse}
            onFeedback={onFeedback}
            onRegenerate={onRegenerate}
            onReport={onReport}
            canRegenerate={canRegenerate}
          />
          {message.role === 'assistant' && <span className="chat-message-footer-details">{message.cancelled && 'Cancelada · '}{message.time}{message.model && ` · ${message.model}`}</span>}
        </div>
      )}
    </article>
  )
}

function ChatWelcome({ onPrompt }: { onPrompt: (prompt: string) => void }) {
  const prompts = [
    'Mostre as alterações desta sessão',
    'Abra o navegador no editor',
    'Explique o layout single-pane',
    'Revise os checks de CI',
  ]
  return (
    <div className="chat-welcome">
      <div className="chat-welcome-icon"><MessageCircle size={32} /></div>
      <div className="chat-welcome-title">Como posso ajudar?</div>
      <p className="chat-welcome-message">Converse com o agente, reveja alterações e abra ferramentas como Browser e Search diretamente na área do editor.</p>
      <div className="suggested-prompts">
        <span className="suggested-prompts-title">Sugestões</span>
        {prompts.map((prompt) => <button className="suggested-prompt" key={prompt} type="button" onClick={() => onPrompt(prompt)}><Sparkles size={12} />{prompt}</button>)}
      </div>
    </div>
  )
}

export function ChatPanel({
  session,
  activeChatId,
  model,
  mode,
  auxiliaryVisible,
  onSelectChat,
  onChangeModel,
  onChangeMode,
  onSend,
  onStop,
  onApprove,
  onCopy,
  onCopyAll,
  onCopyFinalResponse,
  onRegenerate,
  onFeedback,
  onReport,
  onOpenBrowser,
  onOpenDiff,
  onToggleAuxiliary,
  composerDrafts,
  onChangeComposerDraft,
  composerHistory,
  onAppendComposerHistory,
}: ChatPanelProps) {
  const activeChat: NestedChat = session.chats.find((chat) => chat.id === activeChatId) ?? session.chats[0]
  const lastAssistantMessageId = [...activeChat.messages].reverse().find((message) => message.role === 'assistant')?.id
  const isEmpty = activeChat.messages.length === 0
  return (
    <section className="chat-pane" aria-label="Chat da sessão">
      <div className="chat-pane-header">
        <div className="pane-title">
          <Sparkles size={14} /><span>Chat</span><span className="pane-title-subtle">· {session.workspace}</span>
          {(session.diffAdded > 0 || session.diffRemoved > 0) && (
            <button
              className="changes-pill"
              type="button"
              title="Abrir alterações da branch no editor"
              aria-label={`Abrir alterações: +${session.diffAdded} −${session.diffRemoved}`}
              onClick={onOpenDiff}
            >
              <GitBranch size={12} aria-hidden="true" />
              <span className="changes-pill-branch">{session.branch}</span>
              <span className="session-diff-added">+{session.diffAdded}</span>
              <span className="session-diff-removed">−{session.diffRemoved}</span>
            </button>
          )}
        </div>
        <div className="sessions-header-actions">
          <button className="toolbar-button" type="button" title="Abrir navegador no editor" aria-label="Abrir navegador" onClick={onOpenBrowser}><Globe2 size={14} /></button>
          <button className="toolbar-button" type="button" title="Revisar alterações" aria-label="Revisar alterações" onClick={onOpenDiff}><GitCompareArrows size={14} /></button>
          <button className={`toolbar-button${auxiliaryVisible ? ' is-active' : ''}`} type="button" title="Barra auxiliar" aria-label="Barra auxiliar" onClick={onToggleAuxiliary}><PanelRight size={14} /></button>
        </div>
      </div>
      {session.chats.length > 1 && (
        <div className="chat-group-tabs" role="tablist" aria-label="Chats desta sessão">
          {session.chats.map((chat) => (
            <button className={`chat-group-tab${chat.id === activeChat.id ? ' is-active' : ''}`} type="button" role="tab" aria-selected={chat.id === activeChat.id} key={chat.id} onClick={() => onSelectChat(chat.id)}>
              <MessageCircle size={12} /><span className="chat-group-tab-title">{chat.title}</span>{chat.status === 'needs-input' && <span className="unread-dot" />}
            </button>
          ))}
          <button className="chat-group-tab-add" type="button" title="Novo chat" aria-label="Novo chat" onClick={() => onSend('Inicie um novo chat contextual para esta sessão.', [])}>+</button>
        </div>
      )}
      <div className="chat-content">
        <div className="chat-messages">
          {isEmpty ? <ChatWelcome onPrompt={(prompt) => onSend(prompt, [])} /> : activeChat.messages.map((message) => (
            <MessageRow
              key={message.id}
              message={message}
              onCopy={(messageId, kind) => onCopy(activeChat.id, messageId, kind)}
              onCopyAll={() => onCopyAll(activeChat.id)}
              onCopyFinalResponse={() => onCopyFinalResponse(activeChat.id, message.id)}
              onFeedback={(messageId, vote) => onFeedback(activeChat.id, messageId, vote)}
              onRegenerate={(messageId) => onRegenerate(activeChat.id, messageId)}
              onReport={(messageId) => onReport(activeChat.id, messageId)}
              canRegenerate={message.id === lastAssistantMessageId}
            />
          ))}
        </div>
        {(session.approval || activeChat.approval) && (
          <div className="chat-approval-banner">
            <WrenchIcon />
            <span>{activeChat.approval ?? session.approval}</span>
            <button className="primary-button" type="button" onClick={() => onApprove(activeChat.id)}>Permitir</button>
          </div>
        )}
        <div className="chat-composer">
          <ChatInput
            session={session}
            activeChat={activeChat}
            model={model}
            mode={mode}
            onChangeModel={onChangeModel}
            onChangeMode={onChangeMode}
            onSend={onSend}
            onStop={onStop}
            onApprove={onApprove}
            composerDrafts={composerDrafts}
            onChangeComposerDraft={onChangeComposerDraft}
            composerHistory={composerHistory}
            onAppendComposerHistory={onAppendComposerHistory}
          />
        </div>
      </div>
    </section>
  )
}

function WrenchIcon() {
  return <FileCode2 size={14} aria-hidden="true" />
}

