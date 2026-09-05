import { describe, expect, it } from 'vitest'
import themeSource from '../styles/theme.css?raw'
import appSource from '../styles/app.css?raw'

function collectTokens(source: string, pattern: RegExp): Set<string> {
  return new Set(Array.from(source.matchAll(pattern), (match) => match[1]))
}

describe('Dark+ theme token contract', () => {
  const declaredTokens = collectTokens(themeSource, /(--vscode-[\w-]+)\s*:/g)
  const referencedTokens = collectTokens(appSource, /var\(\s*(--vscode-[\w-]+)/g)

  it('declares every VS Code token referenced by replica CSS', () => {
    const missing = [...referencedTokens].filter((token) => !declaredTokens.has(token)).sort()
    expect(missing).toEqual([])
  })

  it('keeps the Agents-specific shell and chat-input tokens centralized', () => {
    const required = [
      '--vscode-agents-background',
      '--vscode-agentsPanel-background',
      '--vscode-agentsPanel-border',
      '--vscode-agentsCard-border',
      '--vscode-agentsBottomPanel-border',
      '--vscode-agentsGradient-tintColor',
      '--vscode-agentsChatInput-background',
      '--vscode-agentsChatInput-border',
      '--vscode-agentsChatInput-focusBorder',
      '--vscode-agentsChatInput-foreground',
      '--vscode-agentsChatInput-placeholderForeground',
      '--vscode-icon-foreground',
      '--vscode-menu-background',
      '--vscode-menu-border',
      '--vscode-menu-foreground',
      '--vscode-panelTitle-activeBorder',
      '--vscode-progressBar-background',
    ]

    expect(required.every((token) => declaredTokens.has(token))).toBe(true)
  })

  it('does not introduce raw hex or rgb colors into component CSS', () => {
    expect(appSource).not.toMatch(/(?<![\w-])#[0-9a-fA-F]{3,8}\b/)
    expect(appSource).not.toMatch(/\brgba?\(/)
    expect(appSource).not.toMatch(/\bhsla?\(/)
  })

  it('disables state motion explicitly when reduced motion is requested', () => {
    expect(appSource).toContain('@media (prefers-reduced-motion: reduce)')
    expect(appSource).toContain('.chat-input-container.is-working::before')
    expect(appSource).toContain('animation: none !important;')
  })
})

