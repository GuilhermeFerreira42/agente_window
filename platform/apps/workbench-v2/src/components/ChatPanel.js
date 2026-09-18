import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Check, Clipboard, FileCode2, Flag, Globe2, GitBranch, GitCompareArrows, MessageCircle, MoreHorizontal, PanelRight, RotateCcw, Sparkles, ThumbsDown, ThumbsUp, } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatInput } from './ChatInput';
const modeLabels = {
    agent: 'Agente',
    edit: 'Editar',
    ask: 'Perguntar',
    plan: 'Planejar',
};
function MessageActions({ message, onCopy, onCopyAll, onCopyFinalResponse, onFeedback, onRegenerate, onReport, canRegenerate, }) {
    const [copied, setCopied] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const copiedTimer = useRef(undefined);
    // Limpa o timer de "Copiado" ao desmontar para evitar setState pós-unmount.
    useEffect(() => () => window.clearTimeout(copiedTimer.current), []);
    const copy = async () => {
        try {
            await navigator.clipboard?.writeText(message.content);
        }
        catch {
            // Clipboard is optional in a sandboxed preview.
        }
        setCopied(true);
        onCopy(message.id, 'message');
        window.clearTimeout(copiedTimer.current);
        copiedTimer.current = window.setTimeout(() => setCopied(false), 1200);
    };
    return (_jsxs("div", { className: "chat-message-toolbar", "aria-label": "A\u00E7\u00F5es da mensagem", children: [_jsx("button", { className: "message-action", type: "button", "aria-label": "Copiar", title: copied ? 'Copiado' : 'Copiar', onClick: copy, children: copied ? _jsx(Check, { size: 13 }) : _jsx(Clipboard, { size: 13 }) }), message.role === 'assistant' && _jsxs(_Fragment, { children: [canRegenerate && _jsx("button", { className: "message-action", type: "button", "aria-label": "Regenerar", title: "Regenerar resposta", disabled: message.running, onClick: () => onRegenerate(message.id), children: _jsx(RotateCcw, { size: 13 }) }), _jsx("button", { className: `message-action${message.vote === 'up' ? ' is-active' : ''}`, type: "button", "aria-label": "\u00DAtil", title: "Marcar como \u00FAtil", "aria-pressed": message.vote === 'up', onClick: () => onFeedback(message.id, 'up'), children: _jsx(ThumbsUp, { size: 13 }) }), _jsx("button", { className: `message-action${message.vote === 'down' ? ' is-active' : ''}`, type: "button", "aria-label": "N\u00E3o \u00FAtil", title: "Marcar como n\u00E3o \u00FAtil", "aria-pressed": message.vote === 'down', onClick: () => onFeedback(message.id, 'down'), children: _jsx(ThumbsDown, { size: 13 }) }), _jsx("button", { className: `message-action${message.reported ? ' is-active' : ''}`, type: "button", "aria-label": "Relatar problema", title: message.reported ? 'Problema relatado' : 'Relatar problema', "aria-pressed": message.reported === true, onClick: () => onReport(message.id), children: _jsx(Flag, { size: 13 }) }), _jsx("button", { className: "message-action", type: "button", "aria-label": "Mais a\u00E7\u00F5es", title: "Mais a\u00E7\u00F5es", "aria-haspopup": "menu", "aria-expanded": menuOpen, onClick: () => setMenuOpen((current) => !current), children: _jsx(MoreHorizontal, { size: 13 }) }), menuOpen && _jsxs("div", { className: "chat-message-action-menu", role: "menu", "aria-label": "Mais a\u00E7\u00F5es da resposta", children: [_jsx("button", { type: "button", role: "menuitem", onClick: () => { onCopyAll(); setMenuOpen(false); }, children: "Copiar tudo" }), _jsx("button", { type: "button", role: "menuitem", onClick: () => { onCopyFinalResponse(); setMenuOpen(false); }, children: "Copiar resposta final" })] })] })] }));
}
function MarkdownCode({ className, children, node: _node, onCopy, ...props }) {
    const rawCode = String(children);
    const isBlock = Boolean(className || rawCode.endsWith('\n'));
    const code = rawCode.replace(/\n$/, '');
    void _node;
    const [copied, setCopied] = useState(false);
    const copiedTimer = useRef(undefined);
    // Limpa o timer de "Copiado" ao desmontar para evitar setState pós-unmount.
    useEffect(() => () => window.clearTimeout(copiedTimer.current), []);
    if (!isBlock)
        return _jsx("code", { ...props, children: children });
    const copy = async () => {
        try {
            await navigator.clipboard?.writeText(code);
        }
        catch {
            // Clipboard is optional in a sandboxed preview.
        }
        setCopied(true);
        onCopy?.();
        window.clearTimeout(copiedTimer.current);
        copiedTimer.current = window.setTimeout(() => setCopied(false), 1200);
    };
    return (_jsxs("span", { className: "chat-code-block", children: [_jsx("button", { className: `chat-code-block-copy${copied ? ' is-copied' : ''}`, type: "button", "aria-label": "Copiar c\u00F3digo", title: copied ? 'Código copiado' : 'Copiar código', onClick: copy, children: copied ? _jsx(Check, { size: 12 }) : _jsx(Clipboard, { size: 12 }) }), _jsx("code", { className: className, ...props, children: children })] }));
}
function createMarkdownComponents(onCopy) {
    return {
        code: (props) => _jsx(MarkdownCode, { ...props, onCopy: onCopy }),
    };
}
function MessageRow({ message, onCopy, onCopyAll, onCopyFinalResponse, onFeedback, onRegenerate, onReport, canRegenerate, }) {
    return (_jsxs("article", { className: `chat-message ${message.role === 'user' ? 'is-request' : 'is-response'}${message.running ? ' is-running' : ''}${message.cancelled ? ' is-cancelled' : ''}`, tabIndex: 0, children: [_jsx("div", { className: "chat-message-header", children: _jsxs("div", { className: "chat-message-user", children: [_jsx("span", { className: "chat-avatar", "aria-hidden": "true", children: message.role === 'user' ? 'U' : _jsx(Sparkles, { size: 11 }) }), _jsx("span", { className: "chat-message-name", children: message.role === 'user' ? 'Você' : 'Agente' }), message.role === 'user' && _jsx("span", { className: "chat-message-time", children: message.time }), message.role === 'user' && message.model && _jsxs("span", { className: "chat-message-time", children: ["\u00B7 ", message.model] }), message.role === 'user' && message.mode && _jsxs("span", { className: "chat-message-time", children: ["\u00B7 ", modeLabels[message.mode] ?? message.mode] })] }) }), _jsxs("div", { className: "chat-message-body", children: [message.attachments && message.attachments.length > 0 && (_jsx("div", { className: "chat-message-attachments", role: "list", "aria-label": "Anexos enviados", children: message.attachments.map((attachment) => (_jsxs("span", { className: "chat-message-attachment", role: "listitem", "aria-label": `${attachment.name}, ${attachment.kind === 'local' ? 'arquivo local' : 'arquivo do workspace'}`, children: [_jsx(FileCode2, { size: 11, "aria-hidden": "true" }), _jsx("span", { children: attachment.name })] }, attachment.id))) })), _jsx(ReactMarkdown, { remarkPlugins: [remarkGfm], components: createMarkdownComponents(() => onCopy(message.id, 'code')), children: message.content }), message.running && _jsxs("div", { className: "chat-progress", children: [_jsx(Sparkles, { size: 13 }), _jsx("span", { children: "Trabalhando" }), _jsx("span", { className: "chat-progress-dots", children: "..." })] })] }), !message.running && (_jsxs("div", { className: "chat-message-footer", children: [_jsx(MessageActions, { message: message, onCopy: onCopy, onCopyAll: onCopyAll, onCopyFinalResponse: onCopyFinalResponse, onFeedback: onFeedback, onRegenerate: onRegenerate, onReport: onReport, canRegenerate: canRegenerate }), message.role === 'assistant' && _jsxs("span", { className: "chat-message-footer-details", children: [message.cancelled && 'Cancelada · ', message.time, message.model && ` · ${message.model}`] })] }))] }));
}
function ChatWelcome({ onPrompt }) {
    const prompts = [
        'Mostre as alterações desta sessão',
        'Abra o navegador no editor',
        'Explique o layout single-pane',
        'Revise os checks de CI',
    ];
    return (_jsxs("div", { className: "chat-welcome", children: [_jsx("div", { className: "chat-welcome-icon", children: _jsx(MessageCircle, { size: 32 }) }), _jsx("div", { className: "chat-welcome-title", children: "Como posso ajudar?" }), _jsx("p", { className: "chat-welcome-message", children: "Converse com o agente, reveja altera\u00E7\u00F5es e abra ferramentas como Browser e Search diretamente na \u00E1rea do editor." }), _jsxs("div", { className: "suggested-prompts", children: [_jsx("span", { className: "suggested-prompts-title", children: "Sugest\u00F5es" }), prompts.map((prompt) => _jsxs("button", { className: "suggested-prompt", type: "button", onClick: () => onPrompt(prompt), children: [_jsx(Sparkles, { size: 12 }), prompt] }, prompt))] })] }));
}
export function ChatPanel({ session, activeChatId, model, mode, auxiliaryVisible, onSelectChat, onChangeModel, onChangeMode, onSend, onStop, onApprove, onCopy, onCopyAll, onCopyFinalResponse, onRegenerate, onFeedback, onReport, onOpenBrowser, onOpenDiff, onToggleAuxiliary, composerDrafts, onChangeComposerDraft, composerHistory, onAppendComposerHistory, }) {
    const activeChat = session.chats.find((chat) => chat.id === activeChatId) ?? session.chats[0];
    const lastAssistantMessageId = [...activeChat.messages].reverse().find((message) => message.role === 'assistant')?.id;
    const isEmpty = activeChat.messages.length === 0;
    return (_jsxs("section", { className: "chat-pane", "aria-label": "Chat da sess\u00E3o", children: [_jsxs("div", { className: "chat-pane-header", children: [_jsxs("div", { className: "pane-title", children: [_jsx(Sparkles, { size: 14 }), _jsx("span", { children: "Chat" }), _jsxs("span", { className: "pane-title-subtle", children: ["\u00B7 ", session.workspace] }), (session.diffAdded > 0 || session.diffRemoved > 0) && (_jsxs("button", { className: "changes-pill", type: "button", title: "Abrir altera\u00E7\u00F5es da branch no editor", "aria-label": `Abrir alterações: +${session.diffAdded} −${session.diffRemoved}`, onClick: onOpenDiff, children: [_jsx(GitBranch, { size: 12, "aria-hidden": "true" }), _jsx("span", { className: "changes-pill-branch", children: session.branch }), _jsxs("span", { className: "session-diff-added", children: ["+", session.diffAdded] }), _jsxs("span", { className: "session-diff-removed", children: ["\u2212", session.diffRemoved] })] }))] }), _jsxs("div", { className: "sessions-header-actions", children: [_jsx("button", { className: "toolbar-button", type: "button", title: "Abrir navegador no editor", "aria-label": "Abrir navegador", onClick: onOpenBrowser, children: _jsx(Globe2, { size: 14 }) }), _jsx("button", { className: "toolbar-button", type: "button", title: "Revisar altera\u00E7\u00F5es", "aria-label": "Revisar altera\u00E7\u00F5es", onClick: onOpenDiff, children: _jsx(GitCompareArrows, { size: 14 }) }), _jsx("button", { className: `toolbar-button${auxiliaryVisible ? ' is-active' : ''}`, type: "button", title: "Barra auxiliar", "aria-label": "Barra auxiliar", onClick: onToggleAuxiliary, children: _jsx(PanelRight, { size: 14 }) })] })] }), session.chats.length > 1 && (_jsxs("div", { className: "chat-group-tabs", role: "tablist", "aria-label": "Chats desta sess\u00E3o", children: [session.chats.map((chat) => (_jsxs("button", { className: `chat-group-tab${chat.id === activeChat.id ? ' is-active' : ''}`, type: "button", role: "tab", "aria-selected": chat.id === activeChat.id, onClick: () => onSelectChat(chat.id), children: [_jsx(MessageCircle, { size: 12 }), _jsx("span", { className: "chat-group-tab-title", children: chat.title }), chat.status === 'needs-input' && _jsx("span", { className: "unread-dot" })] }, chat.id))), _jsx("button", { className: "chat-group-tab-add", type: "button", title: "Novo chat", "aria-label": "Novo chat", onClick: () => onSend('Inicie um novo chat contextual para esta sessão.', []), children: "+" })] })), _jsxs("div", { className: "chat-content", children: [_jsx("div", { className: "chat-messages", children: isEmpty ? _jsx(ChatWelcome, { onPrompt: (prompt) => onSend(prompt, []) }) : activeChat.messages.map((message) => (_jsx(MessageRow, { message: message, onCopy: (messageId, kind) => onCopy(activeChat.id, messageId, kind), onCopyAll: () => onCopyAll(activeChat.id), onCopyFinalResponse: () => onCopyFinalResponse(activeChat.id, message.id), onFeedback: (messageId, vote) => onFeedback(activeChat.id, messageId, vote), onRegenerate: (messageId) => onRegenerate(activeChat.id, messageId), onReport: (messageId) => onReport(activeChat.id, messageId), canRegenerate: message.id === lastAssistantMessageId }, message.id))) }), (session.approval || activeChat.approval) && (_jsxs("div", { className: "chat-approval-banner", children: [_jsx(WrenchIcon, {}), _jsx("span", { children: activeChat.approval ?? session.approval }), _jsx("button", { className: "primary-button", type: "button", onClick: () => onApprove(activeChat.id), children: "Permitir" })] })), _jsx("div", { className: "chat-composer", children: _jsx(ChatInput, { session: session, activeChat: activeChat, model: model, mode: mode, onChangeModel: onChangeModel, onChangeMode: onChangeMode, onSend: onSend, onStop: onStop, onApprove: onApprove, composerDrafts: composerDrafts, onChangeComposerDraft: onChangeComposerDraft, composerHistory: composerHistory, onAppendComposerHistory: onAppendComposerHistory }) })] })] }));
}
function WrenchIcon() {
    return _jsx(FileCode2, { size: 14, "aria-hidden": "true" });
}
//# sourceMappingURL=ChatPanel.js.map