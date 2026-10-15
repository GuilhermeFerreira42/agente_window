/**
 * FATIA 07 — Destravar (15/10/2026). Testes de regressão das dívidas
 * estruturais corrigidas nesta fatia.
 *
 * - DEBT-09: Provedores abre pelo menu da conta MESMO na tela inicial (landing,
 *   sem sessões). A aba `providers` é global (sem dono de sessão) e passa a
 *   abrir o editor central ao lado da landing.
 */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App'

// Espelha o App.test: as abas do EDITOR ficam escopadas ao `.editor-tabs`
// (a Activity Bar também expõe `role="tab"`).
const editorTab = (name: string | RegExp) => within(document.querySelector('.editor-tabs') as HTMLElement).getByRole('tab', { name })

const providersPayload = {
  config: {
    openai: { enabled: false, apiKeySource: 'environment' },
    gemini: { enabled: false, apiKeySource: 'environment' },
    ollama: { enabled: true, baseUrl: 'http://localhost:11434' },
  },
  environment: { openaiConfigured: false, geminiConfigured: false },
}

beforeEach(() => {
  window.localStorage.clear()
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    if (url === '/api/providers') {
      return new Response(JSON.stringify(providersPayload), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
  })
})

describe('FATIA 07 — Destravar', () => {
  it('DEBT-09: abre Provedores pelo menu da conta na tela inicial (landing, sem sessões)', async () => {
    const user = userEvent.setup()
    render(<App initialSessionSnapshot={[]} />)

    // Ponto de partida real da dívida: a tela inicial vazia, sem nenhuma sessão.
    expect(screen.getByRole('region', { name: 'Nova sessão' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Conta' }))
    await user.click(screen.getByRole('menuitem', { name: 'Provedores' }))

    // A página abre no editor central — o mesmo fluxo homologado com sessões.
    expect(await screen.findByRole('region', { name: 'Provedores' })).toBeInTheDocument()
    expect(editorTab('Provedores')).toHaveAttribute('data-tab-type', 'providers')
    expect(await screen.findByText('Não configurada — use OPENAI_API_KEY')).toBeInTheDocument()
    // A landing continua montada ao lado (a sessão futura segue disponível).
    expect(screen.getByRole('region', { name: 'Nova sessão' })).toBeInTheDocument()
  })
})
