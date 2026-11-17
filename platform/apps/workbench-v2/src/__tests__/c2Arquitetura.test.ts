// ============================================================================
// C-2 — c2Arquitetura (C2-T01/T06/T09/T10/T12 · R10/R11/R12): monolito
// modular sem espelho novo de estado, domínio puro sem IO, fonte única da
// regra do par e do catálogo, contratos do primeiro envio e legado preservado.
// Asserções sobre as FONTES reais (nada de espelhar código no teste).
// ============================================================================

import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { buildSessionsList, EMPTY_FILTERS } from '../domain/sessionsList'
import { construirSessaoChat, chatIdDaSessao } from '../domain/primeiroEnvio'
import { snapshotDoRascunho, rascunhoInicial, editarRascunho } from '../domain/landingDraft'
import type { Session } from '../types'

const raiz = join(__dirname, '..')
const ler = (rel: string) => readFileSync(join(raiz, rel), 'utf8')

function arquivosTs(dir: string, acumulado: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    if (nome === 'node_modules' || nome.startsWith('.')) continue
    const cheio = join(dir, nome)
    if (statSync(cheio).isDirectory()) arquivosTs(cheio, acumulado)
    else if (/\.(ts|tsx)$/.test(nome)) acumulado.push(cheio)
  }
  return acumulado
}

/** Remove comentários antes de asserções textuais (comentário não é código). */
const semComentarios = (fonte: string) =>
  fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

const app = ler('App.tsx')
const chatInput = ler('components/ChatInput.tsx')
const sessionLanding = ler('components/SessionLanding.tsx')
const sessionSidebar = ler('components/SessionSidebar.tsx')
const selecaoModelo = ler('domain/selecaoModelo.ts')
const landingDraft = ler('domain/landingDraft.ts')
const primeiroEnvio = ler('domain/primeiroEnvio.ts')
const catalogoHook = ler('hooks/useCatalogoModelos.ts')

describe('c2Arquitetura — R11 App fino, sem espelho novo', () => {
  it('T01: App.tsx mantém a linha final ≤2889 e não ganha espelho/chave nova de estado', () => {
    const linhas = app.split('\n').length
    expect(linhas).toBeLessThanOrEqual(2889)
    // Nenhum espelho novo de landing/seleção no App (chaves pré-existentes de
    // modo/modelo por chat continuam sendo dos donos atuais — inalteradas).
    expect(app).not.toMatch(/localStorage\.(get|set|remove)Item\([^)]*(landing|rascunho|selecao|primeiro)/i)
    expect(app).not.toContain('sessionStorage')
    // SSE continua sendo dono do provedor de eventos (nenhum EventSource novo).
    expect(app).not.toContain('new EventSource')
    // Sem agendamento do primeiro envio (o envio é explícito no handler).
    expect(app).not.toMatch(/setTimeout\(\(\) => handleSend/)
  })

  it('T01: a regra do par mora NO DOMÍNIO (fonte única) e o ChatInput só a re-exporta', () => {
    expect(selecaoModelo).toContain("export const MODEL_AUTO = 'Auto'")
    // Uma única definição de MODEL_AUTO em todo o src.
    const fontes = arquivosTs(raiz).filter((arquivo) => !arquivo.includes('__tests__'))
    const definicoes = fontes
      .map((arquivo) => readFileSync(arquivo, 'utf8').match(/const MODEL_AUTO = /g)?.length ?? 0)
      .reduce((total, atual) => total + atual, 0)
    expect(definicoes).toBe(1)
    // Compat: ChatPanel continua importando selecaoDoToken via ChatInput.
    expect(chatInput).toContain("export { selecaoDoToken } from '../domain/selecaoModelo'")
    expect(ler('components/ChatPanel.tsx')).toContain("from './ChatInput'")
    // O App não redefine/reimplementa a regra do par.
    expect(app).not.toContain('tokenDoPar')
    expect(app).not.toContain('MODEL_AUTO')
  })

  it('T01: catálogo compartilhado — ChatInput e landing usam o MESMO hook', () => {
    expect(catalogoHook).toContain('carregarEstado')
    expect(chatInput).toContain("from '../hooks/useCatalogoModelos'")
    expect(sessionLanding).toContain("from '../hooks/useCatalogoModelos'")
  })

  it('T06: domínio puro — landingDraft, selecaoModelo e primeiroEnvio sem IO de estado', () => {
    for (const fonte of [landingDraft, selecaoModelo, primeiroEnvio]) {
      expect(fonte).not.toMatch(/localStorage|sessionStorage|new EventSource/)
      expect(fonte).not.toMatch(/\bfetch\s*\(/)
    }
    // O primeiro envio não agenda nada: fases rodam na sequência chamada.
    expect(primeiroEnvio).not.toMatch(/setTimeout\s*\(/)
    // Portas injetadas: o domínio não importa casas/estado do App.
    expect(primeiroEnvio).not.toMatch(/from '\.\.\/casas/)
  })
})

describe('c2Arquitetura — R10 legado preservado (parâmetro default)', () => {
  const sessoes: Session[] = [
    {
      id: 's1', title: 'Sessão', workspace: 'ws', workspacePath: '/ws', section: 'today',
      status: 'completed', updated: 'agora', diffAdded: 0, diffRemoved: 0, branch: null,
      chats: [{ id: 'c1', title: 'Chat', status: 'completed', messages: [] }], mainChatId: 'c1',
    },
  ]

  it('T10: sem a projeção, a lista continua no formato legado (nenhum grupo contexto)', () => {
    const grupos = buildSessionsList(sessoes, EMPTY_FILTERS, 'manual', undefined)
    expect(grupos.some((grupo) => grupo.section.kind === 'contexto')).toBe(false)
    expect(grupos.map((grupo) => grupo.id)).toContain('today')
  })

  it('T10: com a projeção, Chat e pasta nascem dos campos canônicos (contexto/raiz)', () => {
    const chat: Session = { ...sessoes[0], id: 's-chat', contexto: { tipo: 'chat' }, workspace: 'Chat', workspacePath: null }
    const pasta: Session = { ...sessoes[0], id: 's-pasta', contexto: { tipo: 'workspace' } }
    const grupos = buildSessionsList([chat, pasta], EMPTY_FILTERS, 'manual', undefined, {}, undefined, 'date', true)
    const grupoChat = grupos.find((grupo) => grupo.section.kind === 'contexto' && grupo.section.contexto === 'chat')
    const grupoPasta = grupos.find((grupo) => grupo.section.kind === 'contexto' && grupo.section.contexto === 'workspace')
    expect(grupoChat?.sessions.map((sessao) => sessao.id)).toEqual(['s-chat'])
    expect(grupoPasta?.sessions.map((sessao) => sessao.id)).toEqual(['s-pasta'])
    expect(grupoPasta?.section.kind === 'contexto' && grupoPasta.section.workspacePath).toBe('/ws')
  })

  it('T10: a sessão Chat nasce sem raiz e com chatId estável', () => {
    const sessao = construirSessaoChat('abc', 'pedido')
    expect(sessao.contexto).toEqual({ tipo: 'chat' })
    expect(sessao.workspacePath).toBeNull()
    expect(sessao.worktreePath).toBeNull()
    expect(sessao.mainChatId).toBe(chatIdDaSessao('abc'))
    expect(sessao.chats[0].id).toBe('abc-main')
  })
})

describe('c2Arquitetura — R12 sidebar e snapshot', () => {
  it('T12: "Permitir tudo" é implícito só como ESCOLHA explícita do rascunho (nunca default)', () => {
    expect(rascunhoInicial().permissao).toBe('manual')
    const explicito = editarRascunho(rascunhoInicial(), { permissao: 'allow-all' })
    const snapshot = snapshotDoRascunho(explicito, 'workspace', '/ws', 'ws', 't1')
    expect(snapshot.permissao).toBe('allow-all')
    // Em Chat a escolha é rebaixada para manual (autoridade da modalidade).
    const chat = snapshotDoRascunho(explicito, 'chat', null, null, 't2')
    expect(chat.permissao).toBe('manual')
  })

  it('R12: Personalizações no topo (mesmo modal) e atalhos da base removidos', () => {
    expect(sessionSidebar).toContain('data-testid="sidebar-personalizacoes"')
    expect(sessionSidebar).toContain("onOpenPersonalizations('visao')")
    expect(sessionSidebar).not.toContain('personalizations-shortcuts')
  })

  it('R01: a landing não renderiza This Computer nem Copilot (posições do frame original)', () => {
    const codigo = semComentarios(sessionLanding)
    expect(codigo).not.toContain('This Computer')
    expect(codigo).not.toContain('Copilot')
  })
})
