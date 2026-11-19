// ============================================================================
// C-3b — Apresentação multimodal: decisão PURA de o que desenhar, em que ordem.
//
// Sem React, sem fetch, sem Node. A UI consome o resultado; o teste de
// arquitetura (C3B-T29) verifica que este arquivo não importa nenhum deles.
//
// Regra central (R01/T02): quando a mensagem TEM envelope MM-0 válido, a ordem
// das partes é canônica e um artefato citado numa parte NÃO é redesenhado como
// chip solto. Quando NÃO tem envelope, cai no adapter legado: `content` + os
// chips C-3a, sem reescrever nada (T01).
// ============================================================================

import type {
  EnvelopeMensagemMultimodal,
  Modalidade,
  ParteMensagem,
} from './multimodal/contrato'
import { lerEnvelopeMultimodal, type LeituraEnvelope } from './multimodal/mensagens'
import type { ClassificacaoPreview } from './politicaPreview'

/** Handle mínimo que a apresentação precisa de um anexo C-3a. */
export interface AnexoApresentavel {
  id: string
  name: string
  bytes?: number
  /** Estado honesto já existente no domínio (upload/apresentação). */
  estado?: 'pronto' | 'ausente' | 'indisponivel'
}

/** Card de artefato já resolvido para desenho. */
export interface CardArtefato {
  artifactId: string
  name: string
  bytes?: number
  modalidade: Modalidade
  estado: 'pronto' | 'ausente' | 'indisponivel'
  preview: ClassificacaoPreview
}

export type ItemApresentacao =
  | { tipo: 'texto'; texto: string; chave: string }
  | { tipo: 'artefato'; card: CardArtefato; chave: string }
  | { tipo: 'nao-suportada'; codigo: string; tipoOriginal?: string; chave: string }

/**
 * Ordem canônica a partir do envelope. `partId` é opaco e vira a chave de
 * React — não o índice, que muda se a mensagem for reprojetada.
 */
export function itensDoEnvelope(
  envelope: EnvelopeMensagemMultimodal,
  cardPara: (artifactId: string, modalidade: Modalidade) => CardArtefato,
): ItemApresentacao[] {
  return envelope.partes.map((parte: ParteMensagem): ItemApresentacao => {
    if (parte.tipo === 'texto') {
      return { tipo: 'texto', texto: parte.texto, chave: `texto:${parte.partId}` }
    }
    if (parte.tipo === 'artefato') {
      return {
        tipo: 'artefato',
        card: cardPara(parte.artifactId, parte.modalidade),
        chave: `artefato:${parte.partId}`,
      }
    }
    // `nao-suportada` preserva o original e mostra diagnóstico — nunca crash.
    return {
      tipo: 'nao-suportada',
      codigo: parte.codigo,
      ...(parte.tipoOriginal === undefined ? {} : { tipoOriginal: parte.tipoOriginal }),
      chave: `nao-suportada:${parte.partId}`,
    }
  })
}

/**
 * Artefatos JÁ representados por alguma parte do envelope. Serve para o chip
 * legado não duplicar o que a parte já desenha (T02).
 */
export function artifactIdsCitados(envelope: EnvelopeMensagemMultimodal): Set<string> {
  const citados = new Set<string>()
  for (const parte of envelope.partes) if (parte.tipo === 'artefato') citados.add(parte.artifactId)
  return citados
}

/**
 * Apresentação completa de uma mensagem, tolerando os dois mundos.
 *
 * `envelope` vem de uma mensagem que JÁ passou pela leitura tolerante: versão
 * desconhecida chega como `undefined` + diagnóstico, não como crash (T03).
 */
export function montarApresentacao(entrada: {
  conteudo: string
  anexos: readonly AnexoApresentavel[]
  envelope?: EnvelopeMensagemMultimodal
  cardPara: (artifactId: string, modalidade: Modalidade) => CardArtefato
}): ItemApresentacao[] {
  const { conteudo, anexos, envelope, cardPara } = entrada

  if (envelope && envelope.partes.length > 0) {
    const citados = artifactIdsCitados(envelope)
    const itens = itensDoEnvelope(envelope, cardPara)
    // Anexo antigo NÃO citado mantém o fallback de compatibilidade (T01/T02),
    // anexado ao fim na ordem estável em que veio do domínio.
    for (const anexo of anexos) {
      if (citados.has(anexo.id)) continue
      itens.push({
        tipo: 'artefato',
        card: cardPara(anexo.id, 'arquivo'),
        chave: `artefato-legado:${anexo.id}`,
      })
    }
    return itens
  }

  // Sem envelope: adapter legado. Texto preservado como veio (string vazia não
  // vira item fantasma), chips C-3a na ordem atual.
  const itens: ItemApresentacao[] = []
  if (conteudo.length > 0) itens.push({ tipo: 'texto', texto: conteudo, chave: 'texto:content' })
  for (const anexo of anexos) {
    itens.push({
      tipo: 'artefato',
      card: cardPara(anexo.id, 'arquivo'),
      chave: `artefato-legado:${anexo.id}`,
    })
  }
  return itens
}

/**
 * Resposta só com artefatos é válida (R07/T04); vazio sem partes úteis NÃO
 * vira resposta artificial. Usado antes de publicar a mensagem final.
 */
export function mensagemFinalTemConteudo(entrada: {
  conteudo: string
  envelope?: EnvelopeMensagemMultimodal
  anexos: readonly AnexoApresentavel[]
}): boolean {
  if (entrada.conteudo.trim().length > 0) return true
  if (entrada.envelope && entrada.envelope.partes.some((p) => p.tipo === 'artefato')) return true
  // Chip C-3a pronto também é conteúdo legítimo (upload sem texto).
  return entrada.anexos.some((anexo) => anexo.estado !== 'ausente')
}

/**
 * C-3b — porta de LEITURA para a UI.
 *
 * A camada de apresentação (`.tsx`) não importa `domain/multimodal` direto:
 * o guard do MM-0 (MM0-T23) proíbe que tipos multimodais habilitem UI por
 * conta própria. Aqui a leitura fica encapsulada no domínio de apresentação,
 * que é o dono legítimo da decisão "o que desenhar".
 */
export type EnvelopeLido =
  | { estado: 'ausente' }
  | { estado: 'valido'; envelope: EnvelopeMensagemMultimodal }
  | { estado: 'desconhecido'; diagnostico: string }

export function lerEnvelopeParaApresentacao(bruto: unknown): EnvelopeLido {
  const leitura: LeituraEnvelope = lerEnvelopeMultimodal(bruto)
  if (leitura.estado === 'valido') return { estado: 'valido', envelope: leitura.envelope }
  if (leitura.estado === 'desconhecido') return { estado: 'desconhecido', diagnostico: leitura.diagnostico }
  return { estado: 'ausente' }
}
