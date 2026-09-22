import {
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleDot,
  CircleX,
  ExternalLink,
  FileCode2,
  Files,
  Folder,
  FolderOpen,
  GitCompareArrows,
  GitPullRequest,
  GitMerge,
  ListChecks,
  PanelRightClose,
  RefreshCw,
  TerminalSquare,
} from 'lucide-react'
import type { DiffFile, Session } from '../types'
import { getDiffResolution } from '../domain/sessionState'
import { DragTypes } from '../domain/dragAndDrop'
import type { FileSystemEntry } from '../domain/fileSystem'

type FolderExpansionState = Readonly<Record<string, boolean>>

type CheckStatus = 'success' | 'failure' | 'running' | 'pending'

interface AuxiliaryBarProps {
  session: Session
  visible: boolean
  /** FATIA-04 (4.4): quando presente, a aba "Files" renderiza ESTE slot
   *  (o módulo explorer-search real) em vez do FilesDetails demonstrativo. */
  filesSlot?: import('react').ReactNode
  diffFiles: DiffFile[]
  tab: 'changes' | 'files'
  checksExpanded: boolean
  expandedFolders: FolderExpansionState
  onChangeTab: (tab: 'changes' | 'files') => void
  onOpenDiff: (fileId?: string) => void
  onOpenFile: (path: string) => void
  onToggleChecks: () => void
  onToggleFolder: (folderName: string) => void
  onRerunChecks: (checkName?: string) => void
  onOpenCheck: (checkName: string) => void
  onPreparePr: () => void
  onMerge: () => void
  onOpenTerminal: () => void
  onClose: () => void
  // FileSystem real (opcional para compatibilidade, mas quando presente usa real)
  fileSystemEntries?: FileSystemEntry[]
  fileSystemRootName?: string
  fileSystemLoading?: boolean
  isFileSystemSupported?: boolean
  onPickDirectory?: () => void
  onClearDirectory?: () => void
  onOpenFileHandle?: (entry: FileSystemEntry) => void
}

const statusLabel = {
  modified: 'M',
  added: 'A',
  deleted: 'D',
  renamed: 'R',
} as const

const resolutionLabel = {
  accepted: 'Aceito',
  reverted: 'Revertido',
} as const

const checkRows: Array<{ name: string; status: CheckStatus; label: string }> = [
  { name: 'Typecheck', status: 'success', label: 'passed' },
  { name: 'Unit tests', status: 'success', label: 'passed' },
  { name: 'Browser e2e', status: 'running', label: 'running' },
  { name: 'Accessibility', status: 'failure', label: 'failed' },
]

const fallbackFolders = [
  { name: 'browser', files: ['parts/titlebarPart.ts', 'parts/media/titlebarpart.css'] },
  { name: 'contrib', files: ['sessions/browser/views/sessionsList.ts', 'changes/browser/changesView.ts'] },
  { name: 'workbench', files: ['contrib/chat/browser/widget/media/chat.css'] },
]

function checkIcon(status: CheckStatus) {
  if (status === 'success') return <CircleCheck size={13} className="ci-row-status success" aria-hidden="true" />
  if (status === 'failure') return <CircleX size={13} className="ci-row-status failure" aria-hidden="true" />
  if (status === 'running') return <CircleDot size={13} className="ci-row-status running" aria-hidden="true" />
  return <CircleDot size={13} className="ci-row-status pending" aria-hidden="true" />
}

export function AuxiliaryBar({
  session,
  visible,
  diffFiles,
  tab,
  checksExpanded,
  expandedFolders,
  onChangeTab,
  onOpenDiff,
  onOpenFile,
  onToggleChecks,
  onToggleFolder,
  onRerunChecks,
  onOpenCheck,
  onPreparePr,
  onMerge,
  onOpenTerminal,
  onClose,
  fileSystemEntries,
  fileSystemRootName,
  fileSystemLoading,
  isFileSystemSupported = true,
  onPickDirectory,
  onClearDirectory,
  onOpenFileHandle,
  filesSlot,
}: AuxiliaryBarProps) {
  if (!visible) return null

  const checksBodyId = `checks-body-${session.id}`
  const changesTabId = `aux-tab-${session.id}-changes`
  const filesTabId = `aux-tab-${session.id}-files`
  const panelId = `aux-panel-${session.id}`

  const hasRealFileSystem = fileSystemEntries && fileSystemEntries.length > 0

  return (
    <aside className="auxiliary-bar" aria-label="Barra auxiliar">
      <div className="auxiliary-header">
        <div className="pane-title"><PanelRightClose size={14} /><span>Detalhes</span><span className="pane-title-subtle">· {fileSystemRootName || session.workspace}</span></div>
        <button className="toolbar-button" type="button" title="Fechar barra auxiliar" aria-label="Fechar barra auxiliar" onClick={onClose}><PanelRightClose size={14} /></button>
      </div>
      <div className="aux-tabs" role="tablist" aria-label="Detalhes da sessão">
        <button id={changesTabId} className={`aux-tab${tab === 'changes' ? ' is-active' : ''}`} type="button" role="tab" aria-selected={tab === 'changes'} aria-controls={panelId} onClick={() => onChangeTab('changes')}><GitCompareArrows size={12} /><span className="aux-tab-title">Changes</span><span aria-label={`${diffFiles.length} arquivos alterados`}>{diffFiles.length}</span></button>
        <button id={filesTabId} className={`aux-tab${tab === 'files' ? ' is-active' : ''}`} type="button" role="tab" aria-selected={tab === 'files'} aria-controls={panelId} onClick={() => onChangeTab('files')}><Files size={12} /><span className="aux-tab-title">Files</span></button>
      </div>
      <div className="auxiliary-body" id={panelId} role="tabpanel" aria-labelledby={tab === 'changes' ? changesTabId : filesTabId} tabIndex={0}>
        {tab === 'changes' ? (
          <ChangesDetails
            diffFiles={diffFiles}
            checksBodyId={checksBodyId}
            checksExpanded={checksExpanded}
            onOpenDiff={onOpenDiff}
            onToggleChecks={onToggleChecks}
            onRerunChecks={onRerunChecks}
            onOpenCheck={onOpenCheck}
            onPreparePr={onPreparePr}
            onMerge={onMerge}
            onOpenTerminal={onOpenTerminal}
          />
        ) : filesSlot ? (
          // FATIA-04 (4.4): módulo explorer-search real no slot da aba Files.
          filesSlot
        ) : (
          <FilesDetails
            expandedFolders={expandedFolders}
            onToggleFolder={onToggleFolder}
            onOpenFile={onOpenFile}
            fileSystemEntries={fileSystemEntries}
            fileSystemRootName={fileSystemRootName}
            fileSystemLoading={fileSystemLoading}
            isFileSystemSupported={isFileSystemSupported}
            onPickDirectory={onPickDirectory}
            onClearDirectory={onClearDirectory}
            onOpenFileHandle={onOpenFileHandle}
            hasRealFileSystem={!!hasRealFileSystem}
          />
        )}
      </div>
    </aside>
  )
}

function ChangesDetails({
  diffFiles,
  checksBodyId,
  checksExpanded,
  onOpenDiff,
  onToggleChecks,
  onRerunChecks,
  onOpenCheck,
  onPreparePr,
  onMerge,
  onOpenTerminal,
}: {
  diffFiles: DiffFile[]
  checksBodyId: string
  checksExpanded: boolean
  onOpenDiff: (fileId?: string) => void
  onToggleChecks: () => void
  onRerunChecks: (checkName?: string) => void
  onOpenCheck: (checkName: string) => void
  onPreparePr: () => void
  onMerge: () => void
  onOpenTerminal: () => void
}) {
  return (
    <>
      <section className="auxiliary-section">
        <div className="auxiliary-section-title"><GitCompareArrows size={13} /><span>CHANGES</span><button className="text-button" type="button" onClick={() => onOpenDiff()}>Revisar</button></div>
        <div className="changes-header-actions">
          <button className="secondary-button" type="button" onClick={onMerge} disabled={diffFiles.length === 0}><GitMerge size={13} />Merge</button>
          <button className="secondary-button" type="button" onClick={onOpenTerminal}><TerminalSquare size={13} />Abrir terminal</button>
        </div>
        {diffFiles.length === 0 ? (
          <p className="auxiliary-empty-state">Sem alterações pendentes nesta sessão.</p>
        ) : diffFiles.map((file) => {
          const resolution = getDiffResolution(file)
          return (
            <button className="change-tree-row" type="button" key={file.id} title={file.path} aria-label={`Abrir diff ${file.path}`} onClick={() => onOpenDiff(file.id)}>
              <span className={`change-decoration ${file.status}`}>{statusLabel[file.status]}</span>
              <span className="change-file-name">{file.path.split('/').pop()}</span>
              {resolution && <span className={`change-resolution ${resolution}`}>{resolutionLabel[resolution]}</span>}
              <span className="change-stats"><span className="session-diff-added">+{resolution ? 0 : file.added}</span><span className="session-diff-removed">−{resolution ? 0 : file.removed}</span></span>
            </button>
          )
        })}
        <button className="secondary-button auxiliary-full-width-button" type="button" onClick={() => onOpenDiff()}><GitCompareArrows size={13} />Abrir multi-diff</button>
      </section>
      <section className="auxiliary-section ci-widget">
        <button className={`ci-header${checksExpanded ? '' : ' is-collapsed'}`} type="button" aria-expanded={checksExpanded} aria-controls={checksBodyId} aria-label="Alternar Checks" title="Alternar Checks" onClick={onToggleChecks}>
          {checksExpanded ? <ChevronDown size={13} aria-hidden="true" /> : <ChevronRight size={13} aria-hidden="true" />}
          <ListChecks size={14} aria-hidden="true" /><span>Checks</span>
          <span className="ci-header-counts" aria-label="3 aprovados, 1 falha"><span className="ci-row-status success">3</span><span className="ci-row-status failure">1</span></span>
        </button>
        {checksExpanded && <div className="ci-list" id={checksBodyId}>
          {checkRows.map((check) => (
            <div className="ci-row" key={check.name}>
              {checkIcon(check.status)}
              <span className="ci-row-name">{check.name}</span>
              <span className={`ci-row-status ${check.status}`}>{check.label}</span>
              {(check.status === 'failure' || check.status === 'running') && <span className="ci-inline-actions">
                <button className="icon-button ci-inline-action" type="button" title={`Executar novamente ${check.name}`} aria-label={`Executar novamente ${check.name}`} onClick={() => onRerunChecks(check.name)}><RefreshCw size={12} /></button>
                <button className="icon-button ci-inline-action" type="button" title={`Abrir ${check.name} no GitHub`} aria-label={`Abrir ${check.name} no GitHub`} onClick={() => onOpenCheck(check.name)}><ExternalLink size={12} /></button>
              </span>}
            </div>
          ))}
          <button className="secondary-button auxiliary-full-width-button" type="button" onClick={() => onRerunChecks()}><RefreshCw size={12} />Executar novamente</button>
        </div>}
      </section>
      <section className="auxiliary-section">
        <div className="auxiliary-section-title"><GitPullRequest size={13} /><span>Pull request</span></div>
        <button className="secondary-button auxiliary-full-width-button" type="button" onClick={onPreparePr}><GitPullRequest size={13} />Preparar PR</button>
      </section>
    </>
  )
}

function FilesDetails({
  expandedFolders,
  onToggleFolder,
  onOpenFile,
  fileSystemEntries,
  fileSystemRootName,
  fileSystemLoading,
  isFileSystemSupported,
  onPickDirectory,
  onClearDirectory,
  onOpenFileHandle,
  hasRealFileSystem,
}: {
  expandedFolders: FolderExpansionState
  onToggleFolder: (folderName: string) => void
  onOpenFile: (path: string) => void
  fileSystemEntries?: FileSystemEntry[]
  fileSystemRootName?: string
  fileSystemLoading?: boolean
  isFileSystemSupported?: boolean
  onPickDirectory?: () => void
  onClearDirectory?: () => void
  onOpenFileHandle?: (entry: FileSystemEntry) => void
  hasRealFileSystem?: boolean
}) {
  // Render real filesystem if available
  if (hasRealFileSystem && fileSystemEntries) {
    return (
      <section className="auxiliary-section">
        <div className="auxiliary-section-title"><Files size={13} /><span>Workspace Files</span><span className="auxiliary-subtitle">· {fileSystemRootName}</span></div>
        <div className="filesystem-actions" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button className="secondary-button" type="button" onClick={onPickDirectory} disabled={fileSystemLoading}><FolderOpen size={13} />Trocar pasta</button>
          <button className="text-button" type="button" onClick={onClearDirectory}>Limpar</button>
        </div>
        {fileSystemLoading ? (
          <p className="auxiliary-empty-state">Carregando arquivos reais...</p>
        ) : (
          <div className="file-tree-real">
            {fileSystemEntries.map((entry) => (
              <FileSystemTreeNode key={entry.path} entry={entry} expandedFolders={expandedFolders} onToggleFolder={onToggleFolder} onOpenFile={onOpenFile} onOpenFileHandle={onOpenFileHandle} depth={0} />
            ))}
          </div>
        )}
        <div className="auxiliary-section-title auxiliary-subsection-title"><Check size={13} /><span>Escopo</span></div>
        <p className="auxiliary-description">Arquivos reais do disco. Clique para abrir no editor.</p>
      </section>
    )
  }

  // Fallback: show picker + mock folders if no real filesystem
  return (
    <section className="auxiliary-section">
      <div className="auxiliary-section-title"><Files size={13} /><span>Workspace Files</span></div>
      {!isFileSystemSupported ? (
        <p className="auxiliary-empty-state">File System Access API não suportada. Use Chrome/Edge para escolher pasta real.</p>
      ) : (
        <>
          <button className="secondary-button auxiliary-full-width-button" type="button" onClick={onPickDirectory} style={{ marginBottom: 12 }}><FolderOpen size={13} />Escolher pasta real do disco</button>
          <p className="auxiliary-description" style={{ marginBottom: 12, fontSize: 12, color: 'var(--vscode-descriptionForeground)' }}>
            Nenhuma pasta real selecionada. Mostrando exemplo mockado. Clique acima para escolher pasta real como no vídeo original [06:13].
          </p>
        </>
      )}
      {fallbackFolders.map((folder) => {
        const isExpanded = expandedFolders[folder.name] ?? true
        const childrenId = `files-${folder.name}-children`
        return (
          <div key={folder.name}>
            <button className="file-tree-row file-tree-folder" type="button" aria-expanded={isExpanded} aria-controls={childrenId} aria-label={`${isExpanded ? 'Recolher' : 'Expandir'} pasta ${folder.name}`} onClick={() => onToggleFolder(folder.name)}>
              {isExpanded ? <ChevronDown size={12} aria-hidden="true" /> : <ChevronRight size={12} aria-hidden="true" />}
              <Files size={12} aria-hidden="true" /><span className="file-name">{folder.name}</span>
            </button>
            {isExpanded && <div className="file-tree-children" id={childrenId}>
              {folder.files.map((file) => (
                <button
                  className="file-tree-row file-tree-file"
                  type="button"
                  key={file}
                  title={file}
                  aria-label={`Abrir arquivo ${file}`}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData(DragTypes.FILE, file)
                    event.dataTransfer.setData('text/plain', file)
                    event.dataTransfer.effectAllowed = 'copy'
                  }}
                  onClick={() => onOpenFile(file)}
                ><FileCode2 size={12} aria-hidden="true" /><span className="file-name">{file}</span></button>
              ))}
            </div>}
          </div>
        )
      })}
      <div className="auxiliary-section-title auxiliary-subsection-title"><Check size={13} /><span>Escopo</span></div>
      <p className="auxiliary-description">Arquivos e alterações permanecem associados à sessão ativa.</p>
    </section>
  )
}

function FileSystemTreeNode({
  entry,
  expandedFolders,
  onToggleFolder,
  onOpenFile,
  onOpenFileHandle,
  depth,
}: {
  entry: FileSystemEntry
  expandedFolders: FolderExpansionState
  onToggleFolder: (folderName: string) => void
  onOpenFile: (path: string) => void
  onOpenFileHandle?: (entry: FileSystemEntry) => void
  depth: number
}) {
  const isDir = entry.kind === 'directory'
  const isExpanded = expandedFolders[entry.path] ?? (depth < 1)
  const paddingLeft = 8 + depth * 16

  if (isDir) {
    return (
      <div>
        <button
          className="file-tree-row file-tree-folder"
          type="button"
          aria-expanded={isExpanded}
          aria-controls={`files-${entry.path}-children`}
          style={{ paddingLeft }}
          onClick={() => onToggleFolder(entry.path)}
        >
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {isExpanded ? <FolderOpen size={12} /> : <Folder size={12} />}
          <span className="file-name">{entry.name}</span>
          {entry.children && <span className="file-count" style={{ marginLeft: 6, fontSize: 11, opacity: 0.6 }}>{entry.children.length}</span>}
        </button>
        {isExpanded && entry.children && (
          <div className="file-tree-children" id={`files-${entry.path}-children`}>
            {entry.children.map((child) => (
              <FileSystemTreeNode key={child.path} entry={child} expandedFolders={expandedFolders} onToggleFolder={onToggleFolder} onOpenFile={onOpenFile} onOpenFileHandle={onOpenFileHandle} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      className="file-tree-row file-tree-file"
      type="button"
      title={entry.path}
      aria-label={`Abrir arquivo ${entry.path}`}
      style={{ paddingLeft }}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(DragTypes.FILE, entry.path)
        event.dataTransfer.setData('text/plain', entry.path)
        event.dataTransfer.effectAllowed = 'copy'
      }}
      onClick={() => {
        if (onOpenFileHandle) onOpenFileHandle(entry)
        else onOpenFile(entry.path)
      }}
    >
      <FileCode2 size={12} /><span className="file-name">{entry.name}</span>
    </button>
  )
}
