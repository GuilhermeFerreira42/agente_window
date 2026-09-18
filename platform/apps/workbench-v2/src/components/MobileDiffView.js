import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, X } from 'lucide-react';
import { buildUnifiedDiff, computeFileDiffViewData } from '../domain/unifiedDiff';
import { IDLE_PULLDOWN, pulldownEnd, pulldownMove, pulldownStart } from '../domain/pulldownDismiss';
export function MobileDiffView({ files, selectedFileId, onSelectFile, onClose }) {
    const index = Math.max(0, files.findIndex((file) => file.id === selectedFileId));
    const file = files[index];
    const [showList, setShowList] = useState(false);
    const hunks = useMemo(() => (file ? buildUnifiedDiff(file.original, file.modified) : []), [file]);
    const stats = useMemo(() => (file ? computeFileDiffViewData(file.original, file.modified) : null), [file]);
    // (R-049) Gesto pulldown-to-dismiss: arrastar para baixo a partir do topo do
    // overlay o dispensa (equivale à back-navigation da MobileNavigationStack).
    // Os hooks precisam ser chamados incondicionalmente (antes do early return).
    const gesture = useRef(IDLE_PULLDOWN);
    const bodyRef = useRef(null);
    const [pullOffset, setPullOffset] = useState(0);
    if (!file) {
        return (_jsxs("div", { className: "mobile-diff-view", role: "dialog", "aria-label": "Revis\u00E3o de altera\u00E7\u00F5es", children: [_jsxs("header", { className: "mobile-diff-header", children: [_jsx("button", { type: "button", className: "mobile-diff-close", "aria-label": "Fechar revis\u00E3o", onClick: onClose, children: _jsx(X, { size: 16 }) }), _jsx("span", { className: "mobile-diff-title", children: "Altera\u00E7\u00F5es" })] }), _jsxs("div", { className: "mobile-diff-empty", "data-testid": "mobile-diff-empty", children: [_jsx(FileText, { size: 22 }), _jsx("p", { children: "Esta sess\u00E3o n\u00E3o possui arquivos alterados." })] })] }));
    }
    const goPrev = () => { if (index > 0)
        onSelectFile(files[index - 1].id); };
    const goNext = () => { if (index < files.length - 1)
        onSelectFile(files[index + 1].id); };
    const onTouchStart = (event) => {
        const touch = event.touches[0];
        if (!touch)
            return;
        const scrollTop = bodyRef.current?.scrollTop ?? 0;
        gesture.current = pulldownStart(touch.clientX, touch.clientY, event.timeStamp, scrollTop);
        setPullOffset(0);
    };
    const onTouchMove = (event) => {
        const touch = event.touches[0];
        if (!touch || !gesture.current.active)
            return;
        gesture.current = pulldownMove(gesture.current, touch.clientX, touch.clientY, event.timeStamp);
        setPullOffset(gesture.current.offset);
    };
    const onTouchEnd = (event) => {
        const { dismiss, state } = pulldownEnd(gesture.current, event.timeStamp);
        gesture.current = state;
        setPullOffset(0);
        if (dismiss)
            onClose();
    };
    return (_jsxs("div", { className: `mobile-diff-view${pullOffset > 0 ? ' is-pulling' : ''}`, role: "dialog", "aria-label": "Revis\u00E3o de altera\u00E7\u00F5es", "data-pull-offset": pullOffset, style: pullOffset > 0 ? { transform: `translateY(${pullOffset}px)` } : undefined, onTouchStart: onTouchStart, onTouchMove: onTouchMove, onTouchEnd: onTouchEnd, children: [_jsx("div", { className: "mobile-diff-pull-handle", "aria-hidden": "true" }), _jsxs("header", { className: "mobile-diff-header", children: [_jsx("button", { type: "button", className: "mobile-diff-close", "aria-label": "Fechar revis\u00E3o", onClick: onClose, children: _jsx(X, { size: 16 }) }), _jsxs("button", { type: "button", className: "mobile-diff-file-button", "aria-label": "Selecionar arquivo", "aria-expanded": showList, onClick: () => setShowList((current) => !current), children: [_jsx(FileText, { size: 14 }), _jsx("span", { className: "mobile-diff-path", children: file.path })] }), _jsxs("div", { className: "mobile-diff-nav", children: [_jsx("button", { type: "button", "aria-label": "Arquivo anterior", disabled: index === 0, onClick: goPrev, children: _jsx(ChevronLeft, { size: 16 }) }), _jsxs("span", { className: "mobile-diff-counter", "aria-label": `Arquivo ${index + 1} de ${files.length}`, children: [index + 1, "/", files.length] }), _jsx("button", { type: "button", "aria-label": "Pr\u00F3ximo arquivo", disabled: index === files.length - 1, onClick: goNext, children: _jsx(ChevronRight, { size: 16 }) })] })] }), stats && (_jsxs("div", { className: "mobile-diff-stats", "aria-label": `${stats.added} adicionadas, ${stats.removed} removidas`, children: [_jsxs("span", { className: "mobile-diff-added", children: ["+", stats.added] }), _jsxs("span", { className: "mobile-diff-removed", children: ["\u2212", stats.removed] }), stats.identical && _jsx("span", { className: "mobile-diff-identical", children: "Sem altera\u00E7\u00F5es" })] })), showList && (_jsx("ul", { className: "mobile-diff-file-list", role: "listbox", "aria-label": "Arquivos alterados", children: files.map((candidate) => (_jsx("li", { role: "option", "aria-selected": candidate.id === file.id, children: _jsx("button", { type: "button", className: `mobile-diff-file-list-item${candidate.id === file.id ? ' is-active' : ''}`, onClick: () => { onSelectFile(candidate.id); setShowList(false); }, children: candidate.path }) }, candidate.id))) })), _jsx("div", { className: "mobile-diff-body", ref: bodyRef, children: hunks.map((hunk, hunkIndex) => (_jsxs("div", { className: "mobile-diff-hunk", children: [_jsxs("div", { className: "mobile-diff-hunk-header", children: ["@@ -", hunk.originalStart, " +", hunk.modifiedStart, " @@"] }), hunk.lines.map((line, lineIndex) => (_jsxs("div", { className: `mobile-diff-line is-${line.kind}`, children: [_jsx("span", { className: "mobile-diff-gutter", children: line.kind === 'added' ? '+' : line.kind === 'removed' ? '−' : ' ' }), _jsx("code", { className: "mobile-diff-content", children: line.content || '\u00a0' })] }, lineIndex)))] }, hunkIndex))) })] }));
}
//# sourceMappingURL=MobileDiffView.js.map