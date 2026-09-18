import { useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, FileText, X } from 'lucide-react'
import type { DiffFile } from '../types'
import { buildUnifiedDiff, computeFileDiffViewData } from '../domain/unifiedDiff'
import { IDLE_PULLDOWN, pulldownEnd, pulldownMove, pulldownStart, type PulldownState } from '../domain/pulldownDismiss'

// E15 (MOBILE_DIFF_EDITORS.md) — revisão de diff full-screen para telefone.
// Diff unificado (não lado-a-lado), navegação simples entre arquivos irmãos,
// cabeçalho sticky e controles visíveis. Presentation adapter sobre os mesmos
// dados de diff da sessão.

interface MobileDiffViewProps {
  files: DiffFile[]
  selectedFileId?: string
  onSelectFile: (id: string) => void
  onClose: () => void
}

export function MobileDiffView({ files, selectedFileId, onSelectFile, onClose }: MobileDiffViewProps) {
  const index = Math.max(0, files.findIndex((file) => file.id === selectedFileId))
  const file = files[index]
  const [showList, setShowList] = useState(false)

  const hunks = useMemo(() => (file ? buildUnifiedDiff(file.original, file.modified) : []), [file])
  const stats = useMemo(() => (file ? computeFileDiffViewData(file.original, file.modified) : null), [file])

  // (R-049) Gesto pulldown-to-dismiss: arrastar para baixo a partir do topo do
  // overlay o dispensa (equivale à back-navigation da MobileNavigationStack).
  // Os hooks precisam ser chamados incondicionalmente (antes do early return).
  const gesture = useRef<PulldownState>(IDLE_PULLDOWN)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [pullOffset, setPullOffset] = useState(0)

  if (!file) {
    return (
      <div className="mobile-diff-view" role="dialog" aria-label="Revisão de alterações">
        <header className="mobile-diff-header">
          <button type="button" className="mobile-diff-close" aria-label="Fechar revisão" onClick={onClose}><X size={16} /></button>
          <span className="mobile-diff-title">Alterações</span>
        </header>
        <div className="mobile-diff-empty" data-testid="mobile-diff-empty">
          <FileText size={22} />
          <p>Esta sessão não possui arquivos alterados.</p>
        </div>
      </div>
    )
  }

  const goPrev = () => { if (index > 0) onSelectFile(files[index - 1].id) }
  const goNext = () => { if (index < files.length - 1) onSelectFile(files[index + 1].id) }

  const onTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0]
    if (!touch) return
    const scrollTop = bodyRef.current?.scrollTop ?? 0
    gesture.current = pulldownStart(touch.clientX, touch.clientY, event.timeStamp, scrollTop)
    setPullOffset(0)
  }
  const onTouchMove = (event: React.TouchEvent) => {
    const touch = event.touches[0]
    if (!touch || !gesture.current.active) return
    gesture.current = pulldownMove(gesture.current, touch.clientX, touch.clientY, event.timeStamp)
    setPullOffset(gesture.current.offset)
  }
  const onTouchEnd = (event: React.TouchEvent) => {
    const { dismiss, state } = pulldownEnd(gesture.current, event.timeStamp)
    gesture.current = state
    setPullOffset(0)
    if (dismiss) onClose()
  }

  return (
    <div
      className={`mobile-diff-view${pullOffset > 0 ? ' is-pulling' : ''}`}
      role="dialog"
      aria-label="Revisão de alterações"
      data-pull-offset={pullOffset}
      style={pullOffset > 0 ? { transform: `translateY(${pullOffset}px)` } : undefined}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="mobile-diff-pull-handle" aria-hidden="true" />
      <header className="mobile-diff-header">
        <button type="button" className="mobile-diff-close" aria-label="Fechar revisão" onClick={onClose}><X size={16} /></button>
        <button
          type="button"
          className="mobile-diff-file-button"
          aria-label="Selecionar arquivo"
          aria-expanded={showList}
          onClick={() => setShowList((current) => !current)}
        >
          <FileText size={14} />
          <span className="mobile-diff-path">{file.path}</span>
        </button>
        <div className="mobile-diff-nav">
          <button type="button" aria-label="Arquivo anterior" disabled={index === 0} onClick={goPrev}><ChevronLeft size={16} /></button>
          <span className="mobile-diff-counter" aria-label={`Arquivo ${index + 1} de ${files.length}`}>{index + 1}/{files.length}</span>
          <button type="button" aria-label="Próximo arquivo" disabled={index === files.length - 1} onClick={goNext}><ChevronRight size={16} /></button>
        </div>
      </header>

      {stats && (
        <div className="mobile-diff-stats" aria-label={`${stats.added} adicionadas, ${stats.removed} removidas`}>
          <span className="mobile-diff-added">+{stats.added}</span>
          <span className="mobile-diff-removed">−{stats.removed}</span>
          {stats.identical && <span className="mobile-diff-identical">Sem alterações</span>}
        </div>
      )}

      {showList && (
        <ul className="mobile-diff-file-list" role="listbox" aria-label="Arquivos alterados">
          {files.map((candidate) => (
            <li key={candidate.id} role="option" aria-selected={candidate.id === file.id}>
              <button
                type="button"
                className={`mobile-diff-file-list-item${candidate.id === file.id ? ' is-active' : ''}`}
                onClick={() => { onSelectFile(candidate.id); setShowList(false) }}
              >
                {candidate.path}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mobile-diff-body" ref={bodyRef}>
        {hunks.map((hunk, hunkIndex) => (
          <div className="mobile-diff-hunk" key={hunkIndex}>
            <div className="mobile-diff-hunk-header">@@ -{hunk.originalStart} +{hunk.modifiedStart} @@</div>
            {hunk.lines.map((line, lineIndex) => (
              <div className={`mobile-diff-line is-${line.kind}`} key={lineIndex}>
                <span className="mobile-diff-gutter">{line.kind === 'added' ? '+' : line.kind === 'removed' ? '−' : ' '}</span>
                <code className="mobile-diff-content">{line.content || '\u00a0'}</code>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

