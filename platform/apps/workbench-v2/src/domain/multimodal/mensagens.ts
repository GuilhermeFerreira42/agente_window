// ============================================================================
// Domínio Multimodal — MM-0 — mensagens: adaptação legada, projeção e
// validação de envelope. FUNÇÕES PURAS: sem IO, sem relógio/aleatoriedade
// (IDs determinísticos por hash estável), sem mutar a entrada.
// ============================================================================

import {
  ehModalidade,
  ehObjetoPlano,
  ehString,
  ehStringNaoVazia,
  falhaValidacao,
  faltaChave,
  okValido,
  primeiraChaveDesconhecida,
  temChavePropria,
  type EnvelopeMensagemMultimodal,
  type EntradaAdaptacaoLegada,
  type ParteMensagem,
  type ResultadoValidacao,
} from './contrato'

// ----------------------------------------------------------------------------
// Validação do envelope (escrita v1 estrita)
// ----------------------------------------------------------------------------

const CHAVES_MENSAGEM = ['versao', 'messageId', 'partes'] as const

function validarParte(bruta: unknown, indice: number, vistos: Set<string>): ResultadoValidacao<ParteMensagem> {
  const caminhoBase = `$.partes[${indice}]`
  if (!ehObjetoPlano(bruta)) return falhaValidacao('parte-invalida', caminhoBase)

  const tipo = bruta.tipo
  if (!ehString(tipo)) return falhaValidacao('tipo-parte-desconhecido', `${caminhoBase}.tipo`)

  let permitidas: readonly string[]
  if (tipo === 'texto') permitidas = ['partId', 'tipo', 'texto']
  else if (tipo === 'artefato') permitidas = ['partId', 'tipo', 'artifactId', 'modalidade']
  else if (tipo === 'nao-suportada') permitidas = ['partId', 'tipo', 'codigo', 'tipoOriginal']
  else return falhaValidacao('tipo-parte-desconhecido', `${caminhoBase}.tipo`)

  const extra = primeiraChaveDesconhecida(bruta, permitidas)
  if (extra !== undefined) return falhaValidacao('campo-desconhecido', `${caminhoBase}.${extra}`)

  if (faltaChave(bruta, 'partId')) return falhaValidacao('campo-ausente', `${caminhoBase}.partId`)
  const partId = bruta.partId
  if (!ehStringNaoVazia(partId)) return falhaValidacao('parte-invalida', `${caminhoBase}.partId`)
  if (vistos.has(partId)) return falhaValidacao('partId-duplicado', `${caminhoBase}.partId`)
  vistos.add(partId)

  if (tipo === 'texto') {
    if (faltaChave(bruta, 'texto')) return falhaValidacao('campo-ausente', `${caminhoBase}.texto`)
    if (!ehString(bruta.texto)) return falhaValidacao('texto-invalido', `${caminhoBase}.texto`)
    return okValido<ParteMensagem>({ partId, tipo: 'texto', texto: bruta.texto })
  }

  if (tipo === 'artefato') {
    if (faltaChave(bruta, 'artifactId')) return falhaValidacao('campo-ausente', `${caminhoBase}.artifactId`)
    if (!ehStringNaoVazia(bruta.artifactId)) return falhaValidacao('parte-invalida', `${caminhoBase}.artifactId`)
    if (faltaChave(bruta, 'modalidade')) return falhaValidacao('campo-ausente', `${caminhoBase}.modalidade`)
    if (!ehModalidade(bruta.modalidade)) return falhaValidacao('modalidade-invalida', `${caminhoBase}.modalidade`)
    return okValido<ParteMensagem>({
      partId,
      tipo: 'artefato',
      artifactId: bruta.artifactId,
      modalidade: bruta.modalidade,
    })
  }

  // nao-suportada — fallback de leitura; o original é preservado, nunca
  // convertido com String(objeto) nem executado.
  if (faltaChave(bruta, 'codigo')) return falhaValidacao('campo-ausente', `${caminhoBase}.codigo`)
  if (!ehStringNaoVazia(bruta.codigo)) return falhaValidacao('parte-invalida', `${caminhoBase}.codigo`)
  if (temChavePropria(bruta, 'tipoOriginal') && bruta.tipoOriginal !== undefined && !ehString(bruta.tipoOriginal)) {
    return falhaValidacao('parte-invalida', `${caminhoBase}.tipoOriginal`)
  }
  const parte: ParteMensagem = { partId, tipo: 'nao-suportada', codigo: bruta.codigo }
  if (ehString(bruta.tipoOriginal)) return okValido({ ...parte, tipoOriginal: bruta.tipoOriginal })
  return okValido(parte)
}

/**
 * Validador de escrita v1: versão/tipo/campo desconhecido ou conteúdo
 * inválido = diagnóstico explícito. NUNCA retorna sucesso depois de
 * descartar campos; não confia em casts, protótipos herdados ou `any`.
 */
export function validarMensagemMultimodal(entrada: unknown): ResultadoValidacao<EnvelopeMensagemMultimodal> {
  if (!ehObjetoPlano(entrada)) return falhaValidacao('entrada-invalida', '$')

  const extra = primeiraChaveDesconhecida(entrada, CHAVES_MENSAGEM)
  if (extra !== undefined) return falhaValidacao('campo-desconhecido', `$.${extra}`)

  for (const chave of CHAVES_MENSAGEM) {
    if (faltaChave(entrada, chave)) return falhaValidacao('campo-ausente', `$.${chave}`)
  }

  if (entrada.versao !== 1) return falhaValidacao('versao-invalida', '$.versao')
  if (!ehStringNaoVazia(entrada.messageId)) return falhaValidacao('messageId-invalido', '$.messageId')
  if (!Array.isArray(entrada.partes)) return falhaValidacao('partes-invalida', '$.partes')

  const vistos = new Set<string>()
  const partes: ParteMensagem[] = []
  for (let i = 0; i < entrada.partes.length; i++) {
    const resultado = validarParte(entrada.partes[i], i, vistos)
    if (!resultado.ok) return resultado
    partes.push(resultado.valor)
  }

  return okValido<EnvelopeMensagemMultimodal>({
    versao: 1,
    messageId: entrada.messageId,
    partes,
  })
}

// ----------------------------------------------------------------------------
// Adaptação legada → envelope v1 (visão pura: não reescreve histórico)
// ----------------------------------------------------------------------------

/**
 * Adaptador de MENSAGEM TEXTUAL legada: `identidade` (o ID opaco EXISTENTE
 * da mensagem) + `content` → envelope v1 com uma parte de texto.
 * `messageId` preserva o ID legado VERBATIM (SPEC 01 §2.2 — nunca hash
 * novo no lugar do id real); só o `partId` é derivado deterministicamente.
 * Campos da entrada nunca são mutados. Isto é uma VISÃO — não altera
 * ChatMessage nem arquivo algum.
 */
export function adaptarMensagemLegada(
  entrada: EntradaAdaptacaoLegada,
): ResultadoValidacao<EnvelopeMensagemMultimodal> {
  if (!ehObjetoPlano(entrada)) return falhaValidacao('entrada-invalida', '$')
  const extra = primeiraChaveDesconhecida(entrada, ['identidade', 'content', 'indice'])
  if (extra !== undefined) return falhaValidacao('campo-desconhecido', `$.${extra}`)
  if (!ehStringNaoVazia(entrada.identidade)) return falhaValidacao('identidade-invalida', '$.identidade')
  if (!ehString(entrada.content)) return falhaValidacao('content-invalido', '$.content')
  if (!Number.isSafeInteger(entrada.indice) || entrada.indice < 0) {
    return falhaValidacao('indice-invalido', '$.indice')
  }

  // ID opaco existente preservado; derivação determinística só no partId
  // (parte 0 desta mensagem). Sem reescrita de histórico.
  const messageId = entrada.identidade
  const partId = `${messageId}:0`
  return okValido<EnvelopeMensagemMultimodal>({
    versao: 1,
    messageId,
    partes: [{ partId, tipo: 'texto', texto: entrada.content }],
  })
}

// ----------------------------------------------------------------------------
// Projeção inversa envelope → texto legado
// ----------------------------------------------------------------------------

/**
 * Concatena as partes TEXTUAIS na ordem, sem trim e sem separador. Falha
 * explícita se houver qualquer parte não textual — nunca devolve vazio,
 * nome de arquivo no lugar dos bytes ou `String(objeto)` como fallback.
 */
export function projetarTextoLegado(entrada: unknown): ResultadoValidacao<string> {
  const validada = validarMensagemMultimodal(entrada)
  if (!validada.ok) return validada

  let saida = ''
  for (let i = 0; i < validada.valor.partes.length; i++) {
    const parte = validada.valor.partes[i]
    if (parte.tipo !== 'texto') {
      return falhaValidacao('parte-nao-textual', `$.partes[${i}]`)
    }
    saida += parte.texto
  }
  return okValido(saida)
}
