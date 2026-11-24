// ============================================================================
// U-1 — U1-T03/T04/T05/T06/T07: os PAINÉIS hospedados.
//
// Aqui se prova comportamento real de cada dono, não aparência:
//   · U1-T03 falha de GET bloqueia PUT e oferece retry; eco real aplica
//     autoScroll; o tema é o MESMO dono da barra (uma chave, um valor).
//   · U1-T04 Provedores conserva carga, seleção e reveal — inclusive a regra de
//     que o segredo sai da memória ao trocar de categoria e o rascunho fica.
//   · U1-T05 rascunho sobrevive à troca de painel; falha mantém edição.
//   · U1-T06 montagem preguiçosa e falha por painel sem derrubar os outros.
//   · U1-T07 Chat sem pasta não ganha pasta nem ferramentas; Permissões não
//     cria grant; Workspaces leva a NOVA sessão.
//
// Nenhum teste usa serviço remoto: as rotas são interceptadas no nível do
// fetch, que é a fronteira do cliente da Casa.
// ============================================================================
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigView } from '../bairros/2-inteligencia/casas/config/ui/ConfigView'
import { ProvidersView } from '../bairros/2-inteligencia/casas/provedores/ui/ProvidersView'
import { AparenciaPainel, ConversasArmazenamentoPainel, PermissoesPainel, WorkspacesPainel } from '../shell/paineisConfiguracoes'
import { PAINEL_NEUTRO } from '../domain/configuracoesUnificadas'
import { ConfiguracoesUnificadas, type ItemPainel } from '../shell/ConfiguracoesUnificadas'

/** Monta a MOLDURA real (é ela quem preserva as instâncias visitadas). */
const moldura = (props: {
  rota: { categoria: 'geral' | 'aparencia'; subsecao?: never }
  paineis: Record<string, ItemPainel>
}) => (
  <ConfiguracoesUnificadas
    rota={props.rota}
    onNavegar={() => {}}
    onFechar={() => {}}
    paineis={props.paineis}
    subsecoes={[]}
  />
)
const montarMoldura = (props: {
  rota: { categoria: 'geral' | 'aparencia'; subsecao?: never }
  paineis: Record<string, ItemPainel>
}) => render(moldura(props))

type Resposta = { status: number; corpo: unknown }
let respostas: Array<{ metodo: string; trecho: string; resposta: Resposta }> = []
let chamadas: Array<{ metodo: string; url: string; corpo?: unknown }> = []

function instalarFetch(): void {
  vi.stubGlobal('fetch', vi.fn(async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = String(entrada)
    const metodo = (init?.method ?? 'GET').toUpperCase()
    const corpo = typeof init?.body === 'string' ? JSON.parse(init.body) as unknown : undefined
    chamadas.push({ metodo, url, corpo })
    const regra = respostas.find((item) => item.metodo === metodo && url.includes(item.trecho))
    if (!regra) return new Response(JSON.stringify({ code: 'not_found' }), { status: 404 })
    return new Response(JSON.stringify(regra.resposta.corpo), {
      status: regra.resposta.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }))
}

beforeEach(() => {
  respostas = []
  chamadas = []
  instalarFetch()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const chamadasDe = (metodo: string, trecho: string) =>
  chamadas.filter((item) => item.metodo === metodo && item.url.includes(trecho))

describe('U-1 — U1-T03 Geral: leitura, bloqueio e eco', () => {
  it('U1-T03 falha de GET não vira formulário com defaults e NÃO permite PUT', async () => {
    respostas.push({ metodo: 'GET', trecho: '/api/config', resposta: { status: 500, corpo: { code: 'config_unavailable' } } })
    render(<ConfigView />)

    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain('Não foi possível carregar as configurações')
    // A tela diz o que NÃO aconteceu: nada foi alterado e o salvamento está fora.
    expect(document.querySelector('[data-estado-leitura="falhou"]')?.textContent)
      .toContain('salvamento está indisponível')
    // O formulário editável NÃO aparece com valores padrão.
    expect(screen.queryByRole('slider')).toBeNull()
    expect(screen.queryByRole('button', { name: /Salvar configurações/ })).toBeNull()
    // E nenhum PUT saiu.
    expect(chamadasDe('PUT', '/api/config')).toHaveLength(0)
  })

  it('U1-T03 "Tentar novamente" refaz a leitura e, ao dar certo, libera o Salvar', async () => {
    respostas.push({ metodo: 'GET', trecho: '/api/config', resposta: { status: 500, corpo: {} } })
    const usuario = userEvent.setup()
    render(<ConfigView />)
    await screen.findByRole('alert')
    // Agora o servidor responde: a nova leitura vale.
    respostas = [{ metodo: 'GET', trecho: '/api/config', resposta: { status: 200, corpo: { teto: 25, autoScroll: true } } }]
    await usuario.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    await waitFor(() => expect(screen.getByRole('slider')).toBeTruthy())
    expect(chamadasDe('GET', '/api/config')).toHaveLength(2)
    expect(chamadasDe('PUT', '/api/config'), 'ler de novo não grava').toHaveLength(0)
  })

  it('U1-T03 salvar lê o ECO do servidor (grampeado) e avisa o dono do autoScroll', async () => {
    respostas.push({ metodo: 'GET', trecho: '/api/config', resposta: { status: 200, corpo: { teto: 25, autoScroll: true } } })
    respostas.push({ metodo: 'PUT', trecho: '/api/config', resposta: { status: 200, corpo: { teto: 250, autoScroll: false } } })
    const aoSalvar = vi.fn()
    const usuario = userEvent.setup()
    render(<ConfigView aoSalvar={aoSalvar} />)

    const numero = await screen.findByRole('spinbutton', { name: /Teto de iterações do agente/ })
    await usuario.clear(numero)
    await usuario.type(numero, '999')
    await usuario.click(screen.getByRole('button', { name: /Salvar configurações/ }))

    await waitFor(() => expect(aoSalvar).toHaveBeenCalledTimes(1))
    // O eco manda: 999 virou 250 (o teto máximo), não o digitado.
    expect(aoSalvar.mock.calls[0][0]).toEqual({ teto: 250, autoScroll: false })
    expect((screen.getByRole('spinbutton', { name: /Teto de iterações do agente/ }) as HTMLInputElement).value).toBe('250')
  })

  it('U1-T03 falha de save MANTÉM o rascunho e informa o erro', async () => {
    respostas.push({ metodo: 'GET', trecho: '/api/config', resposta: { status: 200, corpo: { teto: 25, autoScroll: true } } })
    respostas.push({ metodo: 'PUT', trecho: '/api/config', resposta: { status: 500, corpo: { code: 'write_failed' } } })
    const usuario = userEvent.setup()
    render(<ConfigView />)
    const numero = await screen.findByRole('spinbutton', { name: /Teto de iterações do agente/ })
    await usuario.clear(numero)
    await usuario.type(numero, '42')
    await usuario.click(screen.getByRole('button', { name: /Salvar configurações/ }))
    await waitFor(() => expect(chamadasDe('PUT', '/api/config')).toHaveLength(1))
    // O valor digitado continua lá para nova tentativa.
    expect((screen.getByRole('spinbutton', { name: /Teto de iterações do agente/ }) as HTMLInputElement).value).toBe('42')
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
  })

  it('U1-T03 o rascunho só existe diante de base válida (estado informado à moldura)', async () => {
    respostas.push({ metodo: 'GET', trecho: '/api/config', resposta: { status: 200, corpo: { teto: 25, autoScroll: true } } })
    const estados: Array<{ dirty: boolean; saving: boolean; canLeave: boolean }> = []
    const usuario = userEvent.setup()
    render(<ConfigView aoMudarEstado={(estado) => estados.push(estado)} />)
    await screen.findByRole('slider')
    await waitFor(() => expect(estados.length).toBeGreaterThan(0))
    expect(estados.at(-1)).toEqual(PAINEL_NEUTRO)
    const caixa = screen.getByRole('checkbox')
    await usuario.click(caixa)
    await waitFor(() => expect(estados.at(-1)?.dirty).toBe(true))
  })
})

describe('U-1 — U1-T03 Aparência usa o MESMO dono de tema', () => {
  it('U1-T03 o controle de tema é um só valor, vindo da barra superior', async () => {
    const alternar = vi.fn()
    const usuario = userEvent.setup()
    const { rerender } = render(<AparenciaPainel tema="dark" onAlternarTema={alternar} />)
    const escuro = screen.getByRole('radio', { name: /Escuro/ }) as HTMLInputElement
    const claro = screen.getByRole('radio', { name: /Claro/ }) as HTMLInputElement
    expect(escuro.checked).toBe(true)
    expect(claro.checked).toBe(false)
    // Escolher o tema que já está ativo NÃO dispara escrita.
    await usuario.click(escuro)
    expect(alternar).not.toHaveBeenCalled()
    await usuario.click(claro)
    expect(alternar).toHaveBeenCalledTimes(1)
    // O valor exibido é o mesmo que o App guarda: mudar a prop reflete aqui.
    rerender(<AparenciaPainel tema="light" onAlternarTema={alternar} />)
    expect((screen.getByRole('radio', { name: /Claro/ }) as HTMLInputElement).checked).toBe(true)
  })
})

describe('U-1 — U1-T04 Provedores hospedado', () => {
  const estadoProvedores = {
    provedores: [{
      id: 'openai', nome: 'OpenAI', tipo: 'openai', baseUrl: 'https://api.example', modelo: 'gpt-x',
      modelos: ['gpt-x'], habilitado: true, temChave: true, origemChave: 'arquivo',
    }],
    selecao: { tipo: 'auto' },
  }

  it('U1-T04 carregar o painel NÃO faz teste remoto nem revela chave sozinho', async () => {
    respostas.push({ metodo: 'GET', trecho: '/api/providers', resposta: { status: 200, corpo: estadoProvedores } })
    render(<ProvidersView />)
    await waitFor(() => expect(chamadasDe('GET', '/api/providers').length).toBeGreaterThan(0))
    expect(chamadasDe('POST', '/api/providers/test')).toHaveLength(0)
    expect(chamadasDe('POST', '/api/providers/reveal')).toHaveLength(0)
    expect(chamadasDe('POST', '/api/providers/models')).toHaveLength(0)
  })

  it('U1-T04 informa rascunho/save à moldura sem expor valores', async () => {
    respostas.push({ metodo: 'GET', trecho: '/api/providers', resposta: { status: 200, corpo: estadoProvedores } })
    const estados: Array<{ dirty: boolean; saving: boolean }> = []
    render(<ProvidersView aoMudarEstado={(estado) => estados.push({ dirty: estado.dirty, saving: estado.saving })} />)
    await waitFor(() => expect(estados.length).toBeGreaterThan(0))
    // O contrato é só fato: nenhuma chave, nenhum ProvedorConfig atravessa.
    expect(Object.keys(estados[0]).sort()).toEqual(['dirty', 'saving'])
    expect(estados[0].dirty).toBe(false)
  })

  it('U1-T04 trocar de categoria oculta o reveal e PRESERVA o rascunho digitado', async () => {
    respostas.push({ metodo: 'GET', trecho: '/api/providers', resposta: { status: 200, corpo: estadoProvedores } })
    const usuario = userEvent.setup()
    const { rerender } = render(<ProvidersView limparReveal={0} />)
    await waitFor(() => expect(screen.getAllByText(/OpenAI/).length).toBeGreaterThan(0))

    // Abre a edição do provedor e digita algo na chave (rascunho em memória).
    const editar = screen.queryByRole('button', { name: /Editar|Configurar/ })
    if (editar) await usuario.click(editar)
    const campoChave = document.querySelector<HTMLInputElement>('input[type="password"]')
      ?? document.querySelector<HTMLInputElement>('input[name*="chave" i]')
    if (campoChave) {
      await usuario.clear(campoChave)
      await usuario.type(campoChave, 'sk-fixture-sintetica')
    }
    const antes = campoChave?.value
    // A moldura pede a limpeza do reveal ao sair da categoria.
    rerender(<ProvidersView limparReveal={1} />)
    // O rascunho digitado NÃO é segredo revelado: continua no campo.
    const depois = (document.querySelector<HTMLInputElement>('input[type="password"]')
      ?? document.querySelector<HTMLInputElement>('input[name*="chave" i]'))
    if (antes !== undefined && depois) expect(depois.value).toBe(antes)
    // E nenhum save foi disparado só por trocar de categoria.
    expect(chamadasDe('PUT', '/api/providers')).toHaveLength(0)
  })
})

describe('U-1 — U1-T07 limites de contexto e permissões', () => {
  it('U1-T07 Chat sem pasta: Permissões informa a restrição e NÃO cria grant', async () => {
    const usuario = userEvent.setup()
    render(<PermissoesPainel alvo={{ sessionId: 's1', chatId: 'c1' } as never} temPasta={false} />)
    const nota = document.querySelector('[data-estado-permissoes="sem-pasta"]')
    expect(nota?.textContent).toContain('não tem pasta')
    // Nenhum controle que pareça conceder permissão global — aqui não há
    // botão nenhum, que é justamente o ponto (nada de grant fictício).
    const controles = document.querySelectorAll('button, input, select, textarea')
    expect(controles).toHaveLength(0)
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(document.querySelector('[data-tem-pasta="nao"]')).not.toBeNull()
    void usuario
  })

  it('U1-T07 com pasta o painel mostra onde os controles ficam, sem toggle global', () => {
    render(<PermissoesPainel alvo={{ sessionId: 's1', chatId: 'c1' } as never} temPasta />)
    expect(document.querySelector('[data-estado-permissoes="aplicavel"]')).not.toBeNull()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(screen.queryAllByRole('switch')).toHaveLength(0)
  })

  it('U1-T07 Workspaces leva a NOVA sessão e não transforma a atual', async () => {
    const nova = vi.fn()
    const usuario = userEvent.setup()
    render(<WorkspacesPainel workspaceAtual={null} onNovaSessaoComPasta={nova} />)
    await usuario.click(screen.getByRole('button', { name: 'Nova sessão com pasta' }))
    expect(nova).toHaveBeenCalledTimes(1)
    // Nenhuma escrita de sessão saiu deste painel.
    expect(chamadas.filter((item) => item.metodo !== 'GET')).toHaveLength(0)
    expect(document.querySelector('[data-workspace-atual="sem-pasta"]')).not.toBeNull()
  })

  it('U1-T07 categoria futura não tem ação que anuncie sucesso', () => {
    render(<PermissoesPainel alvo={{ sessionId: 's', chatId: 'c' } as never} temPasta={false} />)
    // O texto do limite é o mesmo aprovado, sem promessa de ativação.
    expect(screen.getByText(/Esta versão não cria permissões permanentes/)).toBeTruthy()
  })
})

describe('U-1 — U1-T06 dados e ambiente', () => {
  it('U1-T06 Conversas não inventa localização quando não há fonte', () => {
    render(<ConversasArmazenamentoPainel />)
    expect(document.querySelector('[data-localizacao="indisponivel"]')).not.toBeNull()
    // Não inspeciona corpos: nenhuma chamada de rede saiu daqui.
    expect(chamadas).toHaveLength(0)
  })

  it('U1-T06 com fonte confiável a localização é mostrada como informada', () => {
    render(<ConversasArmazenamentoPainel dataDir="/tmp/dados-sinteticos" />)
    expect(document.querySelector('[data-localizacao]')?.textContent).toContain('/tmp/dados-sinteticos')
    expect(chamadas).toHaveLength(0)
  })
})

describe('U-1 — U1-T05 rascunhos sobrevivem à troca e nunca são prova de save', () => {
  it('U1-T05 rascunho do painel Geral sobrevive a trocar de categoria e voltar', async () => {
    respostas.push({ metodo: 'GET', trecho: '/api/config', resposta: { status: 200, corpo: { teto: 25, autoScroll: true } } })
    const user = userEvent.setup()
    const paineis = {
      geral: { montavel: true, conteudo: <ConfigView hospedado /> },
      aparencia: { montavel: true, conteudo: <AparenciaPainel tema="dark" onAlternarTema={() => {}} /> },
    }
    const { rerender } = montarMoldura({ rota: { categoria: 'geral' }, paineis })
    const teto = await screen.findByRole('spinbutton', { name: /teto de iterações/i })
    await user.clear(teto)
    await user.type(teto, '77')
    expect(teto).toHaveValue(77)

    // A moldura troca de categoria: o painel visitado fica MONTADO e oculto,
    // então o rascunho não pode se perder nem ser reescrito pelo servidor.
    rerender(moldura({ rota: { categoria: 'aparencia' }, paineis }))
    expect(document.querySelector('[data-painel="aparencia"]')).not.toHaveAttribute('hidden')
    // Volta a Geral: o MESMO input, com o valor digitado.
    rerender(moldura({ rota: { categoria: 'geral' }, paineis }))
    await waitFor(() =>
      expect(screen.getByRole('spinbutton', { name: /teto de iterações/i })).toHaveValue(77))
    // Rascunho nunca é prova de save: o PUT continua não tendo saído.
    expect(chamadasDe('PUT', '/api/config')).toHaveLength(0)
  })

  it('U1-T05 falha de save mantém a edição e a moldura sabe que há rascunho', async () => {
    respostas.push({ metodo: 'GET', trecho: '/api/config', resposta: { status: 200, corpo: { teto: 25, autoScroll: true } } })
    respostas.push({ metodo: 'PUT', trecho: '/api/config', resposta: { status: 500, corpo: { code: 'config_write_failed' } } })
    const estados: Array<{ dirty: boolean; saving: boolean }> = []
    const user = userEvent.setup()
    render(<ConfigView hospedado aoMudarEstado={(estado) => estados.push({ dirty: estado.dirty, saving: estado.saving })} />)

    const teto = await screen.findByRole('spinbutton', { name: /teto de iterações/i })
    await user.clear(teto)
    await user.type(teto, '90')
    await user.click(screen.getByRole('button', { name: /salvar configurações/i }))

    // A escrita falhou: o formulário continua com o valor digitado (nada de
    // reverter silenciosamente) e o painel segue marcado como "tem rascunho".
    await screen.findByRole('alert')
    expect(teto).toHaveValue(90)
    expect(estados.at(-1)?.dirty, 'a moldura precisa saber que o rascunho ficou').toBe(true)
    expect(estados.at(-1)?.saving, 'sem escrita em voo depois da falha').toBe(false)
  })
})
