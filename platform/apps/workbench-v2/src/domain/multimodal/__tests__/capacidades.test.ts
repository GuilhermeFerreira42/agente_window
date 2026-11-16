// ============================================================================
// MM-0 — testes de CAPACIDADE: decisão efetiva na ordem obrigatória,
// identidade exata, evidência stale/manual e interseção de pool (T10–T19).
// ============================================================================

import { describe, expect, it } from 'vitest'
import {
  avaliarCapacidadeEfetiva,
  comporCapacidadeDePool,
  mesmaIdentidadeMultimodal,
  validarRestricaoMedida,
} from '../capacidades'
import type {
  ChaveCapacidade,
  DeclaracaoCodecLocal,
  DestinoAvaliacaoPool,
  EntradaAvaliacaoCapacidade,
  EvidenciaCapacidade,
  IdentidadeAlvoMultimodal,
  OrigemEvidencia,
  PerfilMultimodal,
  PedidoCapacidade,
  RestricaoMedida,
} from '../contrato'

const alvo: IdentidadeAlvoMultimodal = {
  providerId: 'prov-1',
  modelId: 'modelo-x',
  endpointIdentity: 'ep-opaco-1',
  protocolo: 'openai-chat',
  apiRevision: 'rev-api-1',
  configRevision: 'rev-cfg-1',
  adapterRevision: 'rev-ad-1',
}

const chave: ChaveCapacidade = {
  operacao: 'gerar-imagem',
  direcao: 'saida',
  modalidade: 'imagem',
  representacao: 'inline-base64',
}

const pedido: PedidoCapacidade = {
  operacao: chave.operacao,
  direcao: chave.direcao,
  modalidade: chave.modalidade,
  representacao: chave.representacao,
}

const codecOk: DeclaracaoCodecLocal = { chave, implementado: true }
const codecAusente: DeclaracaoCodecLocal = { chave, implementado: false }

function evidencia(
  parcial: { estado: EvidenciaCapacidade['estado']; origem?: OrigemEvidencia; sobre?: IdentidadeAlvoMultimodal },
): EvidenciaCapacidade {
  return {
    alvo: parcial.sobre ?? alvo,
    estado: parcial.estado,
    origem: parcial.origem ?? 'api',
    revisao: 'fonte-1',
    consultadaEm: '2026-11-16T12:00:00.000Z',
  }
}

function perfil(
  evidencias: readonly EvidenciaCapacidade[],
  restricoes?: readonly RestricaoMedida[],
  sobre: IdentidadeAlvoMultimodal = alvo,
): PerfilMultimodal {
  return { alvo: sobre, entradas: [{ chave, evidencias, restricoes }] }
}

function avaliar(entrada: {
  alvo?: IdentidadeAlvoMultimodal
  pedido?: PedidoCapacidade
  codec?: DeclaracaoCodecLocal
  perfil?: PerfilMultimodal
}) {
  return avaliarCapacidadeEfetiva({
    alvo: entrada.alvo ?? alvo,
    pedido: entrada.pedido ?? pedido,
    codec: entrada.codec ?? codecOk,
    perfil: entrada.perfil,
  })
}

describe('MM0-T10 — perfil ausente ou evidência desconhecida não habilitam', () => {
  it('sem perfil: desconhecida com motivo explícito', () => {
    const resultado = avaliar({ perfil: undefined })
    expect(resultado.estado).toBe('desconhecida')
    expect(resultado.motivos).toContain('perfil-ausente')
  })

  it('perfil com evidência de estado desconhecida não permite a modalidade', () => {
    const resultado = avaliar({ perfil: perfil([evidencia({ estado: 'desconhecida' })]) })
    expect(resultado.estado).toBe('desconhecida')
    expect(resultado.motivos).toContain('evidencia-insuficiente')
    expect(resultado.estado).not.toBe('disponivel')
  })

  it('perfil sem entrada para a combinação pedida é desconhecido', () => {
    const perfilVazio: PerfilMultimodal = { alvo, entradas: [] }
    const resultado = avaliar({ perfil: perfilVazio })
    expect(resultado.estado).toBe('desconhecida')
    expect(resultado.motivos).toContain('evidencia-ausente')
  })
})

describe('MM0-T11 — evidência positiva remota + codec ausente = indisponível', () => {
  it('documentação/api positiva não habilita parser/codec inexistente', () => {
    const resultado = avaliar({
      perfil: perfil([evidencia({ estado: 'suportada', origem: 'documentacao' })]),
      codec: codecAusente,
    })
    expect(resultado.estado).toBe('indisponivel')
    expect(resultado.motivos).toContain('codec-ausente')
  })

  it('evidência negativa aplicável vence mesmo com codec implementado', () => {
    const resultado = avaliar({
      perfil: perfil([
        evidencia({ estado: 'suportada', origem: 'api' }),
        evidencia({ estado: 'nao-suportada', origem: 'api' }),
      ]),
      codec: codecOk,
    })
    expect(resultado.estado).toBe('indisponivel')
    expect(resultado.motivos).toContain('evidencia-negativa')
  })
})

describe('MM0-T12 — direção, operação, representação e protocolo não são intercambiáveis', () => {
  it('suporte de entrada não habilita saída', () => {
    // O pedido segue como SAÍDA; só existe suporte/codec para ENTRADA.
    const entrada: EntradaAvaliacaoCapacidade = {
      alvo,
      pedido,
      codec: { chave: { ...chave, direcao: 'entrada' }, implementado: true },
      perfil: {
        alvo,
        entradas: [
          {
            chave: { ...chave, direcao: 'entrada' },
            evidencias: [evidencia({ estado: 'suportada' })],
          },
        ],
      },
    }
    const resultado = avaliarCapacidadeEfetiva(entrada)
    expect(resultado.estado).toBe('desconhecida')
    expect(resultado.motivos).toContain('evidencia-ausente')
  })

  it('conversar não habilita gerar-imagem', () => {
    const resultado = avaliar({ pedido: { ...pedido, operacao: 'conversar' } })
    expect(resultado.estado).toBe('desconhecida')
  })

  it('representação uri não habilita inline-base64', () => {
    const entrada: EntradaAvaliacaoCapacidade = {
      alvo,
      pedido,
      codec: codecOk,
      perfil: {
        alvo,
        entradas: [
          {
            chave: { ...chave, representacao: 'uri' },
            evidencias: [evidencia({ estado: 'suportada' })],
          },
        ],
      },
    }
    const resultado = avaliarCapacidadeEfetiva(entrada)
    expect(resultado.estado).toBe('desconhecida')
    expect(resultado.motivos).toContain('evidencia-ausente')
  })

  it('protocolo diferente invalida o perfil do outro protocolo', () => {
    const outro: IdentidadeAlvoMultimodal = { ...alvo, protocolo: 'anthropic' }
    const resultado = avaliar({ alvo: outro, perfil: perfil([evidencia({ estado: 'suportada' })]) })
    expect(resultado.estado).toBe('desconhecida')
    expect(resultado.motivos).toContain('identidade-divergente')
  })
})

describe('MM0-T13 — trocar identidade/revisão invalida evidência antiga', () => {
  it('mesmaIdentidadeMultimodal: cada campo isolado quebra a igualdade (sem normalização)', () => {
    const mutacoes: Array<[string, IdentidadeAlvoMultimodal]> = [
      ['providerId', { ...alvo, providerId: 'prov-2' }],
      ['modelId', { ...alvo, modelId: 'MODELO-X' }],
      ['modelId-case', { ...alvo, modelId: 'modelo-x ' }],
      ['endpointIdentity', { ...alvo, endpointIdentity: 'ep-opaco-2' }],
      ['apiRevision', { ...alvo, apiRevision: 'rev-api-2' }],
      ['configRevision', { ...alvo, configRevision: 'rev-cfg-2' }],
      ['adapterRevision', { ...alvo, adapterRevision: 'rev-ad-2' }],
    ]
    for (const [nome, outro] of mutacoes) {
      expect(mesmaIdentidadeMultimodal(alvo, outro), nome).toBe(false)
    }
    expect(mesmaIdentidadeMultimodal(alvo, { ...alvo })).toBe(true)
  })

  it('avaliação com alvo mutado não aproveita o perfil da identidade antiga', () => {
    const mutado = { ...alvo, providerId: 'prov-2' }
    const resultado = avaliar({ alvo: mutado, perfil: perfil([evidencia({ estado: 'suportada' })]) })
    expect(resultado.estado).toBe('desconhecida')
    expect(resultado.motivos).toContain('identidade-divergente')
  })

  it('evidência que aponta para identidade antiga é descartada mesmo em perfil atual', () => {
    const mutado = { ...alvo, configRevision: 'rev-cfg-2' }
    const perfilComEvidenciaVelha: PerfilMultimodal = {
      alvo: mutado,
      entradas: [
        { chave, evidencias: [evidencia({ estado: 'suportada', sobre: alvo })] },
      ],
    }
    const resultado = avaliar({ alvo: mutado, perfil: perfilComEvidenciaVelha })
    expect(resultado.estado).toBe('desconhecida')
    expect(resultado.motivos).toContain('evidencia-insuficiente')
  })
})

describe('MM0-T14 — declaração manual isolada nunca confirma', () => {
  it('manual positiva sozinha permanece não confirmada', () => {
    const resultado = avaliar({
      perfil: perfil([evidencia({ estado: 'suportada', origem: 'declaracao-manual' })]),
    })
    expect(resultado.estado).toBe('desconhecida')
    expect(resultado.motivos).toContain('declaracao-manual-nao-confirma')
  })

  it('manual positiva não sobrepõe negativo verificado', () => {
    const resultado = avaliar({
      perfil: perfil([
        evidencia({ estado: 'nao-suportada', origem: 'api' }),
        evidencia({ estado: 'suportada', origem: 'declaracao-manual' }),
      ]),
    })
    expect(resultado.estado).toBe('indisponivel')
    expect(resultado.motivos).toContain('evidencia-negativa')
  })

  it('manual positiva não fabrica codec', () => {
    const resultado = avaliar({
      perfil: perfil([evidencia({ estado: 'suportada', origem: 'declaracao-manual' })]),
      codec: codecAusente,
    })
    // Passo 1 (codec ausente) vence qualquer confirmação manual.
    expect(resultado.estado).toBe('indisponivel')
    expect(resultado.motivos).toContain('codec-ausente')
  })
})

describe('MM0-T15 — caminho positivo real: verificável + codec exato + limites satisfeitos', () => {
  it('evidência positiva atual, codec implementado e medida dentro do limite = disponível', () => {
    const resultado = avaliar({
      perfil: perfil([evidencia({ estado: 'suportada', origem: 'api' })], [
        { medida: 'max-bytes', unidade: 'bytes', valorMaximo: 1000 },
      ]),
      pedido: { ...pedido, medidas: [{ medida: 'max-bytes', valor: 500 }] },
    })
    expect(resultado.estado).toBe('disponivel')
    expect(resultado.motivos).toEqual([])
    expect(resultado.limitesEfetivos).toEqual([
      { medida: 'max-bytes', unidade: 'bytes', valorMaximo: 1000 },
    ])
  })

  it('sem restrições declaradas e sem medida pedida: positivo verificável + codec = disponível', () => {
    const resultado = avaliar({ perfil: perfil([evidencia({ estado: 'suportada', origem: 'teste-do-adaptador' })]) })
    expect(resultado.estado).toBe('disponivel')
  })
})

describe('MM0-T16 — limites: exato passa, acima falha, desconhecido não vira infinito', () => {
  const perfilComLimite = perfil([evidencia({ estado: 'suportada' })], [
    { medida: 'max-bytes', unidade: 'bytes', valorMaximo: 1000 },
  ])

  it('medida exatamente no limite passa; acima falha', () => {
    const noLimite = avaliar({
      perfil: perfilComLimite,
      pedido: { ...pedido, medidas: [{ medida: 'max-bytes', valor: 1000 }] },
    })
    expect(noLimite.estado).toBe('disponivel')

    const acima = avaliar({
      perfil: perfilComLimite,
      pedido: { ...pedido, medidas: [{ medida: 'max-bytes', valor: 1001 }] },
    })
    expect(acima.estado).toBe('indisponivel')
    expect(acima.motivos).toContain('limite-excedido')
  })

  it('medida sem limite conhecido para a dimensão não vira infinito', () => {
    const resultado = avaliar({
      perfil: perfil([evidencia({ estado: 'suportada' })]),
      pedido: { ...pedido, medidas: [{ medida: 'max-bytes', valor: 10 }] },
    })
    expect(resultado.estado).toBe('desconhecida')
    expect(resultado.motivos).toContain('limite-desconhecido')
  })

  it('valor zero é limite real de zero — não vira ilimitado por truthiness', () => {
    const perfilZero = perfil([evidencia({ estado: 'suportada' })], [
      { medida: 'max-bytes', unidade: 'bytes', valorMaximo: 0 },
    ])
    const zero = avaliar({
      perfil: perfilZero,
      pedido: { ...pedido, medidas: [{ medida: 'max-bytes', valor: 0 }] },
    })
    expect(zero.estado).toBe('disponivel')

    const um = avaliar({
      perfil: perfilZero,
      pedido: { ...pedido, medidas: [{ medida: 'max-bytes', valor: 1 }] },
    })
    expect(um.estado).toBe('indisponivel')
    expect(um.motivos).toContain('limite-excedido')
  })

  it('medida NaN/negativa no pedido é recusada (desconhecida, não passa)', () => {
    const nan = avaliar({
      perfil: perfilComLimite,
      pedido: { ...pedido, medidas: [{ medida: 'max-bytes', valor: Number.NaN }] },
    })
    expect(nan.estado).toBe('desconhecida')
    expect(nan.motivos).toContain('medida-invalida')
  })

  it('validador de restrição: unidade incompatível, NaN, infinito e negativo recusados; zero aceito', () => {
    expect(validarRestricaoMedida({ medida: 'max-bytes', unidade: 'ms', valorMaximo: 10 }).ok).toBe(false)
    const unidadeErrada = validarRestricaoMedida({ medida: 'max-bytes', unidade: 'ms', valorMaximo: 10 })
    if (!unidadeErrada.ok) expect(unidadeErrada.codigo).toBe('unidade-incompativel')

    expect(validarRestricaoMedida({ medida: 'max-bytes', unidade: 'bytes', valorMaximo: Number.NaN }).ok).toBe(false)
    expect(
      validarRestricaoMedida({ medida: 'max-bytes', unidade: 'bytes', valorMaximo: Number.POSITIVE_INFINITY }).ok,
    ).toBe(false)
    expect(validarRestricaoMedida({ medida: 'max-duracao', unidade: 'ms', valorMaximo: -1 }).ok).toBe(false)

    const zero = validarRestricaoMedida({ medida: 'max-caracteres', unidade: 'caracteres', valorMaximo: 0 })
    expect(zero.ok).toBe(true)
    if (zero.ok) expect(zero.valor).toEqual({ medida: 'max-caracteres', unidade: 'caracteres', valorMaximo: 0 })
  })
})

// ----------------------------------------------------------------------------
// Pool
// ----------------------------------------------------------------------------

const alvoPool: IdentidadeAlvoMultimodal = {
  ...alvo,
  endpointIdentity: 'ep-pool-1',
  pool: { revisao: 'pool-1', destinos: ['destino-a', 'destino-b'] },
}

function destino(
  destinoId: string,
  limiteMaximo: number,
  parcial: { evidencias?: readonly EvidenciaCapacidade[]; alvo?: IdentidadeAlvoMultimodal } = {},
): DestinoAvaliacaoPool {
  const alvoDestino = parcial.alvo ?? { ...alvo, endpointIdentity: `ep-${destinoId}` }
  return {
    destinoId,
    alvo: alvoDestino,
    codec: { chave, implementado: true },
    perfil: {
      alvo: alvoDestino,
      entradas: [
        {
          chave,
          evidencias: parcial.evidencias ?? [evidencia({ estado: 'suportada', sobre: alvoDestino })],
          restricoes: [{ medida: 'max-bytes', unidade: 'bytes', valorMaximo: limiteMaximo }],
        },
      ],
    },
  }
}

function compor(destinos: readonly DestinoAvaliacaoPool[], pedidoPool: PedidoCapacidade = pedido) {
  return comporCapacidadeDePool({ alvo: alvoPool, destinos, pedido: pedidoPool })
}

describe('MM0-T17 — pool admite só a interseção (nunca o maior teto)', () => {
  it('dois destinos positivos com tetos 10 e 20 resultam no teto 10', () => {
    const resultado = compor([destino('destino-a', 10), destino('destino-b', 20)], {
      ...pedido,
      medidas: [{ medida: 'max-bytes', valor: 5 }],
    })
    expect(resultado.estado).toBe('disponivel')
    expect(resultado.limitesEfetivos).toEqual([
      { medida: 'max-bytes', unidade: 'bytes', valorMaximo: 10 },
    ])
    const maximo = resultado.limitesEfetivos?.find((item) => item.medida === 'max-bytes')
    expect(maximo?.valorMaximo).toBe(10)
    expect(maximo?.valorMaximo).not.toBe(20)
  })

  it('pedido acima do menor teto é indisponível (a interseção vale para o pedido)', () => {
    const acimaDoMenor = compor(
      [destino('destino-a', 10), destino('destino-b', 20)],
      { ...pedido, medidas: [{ medida: 'max-bytes', valor: 15 }] },
    )
    expect(acimaDoMenor.estado).toBe('indisponivel')

    const dentroDaInterseccao = compor(
      [destino('destino-a', 10), destino('destino-b', 20)],
      { ...pedido, medidas: [{ medida: 'max-bytes', valor: 8 }] },
    )
    expect(dentroDaInterseccao.estado).toBe('disponivel')
  })
})

describe('MM0-T18 — pool com destino negativo/ausente/lista incompleta/revisão antiga não fica disponível', () => {
  it('destino com evidência negativa impede o pool', () => {
    const resultado = compor([
      destino('destino-a', 10),
      destino('destino-b', 20, {
        evidencias: [evidencia({ estado: 'nao-suportada', sobre: { ...alvo, endpointIdentity: 'ep-destino-b' } })],
      }),
    ])
    expect(resultado.estado).toBe('indisponivel')
    expect(resultado.motivos).toContain('destino-indisponivel')
    expect(resultado.motivos).toContain('evidencia-negativa')
  })

  it('destino elegível ausente da lista fornecida = desconhecido', () => {
    const resultado = compor([destino('destino-a', 10)])
    expect(resultado.estado).toBe('desconhecida')
    expect(resultado.motivos).toContain('destino-ausente')
  })

  it('lista de destinos vazia com identidade pool não prova disponibilidade', () => {
    expect(compor([]).estado).toBe('desconhecida')
    const semDestinos = comporCapacidadeDePool({ alvo: alvoPool, destinos: [], pedido })
    expect(semDestinos.estado).toBe('desconhecida')
    expect(semDestinos.motivos).toContain('destinos-ausentes')
  })

  it('pool sem destinos elegíveis conhecidos é desconhecido', () => {
    const poolVazio: IdentidadeAlvoMultimodal = { ...alvo, pool: { revisao: 'p', destinos: [] } }
    const resultado = comporCapacidadeDePool({ alvo: poolVazio, destinos: [destino('destino-a', 10)], pedido })
    expect(resultado.estado).toBe('desconhecida')
    expect(resultado.motivos).toContain('pool-sem-destinos')
  })

  it('revisão antiga (perfil do destino sob config anterior) invalida a composição', () => {
    // A revisão do pool faz parte da identidade; destino cujo perfil foi
    // montado sob a identidade anterior não empresta suporte.
    expect(
      mesmaIdentidadeMultimodal(alvoPool, {
        ...alvoPool,
        pool: { revisao: 'pool-0', destinos: ['destino-a', 'destino-b'] },
      }),
    ).toBe(false)

    const destinoComPerfilVelho = destino('destino-b', 20)
    const alvoDestinoVelho = { ...destinoComPerfilVelho.alvo, configRevision: 'rev-cfg-antiga' }
    const destinoVelho: DestinoAvaliacaoPool = {
      destinoId: 'destino-b',
      alvo: destinoComPerfilVelho.alvo,
      codec: destinoComPerfilVelho.codec,
      perfil: { alvo: alvoDestinoVelho, entradas: destinoComPerfilVelho.perfil?.entradas ?? [] },
    }
    const resultado = compor([destino('destino-a', 10), destinoVelho])
    expect(resultado.estado).toBe('desconhecida')
    expect(resultado.motivos).toContain('destino-desconhecido')
  })

  it('identidade sem campo pool não compõe como pool', () => {
    const resultado = comporCapacidadeDePool({ alvo, destinos: [destino('destino-a', 10)], pedido })
    expect(resultado.estado).toBe('desconhecida')
    expect(resultado.motivos).toContain('identidade-sem-pool')
  })
})

describe('MM0-T19 — conjunto de destinos é identidade; nome/alias não determina suporte', () => {
  const comPool = (destinos: readonly string[]): IdentidadeAlvoMultimodal => ({
    ...alvoPool,
    pool: { revisao: 'pool-1', destinos },
  })

  it('reordenar o mesmo conjunto não muda identidade; trocar um destino muda', () => {
    expect(mesmaIdentidadeMultimodal(comPool(['destino-a', 'destino-b']), comPool(['destino-b', 'destino-a']))).toBe(true)
    expect(mesmaIdentidadeMultimodal(comPool(['destino-a', 'destino-b']), comPool(['destino-a', 'destino-c']))).toBe(false)
    expect(mesmaIdentidadeMultimodal(comPool(['destino-a']), comPool(['destino-a', 'destino-b']))).toBe(false)
    expect(mesmaIdentidadeMultimodal(alvoPool, { ...alvoPool, pool: undefined })).toBe(false)
  })

  it('mesmo modelId (alias) em outro provedor não herda suporte', () => {
    const outroProvedor: IdentidadeAlvoMultimodal = { ...alvo, providerId: 'prov-2' }
    expect(mesmaIdentidadeMultimodal(alvo, outroProvedor)).toBe(false)

    const resultado = avaliar({
      alvo: outroProvedor,
      perfil: perfil([evidencia({ estado: 'suportada' })], undefined, alvo),
    })
    expect(resultado.estado).toBe('desconhecida')
  })
})

// ----------------------------------------------------------------------------
// Rodada de revisão independente 16/11 (achados MM0-A1..A4) — positivos e
// negativos para cada correção.
// ----------------------------------------------------------------------------

describe('MM0-REV-A1 — limite conhecido exige medida; pool não apaga restrição', () => {
  it('restrição declarada SEM medida pedida é desconhecida (não disponibilidade)', () => {
    const resultado = avaliar({
      perfil: perfil([evidencia({ estado: 'suportada' })], [
        { medida: 'max-bytes', unidade: 'bytes', valorMaximo: 10 },
      ]),
    })
    expect(resultado.estado).toBe('desconhecida')
    expect(resultado.motivos).toContain('limite-desconhecido')
  })

  it('dimensão assimétrica no pool: sem prova comum, o pool não fica disponível', () => {
    const destinoSemLimite = (destinoId: string): DestinoAvaliacaoPool => {
      const alvoDestino = { ...alvo, endpointIdentity: `ep-${destinoId}` }
      return {
        destinoId,
        alvo: alvoDestino,
        codec: { chave, implementado: true },
        perfil: {
          alvo: alvoDestino,
          entradas: [{ chave, evidencias: [evidencia({ estado: 'suportada', sobre: alvoDestino })] }],
        },
      }
    }
    // Sem medida: quem tem a restrição fica desconhecido → pool desconhecido.
    const semMedida = comporCapacidadeDePool({
      alvo: alvoPool,
      destinos: [destino('destino-a', 10), destinoSemLimite('destino-b')],
      pedido,
    })
    expect(semMedida.estado).not.toBe('disponivel')

    // Com medida: quem NÃO tem a restrição fica com medida sem limite →
    // desconhecido; a interseção nunca descarta o teto conhecido de um lado.
    const comMedida = comporCapacidadeDePool({
      alvo: alvoPool,
      destinos: [destino('destino-a', 10), destinoSemLimite('destino-b')],
      pedido: { ...pedido, medidas: [{ medida: 'max-bytes', valor: 5 }] },
    })
    expect(comMedida.estado).not.toBe('disponivel')
  })
})

describe('MM0-REV-A2 — entradas duplicadas agregam de forma conservadora', () => {
  const positiva = (): PerfilMultimodal['entradas'][number] => ({
    chave,
    evidencias: [evidencia({ estado: 'suportada' })],
  })
  const negativa = (): PerfilMultimodal['entradas'][number] => ({
    chave,
    evidencias: [evidencia({ estado: 'nao-suportada' })],
  })

  it('negativa atual vence em QUALQUER ordem das entradas duplicadas', () => {
    for (const entradas of [
      [positiva(), negativa()],
      [negativa(), positiva()],
    ]) {
      const resultado = avaliarCapacidadeEfetiva({
        alvo,
        pedido,
        codec: codecOk,
        perfil: { alvo, entradas },
      })
      expect(resultado.estado).toBe('indisponivel')
      expect(resultado.motivos).toContain('evidencia-negativa')
    }
  })

  it('duplicadas positivas: ordem irrelevante e o MENOR teto prevalece', () => {
    const comLimite10: PerfilMultimodal['entradas'][number] = {
      ...positiva(),
      restricoes: [{ medida: 'max-bytes', unidade: 'bytes', valorMaximo: 10 }],
    }
    const comLimite20: PerfilMultimodal['entradas'][number] = {
      ...positiva(),
      restricoes: [{ medida: 'max-bytes', unidade: 'bytes', valorMaximo: 20 }],
    }
    for (const entradas of [
      [comLimite10, comLimite20],
      [comLimite20, comLimite10],
    ]) {
      const dentro = avaliarCapacidadeEfetiva({
        alvo,
        pedido: { ...pedido, medidas: [{ medida: 'max-bytes', valor: 8 }] },
        codec: codecOk,
        perfil: { alvo, entradas },
      })
      expect(dentro.estado).toBe('disponivel')
      expect(dentro.limitesEfetivos).toEqual([
        { medida: 'max-bytes', unidade: 'bytes', valorMaximo: 10 },
      ])
    }
    const acima = avaliarCapacidadeEfetiva({
      alvo,
      pedido: { ...pedido, medidas: [{ medida: 'max-bytes', valor: 15 }] },
      codec: codecOk,
      perfil: { alvo, entradas: [comLimite10, comLimite20] },
    })
    expect(acima.estado).toBe('indisponivel')
    expect(acima.motivos).toContain('limite-excedido')
  })
})

describe('MM0-REV-A3 — avaliador público não contorna a guarda de pool', () => {
  function avaliarPool(pool: { revisao: string; destinos: readonly string[] }) {
    const alvoPoolDireto = { ...alvo, pool: { revisao: pool.revisao, destinos: [...pool.destinos] } }
    return avaliarCapacidadeEfetiva({
      alvo: alvoPoolDireto,
      pedido,
      codec: codecOk,
      perfil: {
        alvo: alvoPoolDireto,
        entradas: [
          { chave, evidencias: [evidencia({ estado: 'suportada', sobre: alvoPoolDireto })] },
        ],
      },
    })
  }

  it('pool com destinos vazios + evidência agregada positiva NÃO vira disponível', () => {
    const resultado = avaliarPool({ revisao: 'p', destinos: [] })
    expect(resultado.estado).toBe('desconhecida')
    expect(resultado.motivos).toContain('pool-exige-composicao')
  })

  it('pool com destinos preenchidos também exige composição na rota direta', () => {
    const resultado = avaliarPool({ revisao: 'p', destinos: ['destino-a', 'destino-b'] })
    expect(resultado.estado).not.toBe('disponivel')
    expect(resultado.motivos).toContain('pool-exige-composicao')
  })
})

describe('MM0-REV-A4 — propriedade herdada por protótipo nunca confirma', () => {
  it('identidade montada com Object.create não passa na validação', () => {
    const herdado = Object.create(alvo) as IdentidadeAlvoMultimodal
    const resultado = avaliar({
      alvo: herdado,
      perfil: {
        alvo: herdado,
        entradas: [{ chave, evidencias: [evidencia({ estado: 'suportada', sobre: herdado })] }],
      },
    })
    expect(resultado.estado).toBe('desconhecida')
    expect(resultado.motivos).toContain('alvo-invalido')
  })

  it('positivo: objeto de dado genuinamente plano segue disponível', () => {
    const resultado = avaliar({ perfil: perfil([evidencia({ estado: 'suportada' })]) })
    expect(resultado.estado).toBe('disponivel')
  })
})
