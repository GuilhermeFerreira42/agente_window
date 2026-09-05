import { describe, expect, it } from 'vitest'
import themeSource from '../styles/theme.css?raw'
import appSource from '../styles/app.css?raw'
import appComponentSource from '../App.tsx?raw'
import chatInputSource from '../components/ChatInput.tsx?raw'

function rule(selector: string, source = appSource): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return source.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
}

describe('Agents window density and layout contracts', () => {
  it('centralizes the restored workbench geometry tokens', () => {
    expect(themeSource).toMatch(/--vscode-agents-layout-floatingPanelGap\s*:\s*4px/)
    expect(themeSource).toMatch(/--vscode-agents-centered-content-max-width\s*:\s*950px/)
    expect(themeSource).toMatch(/--sidebar-width\s*:\s*300px/)
    expect(themeSource).toMatch(/--auxiliary-width\s*:\s*340px/)
    expect(themeSource).toMatch(/--terminal-height\s*:\s*300px/)
  })

  it('keeps the desktop shell gap and card proportions explicit', () => {
    expect(rule('.workbench-body')).toContain('margin: 0 var(--vscode-agents-layout-floatingPanelGap) var(--vscode-agents-layout-floatingPanelGap) 0')
    expect(rule('.main-region')).toContain('display: flex')
    expect(rule('.right-section')).toContain('gap: var(--vscode-agents-layout-floatingPanelGap)')
    expect(rule('.top-right-section')).toContain('gap: var(--vscode-agents-layout-floatingPanelGap)')
    expect(rule('.main-surface')).toContain('border: 1px solid var(--vscode-agentsCard-border')
    expect(rule('.main-surface')).toContain('border-radius: var(--vscode-cornerRadius-large)')
    expect(rule('.auxiliary-bar')).toContain('flex: 0 0 var(--auxiliary-width)')
    expect(rule('.auxiliary-bar')).toContain('padding-left: 5px')
    expect(rule('.auxiliary-bar')).toContain('border-radius: 0 var(--vscode-cornerRadius-large) var(--vscode-cornerRadius-large) 0')
    expect(rule('.terminal-panel')).toContain('flex: 0 0 var(--terminal-height)')
    expect(rule('.terminal-panel')).toContain('border: 1px solid var(--vscode-agentsBottomPanel-border)')
  })

  it('caps transcript and composer content at the restored 950px band', () => {
    for (const selector of ['.chat-welcome', '.chat-message', '.chat-approval-banner', '.chat-composer']) {
      expect(rule(selector)).toContain('max-width: var(--session-view-centered-content-max-width)')
      expect(rule(selector)).toMatch(/margin: (?:0 auto|8px auto 0)/)
    }
    expect(rule('.chat-message')).toContain('padding: 12px 32px')
    expect(rule('.chat-composer')).toContain('padding: 4px 32px 14px')
  })

  it('preserves the protected session row heights and nested connector inset', () => {
    expect(rule('.session-row')).toContain('min-height: 54px')
    expect(rule('.nested-chat-row')).toContain('min-height: 28px')
    expect(rule('.nested-chat-row')).toContain('padding: 0 12px 0 36px')
    expect(rule('.nested-chat-title-row')).toContain('height: 28px')
    expect(rule('.nested-chat-row.is-last::before')).toContain('bottom: calc(100% - 14px)')
  })

  it('matches the restored chat header, input clamp, and first editor split', () => {
    expect(rule('.chat-pane-header')).toContain('min-height: 34px')
    expect(appSource).toMatch(/\.chat-group-tab,\s*\.editor-tab,\s*\.aux-tab\s*\{[\s\S]*?height: 35px/)
    expect(rule('.chat-group-tabs')).toContain('container-type: inline-size')
    expect(rule('.chat-group-tab')).toContain('max-width: var(--chat-tab-max-width)')
    expect(rule('.chat-input-textarea')).toContain('min-height: 50px')
    expect(rule('.chat-input-textarea')).toContain('max-height: 200px')
    expect(chatInputSource).toContain('Math.min(200, Math.max(50, contentHeight))')
    expect(chatInputSource).toContain('contentHeight > 200')
    // Os tamanhos iniciais agora vêm da persistência por sessão (default [50,50]).
    expect(appComponentSource).toContain('<Panel defaultSize={activePartSizes[0]} minSize={34}')
    expect(appComponentSource).toContain('<Panel defaultSize={activePartSizes[1]} minSize={28}')
  })

  it('removes card insets in the intentional single-pane mode', () => {
    expect(rule('.single-pane .workbench-body')).toContain('margin: 0')
    expect(rule('.single-pane .main-surface')).toContain('border: 0')
    expect(rule('.single-pane .main-surface')).toContain('border-radius: 0')
  })
})

