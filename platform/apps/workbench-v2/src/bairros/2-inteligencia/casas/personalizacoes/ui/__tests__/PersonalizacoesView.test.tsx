// ============================================================================
// PersonalizacoesView.test.tsx — a tela REAL de Personalizações (FATIA 14, 2H v1).
//
// fetch falso no padrão de ConfigView.test.tsx: o GET devolve a visão central, o
// PUT ecoa o estado e o POST devolve a skill criada. O GET seguinte reflete o
// estado salvo, como o servidor faria — é isso que permite provar o recarregamento
// pós-salvamento sem duplicar a lógica de projeção na tela.
//
// O que está em jogo: a v1 tem EXATAMENTE três seções, tudo em português, o
// liga/desliga persiste, skill com erro não derruba a lista, e uma falha de rede
// aparece em vez de sumir em silêncio.
// ============================================================================
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ESTADO_PADRAO } from '../../contract'
import type { EstadoPersonalizacoes, FerramentaVisivel, Skill } from '../../contract'
import { PersonalizacoesView } from '../PersonalizacoesView'

/** As sete ferramentas reais, com os grupos do contrato. */
const FERRAMENTAS: FerramentaVisivel[] = [
  { id: 'ler', titulo: 'Ler arquivo', descricao: 'Lê o conteúdo de um arquivo.', grupo: 'leitura', ligada: true },
  { id: 'listar', titulo: 'Listar pasta', descricao: 'Lista os itens de uma pasta.', grupo: 'leitura', ligada: true },
  { id: 'buscar', titulo: 'Buscar', descricao: 'Busca texto nos arquivos.', grupo: 'leitura', ligada: true },
  { id: 'criar', titulo: 'Criar arquivo', descricao: 'Cria um arquivo novo.', grupo: 'escrita', ligada: true },
  { id: 'escrever', titulo: 'Escrever arquivo', descricao: 'Sobrescreve um arquivo.', grupo: 'escrita', ligada: true },
  { id: 'excluir', titulo: 'Excluir', descricao: 'Apaga um arquivo.', grupo: 'destrutiva', ligada: true },
  { id: 'executar', titulo: 'Executar comando', descricao: 'Roda um comando no terminal.', grupo: 'execucao', ligada: true },
]

function skill(parcial: Partial<Skill> & { nome: string }): Skill {
  return {
    id: `usuario:${parcial.nome}`,
    descricao: `Descrição de ${parcial.nome}.`,
    origem: 'usuario',
    pasta: `/home/dono/.agente_window/skills/${parcial.nome}`,
    arquivo: `/home/dono/.agente_window/skills/${parcial.nome}/SKILL.md`,
    estado: 'ok',
    corpo: `Corpo de ${parcial.nome}.`,
    ligada: true,
    ...parcial,
  } as Skill
}

interface Cenario {
  skills?: Skill[]
  estado?: EstadoPersonalizacoes
  raizProjeto?: string | null
  falhaGET?: boolean
}

function mockFetch(cenario: Cenario = {}) {
  const chamadas: { url: string; method: string; corpo?: Record<string, unknown> }[] = []
  const skills = [...(cenario.skills ?? [])]
  let estado: EstadoPersonalizacoes = cenario.estado ?? ESTADO_PADRAO
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    const corpo = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined
    chamadas.push({ url, method, corpo })

    if (method === 'PUT') {
      const parcial = corpo as Partial<EstadoPersonalizacoes>
      estado = {
        skillsDesligadas: Array.isArray(parcial.skillsDesligadas) ? parcial.skillsDesligadas : estado.skillsDesligadas,
        ferramentasDesligadas: Array.isArray(parcial.ferramentasDesligadas) ? parcial.ferramentasDesligadas : estado.ferramentasDesligadas,
      }
      return { ok: true, status: 200, json: async () => estado }
    }
    if (method === 'POST') {
      const pedido = corpo as { nome: string; descricao: string; corpo: string; origem: 'usuario' | 'projeto' }
      const criada = skill({
        nome: pedido.nome,
        descricao: pedido.descricao,
        corpo: pedido.corpo,
        origem: pedido.origem,
        id: `${pedido.origem}:${pedido.nome}`,
      })
      skills.push(criada)
      return { ok: true, status: 201, json: async () => ({ skill: criada }) }
    }
    if (cenario.falhaGET) {
      return { ok: false, status: 500, json: async () => ({ code: 'personalizacoes', message: 'O servidor não respondeu.' }) }
    }
    // O servidor projeta `ligada` a partir do estado; o falso faz o mesmo.
    return {
      ok: true,
      status: 200,
      json: async () => ({
        skills: skills.map((item) => ({ ...item, ligada: !estado.skillsDesligadas.includes(item.id) })),
        ferramentas: FERRAMENTAS.map((item) => ({ ...item, ligada: !estado.ferramentasDesligadas.includes(item.id) })),
        estado,
        raizProjeto: cenario.raizProjeto === undefined ? '/home/dono/projeto' : cenario.raizProjeto,
      }),
    }
  })
  vi.stubGlobal('fetch', fn)
  return { fn, chamadas, estadoAtual: () => estado }
}

function tela() {
  return screen.getByRole('region', { name: 'Personalizações' })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PersonalizacoesView · carga e escopo da v1', () => {
  it('carrega dados REAIS e mostra as três seções da v1, em português', async () => {
    const { chamadas } = mockFetch({ skills: [skill({ nome: 'commit' })] })
    render(<PersonalizacoesView />)
    const regiao = await waitFor(() => tela())
    expect(chamadas[0]?.method).toBe('GET')
    expect(chamadas[0]?.url).toBe('/api/personalizacoes')
    expect(within(regiao).getByText('Visão geral')).toBeInTheDocument()
    expect(within(regiao).getByText('Habilidades')).toBeInTheDocument()
    expect(within(regiao).getByText('Ferramentas')).toBeInTheDocument()
  })

  it('D182: categorias futuras indicam indisponibilidade sem simular configuração', async () => {
    const user = userEvent.setup()
    mockFetch({ skills: [skill({ nome: 'commit' })] })
    render(<PersonalizacoesView />)
    const regiao = await waitFor(() => tela())
    for (const rotulo of ['Agentes', 'Instruções', 'Hooks', 'Servidores MCP', 'Plugins']) {
      await user.click(within(regiao).getByRole('button', { name: rotulo }))
      expect(within(regiao).getByRole('status')).toHaveTextContent('ainda não está disponível')
      expect(within(regiao).queryByRole('button', { name: 'Nova habilidade' })).not.toBeInTheDocument()
    }
    expect(within(regiao).queryByRole('combobox', { name: 'Selecionar harness' })).not.toBeInTheDocument()
  })

  it('lista a skill real pelo nome de invocação e pela descrição', async () => {
    mockFetch({ skills: [skill({ nome: 'commit', descricao: 'Padroniza as mensagens de commit.' })] })
    render(<PersonalizacoesView />)
    const regiao = await waitFor(() => tela())
    expect(within(regiao).getByText('/commit')).toBeInTheDocument()
    expect(within(regiao).getByText('Padroniza as mensagens de commit.')).toBeInTheDocument()
    expect(within(regiao).getByText('Usuário')).toBeInTheDocument()
  })

  it('lista as sete ferramentas REAIS agrupadas, com os rótulos do contrato', async () => {
    mockFetch()
    render(<PersonalizacoesView />)
    const regiao = await waitFor(() => tela())
    for (const rotulo of ['Leitura', 'Escrita', 'Destrutiva', 'Execução']) {
      expect(within(regiao).getByText(rotulo), rotulo).toBeInTheDocument()
    }
    expect(within(regiao).getByText('Excluir')).toBeInTheDocument()
    expect(within(regiao).getByText('Executar comando')).toBeInTheDocument()
  })

  it('manda a identidade da conversa e NUNCA um caminho de pasta', async () => {
    const { chamadas } = mockFetch()
    render(<PersonalizacoesView alvo={{ sessionId: 's1', chatId: 'c1' }} />)
    await waitFor(() => tela())
    const url = String(chamadas[0]?.url)
    expect(url).toContain('sessionId=s1')
    expect(url).toContain('chatId=c1')
    expect(url).not.toMatch(/\/home|path=|raiz=/)
  })

  it('sem raiz de projeto, a Visão geral DIZ que não resolveu, e o escopo de projeto fica indisponível', async () => {
    mockFetch({ raizProjeto: null })
    render(<PersonalizacoesView />)
    const regiao = await waitFor(() => tela())
    expect(within(regiao).getByText('Não resolve — só habilidades de usuário')).toBeInTheDocument()
  })
})

describe('PersonalizacoesView · liga/desliga persiste (critérios 2, 4 e 6)', () => {
  it('desligar uma habilidade salva e a tela volta mostrando-a desligada', async () => {
    const user = userEvent.setup()
    const { chamadas, estadoAtual } = mockFetch({ skills: [skill({ nome: 'commit' })] })
    render(<PersonalizacoesView />)
    const regiao = await waitFor(() => tela())

    await user.click(within(regiao).getByRole('button', { name: 'Habilidades' }))
    await user.click(within(regiao).getByRole('button', { name: 'Desligar commit' }))

    const put = chamadas.find((chamada) => chamada.method === 'PUT')
    expect(put?.url).toBe('/api/personalizacoes/estado')
    expect(put?.corpo).toEqual({ skillsDesligadas: ['usuario:commit'] })
    expect(estadoAtual().skillsDesligadas).toEqual(['usuario:commit'])

    await waitFor(() => expect(within(regiao).getByRole('button', { name: 'Ligar commit' })).toBeInTheDocument())
    expect(within(regiao).getByText('Habilidade commit desligada.')).toBeInTheDocument()
  })

  it('ligar de volta remove o id da lista de desligadas, sem tocar nas ferramentas', async () => {
    const user = userEvent.setup()
    const { chamadas } = mockFetch({
      skills: [skill({ nome: 'commit' })],
      estado: { skillsDesligadas: ['usuario:commit'], ferramentasDesligadas: ['excluir'] },
    })
    render(<PersonalizacoesView />)
    const regiao = await waitFor(() => tela())

    await user.click(within(regiao).getByRole('button', { name: 'Habilidades' }))
    await user.click(within(regiao).getByRole('button', { name: 'Ligar commit' }))

    const put = chamadas.find((chamada) => chamada.method === 'PUT')
    // O salvamento é PARCIAL: só o eixo que mudou. O eixo ausente é preservado
    // pelo servidor, então a tela não pode mandar uma lista de ferramentas aqui.
    expect(put?.corpo).toEqual({ skillsDesligadas: [] })
    await waitFor(() => expect(within(regiao).getByRole('button', { name: 'Desligar commit' })).toBeInTheDocument())
  })

  it('desligar a ferramenta excluir salva só o eixo de ferramentas', async () => {
    const user = userEvent.setup()
    const { chamadas } = mockFetch({ skills: [skill({ nome: 'commit' })] })
    render(<PersonalizacoesView />)
    const regiao = await waitFor(() => tela())

    await user.click(within(regiao).getByRole('button', { name: 'Ferramentas' }))
    await user.click(within(regiao).getByRole('button', { name: 'Desligar Excluir' }))

    const put = chamadas.find((chamada) => chamada.method === 'PUT')
    expect(put?.corpo).toEqual({ ferramentasDesligadas: ['excluir'] })
    await waitFor(() => expect(within(regiao).getByRole('button', { name: 'Ligar Excluir' })).toBeInTheDocument())
  })

  it('o liga/desliga por GRUPO inteiro desliga as três ferramentas de leitura', async () => {
    const user = userEvent.setup()
    const { chamadas } = mockFetch()
    render(<PersonalizacoesView />)
    const regiao = await waitFor(() => tela())

    await user.click(within(regiao).getByRole('button', { name: 'Ferramentas' }))
    await user.click(within(regiao).getByRole('button', { name: 'Desligar o grupo Leitura' }))

    const put = chamadas.find((chamada) => chamada.method === 'PUT')
    expect(put?.corpo).toEqual({ ferramentasDesligadas: ['ler', 'listar', 'buscar'] })
    await waitFor(() => expect(within(regiao).getByRole('button', { name: 'Ligar Ler arquivo' })).toBeInTheDocument())
    expect(within(regiao).getByText('Grupo Leitura desligado por inteiro.')).toBeInTheDocument()
  })

  it('com o grupo já desligado, o botão oferece LIGAR o grupo e religa tudo', async () => {
    const user = userEvent.setup()
    const { chamadas } = mockFetch({ estado: { skillsDesligadas: [], ferramentasDesligadas: ['ler', 'listar', 'buscar'] } })
    render(<PersonalizacoesView />)
    const regiao = await waitFor(() => tela())

    await user.click(within(regiao).getByRole('button', { name: 'Ferramentas' }))
    await user.click(within(regiao).getByRole('button', { name: 'Ligar o grupo Leitura' }))

    const put = chamadas.find((chamada) => chamada.method === 'PUT')
    expect(put?.corpo).toEqual({ ferramentasDesligadas: [] })
  })

  it('a Visão geral conta o que está ligado de verdade', async () => {
    mockFetch({
      skills: [skill({ nome: 'commit' }), skill({ nome: 'revisar', id: 'usuario:revisar' })],
      estado: { skillsDesligadas: ['usuario:commit'], ferramentasDesligadas: ['excluir'] },
    })
    render(<PersonalizacoesView />)
    const regiao = await waitFor(() => tela())
    expect(within(regiao).getByText('1 de 2')).toBeInTheDocument()
    expect(within(regiao).getByText('6 de 7')).toBeInTheDocument()
  })
})

describe('PersonalizacoesView · criar habilidade (critério 2)', () => {
  it('cria pelo formulário, salva no servidor e a skill aparece na lista', async () => {
    const user = userEvent.setup()
    const { chamadas } = mockFetch()
    render(<PersonalizacoesView />)
    const regiao = await waitFor(() => tela())
    expect(within(regiao).queryByText('/minha-skill')).not.toBeInTheDocument()

    await user.click(within(regiao).getByRole('button', { name: 'Nova habilidade' }))
    const form = within(regiao).getByRole('form', { name: 'Criar habilidade' })
    await user.type(within(form).getByLabelText(/Nome \(usado na invocação/), 'minha-skill')
    await user.type(within(form).getByLabelText(/Descrição \(uma linha\)/), 'Faz uma coisa útil.')
    await user.type(within(form).getByLabelText('Instrução'), 'Sempre faça X antes de Y.')
    await user.click(within(form).getByRole('button', { name: 'Criar' }))

    const post = chamadas.find((chamada) => chamada.method === 'POST')
    expect(post?.url).toBe('/api/personalizacoes/skills')
    expect(post?.corpo).toMatchObject({ nome: 'minha-skill', descricao: 'Faz uma coisa útil.', origem: 'usuario' })
    expect(String(post?.corpo?.corpo)).toContain('Sempre faça X antes de Y.')

    await waitFor(() => expect(within(regiao).getByText('/minha-skill')).toBeInTheDocument())
    expect(within(regiao).getByText('Habilidade minha-skill criada em Usuário.')).toBeInTheDocument()
  })

  it('erro do servidor ao criar aparece na tela, em português, e o formulário continua aberto', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      if (method === 'POST') {
        return { ok: false, status: 409, json: async () => ({ code: 'personalizacoes', message: 'Já existe uma habilidade com esse nome.' }) }
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ skills: [], ferramentas: FERRAMENTAS, estado: ESTADO_PADRAO, raizProjeto: '/home/dono/projeto' }),
      }
    }))
    render(<PersonalizacoesView />)
    const regiao = await waitFor(() => tela())

    await user.click(within(regiao).getByRole('button', { name: 'Nova habilidade' }))
    const form = within(regiao).getByRole('form', { name: 'Criar habilidade' })
    await user.type(within(form).getByLabelText(/Nome \(usado na invocação/), 'commit')
    await user.type(within(form).getByLabelText(/Descrição \(uma linha\)/), 'Duplicada.')
    await user.type(within(form).getByLabelText('Instrução'), 'Corpo.')
    await user.click(within(form).getByRole('button', { name: 'Criar' }))

    await waitFor(() => expect(within(regiao).getByRole('alert')).toHaveTextContent('Já existe uma habilidade com esse nome.'))
    expect(within(regiao).getByRole('form', { name: 'Criar habilidade' })).toBeInTheDocument()
  })
})

describe('PersonalizacoesView · robustez (RNF14-2 e RF14-3)', () => {
  it('skill com erro mostra "com erro" com o motivo, e a lista continua de pé', async () => {
    mockFetch({
      skills: [
        skill({ nome: 'boa' }),
        skill({ nome: 'torta', estado: 'com_erro', motivoErro: 'O frontmatter não tem a chave name.', corpo: '', ligada: false }),
      ],
    })
    render(<PersonalizacoesView />)
    const regiao = await waitFor(() => tela())
    expect(within(regiao).getByText('/boa')).toBeInTheDocument()
    expect(within(regiao).getByText('/torta')).toBeInTheDocument()
    expect(within(regiao).getAllByText('com erro').length).toBeGreaterThan(0)
    expect(within(regiao).getByText(/O frontmatter não tem a chave name\./)).toBeInTheDocument()
    // A contagem é a das que CHEGAM ao agente: íntegra E ligada. A skill com erro
    // não conta como ativa, e a linha ao lado diz quantas estão com erro — o dono
    // não fica com a impressão de que tem duas habilidades funcionando.
    expect(within(regiao).getByText('Habilidades ativas')).toBeInTheDocument()
    expect(within(regiao).getByText('1 de 2')).toBeInTheDocument()
    expect(within(regiao).getByText('Habilidades com erro')).toBeInTheDocument()
  })

  it('falha ao CARREGAR vira faixa de erro com nova tentativa, e a tela não quebra', async () => {
    const user = userEvent.setup()
    const { fn } = mockFetch({ falhaGET: true })
    render(<PersonalizacoesView />)
    const regiao = await waitFor(() => tela())
    const alerta = within(regiao).getByRole('alert')
    expect(alerta).toHaveTextContent('O servidor não respondeu.')

    // A nova tentativa existe e é acionável; com o fetch ainda falho, o erro fica.
    await user.click(within(alerta).getByRole('button', { name: 'Tentar novamente' }))
    await waitFor(() => expect(fn.mock.calls.length).toBeGreaterThan(1))
    expect(within(regiao).getByRole('alert')).toHaveTextContent('O servidor não respondeu.')
  })

  it('o filtro restringe habilidades e ferramentas sem recarregar nada do servidor', async () => {
    const user = userEvent.setup()
    const { fn } = mockFetch({ skills: [skill({ nome: 'commit' }), skill({ nome: 'revisar', id: 'usuario:revisar' })] })
    render(<PersonalizacoesView />)
    const regiao = await waitFor(() => tela())
    const antes = fn.mock.calls.length

    await user.type(within(regiao).getByLabelText('Filtrar personalizações'), 'exclu')

    expect(within(regiao).queryByText('/commit')).not.toBeInTheDocument()
    expect(within(regiao).getByText('Excluir')).toBeInTheDocument()
    expect(fn.mock.calls.length).toBe(antes)
  })
})

it('D181: navegação abre uma seção por vez e a visão geral oferece cartões funcionais', async () => {
  const user = userEvent.setup(); mockFetch({ skills: [skill({ nome: 'commit' })] });
  render(<PersonalizacoesView />);
  await screen.findByRole('button', { name: 'Gerenciar habilidades' });
  const region = tela();
  expect(within(region).getByText('Habilidades ativas')).toBeVisible();
  await user.click(within(region).getByRole('button', { name: 'Gerenciar habilidades' }));
  expect(within(region).getByText('/commit')).toBeVisible();
  expect(within(region).getByText('Habilidades ativas')).not.toBeVisible();
  await user.click(within(region).getByRole('button', { name: 'Ferramentas' }));
  expect(within(region).getByRole('button', { name: 'Desligar Excluir' })).toBeVisible();
  expect(within(region).getByText('/commit')).not.toBeVisible();
});
