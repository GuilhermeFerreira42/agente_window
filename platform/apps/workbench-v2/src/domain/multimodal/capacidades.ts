// ============================================================================
// Domínio Multimodal — MM-0 — capacidade efetiva: identidade, evidência,
// decisão e interseção de pool. FUNÇÕES PURAS — sem rede, sem descoberta
// ativa, sem marca/alias/modelo como suporte, sem IO nem relógio.
//
// Ordem obrigatória da decisão (SPEC MM-0 §02.4):
//   1. evidência negativa aplicável OU codec comprovadamente ausente;
//   2. identidade/config/API/adapter/destinos mudados, perfil ausente ou
//      evidência insuficiente → desconhecida (nunca "emprestar" perfil);
//   3. declaração manual isolada não confirma suporte remoto nem cria codec;
//   4. limite excedido → indisponível; limite/medida necessário mas
//      desconhecido → desconhecida (nunca vira infinito por truthiness);
//   5. disponível SÓ com evidência positiva verificável + identidade atual +
//      codec exato + limites relevantes satisfeitos.
// ============================================================================

import {
  UNIDADE_DA_RESTRICAO,
  ehDirecao,
  ehEstadoEvidencia,
  ehMedidaId,
  ehModalidade,
  ehObjetoPlano,
  ehOrigemEvidencia,
  ehRepresentacao,
  ehString,
  ehStringNaoVazia,
  falhaValidacao,
  faltaChave,
  okValido,
  primeiraChaveDesconhecida,
  type ChaveCapacidade,
  type DeclaracaoCodecLocal,
  type DestinoAvaliacaoPool,
  type EntradaAvaliacaoCapacidade,
  type EntradaComposicaoPool,
  type EntradaPerfilMultimodal,
  type EvidenciaCapacidade,
  type IdentidadeAlvoMultimodal,
  type MedidaId,
  type PerfilMultimodal,
  type PedidoCapacidade,
  type RestricaoMedida,
  type ResultadoCapacidade,
  type ResultadoValidacao,
} from './contrato'

// ----------------------------------------------------------------------------
// Validação estrutural pura
// ----------------------------------------------------------------------------

const CAMPOS_IDENTIDADE = [
  'providerId',
  'modelId',
  'endpointIdentity',
  'protocolo',
  'apiRevision',
  'configRevision',
  'adapterRevision',
] as const

function ehIdentidade(bruta: unknown): bruta is IdentidadeAlvoMultimodal {
  if (!ehObjetoPlano(bruta)) return false
  if (primeiraChaveDesconhecida(bruta, [...CAMPOS_IDENTIDADE, 'pool']) !== undefined) return false
  for (const campo of CAMPOS_IDENTIDADE) {
    if (!ehStringNaoVazia(bruta[campo])) return false
  }
  if (faltaChave(bruta, 'pool') || bruta.pool === undefined) return true
  const pool = bruta.pool
  if (!ehObjetoPlano(pool)) return false
  if (primeiraChaveDesconhecida(pool, ['revisao', 'destinos']) !== undefined) return false
  if (!ehStringNaoVazia(pool.revisao)) return false
  if (!Array.isArray(pool.destinos)) return false
  for (const destino of pool.destinos) {
    if (!ehStringNaoVazia(destino)) return false
  }
  return true
}

function ehChave(bruta: unknown): bruta is ChaveCapacidade {
  if (!ehObjetoPlano(bruta)) return false
  if (primeiraChaveDesconhecida(bruta, ['operacao', 'direcao', 'modalidade', 'representacao']) !== undefined) {
    return false
  }
  return (
    ehStringNaoVazia(bruta.operacao) &&
    ehDirecao(bruta.direcao) &&
    ehModalidade(bruta.modalidade) &&
    ehRepresentacao(bruta.representacao)
  )
}

function ehEvidencia(bruta: unknown): bruta is EvidenciaCapacidade {
  if (!ehObjetoPlano(bruta)) return false
  if (primeiraChaveDesconhecida(bruta, ['alvo', 'estado', 'origem', 'revisao', 'consultadaEm']) !== undefined) {
    return false
  }
  if (!ehIdentidade(bruta.alvo)) return false
  if (!ehEstadoEvidencia(bruta.estado)) return false
  if (!ehOrigemEvidencia(bruta.origem)) return false
  if (!ehStringNaoVazia(bruta.revisao)) return false
  // Data explícita válida — sem relógio atual, sem TTL implícito.
  return ehString(bruta.consultadaEm) && !Number.isNaN(Date.parse(bruta.consultadaEm))
}

function ehPerfil(bruta: unknown): bruta is PerfilMultimodal {
  if (!ehObjetoPlano(bruta)) return false
  if (primeiraChaveDesconhecida(bruta, ['alvo', 'entradas']) !== undefined) return false
  if (!ehIdentidade(bruta.alvo)) return false
  if (!Array.isArray(bruta.entradas)) return false
  for (const entrada of bruta.entradas) {
    if (!ehObjetoPlano(entrada)) return false
    if (primeiraChaveDesconhecida(entrada, ['chave', 'evidencias', 'restricoes']) !== undefined) return false
    if (!ehChave(entrada.chave)) return false
    if (!Array.isArray(entrada.evidencias)) return false
    for (const evidencia of entrada.evidencias) {
      if (!ehEvidencia(evidencia)) return false
    }
    if (faltaChave(entrada, 'restricoes') || entrada.restricoes === undefined) continue
    if (!Array.isArray(entrada.restricoes)) return false
  }
  return true
}

function ehPedido(bruta: unknown): bruta is PedidoCapacidade {
  if (!ehObjetoPlano(bruta)) return false
  const permitidas = ['operacao', 'direcao', 'modalidade', 'representacao', 'medidas']
  if (primeiraChaveDesconhecida(bruta, permitidas) !== undefined) return false
  if (
    !ehStringNaoVazia(bruta.operacao) ||
    !ehDirecao(bruta.direcao) ||
    !ehModalidade(bruta.modalidade) ||
    !ehRepresentacao(bruta.representacao)
  ) {
    return false
  }
  if (faltaChave(bruta, 'medidas') || bruta.medidas === undefined) return true
  if (!Array.isArray(bruta.medidas)) return false
  const vistas = new Set<MedidaId>()
  for (const medida of bruta.medidas) {
    if (!ehObjetoPlano(medida)) return false
    if (primeiraChaveDesconhecida(medida, ['medida', 'valor']) !== undefined) return false
    if (!ehMedidaId(medida.medida)) return false
    if (typeof medida.valor !== 'number') return false
    if (vistas.has(medida.medida)) return false
    vistas.add(medida.medida)
  }
  return true
}

function ehCodec(bruta: unknown): bruta is DeclaracaoCodecLocal {
  if (!ehObjetoPlano(bruta)) return false
  if (primeiraChaveDesconhecida(bruta, ['chave', 'implementado']) !== undefined) return false
  return ehChave(bruta.chave) && typeof bruta.implementado === 'boolean'
}

/**
 * Validador da restrição: unidade precisa ser a da medida; valor finito
 * não negativo (NaN/infinito/negativo recusados). ZERO é limite real.
 */
export function validarRestricaoMedida(bruta: unknown): ResultadoValidacao<RestricaoMedida> {
  if (!ehObjetoPlano(bruta)) return falhaValidacao('restricao-invalida')
  if (primeiraChaveDesconhecida(bruta, ['medida', 'unidade', 'valorMaximo']) !== undefined) {
    return falhaValidacao('campo-desconhecido')
  }
  if (!ehMedidaId(bruta.medida)) return falhaValidacao('medida-invalida')
  if (bruta.unidade !== UNIDADE_DA_RESTRICAO[bruta.medida]) return falhaValidacao('unidade-incompativel')
  if (typeof bruta.valorMaximo !== 'number' || !Number.isFinite(bruta.valorMaximo) || bruta.valorMaximo < 0) {
    return falhaValidacao('valor-maximo-invalido')
  }
  return okValido(restricaoDe(bruta.medida, bruta.valorMaximo))
}

function mesmaChave(a: ChaveCapacidade, b: ChaveCapacidade): boolean {
  return (
    a.operacao === b.operacao &&
    a.direcao === b.direcao &&
    a.modalidade === b.modalidade &&
    a.representacao === b.representacao
  )
}

function restricaoDe(medida: MedidaId, valorMaximo: number): RestricaoMedida {
  if (medida === 'max-bytes') return { medida, unidade: 'bytes', valorMaximo }
  if (medida === 'max-caracteres') return { medida, unidade: 'caracteres', valorMaximo }
  return { medida, unidade: 'ms', valorMaximo }
}

function idDestino(destino: DestinoAvaliacaoPool): string | undefined {
  if (!ehObjetoPlano(destino)) return undefined
  const id: unknown = destino.destinoId
  return typeof id === 'string' ? id : undefined
}

function desconhecida(...motivos: string[]): ResultadoCapacidade {
  return { estado: 'desconhecida', motivos }
}

function indisponivel(...motivos: string[]): ResultadoCapacidade {
  return { estado: 'indisponivel', motivos }
}

// ----------------------------------------------------------------------------
// Identidade determinística (comparação de conjunto canônico no pool)
// ----------------------------------------------------------------------------

/**
 * Comparação exata dos sete campos + conjunto canônico de destinos do pool
 * (ordem não altera identidade; trocar UM destino altera; sem normalização
 * de case). Nunca deriva suporte de nome/alias/marca.
 */
export function mesmaIdentidadeMultimodal(
  a: IdentidadeAlvoMultimodal,
  b: IdentidadeAlvoMultimodal,
): boolean {
  if (!ehObjetoPlano(a) || !ehObjetoPlano(b)) return false
  for (const campo of CAMPOS_IDENTIDADE) {
    if (a[campo] !== b[campo]) return false
  }
  const pa = a.pool
  const pb = b.pool
  if (pa === undefined && pb === undefined) return true
  if (pa === undefined || pb === undefined) return false
  if (pa.revisao !== pb.revisao) return false
  const destinosA = [...new Set(pa.destinos)].slice().sort()
  const destinosB = [...new Set(pb.destinos)].slice().sort()
  return (
    destinosA.length === destinosB.length && destinosA.every((destino, i) => destino === destinosB[i])
  )
}

// ----------------------------------------------------------------------------
// Decisão efetiva
// ----------------------------------------------------------------------------

/**
 * Avalia se a combinação está disponível para o alvo atual. Nunca inicia
 * transmissão, nunca troca rota/modelo e nunca usa fallback oculto.
 */
export function avaliarCapacidadeEfetiva(entrada: EntradaAvaliacaoCapacidade): ResultadoCapacidade {
  if (!ehObjetoPlano(entrada)) return desconhecida('entrada-invalida')
  const { alvo, pedido, perfil, codec } = entrada

  if (!ehIdentidade(alvo)) return desconhecida('alvo-invalido')
  if (!ehPedido(pedido)) return desconhecida('pedido-invalido')
  if (!ehCodec(codec)) return desconhecida('codec-invalido')

  const chave: ChaveCapacidade = {
    operacao: pedido.operacao,
    direcao: pedido.direcao,
    modalidade: pedido.modalidade,
    representacao: pedido.representacao,
  }

  // Perfil precisa ser estruturalmente válido E da identidade atual.
  let entradas: readonly EntradaPerfilMultimodal[] = []
  if (perfil !== undefined) {
    if (!ehPerfil(perfil)) return desconhecida('perfil-invalido')
    if (!mesmaIdentidadeMultimodal(perfil.alvo, alvo)) return desconhecida('identidade-divergente')
    entradas = perfil.entradas
  }

  const entradaPerfil =
    perfil === undefined ? undefined : entradas.find((item) => mesmaChave(item.chave, chave))
  const evidenciasAplicaveis: readonly EvidenciaCapacidade[] =
    entradaPerfil === undefined
      ? []
      : entradaPerfil.evidencias.filter(
          (evidencia) => ehIdentidade(evidencia.alvo) && mesmaIdentidadeMultimodal(evidencia.alvo, alvo),
        )

  // Passo 1 — negativo aplicável ou codec comprovadamente ausente.
  if (evidenciasAplicaveis.some((evidencia) => evidencia.estado === 'nao-suportada')) {
    return indisponivel('evidencia-negativa')
  }
  if (mesmaChave(codec.chave, chave) && !codec.implementado) {
    return indisponivel('codec-ausente')
  }

  // Passo 2 — perfil/identidade/evidência.
  if (perfil === undefined) return desconhecida('perfil-ausente')
  if (entradaPerfil === undefined) return desconhecida('evidencia-ausente')

  // Passo 3 — declaração manual isolada não confirma (nem fabrica codec).
  const positivas = evidenciasAplicaveis.filter((evidencia) => evidencia.estado === 'suportada')
  const verificadas = positivas.filter((evidencia) => evidencia.origem !== 'declaracao-manual')
  if (verificadas.length === 0) {
    if (positivas.length > 0) return desconhecida('declaracao-manual-nao-confirma')
    return desconhecida('evidencia-insuficiente')
  }

  // Codec específico para a combinação exata é exigência do "disponível".
  if (!mesmaChave(codec.chave, chave)) return desconhecida('codec-nao-declarado')

  // Passo 4 — limites.
  const restricoes: RestricaoMedida[] = []
  if (entradaPerfil.restricoes !== undefined) {
    for (const restricaoBruta of entradaPerfil.restricoes) {
      const validada = validarRestricaoMedida(restricaoBruta)
      if (!validada.ok) return desconhecida(validada.codigo)
      restricoes.push(validada.valor)
    }
  }
  const medidas = pedido.medidas ?? []
  for (const medida of medidas) {
    if (!Number.isFinite(medida.valor) || medida.valor < 0) return desconhecida('medida-invalida')
    // Medida sem limite conhecido para essa dimensão NÃO vira infinito.
    if (!restricoes.some((restricao) => restricao.medida === medida.medida)) {
      return desconhecida('limite-desconhecido')
    }
  }
  for (const restricao of restricoes) {
    const medida = medidas.find((item) => item.medida === restricao.medida)
    if (medida !== undefined && medida.valor > restricao.valorMaximo) {
      return indisponivel('limite-excedido')
    }
  }

  // Passo 5 — disponível.
  return { estado: 'disponivel', motivos: [], limitesEfetivos: restricoes }
}

// ----------------------------------------------------------------------------
// Pool — interseção conservadora dos destinos conhecidos
// ----------------------------------------------------------------------------

/**
 * Interseção do pool: TODOS os destinos elegíveis conhecidos precisam
 * satisfazer a mesma combinação. Ausência/desconhecido → pool
 * desconhecido; incompatível explícito → pool indisponível; lista vazia
 * ou incompleta com identidade pool não prova disponibilidade. O limite
 * efetivo é o MÍNIMO comum (nunca o maior teto nem só o membro favorável).
 */
export function comporCapacidadeDePool(entrada: EntradaComposicaoPool): ResultadoCapacidade {
  if (!ehObjetoPlano(entrada)) return desconhecida('entrada-invalida')
  const { alvo, destinos, pedido } = entrada

  if (!ehIdentidade(alvo)) return desconhecida('alvo-invalido')
  if (alvo.pool === undefined) return desconhecida('identidade-sem-pool')
  const idsPool = alvo.pool.destinos
  if (idsPool.length === 0) return desconhecida('pool-sem-destinos')
  if (!Array.isArray(destinos) || destinos.length === 0) return desconhecida('destinos-ausentes')

  for (const id of idsPool) {
    const presente = destinos.some((destino) => idDestino(destino) === id)
    if (!presente) return desconhecida('destino-ausente')
  }

  const elegiveis = destinos.filter((destino) => {
    const id = idDestino(destino)
    return id !== undefined && idsPool.includes(id)
  })

  const resultados = elegiveis.map((destino) =>
    avaliarCapacidadeEfetiva({
      alvo: destino.alvo,
      pedido,
      perfil: destino.perfil,
      codec: destino.codec,
    }),
  )

  if (resultados.some((resultado) => resultado.estado === 'indisponivel')) {
    const motivos = new Set<string>(['destino-indisponivel'])
    for (const resultado of resultados) {
      if (resultado.estado === 'indisponivel') {
        for (const motivo of resultado.motivos) motivos.add(motivo)
      }
    }
    return { estado: 'indisponivel', motivos: [...motivos] }
  }
  if (resultados.some((resultado) => resultado.estado === 'desconhecida')) {
    const motivos = new Set<string>(['destino-desconhecido'])
    for (const resultado of resultados) {
      if (resultado.estado === 'desconhecida') {
        for (const motivo of resultado.motivos) motivos.add(motivo)
      }
    }
    return { estado: 'desconhecida', motivos: [...motivos] }
  }

  const limites = intersecaoLimites(resultados.map((resultado) => resultado.limitesEfetivos ?? []))
  return { estado: 'disponivel', motivos: [], limitesEfetivos: limites }
}

/** Mínimo por medida, somente nas medidas presentes em TODOS os destinos. */
function intersecaoLimites(listas: readonly (readonly RestricaoMedida[])[]): RestricaoMedida[] {
  if (listas.length === 0) return []
  const comuns = listas[0].filter((restricao) =>
    listas.every((lista) =>
      lista.some((item) => item.medida === restricao.medida && item.unidade === restricao.unidade),
    ),
  )
  return comuns.map((restricao) => {
    let minimo = restricao.valorMaximo
    for (const lista of listas) {
      const encontrada = lista.find(
        (item) => item.medida === restricao.medida && item.unidade === restricao.unidade,
      )
      if (encontrada !== undefined && encontrada.valorMaximo < minimo) {
        minimo = encontrada.valorMaximo
      }
    }
    return restricaoDe(restricao.medida, minimo)
  })
}
