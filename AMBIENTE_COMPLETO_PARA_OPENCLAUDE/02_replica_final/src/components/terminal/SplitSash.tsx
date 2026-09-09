import { useCallback, useEffect, useRef } from 'react'

interface SplitSashProps {
  orientation: 'vertical' | 'horizontal'
  onResize: (deltaPx: number) => void
}

type PointerLike = { clientX: number; clientY: number }

function readPointerPosition(event: MouseEvent | TouchEvent, orientation: 'vertical' | 'horizontal') {
  const point: PointerLike = 'touches' in event
    ? (event.touches[0] ?? event.changedTouches[0])
    : event
  return orientation === 'vertical' ? point.clientX : point.clientY
}

export function SplitSash({ orientation, onResize }: SplitSashProps) {
  const lastPositionRef = useRef<number | null>(null)

  const handleMove = useCallback((event: MouseEvent | TouchEvent) => {
    if (lastPositionRef.current == null) return

    const nextPosition = readPointerPosition(event, orientation)
    const delta = nextPosition - lastPositionRef.current
    if (delta === 0) return

    lastPositionRef.current = nextPosition
    onResize(delta)
  }, [onResize, orientation])

  const handleMouseMove = useCallback((event: MouseEvent) => {
    handleMove(event)
  }, [handleMove])

  const handleTouchMove = useCallback((event: TouchEvent) => {
    handleMove(event)
  }, [handleMove])

  const stopDragging = useCallback(() => {
    lastPositionRef.current = null
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', stopDragging)
    window.removeEventListener('touchmove', handleTouchMove)
    window.removeEventListener('touchend', stopDragging)
  }, [handleMouseMove, handleTouchMove])

  const startDragging = useCallback((position: number) => {
    lastPositionRef.current = position
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', stopDragging)
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', stopDragging)
  }, [handleMouseMove, stopDragging, handleTouchMove])

  useEffect(() => () => stopDragging(), [stopDragging])

  return (
    <div
      className={`split-sash split-sash-${orientation}`}
      role="separator"
      aria-orientation={orientation}
      aria-label="Redimensionar split do terminal"
      onMouseDown={(event) => startDragging(readPointerPosition(event.nativeEvent, orientation))}
      onTouchStart={(event) => startDragging(readPointerPosition(event.nativeEvent, orientation))}
    />
  )
}
