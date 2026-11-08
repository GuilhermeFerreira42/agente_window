import { useEffect, useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useStableEditorSurface } from './stableEditorSurface'
it('reposiciona uma instância sem perder rascunho nem remontar ao ocultar/reabrir', () => {
  const mounted = vi.fn()
  function Form() {
    const [draft, setDraft] = useState('')
    useEffect(() => { mounted() }, [])
    return <input aria-label="Rascunho" value={draft} onChange={event => setDraft(event.target.value)} />
  }
  function Workbench({ mode }: { mode: 'normal' | 'max' | 'hidden' }) {
    const surface = useStableEditorSurface(<Form />)
    return <>{surface.portal}{mode === 'normal' ? <section><article>{surface.slot}</article></section>
      : mode === 'max' ? <div>{surface.slot}</div> : <aside />}</>
  }
  const { rerender } = render(<Workbench mode="normal" />)
  const input = screen.getByRole('textbox', { name: 'Rascunho' })
  fireEvent.change(input, { target: { value: 'conteúdo pendente' } })
  rerender(<Workbench mode="max" />)
  expect(screen.getByRole('textbox', { name: 'Rascunho' })).toBe(input)
  expect(input).toHaveValue('conteúdo pendente')
  rerender(<Workbench mode="hidden" />)
  expect(screen.queryByRole('textbox', { name: 'Rascunho' })).toBeNull()
  rerender(<Workbench mode="normal" />)
  expect(screen.getByRole('textbox', { name: 'Rascunho' })).toBe(input)
  expect(input).toHaveValue('conteúdo pendente')
  expect(mounted).toHaveBeenCalledTimes(1)
  expect(document.querySelectorAll('[data-testid="stable-editor-content"]')).toHaveLength(1)
})
