// ============================================================================
// Domínio Multimodal — MM-0 — artefatos: validação PURA de metadata.
// Sem fs, crypto, DB ou resolução por path; sem autoridade de leitura/
// download. O validador atesta ESTRUTURA — não prova que o arquivo existe,
// que o hash foi calculado ou que o chamador o possui (isso é C-3a/C-3b).
// ============================================================================

import {
  ehEstadoArtefato,
  ehInteiroNaoNegativo,
  ehModalidade,
  ehObjetoPlano,
  ehOrigemArtefato,
  ehPapelArmazenamento,
  ehSha256Canonico,
  ehString,
  ehStringNaoVazia,
  falhaValidacao,
  faltaChave,
  okValido,
  primeiraChaveDesconhecida,
  type ArtefatoMultimodal,
  type EstadoArtefato,
  type ResultadoValidacao,
} from './contrato'

const CHAVES_OBRIGATORIAS = [
  'versao',
  'artifactId',
  'sessionId',
  'chatId',
  'origem',
  'nome',
  'modalidade',
  'papelArmazenamento',
  'estado',
] as const

const CHAVES_OPCIONAIS = [
  'messageId',
  'partId',
  'runId',
  'generation',
  'mimeDeclarado',
  'mimeDetectado',
  'providerId',
  'modelId',
  'requestId',
  'bytes',
  'sha256',
] as const

const CAMPOS_OPCIONAIS_DE_TEXTO = [
  'messageId',
  'partId',
  'runId',
  'mimeDeclarado',
  'mimeDetectado',
  'providerId',
  'modelId',
  'requestId',
] as const

/**
 * Valida um DTO de artefato v1. Rejeita campo extra de transporte
 * (url, path, apiKey, headers, base64, conteúdo em bytes…) — campos
 * extras NÃO são aceitos como metadata persistível. IDs de outro chat
 * são somente dados: o resultado não declara autorização de leitura.
 */
export function validarArtefato(entrada: unknown): ResultadoValidacao<ArtefatoMultimodal> {
  if (!ehObjetoPlano(entrada)) return falhaValidacao('entrada-invalida', '$')

  const extra = primeiraChaveDesconhecida(entrada, [...CHAVES_OBRIGATORIAS, ...CHAVES_OPCIONAIS])
  if (extra !== undefined) return falhaValidacao('campo-desconhecido', `$.${extra}`)

  for (const chave of CHAVES_OBRIGATORIAS) {
    if (faltaChave(entrada, chave)) return falhaValidacao('campo-ausente', `$.${chave}`)
  }

  if (entrada.versao !== 1) return falhaValidacao('versao-invalida', '$.versao')
  if (!ehStringNaoVazia(entrada.artifactId)) return falhaValidacao('artifactId-invalido', '$.artifactId')
  if (!ehStringNaoVazia(entrada.sessionId)) return falhaValidacao('sessionId-invalido', '$.sessionId')
  if (!ehStringNaoVazia(entrada.chatId)) return falhaValidacao('chatId-invalido', '$.chatId')
  if (!ehOrigemArtefato(entrada.origem)) return falhaValidacao('origem-invalida', '$.origem')
  if (!ehString(entrada.nome)) return falhaValidacao('nome-invalido', '$.nome')
  if (!ehModalidade(entrada.modalidade)) return falhaValidacao('modalidade-invalida', '$.modalidade')
  if (!ehPapelArmazenamento(entrada.papelArmazenamento)) {
    return falhaValidacao('papelArmazenamento-invalido', '$.papelArmazenamento')
  }
  if (!ehEstadoArtefato(entrada.estado)) return falhaValidacao('estado-invalido', '$.estado')

  for (const campo of CAMPOS_OPCIONAIS_DE_TEXTO) {
    if (faltaChave(entrada, campo)) continue
    if (entrada[campo] !== undefined && !ehString(entrada[campo])) {
      return falhaValidacao('campo-invalido', `$.${campo}`)
    }
  }

  const temGeneration = !faltaChave(entrada, 'generation') && entrada.generation !== undefined
  if (temGeneration && !ehInteiroNaoNegativo(entrada.generation)) {
    return falhaValidacao('generation-invalida', '$.generation')
  }

  const temBytes = !faltaChave(entrada, 'bytes') && entrada.bytes !== undefined
  const temSha = !faltaChave(entrada, 'sha256') && entrada.sha256 !== undefined
  const estado: EstadoArtefato = entrada.estado

  if (estado === 'pronto') {
    // `pronto` exige tamanho e integridade declarados (runtime + typecheck).
    if (!temBytes) return falhaValidacao('bytes-ausente', '$.bytes')
    if (!ehInteiroNaoNegativo(entrada.bytes)) return falhaValidacao('bytes-invalido', '$.bytes')
    if (!temSha) return falhaValidacao('sha256-ausente', '$.sha256')
    if (!ehSha256Canonico(entrada.sha256)) return falhaValidacao('sha256-invalido', '$.sha256')
  } else {
    // Estados em recebimento podem não ter tamanho/hash final — e isso
    // NUNCA os converte em `pronto`. Se presentes, precisam ser válidos.
    if (temBytes && !ehInteiroNaoNegativo(entrada.bytes)) {
      return falhaValidacao('bytes-invalido', '$.bytes')
    }
    if (temSha && !ehSha256Canonico(entrada.sha256)) {
      return falhaValidacao('sha256-invalido', '$.sha256')
    }
  }

  // Montagem explícita (sem cast): só campos do contrato entram no DTO.
  const base = {
    versao: 1,
    artifactId: entrada.artifactId,
    sessionId: entrada.sessionId,
    chatId: entrada.chatId,
    origem: entrada.origem,
    nome: entrada.nome,
    modalidade: entrada.modalidade,
    papelArmazenamento: entrada.papelArmazenamento,
  } as const

  const opcionais = {
    ...(ehString(entrada.messageId) ? { messageId: entrada.messageId } : {}),
    ...(ehString(entrada.partId) ? { partId: entrada.partId } : {}),
    ...(ehString(entrada.runId) ? { runId: entrada.runId } : {}),
    ...(ehInteiroNaoNegativo(entrada.generation) ? { generation: entrada.generation } : {}),
    ...(ehString(entrada.mimeDeclarado) ? { mimeDeclarado: entrada.mimeDeclarado } : {}),
    ...(ehString(entrada.mimeDetectado) ? { mimeDetectado: entrada.mimeDetectado } : {}),
    ...(ehString(entrada.providerId) ? { providerId: entrada.providerId } : {}),
    ...(ehString(entrada.modelId) ? { modelId: entrada.modelId } : {}),
    ...(ehString(entrada.requestId) ? { requestId: entrada.requestId } : {}),
  }

  if (estado === 'pronto') {
    // Re-validação na montagem: o construtor nunca depende de narrowing
    // distante — bytes/sha256 são lidos só após predicado neste bloco.
    if (!ehInteiroNaoNegativo(entrada.bytes)) return falhaValidacao('bytes-invalido', '$.bytes')
    if (!ehSha256Canonico(entrada.sha256)) return falhaValidacao('sha256-invalido', '$.sha256')
    return okValido<ArtefatoMultimodal>({
      ...base,
      ...opcionais,
      estado: 'pronto',
      bytes: entrada.bytes,
      sha256: entrada.sha256,
    })
  }

  const semFinal: { bytes?: number; sha256?: string } = {}
  if (temBytes && ehInteiroNaoNegativo(entrada.bytes)) semFinal.bytes = entrada.bytes
  if (temSha && ehSha256Canonico(entrada.sha256)) semFinal.sha256 = entrada.sha256
  return okValido<ArtefatoMultimodal>({ ...base, ...opcionais, ...semFinal, estado })
}
