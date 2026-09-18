import { describe, expect, it } from 'vitest'
import appCss from '../styles/app.css?raw'

/**
 * P7.4 — Estados visuais.
 * Garante que hover, focus, selected, disabled, loading/working, needs-input,
 * approved e toast permaneçam tokenizados e fiéis aos mecanismos da referência.
 */

function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return appCss.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
}

describe('P7.4 visual state contracts', () => {
  it('uses focusBorder + strokeThickness consistently for focus outlines', () => {
    // Nenhum outline de foco deve usar espessura fixa em vez do token.
    expect(appCss).not.toMatch(/outline:\s*1px solid var\(--vscode-focusBorder\)/)
    const focusOutlines = appCss.match(
      /outline:\s*var\(--vscode-strokeThickness\) solid var\(--vscode-focusBorder\)/g,
    )
    expect(focusOutlines && focusOutlines.length).toBeGreaterThanOrEqual(5)
    expect(rule('button:focus-visible,\ninput:focus-visible,\ntextarea:focus-visible,\n[tabindex]:focus-visible')).toContain('outline-offset: -1px')
  })

  it('keeps the disabled state consistent (opacity + cursor)', () => {
    const disabled = rule('.primary-button:disabled,\n.secondary-button:disabled,\n.warning-button:disabled,\n.text-button:disabled,\n.toolbar-button:disabled,\n.icon-button:disabled,\n.session-action-button:disabled,\n.editor-tab-add-menu-button:disabled')
    expect(disabled).toContain('opacity: 0.5')
    expect(disabled).toContain('cursor: default')
    expect(rule('.send-button:disabled')).toContain('var(--vscode-disabledForeground)')
  })

  it('drives needs-input with pulse animations at the reference cadence', () => {
    expect(rule('.session-row.is-needs-input:not(.is-selected)')).toContain('animation: session-needs-input-accent-pulse 3s ease-in-out infinite')
    expect(rule('.session-row.is-needs-input:not(.is-selected) .session-status-icon')).toContain('animation: session-needs-input-pulse 2s ease-in-out infinite')
  })

  it('drives the working shimmer with the reference steps timing', () => {
    expect(rule('.session-row.is-working:not(.is-selected) .session-title-text')).toContain('animation: session-title-shimmer 6s steps(90, jump-none) infinite')
  })

  it('animates the composer working border as a rotating conic beam', () => {
    expect(appCss).toMatch(/@keyframes chat-input-working-border-spin/)
    expect(appCss).toContain('animation: chat-input-working-border-spin 4s linear infinite')
  })

  it('marks the approved command center with the charts-green token', () => {
    expect(rule('.command-center.is-approved')).toMatch(/charts-green|charts\.green|--vscode-charts-green/)
  })

  it('disables the animated states under prefers-reduced-motion', () => {
    expect(appCss).toMatch(/@media \(prefers-reduced-motion/)
    const reducedBlock = appCss.slice(appCss.indexOf('prefers-reduced-motion'))
    expect(reducedBlock).toContain('.session-row.is-needs-input:not(.is-selected)')
    expect(reducedBlock).toContain('.chat-input-container.is-working::before')
  })
})

