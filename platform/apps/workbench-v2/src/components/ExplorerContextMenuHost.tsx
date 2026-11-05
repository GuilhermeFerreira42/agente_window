// ============================================================================
// components/ExplorerContextMenuHost.tsx — Host VISUAL do menu de contexto do
// módulo explorer-search (shell). O módulo NUNCA desenha o menu (04_10 §1
// `deps.contextMenu.open`); ele entrega itens resolvidos (id/label/enabled/
// group/order) e o shell os pinta. ZERO lógica de negócio aqui: clique →
// `onExecute(id)` → `menus.execute(id)` no App.
//
// Régua (FATIA-04 4.5, commit 1): `04_17 §3.8` (medido no VS Code real) +
// medição ao vivo no code-server 8080 (auditoria_45/c1/codeserver_antes.png):
//   container `.monaco-menu-container` radius 8, shadow 0 0 12px rgba(0,0,0,.14);
//   `.monaco-menu` borda 1 px `menu.border`, bg `menu.background`, lista com
//   padding vertical 4 px; item `.action-item` 24 px; `.action-label` 13 px,
//   padding 0 26px (26 px à esquerda reservam check/ícone), radius 6;
//   keybinding à direita, mesma cor, padding-right 26; hover/foco
//   `menu.selectionBackground`/`Foreground`; desabilitado opacity .4;
//   separador 1 px `menu.separatorBackground`, margin 5px 0; largura mínima
//   200 px (`04_03 §6`), cresce com o maior label+keybinding.
// Separadores = fronteira entre `group`s consecutivos (MenuRegistry upstream
// insere `Separator` entre grupos — `menuEntryActionViewItem.ts`
// `createAndFillInContextMenuActions`).
// (BUG-V1 preservado) clamp na viewport: o menu nunca sangra para fora.
// ============================================================================
import React, { useEffect, useRef, useState } from 'react'
import { clampMenuPosition } from '../domain/filePreview'
import './explorer-context-menu.css'

/** Item como chega do módulo (forma do contrato 04_10 `contextMenu.open`).
 *  `keybinding`/`checked` são OPCIONAIS (evolução aditiva autorizada 4.5) —
 *  o host renderiza condicionalmente; ausentes → nada é desenhado. */
export type ExplorerContextMenuItem = {
  id: string
  label: string
  enabled: boolean
  group?: string
  order: number
  danger?: boolean
  keybinding?: string
  checked?: boolean
}

export type ExplorerContextMenuState = {
  x: number
  y: number
  items: ExplorerContextMenuItem[]
}

type Row = { kind: 'item'; item: ExplorerContextMenuItem } | { kind: 'separator'; key: string }

/** Ordena por `order` (já global: grupo*100+order) e insere separador a cada troca de grupo. */
export function buildMenuRows(items: readonly ExplorerContextMenuItem[]): Row[] {
  const sorted = [...items].sort((a, b) => a.order - b.order)
  const rows: Row[] = []
  let lastGroup: string | undefined
  sorted.forEach((item, i) => {
    if (i > 0 && item.group !== lastGroup) rows.push({ kind: 'separator', key: `sep-${item.id}` })
    rows.push({ kind: 'item', item })
    lastGroup = item.group
  })
  return rows
}

export function ExplorerContextMenuHost({ state, onClose, onExecute }: {
  state: ExplorerContextMenuState
  onClose: () => void
  onExecute: (id: string) => void
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: state.x, y: state.y })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const clamped = clampMenuPosition(state.x, state.y, el.offsetWidth, el.offsetHeight, window.innerWidth, window.innerHeight)
    if (clamped.x !== pos.x || clamped.y !== pos.y) setPos(clamped)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const rows = buildMenuRows(state.items)

  // ---- teclado / foco (04_03 §6, 04_17 §3.8 "↑↓ navega, Enter ativa, Esc fecha") ----
  // Upstream: base/browser/ui/menu/menu.ts (focusNext/focusPrevious pulam
  // separadores e desabilitados; foco inicial no 1º item) e
  // platform/contextview/browser/contextMenuHandler.ts (onHide devolve o foco
  // ao elemento que tinha foco ao abrir; fecha em blur/scroll/resize).
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null
    const first = ref.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not([disabled]), [role="menuitemcheckbox"]:not([disabled])')
    first?.focus()
    const close = () => onCloseRef.current()
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    window.addEventListener('blur', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('blur', close)
      const el = restoreFocusRef.current
      if (el && el.isConnected && typeof el.focus === 'function') el.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onMenuKeyDown = (ev: React.KeyboardEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const items = Array.from(el.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled]), [role="menuitemcheckbox"]:not([disabled])'))
    if (items.length === 0) { if (ev.key === 'Escape') { ev.preventDefault(); onClose() } return }
    const cur = items.indexOf(document.activeElement as HTMLButtonElement)
    const focusAt = (i: number) => items[(i + items.length) % items.length]?.focus()
    switch (ev.key) {
      case 'ArrowDown': ev.preventDefault(); ev.stopPropagation(); focusAt(cur + 1); return
      case 'ArrowUp': ev.preventDefault(); ev.stopPropagation(); focusAt(cur - 1); return
      case 'Home': ev.preventDefault(); ev.stopPropagation(); focusAt(0); return
      case 'End': ev.preventDefault(); ev.stopPropagation(); focusAt(items.length - 1); return
      case 'Escape': ev.preventDefault(); ev.stopPropagation(); onClose(); return
      case 'Tab': ev.preventDefault(); ev.stopPropagation(); onClose(); return
      case 'Enter':
      case ' ': {
        // O <button> focado já dispara onClick no Enter/Espaço; só evitamos
        // que a tecla vaze para a árvore por baixo do menu.
        ev.stopPropagation()
        return
      }
      default:
        return
    }
  }

  return (
    <div
      ref={ref}
      className="explorer-context-menu-container"
      data-explorer-context-menu
      data-testid="explorer-context-menu"
      style={{ left: pos.x, top: pos.y }}
      onKeyDown={onMenuKeyDown}
    >
      <div className="explorer-context-menu" role="menu" aria-label="Explorer context menu">
        <ul className="explorer-context-menu-list">
          {rows.map((row) =>
            row.kind === 'separator' ? (
              <li key={row.key} className="explorer-context-menu-separator" role="separator" />
            ) : (
              <li key={row.item.id} className="explorer-context-menu-row">
                <button
                  type="button"
                  role={row.item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
                  className={`explorer-context-menu-item${row.item.enabled ? '' : ' disabled'}`}
                  disabled={!row.item.enabled}
                  aria-disabled={!row.item.enabled}
                  aria-checked={row.item.checked === undefined ? undefined : row.item.checked}
                  aria-label={row.item.keybinding ? `${row.item.label} (${row.item.keybinding})` : row.item.label}
                  aria-keyshortcuts={row.item.keybinding}
                  data-menu-item-id={row.item.id}
                  onClick={() => {
                    onClose()
                    void onExecute(row.item.id)
                  }}
                >
                  {row.item.checked === true && (
                    // .menu-item-check.codicon-menu-selection upstream (glyph check \eab2)
                    <span className="explorer-context-menu-check" aria-hidden="true" />
                  )}
                  <span className="explorer-context-menu-label">{row.item.label}</span>
                  {row.item.keybinding && (
                    <span className="explorer-context-menu-keybinding">{row.item.keybinding}</span>
                  )}
                </button>
              </li>
            ),
          )}
        </ul>
      </div>
    </div>
  )
}
