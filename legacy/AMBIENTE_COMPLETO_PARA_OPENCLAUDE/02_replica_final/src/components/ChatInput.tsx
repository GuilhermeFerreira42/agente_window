import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import {
  ArrowLeft,
  AtSign,
  Check,
  ChevronDown,
  FileCode2,
  Mic,
  Paperclip,
  Plus,
  Send,
  Square,
  Sparkles,
  X,
} from 'lucide-react'
import type { Attachment, ComposerDraft, ComposerHistoryEntry, NestedChat, Session } from '../types'
import { workspaceFiles } from '../data'
import { DragTypes } from '../domain/dragAndDrop'

interface ChatInputProps {
  session: Session
  activeChat: NestedChat
  model: string
  mode: string
  onChangeModel: (model: string) => void
  onChangeMode: (mode: string) => void
  onSend: (text: string, attachments: Attachment[]) => void
  onStop: () => void
  onApprove: (chatId?: string) => void
  composerDrafts?: Record<string, ComposerDraft>
  onChangeComposerDraft?: (key: string, updater: (current: ComposerDraft) => ComposerDraft) => void
  composerHistory?: Record<string, ComposerHistoryEntry[]>
  onAppendComposerHistory?: (key: string, entry: ComposerHistoryEntry) => void
}

const modes = [
  { id: 'agent', label: 'Agente', description: 'Descreva o que construir' },
  { id: 'edit', label: 'Editar', description: 'Descreva as alterações' },
  { id: 'ask', label: 'Perguntar', description: 'Explore e entenda o código' },
  { id: 'plan', label: 'Planejar', description: 'Descreva o plano de execução' },
]

const models = [
  { id: 'Auto', description: 'Escolher automaticamente' },
  { id: 'Claude Sonnet 4', description: 'Rápido e equilibrado' },
  { id: 'GPT-5', description: 'Raciocínio avançado' },
  { id: 'GPT-5 mini', description: 'Resposta rápida' },
]

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
}

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike
  webkitSpeechRecognition?: new () => SpeechRecognitionLike
}

type AttachmentPickerView = 'sources' | 'workspace'

const createEmptyDraft = (): ComposerDraft => ({ text: '', attachments: [] })
const COMPOSER_HISTORY_MAX_ENTRIES = 40

function historyEntriesEqual(left: ComposerHistoryEntry | undefined, right: ComposerHistoryEntry): boolean {
  if (!left || left.text !== right.text || left.model !== right.model || left.mode !== right.mode) return false
  return left.attachments.length === right.attachments.length && left.attachments.every((attachment, index) => {
    const other = right.attachments[index]
    return attachment.id === other.id && attachment.name === other.name && attachment.kind === other.kind
  })
}

function cloneHistoryEntry(entry: ComposerHistoryEntry): ComposerHistoryEntry {
  return { ...entry, attachments: entry.attachments.map((attachment) => ({ ...attachment })) }
}

function attachmentTypeLabel(attachment: Attachment): string {
  return attachment.kind === 'local' ? 'arquivo local' : 'arquivo do workspace'
}

function createLocalAttachment(file: File): Attachment {
  // The browser does not expose a stable path. Name plus file metadata gives the
  // mock payload a deterministic identity and prevents repeated picker events from
  // adding the same file twice while still allowing a changed file to be selected.
  const identity = [file.name, file.size, file.lastModified, file.type].join(':')
  return { id: `local:${identity}`, name: file.name, kind: 'local' }
}

export function ChatInput({
  session,
  activeChat,
  model,
  mode,
  onChangeModel,
  onChangeMode,
  onSend,
  onStop,
  onApprove,
  composerDrafts,
  onChangeComposerDraft,
  composerHistory,
  onAppendComposerHistory,
}: ChatInputProps) {
  // Drafts are keyed by session and nested chat. This keeps an in-progress edit
  // when the user briefly changes chat, without leaking attachments to another
  // session or chat.
  const draftKey = `${session.id}:${activeChat.id}`
  const [localDrafts, setLocalDrafts] = useState<Record<string, ComposerDraft>>({})
  const drafts = composerDrafts ?? localDrafts
  const draft = drafts[draftKey] ?? createEmptyDraft()
  const text = draft.text
  const attachments = draft.attachments
  const [localHistoryByChat, setLocalHistoryByChat] = useState<Record<string, ComposerHistoryEntry[]>>({})
  const history = composerHistory?.[draftKey] ?? localHistoryByChat[draftKey] ?? []
  const historyCursorRef = useRef<{ key: string; index: number; overlays: Map<number, ComposerHistoryEntry> }>({
    key: draftKey,
    index: history.length,
    overlays: new Map(),
  })
  const pendingHistoryCursorRef = useRef<'start' | 'end' | null>(null)
  const [modeOpen, setModeOpen] = useState(false)
  const [modelOpen, setModelOpen] = useState(false)
  const [modelQuery, setModelQuery] = useState('')
  const [attachmentPickerOpen, setAttachmentPickerOpen] = useState(false)
  const [attachmentPickerView, setAttachmentPickerView] = useState<AttachmentPickerView>('sources')
  const [isFileDropTarget, setIsFileDropTarget] = useState(false)
  const [workspaceQuery, setWorkspaceQuery] = useState('')
  const [isListening, setIsListening] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const speechRef = useRef<SpeechRecognitionLike | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modeButtonRef = useRef<HTMLButtonElement>(null)
  const modeWrapRef = useRef<HTMLDivElement>(null)
  const modeOptionRefs = useRef(new Map<string, HTMLButtonElement>())
  const modelButtonRef = useRef<HTMLButtonElement>(null)
  const modelWrapRef = useRef<HTMLDivElement>(null)
  const modelSearchRef = useRef<HTMLInputElement>(null)
  const modelOptionRefs = useRef(new Map<string, HTMLButtonElement>())
  const chipRefs = useRef(new Map<string, HTMLSpanElement>())
  const submitLockRef = useRef(false)

  const isWorking = session.status === 'working' || activeChat.status === 'working'
  const wasWorkingRef = useRef(isWorking)
  const needsInput = Boolean(session.approval || activeChat.approval || session.status === 'needs-input')
  const hasSendableContent = Boolean(text.trim() || attachments.length > 0)
  const currentMode = modes.find((item) => item.id === mode)
  const inputPlaceholder = isWorking
    ? 'Aguarde enquanto o agente trabalha…'
    : currentMode?.description ?? `Pergunte a ${session.workspace}…`
  const mentionOpen = /(^|\s)@[^\s]*$/.test(text)
  const contextPercent = Math.min(92, 18 + Math.round(text.length / 9) + attachments.length * 4)
  const normalizedWorkspaceQuery = workspaceQuery.trim().toLocaleLowerCase()
  const filteredWorkspaceFiles = workspaceFiles.filter((file) => file.toLocaleLowerCase().includes(normalizedWorkspaceQuery)).slice(0, 8)
  const normalizedModelQuery = modelQuery.trim().toLocaleLowerCase()
  const filteredModels = models.filter((item) => `${item.id} ${item.description}`.toLocaleLowerCase().includes(normalizedModelQuery))

  const updateDraft = (updater: (current: ComposerDraft) => ComposerDraft) => {
    if (onChangeComposerDraft) {
      onChangeComposerDraft(draftKey, updater)
      return
    }

    setLocalDrafts((currentDrafts) => {
      const current = currentDrafts[draftKey] ?? createEmptyDraft()
      return { ...currentDrafts, [draftKey]: updater(current) }
    })
  }

  const setDraftText = (value: string | ((current: string) => string)) => {
    updateDraft((current) => ({
      ...current,
      text: typeof value === 'function' ? value(current.text) : value,
    }))
  }

  const setDraftAttachments = (value: Attachment[] | ((current: Attachment[]) => Attachment[])) => {
    updateDraft((current) => ({
      ...current,
      attachments: typeof value === 'function' ? value(current.attachments) : value,
    }))
  }

  const getCurrentHistoryEntry = (): ComposerHistoryEntry => ({
    text,
    attachments: attachments.map((attachment) => ({ ...attachment })),
    model,
    mode,
  })

  const appendHistoryEntry = (entry: ComposerHistoryEntry) => {
    const currentHistory = history
    const nextHistory = historyEntriesEqual(currentHistory[currentHistory.length - 1], entry)
      ? currentHistory
      : [...currentHistory, cloneHistoryEntry(entry)].slice(-COMPOSER_HISTORY_MAX_ENTRIES)

    if (onAppendComposerHistory) {
      onAppendComposerHistory(draftKey, cloneHistoryEntry(entry))
    } else {
      setLocalHistoryByChat((current) => ({ ...current, [draftKey]: nextHistory }))
    }

    historyCursorRef.current = {
      key: draftKey,
      index: nextHistory.length,
      overlays: new Map(),
    }
  }

  const restoreHistoryEntry = (entry: ComposerHistoryEntry | undefined, direction: 'previous' | 'next') => {
    const nextEntry = entry ? cloneHistoryEntry(entry) : createEmptyDraft()
    updateDraft(() => ({ text: nextEntry.text, attachments: nextEntry.attachments }))
    if (entry?.mode && entry.mode !== mode) onChangeMode(entry.mode)
    if (entry?.model && entry.model !== model) onChangeModel(entry.model)
    pendingHistoryCursorRef.current = direction === 'previous' ? 'start' : 'end'
  }

  const navigateHistory = (direction: 'previous' | 'next') => {
    const cursor = historyCursorRef.current
    if (cursor.key !== draftKey) {
      cursor.key = draftKey
      cursor.index = history.length
      cursor.overlays.clear()
    }

    if (direction === 'previous' && cursor.index === 0) return
    if (direction === 'next' && cursor.index >= history.length) return

    const currentEntry = getCurrentHistoryEntry()
    if (currentEntry.text || currentEntry.attachments.length > 0) {
      cursor.overlays.set(cursor.index, currentEntry)
    }

    cursor.index = direction === 'previous'
      ? Math.max(cursor.index - 1, 0)
      : Math.min(cursor.index + 1, history.length)
    restoreHistoryEntry(cursor.overlays.get(cursor.index) ?? history[cursor.index], direction)
  }

  useEffect(() => () => speechRef.current?.stop(), [])

  // A picker belongs to the active composer target, but the draft itself is
  // retained in the keyed store when changing session or nested chat.
  useEffect(() => {
    setAttachmentPickerOpen(false)
    setAttachmentPickerView('sources')
    setWorkspaceQuery('')
    setModeOpen(false)
    setModelOpen(false)
    setModelQuery('')
    submitLockRef.current = false
    historyCursorRef.current = { key: draftKey, index: history.length, overlays: new Map() }
    pendingHistoryCursorRef.current = null
  }, [draftKey, history.length])

  useEffect(() => {
    if (!modeOpen) return

    modeOptionRefs.current.get(mode)?.focus()
    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (!modeWrapRef.current?.contains(event.target as Node)) setModeOpen(false)
    }
    document.addEventListener('pointerdown', handleOutsidePointerDown, true)
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown, true)
  }, [modeOpen, mode])

  useEffect(() => {
    if (!modelOpen) return

    modelSearchRef.current?.focus()
    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (!modelWrapRef.current?.contains(event.target as Node)) setModelOpen(false)
    }
    document.addEventListener('pointerdown', handleOutsidePointerDown, true)
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown, true)
  }, [modelOpen])

  // The workbench editor grows with its content and clamps at a maximum height.
  // Keep the textarea equivalent while retaining native scrolling for long drafts.
  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    const contentHeight = textarea.scrollHeight
    const nextHeight = Math.min(200, Math.max(50, contentHeight))
    textarea.style.height = `${nextHeight}px`
    textarea.style.overflowY = contentHeight > 200 ? 'auto' : 'hidden'

    const cursor = pendingHistoryCursorRef.current
    if (cursor) {
      const position = cursor === 'start' ? 0 : textarea.value.length
      textarea.setSelectionRange(position, position)
      pendingHistoryCursorRef.current = null
    }
  }, [text])

  // A submit clears the draft before the parent necessarily publishes its working
  // state. This lock closes that small event-window without preventing a fresh
  // draft after a mocked callback or after the request completes.
  useEffect(() => {
    if (isWorking) {
      wasWorkingRef.current = true
      return
    }

    if (wasWorkingRef.current || !hasSendableContent) {
      submitLockRef.current = false
      wasWorkingRef.current = false
    }
  }, [hasSendableContent, isWorking])

  const closeAttachmentPicker = () => {
    setAttachmentPickerOpen(false)
    setAttachmentPickerView('sources')
    setWorkspaceQuery('')
  }

  const openAttachmentPicker = () => {
    setAttachmentPickerView('sources')
    setWorkspaceQuery('')
    setAttachmentPickerOpen((current) => !current)
    setModeOpen(false)
    setModelOpen(false)
  }

  const chooseLocalFiles = () => {
    closeAttachmentPicker()
    fileInputRef.current?.click()
  }

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    if (!hasSendableContent || isWorking || submitLockRef.current) return

    submitLockRef.current = true
    appendHistoryEntry(getCurrentHistoryEntry())
    onSend(text.trim(), attachments.map((attachment) => ({ ...attachment })))
    updateDraft(() => createEmptyDraft())
  }

  const addWorkspaceFile = (path: string) => {
    const name = path.split('/').pop() ?? path
    const attachment: Attachment = { id: `workspace:${path}`, name, kind: 'workspace' }
    setDraftAttachments((current) => current.some((item) => item.id === attachment.id) ? current : [...current, attachment])
    setDraftText((current) => current.replace(/(^|\s)@[^\s]*$/, '$1'))
    closeAttachmentPicker()
    textareaRef.current?.focus()
  }

  // (E3) Alvo de soltar: um arquivo arrastado da árvore do workspace vira anexo
  // do rascunho ativo. O gate lê o mime `DragTypes.FILE` durante o dragover.
  const dragEventHasFile = (event: React.DragEvent): boolean =>
    Array.from(event.dataTransfer.types).includes(DragTypes.FILE)

  const handleComposerDragOver = (event: React.DragEvent) => {
    if (!dragEventHasFile(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    if (!isFileDropTarget) setIsFileDropTarget(true)
  }

  const handleComposerDragLeave = (event: React.DragEvent) => {
    // Só limpa quando o ponteiro sai de fato do container (não ao cruzar filhos).
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
    setIsFileDropTarget(false)
  }

  const handleComposerDrop = (event: React.DragEvent) => {
    const path = event.dataTransfer.getData(DragTypes.FILE)
    setIsFileDropTarget(false)
    if (!path) return
    event.preventDefault()
    addWorkspaceFile(path)
  }

  const removeAttachment = (id: string) => {
    const index = attachments.findIndex((attachment) => attachment.id === id)
    if (index < 0) return

    const nextFocusId = attachments[index + 1]?.id ?? attachments[index - 1]?.id
    setDraftAttachments((current) => current.filter((attachment) => attachment.id !== id))

    if (nextFocusId) {
      chipRefs.current.get(nextFocusId)?.focus()
    } else {
      textareaRef.current?.focus()
    }
  }

  const handleAttachmentChipKeyDown = (id: string, event: React.KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      removeAttachment(id)
      return
    }

    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    const index = attachments.findIndex((attachment) => attachment.id === id)
    if (index < 0) return
    const nextIndex = index + (event.key === 'ArrowRight' ? 1 : -1)
    const nextAttachment = attachments[nextIndex]
    if (!nextAttachment) return

    event.preventDefault()
    chipRefs.current.get(nextAttachment.id)?.focus()
  }

  const selectMode = (nextMode: string) => {
    onChangeMode(nextMode)
    setModeOpen(false)
    modeButtonRef.current?.focus()
  }

  const handleModeMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setModeOpen(false)
      modeButtonRef.current?.focus()
      return
    }

    const direction = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const nextMode = event.key === 'Home' ? modes[0] : modes[modes.length - 1]
      modeOptionRefs.current.get(nextMode.id)?.focus()
      return
    }
    if (!direction) return

    event.preventDefault()
    const focusedIndex = modes.findIndex((item) => modeOptionRefs.current.get(item.id) === document.activeElement)
    const nextIndex = focusedIndex < 0 ? (direction > 0 ? 0 : modes.length - 1) : Math.min(modes.length - 1, Math.max(0, focusedIndex + direction))
    modeOptionRefs.current.get(modes[nextIndex].id)?.focus()
  }

  const selectModel = (nextModel: string) => {
    onChangeModel(nextModel)
    setModelOpen(false)
    setModelQuery('')
    modelButtonRef.current?.focus()
  }

  const handleModelMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setModelOpen(false)
      setModelQuery('')
      modelButtonRef.current?.focus()
      return
    }
    if (filteredModels.length === 0) return

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const nextModel = event.key === 'Home' ? filteredModels[0] : filteredModels[filteredModels.length - 1]
      modelOptionRefs.current.get(nextModel.id)?.focus()
      return
    }

    const direction = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0
    if (!direction) return

    event.preventDefault()
    const focusedIndex = filteredModels.findIndex((item) => modelOptionRefs.current.get(item.id) === document.activeElement)
    const selectedIndex = filteredModels.findIndex((item) => item.id === model)
    const startingIndex = selectedIndex >= 0 ? selectedIndex : direction > 0 ? 0 : filteredModels.length - 1
    const nextIndex = focusedIndex < 0
      ? startingIndex
      : Math.min(filteredModels.length - 1, Math.max(0, focusedIndex + direction))
    modelOptionRefs.current.get(filteredModels[nextIndex].id)?.focus()
  }

  const startVoice = () => {
    const speechWindow = window as SpeechWindow
    const Constructor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
    if (!Constructor) {
      setDraftText((current) => `${current}${current ? ' ' : ''}Descreva a alteração que você quer revisar.`)
      return
    }
    if (isListening) {
      speechRef.current?.stop()
      setIsListening(false)
      return
    }
    const recognition = new Constructor()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'pt-BR'
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? ''
      setDraftText((current) => `${current}${current ? ' ' : ''}${transcript}`)
    }
    recognition.onend = () => setIsListening(false)
    speechRef.current = recognition
    setIsListening(true)
    recognition.start()
  }

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    // Mirrors CancelAction's Ctrl/Cmd+Escape binding. The Windows workbench
    // also exposes Alt+Backspace; keeping both here makes cancellation work
    // regardless of which composer control currently owns focus.
    const isPrimaryCancel = (event.ctrlKey || event.metaKey) && event.key === 'Escape'
    const isWindowsCancel = event.altKey && event.key === 'Backspace'
    if (!isWorking || (!isPrimaryCancel && !isWindowsCancel)) return

    event.preventDefault()
    event.stopPropagation()
    onStop()
  }

  return (
    <form className="chat-input-stack" onSubmit={submit} onKeyDown={handleComposerKeyDown}>
      {needsInput && (
        <div className="input-stack-banner is-warning">
          <Sparkles size={13} />
          <span>{activeChat.approval ?? session.approval ?? 'Esta sessão está aguardando sua aprovação.'}</span>
          <button className="primary-button" type="button" onClick={() => onApprove(activeChat.id)}>Permitir</button>
        </div>
      )}
      <div
        className={`chat-input-container${isWorking ? ' is-working' : ''}${needsInput ? ' has-stack-banner' : ''}${isFileDropTarget ? ' is-drop-target' : ''}`}
        aria-busy={isWorking}
        onDragOver={handleComposerDragOver}
        onDragLeave={handleComposerDragLeave}
        onDrop={handleComposerDrop}
      >
        {isFileDropTarget && <div className="chat-input-dropzone" aria-hidden="true">Solte para anexar ao chat</div>}
        <div className="chat-input-editor-row">
          <textarea
            ref={textareaRef}
            className="chat-input-textarea"
            rows={1}
            value={text}
            onChange={(event) => setDraftText(event.target.value)}
            placeholder={inputPlaceholder}
            aria-label="Mensagem para o agente"
            aria-keyshortcuts="Enter Control+Enter Meta+Enter ArrowUp ArrowDown Control+/ Meta+/"
            enterKeyHint="send"
            onKeyDown={(event) => {
              const atStart = event.currentTarget.selectionStart === 0 && event.currentTarget.selectionEnd === 0
              const atEnd = event.currentTarget.selectionStart === event.currentTarget.value.length && event.currentTarget.selectionEnd === event.currentTarget.value.length
              if (event.key === 'ArrowUp' && atStart && history.length > 0) {
                event.preventDefault()
                navigateHistory('previous')
                return
              }
              if (event.key === 'ArrowDown' && atEnd && history.length > 0) {
                event.preventDefault()
                navigateHistory('next')
                return
              }

              if ((event.ctrlKey || event.metaKey) && event.key === '/') {
                event.preventDefault()
                openAttachmentPicker()
                return
              }

              // Chat submits with Enter, Ctrl/Cmd+Enter, or the send button.
              // Shift+Enter remains available for a multiline draft, and an
              // active IME composition must not be interrupted.
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                submit()
              }
            }}
          />
        </div>
        {attachments.length > 0 && (
          <div className="attachments-row" role="list" aria-label="Arquivos anexados">
            {attachments.map((attachment) => (
              <span
                className="attachment-chip"
                key={attachment.id}
                role="group"
                tabIndex={0}
                ref={(element) => {
                  if (element) chipRefs.current.set(attachment.id, element)
                  else chipRefs.current.delete(attachment.id)
                }}
                aria-label={`${attachment.name}, ${attachmentTypeLabel(attachment)}. Pressione Delete para remover.`}
                title={`${attachment.name} · ${attachmentTypeLabel(attachment)}`}
                onKeyDown={(event) => handleAttachmentChipKeyDown(attachment.id, event)}
              >
                <FileCode2 size={11} aria-hidden="true" />
                <span className="attachment-chip-name">{attachment.name}</span>
                <span className="attachment-chip-kind" aria-hidden="true">{attachment.kind === 'local' ? 'local' : 'workspace'}</span>
                <button
                  className="attachment-remove"
                  type="button"
                  tabIndex={-1}
                  aria-label={`Remover ${attachment.name}`}
                  title={`Remover ${attachment.name}`}
                  onClick={() => removeAttachment(attachment.id)}
                >
                  <X size={11} aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="chat-input-bottom-row">
          <div className="input-mode-wrap" ref={modeWrapRef}>
            <button
              ref={modeButtonRef}
              className={`input-mode-button${modeOpen ? ' is-open' : ''}`}
              type="button"
              onClick={() => { setModeOpen((current) => !current); setModelOpen(false) }}
              aria-haspopup="menu"
              aria-expanded={modeOpen}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && modeOpen) {
                  event.preventDefault()
                  setModeOpen(false)
                }
              }}
            >
              <Sparkles size={12} />
              <span>{modes.find((item) => item.id === mode)?.label ?? 'Agente'}</span>
              <ChevronDown size={11} />
            </button>
            {modeOpen && (
              <div className="popover mode-popover" role="menu" aria-label="Selecionar modo" onKeyDown={handleModeMenuKeyDown}>
                {modes.map((item) => (
                  <button
                    className={`popover-option${item.id === mode ? ' is-selected' : ''}`}
                    key={item.id}
                    type="button"
                    aria-pressed={item.id === mode}
                    tabIndex={item.id === mode ? 0 : -1}
                    ref={(element) => {
                      if (element) modeOptionRefs.current.set(item.id, element)
                      else modeOptionRefs.current.delete(item.id)
                    }}
                    onClick={() => selectMode(item.id)}
                  >
                    <Sparkles size={12} aria-hidden="true" />
                    <span>{item.label}</span>
                    <span className="popover-option-description">{item.description}</span>
                    {item.id === mode && <Check size={12} aria-hidden="true" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className={`chat-input-tool-button${attachmentPickerOpen ? ' is-active' : ''}`}
            type="button"
            title="Adicionar contexto"
            aria-label="Anexar arquivo"
            aria-haspopup="menu"
            aria-expanded={attachmentPickerOpen}
            aria-keyshortcuts="Control+/ Meta+/"
            onClick={openAttachmentPicker}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && attachmentPickerOpen) {
                event.preventDefault()
                closeAttachmentPicker()
              }
            }}
          >
            <Paperclip size={14} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(event) => {
              const files = Array.from(event.target.files ?? [])
              setDraftAttachments((current) => {
                const next = [...current]
                for (const file of files) {
                  const attachment = createLocalAttachment(file)
                  if (!next.some((item) => item.id === attachment.id)) next.push(attachment)
                }
                return next
              })
              event.target.value = ''
              textareaRef.current?.focus()
            }}
          />
          <button className="chat-input-tool-button" type="button" title="Inserir menção" aria-label="Inserir menção" onClick={() => setDraftText((current) => `${current}${current ? ' ' : ''}@`)}><AtSign size={14} /></button>
          <button className={`chat-input-tool-button${isListening ? ' is-active' : ''}`} type="button" title="Ditado por voz" aria-label="Ditado por voz" onClick={startVoice}><Mic size={14} /></button>
          <div className="input-toolbar-spacer" />
          <div className="context-usage" title={`${contextPercent}% do contexto utilizado`}>
            <span>{contextPercent}%</span>
            <span className="context-usage-meter"><span style={{ width: `${contextPercent}%` }} /></span>
          </div>
          <div className="model-picker-wrap" ref={modelWrapRef}>
            <button
              ref={modelButtonRef}
              className={`input-mode-button${modelOpen ? ' is-open' : ''}`}
              type="button"
              title="Selecionar modelo"
              onClick={() => { setModelOpen((current) => !current); setModeOpen(false) }}
              aria-haspopup="menu"
              aria-expanded={modelOpen}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && modelOpen) {
                  event.preventDefault()
                  setModelOpen(false)
                  setModelQuery('')
                }
              }}
            >
              <span>{model}</span><ChevronDown size={11} />
            </button>
            {modelOpen && (
              <div className="popover model-popover" role="menu" aria-label="Selecionar modelo" onKeyDown={handleModelMenuKeyDown}>
                <div className="popover-title">Modelos</div>
                <input
                  ref={modelSearchRef}
                  className="popover-search model-popover-search"
                  type="search"
                  value={modelQuery}
                  placeholder="Buscar modelos"
                  aria-label="Buscar modelos"
                  onChange={(event) => setModelQuery(event.target.value)}
                />
                <div className="model-picker-list">
                  {filteredModels.length > 0 ? filteredModels.map((item) => (
                    <button
                      className={`popover-option${item.id === model ? ' is-selected' : ''}`}
                      key={item.id}
                      type="button"
                      aria-pressed={item.id === model}
                      tabIndex={item.id === model ? 0 : -1}
                      ref={(element) => {
                        if (element) modelOptionRefs.current.set(item.id, element)
                        else modelOptionRefs.current.delete(item.id)
                      }}
                      onClick={() => selectModel(item.id)}
                    >
                      <Sparkles size={12} aria-hidden="true" />
                      <span>{item.id}</span>
                      <span className="popover-option-description">{item.description}</span>
                      {item.id === model && <Check size={12} aria-hidden="true" />}
                    </button>
                  )) : <div className="model-picker-empty">Nenhum modelo encontrado</div>}
                </div>
              </div>
            )}
          </div>
          <button
            className={`send-button${isWorking ? ' is-stop' : ''}`}
            type={isWorking ? 'button' : 'submit'}
            aria-label={isWorking ? 'Parar execução' : 'Enviar mensagem'}
            title={isWorking ? 'Parar execução' : 'Enviar'}
            aria-keyshortcuts={isWorking ? 'Control+Escape Meta+Escape Alt+Backspace' : undefined}
            disabled={!isWorking && !hasSendableContent}
            onClick={isWorking ? onStop : undefined}
          >
            {isWorking ? <Square size={11} fill="currentColor" /> : hasSendableContent ? <Send size={12} /> : <Plus size={13} />}
          </button>
        </div>
        {attachmentPickerOpen && (
          <div
            className="popover attachment-picker-popover"
            role="menu"
            aria-label="Adicionar contexto"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                closeAttachmentPicker()
              }
            }}
          >
            {attachmentPickerView === 'sources' ? (
              <>
                <div className="popover-title">Adicionar contexto</div>
                <button className="popover-option" type="button" role="menuitem" onClick={chooseLocalFiles}>
                  <Paperclip size={12} aria-hidden="true" />
                  <span>Arquivo local</span>
                  <span className="popover-option-description">Escolher do computador</span>
                </button>
                <button className="popover-option" type="button" role="menuitem" onClick={() => { setAttachmentPickerView('workspace'); setWorkspaceQuery('') }}>
                  <FileCode2 size={12} aria-hidden="true" />
                  <span>Arquivo do workspace</span>
                  <span className="popover-option-description">Pesquisar arquivos</span>
                </button>
              </>
            ) : (
              <>
                <div className="attachment-picker-heading">
                  <button className="attachment-picker-back" type="button" aria-label="Voltar para origens" title="Voltar" onClick={() => setAttachmentPickerView('sources')}>
                    <ArrowLeft size={13} aria-hidden="true" />
                  </button>
                  <span className="popover-title">Arquivo do workspace</span>
                </div>
                <input
                  className="popover-search"
                  type="search"
                  value={workspaceQuery}
                  placeholder="Buscar arquivos"
                  aria-label="Buscar arquivos do workspace"
                  autoFocus
                  onChange={(event) => setWorkspaceQuery(event.target.value)}
                />
                <div className="attachment-picker-list">
                  {filteredWorkspaceFiles.length > 0 ? filteredWorkspaceFiles.map((file) => (
                    <button className="popover-option" key={file} type="button" role="menuitem" onClick={() => addWorkspaceFile(file)}>
                      <FileCode2 size={12} aria-hidden="true" />
                      <span>{file}</span>
                    </button>
                  )) : <div className="attachment-picker-empty">Nenhum arquivo encontrado</div>}
                </div>
              </>
            )}
          </div>
        )}
        {mentionOpen && (
          <div className="popover mention-popover" role="listbox" aria-label="Arquivos do workspace">
            <div className="popover-title">Arquivos do workspace</div>
            {workspaceFiles.slice(0, 5).map((file) => (
              <button className="popover-option" key={file} type="button" role="option" aria-selected={false} onClick={() => addWorkspaceFile(file)}>
                <FileCode2 size={12} /><span>{file}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </form>
  )
}

