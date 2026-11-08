import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

function EditorSurfaceSlot({ container }: { container: HTMLElement }) {
  const host = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const owner = host.current
    owner?.appendChild(container)
    return () => { if (container.parentElement === owner) container.remove() }
  }, [container])
  return <div ref={host} style={{ display: 'flex', flex: '1 1 0', minWidth: 0, minHeight: 0, width: '100%', height: '100%' }} data-testid="stable-editor-slot" />
}

/** Uma instância visual reposicionada. Cada casa continua dona do seu estado. */
export function useStableEditorSurface(content: ReactNode) {
  const [container] = useState(() => {
    const element = document.createElement('div')
    Object.assign(element.style, { display: 'flex', flex: '1 1 0', minWidth: '0', minHeight: '0', width: '100%', height: '100%' })
    element.dataset.testid = 'stable-editor-content'
    return element
  })
  return { portal: createPortal(content, container, 'workbench-editor-surface'),
    slot: <EditorSurfaceSlot container={container} /> }
}
