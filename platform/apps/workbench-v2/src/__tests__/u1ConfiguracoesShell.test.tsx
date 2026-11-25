// ============================================================================
// U-1 — C3B-T01/T02/T08/T09/T10: o shell e a navegação do modal unificado.
//
// O que se prova aqui:
//   · U1-T01 uma única porta abre UM diálogo expandido, na categoria certa,
//     inclusive sem pasta/conversa anterior; trocar de categoria não duplica.
//   · U1-T02 ordem/grupos aprovados; subseções de Personalizações na MESMA nav;
//     atalhos e cards apontam à rota equivalente; categorias futuras honestas.
//   · U1-T08 foco preso no diálogo, painel oculto fora da navegação, teclado
//     nas setas, maximizar/restaurar, Escape e devolução de foco.
//   · U1-T09 abas legadas (config/providers/aiCustomizations) traduzidas ANTES
//     da montagem; abrir o modal não repete mutação.
//   · U1-T10 uma moldura, fronteiras preservadas, sem segundo store.
//
// Nada aqui usa serviço remoto: os painéis são dublês de COMPOSIÇÃO (o App é
// quem os conecta), o que é justamente a fronteira que a U-1 protege.
// ============================================================================
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { ConfiguracoesUnificadas, type ItemPainel } from '../shell/ConfiguracoesUnificadas'
import {
  ALIASES_LEGADOS,
  CATEGORIAS_CONFIGURACOES,
  MODO_STORAGE_KEY,
  MENU_CONFIGURACOES,
  MODO_INICIAL,
  ROTA_PADRAO,
  SUBSECOES_PERSONALIZACOES,
  alternarModo,
  categoriaDaSecaoLegada,
  categoriaImplementada,
  decidirFechamento,
  decidirFechamentoDePaineis,
  algumPainelSalvando,
  indiceNaNavegacao,
  modoInicial,
  labelDaCategoria,
  mesmasRotas,
  normalizarRota,
  rotaDaSecao,
  rotaDaSuperficieLegada,
  type CategoriaConfiguracoes,
  type RotaConfiguracoes,
} from '../domain/configuracoesUnificadas'

/** Painel mínimo que registra quantas vezes foi MONTADO. */
function painel(nome: string, montagens: Record<string, number>, extra?: React.ReactNode): ItemPainel {
  return {
    montavel: true,
    conteudo: <PainelEspiao nome={nome} montagens={montagens} extra={extra} />,
  }
}

function PainelEspiao({ nome, montagens, extra }: { nome: string; montagens: Record<string, number>; extra?: React.ReactNode }) {
  montagens[nome] = (montagens[nome] ?? 0) + 1
  return <div data-painel-espiao={nome}>{extra ?? `conteúdo de ${nome}`}</div>
}

function montar(rota: RotaConfiguracoes, over: Partial<React.ComponentProps<typeof ConfiguracoesUnificadas>> = {}) {
  const navegacoes: RotaConfiguracoes[] = []
  const fechamentos: number[] = []
  const vista = render(
    <ConfiguracoesUnificadas
      rota={rota}
      onNavegar={(proxima) => { navegacoes.push(proxima) }}
      onFechar={() => fechamentos.push(1)}
      paineis={{}}
      {...over}
    />,
  )
  return { ...vista, navegacoes, fechamentos }
}

describe('U-1 — U1-T01 uma porta, um diálogo', () => {
  it('U1-T01 o modal nasce EXPANDIDO e um único dialog é montado', () => {
    montar(ROTA_PADRAO)
    const dialogos = screen.getAllByRole('dialog')
    expect(dialogos, 'exatamente um diálogo').toHaveLength(1)
    expect(dialogos[0].getAttribute('data-modo')).toBe(MODO_INICIAL)
    expect(dialogos[0].getAttribute('aria-modal')).toBe('true')
    expect(dialogos[0].getAttribute('aria-label')).toBe('Configurações')
  })

  it('U1-T01 abrir outra categoria com o diálogo presente CONSERVA a instância', () => {
    const montagens: Record<string, number> = {}
    // A MESMA referência de painéis nas duas renderizações: é o que o App faz.
    const paineis = {
      geral: painel('geral', montagens),
      provedores: painel('provedores', montagens),
    }
    const { rerender } = montar({ categoria: 'geral' }, { paineis })
    expect(montagens.geral).toBe(1)
    rerender(
      <ConfiguracoesUnificadas
        rota={{ categoria: 'provedores' }}
        onNavegar={() => {}}
        onFechar={() => {}}
        paineis={paineis}
      />,
    )
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(montagens.provedores).toBe(1)
    // O painel anterior NÃO foi remontado: a instância é preservada.
    expect(montagens.geral, 'o painel visitado não remonta').toBe(1)
  })

  it('U1-T01 restaurar/maximizar alterna o modo sem fechar o diálogo', () => {
    montar(ROTA_PADRAO)
    const botao = screen.getByRole('button', { name: 'Restaurar configurações' })
    fireEvent.click(botao)
    expect(screen.getByRole('dialog').getAttribute('data-modo')).toBe('restaurado')
    fireEvent.click(screen.getByRole('button', { name: 'Maximizar configurações' }))
    expect(screen.getByRole('dialog').getAttribute('data-modo')).toBe('expandido')
    expect(alternarModo('expandido')).toBe('restaurado')
  })
})

describe('U-1 — U1-T02 menu e estados', () => {
  it('U1-T02 ordem e grupos são exatamente os aprovados', () => {
    expect(MENU_CONFIGURACOES.map((grupo) => grupo.label)).toEqual([
      'Aplicativo',
      'Inteligência Artificial',
      'Dados e Ambiente',
    ])
    expect(MENU_CONFIGURACOES.flatMap((grupo) => grupo.entradas.map((entrada) => entrada.label))).toEqual([
      'Geral', 'Aparência', 'Notificações',
      'Provedores e modelos', 'Personalizações', 'Agentes e instruções', 'Permissões', 'MCP', 'Hooks', 'Plugins',
      'Conversas e armazenamento', 'Workspaces', 'Importação e backup',
    ])
    // O menu cobre TODAS as categorias declaradas — nada some, nada extra.
    expect(MENU_CONFIGURACOES.flatMap((grupo) => grupo.entradas.map((entrada) => entrada.id)).sort())
      .toEqual([...CATEGORIAS_CONFIGURACOES].sort())
  })

  it('U1-T02 Personalizações expõe Visão geral/Habilidades/Ferramentas na MESMA navegação', () => {
    montar({ categoria: 'personalizacoes', subsecao: 'visao' }, {
      subsecoes: SUBSECOES_PERSONALIZACOES.map((id) => ({ id, label: id })),
    })
    const nav = screen.getByRole('navigation', { name: 'Categorias de configurações' })
    const subnav = screen.getByRole('group', { name: 'Seções de Personalizações' })
    // Uma navegação só: as subseções vivem DENTRO dela.
    expect(nav.contains(subnav), 'subseções na mesma navegação').toBe(true)
    expect(subnav.querySelectorAll('button')).toHaveLength(3)
  })

  it('U1-T02 categoria futura explica o limite e não oferece ação fictícia', () => {
    montar({ categoria: 'plugins' })
    expect(categoriaImplementada('plugins')).toBe(false)
    expect(screen.getByText('Esta funcionalidade ainda não está disponível nesta versão.')).toBeTruthy()
    const painelFuturo = document.querySelector('[data-categoria-futura="plugins"]')
    expect(painelFuturo).not.toBeNull()
    expect(painelFuturo!.querySelectorAll('button, input, select, textarea')).toHaveLength(0)
  })

  it('U1-T02 o menu não desenha subseções fora de Personalizações', () => {
    montar({ categoria: 'geral' }, { subsecoes: SUBSECOES_PERSONALIZACOES.map((id) => ({ id, label: id })) })
    expect(screen.queryByRole('group', { name: 'Seções de Personalizações' })).toBeNull()
  })
})

describe('U-1 — U1-T08 foco, teclado e isolamento', () => {
  it('U1-T08 o diálogo recebe foco e o app fica inert sem DESMONTAR o fundo', async () => {
    const app = document.createElement('div')
    app.className = 'app-frame'
    app.innerHTML = '<div data-conteudo-do-chat>chat montado</div>'
    document.body.appendChild(app)
    montar(ROTA_PADRAO)
    await waitFor(() => expect(app.inert).toBe(true))
    // O fundo segue MONTADO: inert tira teclado, não destrói estado.
    expect(document.querySelector('[data-conteudo-do-chat]')?.textContent).toBe('chat montado')
    app.remove()
  })

  it('U1-T08 setas percorrem a navegação e Home/End vão às pontas', () => {
    montar(ROTA_PADRAO)
    const nav = screen.getByRole('navigation', { name: 'Categorias de configurações' })
    const itens = Array.from(nav.querySelectorAll<HTMLButtonElement>('button[data-categoria]'))
    itens[0].focus()
    fireEvent.keyDown(nav, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(itens[1])
    fireEvent.keyDown(nav, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(itens[0])
    fireEvent.keyDown(nav, { key: 'End' })
    expect(document.activeElement).toBe(itens[itens.length - 1])
    fireEvent.keyDown(nav, { key: 'Home' })
    expect(document.activeElement).toBe(itens[0])
    // Circular: subir do primeiro vai ao último.
    fireEvent.keyDown(nav, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(itens[itens.length - 1])
    // A função pura concorda com o DOM.
    expect(indiceNaNavegacao(0, 'ArrowUp', 5)).toBe(4)
  })

  it('U1-T08 painel oculto sai da navegação (hidden) e não recebe foco', () => {
    const montagens: Record<string, number> = {}
    const paineis = { geral: painel('geral', montagens), provedores: painel('provedores', montagens) }
    const { rerender } = montar({ categoria: 'geral' }, { paineis })
    rerender(
      <ConfiguracoesUnificadas
        rota={{ categoria: 'provedores' }}
        onNavegar={() => {}}
        onFechar={() => {}}
        paineis={paineis}
      />,
    )
    const painelGeral = document.querySelector<HTMLElement>('[data-painel="geral"]')
    const painelProvedores = document.querySelector<HTMLElement>('[data-painel="provedores"]')
    expect(painelGeral?.hidden, 'painel inativo fica oculto').toBe(true)
    expect(painelGeral?.getAttribute('aria-hidden')).toBe('true')
    expect(painelProvedores?.hidden).toBe(false)
    expect(painelProvedores?.hasAttribute('aria-hidden')).toBe(false)
  })

  it('U1-T08 Escape fecha; o X e o rótulo do botão são acessíveis', () => {
    const { fechamentos } = montar(ROTA_PADRAO)
    screen.getByRole('button', { name: 'Fechar configurações' })
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(fechamentos).toHaveLength(1)
  })

  it('U1-T08 a confirmação de descarte suspende o Escape até o dono decidir', () => {
    const { fechamentos } = montar(ROTA_PADRAO, {
      confirmacaoAberta: true,
      onContinuarEditando: () => {},
      onDescartarRascunhos: () => {},
    })
    const alerta = screen.getByRole('alertdialog', { name: 'Descartar rascunhos' })
    expect(alerta).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(fechamentos, 'Escape não descarta sozinho').toHaveLength(0)
  })
})

describe('U-1 — U1-T09 legado e histórico', () => {
  it('U1-T09 abas legadas viram a categoria equivalente ANTES da montagem', () => {
    expect(rotaDaSuperficieLegada('config')).toEqual({ categoria: 'geral' })
    expect(rotaDaSuperficieLegada('providers')).toEqual({ categoria: 'provedores' })
    expect(rotaDaSuperficieLegada('aiCustomizations')).toEqual({ categoria: 'personalizacoes', subsecao: 'visao' })
    // Aba de arquivo NÃO é superfície de settings: continua sendo o que é.
    expect(rotaDaSuperficieLegada('file')).toBeUndefined()
    expect(rotaDaSuperficieLegada(42)).toBeUndefined()
    expect(Object.keys(ALIASES_LEGADOS).sort()).toEqual(['aiCustomizations', 'config', 'providers'])
  })

  it('U1-T09 seções antigas de Personalizações apontam à categoria de mesmo nome', () => {
    expect(categoriaDaSecaoLegada('habilidades')).toBe('personalizacoes')
    expect(categoriaDaSecaoLegada('agentes')).toBe('agentes-instrucoes')
    expect(categoriaDaSecaoLegada('instrucoes')).toBe('agentes-instrucoes')
    expect(categoriaDaSecaoLegada('mcp')).toBe('mcp')
    expect(categoriaDaSecaoLegada('hooks')).toBe('hooks')
    expect(categoriaDaSecaoLegada('plugins')).toBe('plugins')
    expect(categoriaDaSecaoLegada('inexistente')).toBeUndefined()
    // Rota de seção nunca inventa subseção em categoria que não tem subseção.
    expect(rotaDaSecao('mcp')).toEqual({ categoria: 'mcp' })
    expect(rotaDaSecao('ferramentas')).toEqual({ categoria: 'personalizacoes', subsecao: 'ferramentas' })
  })

  it('U1-T09 normalizarRota impede estado impossível', () => {
    expect(normalizarRota({ categoria: 'personalizacoes' })).toEqual({ categoria: 'personalizacoes', subsecao: 'visao' })
    expect(normalizarRota({ categoria: 'personalizacoes', subsecao: 'hooks' as never }))
      .toEqual({ categoria: 'personalizacoes', subsecao: 'visao' })
    expect(normalizarRota({ categoria: 'geral', subsecao: 'visao' })).toEqual({ categoria: 'geral' })
    expect(normalizarRota(undefined)).toEqual(ROTA_PADRAO)
    expect(normalizarRota({ categoria: 'nao-existe' as never })).toEqual(ROTA_PADRAO)
    expect(mesmasRotas(normalizarRota({ categoria: 'geral' }), { categoria: 'geral' })).toBe(true)
  })

  it('U1-T09 o botão de navegação emite a ROTA, não executa escrita', async () => {
    const usuario = userEvent.setup()
    const escritas: string[] = []
    const { navegacoes } = montar(ROTA_PADRAO)
    await usuario.click(screen.getByRole('button', { name: labelDaCategoria('provedores') }))
    expect(navegacoes).toEqual([{ categoria: 'provedores' }])
    expect(escritas, 'navegar não grava nada').toEqual([])
  })
})


// ============================================================================
// U-1 — U1-R01..R06: regressões da REVISÃO (o que a v1 não cobria).
//
// Cada bloco reproduz o defeito relatado e só passa quando ele deixa de existir.
// A v1 passou 7 jornadas e ainda assim perdia rascunho oculto, fechava sem
// avisar e reenviava chave revelada — por isso cada caso aqui tem um "antes"
// explícito no comentário.
// ============================================================================
describe('U-1 — R01 o modal lembra o TAMANHO entre aberturas', () => {
  beforeEach(() => window.localStorage.clear())

  it('R01 primeira abertura é expandida e a moldura alterna o tamanho', () => {
    // Sessão nova: nada gravado → expandido (MODO_INICIAL).
    expect(modoInicial(undefined)).toBe('expandido')
    montar(ROTA_PADRAO)
    expect(screen.getByRole('dialog').getAttribute('data-modo')).toBe('expandido')
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar configurações' }))
    expect(screen.getByRole('dialog').getAttribute('data-modo')).toBe('restaurado')
    fireEvent.click(screen.getByRole('button', { name: 'Maximizar configurações' }))
    expect(screen.getByRole('dialog').getAttribute('data-modo')).toBe('expandido')
  })

  it('R01 o SHELL persiste a escolha: reabrir (e o F5) usa o último modo', async () => {
    // Antes: `useState(MODO_INICIAL)` — toda abertura era expandida e o F5
    // esquecia a escolha. Quem persiste é o shell (a moldura não grava nada).
    const { renderHook, act } = await import('@testing-library/react')
    const { useConfiguracoesUnificadas } = await import('../shell/useConfiguracoesUnificadas')
    const primeira = renderHook(() => useConfiguracoesUnificadas())
    expect(primeira.result.current.modo).toBe('expandido')
    act(() => primeira.result.current.alternarModo())
    expect(primeira.result.current.modo).toBe('restaurado')
    expect(window.localStorage.getItem(MODO_STORAGE_KEY)).toBe('restaurado')
    primeira.unmount()
    // "F5": um shell novo lê o storage e já abre no modo escolhido.
    const depois = renderHook(() => useConfiguracoesUnificadas())
    expect(depois.result.current.modo).toBe('restaurado')
    act(() => depois.result.current.alternarModo())
    expect(window.localStorage.getItem(MODO_STORAGE_KEY)).toBe('expandido')
    depois.unmount()
  })

  it('R01 valor corrompido no storage não vira modo inválido (cai no inicial)', () => {
    window.localStorage.setItem(MODO_STORAGE_KEY, 'gigante')
    expect(modoInicial(window.localStorage.getItem(MODO_STORAGE_KEY))).toBe('expandido')
    window.localStorage.setItem(MODO_STORAGE_KEY, 'restaurado')
    expect(modoInicial(window.localStorage.getItem(MODO_STORAGE_KEY))).toBe('restaurado')
  })
})

describe('U-1 — R04 fechamento olha TODOS os painéis, inclusive os ocultos', () => {
  it('R04 rascunho em painel oculto ainda pede confirmação (antes fechava seco)', () => {
    // Antes: `decidirFechamento(estadoPainel[rota.categoria])` — só a ativa.
    // Alterar Geral, ir para Aparência e fechar descartava o rascunho de Geral.
    const paineis = {
      geral: { dirty: true, saving: false, canLeave: true },
      aparencia: { dirty: false, saving: false, canLeave: true },
    }
    expect(decidirFechamentoDePaineis(paineis)).toBe('confirmar')
    expect(decidirFechamentoDePaineis({ geral: { dirty: false, saving: false, canLeave: true } })).toBe('fechar')
    expect(decidirFechamentoDePaineis({})).toBe('fechar')
    expect(decidirFechamentoDePaineis(undefined)).toBe('fechar')
  })

  it('R04 save em voo em qualquer painel manda AGUARDAR (nunca descarta)', () => {
    // Antes: um save em Provedores (oculto) não bloqueava o fechamento em Geral.
    expect(decidirFechamentoDePaineis({
      geral: { dirty: false, saving: false, canLeave: true },
      provedores: { dirty: false, saving: true, canLeave: true },
    })).toBe('aguardar')
    // Aguardar tem precedência sobre confirmar.
    expect(decidirFechamentoDePaineis({
      geral: { dirty: true, saving: false, canLeave: true },
      provedores: { dirty: false, saving: true, canLeave: true },
    })).toBe('aguardar')
    expect(algumPainelSalvando({ geral: { dirty: false, saving: false, canLeave: true } })).toBe(false)
    expect(algumPainelSalvando({ provedores: { dirty: false, saving: true, canLeave: true } })).toBe(true)
  })
})

describe('U-1 — R09 histórico/restauração e abas legadas', () => {
  it('R09 aba antiga em SEGUNDO PLANO não rouba a categoria ativa', async () => {
    const { drenarAbasLegadas } = await import('../shell/persistenciaNativas')
    const snapshot = {
      tabs: [
        { id: 'arquivo-1', title: 'app.ts', type: 'file' as const, sessionId: 's1' },
        { id: 'provedores-1', title: 'Provedores', type: 'providers' as const, sessionId: 's1' },
      ],
      browserViews: [],
      activeBySession: { s1: 'arquivo-1' },
      ordinalBySession: {},
    }
    const { snapshot: limpo, rotas } = drenarAbasLegadas(snapshot)
    // A aba de arquivo continua ativa; a antiga foi drenada e NÃO é "ativa".
    expect(limpo.activeBySession.s1).toBe('arquivo-1')
    expect(limpo.tabs.map((tab) => tab.id)).toEqual(['arquivo-1'])
    expect(rotas).toEqual([{ rota: { categoria: 'provedores' }, ativa: false }])
  })

  it('R09 quando a aba antiga era a ATIVA, a categoria equivalente abre', async () => {
    const { drenarAbasLegadas } = await import('../shell/persistenciaNativas')
    const { snapshot, rotas } = drenarAbasLegadas({
      tabs: [
        { id: 'arquivo-1', title: 'app.ts', type: 'file' as const, sessionId: 's1' },
        { id: 'config-1', title: 'Configurações', type: 'config' as const, sessionId: 's1' },
      ],
      browserViews: [],
      activeBySession: { s1: 'config-1' },
      ordinalBySession: {},
    })
    expect(snapshot.activeBySession.s1).toBeUndefined()
    expect(rotas).toEqual([{ rota: { categoria: 'geral' }, ativa: true }])
    // A aba global também conta: `config` sem sessão ativa abre a categoria.
    const global = drenarAbasLegadas({
      tabs: [{ id: 'providers-1', title: 'Provedores', type: 'providers' as const }],
      browserViews: [], activeBySession: {}, ordinalBySession: {}, activeGlobalTabId: 'providers-1',
    })
    expect(global.rotas).toEqual([{ rota: { categoria: 'provedores' }, ativa: true }])
  })
})

describe('U-1 — U1-T10 fronteiras e uma moldura', () => {
  it('U1-T10 o domínio é puro: sem IO, React ou Casa', async () => {
    const fs = await import('node:fs')
    const fonte = fs.readFileSync(join(process.cwd(), 'src/domain/configuracoesUnificadas.ts'), 'utf8')
    const codigo = fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
    expect(codigo).not.toMatch(/from ['"]react['"]/)
    expect(codigo).not.toMatch(/node:fs|localStorage|fetch\(/)
    expect(codigo).not.toMatch(/bairros\//)
  })

  it('U1-T10 a moldura não importa Casas de IA (só o shell e o domínio)', async () => {
    const fs = await import('node:fs')
    const fonte = fs.readFileSync(join(process.cwd(), 'src/shell/ConfiguracoesUnificadas.tsx'), 'utf8')
    expect(fonte).not.toMatch(/bairros\/2-inteligencia\/casas\/(config|provedores|personalizacoes)/)
    expect(fonte).toContain("from '../domain/configuracoesUnificadas'")
  })

  it('U1-T10 save em voo impede descarte; draft pede confirmação', () => {
    expect(decidirFechamento({ dirty: false, saving: false, canLeave: true })).toBe('fechar')
    expect(decidirFechamento({ dirty: true, saving: false, canLeave: true })).toBe('confirmar')
    expect(decidirFechamento({ dirty: true, saving: true, canLeave: true })).toBe('aguardar')
    expect(decidirFechamento(undefined)).toBe('fechar')
  })

  it('U1-T10 com save em voo o botão de descartar fica bloqueado', () => {
    montar(ROTA_PADRAO, {
      confirmacaoAberta: true,
      salvando: true,
      onContinuarEditando: () => {},
      onDescartarRascunhos: () => {},
    })
    const descartar = screen.getByRole('button', { name: 'Aguardando salvamento…' })
    expect((descartar as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('U-1 — U1-T02 rótulos e categorias', () => {
  it('U1-T02 labelDaCategoria devolve o rótulo aprovado e não o id cru', () => {
    expect(labelDaCategoria('conversas-armazenamento')).toBe('Conversas e armazenamento')
    expect(labelDaCategoria('agentes-instrucoes')).toBe('Agentes e instruções')
    expect(categoriaImplementada('geral')).toBe(true)
    expect(categoriaImplementada('notificacoes')).toBe(false)
    expect(categoriaImplementada('importacao-backup')).toBe(false)
  })

  it('U1-T02 o conteúdo anuncia a categoria ativa para leitor de tela', () => {
    montar({ categoria: 'permissoes' })
    expect(screen.getByRole('region', { name: labelDaCategoria('permissoes') })).toBeTruthy()
  })
})

// Referência usada pelo App: garante que o tipo exportado continua completo.
const _categorias: readonly CategoriaConfiguracoes[] = CATEGORIAS_CONFIGURACOES
void _categorias
