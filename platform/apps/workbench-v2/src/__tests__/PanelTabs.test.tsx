import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PanelTabs } from '../components/terminal/PanelTabs'

describe('PanelTabs', () => {
  it('renderiza badge e troca a aba ativa', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <PanelTabs
        tabs={[
          { id: 'terminal', label: 'Terminal' },
          { id: 'output', label: 'Output' },
          { id: 'problems', label: 'Problems', badge: 2 },
        ]}
        active="terminal"
        onChange={onChange}
      />,
    )

    expect(screen.getByRole('tab', { name: 'Terminal' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByLabelText('2 problemas')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Problems/ }))
    expect(onChange).toHaveBeenCalledWith('problems')
  })
})
