// ============================================================================
// C-3b — T01 a T04: mensagem, envelope MM-0 e ordem de apresentação.
//
// Tudo aqui é DOMÍNIO PURO: sem React, sem fetch, sem tocar em disco.
// ============================================================================
import { describe, expect, it, vi } from 'vitest'
import {
  artifactIdsCitados,
  mensagemFinalTemConteudo,
  montarApresentacao,
  type CardArtefato,
} from '../domain/apresentacaoMultimodal'
import { classificarPreview } from '../domain/politicaPreview'
import {
  adaptarMensagemLegada,
  lerEnvelopeMultimodal,
  validarMensagemMultimodal,
} from '../domain/multimodal/mensagens'
import type { EnvelopeMensagemMultimodal } from '../domain/multimodal/contrato'

/** Card canônico derivado da política — o mesmo caminho da UI real. */
function cardDe(artifactId: string, nome: string, bytes: Uint8Array): CardArtefato {
  const classificacao = classificarPreview(bytes)
  return {
    artifactId,
    name: nome,
    bytes: bytes.length,
    modalidade: classificacao.ok ? classificacao.modalidade : 'arquivo',
    estado: 'pronto',
    preview: classificacao,
  }
}

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01])
const cardPara = (artifactId: string, _modalidade: string) => cardDe(artifactId, `${artifactId}.png`, PNG)

describe('C-3b — C3B-T01 legado sem envelope continua idêntico', () => {
  it('C3B-T01 texto e anexos C-3a sem envelope preservam ordem e conteúdo', () => {
    const itens = montarApresentacao({
      conteudo: 'mensagem antiga da C-3a',
      anexos: [
        { id: 'art-1', name: 'a.png', bytes: 10, estado: 'pronto' },
        { id: 'art-2', name: 'b.pdf', bytes: 20, estado: 'pronto' },
      ],
      cardPara,
    })
    expect(itens.map((i) => i.tipo)).toEqual(['texto', 'artefato', 'artefato'])
    expect(itens[0]).toMatchObject({ tipo: 'texto', texto: 'mensagem antiga da C-3a' })
    expect(itens[1]).toMatchObject({ tipo: 'artefato', card: { artifactId: 'art-1' } })
    expect(itens[2]).toMatchObject({ tipo: 'artefato', card: { artifactId: 'art-2' } })
  })

  it('C3B-T01 mensagem legada sem envelope não é reescrita (adaptador é só visão)', () => {
    const original = { identidade: 'msg-legada-1', content: 'texto original', indice: 0 }
    const intacto = JSON.parse(JSON.stringify(original))
    const resultado = adaptarMensagemLegada(original)
    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(resultado.valor.messageId).toBe('msg-legada-1')
      expect(resultado.valor.partes).toHaveLength(1)
    }
    // A entrada não foi mutada — nada de migração silenciosa.
    expect(original).toEqual(intacto)
  })

  it('C3B-T01 apresentação não chama o modelo nem faz IO', () => {
    const espiarFetch = vi.fn()
    const fetchOriginal = globalThis.fetch
    // Substituição só para provar que nada chama rede.
    globalThis.fetch = espiarFetch as unknown as typeof fetch
    try {
      montarApresentacao({ conteudo: 'só texto', anexos: [], cardPara })
      expect(espiarFetch).not.toHaveBeenCalled()
    } finally {
      globalThis.fetch = fetchOriginal
    }
  })
})

describe('C-3b — C3B-T02 envelope manda na ordem e não duplica', () => {
  const envelope: EnvelopeMensagemMultimodal = {
    versao: 1,
    messageId: 'msg-1',
    partes: [
      { partId: 'p1', tipo: 'texto', texto: 'antes da imagem' },
      { partId: 'p2', tipo: 'artefato', artifactId: 'art-1', modalidade: 'imagem' },
      { partId: 'p3', tipo: 'texto', texto: 'depois da imagem' },
    ],
  }

  it('C3B-T02 ordem texto/artefato/texto é a das partes', () => {
    const itens = montarApresentacao({
      conteudo: 'antes da imagemdepois da imagem',
      anexos: [{ id: 'art-1', name: 'a.png', estado: 'pronto' }],
      envelope,
      cardPara,
    })
    expect(itens.map((i) => i.tipo)).toEqual(['texto', 'artefato', 'texto'])
    expect(itens[0]).toMatchObject({ texto: 'antes da imagem' })
    expect(itens[2]).toMatchObject({ texto: 'depois da imagem' })
  })

  it('C3B-T02 artefato citado numa parte NÃO reaparece como chip solto', () => {
    const itens = montarApresentacao({
      conteudo: 'x',
      anexos: [{ id: 'art-1', name: 'a.png', estado: 'pronto' }],
      envelope,
      cardPara,
    })
    const ocorrencias = itens.filter((i) => i.tipo === 'artefato' && i.card.artifactId === 'art-1')
    expect(ocorrencias).toHaveLength(1)
  })

  it('C3B-T02 anexo antigo NÃO citado mantém o fallback de compatibilidade', () => {
    const itens = montarApresentacao({
      conteudo: 'x',
      anexos: [
        { id: 'art-1', name: 'a.png', estado: 'pronto' },
        { id: 'art-antigo', name: 'velho.pdf', estado: 'pronto' },
      ],
      envelope,
      cardPara,
    })
    expect(itens.some((i) => i.tipo === 'artefato' && i.card.artifactId === 'art-antigo')).toBe(true)
    expect(artifactIdsCitados(envelope)).toEqual(new Set(['art-1']))
  })

  it('C3B-T02 messageId do envelope é o mesmo da mensagem (sem ID novo)', () => {
    const validado = validarMensagemMultimodal(envelope)
    expect(validado.ok).toBe(true)
    if (validado.ok) expect(validado.valor.messageId).toBe('msg-1')
  })
})

describe('C-3b — C3B-T03 escrita inválida falha; leitura futura preserva', () => {
  it('C3B-T03 versão fora de 1, partId duplicado e campos extras falham na escrita', () => {
    expect(validarMensagemMultimodal({ versao: 2, messageId: 'm', partes: [] })).toMatchObject({ ok: false })
    expect(validarMensagemMultimodal({
      versao: 1, messageId: 'm',
      partes: [
        { partId: 'x', tipo: 'texto', texto: 'a' },
        { partId: 'x', tipo: 'texto', texto: 'b' },
      ],
    })).toMatchObject({ ok: false, codigo: 'partId-duplicado' })
    expect(validarMensagemMultimodal({
      versao: 1, messageId: 'm', partes: [{ partId: 'x', tipo: 'texto', texto: 'a', extra: 1 }],
    })).toMatchObject({ ok: false, codigo: 'campo-desconhecido' })
  })

  it('C3B-T03 leitura de versão desconhecida PRESERVA o original em vez de descartar', () => {
    const futuro = { versao: 99, messageId: 'm', partes: [{ partId: 'p', tipo: 'holograma' }] }
    const leitura = lerEnvelopeMultimodal(futuro)
    expect(leitura.estado).toBe('desconhecido')
    if (leitura.estado === 'desconhecido') {
      expect(leitura.diagnostico).toBe('versao_desconhecida')
      // O original volta intacto — o chamador pode regravar sem perder dados.
      expect(leitura.original).toEqual(futuro)
    }
  })

  it('C3B-T03 leitura de envelope inexistente é `ausente`, não erro', () => {
    expect(lerEnvelopeMultimodal(undefined)).toEqual({ estado: 'ausente' })
    expect(lerEnvelopeMultimodal(null)).toEqual({ estado: 'ausente' })
  })

  it('C3B-T03 leitura malformada degrada com diagnóstico, sem lançar', () => {
    expect(() => lerEnvelopeMultimodal('lixo')).not.toThrow()
    expect(lerEnvelopeMultimodal('lixo')).toMatchObject({ estado: 'desconhecido' })
    expect(lerEnvelopeMultimodal({ versao: 1, messageId: 'm', partes: 'não é array' }))
      .toMatchObject({ estado: 'desconhecido' })
  })

  it('C3B-T03 parte `nao-suportada` na leitura preserva fallback e não quebra a apresentação', () => {
    const envelope: EnvelopeMensagemMultimodal = {
      versao: 1, messageId: 'm',
      partes: [
        { partId: 'p1', tipo: 'texto', texto: 'antes' },
        { partId: 'p2', tipo: 'nao-suportada', codigo: 'formato_futuro', tipoOriginal: 'holograma' },
      ],
    }
    const itens = montarApresentacao({ conteudo: 'antes', anexos: [], envelope, cardPara })
    expect(itens.map((i) => i.tipo)).toEqual(['texto', 'nao-suportada'])
    expect(itens[1]).toMatchObject({ codigo: 'formato_futuro', tipoOriginal: 'holograma' })
  })
})

describe('C-3b — C3B-T04 resposta só com artefato é válida', () => {
  it('C3B-T04 mensagem só de artefato passa; vazio sem partes úteis não', () => {
    const soArtefato: EnvelopeMensagemMultimodal = {
      versao: 1, messageId: 'm',
      partes: [{ partId: 'p1', tipo: 'artefato', artifactId: 'art-1', modalidade: 'imagem' }],
    }
    expect(mensagemFinalTemConteudo({ conteudo: '', envelope: soArtefato, anexos: [] })).toBe(true)
    // Vazio de verdade: sem texto, sem parte, sem anexo → não inventa resposta.
    expect(mensagemFinalTemConteudo({ conteudo: '', anexos: [] })).toBe(false)
    expect(mensagemFinalTemConteudo({ conteudo: '   ', anexos: [] })).toBe(false)
  })

  it('C3B-T04 anexo pronto sem texto também conta como conteúdo legítimo', () => {
    expect(mensagemFinalTemConteudo({
      conteudo: '', anexos: [{ id: 'a', name: 'a.png', estado: 'pronto' }],
    })).toBe(true)
    // Ausente não conta: não é conteúdo entregue.
    expect(mensagemFinalTemConteudo({
      conteudo: '', anexos: [{ id: 'a', name: 'a.png', estado: 'ausente' }],
    })).toBe(false)
  })

  it('C3B-T04 ferramentas continuam em canal separado (não viram parte)', () => {
    // O envelope não tem tipo de parte para ferramenta: elas seguem em
    // `ChatMessage.ferramentas`, intocadas por esta fatia.
    const envelope: EnvelopeMensagemMultimodal = {
      versao: 1, messageId: 'm', partes: [{ partId: 'p', tipo: 'texto', texto: 'ok' }],
    }
    const itens = montarApresentacao({ conteudo: 'ok', anexos: [], envelope, cardPara })
    expect(itens.every((i) => i.tipo === 'texto' || i.tipo === 'artefato' || i.tipo === 'nao-suportada')).toBe(true)
  })
})
