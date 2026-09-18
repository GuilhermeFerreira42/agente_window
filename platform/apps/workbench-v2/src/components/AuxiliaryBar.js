import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Check, ChevronDown, ChevronRight, CircleCheck, CircleDot, CircleX, ExternalLink, FileCode2, Files, Folder, FolderOpen, GitCompareArrows, GitPullRequest, GitMerge, ListChecks, PanelRightClose, RefreshCw, TerminalSquare, } from 'lucide-react';
import { getDiffResolution } from '../domain/sessionState';
import { DragTypes } from '../domain/dragAndDrop';
const statusLabel = {
    modified: 'M',
    added: 'A',
    deleted: 'D',
    renamed: 'R',
};
const resolutionLabel = {
    accepted: 'Aceito',
    reverted: 'Revertido',
};
const checkRows = [
    { name: 'Typecheck', status: 'success', label: 'passed' },
    { name: 'Unit tests', status: 'success', label: 'passed' },
    { name: 'Browser e2e', status: 'running', label: 'running' },
    { name: 'Accessibility', status: 'failure', label: 'failed' },
];
const fallbackFolders = [
    { name: 'browser', files: ['parts/titlebarPart.ts', 'parts/media/titlebarpart.css'] },
    { name: 'contrib', files: ['sessions/browser/views/sessionsList.ts', 'changes/browser/changesView.ts'] },
    { name: 'workbench', files: ['contrib/chat/browser/widget/media/chat.css'] },
];
function checkIcon(status) {
    if (status === 'success')
        return _jsx(CircleCheck, { size: 13, className: "ci-row-status success", "aria-hidden": "true" });
    if (status === 'failure')
        return _jsx(CircleX, { size: 13, className: "ci-row-status failure", "aria-hidden": "true" });
    if (status === 'running')
        return _jsx(CircleDot, { size: 13, className: "ci-row-status running", "aria-hidden": "true" });
    return _jsx(CircleDot, { size: 13, className: "ci-row-status pending", "aria-hidden": "true" });
}
export function AuxiliaryBar({ session, visible, diffFiles, tab, checksExpanded, expandedFolders, onChangeTab, onOpenDiff, onOpenFile, onToggleChecks, onToggleFolder, onRerunChecks, onOpenCheck, onPreparePr, onMerge, onOpenTerminal, onClose, fileSystemEntries, fileSystemRootName, fileSystemLoading, isFileSystemSupported = true, onPickDirectory, onClearDirectory, onOpenFileHandle, }) {
    if (!visible)
        return null;
    const checksBodyId = `checks-body-${session.id}`;
    const changesTabId = `aux-tab-${session.id}-changes`;
    const filesTabId = `aux-tab-${session.id}-files`;
    const panelId = `aux-panel-${session.id}`;
    const hasRealFileSystem = fileSystemEntries && fileSystemEntries.length > 0;
    return (_jsxs("aside", { className: "auxiliary-bar", "aria-label": "Barra auxiliar", children: [_jsxs("div", { className: "auxiliary-header", children: [_jsxs("div", { className: "pane-title", children: [_jsx(PanelRightClose, { size: 14 }), _jsx("span", { children: "Detalhes" }), _jsxs("span", { className: "pane-title-subtle", children: ["\u00B7 ", fileSystemRootName || session.workspace] })] }), _jsx("button", { className: "toolbar-button", type: "button", title: "Fechar barra auxiliar", "aria-label": "Fechar barra auxiliar", onClick: onClose, children: _jsx(PanelRightClose, { size: 14 }) })] }), _jsxs("div", { className: "aux-tabs", role: "tablist", "aria-label": "Detalhes da sess\u00E3o", children: [_jsxs("button", { id: changesTabId, className: `aux-tab${tab === 'changes' ? ' is-active' : ''}`, type: "button", role: "tab", "aria-selected": tab === 'changes', "aria-controls": panelId, onClick: () => onChangeTab('changes'), children: [_jsx(GitCompareArrows, { size: 12 }), _jsx("span", { className: "aux-tab-title", children: "Changes" }), _jsx("span", { "aria-label": `${diffFiles.length} arquivos alterados`, children: diffFiles.length })] }), _jsxs("button", { id: filesTabId, className: `aux-tab${tab === 'files' ? ' is-active' : ''}`, type: "button", role: "tab", "aria-selected": tab === 'files', "aria-controls": panelId, onClick: () => onChangeTab('files'), children: [_jsx(Files, { size: 12 }), _jsx("span", { className: "aux-tab-title", children: "Files" })] })] }), _jsx("div", { className: "auxiliary-body", id: panelId, role: "tabpanel", "aria-labelledby": tab === 'changes' ? changesTabId : filesTabId, tabIndex: 0, children: tab === 'changes' ? (_jsx(ChangesDetails, { diffFiles: diffFiles, checksBodyId: checksBodyId, checksExpanded: checksExpanded, onOpenDiff: onOpenDiff, onToggleChecks: onToggleChecks, onRerunChecks: onRerunChecks, onOpenCheck: onOpenCheck, onPreparePr: onPreparePr, onMerge: onMerge, onOpenTerminal: onOpenTerminal })) : (_jsx(FilesDetails, { expandedFolders: expandedFolders, onToggleFolder: onToggleFolder, onOpenFile: onOpenFile, fileSystemEntries: fileSystemEntries, fileSystemRootName: fileSystemRootName, fileSystemLoading: fileSystemLoading, isFileSystemSupported: isFileSystemSupported, onPickDirectory: onPickDirectory, onClearDirectory: onClearDirectory, onOpenFileHandle: onOpenFileHandle, hasRealFileSystem: !!hasRealFileSystem })) })] }));
}
function ChangesDetails({ diffFiles, checksBodyId, checksExpanded, onOpenDiff, onToggleChecks, onRerunChecks, onOpenCheck, onPreparePr, onMerge, onOpenTerminal, }) {
    return (_jsxs(_Fragment, { children: [_jsxs("section", { className: "auxiliary-section", children: [_jsxs("div", { className: "auxiliary-section-title", children: [_jsx(GitCompareArrows, { size: 13 }), _jsx("span", { children: "CHANGES" }), _jsx("button", { className: "text-button", type: "button", onClick: () => onOpenDiff(), children: "Revisar" })] }), _jsxs("div", { className: "changes-header-actions", children: [_jsxs("button", { className: "secondary-button", type: "button", onClick: onMerge, disabled: diffFiles.length === 0, children: [_jsx(GitMerge, { size: 13 }), "Merge"] }), _jsxs("button", { className: "secondary-button", type: "button", onClick: onOpenTerminal, children: [_jsx(TerminalSquare, { size: 13 }), "Abrir terminal"] })] }), diffFiles.length === 0 ? (_jsx("p", { className: "auxiliary-empty-state", children: "Sem altera\u00E7\u00F5es pendentes nesta sess\u00E3o." })) : diffFiles.map((file) => {
                        const resolution = getDiffResolution(file);
                        return (_jsxs("button", { className: "change-tree-row", type: "button", title: file.path, "aria-label": `Abrir diff ${file.path}`, onClick: () => onOpenDiff(file.id), children: [_jsx("span", { className: `change-decoration ${file.status}`, children: statusLabel[file.status] }), _jsx("span", { className: "change-file-name", children: file.path.split('/').pop() }), resolution && _jsx("span", { className: `change-resolution ${resolution}`, children: resolutionLabel[resolution] }), _jsxs("span", { className: "change-stats", children: [_jsxs("span", { className: "session-diff-added", children: ["+", resolution ? 0 : file.added] }), _jsxs("span", { className: "session-diff-removed", children: ["\u2212", resolution ? 0 : file.removed] })] })] }, file.id));
                    }), _jsxs("button", { className: "secondary-button auxiliary-full-width-button", type: "button", onClick: () => onOpenDiff(), children: [_jsx(GitCompareArrows, { size: 13 }), "Abrir multi-diff"] })] }), _jsxs("section", { className: "auxiliary-section ci-widget", children: [_jsxs("button", { className: `ci-header${checksExpanded ? '' : ' is-collapsed'}`, type: "button", "aria-expanded": checksExpanded, "aria-controls": checksBodyId, "aria-label": "Alternar Checks", title: "Alternar Checks", onClick: onToggleChecks, children: [checksExpanded ? _jsx(ChevronDown, { size: 13, "aria-hidden": "true" }) : _jsx(ChevronRight, { size: 13, "aria-hidden": "true" }), _jsx(ListChecks, { size: 14, "aria-hidden": "true" }), _jsx("span", { children: "Checks" }), _jsxs("span", { className: "ci-header-counts", "aria-label": "3 aprovados, 1 falha", children: [_jsx("span", { className: "ci-row-status success", children: "3" }), _jsx("span", { className: "ci-row-status failure", children: "1" })] })] }), checksExpanded && _jsxs("div", { className: "ci-list", id: checksBodyId, children: [checkRows.map((check) => (_jsxs("div", { className: "ci-row", children: [checkIcon(check.status), _jsx("span", { className: "ci-row-name", children: check.name }), _jsx("span", { className: `ci-row-status ${check.status}`, children: check.label }), (check.status === 'failure' || check.status === 'running') && _jsxs("span", { className: "ci-inline-actions", children: [_jsx("button", { className: "icon-button ci-inline-action", type: "button", title: `Executar novamente ${check.name}`, "aria-label": `Executar novamente ${check.name}`, onClick: () => onRerunChecks(check.name), children: _jsx(RefreshCw, { size: 12 }) }), _jsx("button", { className: "icon-button ci-inline-action", type: "button", title: `Abrir ${check.name} no GitHub`, "aria-label": `Abrir ${check.name} no GitHub`, onClick: () => onOpenCheck(check.name), children: _jsx(ExternalLink, { size: 12 }) })] })] }, check.name))), _jsxs("button", { className: "secondary-button auxiliary-full-width-button", type: "button", onClick: () => onRerunChecks(), children: [_jsx(RefreshCw, { size: 12 }), "Executar novamente"] })] })] }), _jsxs("section", { className: "auxiliary-section", children: [_jsxs("div", { className: "auxiliary-section-title", children: [_jsx(GitPullRequest, { size: 13 }), _jsx("span", { children: "Pull request" })] }), _jsxs("button", { className: "secondary-button auxiliary-full-width-button", type: "button", onClick: onPreparePr, children: [_jsx(GitPullRequest, { size: 13 }), "Preparar PR"] })] })] }));
}
function FilesDetails({ expandedFolders, onToggleFolder, onOpenFile, fileSystemEntries, fileSystemRootName, fileSystemLoading, isFileSystemSupported, onPickDirectory, onClearDirectory, onOpenFileHandle, hasRealFileSystem, }) {
    // Render real filesystem if available
    if (hasRealFileSystem && fileSystemEntries) {
        return (_jsxs("section", { className: "auxiliary-section", children: [_jsxs("div", { className: "auxiliary-section-title", children: [_jsx(Files, { size: 13 }), _jsx("span", { children: "Workspace Files" }), _jsxs("span", { className: "auxiliary-subtitle", children: ["\u00B7 ", fileSystemRootName] })] }), _jsxs("div", { className: "filesystem-actions", style: { display: 'flex', gap: 8, marginBottom: 12 }, children: [_jsxs("button", { className: "secondary-button", type: "button", onClick: onPickDirectory, disabled: fileSystemLoading, children: [_jsx(FolderOpen, { size: 13 }), "Trocar pasta"] }), _jsx("button", { className: "text-button", type: "button", onClick: onClearDirectory, children: "Limpar" })] }), fileSystemLoading ? (_jsx("p", { className: "auxiliary-empty-state", children: "Carregando arquivos reais..." })) : (_jsx("div", { className: "file-tree-real", children: fileSystemEntries.map((entry) => (_jsx(FileSystemTreeNode, { entry: entry, expandedFolders: expandedFolders, onToggleFolder: onToggleFolder, onOpenFile: onOpenFile, onOpenFileHandle: onOpenFileHandle, depth: 0 }, entry.path))) })), _jsxs("div", { className: "auxiliary-section-title auxiliary-subsection-title", children: [_jsx(Check, { size: 13 }), _jsx("span", { children: "Escopo" })] }), _jsx("p", { className: "auxiliary-description", children: "Arquivos reais do disco. Clique para abrir no editor." })] }));
    }
    // Fallback: show picker + mock folders if no real filesystem
    return (_jsxs("section", { className: "auxiliary-section", children: [_jsxs("div", { className: "auxiliary-section-title", children: [_jsx(Files, { size: 13 }), _jsx("span", { children: "Workspace Files" })] }), !isFileSystemSupported ? (_jsx("p", { className: "auxiliary-empty-state", children: "File System Access API n\u00E3o suportada. Use Chrome/Edge para escolher pasta real." })) : (_jsxs(_Fragment, { children: [_jsxs("button", { className: "secondary-button auxiliary-full-width-button", type: "button", onClick: onPickDirectory, style: { marginBottom: 12 }, children: [_jsx(FolderOpen, { size: 13 }), "Escolher pasta real do disco"] }), _jsx("p", { className: "auxiliary-description", style: { marginBottom: 12, fontSize: 12, color: 'var(--vscode-descriptionForeground)' }, children: "Nenhuma pasta real selecionada. Mostrando exemplo mockado. Clique acima para escolher pasta real como no v\u00EDdeo original [06:13]." })] })), fallbackFolders.map((folder) => {
                const isExpanded = expandedFolders[folder.name] ?? true;
                const childrenId = `files-${folder.name}-children`;
                return (_jsxs("div", { children: [_jsxs("button", { className: "file-tree-row file-tree-folder", type: "button", "aria-expanded": isExpanded, "aria-controls": childrenId, "aria-label": `${isExpanded ? 'Recolher' : 'Expandir'} pasta ${folder.name}`, onClick: () => onToggleFolder(folder.name), children: [isExpanded ? _jsx(ChevronDown, { size: 12, "aria-hidden": "true" }) : _jsx(ChevronRight, { size: 12, "aria-hidden": "true" }), _jsx(Files, { size: 12, "aria-hidden": "true" }), _jsx("span", { className: "file-name", children: folder.name })] }), isExpanded && _jsx("div", { className: "file-tree-children", id: childrenId, children: folder.files.map((file) => (_jsxs("button", { className: "file-tree-row file-tree-file", type: "button", title: file, "aria-label": `Abrir arquivo ${file}`, draggable: true, onDragStart: (event) => {
                                    event.dataTransfer.setData(DragTypes.FILE, file);
                                    event.dataTransfer.setData('text/plain', file);
                                    event.dataTransfer.effectAllowed = 'copy';
                                }, onClick: () => onOpenFile(file), children: [_jsx(FileCode2, { size: 12, "aria-hidden": "true" }), _jsx("span", { className: "file-name", children: file })] }, file))) })] }, folder.name));
            }), _jsxs("div", { className: "auxiliary-section-title auxiliary-subsection-title", children: [_jsx(Check, { size: 13 }), _jsx("span", { children: "Escopo" })] }), _jsx("p", { className: "auxiliary-description", children: "Arquivos e altera\u00E7\u00F5es permanecem associados \u00E0 sess\u00E3o ativa." })] }));
}
function FileSystemTreeNode({ entry, expandedFolders, onToggleFolder, onOpenFile, onOpenFileHandle, depth, }) {
    const isDir = entry.kind === 'directory';
    const isExpanded = expandedFolders[entry.path] ?? (depth < 1);
    const paddingLeft = 8 + depth * 16;
    if (isDir) {
        return (_jsxs("div", { children: [_jsxs("button", { className: "file-tree-row file-tree-folder", type: "button", "aria-expanded": isExpanded, "aria-controls": `files-${entry.path}-children`, style: { paddingLeft }, onClick: () => onToggleFolder(entry.path), children: [isExpanded ? _jsx(ChevronDown, { size: 12 }) : _jsx(ChevronRight, { size: 12 }), isExpanded ? _jsx(FolderOpen, { size: 12 }) : _jsx(Folder, { size: 12 }), _jsx("span", { className: "file-name", children: entry.name }), entry.children && _jsx("span", { className: "file-count", style: { marginLeft: 6, fontSize: 11, opacity: 0.6 }, children: entry.children.length })] }), isExpanded && entry.children && (_jsx("div", { className: "file-tree-children", id: `files-${entry.path}-children`, children: entry.children.map((child) => (_jsx(FileSystemTreeNode, { entry: child, expandedFolders: expandedFolders, onToggleFolder: onToggleFolder, onOpenFile: onOpenFile, onOpenFileHandle: onOpenFileHandle, depth: depth + 1 }, child.path))) }))] }));
    }
    return (_jsxs("button", { className: "file-tree-row file-tree-file", type: "button", title: entry.path, "aria-label": `Abrir arquivo ${entry.path}`, style: { paddingLeft }, draggable: true, onDragStart: (event) => {
            event.dataTransfer.setData(DragTypes.FILE, entry.path);
            event.dataTransfer.setData('text/plain', entry.path);
            event.dataTransfer.effectAllowed = 'copy';
        }, onClick: () => {
            if (onOpenFileHandle)
                onOpenFileHandle(entry);
            else
                onOpenFile(entry.path);
        }, children: [_jsx(FileCode2, { size: 12 }), _jsx("span", { className: "file-name", children: entry.name })] }));
}
//# sourceMappingURL=AuxiliaryBar.js.map