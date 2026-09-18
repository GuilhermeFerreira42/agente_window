import { useCallback, useRef, type ReactNode } from 'react'
import { SplitSash } from './SplitSash'

interface TerminalGroupProps {
  split: boolean
  splitRatio: number
  hidden?: boolean
  mainPane: ReactNode
  splitPane?: ReactNode
  onSplitRatioChange: (nextRatio: number) => void
}

const MIN_SPLIT_RATIO = 0.2
const MAX_SPLIT_RATIO = 0.8

function clampSplitRatio(value: number) {
  return Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, value))
}

export function TerminalGroup({
  split,
  splitRatio,
  hidden = false,
  mainPane,
  splitPane,
  onSplitRatioChange,
}: TerminalGroupProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const splitRatioRef = useRef(splitRatio)
  splitRatioRef.current = splitRatio

  const handleResize = useCallback((deltaPx: number) => {
    if (!split || !rootRef.current) return

    const width = rootRef.current.clientWidth
    if (width <= 0) return

    const currentRatio = splitRatioRef.current
    const nextRatio = clampSplitRatio(currentRatio + deltaPx / width)
    if (Math.abs(nextRatio - currentRatio) < 0.001) return

    onSplitRatioChange(nextRatio)
  }, [onSplitRatioChange, split])

  const mainStyle = split ? { flex: `0 0 ${Math.max(0, splitRatio * 100)}%` } : undefined
  const splitStyle = split ? { flex: `1 1 ${Math.max(0, (1 - splitRatio) * 100)}%` } : undefined

  return (
    <div ref={rootRef} className={`terminal-panes terminal-group${split ? ' is-split' : ''}`} hidden={hidden}>
      <div className="terminal-group-pane terminal-group-pane-main" style={mainStyle}>
        {mainPane}
      </div>
      {split && splitPane && (
        <>
          <SplitSash orientation="vertical" onResize={handleResize} />
          <div className="terminal-group-pane terminal-group-pane-split" style={splitStyle}>
            {splitPane}
          </div>
        </>
      )}
    </div>
  )
}
