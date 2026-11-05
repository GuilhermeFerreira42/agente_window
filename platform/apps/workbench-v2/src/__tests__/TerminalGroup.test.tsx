import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { TerminalGroup } from '../components/terminal/TerminalGroup'

describe('TerminalGroup', () => {
  it('renderiza o sash no split e recalcula o ratio dentro do clamp', () => {
    const onSplitRatioChange = vi.fn()
    const { container } = render(
      <TerminalGroup
        split
        splitRatio={0.5}
        onSplitRatioChange={onSplitRatioChange}
        mainPane={<div>Main</div>}
        splitPane={<div>Split</div>}
      />,
    )

    const root = container.querySelector('.terminal-group') as HTMLDivElement
    Object.defineProperty(root, 'clientWidth', { value: 400, configurable: true })

    const separator = screen.getByRole('separator', { name: 'Redimensionar split do terminal' })
    fireEvent.mouseDown(separator, { clientX: 200 })
    fireEvent.mouseMove(window, { clientX: 280 })
    fireEvent.mouseUp(window)

    expect(onSplitRatioChange).toHaveBeenCalledWith(0.7)
  })

  it('não renderiza sash quando não há split', () => {
    render(
      <TerminalGroup
        split={false}
        splitRatio={0.5}
        onSplitRatioChange={() => {}}
        mainPane={<div>Main</div>}
      />,
    )

    expect(screen.queryByRole('separator', { name: 'Redimensionar split do terminal' })).not.toBeInTheDocument()
  })
})
