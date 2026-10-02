import { PanelRightClose } from 'lucide-react'
import type { Session } from '../types'

interface AuxiliaryBarProps {
  session: Session
  visible: boolean
  /** FATIA-04 (4.4): slot legado da aba "Files" (o App não passa mais desde o c3 da 5.1). */
  filesSlot?: import('react').ReactNode
  /** FATIA-04 (4.7 c1, exceção autorizada 2026-09-26): Editor Anexo do módulo
   *  explorer-search, renderizado à ESQUERDA da coluna (header+abas+corpo),
   *  com sash próprio. A barra vira linha: [attachSlot][coluna]. O módulo
   *  controla largura/visibilidade do slot; o shell só reserva o lugar. */
  attachSlot?: import('react').ReactNode
  fileSystemRootName?: string
  /** FATIA-05 5.7 (D6): coluna "Detalhes" visível? `visible` passa a governar a barra inteira
   *  (Detalhes OU anexo com abas); por padrão (undefined) segue `visible`. */
  detailsVisible?: boolean
  onClose: () => void
}

// FATIA-05 5.3 (docs/24 §4 5.3, RF-05 — decisão A 2026-09-30): a maquete "Changes N"
// (ChangesDetails + widget Checks, dados de `initialDiffFiles`) e a maquete "Files"
// (FilesDetails) foram REMOVIDAS de vez, junto com `shell/gitTransition.ts` e a prop
// `hideChangesTab`. O Source Control real vive na view `scm` da Side Bar; o Explorer real
// na view `explorer`. Sobra aqui a coluna "Detalhes" vazia (D2.50 — some na 5.7/5.8) e o
// `attachSlot` (Editor Anexo, à direita do chat até a 5.7).
export function AuxiliaryBar({ session, visible, detailsVisible, onClose, fileSystemRootName, filesSlot, attachSlot }: AuxiliaryBarProps) {
  if (!visible) return null

  const panelId = `aux-panel-${session.id}`
  const showDetails = detailsVisible ?? visible

  return (
    <aside className={`auxiliary-bar${attachSlot ? ' has-attach-slot' : ''}${showDetails ? '' : ' details-collapsed'}`} aria-label="Barra auxiliar" data-session-id={session.id} data-details-visible={showDetails}>
      {attachSlot}
      {/* 5.7: coluna "Detalhes" colapsa (display:none) quando só o anexo está aberto — continua no toggle. */}
      <div className="auxiliary-column" hidden={!showDetails}>
      <div className="auxiliary-header">
        <div className="pane-title"><PanelRightClose size={14} /><span>Detalhes</span><span className="pane-title-subtle">· {fileSystemRootName || session.workspace}</span></div>
        <button className="toolbar-button" type="button" title="Fechar barra auxiliar" aria-label="Fechar barra auxiliar" onClick={onClose}><PanelRightClose size={14} /></button>
      </div>
      <div className="aux-tabs" role="tablist" aria-label="Detalhes da sessão">
        {/* 5.1 c3: aba Files saiu (Explorer na Side Bar) · 5.3: aba Changes saiu (Source Control na Side Bar). */}
      </div>
      <div className="auxiliary-body" id={panelId} role="tabpanel" tabIndex={0}>
        {filesSlot ?? null}
      </div>
      </div>
    </aside>
  )
}
