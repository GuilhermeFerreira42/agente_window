import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowUp, Bot, ChevronDown, FolderGit2, Mic, MessageSquare, Plus, ShieldCheck, Wand2 } from 'lucide-react'

interface SessionLandingProps {
  workspace: string
  onSubmit: (text: string) => void
  onChangeMode?: () => void
  onChangeModel?: () => void
  onAddContext?: () => void
  onDictate?: () => void
  onPickWorkspace?: () => void
  isFileSystemSupported?: boolean
}

export function SessionLanding({ workspace, onSubmit, onChangeMode, onChangeModel, onAddContext, onDictate, onPickWorkspace, isFileSystemSupported = true }: SessionLandingProps) {
  const [text, setText] = useState('')

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    onSubmit(trimmed)
    setText('')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <section className="session-landing" aria-label="Nova sessão">
      <div className="session-landing-center">
        <h1 className="session-landing-title">
          <span className="session-landing-title-lead">Nova sessão em</span>
          {onPickWorkspace ? (
            <button
              className="session-landing-chip is-clickable"
              type="button"
              title={isFileSystemSupported ? "Escolher pasta real do disco (como no vídeo original 06:13)" : "File System API não suportada"}
              aria-label={`Workspace atual: ${workspace}. Clique para escolher pasta real`}
              onClick={onPickWorkspace}
            >
              <FolderGit2 size={14} aria-hidden="true" />{workspace}<ChevronDown size={13} aria-hidden="true" />
            </button>
          ) : (
            <span className="session-landing-chip"><FolderGit2 size={14} aria-hidden="true" />{workspace}<ChevronDown size={13} aria-hidden="true" /></span>
          )}
          <span className="session-landing-title-lead">com</span>
          <span className="session-landing-chip"><Bot size={14} aria-hidden="true" />Copilot<ChevronDown size={13} aria-hidden="true" /></span>
        </h1>

        {onPickWorkspace && isFileSystemSupported && (
          <p style={{ fontSize: 12, color: 'var(--vscode-descriptionForeground)', marginBottom: 16, textAlign: 'center' }}>
            Clique em <strong>{workspace}</strong> para escolher pasta real do disco — como no original [06:13]
          </p>
        )}

        <form className="session-landing-input" onSubmit={submit}>
          <textarea
            className="session-landing-textarea"
            placeholder="O que você está tentando fazer?"
            aria-label="Mensagem para a nova sessão"
            value={text}
            rows={1}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="session-landing-toolbar">
            <div className="session-landing-toolbar-left">
              <button type="button" className="session-landing-icon-button" aria-label="Adicionar contexto" title="Adicionar contexto" onClick={onAddContext}><Plus size={15} /></button>
              <button type="button" className="session-landing-pill" aria-label="Modo Agente" title="Modo" onClick={onChangeMode}><Wand2 size={13} aria-hidden="true" />Agente<ChevronDown size={12} aria-hidden="true" /></button>
              <button type="button" className="session-landing-pill" aria-label="Modelo automático" title="Modelo" onClick={onChangeModel}><Bot size={13} aria-hidden="true" />Auto<ChevronDown size={12} aria-hidden="true" /></button>
            </div>
            <div className="session-landing-toolbar-right">
              <button type="button" className="session-landing-icon-button" aria-label="Ditar por voz" title="Ditar por voz" onClick={onDictate}><Mic size={15} /></button>
              <button type="submit" className="session-landing-send" aria-label="Enviar mensagem" title="Enviar" disabled={!text.trim()}><ArrowUp size={15} /></button>
            </div>
          </div>
        </form>

        <div className="session-landing-footer">
          <span className="session-landing-footer-item"><MessageSquare size={13} aria-hidden="true" />Interativo</span>
          <span className="session-landing-footer-item"><ShieldCheck size={13} aria-hidden="true" />Permissões manuais</span>
        </div>
      </div>
    </section>
  )
}
