import type { Session } from '../types'

interface AuxiliaryBarProps {
  session: Session
  visible: boolean
  /** FATIA-04 (4.7 c1) → FATIA-05 5.8-c1: Editor Anexo do módulo explorer-search (header+abas+corpo, sash próprio).
   *  O módulo controla largura/visibilidade do slot; o shell só reserva o lugar. */
  attachSlot?: import('react').ReactNode
}

// FATIA-05 5.8-c1 (docs/24 v1.3, RF-P-05, D2.50): a coluna "Detalhes" (maquete vazia desde a 5.3; 330 px) e os botões
// "Barra auxiliar" foram REMOVIDOS DE VEZ — não existem no VS Code real. A barra é só a casca do Editor Anexo:
// `aside.auxiliary-bar > attachSlot`. Sem anexo não há nada a renderizar.
export function AuxiliaryBar({ session, visible, attachSlot }: AuxiliaryBarProps) {
  if (!visible || !attachSlot) return null
  return (
    <aside className="auxiliary-bar has-attach-slot details-collapsed" aria-label="Editor anexo" data-session-id={session.id}>
      {attachSlot}
    </aside>
  )
}
