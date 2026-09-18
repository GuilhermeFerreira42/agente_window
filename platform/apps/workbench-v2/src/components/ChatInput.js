import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, AtSign, Check, ChevronDown, FileCode2, Mic, Paperclip, Plus, Send, Square, Sparkles, X, } from 'lucide-react';
import { workspaceFiles } from '../data';
import { DragTypes } from '../domain/dragAndDrop';
const modes = [
    { id: 'agent', label: 'Agente', description: 'Descreva o que construir' },
    { id: 'edit', label: 'Editar', description: 'Descreva as alterações' },
    { id: 'ask', label: 'Perguntar', description: 'Explore e entenda o código' },
    { id: 'plan', label: 'Planejar', description: 'Descreva o plano de execução' },
];
const models = [
    { id: 'Auto', description: 'Escolher automaticamente' },
    { id: 'Claude Sonnet 4', description: 'Rápido e equilibrado' },
    { id: 'GPT-5', description: 'Raciocínio avançado' },
    { id: 'GPT-5 mini', description: 'Resposta rápida' },
];
const createEmptyDraft = () => ({ text: '', attachments: [] });
const COMPOSER_HISTORY_MAX_ENTRIES = 40;
function historyEntriesEqual(left, right) {
    if (!left || left.text !== right.text || left.model !== right.model || left.mode !== right.mode)
        return false;
    return left.attachments.length === right.attachments.length && left.attachments.every((attachment, index) => {
        const other = right.attachments[index];
        return attachment.id === other.id && attachment.name === other.name && attachment.kind === other.kind;
    });
}
function cloneHistoryEntry(entry) {
    return { ...entry, attachments: entry.attachments.map((attachment) => ({ ...attachment })) };
}
function attachmentTypeLabel(attachment) {
    return attachment.kind === 'local' ? 'arquivo local' : 'arquivo do workspace';
}
function createLocalAttachment(file) {
    // The browser does not expose a stable path. Name plus file metadata gives the
    // mock payload a deterministic identity and prevents repeated picker events from
    // adding the same file twice while still allowing a changed file to be selected.
    const identity = [file.name, file.size, file.lastModified, file.type].join(':');
    return { id: `local:${identity}`, name: file.name, kind: 'local' };
}
export function ChatInput({ session, activeChat, model, mode, onChangeModel, onChangeMode, onSend, onStop, onApprove, composerDrafts, onChangeComposerDraft, composerHistory, onAppendComposerHistory, }) {
    // Drafts are keyed by session and nested chat. This keeps an in-progress edit
    // when the user briefly changes chat, without leaking attachments to another
    // session or chat.
    const draftKey = `${session.id}:${activeChat.id}`;
    const [localDrafts, setLocalDrafts] = useState({});
    const drafts = composerDrafts ?? localDrafts;
    const draft = drafts[draftKey] ?? createEmptyDraft();
    const text = draft.text;
    const attachments = draft.attachments;
    const [localHistoryByChat, setLocalHistoryByChat] = useState({});
    const history = composerHistory?.[draftKey] ?? localHistoryByChat[draftKey] ?? [];
    const historyCursorRef = useRef({
        key: draftKey,
        index: history.length,
        overlays: new Map(),
    });
    const pendingHistoryCursorRef = useRef(null);
    const [modeOpen, setModeOpen] = useState(false);
    const [modelOpen, setModelOpen] = useState(false);
    const [modelQuery, setModelQuery] = useState('');
    const [attachmentPickerOpen, setAttachmentPickerOpen] = useState(false);
    const [attachmentPickerView, setAttachmentPickerView] = useState('sources');
    const [isFileDropTarget, setIsFileDropTarget] = useState(false);
    const [workspaceQuery, setWorkspaceQuery] = useState('');
    const [isListening, setIsListening] = useState(false);
    const fileInputRef = useRef(null);
    const speechRef = useRef(null);
    const textareaRef = useRef(null);
    const modeButtonRef = useRef(null);
    const modeWrapRef = useRef(null);
    const modeOptionRefs = useRef(new Map());
    const modelButtonRef = useRef(null);
    const modelWrapRef = useRef(null);
    const modelSearchRef = useRef(null);
    const modelOptionRefs = useRef(new Map());
    const chipRefs = useRef(new Map());
    const submitLockRef = useRef(false);
    const isWorking = session.status === 'working' || activeChat.status === 'working';
    const wasWorkingRef = useRef(isWorking);
    const needsInput = Boolean(session.approval || activeChat.approval || session.status === 'needs-input');
    const hasSendableContent = Boolean(text.trim() || attachments.length > 0);
    const currentMode = modes.find((item) => item.id === mode);
    const inputPlaceholder = isWorking
        ? 'Aguarde enquanto o agente trabalha…'
        : currentMode?.description ?? `Pergunte a ${session.workspace}…`;
    const mentionOpen = /(^|\s)@[^\s]*$/.test(text);
    const contextPercent = Math.min(92, 18 + Math.round(text.length / 9) + attachments.length * 4);
    const normalizedWorkspaceQuery = workspaceQuery.trim().toLocaleLowerCase();
    const filteredWorkspaceFiles = workspaceFiles.filter((file) => file.toLocaleLowerCase().includes(normalizedWorkspaceQuery)).slice(0, 8);
    const normalizedModelQuery = modelQuery.trim().toLocaleLowerCase();
    const filteredModels = models.filter((item) => `${item.id} ${item.description}`.toLocaleLowerCase().includes(normalizedModelQuery));
    const updateDraft = (updater) => {
        if (onChangeComposerDraft) {
            onChangeComposerDraft(draftKey, updater);
            return;
        }
        setLocalDrafts((currentDrafts) => {
            const current = currentDrafts[draftKey] ?? createEmptyDraft();
            return { ...currentDrafts, [draftKey]: updater(current) };
        });
    };
    const setDraftText = (value) => {
        updateDraft((current) => ({
            ...current,
            text: typeof value === 'function' ? value(current.text) : value,
        }));
    };
    const setDraftAttachments = (value) => {
        updateDraft((current) => ({
            ...current,
            attachments: typeof value === 'function' ? value(current.attachments) : value,
        }));
    };
    const getCurrentHistoryEntry = () => ({
        text,
        attachments: attachments.map((attachment) => ({ ...attachment })),
        model,
        mode,
    });
    const appendHistoryEntry = (entry) => {
        const currentHistory = history;
        const nextHistory = historyEntriesEqual(currentHistory[currentHistory.length - 1], entry)
            ? currentHistory
            : [...currentHistory, cloneHistoryEntry(entry)].slice(-COMPOSER_HISTORY_MAX_ENTRIES);
        if (onAppendComposerHistory) {
            onAppendComposerHistory(draftKey, cloneHistoryEntry(entry));
        }
        else {
            setLocalHistoryByChat((current) => ({ ...current, [draftKey]: nextHistory }));
        }
        historyCursorRef.current = {
            key: draftKey,
            index: nextHistory.length,
            overlays: new Map(),
        };
    };
    const restoreHistoryEntry = (entry, direction) => {
        const nextEntry = entry ? cloneHistoryEntry(entry) : createEmptyDraft();
        updateDraft(() => ({ text: nextEntry.text, attachments: nextEntry.attachments }));
        if (entry?.mode && entry.mode !== mode)
            onChangeMode(entry.mode);
        if (entry?.model && entry.model !== model)
            onChangeModel(entry.model);
        pendingHistoryCursorRef.current = direction === 'previous' ? 'start' : 'end';
    };
    const navigateHistory = (direction) => {
        const cursor = historyCursorRef.current;
        if (cursor.key !== draftKey) {
            cursor.key = draftKey;
            cursor.index = history.length;
            cursor.overlays.clear();
        }
        if (direction === 'previous' && cursor.index === 0)
            return;
        if (direction === 'next' && cursor.index >= history.length)
            return;
        const currentEntry = getCurrentHistoryEntry();
        if (currentEntry.text || currentEntry.attachments.length > 0) {
            cursor.overlays.set(cursor.index, currentEntry);
        }
        cursor.index = direction === 'previous'
            ? Math.max(cursor.index - 1, 0)
            : Math.min(cursor.index + 1, history.length);
        restoreHistoryEntry(cursor.overlays.get(cursor.index) ?? history[cursor.index], direction);
    };
    useEffect(() => () => speechRef.current?.stop(), []);
    // A picker belongs to the active composer target, but the draft itself is
    // retained in the keyed store when changing session or nested chat.
    useEffect(() => {
        setAttachmentPickerOpen(false);
        setAttachmentPickerView('sources');
        setWorkspaceQuery('');
        setModeOpen(false);
        setModelOpen(false);
        setModelQuery('');
        submitLockRef.current = false;
        historyCursorRef.current = { key: draftKey, index: history.length, overlays: new Map() };
        pendingHistoryCursorRef.current = null;
    }, [draftKey, history.length]);
    useEffect(() => {
        if (!modeOpen)
            return;
        modeOptionRefs.current.get(mode)?.focus();
        const handleOutsidePointerDown = (event) => {
            if (!modeWrapRef.current?.contains(event.target))
                setModeOpen(false);
        };
        document.addEventListener('pointerdown', handleOutsidePointerDown, true);
        return () => document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
    }, [modeOpen, mode]);
    useEffect(() => {
        if (!modelOpen)
            return;
        modelSearchRef.current?.focus();
        const handleOutsidePointerDown = (event) => {
            if (!modelWrapRef.current?.contains(event.target))
                setModelOpen(false);
        };
        document.addEventListener('pointerdown', handleOutsidePointerDown, true);
        return () => document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
    }, [modelOpen]);
    // The workbench editor grows with its content and clamps at a maximum height.
    // Keep the textarea equivalent while retaining native scrolling for long drafts.
    useLayoutEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea)
            return;
        textarea.style.height = 'auto';
        const contentHeight = textarea.scrollHeight;
        const nextHeight = Math.min(200, Math.max(50, contentHeight));
        textarea.style.height = `${nextHeight}px`;
        textarea.style.overflowY = contentHeight > 200 ? 'auto' : 'hidden';
        const cursor = pendingHistoryCursorRef.current;
        if (cursor) {
            const position = cursor === 'start' ? 0 : textarea.value.length;
            textarea.setSelectionRange(position, position);
            pendingHistoryCursorRef.current = null;
        }
    }, [text]);
    // A submit clears the draft before the parent necessarily publishes its working
    // state. This lock closes that small event-window without preventing a fresh
    // draft after a mocked callback or after the request completes.
    useEffect(() => {
        if (isWorking) {
            wasWorkingRef.current = true;
            return;
        }
        if (wasWorkingRef.current || !hasSendableContent) {
            submitLockRef.current = false;
            wasWorkingRef.current = false;
        }
    }, [hasSendableContent, isWorking]);
    const closeAttachmentPicker = () => {
        setAttachmentPickerOpen(false);
        setAttachmentPickerView('sources');
        setWorkspaceQuery('');
    };
    const openAttachmentPicker = () => {
        setAttachmentPickerView('sources');
        setWorkspaceQuery('');
        setAttachmentPickerOpen((current) => !current);
        setModeOpen(false);
        setModelOpen(false);
    };
    const chooseLocalFiles = () => {
        closeAttachmentPicker();
        fileInputRef.current?.click();
    };
    const submit = (event) => {
        event?.preventDefault();
        if (!hasSendableContent || isWorking || submitLockRef.current)
            return;
        submitLockRef.current = true;
        appendHistoryEntry(getCurrentHistoryEntry());
        onSend(text.trim(), attachments.map((attachment) => ({ ...attachment })));
        updateDraft(() => createEmptyDraft());
    };
    const addWorkspaceFile = (path) => {
        const name = path.split('/').pop() ?? path;
        const attachment = { id: `workspace:${path}`, name, kind: 'workspace' };
        setDraftAttachments((current) => current.some((item) => item.id === attachment.id) ? current : [...current, attachment]);
        setDraftText((current) => current.replace(/(^|\s)@[^\s]*$/, '$1'));
        closeAttachmentPicker();
        textareaRef.current?.focus();
    };
    // (E3) Alvo de soltar: um arquivo arrastado da árvore do workspace vira anexo
    // do rascunho ativo. O gate lê o mime `DragTypes.FILE` durante o dragover.
    const dragEventHasFile = (event) => Array.from(event.dataTransfer.types).includes(DragTypes.FILE);
    const handleComposerDragOver = (event) => {
        if (!dragEventHasFile(event))
            return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        if (!isFileDropTarget)
            setIsFileDropTarget(true);
    };
    const handleComposerDragLeave = (event) => {
        // Só limpa quando o ponteiro sai de fato do container (não ao cruzar filhos).
        if (event.currentTarget.contains(event.relatedTarget))
            return;
        setIsFileDropTarget(false);
    };
    const handleComposerDrop = (event) => {
        const path = event.dataTransfer.getData(DragTypes.FILE);
        setIsFileDropTarget(false);
        if (!path)
            return;
        event.preventDefault();
        addWorkspaceFile(path);
    };
    const removeAttachment = (id) => {
        const index = attachments.findIndex((attachment) => attachment.id === id);
        if (index < 0)
            return;
        const nextFocusId = attachments[index + 1]?.id ?? attachments[index - 1]?.id;
        setDraftAttachments((current) => current.filter((attachment) => attachment.id !== id));
        if (nextFocusId) {
            chipRefs.current.get(nextFocusId)?.focus();
        }
        else {
            textareaRef.current?.focus();
        }
    };
    const handleAttachmentChipKeyDown = (id, event) => {
        if (event.key === 'Backspace' || event.key === 'Delete') {
            event.preventDefault();
            removeAttachment(id);
            return;
        }
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
            return;
        const index = attachments.findIndex((attachment) => attachment.id === id);
        if (index < 0)
            return;
        const nextIndex = index + (event.key === 'ArrowRight' ? 1 : -1);
        const nextAttachment = attachments[nextIndex];
        if (!nextAttachment)
            return;
        event.preventDefault();
        chipRefs.current.get(nextAttachment.id)?.focus();
    };
    const selectMode = (nextMode) => {
        onChangeMode(nextMode);
        setModeOpen(false);
        modeButtonRef.current?.focus();
    };
    const handleModeMenuKeyDown = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            setModeOpen(false);
            modeButtonRef.current?.focus();
            return;
        }
        const direction = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
        if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            const nextMode = event.key === 'Home' ? modes[0] : modes[modes.length - 1];
            modeOptionRefs.current.get(nextMode.id)?.focus();
            return;
        }
        if (!direction)
            return;
        event.preventDefault();
        const focusedIndex = modes.findIndex((item) => modeOptionRefs.current.get(item.id) === document.activeElement);
        const nextIndex = focusedIndex < 0 ? (direction > 0 ? 0 : modes.length - 1) : Math.min(modes.length - 1, Math.max(0, focusedIndex + direction));
        modeOptionRefs.current.get(modes[nextIndex].id)?.focus();
    };
    const selectModel = (nextModel) => {
        onChangeModel(nextModel);
        setModelOpen(false);
        setModelQuery('');
        modelButtonRef.current?.focus();
    };
    const handleModelMenuKeyDown = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            setModelOpen(false);
            setModelQuery('');
            modelButtonRef.current?.focus();
            return;
        }
        if (filteredModels.length === 0)
            return;
        if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            const nextModel = event.key === 'Home' ? filteredModels[0] : filteredModels[filteredModels.length - 1];
            modelOptionRefs.current.get(nextModel.id)?.focus();
            return;
        }
        const direction = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
        if (!direction)
            return;
        event.preventDefault();
        const focusedIndex = filteredModels.findIndex((item) => modelOptionRefs.current.get(item.id) === document.activeElement);
        const selectedIndex = filteredModels.findIndex((item) => item.id === model);
        const startingIndex = selectedIndex >= 0 ? selectedIndex : direction > 0 ? 0 : filteredModels.length - 1;
        const nextIndex = focusedIndex < 0
            ? startingIndex
            : Math.min(filteredModels.length - 1, Math.max(0, focusedIndex + direction));
        modelOptionRefs.current.get(filteredModels[nextIndex].id)?.focus();
    };
    const startVoice = () => {
        const speechWindow = window;
        const Constructor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
        if (!Constructor) {
            setDraftText((current) => `${current}${current ? ' ' : ''}Descreva a alteração que você quer revisar.`);
            return;
        }
        if (isListening) {
            speechRef.current?.stop();
            setIsListening(false);
            return;
        }
        const recognition = new Constructor();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'pt-BR';
        recognition.onresult = (event) => {
            const transcript = event.results[0]?.[0]?.transcript ?? '';
            setDraftText((current) => `${current}${current ? ' ' : ''}${transcript}`);
        };
        recognition.onend = () => setIsListening(false);
        speechRef.current = recognition;
        setIsListening(true);
        recognition.start();
    };
    const handleComposerKeyDown = (event) => {
        // Mirrors CancelAction's Ctrl/Cmd+Escape binding. The Windows workbench
        // also exposes Alt+Backspace; keeping both here makes cancellation work
        // regardless of which composer control currently owns focus.
        const isPrimaryCancel = (event.ctrlKey || event.metaKey) && event.key === 'Escape';
        const isWindowsCancel = event.altKey && event.key === 'Backspace';
        if (!isWorking || (!isPrimaryCancel && !isWindowsCancel))
            return;
        event.preventDefault();
        event.stopPropagation();
        onStop();
    };
    return (_jsxs("form", { className: "chat-input-stack", onSubmit: submit, onKeyDown: handleComposerKeyDown, children: [needsInput && (_jsxs("div", { className: "input-stack-banner is-warning", children: [_jsx(Sparkles, { size: 13 }), _jsx("span", { children: activeChat.approval ?? session.approval ?? 'Esta sessão está aguardando sua aprovação.' }), _jsx("button", { className: "primary-button", type: "button", onClick: () => onApprove(activeChat.id), children: "Permitir" })] })), _jsxs("div", { className: `chat-input-container${isWorking ? ' is-working' : ''}${needsInput ? ' has-stack-banner' : ''}${isFileDropTarget ? ' is-drop-target' : ''}`, "aria-busy": isWorking, onDragOver: handleComposerDragOver, onDragLeave: handleComposerDragLeave, onDrop: handleComposerDrop, children: [isFileDropTarget && _jsx("div", { className: "chat-input-dropzone", "aria-hidden": "true", children: "Solte para anexar ao chat" }), _jsx("div", { className: "chat-input-editor-row", children: _jsx("textarea", { ref: textareaRef, className: "chat-input-textarea", rows: 1, value: text, onChange: (event) => setDraftText(event.target.value), placeholder: inputPlaceholder, "aria-label": "Mensagem para o agente", "aria-keyshortcuts": "Enter Control+Enter Meta+Enter ArrowUp ArrowDown Control+/ Meta+/", enterKeyHint: "send", onKeyDown: (event) => {
                                const atStart = event.currentTarget.selectionStart === 0 && event.currentTarget.selectionEnd === 0;
                                const atEnd = event.currentTarget.selectionStart === event.currentTarget.value.length && event.currentTarget.selectionEnd === event.currentTarget.value.length;
                                if (event.key === 'ArrowUp' && atStart && history.length > 0) {
                                    event.preventDefault();
                                    navigateHistory('previous');
                                    return;
                                }
                                if (event.key === 'ArrowDown' && atEnd && history.length > 0) {
                                    event.preventDefault();
                                    navigateHistory('next');
                                    return;
                                }
                                if ((event.ctrlKey || event.metaKey) && event.key === '/') {
                                    event.preventDefault();
                                    openAttachmentPicker();
                                    return;
                                }
                                // Chat submits with Enter, Ctrl/Cmd+Enter, or the send button.
                                // Shift+Enter remains available for a multiline draft, and an
                                // active IME composition must not be interrupted.
                                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                                    event.preventDefault();
                                    submit();
                                }
                            } }) }), attachments.length > 0 && (_jsx("div", { className: "attachments-row", role: "list", "aria-label": "Arquivos anexados", children: attachments.map((attachment) => (_jsxs("span", { className: "attachment-chip", role: "group", tabIndex: 0, ref: (element) => {
                                if (element)
                                    chipRefs.current.set(attachment.id, element);
                                else
                                    chipRefs.current.delete(attachment.id);
                            }, "aria-label": `${attachment.name}, ${attachmentTypeLabel(attachment)}. Pressione Delete para remover.`, title: `${attachment.name} · ${attachmentTypeLabel(attachment)}`, onKeyDown: (event) => handleAttachmentChipKeyDown(attachment.id, event), children: [_jsx(FileCode2, { size: 11, "aria-hidden": "true" }), _jsx("span", { className: "attachment-chip-name", children: attachment.name }), _jsx("span", { className: "attachment-chip-kind", "aria-hidden": "true", children: attachment.kind === 'local' ? 'local' : 'workspace' }), _jsx("button", { className: "attachment-remove", type: "button", tabIndex: -1, "aria-label": `Remover ${attachment.name}`, title: `Remover ${attachment.name}`, onClick: () => removeAttachment(attachment.id), children: _jsx(X, { size: 11, "aria-hidden": "true" }) })] }, attachment.id))) })), _jsxs("div", { className: "chat-input-bottom-row", children: [_jsxs("div", { className: "input-mode-wrap", ref: modeWrapRef, children: [_jsxs("button", { ref: modeButtonRef, className: `input-mode-button${modeOpen ? ' is-open' : ''}`, type: "button", onClick: () => { setModeOpen((current) => !current); setModelOpen(false); }, "aria-haspopup": "menu", "aria-expanded": modeOpen, onKeyDown: (event) => {
                                            if (event.key === 'Escape' && modeOpen) {
                                                event.preventDefault();
                                                setModeOpen(false);
                                            }
                                        }, children: [_jsx(Sparkles, { size: 12 }), _jsx("span", { children: modes.find((item) => item.id === mode)?.label ?? 'Agente' }), _jsx(ChevronDown, { size: 11 })] }), modeOpen && (_jsx("div", { className: "popover mode-popover", role: "menu", "aria-label": "Selecionar modo", onKeyDown: handleModeMenuKeyDown, children: modes.map((item) => (_jsxs("button", { className: `popover-option${item.id === mode ? ' is-selected' : ''}`, type: "button", "aria-pressed": item.id === mode, tabIndex: item.id === mode ? 0 : -1, ref: (element) => {
                                                if (element)
                                                    modeOptionRefs.current.set(item.id, element);
                                                else
                                                    modeOptionRefs.current.delete(item.id);
                                            }, onClick: () => selectMode(item.id), children: [_jsx(Sparkles, { size: 12, "aria-hidden": "true" }), _jsx("span", { children: item.label }), _jsx("span", { className: "popover-option-description", children: item.description }), item.id === mode && _jsx(Check, { size: 12, "aria-hidden": "true" })] }, item.id))) }))] }), _jsx("button", { className: `chat-input-tool-button${attachmentPickerOpen ? ' is-active' : ''}`, type: "button", title: "Adicionar contexto", "aria-label": "Anexar arquivo", "aria-haspopup": "menu", "aria-expanded": attachmentPickerOpen, "aria-keyshortcuts": "Control+/ Meta+/", onClick: openAttachmentPicker, onKeyDown: (event) => {
                                    if (event.key === 'Escape' && attachmentPickerOpen) {
                                        event.preventDefault();
                                        closeAttachmentPicker();
                                    }
                                }, children: _jsx(Paperclip, { size: 14 }) }), _jsx("input", { ref: fileInputRef, type: "file", multiple: true, hidden: true, onChange: (event) => {
                                    const files = Array.from(event.target.files ?? []);
                                    setDraftAttachments((current) => {
                                        const next = [...current];
                                        for (const file of files) {
                                            const attachment = createLocalAttachment(file);
                                            if (!next.some((item) => item.id === attachment.id))
                                                next.push(attachment);
                                        }
                                        return next;
                                    });
                                    event.target.value = '';
                                    textareaRef.current?.focus();
                                } }), _jsx("button", { className: "chat-input-tool-button", type: "button", title: "Inserir men\u00E7\u00E3o", "aria-label": "Inserir men\u00E7\u00E3o", onClick: () => setDraftText((current) => `${current}${current ? ' ' : ''}@`), children: _jsx(AtSign, { size: 14 }) }), _jsx("button", { className: `chat-input-tool-button${isListening ? ' is-active' : ''}`, type: "button", title: "Ditado por voz", "aria-label": "Ditado por voz", onClick: startVoice, children: _jsx(Mic, { size: 14 }) }), _jsx("div", { className: "input-toolbar-spacer" }), _jsxs("div", { className: "context-usage", title: `${contextPercent}% do contexto utilizado`, children: [_jsxs("span", { children: [contextPercent, "%"] }), _jsx("span", { className: "context-usage-meter", children: _jsx("span", { style: { width: `${contextPercent}%` } }) })] }), _jsxs("div", { className: "model-picker-wrap", ref: modelWrapRef, children: [_jsxs("button", { ref: modelButtonRef, className: `input-mode-button${modelOpen ? ' is-open' : ''}`, type: "button", title: "Selecionar modelo", onClick: () => { setModelOpen((current) => !current); setModeOpen(false); }, "aria-haspopup": "menu", "aria-expanded": modelOpen, onKeyDown: (event) => {
                                            if (event.key === 'Escape' && modelOpen) {
                                                event.preventDefault();
                                                setModelOpen(false);
                                                setModelQuery('');
                                            }
                                        }, children: [_jsx("span", { children: model }), _jsx(ChevronDown, { size: 11 })] }), modelOpen && (_jsxs("div", { className: "popover model-popover", role: "menu", "aria-label": "Selecionar modelo", onKeyDown: handleModelMenuKeyDown, children: [_jsx("div", { className: "popover-title", children: "Modelos" }), _jsx("input", { ref: modelSearchRef, className: "popover-search model-popover-search", type: "search", value: modelQuery, placeholder: "Buscar modelos", "aria-label": "Buscar modelos", onChange: (event) => setModelQuery(event.target.value) }), _jsx("div", { className: "model-picker-list", children: filteredModels.length > 0 ? filteredModels.map((item) => (_jsxs("button", { className: `popover-option${item.id === model ? ' is-selected' : ''}`, type: "button", "aria-pressed": item.id === model, tabIndex: item.id === model ? 0 : -1, ref: (element) => {
                                                        if (element)
                                                            modelOptionRefs.current.set(item.id, element);
                                                        else
                                                            modelOptionRefs.current.delete(item.id);
                                                    }, onClick: () => selectModel(item.id), children: [_jsx(Sparkles, { size: 12, "aria-hidden": "true" }), _jsx("span", { children: item.id }), _jsx("span", { className: "popover-option-description", children: item.description }), item.id === model && _jsx(Check, { size: 12, "aria-hidden": "true" })] }, item.id))) : _jsx("div", { className: "model-picker-empty", children: "Nenhum modelo encontrado" }) })] }))] }), _jsx("button", { className: `send-button${isWorking ? ' is-stop' : ''}`, type: isWorking ? 'button' : 'submit', "aria-label": isWorking ? 'Parar execução' : 'Enviar mensagem', title: isWorking ? 'Parar execução' : 'Enviar', "aria-keyshortcuts": isWorking ? 'Control+Escape Meta+Escape Alt+Backspace' : undefined, disabled: !isWorking && !hasSendableContent, onClick: isWorking ? onStop : undefined, children: isWorking ? _jsx(Square, { size: 11, fill: "currentColor" }) : hasSendableContent ? _jsx(Send, { size: 12 }) : _jsx(Plus, { size: 13 }) })] }), attachmentPickerOpen && (_jsx("div", { className: "popover attachment-picker-popover", role: "menu", "aria-label": "Adicionar contexto", onKeyDown: (event) => {
                            if (event.key === 'Escape') {
                                event.preventDefault();
                                closeAttachmentPicker();
                            }
                        }, children: attachmentPickerView === 'sources' ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "popover-title", children: "Adicionar contexto" }), _jsxs("button", { className: "popover-option", type: "button", role: "menuitem", onClick: chooseLocalFiles, children: [_jsx(Paperclip, { size: 12, "aria-hidden": "true" }), _jsx("span", { children: "Arquivo local" }), _jsx("span", { className: "popover-option-description", children: "Escolher do computador" })] }), _jsxs("button", { className: "popover-option", type: "button", role: "menuitem", onClick: () => { setAttachmentPickerView('workspace'); setWorkspaceQuery(''); }, children: [_jsx(FileCode2, { size: 12, "aria-hidden": "true" }), _jsx("span", { children: "Arquivo do workspace" }), _jsx("span", { className: "popover-option-description", children: "Pesquisar arquivos" })] })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "attachment-picker-heading", children: [_jsx("button", { className: "attachment-picker-back", type: "button", "aria-label": "Voltar para origens", title: "Voltar", onClick: () => setAttachmentPickerView('sources'), children: _jsx(ArrowLeft, { size: 13, "aria-hidden": "true" }) }), _jsx("span", { className: "popover-title", children: "Arquivo do workspace" })] }), _jsx("input", { className: "popover-search", type: "search", value: workspaceQuery, placeholder: "Buscar arquivos", "aria-label": "Buscar arquivos do workspace", autoFocus: true, onChange: (event) => setWorkspaceQuery(event.target.value) }), _jsx("div", { className: "attachment-picker-list", children: filteredWorkspaceFiles.length > 0 ? filteredWorkspaceFiles.map((file) => (_jsxs("button", { className: "popover-option", type: "button", role: "menuitem", onClick: () => addWorkspaceFile(file), children: [_jsx(FileCode2, { size: 12, "aria-hidden": "true" }), _jsx("span", { children: file })] }, file))) : _jsx("div", { className: "attachment-picker-empty", children: "Nenhum arquivo encontrado" }) })] })) })), mentionOpen && (_jsxs("div", { className: "popover mention-popover", role: "listbox", "aria-label": "Arquivos do workspace", children: [_jsx("div", { className: "popover-title", children: "Arquivos do workspace" }), workspaceFiles.slice(0, 5).map((file) => (_jsxs("button", { className: "popover-option", type: "button", role: "option", "aria-selected": false, onClick: () => addWorkspaceFile(file), children: [_jsx(FileCode2, { size: 12 }), _jsx("span", { children: file })] }, file)))] }))] })] }));
}
//# sourceMappingURL=ChatInput.js.map